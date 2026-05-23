-- Seed matériaux de référence pour BatiFlow CI
-- Catégories : Bordereau des Prix Unitaires BTP CI 2024 (btprix.net)
-- À exécuter dans Supabase Dashboard > SQL Editor > Run

DO $$
DECLARE
  cid UUID := (SELECT id FROM companies LIMIT 1);
BEGIN

IF cid IS NULL THEN
  RAISE EXCEPTION 'Aucune company trouvée. Créez d''abord votre entreprise via /onboarding.';
END IF;

-- Supprime tout l'ancien stock de la company pour repartir propre
DELETE FROM materials WHERE company_id = cid;

INSERT INTO materials (company_id, name, category, unit, stock_qty, min_stock_qty, unit_cost) VALUES

-- ============================================================
-- INSTALLATION DE CHANTIER
-- ============================================================
(cid, 'Baraque de chantier + montage',        'installation', 'mois',         0,  0, 160000),
(cid, 'Conteneur 20 pieds (location)',         'installation', 'mois',         0,  0, 160000),
(cid, 'Conteneur 20 pieds (achat)',            'installation', 'unité',        0,  0,3000000),
(cid, 'Implantation simple',                  'installation', 'ff',           0,  0, 229590),

-- ============================================================
-- TERRASSEMENT
-- ============================================================
(cid, 'Fouille 1ère catégorie',               'terrassement', 'm³',           0,  0,   1391),
(cid, 'Fouille 2ème catégorie',               'terrassement', 'm³',           0,  0,   1617),
(cid, 'Fouille 3ème catégorie',               'terrassement', 'm³',           0,  0,   1843),
(cid, 'Remblai compacté',                     'terrassement', 'm³',           0,  0,    178),

-- ============================================================
-- GROS ŒUVRES / BÉTON
-- ============================================================
-- Béton chantier (BPF)
(cid, 'Béton propreté 200 kg/m³ (BPF)',       'gros_oeuvre',  'm³',           0,  0,  59724),
(cid, 'Béton fondation 250 kg/m³ (BPF)',      'gros_oeuvre',  'm³',           0,  0,  79534),
(cid, 'Béton 300 kg/m³ (BPF)',                'gros_oeuvre',  'm³',           0,  0,  90368),
(cid, 'Béton 350 kg/m³ (BPF)',                'gros_oeuvre',  'm³',           0,  0,  99992),
(cid, 'Béton 400 kg/m³ (BPF)',                'gros_oeuvre',  'm³',           0,  0, 109022),
-- Béton prêt emploi (BPE)
(cid, 'Béton propreté C10 (BPE)',             'gros_oeuvre',  'm³',           0,  0,  69351),
(cid, 'Béton fondation radier C25 (BPE)',     'gros_oeuvre',  'm³',           0,  0, 108527),
-- Matériaux vrac
(cid, 'Ciment CPJ 32,5R',                     'gros_oeuvre',  'sac 50kg',   100, 20,   4750),
(cid, 'Ciment CPA 52,5N Blanc',               'gros_oeuvre',  'sac 50kg',    20,  5,  18000),
(cid, 'Sable de carrière',                    'gros_oeuvre',  'm³',          10,  3,  20000),
(cid, 'Sable de mer',                         'gros_oeuvre',  'm³',          10,  3,  17500),
(cid, 'Gravier 5/25 granite',                 'gros_oeuvre',  'm³',          10,  3,  30000),
(cid, 'Latérite compactage',                  'gros_oeuvre',  'm³',           5,  2,  10000),
(cid, 'HA 8mm FE500',                         'gros_oeuvre',  'botte',       20,  5,  46000),
(cid, 'HA 10mm FE500',                        'gros_oeuvre',  'botte',       20,  5,  52000),
(cid, 'HA 12mm FE500',                        'gros_oeuvre',  'botte',       15,  5,  62100),
(cid, 'HA 14mm FE500',                        'gros_oeuvre',  'botte',       10,  3,  52000),
(cid, 'HA 16mm FE500',                        'gros_oeuvre',  'botte',       10,  3,  52000),
(cid, 'HA 20mm FE500',                        'gros_oeuvre',  'botte',       10,  3,  52000),
(cid, 'Agglo creux 12cm',                     'gros_oeuvre',  'unité',     2000,200,    104),
(cid, 'Agglo creux 15cm',                     'gros_oeuvre',  'unité',     2000,200,    134),
(cid, 'Agglo creux 20cm',                     'gros_oeuvre',  'unité',     1000,100,    188),
(cid, 'Agglo plein 15cm',                     'gros_oeuvre',  'unité',     1000,100,    193),
(cid, 'Hourdis 12×20×53cm',                   'gros_oeuvre',  'unité',      500,100,    550),
(cid, 'Hourdis 15×20×53cm',                   'gros_oeuvre',  'unité',      300, 50,    750),
(cid, 'Mortier-colle C1 (sac 25kg)',          'gros_oeuvre',  'sac',         50, 10,   6000),
(cid, 'Mortier-colle C2 (sac 25kg)',          'gros_oeuvre',  'sac',         20,  5,   8500),
(cid, 'Dallage 5cm (fourni+posé)',            'gros_oeuvre',  'm²',           0,  0,  10028),
(cid, 'Dallage 10cm (fourni+posé)',           'gros_oeuvre',  'm²',           0,  0,  13058),
(cid, 'Plancher corps creux 250kg (posé)',    'gros_oeuvre',  'm²',           0,  0,  29500),
(cid, 'Plancher hourdis (posé)',              'gros_oeuvre',  'm²',           0,  0,  33548),

