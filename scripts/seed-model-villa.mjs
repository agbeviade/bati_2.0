import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  "https://pyuzfgghlndlpgspuxnt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dXpmZ2dobG5kbHBnc3B1eG50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM5ODI3NiwiZXhwIjoyMDk0OTc0Mjc2fQ.4KMpbQuISs6N82q1Pj2IBj5u1LmNlYRC9b3KgibeJBM",
);

// Villa RDC type (Afrique de l'Ouest) — lineaire 134.96 m, dalle 20.30 x 9.15 m
const inputs = {
  global: {
    lin: 134.96,
    long_barre: 12,
    botte_ha6: 36,
    botte_ha8: 21,
    botte_ha10: 13,
    botte_ha12: 9,
    poids_sac: 50,
    briques_m2: 12,
    hourdis_m2: 10,
    long_planche: 4,
    hauteur_montee: 0.22,
    montes_par_sac: 3,
    camion_sable: 6,
    camion_g0525: 20,
    camion_g1525: 25,
    densite_gravier: 1.5,
  },
  s1: { larg: 0.8, ep: 0.1, dosage: 250 },
  s2: { larg: 0.8, ht: 0.2, dosage: 350, n_barres: 4, esp: 0.2, long_traverse: 0.85 },
  s3: {
    long: 0.8,
    larg: 0.8,
    prof: 0.4,
    np: 25,
    dosage: 350,
    n_barres: 4,
    esp: 0.25,
    long_traverse: 1.35,
  },
  s4: {
    n_barres: 4,
    ht: 1.5,
    np: 25,
    esp: 0.15,
    long_etrier: 1.0,
    dosage: 350,
    sect_b: 0.25,
    sect_h: 0.25,
  },
  s5: { ht_murs: 1.0 },
  s6: { larg: 0.2, ht: 0.15, dosage: 350, n_barres: 4, esp: 0.2, long_traverse: 0.7 },
  s7: { ht_murs: 3.0 },
  s8: { larg: 0.2, ht: 0.15, dosage: 350, n_barres: 4, esp: 0.2, long_traverse: 0.7 },
  s9: { larg: 0.2, ht: 0.15, dosage: 350, n_barres: 4, esp: 0.2, long_traverse: 0.7 },
  s10: { long_dall: 20.3, larg: 9.15 },
  s11: { larg_dall: 9.15, ep: 0.05, dosage: 350 },
  s12: { n_barres: 4, np: 3, esp: 0.15, long_etrier: 1.2, dosage: 350, sect_b: 0.25, sect_h: 0.35 },
  s13: { larg: 0.1, ht: 0.2, np: 18, esp_etr: 0.2, long_etrier: 0.7, dosage: 350 },
  s14: { esp: 0.2 },
  s15: { larg_dall: 9.15, ep: 0.12, dosage: 350 },
};

const { data: profile } = await admin
  .from("users")
  .select("company_id")
  .not("company_id", "is", null)
  .limit(1)
  .maybeSingle();

if (!profile?.company_id) {
  console.error("company_id introuvable");
  process.exit(1);
}

const { data, error } = await admin
  .from("debourses_models")
  .insert({
    company_id: profile.company_id,
    name: "Villa RDC type — 135 m lin.",
    inputs,
  })
  .select("id, name")
  .single();

if (error) {
  console.error("Erreur:", error.message);
  process.exit(1);
}
console.log("Modele insere :", data.name, "(id:", data.id + ")");
