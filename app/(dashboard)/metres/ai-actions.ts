"use server";

import { getAI, AI_MODEL } from "@/lib/ai/client";
import type { TypeGeometrie, ComposantRecette } from "@/lib/calcul-ouvrage";

// ---------------------------------------------------------------------------
// Feature 1 — Suggestion automatique de recette
// ---------------------------------------------------------------------------

export async function suggestRecette(
  designation: string,
  typeGeometrie: TypeGeometrie,
  availableMaterials: { id: string; name: string; unit: string }[],
): Promise<{ recette: ComposantRecette[]; error?: string }> {
  try {
    const ai = getAI();

    const materialsJson = JSON.stringify(
      availableMaterials.map((m) => ({ id: m.id, name: m.name, unit: m.unit })),
    );

    const response = await ai.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: `Tu es un expert en construction BTP en Afrique de l'Ouest (normes CI/BTP).
Tu connais parfaitement les ratios de consommation de matériaux pour chaque type d'ouvrage.
Tu réponds UNIQUEMENT en JSON valide, sans texte autour.`,
      messages: [
        {
          role: "user",
          content: `Génère la recette standard (coefficients de matériaux) pour l'ouvrage suivant :

Désignation : "${designation}"
Type géométrique : ${typeGeometrie} (unité résultante : ${getUnite(typeGeometrie)})

Matériaux disponibles dans le stock :
${materialsJson}

Réponds avec un JSON respectant exactement cette structure (tableau, rien d'autre) :
[
  {
    "materiau_id": "<id du matériau>",
    "materiau_nom": "<nom>",
    "unite": "<unité>",
    "coefficient": <quantité par unité d'ouvrage (m², m³ ou ml)>,
    "taux_perte": <taux de perte ex: 0.05 pour 5%>,
    "type": "materiau"
  }
]

Utilise UNIQUEMENT les matériaux de la liste fournie. Si aucun matériau de la liste ne correspond, retourne [].
Coefficients basés sur les standards BTP Côte d'Ivoire.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json = extractJson(text);
    const recette = JSON.parse(json) as ComposantRecette[];

    // Valide que les ids existent dans les matériaux disponibles
    const validIds = new Set(availableMaterials.map((m) => m.id));
    const filtered = recette.filter((c) => validIds.has(c.materiau_id));

    return { recette: filtered };
  } catch (e) {
    return { recette: [], error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Feature 2 — Extraction de métrés depuis une photo/plan
// ---------------------------------------------------------------------------

export async function extractMetresFromImage(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp",
): Promise<{
  ouvrages: Array<{
    designation: string;
    type_geometrie: TypeGeometrie;
    dimensions: Record<string, number>;
    notes: string;
  }>;
  error?: string;
}> {
  try {
    const ai = getAI();

    const response = await ai.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: `Tu es un métreur BTP expert. Tu analyses des photos de chantier ou de plans de construction
pour identifier les ouvrages et estimer leurs dimensions.
Tu réponds UNIQUEMENT en JSON valide, sans texte autour.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Analyse cette image et identifie tous les ouvrages BTP visibles (murs, dalles, poteaux, toiture, clôtures, etc.).

Pour chaque ouvrage détecté, estime ses dimensions en mètres.

Types géométriques disponibles :
- "surface_l_h" : mur, cloison, enduit, peinture (Longueur × Hauteur → m²)
- "volume_l_l_h" : dalle, fouille, semelle (L × l × H → m³)
- "cylindre" : poteau rond, puits (∅ × Hauteur → m³)
- "toiture_pente" : toiture inclinée 2 pans (surface_sol + pente%)
- "lineaire" : caniveau, câble, tuyau (Longueur → ml)
- "unite" : porte, fenêtre, WC (quantité)
- "trapeze" : terrain irrégulier ((a+b)/2 × H → m²)

Réponds UNIQUEMENT avec ce JSON :
{
  "ouvrages": [
    {
      "designation": "Mur de façade",
      "type_geometrie": "surface_l_h",
      "dimensions": { "longueur": 10, "hauteur": 3 },
      "notes": "Mur principal visible sur la photo"
    }
  ]
}

Si l'image n'est pas un plan/chantier ou si rien n'est identifiable, retourne { "ouvrages": [] }.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json = extractJson(text);
    const result = JSON.parse(json);

    return { ouvrages: result.ouvrages ?? [] };
  } catch (e) {
    return { ouvrages: [], error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Feature 3 — Analyse de cohérence des quantités
// ---------------------------------------------------------------------------

export async function analyserCoherence(
  designation: string,
  typeGeometrie: TypeGeometrie,
  quantiteNette: number,
  unitePrincipale: string,
  recetteCalculee: Array<{
    materiau_nom: string;
    unite: string;
    coefficient: number;
    quantite_nette: number;
    quantite_commande: number;
  }>,
): Promise<{ alerte: string | null; niveau: "ok" | "warning" | "error" }> {
  if (quantiteNette <= 0 || recetteCalculee.length === 0) {
    return { alerte: null, niveau: "ok" };
  }

  try {
    const ai = getAI();

    const response = await ai.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: `Tu es un expert métreur BTP Côte d'Ivoire. Tu vérifies la cohérence des métrés.
Tu réponds UNIQUEMENT en JSON valide.`,
      messages: [
        {
          role: "user",
          content: `Vérifie si ce métré est cohérent :

Ouvrage : "${designation}" (${typeGeometrie})
Quantité nette : ${quantiteNette.toFixed(2)} ${unitePrincipale}

Besoins calculés :
${recetteCalculee.map((c) => `- ${c.materiau_nom} : ${c.quantite_commande.toFixed(3)} ${c.unite} (coeff: ${c.coefficient}/${unitePrincipale})`).join("\n")}

Vérifie :
1. Les coefficients sont-ils dans les plages standards BTP CI ?
2. Y a-t-il des incohérences (ex: trop peu de ciment pour une dalle) ?
3. Les unités sont-elles logiques ?

Réponds avec ce JSON :
{
  "alerte": "Message court si problème détecté, null si tout est ok",
  "niveau": "ok" | "warning" | "error"
}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json = extractJson(text);
    return JSON.parse(json);
  } catch {
    return { alerte: null, niveau: "ok" };
  }
}

// ---------------------------------------------------------------------------
// Feature 4 — Génération de devis depuis les métrés
// ---------------------------------------------------------------------------

export async function genererDevisDepuisMetres(
  ouvrages: Array<{
    designation: string;
    type_geometrie: TypeGeometrie;
    quantite_nette: number;
    unite_principale: string;
    recette_calculee: Array<{
      materiau_nom: string;
      unite: string;
      quantite_commande: number;
      type: string;
    }>;
  }>,
  nomProjet: string,
): Promise<{
  items: Array<{
    category: "material" | "labor" | "transport" | "equipment" | "other";
    label: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;
  notes: string;
  error?: string;
}> {
  try {
    const ai = getAI();

    const ouvragesJson = JSON.stringify(
      ouvrages.map((o) => ({
        designation: o.designation,
        quantite: `${o.quantite_nette.toFixed(2)} ${o.unite_principale}`,
        besoins: o.recette_calculee.map((c) => ({
          materiau: c.materiau_nom,
          quantite: `${c.quantite_commande.toFixed(3)} ${c.unite}`,
          type: c.type,
        })),
      })),
    );

    const response = await ai.messages
      .stream({
        model: AI_MODEL,
        max_tokens: 32768,
        system: [
          {
            type: "text",
            text: `Tu es un expert en devis BTP Côte d'Ivoire. Tu connais le Bordereau des Prix BTP CI 2024.
Tu génères des devis précis avec les prix du marché ivoirien (en FCFA).
Tu réponds UNIQUEMENT en JSON valide, sans troncature ni résumé.`,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: `Génère un devis COMPLET et EXHAUSTIF pour le projet "${nomProjet}" basé sur ces métrés :

${ouvragesJson}

RÈGLES IMPORTANTES :
- Crée UNE ligne par matériau par ouvrage (ne regroupe pas, ne résume pas)
- Crée UNE ligne de main d'œuvre par ouvrage
- N'omets AUCUN matériau, même si la liste est longue
- Les prix sont en FCFA selon le bordereau BTP CI 2024

Réponds avec ce JSON (tableau items aussi long que nécessaire) :
{
  "items": [
    {
      "category": "material",
      "label": "Agglos 15×20×40 pour Mur de façade",
      "quantity": 135,
      "unit": "u",
      "unit_price": 450,
      "total": 60750
    }
  ],
  "notes": "Devis généré automatiquement basé sur les métrés. Prix indicatifs selon BTP CI 2024."
}

Catégories valides : "material", "labor", "transport", "equipment", "other"`,
          },
        ],
      })
      .finalMessage();

    if (response.stop_reason === "max_tokens") {
      return {
        items: [],
        notes: "",
        error:
          "Le devis généré dépasse la limite de tokens. Simplifiez le projet ou divisez en plusieurs devis.",
      };
    }

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json = extractJson(text);
    const result = JSON.parse(json);

    return { items: result.items ?? [], notes: result.notes ?? "" };
  } catch (e) {
    return { items: [], notes: "", error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Feature 5 — Generation de devis depuis un modele de devis (PDF/image)
// ---------------------------------------------------------------------------

export async function genererDevisDepuisTemplate(
  fileBase64: string,
  mimeType: string,
  fileType: "pdf" | "image",
  description: string,
  debourseContext?: Array<{ label: string; quantity: number; unit: string }>,
): Promise<{
  items: Array<{
    category: "material" | "labor" | "transport" | "equipment" | "other";
    label: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;
  notes: string;
  error?: string;
}> {
  try {
    const ai = getAI();

    const debourseSection =
      debourseContext && debourseContext.length > 0
        ? `\nQuantités exactes calculées par le calculateur de débours secs (à utiliser telles quelles pour les matériaux) :\n${debourseContext.map((l) => `- ${l.label} : ${l.quantity} ${l.unit}`).join("\n")}\n`
        : "";

    const systemPrompt = `Tu es un expert en devis BTP Côte d'Ivoire (Bordereau des Prix BTP CI 2024).
Tu analyses des modèles de devis pour en extraire la structure et les postes types.
Tu génères des devis complets avec des prix réalistes en FCFA.
Tu réponds UNIQUEMENT en JSON valide, sans texte autour.`;

    const userText = `Analyse ce modèle de devis BTP et génère un devis COMPLET et ADAPTÉ pour le projet suivant.

Description du projet : ${description || "Construction BTP en Côte d'Ivoire"}
${debourseSection}
INSTRUCTIONS :
${debourseContext?.length ? "1. Pour les matériaux listés ci-dessus, utilise les quantités EXACTES fournies (ne les modifie pas)\n2. Adapte les autres postes (main d'oeuvre, transport, équipements) selon le modèle\n3. Attribue des prix réalistes selon le marché ivoirien 2024" : "1. Inspire-toi de la structure et des postes du modèle\n2. Adapte les quantités à la description du projet\n3. Attribue des prix réalistes selon le marché ivoirien 2024"}
4. Catégories valides : "material", "labor", "transport", "equipment", "other"
5. Sois EXHAUSTIF - inclus tous les postes nécessaires

Réponds UNIQUEMENT avec ce JSON :
{
  "items": [
    {
      "category": "material",
      "label": "Ciment CPA 325 (sac 50kg)",
      "quantity": 120,
      "unit": "sac",
      "unit_price": 5000,
      "total": 600000
    }
  ],
  "notes": "Devis généré à partir du modèle. Prix indicatifs BTP CI 2024."
}`;

    const imageMediaType = mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    // cache_control sur le document PDF/image : un même template régénéré
    // dans les 5 min ne re-paye pas l'input du fichier (~90% d'économie sur
    // ce bloc, qui peut peser 4-8k tokens).
    const contentBlock =
      fileType === "pdf"
        ? {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: fileBase64,
            },
            cache_control: { type: "ephemeral" as const },
          }
        : {
            type: "image" as const,
            source: { type: "base64" as const, media_type: imageMediaType, data: fileBase64 },
            cache_control: { type: "ephemeral" as const },
          };

    const response = await ai.messages
      .stream({
        model: AI_MODEL,
        max_tokens: 32768,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: [contentBlock, { type: "text", text: userText }],
          },
        ],
      })
      .finalMessage();

    if (response.stop_reason === "max_tokens") {
      return {
        items: [],
        notes: "",
        error:
          "Le devis généré dépasse la limite de tokens. Simplifiez l'instruction ou utilisez un modèle plus court.",
      };
    }

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json = extractJson(text);
    const result = JSON.parse(json);
    return { items: result.items ?? [], notes: result.notes ?? "" };
  } catch (e) {
    return { items: [], notes: "", error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Feature 6 — Generation de devis depuis les quantites debours secs
// ---------------------------------------------------------------------------

export async function genererDevisDepuisDebourses(
  lignes: Array<{ label: string; quantity: number; unit: string }>,
  description: string,
): Promise<{
  items: Array<{
    category: "material" | "labor" | "transport" | "equipment" | "other";
    label: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;
  notes: string;
  error?: string;
}> {
  try {
    const ai = getAI();

    const lignesJson = lignes.map((l) => `- ${l.label} : ${l.quantity} ${l.unit}`).join("\n");

    const response = await ai.messages
      .stream({
        model: AI_MODEL,
        max_tokens: 32768,
        system: [
          {
            type: "text",
            text: `Tu es un expert en devis BTP Côte d'Ivoire (Bordereau des Prix BTP CI 2024).
Tu connais les prix du marché ivoirien. Tu reponds UNIQUEMENT en JSON valide.`,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: `Génère un devis COMPLET pour ce projet BTP.

Description : ${description || "Construction BTP en Côte d'Ivoire"}

Quantités de matériaux calculées par le calculateur de débours secs :
${lignesJson}

INSTRUCTIONS :
1. Reprends TOUTES les lignes matériaux ci-dessus avec leurs quantités EXACTES (ne modifie pas les quantités)
2. Attribue un prix unitaire réaliste en FCFA (marché ivoirien 2024) à chaque matériau
3. Ajoute des lignes de main d'œuvre adaptées (maçon, ferrailleur, manœuvre, coffreur)
4. Ajoute le transport si nécessaire
5. Chaque catégorie : "material", "labor", "transport", "equipment", "other"

Réponds UNIQUEMENT avec ce JSON :
{
  "items": [
    {
      "category": "material",
      "label": "Ciment beton",
      "quantity": 641,
      "unit": "sac",
      "unit_price": 5000,
      "total": 3205000
    }
  ],
  "notes": "Devis basé sur calcul de débours secs. Prix selon marché ivoirien 2024."
}`,
          },
        ],
      })
      .finalMessage();

    if (response.stop_reason === "max_tokens") {
      return {
        items: [],
        notes: "",
        error: "Le devis généré dépasse la limite de tokens. Simplifiez l'instruction.",
      };
    }

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const json = extractJson(text);
    const result = JSON.parse(json);
    return { items: result.items ?? [], notes: result.notes ?? "" };
  } catch (e) {
    return { items: [], notes: "", error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function extractJson(text: string): string {
  // Extrait le JSON même si Claude ajoute du texte autour
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (match) return match[0];
  return text.trim();
}

function getUnite(type: TypeGeometrie): string {
  if (type === "volume_l_l_h" || type === "cylindre") return "m³";
  if (type === "lineaire") return "ml";
  if (type === "unite") return "u";
  return "m²";
}
