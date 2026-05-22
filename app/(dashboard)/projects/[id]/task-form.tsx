"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTask } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TaskForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement)?.value?.trim();
    if (!title) return;

    startTransition(async () => {
      const result = await createTask(projectId, new FormData(form));
      if (result?.error) {
        toast.error(result.error);
      } else {
        form.reset();
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Ajouter une tâche
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        ref={inputRef}
        name="title"
        placeholder="Titre de la tâche..."
        autoFocus
        required
        className="h-8 text-sm"
      />
      <input type="hidden" name="priority" value="medium" />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "..." : "Ajouter"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(false)}
      >
        Annuler
      </Button>
    </form>
  );
}