-- ============================================================
-- ÉTANCHÉITÉ
-- ============================================================
(cid, 'Étanchéité terrasse inaccessible 2 feutres',   'etancheite', 'm²',    0,  0,  57219),
(cid, 'Étanchéité terrasse inaccessible 1 feutre',    'etancheite', 'm²',    0,  0,  33525),
(cid, 'Étanchéité terrasse accessible 2 feutres SBS', 'etancheite', 'm²',    0,  0,  69070),
(cid, 'Étanchéité terrasse accessible 1 feutre',      'etancheite', 'm²',    0,  0,  53135),
(cid, 'Relevé étanchéité avec gorges',                'etancheite', 'm²',    0,  0,   8810),
(cid, 'Acrotère (fourni+posé)',                        'etancheite', 'm²',    0,  0,  12987),
(cid, 'Membrane bitumineuse autocollante (rouleau)',   'etancheite', 'rouleau',10, 3, 40500),
(cid, 'HYRENE TS membrane polyester',                 'etancheite', 'rouleau', 5, 2, 60500),
(cid, 'Sika Imper Mur (5kg)',                         'etancheite', 'pot',   10,  3,  25500),
(cid, 'SikaCem Hydrofuge 20L',                        'etancheite', 'bidon',  5,  2,  70000),
(cid, 'FLINTKOTE Be3',                                'etancheite', 'bidon',  5,  2,  48000),
(cid, 'Polyane film plastique',                       'etancheite', 'ml',    50, 10,   1300),

-- ============================================================
-- MENUISERIE ALUMINIUM
-- ============================================================
(cid, 'Châssis coulissant alu (2D/C28)',       'menuiserie_alu', 'm²',        0,  0, 407637),
(cid, 'Châssis coulissant alu (2D/C26)',       'menuiserie_alu', 'm²',        0,  0, 207148),
(cid, 'Volet simple aluminium',               'menuiserie_alu', 'm²',        0,  0,  20846),
(cid, 'Volet double aluminium',               'menuiserie_alu', 'm²',        0,  0,  29488),

-- ============================================================
-- VITRAGE
-- ============================================================
(cid, 'Verre simple 4mm',                     'vitrage', 'm²',               0,  0,  29466),
(cid, 'Verre isolant 4/6/4',                  'vitrage', 'm²',               0,  0,  13141),
(cid, 'Verre isolant 4/9/4',                  'vitrage', 'm²',               0,  0,  14893),
(cid, 'Verre isolant 4/12/4',                 'vitrage', 'm²',               0,  0,  17494),
(cid, 'Verre isolant 4/16/4',                 'vitrage', 'm²',               0,  0,  20596),
(cid, 'Glace miroir',                         'vitrage', 'm²',               0,  0,  41462),
(cid, 'Verre trempé',                         'vitrage', 'm²',               0,  0,   4396),

-- ============================================================
-- SERRURERIE
-- ============================================================
(cid, 'Porte métallique 1 vantail',           'serrurerie', 'unité',         0,  0, 127937),
(cid, 'Porte métallique 2 vantaux',           'serrurerie', 'unité',         0,  0, 134960),
(cid, 'Portail métallique 1 vantail',         'serrurerie', 'unité',         0,  0,  97731),
(cid, 'Portail métallique 2 vantaux',         'serrurerie', 'unité',         0,  0,  97227),
(cid, 'Grille métallique',                    'serrurerie', 'unité',         0,  0, 103529),
(cid, 'Serrure à encastrer',                  'serrurerie', 'unité',        10,  3,  20000),

