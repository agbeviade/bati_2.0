import { describe, expect, it } from "vitest";
import { z } from "zod";
import { optionalIsoDate, optionalNumber, optionalText, parseFormData, requiredText } from "./form";
import { CreateProjectSchema } from "./project";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("parseFormData", () => {
  it("succès — extrait les champs et retourne ok:true", () => {
    const schema = z.object({ name: z.string(), age: z.coerce.number() });
    const result = parseFormData(schema, fd({ name: "Alice", age: "30" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Alice");
      expect(result.data.age).toBe(30);
    }
  });

  it("erreur — retourne ok:false avec message", () => {
    const schema = z.object({ age: z.coerce.number().min(18) });
    const result = parseFormData(schema, fd({ age: "15" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("age");
    }
  });
});

describe("coercitions", () => {
  it("optionalText : null si vide ou whitespace", () => {
    const schema = z.object({ x: optionalText });
    expect(parseFormData(schema, fd({ x: "  " })).ok && (parseFormData(schema, fd({ x: "  " })) as { ok: true; data: { x: string | null } }).data.x).toBe(null);
    const r = parseFormData(schema, fd({ x: "  hello  " }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.x).toBe("hello");
  });

  it("requiredText : refuse une string vide après trim", () => {
    const schema = z.object({ name: requiredText(2, "Nom") });
    const r = parseFormData(schema, fd({ name: " a " }));
    expect(r.ok).toBe(false);
  });

  it("optionalNumber : empty → null", () => {
    const schema = z.object({ n: optionalNumber });
    const r = parseFormData(schema, fd({ n: "" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.n).toBe(null);
  });

  it("optionalNumber : NaN → erreur", () => {
    const schema = z.object({ n: optionalNumber });
    const r = parseFormData(schema, fd({ n: "abc" }));
    expect(r.ok).toBe(false);
  });

  it("optionalNumber : parse un nombre", () => {
    const schema = z.object({ n: optionalNumber });
    const r = parseFormData(schema, fd({ n: "42.5" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.n).toBe(42.5);
  });

  it("optionalIsoDate : vide → null", () => {
    const schema = z.object({ d: optionalIsoDate });
    const r = parseFormData(schema, fd({ d: "" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.d).toBe(null);
  });
});

describe("CreateProjectSchema", () => {
  it("succès avec nom valide", () => {
    const r = parseFormData(CreateProjectSchema, fd({ name: "Chantier Abidjan" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.name).toBe("Chantier Abidjan");
      expect(r.data.budget).toBe(null);
      expect(r.data.description).toBe(null);
    }
  });

  it("refuse un nom trop court", () => {
    const r = parseFormData(CreateProjectSchema, fd({ name: "A" }));
    expect(r.ok).toBe(false);
  });

  it("refuse un nom absent", () => {
    const r = parseFormData(CreateProjectSchema, fd({}));
    expect(r.ok).toBe(false);
  });

  it("budget invalide → erreur", () => {
    const r = parseFormData(CreateProjectSchema, fd({ name: "Test", budget: "pas un nombre" }));
    expect(r.ok).toBe(false);
  });

  it("budget valide → number", () => {
    const r = parseFormData(CreateProjectSchema, fd({ name: "Test", budget: "1500000" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.budget).toBe(1500000);
  });
});
