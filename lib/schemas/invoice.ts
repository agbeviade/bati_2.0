import { z } from "zod";
import { optionalIsoDate, optionalNumber, optionalText } from "./form";

const PAYMENT_METHOD = ["cash", "bank", "mobile_money", "geniuspay", "flutterwave"] as const;

export const CreateInvoiceSchema = z.object({
  client_name: optionalText,
  amount: optionalNumber.transform((n, ctx) => {
    if (n === null || n < 0) {
      ctx.addIssue({ code: "custom", message: "Montant invalide." });
      return z.NEVER;
    }
    return n;
  }),
  due_date: optionalIsoDate,
  notes: optionalText,
  project_id: optionalText,
  quote_id: optionalText,
});

export const AddPaymentSchema = z.object({
  amount: optionalNumber.transform((n, ctx) => {
    if (n === null || n <= 0) {
      ctx.addIssue({ code: "custom", message: "Montant invalide." });
      return z.NEVER;
    }
    return n;
  }),
  method: z.enum(PAYMENT_METHOD).default("cash"),
  reference: optionalText,
  paid_at: optionalText,
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type AddPaymentInput = z.infer<typeof AddPaymentSchema>;
