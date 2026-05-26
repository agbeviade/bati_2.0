"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadCompanyAsset, removeCompanyAsset } from "@/app/(dashboard)/settings/actions";

interface AssetSlot {
  type: "header" | "footer";
  label: string;
  description: string;
  hint: string;
  currentUrl: string | null;
}

export function CompanyAssetsForm({
  companyId,
  headerUrl,
  footerUrl,
}: {
  companyId: string;
  headerUrl: string | null;
  footerUrl: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>En-tête & pied de page</CardTitle>
        <CardDescription>
          Ces images s'affichent automatiquement sur tous vos devis et factures générés en PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AssetUploader
          companyId={companyId}
          type="header"
          label="En-tête de document"
          description="Apparaît en haut de chaque devis et facture."
          hint="Recommandé : 2480 × 350 px, fond blanc ou transparent, PNG/JPG"
          currentUrl={headerUrl}
        />
        <div className="border-t" />
        <AssetUploader
          companyId={companyId}
          type="footer"
          label="Pied de page de document"
          description="Apparaît en bas de chaque page de vos documents."
          hint="Recommandé : 2480 × 200 px, fond blanc ou transparent, PNG/JPG"
          currentUrl={footerUrl}
        />
      </CardContent>
    </Card>
  );
}

function AssetUploader({
  companyId,
  type,
  label,
  description,
  hint,
  currentUrl: initialUrl,
}: AssetSlot & { companyId: string }) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [uploading, startUpload] = useTransition();
  const [removing, startRemove] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX = 3 * 1024 * 1024;
    if (file.size > MAX) {
      toast.error(`Fichier trop lourd (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 3 Mo.`);
      e.target.value = "";
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    startUpload(async () => {
      const res = await uploadCompanyAsset(fd, type);
      if (res.error) {
        toast.error(res.error);
      } else {
        setCurrentUrl(res.url);
        toast.success(`${label} mis à jour.`);
      }
      e.target.value = "";
    });
  }

  function handleRemove() {
    startRemove(async () => {
      const res = await removeCompanyAsset(type);
      if (res.error) {
        toast.error(res.error);
      } else {
        setCurrentUrl(null);
        toast.success(`${label} supprimé.`);
      }
    });
  }

  const isPending = uploading || removing;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {currentUrl ? (
        <div className="relative group rounded-lg border overflow-hidden bg-muted/20">
          <div className="relative w-full" style={{ aspectRatio: type === "header" ? "7/1" : "12/1" }}>
            <Image
              src={currentUrl}
              alt={label}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
              className="shadow"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Remplacer
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRemove}
              disabled={isPending}
              className="shadow"
            >
              {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <ImageIcon className="h-8 w-8" />
          )}
          <span className="text-sm font-medium">
            {uploading ? "Envoi en cours..." : "Cliquer pour uploader"}
          </span>
          <span className="text-xs">{hint}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
