"use client";

import { useState, useTransition } from "react";
import { Settings, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/(dashboard)/materials/category-actions";

export type CategoryRow = { id: string; slug: string; label: string };

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!newLabel.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("label", newLabel.trim());
      const result = await createCategory(fd);
      if (result?.error) toast.error(result.error);
      else {
        setNewLabel("");
        toast.success("Catégorie ajoutée.");
      }
    });
  }

  function startEdit(cat: CategoryRow) {
    setEditingId(cat.id);
    setEditLabel(cat.label);
  }

  function handleSaveEdit(id: string) {
    if (!editLabel.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("label", editLabel.trim());
      const result = await updateCategory(id, fd);
      if (result?.error) toast.error(result.error);
      else {
        setEditingId(null);
        toast.success("Catégorie modifiée.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result?.error) toast.error(result.error);
      else toast.success("Catégorie supprimée.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Catégories
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] max-w-md flex-col">
        <DialogHeader>
          <DialogTitle>Gérer les catégories</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Nouvelle catégorie..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd} disabled={isPending || !newLabel.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="hover:bg-muted/50 group flex items-center gap-2 rounded-md px-2 py-1.5"
            >
              {editingId === cat.id ? (
                <>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-7 flex-1 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(cat.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-green-600 hover:text-green-700"
                    onClick={() => handleSaveEdit(cat.id)}
                    disabled={isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{cat.label}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => startEdit(cat)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDelete(cat.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