-- ============================================================
-- PLOMBERIE SANITAIRE
-- ============================================================
(cid, 'Tube PVC alimentation Ø20 (ml posé)',  'plomberie', 'ml',             0,  0,   2562),
(cid, 'Tube PVC alimentation Ø25 (ml posé)',  'plomberie', 'ml',             0,  0,   3171),
(cid, 'Tube PVC alimentation Ø32 (ml posé)',  'plomberie', 'ml',             0,  0,   4648),
(cid, 'Tube PVC alimentation Ø50 (ml posé)',  'plomberie', 'ml',             0,  0,  14830),
(cid, 'Tube PVC alimentation Ø110 (ml posé)', 'plomberie', 'ml',             0,  0,  35100),
(cid, 'Tube PER Ø16 (ml posé)',               'plomberie', 'ml',             0,  0,   1280),
(cid, 'Tube PER Ø20 (ml posé)',               'plomberie', 'ml',             0,  0,   1500),
(cid, 'Tube PER Ø25 (ml posé)',               'plomberie', 'ml',             0,  0,   2280),
(cid, 'Tube cuivre Ø16 (ml posé)',            'plomberie', 'ml',             0,  0,   3000),
(cid, 'Tube PPR alimentation Ø20',            'plomberie', 'rouleau 100m',   5,  2,  45000),
(cid, 'Robinet mitigeur lavabo',              'plomberie', 'unité',          5,  2,  20000),
(cid, 'Robinet de puisage 3/4',               'plomberie', 'unité',         10,  3,   3000),
(cid, 'WC + réservoir attenant',              'plomberie', 'ensemble',       3,  1, 167783),
(cid, 'Lavabo collectif',                     'plomberie', 'unité',          3,  1,  55000),
(cid, 'Receveur de douche 80×80',             'plomberie', 'unité',          2,  1,  50000),
(cid, 'Chauffe-eau électrique 50L',           'plomberie', 'unité',          2,  1,  80130),
(cid, 'Ensemble lavabo WC résidentiel',       'plomberie', 'ensemble',       0,  0, 156512),

-- ============================================================
-- ASSAINISSEMENT
-- ============================================================
(cid, 'Tuyau béton Ø250 (ml posé)',           'assainissement', 'ml',        0,  0,   7518),
(cid, 'Tuyau béton Ø300 (ml posé)',           'assainissement', 'ml',        0,  0,  10140),
(cid, 'Tuyau béton Ø400 (ml posé)',           'assainissement', 'ml',        0,  0,  29145),
(cid, 'Tuyau PVC Ø110 assainissement',        'assainissement', 'ml',        0,  0,   7751),
(cid, 'Tuyau PVC Ø160 assainissement',        'assainissement', 'ml',        0,  0,  33842),
(cid, 'Regard 40×40 (fourni+posé)',           'assainissement', 'unité',     0,  0,  23882),
(cid, 'Regard 60×60 (fourni+posé)',           'assainissement', 'unité',     0,  0,  53062),
(cid, 'Regard 80×80 (fourni+posé)',           'assainissement', 'unité',     0,  0,  57880),
(cid, 'Fosse perte PEHD 20 usagers',          'assainissement', 'unité',     0,  0, 451960),
(cid, 'Caniveau béton 0.8×0.25 (ml posé)',    'assainissement', 'ml',        0,  0, 197886),
(cid, 'Caniveau béton 1.2×0.40 (ml posé)',    'assainissement', 'ml',        0,  0, 171508),

