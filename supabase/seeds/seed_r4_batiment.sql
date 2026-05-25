-- ============================================================
-- Données test : Immeuble R+4 "Résidence Les Palmiers" - Abidjan
-- Bâtiment : 12m × 10m, 5 niveaux (RDC + R+1 + R+2 + R+3 + R+4)
-- ============================================================

DO $$
DECLARE
  v_company_id  uuid;
  v_project_id  uuid;

  -- IDs matériaux (générés une fois, réutilisés dans les recettes)
  m_ciment      uuid := gen_random_uuid();
  m_sable       uuid := gen_random_uuid();
  m_gravier     uuid := gen_random_uuid();
  m_agglos15    uuid := gen_random_uuid();
  m_fer10       uuid := gen_random_uuid();
  m_fer12       uuid := gen_random_uuid();
  m_carrelage   uuid := gen_random_uuid();
  m_peinture    uuid := gen_random_uuid();
  m_coffrage    uuid := gen_random_uuid();
  m_enduit      uuid := gen_random_uuid();

  v_qn          numeric; -- quantité nette courante
BEGIN

  -- ============================================================
  -- 0. COMPANY
  -- ============================================================
  SELECT id INTO v_company_id FROM companies ORDER BY created_at LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Aucune entreprise trouvée. Créez d''abord un compte BatiFlow.';
  END IF;

  -- ============================================================
  -- 1. MATÉRIAUX
  -- ============================================================
  INSERT INTO materials (id, company_id, name, category, unit, stock_qty, unit_cost)
  VALUES
    (m_ciment,    v_company_id, 'Ciment CPA 42.5',        'cement',     'sac',  500,   6500),
    (m_sable,     v_company_id, 'Sable de rivière',        'sand_gravel','m³',   100,  15000),
    (m_gravier,   v_company_id, 'Gravier 15/25',           'sand_gravel','m³',    80,  18000),
    (m_agglos15,  v_company_id, 'Agglos 15×20×40',         'cement',     'u',   5000,    450),
    (m_fer10,     v_company_id, 'Fer à béton ∅10mm',       'steel',      'kg',  2000,    650),
    (m_fer12,     v_company_id, 'Fer à béton ∅12mm',       'steel',      'kg',  1000,    660),
    (m_carrelage, v_company_id, 'Carrelage grès cérame 60×60','other',   'm²',   400,  12000),
    (m_peinture,  v_company_id, 'Peinture acrylique blanc','paint',      'L',    200,   2500),
    (m_coffrage,  v_company_id, 'Bois de coffrage',        'wood',       'm²',   300,   3500),
    (m_enduit,    v_company_id, 'Enduit ciment fin',       'cement',     'sac',  200,   4500);

  -- ============================================================
  -- 2. PROJET
  -- ============================================================
  INSERT INTO projects (id, company_id, name, description, address, status, budget, created_by)
  VALUES (
    gen_random_uuid(), v_company_id,
    'Résidence Les Palmiers R+4',
    'Immeuble résidentiel R+4 — 12m×10m — 5 niveaux — 600m² de plancher',
    'Abidjan, Cocody II Plateaux',
    'in_progress',
    450000000,
    (SELECT id FROM users WHERE company_id = v_company_id LIMIT 1)
  )
  RETURNING id INTO v_project_id;

  -- ============================================================
  -- 3. OUVRAGES
  -- Structure : (v_qn = quantite_nette)
  -- Recette JSON : coefficient = quantité par unité d'ouvrage
  -- Recette calculée : quantite_nette + quantite_commande (avec pertes)
  -- ============================================================

  -- ------------------------------------------------------------
  -- Ouvrage 1 — Fouilles en rigoles
  -- 44ml × 0.80m × 1.50m = 52.80m³
  -- ------------------------------------------------------------
  v_qn := 52.80;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Fouilles en rigoles pour fondations',
    'volume_l_l_h',
    '{"longueur":44,"largeur":0.80,"hauteur":1.50}'::jsonb,
    '[]'::jsonb,
    v_qn, v_qn, 'm³',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_coffrage::text,'materiau_nom','Bois de coffrage','unite','m²','coefficient',0.30,'taux_perte',0.15,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_coffrage::text,'materiau_nom','Bois de coffrage','unite','m²','coefficient',0.30,'taux_perte',0.15,'type','materiau',
        'quantite_nette', round(v_qn*0.30, 2),
        'quantite_commande', round(v_qn*0.30*1.15, 2))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 2 — Béton de propreté B15
  -- 44ml × 0.50m × 0.08m = 1.76m³
  -- ------------------------------------------------------------
  v_qn := 1.76;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Béton de propreté B15',
    'volume_l_l_h',
    '{"longueur":44,"largeur":0.50,"hauteur":0.08}'::jsonb,
    '[]'::jsonb,
    v_qn, v_qn, 'm³',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',4.0,'taux_perte',0.02,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.70,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.70,'taux_perte',0.05,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',4.0,'taux_perte',0.02,'type','materiau',
        'quantite_nette',round(v_qn*4.0,3),'quantite_commande',round(v_qn*4.0*1.02,3)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.70,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.70,3),'quantite_commande',round(v_qn*0.70*1.05,3)),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.70,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.70,3),'quantite_commande',round(v_qn*0.70*1.05,3))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 3 — Semelles filantes béton armé B25
  -- 44ml × 0.50m × 0.40m = 8.80m³
  -- ------------------------------------------------------------
  v_qn := 8.80;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Semelles filantes béton armé B25',
    'volume_l_l_h',
    '{"longueur":44,"largeur":0.50,"hauteur":0.40}'::jsonb,
    '[]'::jsonb,
    v_qn, v_qn, 'm³',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',7.0,'taux_perte',0.02,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.40,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.80,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_fer12::text,'materiau_nom','Fer à béton ∅12mm','unite','kg','coefficient',80.0,'taux_perte',0.05,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',7.0,'taux_perte',0.02,'type','materiau',
        'quantite_nette',round(v_qn*7.0,2),'quantite_commande',round(v_qn*7.0*1.02,2)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.40,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.40,3),'quantite_commande',round(v_qn*0.40*1.05,3)),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.80,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.80,3),'quantite_commande',round(v_qn*0.80*1.05,3)),
      jsonb_build_object('materiau_id',m_fer12::text,'materiau_nom','Fer à béton ∅12mm','unite','kg','coefficient',80.0,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*80.0,1),'quantite_commande',round(v_qn*80.0*1.05,1))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 4 — Poteaux RDC (15 poteaux ∅30cm × H3.50m)
  -- Type: unite — 1 unité = 1 poteau
  -- Volume béton/poteau = π×0.15²×3.5 = 0.247m³
  -- ------------------------------------------------------------
  v_qn := 15;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Poteaux RDC ∅30cm × H3.50m (15 poteaux)',
    'unite',
    '{"longueur":15}'::jsonb,
    '[]'::jsonb,
    v_qn, v_qn, 'u',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',1.732,'taux_perte',0.02,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.099,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.198,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_fer10::text,'materiau_nom','Fer à béton ∅10mm','unite','kg','coefficient',12.0,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_coffrage::text,'materiau_nom','Bois de coffrage','unite','m²','coefficient',3.30,'taux_perte',0.10,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',1.732,'taux_perte',0.02,'type','materiau',
        'quantite_nette',round(v_qn*1.732,2),'quantite_commande',round(v_qn*1.732*1.02,2)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.099,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.099,3),'quantite_commande',round(v_qn*0.099*1.05,3)),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.198,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.198,3),'quantite_commande',round(v_qn*0.198*1.05,3)),
      jsonb_build_object('materiau_id',m_fer10::text,'materiau_nom','Fer à béton ∅10mm','unite','kg','coefficient',12.0,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*12.0,1),'quantite_commande',round(v_qn*12.0*1.05,1)),
      jsonb_build_object('materiau_id',m_coffrage::text,'materiau_nom','Bois de coffrage','unite','m²','coefficient',3.30,'taux_perte',0.10,'type','materiau',
        'quantite_nette',round(v_qn*3.30,2),'quantite_commande',round(v_qn*3.30*1.10,2))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 5 — Poteaux R+1 à R+4 (60 poteaux ∅25cm × H3.00m)
  -- Volume béton/poteau = π×0.125²×3.0 = 0.147m³
  -- ------------------------------------------------------------
  v_qn := 60;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Poteaux R+1 à R+4 ∅25cm × H3.00m (60 poteaux)',
    'unite',
    '{"longueur":60}'::jsonb,
    '[]'::jsonb,
    v_qn, v_qn, 'u',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',1.031,'taux_perte',0.02,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.059,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.118,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_fer10::text,'materiau_nom','Fer à béton ∅10mm','unite','kg','coefficient',10.0,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_coffrage::text,'materiau_nom','Bois de coffrage','unite','m²','coefficient',2.36,'taux_perte',0.10,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',1.031,'taux_perte',0.02,'type','materiau',
        'quantite_nette',round(v_qn*1.031,2),'quantite_commande',round(v_qn*1.031*1.02,2)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.059,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.059,3),'quantite_commande',round(v_qn*0.059*1.05,3)),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.118,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.118,3),'quantite_commande',round(v_qn*0.118*1.05,3)),
      jsonb_build_object('materiau_id',m_fer10::text,'materiau_nom','Fer à béton ∅10mm','unite','kg','coefficient',10.0,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*10.0,1),'quantite_commande',round(v_qn*10.0*1.05,1)),
      jsonb_build_object('materiau_id',m_coffrage::text,'materiau_nom','Bois de coffrage','unite','m²','coefficient',2.36,'taux_perte',0.10,'type','materiau',
        'quantite_nette',round(v_qn*2.36,2),'quantite_commande',round(v_qn*2.36*1.10,2))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 6 — Murs de façade RDC (agglos 15cm)
  -- 44ml × 3.50m = 154m² brut
  -- Vides : portail + 2 portes + 4 fenêtres = 17.04m²
  -- Net = 136.96m²
  -- ------------------------------------------------------------
  v_qn := 136.96;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Murs de façade RDC en agglos 15cm',
    'surface_l_h',
    '{"longueur":44,"hauteur":3.50}'::jsonb,
    jsonb_build_array(
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Portail principal','largeur',3.00,'hauteur',2.50,'surface',7.50),
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Porte principale','largeur',0.90,'hauteur',2.10,'surface',1.89),
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Porte secondaire','largeur',0.90,'hauteur',2.10,'surface',1.89),
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Fenêtre façade 1','largeur',1.20,'hauteur',1.20,'surface',1.44),
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Fenêtre façade 2','largeur',1.20,'hauteur',1.20,'surface',1.44),
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Fenêtre façade 3','largeur',1.20,'hauteur',1.20,'surface',1.44),
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Fenêtre façade 4','largeur',1.20,'hauteur',1.20,'surface',1.44)
    ),
    154.00, v_qn, 'm²',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_agglos15::text,'materiau_nom','Agglos 15×20×40','unite','u','coefficient',13.5,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',0.025,'taux_perte',0.03,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.012,'taux_perte',0.05,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_agglos15::text,'materiau_nom','Agglos 15×20×40','unite','u','coefficient',13.5,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*13.5,0),'quantite_commande',round(v_qn*13.5*1.05,0)),
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',0.025,'taux_perte',0.03,'type','materiau',
        'quantite_nette',round(v_qn*0.025,2),'quantite_commande',round(v_qn*0.025*1.03,2)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.012,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.012,3),'quantite_commande',round(v_qn*0.012*1.05,3))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 7 — Murs de façade R+1 à R+4 (agglos 15cm, 4 niveaux)
  -- 44ml × 3.00m × 4 niveaux = 528m² brut
  -- Vides : 16 portes + 32 fenêtres = 76.32m²
  -- Net = 451.68m²
  -- ------------------------------------------------------------
  v_qn := 451.68;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Murs de façade R+1 à R+4 en agglos 15cm (4 niveaux)',
    'surface_l_h',
    '{"longueur":176,"hauteur":3.00}'::jsonb,
    jsonb_build_array(
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Portes intérieures R1→R4 (16 portes)','largeur',14.40,'hauteur',2.10,'surface',30.24),
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Fenêtres R1→R4 (32 fenêtres)','largeur',38.40,'hauteur',1.20,'surface',46.08)
    ),
    528.00, v_qn, 'm²',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_agglos15::text,'materiau_nom','Agglos 15×20×40','unite','u','coefficient',13.5,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',0.025,'taux_perte',0.03,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.012,'taux_perte',0.05,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_agglos15::text,'materiau_nom','Agglos 15×20×40','unite','u','coefficient',13.5,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*13.5,0),'quantite_commande',round(v_qn*13.5*1.05,0)),
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',0.025,'taux_perte',0.03,'type','materiau',
        'quantite_nette',round(v_qn*0.025,2),'quantite_commande',round(v_qn*0.025*1.03,2)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.012,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.012,3),'quantite_commande',round(v_qn*0.012*1.05,3))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 8 — Dalle plancher RDC béton armé B25
  -- 12m × 10m × 0.15m = 18.00m³
  -- ------------------------------------------------------------
  v_qn := 18.00;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Dalle plancher RDC béton armé B25 ep.15cm',
    'volume_l_l_h',
    '{"longueur":12,"largeur":10,"hauteur":0.15}'::jsonb,
    '[]'::jsonb,
    v_qn, v_qn, 'm³',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',7.0,'taux_perte',0.02,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.40,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.80,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_fer10::text,'materiau_nom','Fer à béton ∅10mm','unite','kg','coefficient',80.0,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_coffrage::text,'materiau_nom','Bois de coffrage','unite','m²','coefficient',0.80,'taux_perte',0.10,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',7.0,'taux_perte',0.02,'type','materiau',
        'quantite_nette',round(v_qn*7.0,1),'quantite_commande',round(v_qn*7.0*1.02,1)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.40,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.40,2),'quantite_commande',round(v_qn*0.40*1.05,2)),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.80,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.80,2),'quantite_commande',round(v_qn*0.80*1.05,2)),
      jsonb_build_object('materiau_id',m_fer10::text,'materiau_nom','Fer à béton ∅10mm','unite','kg','coefficient',80.0,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*80.0,0),'quantite_commande',round(v_qn*80.0*1.05,0)),
      jsonb_build_object('materiau_id',m_coffrage::text,'materiau_nom','Bois de coffrage','unite','m²','coefficient',0.80,'taux_perte',0.10,'type','materiau',
        'quantite_nette',round(v_qn*0.80,2),'quantite_commande',round(v_qn*0.80*1.10,2))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 9 — Dalles R+1 à Terrasse béton armé B25 (5 dalles)
  -- 12m × 10m × 0.15m × 5 niveaux = 90.00m³
  -- ------------------------------------------------------------
  v_qn := 90.00;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Dalles R+1 à Terrasse béton armé B25 ep.15cm (5 dalles)',
    'volume_l_l_h',
    '{"longueur":12,"largeur":10,"hauteur":0.75}'::jsonb,
    '[]'::jsonb,
    v_qn, v_qn, 'm³',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',7.0,'taux_perte',0.02,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.40,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.80,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_fer10::text,'materiau_nom','Fer à béton ∅10mm','unite','kg','coefficient',80.0,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_coffrage::text,'materiau_nom','Bois de coffrage','unite','m²','coefficient',0.80,'taux_perte',0.10,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',7.0,'taux_perte',0.02,'type','materiau',
        'quantite_nette',round(v_qn*7.0,0),'quantite_commande',round(v_qn*7.0*1.02,0)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.40,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.40,1),'quantite_commande',round(v_qn*0.40*1.05,1)),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.80,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.80,1),'quantite_commande',round(v_qn*0.80*1.05,1)),
      jsonb_build_object('materiau_id',m_fer10::text,'materiau_nom','Fer à béton ∅10mm','unite','kg','coefficient',80.0,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*80.0,0),'quantite_commande',round(v_qn*80.0*1.05,0)),
      jsonb_build_object('materiau_id',m_coffrage::text,'materiau_nom','Bois de coffrage','unite','m²','coefficient',0.80,'taux_perte',0.10,'type','materiau',
        'quantite_nette',round(v_qn*0.80,1),'quantite_commande',round(v_qn*0.80*1.10,1))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 10 — Escaliers intérieurs (5 volées × 14 marches)
  -- 70 marches × (0.28+0.175)m × 1.20m = 38.22m²
  -- ------------------------------------------------------------
  v_qn := 38.22;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Escaliers intérieurs béton armé (5 volées × 14 marches)',
    'escalier',
    '{"nb_marches":70,"giron":0.28,"contremarche":0.175,"largeur":1.20}'::jsonb,
    '[]'::jsonb,
    v_qn, v_qn, 'm²',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',0.12,'taux_perte',0.03,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.060,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.100,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_fer10::text,'materiau_nom','Fer à béton ∅10mm','unite','kg','coefficient',15.0,'taux_perte',0.05,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',0.12,'taux_perte',0.03,'type','materiau',
        'quantite_nette',round(v_qn*0.12,2),'quantite_commande',round(v_qn*0.12*1.03,2)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.060,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.060,3),'quantite_commande',round(v_qn*0.060*1.05,3)),
      jsonb_build_object('materiau_id',m_gravier::text,'materiau_nom','Gravier 15/25','unite','m³','coefficient',0.100,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.100,3),'quantite_commande',round(v_qn*0.100*1.05,3)),
      jsonb_build_object('materiau_id',m_fer10::text,'materiau_nom','Fer à béton ∅10mm','unite','kg','coefficient',15.0,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*15.0,1),'quantite_commande',round(v_qn*15.0*1.05,1))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 11 — Enduit façade extérieure
  -- 44ml × 15.5m (hauteur totale) = 682m² brut
  -- Vides totaux (RDC+étages) = 93.36m² → Net = 588.64m²
  -- ------------------------------------------------------------
  v_qn := 588.64;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Enduit ciment façade extérieure (5 niveaux)',
    'surface_l_h',
    '{"longueur":44,"hauteur":15.50}'::jsonb,
    jsonb_build_array(
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Toutes ouvertures RDC','largeur',17.04,'hauteur',1.00,'surface',17.04),
      jsonb_build_object('id',gen_random_uuid()::text,'nom','Toutes ouvertures R1→R4','largeur',76.32,'hauteur',1.00,'surface',76.32)
    ),
    682.00, v_qn, 'm²',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_enduit::text,'materiau_nom','Enduit ciment fin','unite','sac','coefficient',0.15,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.018,'taux_perte',0.05,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_enduit::text,'materiau_nom','Enduit ciment fin','unite','sac','coefficient',0.15,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.15,2),'quantite_commande',round(v_qn*0.15*1.05,2)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.018,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.018,3),'quantite_commande',round(v_qn*0.018*1.05,3))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 12 — Carrelage sol (5 niveaux × 120m² = 600m²)
  -- ------------------------------------------------------------
  v_qn := 600.00;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Carrelage grès cérame 60×60 sol (5 niveaux × 120m²)',
    'surface_l_h',
    '{"longueur":30,"hauteur":20}'::jsonb,
    '[]'::jsonb,
    v_qn, v_qn, 'm²',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_carrelage::text,'materiau_nom','Carrelage grès cérame 60×60','unite','m²','coefficient',1.0,'taux_perte',0.08,'type','materiau'),
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',0.004,'taux_perte',0.05,'type','materiau'),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.005,'taux_perte',0.05,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_carrelage::text,'materiau_nom','Carrelage grès cérame 60×60','unite','m²','coefficient',1.0,'taux_perte',0.08,'type','materiau',
        'quantite_nette',round(v_qn*1.0,0),'quantite_commande',round(v_qn*1.0*1.08,0)),
      jsonb_build_object('materiau_id',m_ciment::text,'materiau_nom','Ciment CPA 42.5','unite','sac','coefficient',0.004,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.004,2),'quantite_commande',round(v_qn*0.004*1.05,2)),
      jsonb_build_object('materiau_id',m_sable::text,'materiau_nom','Sable de rivière','unite','m³','coefficient',0.005,'taux_perte',0.05,'type','materiau',
        'quantite_nette',round(v_qn*0.005,2),'quantite_commande',round(v_qn*0.005*1.05,2))
    )
  );

  -- ------------------------------------------------------------
  -- Ouvrage 13 — Peinture intérieure (murs + plafonds, 5 niveaux)
  -- Murs intérieurs : 40ml × 15m = 600m² × 2 faces = 1200m²
  -- Plafonds : 120m² × 5 = 600m²  → Total = 1800m²
  -- ------------------------------------------------------------
  v_qn := 1800.00;
  INSERT INTO project_ouvrages (id, project_id, company_id, designation, type_geometrie, dimensions, vides_deduits, quantite_brute, quantite_nette, unite_principale, recette, recette_calculee)
  VALUES (gen_random_uuid(), v_project_id, v_company_id,
    'Peinture acrylique intérieure murs + plafonds (5 niveaux)',
    'surface_l_h',
    '{"longueur":60,"hauteur":30}'::jsonb,
    '[]'::jsonb,
    v_qn, v_qn, 'm²',
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_peinture::text,'materiau_nom','Peinture acrylique blanc','unite','L','coefficient',0.25,'taux_perte',0.10,'type','materiau')
    ),
    jsonb_build_array(
      jsonb_build_object('materiau_id',m_peinture::text,'materiau_nom','Peinture acrylique blanc','unite','L','coefficient',0.25,'taux_perte',0.10,'type','materiau',
        'quantite_nette',round(v_qn*0.25,0),'quantite_commande',round(v_qn*0.25*1.10,0))
    )
  );

  RAISE NOTICE '✅ Données R+4 insérées avec succès !';
  RAISE NOTICE '   → 10 matériaux créés';
  RAISE NOTICE '   → Projet : Résidence Les Palmiers R+4';
  RAISE NOTICE '   → 13 ouvrages créés (fouilles → peinture)';
  RAISE NOTICE '   → Allez sur /metres pour générer le devis IA';

END $$;
