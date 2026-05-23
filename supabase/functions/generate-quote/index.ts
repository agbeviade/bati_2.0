import { PRIX_REFERENCE_CI } from "./prices_ci.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuoteItem {
  category: "material" | "labor" | "transport" | "equipment" | "other";
  label: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { description, surface_m2, project_type, currency = "XOF" } = await req.json();

    if (!description || description.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Description trop courte (minimum 10 caractères)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GROQ_API_KEY")!;

    const systemPrompt = `Tu es un expert en estimation de chantiers BTP en Côte d'Ivoire et en Afrique de l'Ouest (prix en ${currency}).
Tu génères des devis détaillés avec des prix RÉELS issus du marché local ivoirien.
Tu dois OBLIGATOIREMENT utiliser les prix de référence ci-dessous pour chaque ligne du devis.
Ne jamais inventer des prix — utilise toujours la fourchette basse ou médiane de la référence.

${PRIX_REFERENCE_CI}

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.
Format: { "items": [...], "notes": "..." }
Chaque item: { "category": "material"|"labor"|"transport"|"equipment"|"other", "label": string, "quantity": number, "unit": string, "unit_price": number }

Règles importantes :
- Utilise les unités exactes de la référence (sac, m², ml, barre, botte, rouleau, jour, m³...)
- Pour la main d'œuvre : category = "labor", unit = "jour" ou "h"
- Pour les matériaux : calcule les quantités réelles en fonction de la surface fournie
- Inclure : fondations, gros œuvre, charpente/toiture, menuiseries, carrelage, plomberie, électricité, peinture selon le type de chantier
- Entre 12 et 25 lignes pour un devis complet`;

    const userPrompt = `Génère un devis détaillé pour ce chantier:
Description: ${description}
${surface_m2 ? `Surface: ${surface_m2} m²` : ""}
${project_type ? `Type: ${project_type}` : ""}

Inclus les matériaux principaux, la main d'œuvre et les équipements nécessaires.
Prix en ${currency}. Entre 8 et 20 lignes.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return new Response(JSON.stringify({ error: `Erreur Groq: ${err}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content ?? "";

    let parsed: { items: QuoteItem[]; notes?: string };
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match?.[0] ?? text);
    } catch {
      return new Response(JSON.stringify({ error: "Impossible de parser la réponse IA", raw: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = (parsed.items ?? []).map((item, i) => ({
      ...item,
      total: item.quantity * item.unit_price,
      sort_order: i,
    }));

    const subtotal = items.reduce((s, i) => s + i.total, 0);

    return new Response(JSON.stringify({ items, subtotal, notes: parsed.notes ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