-- ============================================================
-- ÉLECTRICITÉ
-- ============================================================
(cid, 'Branchement alimentation 10A',         'electricite', 'unité',        0,  0,  40247),
(cid, 'Disjoncteur mono 10A',                 'electricite', 'unité',       20,  5,  52386),
(cid, 'Disjoncteur mono 20A',                 'electricite', 'unité',       10,  3, 154543),
(cid, 'Disjoncteur mono 25A',                 'electricite', 'unité',       10,  3, 163543),
(cid, 'Disjoncteur triphasé 10A',             'electricite', 'unité',        5,  2, 253246),
(cid, 'Tableau résidentiel (posé)',           'electricite', 'unité',        5,  2, 177560),
(cid, 'Tableau professionnel (posé)',         'electricite', 'unité',        5,  2, 197350),
(cid, 'Tableau résidentiel 40A',              'electricite', 'unité',        3,  1, 518120),
(cid, 'Câble 1,5mm² (ml posé)',               'electricite', 'ml',           0,  0,   1985),
(cid, 'Câble 2,5mm² (ml posé)',               'electricite', 'ml',           0,  0,   2190),
(cid, 'Câble VGV 3×2,5mm² (rouleau 100m)',   'electricite', 'rouleau',       5,  2,  92000),
(cid, 'Câble VGV 3×1,5mm² (rouleau 100m)',   'electricite', 'rouleau',       5,  2,  87000),
(cid, 'Gaine ICTA 3422 (50m)',                'electricite', 'rouleau',      10,  3,  53000),
(cid, 'Mise à la terre',                      'electricite', 'unité',        0,  0,   9298),
(cid, 'Spot LED encastrable 6W',              'electricite', 'unité',       20,  5,   4000),
(cid, 'Luminaire ballon Ø200',                'electricite', 'unité',       10,  3,   9042),
(cid, 'Réglette 2 tubes fluorescents',        'electricite', 'unité',       10,  3,  19254),

-- ============================================================
-- CLIMATISATION
-- ============================================================
(cid, 'Split mural 1CV (fourni+posé)',        'climatisation', 'unité',      0,  0, 276114),
(cid, 'Split mural 2CV (fourni+posé)',        'climatisation', 'unité',      0,  0, 307702),
(cid, 'Split mural 4CV (fourni+posé)',        'climatisation', 'unité',      0,  0, 687279),
(cid, 'Split mural 5CV (fourni+posé)',        'climatisation', 'unité',      0,  0, 873105),
(cid, 'Split gainable 2CV (fourni+posé)',     'climatisation', 'unité',      0,  0, 403277),

-- ============================================================
-- REVÊTEMENTS DURS
-- ============================================================
(cid, 'Carrelage grès cérame (posé)',         'revetement_dur', 'm²',        0,  0,   9940),
(cid, 'Carrelage grès cérame qualité (posé)', 'revetement_dur', 'm²',        0,  0,  20660),
(cid, 'Faïence murale (posée)',               'revetement_dur', 'm²',        0,  0,   7500),
(cid, 'Parquet standard (posé)',              'revetement_dur', 'm²',        0,  0,   3455),
(cid, 'Joint carrelage (sac 5kg)',            'revetement_dur', 'sac',       20,  5,   3500),
(cid, 'Seuil en laiton (posé)',               'revetement_dur', 'ml',        0,  0,   6005),
(cid, 'Cornière protection marches',          'revetement_dur', 'ml',        0,  0,  15075),
(cid, 'Couvre-joint de dilatation',           'revetement_dur', 'ml',        0,  0,  13154),

-- ============================================================
-- REVÊTEMENTS SOUPLES
-- ============================================================
(cid, 'Moquette type tapis (posée)',          'revetement_souple', 'm²',     0,  0,   7134),
(cid, 'Moquette velours (posée)',             'revetement_souple', 'm²',     0,  0,  28548),
(cid, 'Dalle thermoplastique (posée)',        'revetement_souple', 'm²',     0,  0, 107863),
(cid, 'Parquet flottant (posé)',              'revetement_souple', 'm²',     0,  0,   7132),

-- ============================================================
-- MENUISERIE BOIS / PVC
-- ============================================================
(cid, 'Porte bois panneau 1 battant',         'menuiserie_bois', 'unité',    5,  2, 111870),
(cid, 'Porte bois panneau 2 battants',        'menuiserie_bois', 'unité',    3,  1, 119670),
(cid, 'Porte trapézoïdale bois 100/220',      'menuiserie_bois', 'unité',    3,  1, 196725),
(cid, 'Porte trapézoïdale bois 120/220',      'menuiserie_bois', 'unité',    2,  1, 262420),
(cid, 'Pré-cadre bois',                       'menuiserie_bois', 'unité',   10,  3,  10550),
(cid, 'Contreplaqué formica 18mm (panneau)',   'menuiserie_bois', 'panneau', 10,  3,  32000),
(cid, 'Contreplaqué formica 15mm (panneau)',   'menuiserie_bois', 'panneau', 10,  3,  25000),
(cid, 'Chevron 75×50mm (6m)',                 'menuiserie_bois', 'unité',   30, 10,  10000),
(cid, 'Lambris de paroi (posé)',              'menuiserie_bois', 'm²',       0,  0,  22930),
(cid, 'Châssis PVC fenêtre 100×120',          'menuiserie_bois', 'unité',    0,  0, 156990),
(cid, 'Châssis PVC porte 100×210',            'menuiserie_bois', 'unité',    0,  0, 201925),

