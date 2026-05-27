import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pyuzfgghlndlpgspuxnt.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dXpmZ2dobG5kbHBnc3B1eG50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM5ODI3NiwiZXhwIjoyMDk0OTc0Mjc2fQ.4KMpbQuISs6N82q1Pj2IBj5u1LmNlYRC9b3KgibeJBM";
const USER_EMAIL = "agbeviade2017@gmail.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const MATERIALS = [
  // Beton & liant
  { name: "Ciment (sac 50 kg)",        category: "cement",     unit: "sac",   unit_cost: 5000  },
  { name: "Sable",                      category: "sand_gravel",unit: "m3",    unit_cost: 25000 },
  { name: "Gravier 05/25",              category: "sand_gravel",unit: "m3",    unit_cost: 30000 },
  { name: "Gravier 15/25",              category: "sand_gravel",unit: "m3",    unit_cost: 32000 },
  // Aciers
  { name: "HA6 (botte)",               category: "steel",      unit: "botte", unit_cost: 15000 },
  { name: "HA8 (botte)",               category: "steel",      unit: "botte", unit_cost: 20000 },
  { name: "HA10 (botte)",              category: "steel",      unit: "botte", unit_cost: 35000 },
  { name: "HA12 (botte)",              category: "steel",      unit: "botte", unit_cost: 55000 },
  // Maconnerie
  { name: "Brique 15 plein",           category: "other",      unit: "u",     unit_cost: 250   },
  { name: "Brique 15 creux",           category: "other",      unit: "u",     unit_cost: 200   },
  { name: "Hourdis",                   category: "other",      unit: "u",     unit_cost: 350   },
  // Coffrage
  { name: "Planche coffrage larg. 30", category: "wood",       unit: "u",     unit_cost: 3000  },
  { name: "Planche coffrage larg. 20", category: "wood",       unit: "u",     unit_cost: 2500  },
];

async function main() {
  // Recuperer company_id (premier utilisateur avec company_id)
  const { data: profile, error: profErr } = await admin
    .from("users").select("company_id").not("company_id", "is", null).limit(1).maybeSingle();
  if (profErr || !profile?.company_id) {
    console.error("Profil / company_id introuvable:", profErr?.message);
    process.exit(1);
  }
  const company_id = profile.company_id;
  console.log("company_id:", company_id);

  // Inserer les materiaux (ignorer les doublons sur le nom)
  const rows = MATERIALS.map(m => ({ ...m, company_id, stock_qty: 0 }));
  const { data, error } = await admin.from("materials").insert(rows).select("id, name, unit_cost");

  if (error) { console.error("Erreur insertion:", error.message); process.exit(1); }

  console.log(`\n${data?.length ?? 0} materiaux inseres :\n`);
  data?.forEach(m => console.log(`  - ${m.name} (${m.unit_cost} FCFA)`));
  console.log("\nTermine.");
}

main();
