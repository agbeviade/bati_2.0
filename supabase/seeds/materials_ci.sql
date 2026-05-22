-- Seed matériaux de référence pour BatiFlow CI
-- Source : produitbat.ci — scraping marché ivoirien 2026
-- À exécuter dans Supabase Dashboard > SQL Editor > Run

DO $$
DECLARE
  cid UUID := (SELECT id FROM companies LIMIT 1);
BEGIN

IF cid IS NULL THEN
  RAISE EXCEPTION 'Aucune company trouvée. Créez d''abord votre entreprise via /onboarding.';
END IF;

DELETE FROM materials WHERE company_id = cid AND name IN (
  'Ciment CPJ 32,5R (sac 50kg)','Ciment CPA 52,5N Blanc','Sable de carrière',
  'Gravier 5/25 granite','HA 8mm FE500','HA 10mm FE500','HA 12mm FE500',
  'HA 14mm FE500','HA 16mm FE500','HA 20mm FE500',
  'Brique creuse 12×20×40','Brique creuse 15×20×40','Parpaing creux 15×20×40',
  'Hourdis américain 12×20×53','Pavé béton coloré',
  'Mortier-colle C1 (sac 25kg)','Mortier-colle C2 (sac 25kg)',
  'Enduit joint rapide (sac 25kg)',
  'Carrelage sol grès cérame 60×60','Carrelage mural faïence 30×60',
  'Carrelage extérieur antidérapant','Joint carrelage (sac 5kg)',
  'Tube PVC évacuation Ø40','Tube PVC évacuation Ø75','Tube PVC évacuation Ø110',
  'Tube PPR alimentation Ø20','Robinet mitigeur lavabo',
  'Cuvette WC + réservoir','Lavabo céramique 60cm',
  'Fil TH 2,5mm² (100m)','Câble VGV 3×2,5mm² (100m)','Câble VGV 3×1,5mm² (100m)',
  'Gaine ICTA 3422 (50m)','Disjoncteur Ph+N 16A','Disjoncteur Ph+N 10A',
  'Interrupteur simple 10A','Prise 16A 2P+T','Tableau électrique 12 modules',
  'Spot LED encastrable 6W','Contreplaqué formica 18mm','Porte isoplane 90×210',
  'Serrure à encastrer','Chevron 75×50mm (6m)',
  'Peinture vinylique intérieure 30kg','Peinture vinylique extérieure 30kg',
  'Enduit de lissage intérieur (25kg)','Sous-couche universelle 10L','Vernis bois 1L',
  'Polyane film plastique','Membrane bitumineuse (rouleau 10m)',
  'Sika Imper Mur (5kg)','SikaCem Hydrofuge 20L',
  'Plaque de plâtre BA13','Rail cloison métallique (3m)','Laine de verre isolation',
  'Fenêtre aluminium coulissante 100×120','Porte aluminium 90×210','Verre simple 4mm'
);

INSERT INTO materials (company_id, name, category, unit, stock_qty, min_stock_qty, unit_cost) VALUES

-- ============================================================
-- CIMENTS & LIANTS
-- ============================================================
(cid, 'Ciment CPJ 32,5R (sac 50kg)',         'cement',      'sac',         100, 20,  4750),
(cid, 'Ciment CPA 52,5N Blanc',               'cement',      'sac 50kg',     20,  5, 18000),
(cid, 'Mortier-colle C1 (sac 25kg)',          'cement',      'sac',          50, 10,  6000),
(cid, 'Mortier-colle C2 SIKACERAM (sac 25kg)','cement',      'sac',          20,  5,  8500),
(cid, 'Enduit joint rapide (sac 25kg)',        'cement',      'sac',          30, 10, 10000),

-- ============================================================
-- SABLE & GRAVIER
-- ============================================================
(cid, 'Sable de carrière',                    'sand_gravel', 'm³',           10,  3, 20000),
(cid, 'Sable de mer',                         'sand_gravel', 'm³',           10,  3, 17500),
(cid, 'Gravier 5/25 granite',                 'sand_gravel', 'm³',           10,  3, 30000),
(cid, 'Latérite compactage',                  'sand_gravel', 'm³',            5,  2, 10000),

