"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Upload, Trash2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { savePhotoRecord, deletePhoto } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Photo = {
  id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string;
  signedUrl?: string;
};

export function PhotosTab({ projectId, companyId, initialPhotos }: {
  projectId: string;
  companyId: string;
  initialPhotos: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) { toast.error("Fichier trop lourd (max 10 Mo)."); return; }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${companyId}/${projectId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("project-photos")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      toast.error(`Échec upload : ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const caption = captionRef.current?.value ?? "";
    const result = await savePhotoRecord(projectId, path, caption);

    if (result?.error) {
      toast.error(result.error);
    } else {
      const { data } = await supabase.storage.from("project-photos").createSignedUrl(path, 3600);
      setPhotos(prev => [{
        id: Date.now().toString(),
        storage_path: path,
        caption: caption || null,
        taken_at: new Date().toISOString(),
        signedUrl: data?.signedUrl,
      }, ...prev]);
      toast.success("Photo ajoutée.");
      if (captionRef.current) captionRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
    }
    setUploading(false);
  }

  function handleDelete(photo: Photo) {
    startTransition(async () => {
      await deletePhoto(photo.id, photo.storage_path, projectId);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast.success("Photo supprimée.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Zone upload */}
      <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-3 text-center">
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">Ajouter une photo</p>
          <p className="text-xs text-muted-foreground">JPG, PNG, WebP · max 10 Mo</p>
        </div>
        <div className="flex gap-2 items-center w-full max-w-md">
          <Input ref={captionRef} placeholder="Légende (optionnelle)" className="h-9 text-sm" />
          <Button
            type="button" size="sm" disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Upload..." : "Choisir"}
          </Button>
        </div>
        <input
          ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Grille de photos */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <ImageOff className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucune photo pour ce chantier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
              {photo.signedUrl ? (
                <Image
                  src={photo.signedUrl}
                  alt={photo.caption ?? "Photo chantier"}
                  fill className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100">
                <div className="flex justify-end">
                  <Button
                    variant="destructive" size="icon" className="h-7 w-7"
                    disabled={isPending}
                    onClick={() => handleDelete(photo)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {photo.caption && (
                  <p className="text-xs text-white bg-black/50 rounded px-2 py-1 truncate">
                    {photo.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
