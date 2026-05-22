-- Seed matériaux de référence pour BatiFlow CI
-- Source : produitbat.ci — marché ivoirien 2026
-- À exécuter APRÈS avoir créé une entreprise (remplacer <COMPANY_ID> par l'UUID réel)
-- Usage : SELECT id FROM companies LIMIT 1; -- puis remplacer ci-dessous

-- ====================================================
-- INSTRUCTIONS
-- 1. Récupère ton company_id : SELECT id FROM companies LIMIT 1;
-- 2. Remplace TOUTES les occurrences de '<COMPANY_ID>' par ton UUID
-- 3. Colle dans Supabase Dashboard > SQL Editor > Run
-- ====================================================

DO $$
DECLARE
  cid UUID := (SELECT id FROM companies LIMIT 1);
BEGIN

-- Si aucune company n'existe, stop
IF cid IS NULL THEN
  RAISE EXCEPTION 'Aucune company trouvée. Créez d''abord votre entreprise via /onboarding.';
END IF;

-- Évite les doublons
DELETE FROM materials WHERE company_id = cid AND name IN (
  'Ciment CPJ 32,5R','Ciment CPA 52,5N Blanc','Sable de carrière',
  'Gravier 5/25 granite','HA 8mm FE500 (botte 6×12m)','HA 10mm FE500 (botte 6×12m)',
  'HA 12mm FE500 (botte 6×12m)','HA 14mm FE500 (botte 6×12m)','HA 16mm FE500 (botte 6×12m)',
  'HA 20mm FE500 (botte 6×12m)','Brique creuse 12×20×40','Parpaing creux 15×20×40',
  'Pavé béton coloré','Mortier-colle C1 (sac 25kg)','Enduit joint rapide (sac 25kg)',
  'Carrelage sol grès cérame 60×60','Carrelage mural faïence 30×60','Carrelage extérieur antidérapant',
  'Joint carrelage (sac 5kg)','Tube PVC évacuation Ø40 (4m)','Tube PVC évacuation Ø75 (4m)',
  'Tube PVC évacuation Ø110 (6m)','Tube PPR alimentation Ø20','Robinet mitigeur lavabo',
  'Cuvette WC + réservoir','Lavabo céramique 60cm','Fil TH 2,5mm² (100m)',
  'Câble rigide VGV 3×2,5mm² (100m)','Gaine ICTA 3422 (50m)','Disjoncteur Ph+N 16A',
  'Interrupteur simple 10A','Prise 16A 2P+T','Tableau électrique 12 modules',
  'Spot LED encastrable 6W','Contreplaqué formica 18mm (244×122)','Porte isoplane 90×210',
  'Serrure à encastrer','Chevron 75×50mm (6m)','Peinture vinylique intérieure 20L',
  'Peinture vinylique extérieure 20L','Enduit de lissage intérieur (25kg)',
  'Sous-couche universelle 10L','Vernis bois 1L','Polyane film plastique',
  'Membrane bitumineuse (rouleau 10m)','Sika Imper Mur (5kg)',
  'Plaque de plâtre BA13','Rail cloison métallique (3m)','Laine de verre isolation',
  'Fenêtre aluminium coulissante 100×120','Porte aluminium 90×210','Verre simple 4mm'
);

INSERT INTO materials (company_id, name, category, unit, stock_qty, min_stock_qty, unit_cost) VALUES

-- CIMENTS & LIANTS
(cid, 'Ciment CPJ 32,5R',            'cement',       'sac 50kg',  100, 20,   4750),
(cid, 'Ciment CPA 52,5N Blanc',       'cement',       'sac 50kg',   20,  5,  18000),

-- SABLE & GRAVIER
(cid, 'Sable de carrière',            'sand_gravel',  'm³',          10,  3,  20000),
(cid, 'Gravier 5/25 granite',         'sand_gravel',  'm³',          10,  3,  30000),

-- FER À BÉTON
(cid, 'HA 8mm FE500 (botte 6×12m)',   'steel',        'botte',       20,  5,  48000),
(cid, 'HA 10mm FE500 (botte 6×12m)',  'steel',        'botte',       20,  5,  52000),
(cid, 'HA 12mm FE500 (botte 6×12m)',  'steel',        'botte',       15,  5,  72000),
(cid, 'HA 14mm FE500 (botte 6×12m)',  'steel',        'botte',       10,  3,  95000),
(cid, 'HA 16mm FE500 (botte 6×12m)',  'steel',        'botte',       10,  3, 120000),
(cid, 'HA 20mm FE500 (botte 6×12m)',  'steel',        'botte',       10,  3, 155000),

-- BRIQUES & BLOCS
(cid, 'Brique creuse 12×20×40',       'other',        'unité',     2000, 200,    320),
(cid, 'Parpaing creux 15×20×40',      'other',        'unité',     2000, 200,    375),
(cid, 'Pavé béton coloré',            'other',        'm²',           0,   0,   7000),

-- CARRELAGE
(cid, 'Mortier-colle C1 (sac 25kg)',  'other',        'sac',         50,  10,   6000),
(cid, 'Enduit joint rapide (sac 25kg)','other',        'sac',         30,  10,  10000),
(cid, 'Carrelage sol grès cérame 60×60','other',       'm²',           0,   0,  10000),
(cid, 'Carrelage mural faïence 30×60','other',        'm²',           0,   0,   7500),
(cid, 'Carrelage extérieur antidérapant','other',      'm²',           0,   0,   9000),
(cid, 'Joint carrelage (sac 5kg)',     'other',        'sac',         20,   5,   3500),

-- PLOMBERIE
(cid, 'Tube PVC évacuation Ø40 (4m)', 'plumbing',     'barre',       20,   5,   3500),
(cid, 'Tube PVC évacuation Ø75 (4m)', 'plumbing',     'barre',       15,   5,   8500),
(cid, 'Tube PVC évacuation Ø110 (6m)','plumbing',     'barre',       15,   5,  18500),
(cid, 'Tube PPR alimentation Ø20',    'plumbing',     'rouleau 100m',  5,  2,  45000),
(cid, 'Robinet mitigeur lavabo',       'plumbing',     'unité',        5,   2,  20000),
(cid, 'Cuvette WC + réservoir',        'plumbing',     'ensemble',     3,   1,  55000),
(cid, 'Lavabo céramique 60cm',         'plumbing',     'unité',        3,   1,  30000),

-- ÉLECTRICITÉ
(cid, 'Fil TH 2,5mm² (100m)',          'electrical',   'rouleau',     10,   3,  27000),
(cid, 'Câble rigide VGV 3×2,5mm² (100m)','electrical', 'rouleau',      5,   2,  92000),
(cid, 'Gaine ICTA 3422 (50m)',          'electrical',   'rouleau',     10,   3,  53000),
(cid, 'Disjoncteur Ph+N 16A',           'electrical',   'unité',       20,   5,   8000),
(cid, 'Interrupteur simple 10A',        'electrical',   'unité',       30,  10,   2000),
(cid, 'Prise 16A 2P+T',                'electrical',   'unité',       30,  10,   3500),
(cid, 'Tableau électrique 12 modules',  'electrical',   'unité',        5,   2,  22000),
(cid, 'Spot LED encastrable 6W',        'electrical',   'unité',       20,   5,   4000),

-- MENUISERIE BOIS
(cid, 'Contreplaqué formica 18mm (244×122)','wood',    'panneau',     10,   3,  32000),
(cid, 'Porte isoplane 90×210',          'wood',        'unité',        5,   2,  45000),
(cid, 'Serrure à encastrer',            'wood',        'unité',       10,   3,  20000),
(cid, 'Chevron 75×50mm (6m)',           'wood',        'unité',       30,  10,  10000),

-- PEINTURES
(cid, 'Peinture vinylique intérieure 20L','paint',      'seau',        10,   3,  42000),
(cid, 'Peinture vinylique extérieure 20L','paint',      'seau',        10,   3,  50000),
(cid, 'Enduit de lissage intérieur (25kg)','paint',     'sac',         20,   5,  14000),
(cid, 'Sous-couche universelle 10L',     'paint',       'seau',        10,   3,  22000),
(cid, 'Vernis bois 1L',                  'paint',       'litre',        5,   2,   6000),

-- ÉTANCHÉITÉ
(cid, 'Polyane film plastique',          'other',       'ml',          50,  10,   1300),
(cid, 'Membrane bitumineuse (rouleau 10m)','other',     'rouleau',     10,   3,  40500),
(cid, 'Sika Imper Mur (5kg)',            'other',       'pot',         10,   3,  25500),

-- CLOISONS & PLAFONDS
(cid, 'Plaque de plâtre BA13',           'other',       'plaque',      30,  10,  10000),
(cid, 'Rail cloison métallique (3m)',    'other',       'ml',          50,  15,   3000),
(cid, 'Laine de verre isolation',        'other',       'rouleau',      5,   2,  45000),

-- ALUMINIUM & VITRAGE
(cid, 'Fenêtre aluminium coulissante 100×120','other', 'unité',        0,   0, 120000),
(cid, 'Porte aluminium 90×210',          'other',       'unité',       0,   0, 160000),
(cid, 'Verre simple 4mm',               'other',       'm²',           0,   0,  17000);

END $$;
