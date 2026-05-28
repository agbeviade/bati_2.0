import { z } from "zod";
import { optionalIsoDate, optionalNumber, optionalText, requiredText } from "./form";

const PROJECT_STATUS = ["planned", "in_progress", "paused", "completed", "canceled"] as const;
const TASK_PRIORITY = ["low", "medium", "high"] as const;
const EXPENSE_CATEGORY = ["materials", "labor", "transport", "other"] as const;

export const CreateProjectSchema = z.object({
  name: requiredText(2, "Nom du chantier"),
  description: optionalText,
  address: optionalText,
  budget: optionalNumber,
  start_date: optionalIsoDate,
  end_date: optionalIsoDate,
});

export const UpdateProjectSchema = z.object({
  name: optionalText,
  description: optionalText,
  address: optionalText,
  budget: optionalNumber,
  start_date: optionalIsoDate,
  end_date: optionalIsoDate,
  status: z.enum(PROJECT_STATUS).optional(),
  progress_pct: optionalNumber.transform((n, ctx) => {
    if (n === null) return null;
    if (n < 0 || n > 100) {
      ctx.addIssue({ code: "custom", message: "Doit être entre 0 et 100." });
      return z.NEVER;
    }
    return n;
  }),
});

export const CreateTaskSchema = z.object({
  title: requiredText(1, "Titre"),
  description: optionalText,
  priority: z.enum(TASK_PRIORITY).default("medium"),
  due_date: optionalIsoDate,
});

export const CreateExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORY).default("other"),
  amount: optionalNumber.transform((n, ctx) => {
    if (n === null || n <= 0) {
      ctx.addIssue({ code: "custom", message: "Montant invalide." });
      return z.NEVER;
    }
    return n;
  }),
  description: optionalText,
  spent_at: optionalIsoDate,
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