-- ============================================================
-- FER À BÉTON
-- ============================================================
(cid, 'HA 8mm FE500',                         'steel',       'botte',        20,  5, 46000),
(cid, 'HA 10mm FE500',                        'steel',       'botte',        20,  5, 52000),
(cid, 'HA 12mm FE500',                        'steel',       'botte',        15,  5, 62100),
(cid, 'HA 14mm FE500',                        'steel',       'botte',        10,  3, 52000),
(cid, 'HA 16mm FE500',                        'steel',       'botte',        10,  3, 52000),
(cid, 'HA 20mm FE500',                        'steel',       'botte',        10,  3, 52000),
(cid, 'Tôle striée 3mm 1500×3000',            'steel',       'unité',         5,  2,105000),
(cid, 'Cornière acier 50×50×3mm (6m)',         'steel',       'barre',        10,  3, 13350),
(cid, 'Fer plat 40×6mm (6m)',                  'steel',       'barre',        10,  3, 13100),

-- ============================================================
-- BRIQUES & BLOCS
-- ============================================================
(cid, 'Brique creuse 12×20×40',               'other',       'unité',      2000,200,   330),
(cid, 'Brique creuse 15×20×40',               'other',       'unité',      1000,200,   370),
(cid, 'Parpaing creux 15×20×40',              'other',       'unité',      2000,200,   375),
(cid, 'Hourdis américain 12×20×53',           'other',       'unité',       500,100,   550),
(cid, 'Hourdis américain 15×20×53',           'other',       'unité',       300, 50,   750),
(cid, 'Pavé béton coloré',                    'other',       'm²',            0,  0,  7000),

-- ============================================================
-- CARRELAGE & REVÊTEMENT
-- ============================================================
(cid, 'Carrelage sol grès cérame 60×60',      'other',       'm²',            0,  0, 10000),
(cid, 'Carrelage mural faïence 30×60',        'other',       'm²',            0,  0,  7500),
(cid, 'Carrelage extérieur antidérapant',     'other',       'm²',            0,  0,  9000),
(cid, 'Joint carrelage (sac 5kg)',             'other',       'sac',          20,  5,  3500),

-- ============================================================
-- PLOMBERIE
-- ============================================================
(cid, 'Tube PVC évacuation Ø40',              'plumbing',    'barre 4m',     20,  5,  3500),
(cid, 'Tube PVC évacuation Ø75',              'plumbing',    'barre 4m',     15,  5,  8500),
(cid, 'Tube PVC évacuation Ø110',             'plumbing',    'barre 6m',     15,  5, 18500),
(cid, 'Tube PPR alimentation Ø20',            'plumbing',    'rouleau 100m',  5,  2, 45000),
(cid, 'Robinet mitigeur lavabo',              'plumbing',    'unité',         5,  2, 20000),
(cid, 'Robinet de puisage 3/4',              'plumbing',    'unité',        10,  3,  3000),
(cid, 'Cuvette WC + réservoir',               'plumbing',    'ensemble',      3,  1, 55000),
(cid, 'Lavabo céramique 60cm',                'plumbing',    'unité',         3,  1, 30000),
(cid, 'Receveur de douche 80×80',             'plumbing',    'unité',         2,  1, 50000),

