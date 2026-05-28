"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedProfile } from "@/lib/auth/profile";
import { logger } from "@/lib/logger";
import { parseFormData } from "@/lib/schemas/form";
import {
  CreateExpenseSchema,
  CreateProjectSchema,
  CreateTaskSchema,
  UpdateProjectSchema,
} from "@/lib/schemas/project";
import type { TaskStatus } from "@/lib/supabase/types";

// ── Projects ────────────────────────────────────────────────

export async function createProject(formData: FormData) {
  const { user, companyId, supabase } = await getAuthedProfile();

  const parsed = parseFormData(CreateProjectSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const input = parsed.data;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      name: input.name,
      description: input.description,
      address: input.address,
      budget: input.budget,
      start_date: input.start_date,
      end_date: input.end_date,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !project) {
    logger.error("createProject failed", error, { companyId });
    return { error: "Impossible de créer le chantier." };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  const { supabase } = await getAuthedProfile();

  const parsed = parseFormData(UpdateProjectSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const input = parsed.data;

  const { error } = await supabase
    .from("projects")
    .update({
      name: input.name ?? undefined,
      description: input.description,
      address: input.address,
      budget: input.budget,
      start_date: input.start_date,
      end_date: input.end_date,
      status: input.status,
      progress_pct: input.progress_pct ?? undefined,
    })
    .eq("id", id);

  if (error) {
    logger.error("updateProject failed", error, { projectId: id });
    return { error: "Mise à jour échouée." };
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function deleteProject(id: string) {
  const { supabase } = await getAuthedProfile();
  await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect("/projects");
}

// ── Tasks ────────────────────────────────────────────────────

export async function createTask(projectId: string, formData: FormData) {
  const { supabase } = await getAuthedProfile();

  const parsed = parseFormData(CreateTaskSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const input = parsed.data;

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title: input.title,
    description: input.description,
    priority: input.priority,
    due_date: input.due_date,
  });

  if (error) {
    logger.error("createTask failed", error, { projectId });
    return { error: "Impossible de créer la tâche." };
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, projectId: string) {
  const { supabase } = await getAuthedProfile();
  await supabase.from("tasks").update({ status }).eq("id", taskId);
  revalidatePath(`/projects/${projectId}`);
}

// ── Expenses ─────────────────────────────────────────────────

export async function createExpense(projectId: string, formData: FormData) {
  const { user, supabase } = await getAuthedProfile();

  const parsed = parseFormData(CreateExpenseSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const input = parsed.data;

  const { error } = await supabase.from("project_expenses").insert({
    project_id: projectId,
    category: input.category,
    amount: input.amount,
    description: input.description,
    spent_at: input.spent_at ?? new Date().toISOString().split("T")[0],
    created_by: user.id,
  });

  if (error) {
    logger.error("createExpense failed", error, { projectId });
    return { error: error.message };
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteExpense(expenseId: string, projectId: string) {
  const { supabase } = await getAuthedProfile();
  await supabase.from("project_expenses").delete().eq("id", expenseId);
  revalidatePath(`/projects/${projectId}`);
}

// ── Team ─────────────────────────────────────────────────────

export async function addTeamMember(projectId: string, formData: FormData) {
  const { supabase } = await getAuthedProfile();
  const userId = formData.get("user_id") as string;
  if (!userId) return { error: "Sélectionnez un membre." };

  const { error } = await supabase.from("project_assignments").insert({
    project_id: projectId,
    user_id: userId,
    role_on_project: (formData.get("role_on_project") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ce membre est déjà assigné à ce chantier." };
    logger.error("addTeamMember failed", error, { projectId });
    return { error: error.message };
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function removeTeamMember(assignmentId: string, projectId: string) {
  const { supabase } = await getAuthedProfile();
  await supabase.from("project_assignments").delete().eq("id", assignmentId);
  revalidatePath(`/projects/${projectId}`);
}

// ── Photos ───────────────────────────────────────────────────

export async function savePhotoRecord(projectId: string, storagePath: string, caption: string) {
  const { user, supabase } = await getAuthedProfile();

  const { error } = await supabase.from("project_photos").insert({
    project_id: projectId,
    storage_path: storagePath,
    caption: caption || null,
    uploaded_by: user.id,
    source: "web",
  });

  if (error) {
    logger.error("savePhotoRecord failed", error, { projectId });
    return { error: error.message };
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function deletePhoto(photoId: string, storagePath: string, projectId: string) {
  const { supabase } = await getAuthedProfile();
  // Storage removal uses admin (storage policies differ from DB RLS)
  const admin = createAdminClient();
  await admin.storage.from("project-photos").remove([storagePath]);
  await supabase.from("project_photos").delete().eq("id", photoId);
  revalidatePath(`/projects/${projectId}`);
}
