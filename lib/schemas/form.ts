// Helpers Zod pour parser et valider les FormData des Server Actions.
//
// Pattern d'utilisation côté action :
//
//   const parsed = parseFormData(CreateProjectSchema, formData);
//   if (!parsed.ok) return { error: parsed.error };
//   const { name, budget, ... } = parsed.data;
//
// Avantage : plus de `Number(formData.get(...))` qui produit NaN silencieux,
// plus de cast `as` qui masque les valeurs inattendues, message d'erreur
// utilisateur cohérent.

import { z } from "zod";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Convertit FormData en objet plat (les fichiers `File` sont conservés),
 * puis valide via le schéma Zod.
 *
 * En cas d'échec, retourne un message d'erreur lisible
 * (premier issue Zod, formaté en français).
 */
export function parseFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): ParseResult<z.infer<T>> {
  const obj: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const [key, value] of formData.entries()) {
    if (key in obj) {
      const existing = obj[key];
      obj[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      obj[key] = value;
    }
  }

  const result = schema.safeParse(obj);
  if (result.success) return { ok: true, data: result.data };

  const first = result.error.issues[0];
  const path = first?.path.join(".");
  const msg = first?.message ?? "Données invalides.";
  return { ok: false, error: path ? `${path} : ${msg}` : msg };
}

// ── Coercitions communes ──────────────────────────────────────
// Les valeurs FormData sont des strings ; Zod doit coercer.

/** String optionnelle qui devient `null` si vide après trim. */
export const optionalText = z
  .string()
  .optional()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  });

/** String requise, trim, longueur min 1. */
export const requiredText = (minLength = 1, fieldName = "Champ") =>
  z
    .string({ message: `${fieldName} requis.` })
    .transform((v) => v.trim())
    .refine((v) => v.length >= minLength, {
      message: `${fieldName} : minimum ${minLength} caractère${minLength > 1 ? "s" : ""}.`,
    });

/** Number optionnel. Empty string → null. Sinon coerce. */
export const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isNaN(n)) {
      ctx.addIssue({ code: "custom", message: "Doit être un nombre." });
      return z.NEVER;
    }
    return n;
  });

/** Date ISO (YYYY-MM-DD) optionnelle. */
export const optionalIsoDate = z
  .string()
  .optional()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  });