-- ============================================================
-- ÉLECTRICITÉ
-- ============================================================
(cid, 'Fil TH 2,5mm² (100m)',                 'electrical',  'rouleau',      10,  3, 27000),
(cid, 'Câble VGV 3×2,5mm² (100m)',            'electrical',  'rouleau',       5,  2, 92000),
(cid, 'Câble VGV 3×1,5mm² (100m)',            'electrical',  'rouleau',       5,  2, 87000),
(cid, 'Gaine ICTA 3422 (50m)',                'electrical',  'rouleau',      10,  3, 53000),
(cid, 'Disjoncteur Ph+N 10A',                 'electrical',  'unité',        20,  5,  7500),
(cid, 'Disjoncteur Ph+N 16A',                 'electrical',  'unité',        20,  5,  8000),
(cid, 'Interrupteur simple 10A',              'electrical',  'unité',        30, 10,  2500),
(cid, 'Prise 16A 2P+T',                       'electrical',  'unité',        30, 10,  3500),
(cid, 'Tableau électrique 12 modules',        'electrical',  'unité',         5,  2, 22000),
(cid, 'Spot LED encastrable 6W',              'electrical',  'unité',        20,  5,  4000),
(cid, 'Hublot ovale E27',                     'electrical',  'unité',        10,  3,  3750),

-- ============================================================
-- MENUISERIE BOIS
-- ============================================================
(cid, 'Contreplaqué formica 18mm',            'wood',        'panneau',      10,  3, 32000),
(cid, 'Contreplaqué formica 15mm',            'wood',        'panneau',      10,  3, 25000),
(cid, 'Porte isoplane 90×210',                'wood',        'unité',         5,  2, 45000),
(cid, 'Serrure à encastrer',                  'wood',        'unité',        10,  3, 20000),
(cid, 'Chevron 75×50mm (6m)',                 'wood',        'unité',        30, 10, 10000),
(cid, 'Chevron bois 6/8 brut (4m)',           'wood',        'unité',        20, 10,  4500),

-- ============================================================
-- PEINTURES & ENDUITS
-- ============================================================
(cid, 'Peinture vinylique intérieure 30kg',   'paint',       'seau',         10,  3, 30000),
(cid, 'Peinture vinylique extérieure 30kg',   'paint',       'seau',         10,  3, 39000),
(cid, 'Enduit de lissage intérieur (25kg)',    'paint',       'sac',          20,  5, 14000),
(cid, 'Sous-couche universelle 10L',          'paint',       'seau',         10,  3, 22000),
(cid, 'Vernis bois 1L',                       'paint',       'litre',         5,  2,  4300),
(cid, 'Diluant cellulosique 4L',              'paint',       'bidon',         5,  2,  8000),

-- ============================================================
-- ÉTANCHÉITÉ
-- ============================================================
(cid, 'Polyane film plastique',               'other',       'ml',           50, 10,  1300),
(cid, 'Membrane bitumineuse (rouleau 10m)',    'other',       'rouleau',      10,  3, 40500),
(cid, 'HYRENE TS membrane polyester',         'other',       'rouleau',       5,  2, 60500),
(cid, 'Sika Imper Mur (5kg)',                 'other',       'pot',          10,  3, 25500),
(cid, 'SikaCem Hydrofuge 20L',                'other',       'bidon',         5,  2, 70000),
(cid, 'Emulsion bitumineuse 15kg',            'other',       'pot',           5,  2, 13500),
(cid, 'FLINTKOTE Be3 (bidon)',                'other',       'bidon',         5,  2, 48000),

-- ============================================================
-- CLOISONS & PLAFONDS
-- ============================================================
(cid, 'Plaque de plâtre BA13',                'other',       'plaque',       30, 10, 10000),
(cid, 'Rail cloison métallique (3m)',         'other',       'ml',           50, 15,  3000),
(cid, 'Montant cloison métallique (3m)',      'other',       'ml',           50, 15,  3000),
(cid, 'Laine de verre isolation',             'other',       'rouleau',       5,  2, 45000),
(cid, 'Dalle faux-plafond 60×60',             'other',       'unité',       100, 20,  3000),

-- ============================================================
-- ALUMINIUM & VITRAGE
-- ============================================================
(cid, 'Fenêtre aluminium coulissante 100×120','other',       'unité',         0,  0,120000),
(cid, 'Porte aluminium 90×210',               'other',       'unité',         0,  0,160000),
(cid, 'Verre simple 4mm',                     'other',       'm²',            0,  0, 17000);

END $$;
