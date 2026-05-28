"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
  variant?: "button" | "icon";
  label?: string;
  disabled?: boolean;
};

export function DeleteButton({
  onConfirm,
  title = "Confirmer la suppression",
  description = "Cette action est irréversible. Voulez-vous continuer ?",
  variant = "button",
  label = "Supprimer",
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled || loading}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="destructive" disabled={disabled || loading}>
            <Trash2 className="mr-2 h-4 w-4" />
            {loading ? "Suppression..." : label}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
