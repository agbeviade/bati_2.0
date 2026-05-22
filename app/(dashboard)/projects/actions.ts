"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectStatus, TaskStatus, ExpenseCategory } from "@/lib/supabase/types";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

// ── Projects ────────────────────────────────────────────────

export async function createProject(formData: FormData) {
  const user = await getAuthenticatedUser();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const name = (formData.get("name") as string)?.trim();
  if (!name || name.length < 2) return { error: "Le nom du chantier est requis." };

  const budget = formData.get("budget");
  const { data: project, error } = await admin
    .from("projects")
    .insert({
      company_id: profile.company_id,
      name,
      description: (formData.get("description") as string) || null,
      address: (formData.get("address") as string) || null,
      budget: budget ? Number(budget) : null,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      created_by: user.id,
    })
    .select("id").single();

  if (error || !project) { console.error("[createProject]", error); return { error: "Impossible de créer le chantier." }; }

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  await getAuthenticatedUser();
  const admin = createAdminClient();

  const name = (formData.get("name") as string)?.trim();
  const budget = formData.get("budget");
  const progress_pct = formData.get("progress_pct");

  const { error } = await admin.from("projects").update({
    name: name || undefined,
    description: (formData.get("description") as string) || null,
    address: (formData.get("address") as string) || null,
    budget: budget ? Number(budget) : null,
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    status: (formData.get("status") as ProjectStatus) || undefined,
    progress_pct: progress_pct ? Number(progress_pct) : undefined,
  }).eq("id", id);

  if (error) { console.error("[updateProject]", error); return { error: "Mise à jour échouée." }; }

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
}

export async function deleteProject(id: string) {
  await getAuthenticatedUser();
  await createAdminClient().from("projects").delete().eq("id", id);
  revalidatePath("/projects");
  redirect("/projects");
}

// ── Tasks ────────────────────────────────────────────────────

export async function createTask(projectId: string, formData: FormData) {
  await getAuthenticatedUser();
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Titre requis." };

  const { error } = await createAdminClient().from("tasks").insert({
    project_id: projectId, title,
    description: (formData.get("description") as string) || null,
    priority: (formData.get("priority") as "low" | "medium" | "high") || "medium",
    due_date: (formData.get("due_date") as string) || null,
  });

  if (error) { console.error("[createTask]", error); return { error: "Impossible de créer la tâche." }; }
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, projectId: string) {
  await getAuthenticatedUser();
  await createAdminClient().from("tasks").update({ status }).eq("id", taskId);
  revalidatePath(`/projects/${projectId}`);
}

// ── Expenses ─────────────────────────────────────────────────

export async function createExpense(projectId: string, formData: FormData) {
  const user = await getAuthenticatedUser();
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) return { error: "Montant invalide." };

  const { error } = await createAdminClient().from("project_expenses").insert({
    project_id: projectId,
    category: (formData.get("category") as ExpenseCategory) || "other",
    amount,
    description: (formData.get("description") as string) || null,
    spent_at: (formData.get("spent_at") as string) || new Date().toISOString().split("T")[0],
    created_by: user.id,
  });

  if (error) { console.error("[createExpense]", error); return { error: error.message }; }
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteExpense(expenseId: string, projectId: string) {
  await getAuthenticatedUser();
  await createAdminClient().from("project_expenses").delete().eq("id", expenseId);
  revalidatePath(`/projects/${projectId}`);
}

// ── Team ─────────────────────────────────────────────────────

export async function addTeamMember(projectId: string, formData: FormData) {
  await getAuthenticatedUser();
  const userId = formData.get("user_id") as string;
  if (!userId) return { error: "Sélectionnez un membre." };

  const { error } = await createAdminClient().from("project_assignments").insert({
    project_id: projectId,
    user_id: userId,
    role_on_project: (formData.get("role_on_project") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ce membre est déjà assigné à ce chantier." };
    console.error("[addTeamMember]", error);
    return { error: error.message };
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function removeTeamMember(assignmentId: string, projectId: string) {
  await getAuthenticatedUser();
  await createAdminClient().from("project_assignments").delete().eq("id", assignmentId);
  revalidatePath(`/projects/${projectId}`);
}

// ── Photos ───────────────────────────────────────────────────

export async function savePhotoRecord(projectId: string, storagePath: string, caption: string) {
  const user = await getAuthenticatedUser();

  const { error } = await createAdminClient().from("project_photos").insert({
    project_id: projectId,
    storage_path: storagePath,
    caption: caption || null,
    uploaded_by: user.id,
    source: "web",
  });

  if (error) { console.error("[savePhotoRecord]", error); return { error: error.message }; }
  revalidatePath(`/projects/${projectId}`);
}

export async function deletePhoto(photoId: string, storagePath: string, projectId: string) {
  await getAuthenticatedUser();
  const admin = createAdminClient();
  await admin.storage.from("project-photos").remove([storagePath]);
  await admin.from("project_photos").delete().eq("id", photoId);
  revalidatePath(`/projects/${projectId}`);
}