-- ============================================================
-- FAUX PLAFONDS
-- ============================================================
(cid, 'Faux plafond contreplaqué 5mm (posé)', 'faux_plafond', 'm²',          0,  0,  11686),
(cid, 'Faux plafond contreplaqué 10mm (posé)','faux_plafond', 'm²',          0,  0,  13616),
(cid, 'Faux plafond contreplaqué 20mm (posé)','faux_plafond', 'm²',          0,  0,  28118),
(cid, 'Faux plafond tôle plancher (posé)',    'faux_plafond', 'm²',           0,  0,  33014),
(cid, 'Faux plafond plaque de roche (posé)',  'faux_plafond', 'm²',           0,  0,  40680),
(cid, 'Staff (posé)',                         'faux_plafond', 'm²',           0,  0,  62547),
(cid, 'Corniche joint (posée)',               'faux_plafond', 'ml',           0,  0,    278),
(cid, 'Plaque de plâtre BA13',                'faux_plafond', 'plaque',      30, 10,  10000),
(cid, 'Rail cloison métallique (3m)',         'faux_plafond', 'ml',          50, 15,   3000),
(cid, 'Laine de verre isolation',             'faux_plafond', 'rouleau',      5,  2,  45000),

-- ============================================================
-- PEINTURE / VERNIS
-- ============================================================
(cid, 'Peinture extérieure maçonnerie (m²)',  'peinture', 'm²',              0,  0,   1060),
(cid, 'Peinture intérieure sans enduit (m²)', 'peinture', 'm²',              0,  0,   2046),
(cid, 'Peinture intérieure avec enduit (m²)', 'peinture', 'm²',              0,  0,   3941),
(cid, 'Peinture semi-brillante (m²)',         'peinture', 'm²',              0,  0,   2942),
(cid, 'Peinture premium intérieure (m²)',     'peinture', 'm²',              0,  0,   7940),
(cid, 'Peinture plafond (m²)',                'peinture', 'm²',              0,  0,   3511),
(cid, 'Peinture vinylique 30kg',              'peinture', 'seau',           10,  3,  30000),
(cid, 'Peinture vinylique extérieure 30kg',   'peinture', 'seau',           10,  3,  39000),
(cid, 'Enduit de lissage (sac 25kg)',         'peinture', 'sac',            20,  5,  14000),
(cid, 'Sous-couche universelle 10L',          'peinture', 'seau',           10,  3,  22000),
(cid, 'Vernis bois 1L',                       'peinture', 'litre',           5,  2,   4300),

-- ============================================================
-- CHARPENTE / COUVERTURE
-- ============================================================
(cid, 'Charpente bois rouge assemblée (m²)',  'charpente', 'm²',             0,  0, 234966),
(cid, 'Charpente bois (m²)',                  'charpente', 'm²',             0,  0, 297172),
(cid, 'Charpente métallique PF200 (kg)',      'charpente', 'kg',             0,  0,   1500),
(cid, 'Charpente métallique PF240 (kg)',      'charpente', 'kg',             0,  0,   3271),
(cid, 'Tôle ondulée 4/10 (m²)',               'charpente', 'm²',             0,  0,   9637),
(cid, 'Tôle ondulée 5/10 (m²)',               'charpente', 'm²',             0,  0,   7575),
(cid, 'Tôle ondulée 6/10 (m²)',               'charpente', 'm²',             0,  0,   7020),
(cid, 'Tôle aluminium 5/10 (m²)',             'charpente', 'm²',             0,  0,  12048),
(cid, 'Lambris aluminium (m²)',               'charpente', 'm²',             0,  0,  17530),
(cid, 'Bardage bois 1cm (m²)',                'charpente', 'm²',             0,  0,   3320),
(cid, 'Bardage fibrociment 5mm (m²)',         'charpente', 'm²',             0,  0,   6540),
(cid, 'Chéneau métallique (ml posé)',         'charpente', 'ml',             0,  0,  42949);

END $$;
