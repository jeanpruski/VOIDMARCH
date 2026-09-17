# Audit d’équilibrage — ressources, population et catalogue

Rapport reproductible : `node --import tsx scripts/audit-balance.ts`. Les coûts sont ceux de base, avant le bonus de construction de la Cendre. Le premier bâtiment de recrutement est utilisé pour calculer la chaîne d’infrastructure ; d’autres accès peuvent exister.

## Corrections appliquées

- Récolte uniquement sur la case occupée, jamais sur une voisine ni sur une terre adverse. Bois : forêt ; pierre : colline/montagne ; fer : colline ; vivres : plaine/rivière/marais ; or : ruines. Les vestiges cosmiques se fouillent par leur action dédiée.
- Pierre ajoutée aux stocks, échanges, coûts et sauvegardes. Carrière accessible sans coût initial en pierre. La mine extrait le fer sur colline ; la carrière extrait la pierre sur colline ou montagne.
- Aucun revenu brut par simple propriété d’une case. Le campement ne produit plus de bois, les forges/ateliers/raffineries/manufactures ne génèrent plus de fer sans mine. Le grenier stocke sans générer de vivres.
- Entretien proportionné au prix des unités ; les machines consomment aussi du fer. Mobilisation unifiée entre recrutement, interface et croissance : paysan 3, soldats 5, siège médiéval 6, machines légères 8, chars / bombardiers / dirigeables / dragons 12 ; division atomique de 7 à 18 places selon le modèle.
- Croissance bornée selon le bâtiment : un campement ou une chaumière ne finit plus avec la capacité d’une ville. Les populations existantes ne sont pas supprimées.
- Montagne accessible au paysan pour la pierre ; véhicules et cavaliers ont besoin de routes en montagne ou marais. Les machines terrestres ralentissent en forêt. Les unités volantes survolent tous les terrains et les remparts pour un point de déplacement par case.
- L’amélioration campement → avant-poste ne réduit plus la résistance ni la production de vivres. Les améliorations de villes en pierre utilisent désormais cette ressource.

## Limites de la validation

Les tests vérifient les sources de ressources, les refus serveur, le départ à zéro, les prérequis, les plafonds, la migration et les contres militaires. Ils ne prouvent pas un équilibre parfait entre joueurs. Les rencontres réelles, les coalitions, les sièges prolongés et le rythme à 1 PA par minute nécessitent des parties longues. Une pénurie arrête la croissance ; elle ne supprime pas automatiquement les armées. Les chaînes industrielles mobilisent les cinq ressources existantes, sans jauges distinctes de pétrole ou de munitions.

## Unités

| Unité | PV / attaque / défense | Déplacement / portée | Places | Coût | Entretien par minute | Infrastructure requise (nombre) |
| --- | --- | --- | --- | --- | --- | --- |
| Grenadier au radium | 24 / 12 / 4 | 3 / 3 | 7 | 300 or, 30 bois, 140 fer, 45 vivres | 1.29 or, 0.25 vivres | 12 |
| Sentinelle de cobalt | 38 / 10 / 8 | 2 / 2 | 7 | 370 or, 35 bois, 200 fer, 50 vivres | 1.64 or, 0.25 vivres | 13 |
| Tireur isotopique | 19 / 17 / 2 | 3 / 6 | 7 | 410 or, 30 bois, 145 fer, 40 vivres | 1.56 or, 0.25 vivres | 12 |
| Sapeur atomique | 25 / 10 / 4 | 2 / 3 | 7 | 430 or, 50 bois, 210 fer, 50 vivres | 1.85 or, 0.25 vivres | 12 |
| Exécuteur blafard | 45 / 23 / 6 | 2 / 1 | 7 | 510 or, 30 bois, 240 fer, 75 vivres | 2.14 or, 0.25 vivres | 16 |
| Templier gamma | 34 / 16 / 6 | 3 / 4 | 11 | 530 or, 35 bois, 250 fer, 65 vivres | 2.2 or, 0.25 vivres | 16 |
| Hussard au radium | 28 / 14 / 4 | 6 / 1 | 8 | 340 or, 35 bois, 120 fer, 90 vivres | 1.46 or, 0.65 vivres | 13 |
| Lancier isotopique | 32 / 18 / 4 | 5 / 1 | 8 | 390 or, 40 bois, 170 fer, 100 vivres | 1.75 or, 0.65 vivres | 13 |
| Cuirassier de cobalt | 46 / 14 / 8 | 4 / 1 | 8 | 470 or, 45 bois, 220 fer, 120 vivres | 2.14 or, 0.65 vivres | 13 |
| Dragon des cendres | 27 / 13 / 4 | 5 / 4 | 8 | 410 or, 40 bois, 155 fer, 95 vivres | 1.75 or, 0.65 vivres | 13 |
| Éclaireur blafard | 24 / 12 / 3 | 7 / 3 | 8 | 420 or, 35 bois, 125 fer, 100 vivres | 1.7 or, 0.65 vivres | 17 |
| Paladin gamma | 44 / 19 / 7 | 4 / 1 | 12 | 560 or, 50 bois, 250 fer, 140 vivres | 2.5 or, 0.65 vivres | 16 |
| Estafette au radium | 23 / 10 / 3 | 9 / 3 | 9 | 360 or, 25 bois, 160 fer, 35 vivres | 1.45 or, 0.7 fer, 0.25 vivres | 13 |
| Moto d’assaut isotopique | 29 / 15 / 4 | 7 / 3 | 9 | 420 or, 30 bois, 200 fer, 40 vivres | 1.73 or, 0.95 fer, 0.25 vivres | 13 |
| Side-car de cobalt | 38 / 13 / 7 | 5 / 3 | 9 | 450 or, 40 bois, 230 fer, 45 vivres | 1.91 or, 0.85 fer, 0.25 vivres | 13 |
| Chasseur blafard motorisé | 25 / 18 / 3 | 7 / 5 | 9 | 500 or, 30 bois, 210 fer, 40 vivres | 1.95 or, 1.1 fer, 0.25 vivres | 13 |
| Tricycle gamma | 30 / 10 / 4 | 6 / 5 | 9 | 480 or, 35 bois, 230 fer, 40 vivres | 1.96 or, 0.7 fer, 0.25 vivres | 13 |
| Moto de l’Apocalypse | 36 / 14 / 5 | 5 / 4 | 13 | 600 or, 45 bois, 280 fer, 50 vivres | 2.44 or, 0.9 fer, 0.25 vivres | 13 |
| Automitrailleuse au radium | 35 / 13 / 5 | 7 / 4 | 14 | 490 or, 50 bois, 250 fer, 40 vivres | 2.08 or, 0.85 fer, 0.25 vivres | 13 |
| Semi-chenillé de cobalt | 48 / 17 / 7 | 4 / 3 | 14 | 580 or, 55 bois, 320 fer, 50 vivres | 2.51 or, 1.05 fer, 0.25 vivres | 14 |
| Chasseur de chars isotopique | 43 / 23 / 5 | 3 / 5 | 14 | 690 or, 50 bois, 370 fer, 55 vivres | 2.91 or, 1.35 fer, 0.25 vivres | 14 |
| Char Mausolée | 76 / 20 / 9 | 2 / 3 | 14 | 900 or, 70 bois, 520 fer, 75 vivres | 3.91 or, 1.2 fer, 0.25 vivres | 15 |
| Chenillé Flak gamma | 44 / 10 / 6 | 3 / 6 | 14 | 660 or, 45 bois, 350 fer, 50 vivres | 2.76 or, 0.7 fer, 0.25 vivres | 17 |
| Chenillé de l’Apocalypse | 52 / 17 / 6 | 2 / 6 | 18 | 980 or, 80 bois, 550 fer, 70 vivres | 4.2 or, 1.05 fer, 0.25 vivres | 15 |
| Épervier au radium | 23 / 8 / 3 | 12 / 3 | 14 | 520 or, 50 bois, 240 fer, 35 vivres | 2.11 or, 0.6 fer, 0.25 vivres | 15 |
| Intercepteur isotopique | 31 / 14 / 4 | 10 / 4 | 14 | 650 or, 55 bois, 340 fer, 45 vivres | 2.73 or, 0.9 fer, 0.25 vivres | 15 |
| Avion d’assaut cobalt | 45 / 22 / 7 | 6 / 3 | 14 | 760 or, 70 bois, 410 fer, 55 vivres | 3.24 or, 1.3 fer, 0.25 vivres | 15 |
| Chasseur nocturne blafard | 29 / 18 / 4 | 8 / 5 | 14 | 780 or, 60 bois, 370 fer, 45 vivres | 3.14 or, 1.1 fer, 0.25 vivres | 15 |
| Bombardier gamma | 48 / 14 / 5 | 5 / 4 | 14 | 950 or, 90 bois, 500 fer, 65 vivres | 4.01 or, 0.9 fer, 0.25 vivres | 17 |
| Aile de l’Apocalypse | 62 / 19 / 7 | 4 / 5 | 18 | 1250 or, 120 bois, 680 fer, 90 vivres | 5.35 or, 1.15 fer, 0.25 vivres | 18 |
| Autogire au radium | 26 / 10 / 3 | 9 / 3 | 12 | 510 or, 40 bois, 240 fer, 35 vivres | 2.06 or, 0.7 fer, 0.25 vivres | 15 |
| Hélicoptère isotopique | 32 / 16 / 4 | 7 / 4 | 12 | 640 or, 50 bois, 330 fer, 45 vivres | 2.66 or, 1 fer, 0.25 vivres | 15 |
| Canonnière cobalt | 49 / 21 / 8 | 4 / 3 | 12 | 810 or, 65 bois, 430 fer, 60 vivres | 3.41 or, 1.25 fer, 0.25 vivres | 15 |
| Hélicoptère Chasseur blafard | 30 / 23 / 3 | 6 / 5 | 12 | 820 or, 50 bois, 390 fer, 50 vivres | 3.27 or, 1.35 fer, 0.25 vivres | 15 |
| Hélicoptère Flak gamma | 36 / 11 / 5 | 6 / 5 | 12 | 740 or, 55 bois, 370 fer, 50 vivres | 3.04 or, 0.75 fer, 0.25 vivres | 17 |
| Hélicoptère de l’Apocalypse | 57 / 17 / 6 | 4 / 4 | 16 | 1100 or, 95 bois, 580 fer, 80 vivres | 4.64 or, 1.05 fer, 0.25 vivres | 17 |
| Terrassier arcanique | 10 / 0 / 2 | 3 / 1 | 5 | 65 or, 35 bois, 30 fer, 20 vivres | 0.38 or, 0.25 vivres | 1 |
| Avion de reconnaissance | 10 / 2 / 0 | 10 / 2 | 8 | 140 or, 35 bois, 90 fer, 15 vivres | 0.7 or, 0.3 fer, 0.25 vivres | 4 |
| Chasseur Nachtjäger | 18 / 10 / 2 | 8 / 3 | 8 | 220 or, 40 bois, 150 fer, 20 vivres | 1.07 or, 0.7 fer, 0.25 vivres | 8 |
| Bombardier funèbre | 24 / 7 / 2 | 5 / 3 | 12 | 290 or, 60 bois, 210 fer, 30 vivres | 1.48 or, 0.55 fer, 0.25 vivres | 9 |
| Dirigeable de guerre | 38 / 9 / 4 | 4 / 4 | 12 | 360 or, 100 bois, 220 fer, 40 vivres | 1.8 or, 0.65 fer, 0.25 vivres | 10 |
| Dragon du Reich noir | 44 / 14 / 5 | 5 / 2 | 12 | 500 or, 60 bois, 250 fer, 150 vivres | 2.4 or, 2 vivres | 13 |
| Canon antiaérien Flak | 18 / 5 / 2 | 2 / 5 | 8 | 130 or, 30 bois, 100 fer, 20 vivres | 0.7 or, 0.45 fer, 0.25 vivres | 7 |
| Voltigeur Tesla | 14 / 8 / 2 | 2 / 3 | 5 | 120 or, 20 bois, 80 fer, 25 vivres | 0.61 or, 0.25 vivres | 7 |
| Chasseur de maléfices | 11 / 7 / 2 | 4 / 3 | 5 | 100 or, 35 bois, 40 fer, 25 vivres | 0.5 or, 0.25 vivres | 9 |
| Médecin de la peste | 9 / 1 / 2 | 3 / 1 | 5 | 85 or, 20 bois, 20 fer, 35 vivres | 0.4 or, 0.25 vivres | 3 |
| Grenadier revenant | 16 / 6 / 3 | 2 / 2 | 5 | 95 or, 15 bois, 60 fer, 20 vivres | 0.47 or, 0.25 vivres | 9 |
| Cavalier spectral | 15 / 8 / 3 | 5 / 1 | 5 | 160 or, 25 bois, 70 fer, 40 vivres | 0.74 or, 0.65 vivres | 9 |
| Marcheur de siège | 24 / 9 / 5 | 2 / 4 | 12 | 220 or, 60 bois, 180 fer, 30 vivres | 1.23 or, 0.65 fer, 0.25 vivres | 10 |
| Char possédé | 34 / 12 / 7 | 2 / 3 | 12 | 300 or, 65 bois, 250 fer, 45 vivres | 1.65 or, 0.8 fer, 0.25 vivres | 10 |
| Section de mortier | 9 / 6 / 1 | 2 / 5 | 6 | 110 or, 40 bois, 75 fer, 20 vivres | 0.61 or, 0.25 vivres | 6 |
| Fusilier | 10 / 5 / 2 | 3 / 4 | 5 | 45 or, 15 bois, 30 fer, 15 vivres | 0.26 or, 0.25 vivres | 4 |
| Soldat d’assaut | 13 / 7 / 3 | 3 / 2 | 5 | 70 or, 10 bois, 45 fer, 20 vivres | 0.36 or, 0.25 vivres | 4 |
| Mitrailleur | 12 / 8 / 2 | 2 / 4 | 5 | 85 or, 20 bois, 55 fer, 20 vivres | 0.45 or, 0.25 vivres | 5 |
| Tireur des brumes | 7 / 8 / 1 | 3 / 6 | 5 | 95 or, 25 bois, 50 fer, 15 vivres | 0.46 or, 0.25 vivres | 5 |
| Chasseur de blindés | 9 / 5 / 1 | 2 / 4 | 5 | 100 or, 20 bois, 65 fer, 20 vivres | 0.51 or, 0.25 vivres | 5 |
| Officier au sabre | 12 / 5 / 3 | 4 / 2 | 5 | 65 or, 15 bois, 30 fer, 25 vivres | 0.34 or, 0.25 vivres | 4 |
| Moto de reconnaissance | 11 / 4 / 1 | 8 / 2 | 8 | 85 or, 20 bois, 65 fer, 15 vivres | 0.46 or, 0.4 fer, 0.25 vivres | 2 |
| Automitrailleuse | 19 / 7 / 4 | 6 / 3 | 8 | 130 or, 25 bois, 100 fer, 20 vivres | 0.69 or, 0.55 fer, 0.25 vivres | 4 |
| Char de rupture | 32 / 10 / 6 | 3 / 4 | 12 | 190 or, 35 bois, 170 fer, 25 vivres | 1.05 or, 0.7 fer, 0.25 vivres | 8 |
| Canon de campagne | 13 / 8 / 1 | 2 / 6 | 8 | 125 or, 50 bois, 100 fer, 15 vivres | 0.72 or, 0.6 fer, 0.25 vivres | 6 |
| Batterie de fusées | 16 / 11 / 2 | 2 / 7 | 8 | 220 or, 40 bois, 180 fer, 20 vivres | 1.15 or, 0.75 fer, 0.25 vivres | 13 |
| Chevalier mécanique | 23 / 9 / 5 | 3 / 1 | 8 | 170 or, 30 bois, 140 fer, 20 vivres | 0.9 or, 0.65 fer, 0.25 vivres | 9 |
| Paysan | 5 / 0 / 0 | 3 / 1 | 3 | 5 or, 10 bois, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Milicien | 7 / 2 / 1 | 3 / 1 | 5 | 12 or, 10 bois, 8 vivres | 0.15 or, 0.25 vivres | 1 |
| Lancier | 11 / 3 / 3 | 3 / 1 | 5 | 30 or, 20 bois, 12 fer, 12 vivres | 0.18 or, 0.25 vivres | 1 |
| Arbalétrier | 8 / 5 / 2 | 2 / 3 | 5 | 45 or, 25 bois, 20 fer, 15 vivres | 0.26 or, 0.25 vivres | 3 |
| Rôdeur | 8 / 4 / 2 | 4 / 3 | 5 | 55 or, 35 bois, 10 fer, 20 vivres | 0.3 or, 0.25 vivres | 1 |
| Cavalier léger | 9 / 3 / 1 | 6 / 1 | 5 | 50 or, 10 bois, 15 fer, 30 vivres | 0.26 or, 0.65 vivres | 2 |
| Paladin | 18 / 5 / 5 | 2 / 1 | 5 | 110 or, 10 bois, 60 fer, 35 vivres | 0.54 or, 0.25 vivres | 4 |
| Bélier | 20 / 1 / 4 | 2 / 1 | 6 | 75 or, 90 bois, 35 fer, 15 vivres | 0.54 or, 0.25 vivres | 1 |
| Guérisseuse | 7 / 0 / 1 | 3 / 1 | 5 | 45 or, 10 bois, 5 fer, 25 vivres | 0.21 or, 0.25 vivres | 2 |
| Ingénieur | 9 / 1 / 2 | 3 / 1 | 5 | 45 or, 30 bois, 20 fer, 15 vivres | 0.28 or, 0.25 vivres | 1 |
| Berserker | 13 / 7 / 0 | 3 / 1 | 5 | 65 or, 10 bois, 30 fer, 30 vivres | 0.34 or, 0.25 vivres | 3 |
| Acolyte du Vide | 7 / 6 / 0 | 2 / 3 | 5 | 100 or, 20 bois, 30 fer, 25 vivres | 0.44 or, 0.25 vivres | 3 |
| Éclaireur | 5 / 1 / 0 | 5 / 1 | 5 | 20 or, 12 bois, 8 vivres | 0.15 or, 0.25 vivres | 1 |
| Fantassin | 10 / 3 / 2 | 3 / 1 | 5 | 30 or, 8 bois, 12 fer, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Garde | 15 / 2 / 5 | 2 / 1 | 5 | 45 or, 25 fer, 15 vivres | 0.21 or, 0.25 vivres | 1 |
| Archer | 7 / 4 / 1 | 2 / 3 | 5 | 35 or, 25 bois, 5 fer, 10 vivres | 0.19 or, 0.25 vivres | 1 |
| Chevalier | 10 / 5 / 2 | 5 / 1 | 5 | 70 or, 10 bois, 30 fer, 25 vivres | 0.34 or, 0.65 vivres | 2 |
| Engin de siège | 8 / 3 / 1 | 1 / 4 | 6 | 90 or, 65 bois, 40 fer, 10 vivres | 0.51 or, 0.25 vivres | 2 |

## Bâtiments

| Bâtiment | PV | Coût | Production brute / minute | Terrains | Prérequis |
| --- | --- | --- | --- | --- | --- |
| Laboratoire des isotopes | 85 | 220 or, 80 bois, 100 pierre, 150 fer | — | PLAIN, HILL, RUINS | Laboratoire des cendres, Manufacture de munitions |
| Réacteur noir | 140 | 400 or, 100 bois, 200 pierre, 280 fer | 8 or | PLAIN, HILL, RUINS | Laboratoire des isotopes, Raffinerie |
| Héliport occulte | 95 | 280 or, 90 bois, 120 pierre, 180 fer | — | PLAIN, RUINS | Laboratoire des isotopes, Garage militaire, Relais radio |
| Fonderie atomique | 125 | 520 or, 140 bois, 180 pierre, 360 fer | — | PLAIN, HILL, RUINS | Réacteur noir, Usine de blindés |
| Aérodrome militaire | 75 | 160 or, 100 bois, 70 pierre, 100 fer | — | PLAIN, RUINS | Garage militaire, Relais radio |
| Chantier de dirigeables | 95 | 210 or, 130 bois, 90 pierre, 150 fer | — | PLAIN, RUINS | Aérodrome militaire, Raffinerie |
| Sanctuaire draconique | 110 | 260 or, 100 bois, 160 pierre, 140 fer | — | HILL, MOUNTAIN, RUINS, CORRUPTION | Observatoire noir, Caserne des revenants |
| École de défense antiaérienne | 80 | 100 or, 50 bois, 65 pierre, 85 fer | — | PLAIN, HILL, RUINS | Manufacture de munitions, Relais radio |
| Palissade en bois | 30 | 30 bois | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | — |
| Rempart de pierre | 65 | 45 pierre | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | Évolution uniquement : palissade en bois (2 PA, coût sans réduction) |
| Mur en acier | 100 | 45 fer | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | Évolution uniquement : rempart de pierre (2 PA, coût sans réduction) |
| Tour Tesla | 95 | 90 or, 45 bois, 70 pierre, 90 fer | — | PLAIN, HILL, RUINS | Forge, Laboratoire des cendres |
| Caserne des revenants | 75 | 100 or, 60 bois, 65 pierre, 50 fer | — | PLAIN, HILL, RUINS | Caserne, Laboratoire des cendres |
| Fonderie alchimique | 65 | 130 or, 70 bois, 50 pierre, 80 fer | 5 or | PLAIN, HILL, RUINS | Raffinerie, Laboratoire des cendres |
| Observatoire noir | 55 | 140 or, 80 bois, 60 pierre, 65 fer | — | PLAIN, HILL, RUINS | Bibliothèque des astres, Relais radio |
| Carrière de pierre | 30 | 25 or, 30 bois, 5 fer | 4 pierre | HILL, MOUNTAIN | — |
| Arsenal | 50 | 70 or, 65 bois, 35 pierre, 35 fer | — | PLAIN, HILL, RUINS | Caserne, Forge |
| Bunker | 100 | 70 or, 35 bois, 80 pierre, 100 fer | — | PLAIN, HILL, RUINS | Forge |
| Garage militaire | 50 | 80 or, 65 bois, 55 fer | — | PLAIN, HILL, RUINS | Atelier |
| Usine de blindés | 75 | 160 or, 100 bois, 65 pierre, 130 fer | — | PLAIN, HILL, RUINS | Garage militaire, Raffinerie |
| Raffinerie | 45 | 100 or, 70 bois, 35 pierre, 70 fer | 4 or | PLAIN, HILL, RUINS | Forge |
| Manufacture de munitions | 45 | 85 or, 65 bois, 25 pierre, 60 fer | — | PLAIN, HILL, RUINS | Arsenal |
| Relais radio | 35 | 75 or, 40 bois, 15 pierre, 65 fer | — | PLAIN, HILL, RUINS | Atelier |
| Hôpital militaire | 50 | 65 or, 65 bois, 20 pierre, 25 fer, 30 vivres | — | PLAIN, HILL, RUINS | Chaumière, Monastère |
| Batterie fortifiée | 85 | 110 or, 60 bois, 50 pierre, 100 fer | — | PLAIN, HILL, RUINS | Manufacture de munitions |
| Laboratoire des cendres | 60 | 150 or, 80 bois, 60 pierre, 100 fer | — | PLAIN, HILL, RUINS | Bibliothèque des astres, Forge |
| Rampe de lancement | 65 | 170 or, 80 bois, 60 pierre, 140 fer | — | PLAIN, HILL, RUINS | Usine de blindés, Laboratoire des cendres |
| Dépôt ferroviaire | 55 | 90 or, 90 bois, 30 pierre, 75 fer | 3 or | PLAIN, HILL, RUINS | Atelier, Entrepôt |
| Campement | 30 | 25 bois | 1 or, 3 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Chaumière | 20 | 20 bois | — | PLAIN, HILL, FOREST, RUINS | — |
| Grenier | 25 | 15 or, 40 bois | — | PLAIN, HILL, FOREST, RUINS | — |
| Cabane de chasse | 20 | 20 bois | 4 vivres | FOREST | — |
| Pêcherie | 20 | 10 or, 30 bois | 8 vivres | RIVER, MARSH | — |
| Écurie | 35 | 55 or, 60 bois, 15 fer, 25 vivres | — | PLAIN, HILL | Caserne |
| Archerie | 30 | 40 or, 55 bois, 10 fer, 10 vivres | — | PLAIN, HILL, FOREST, RUINS | — |
| Monastère | 45 | 80 or, 60 bois, 40 pierre, 30 fer, 20 vivres | 2 or, 2 vivres | PLAIN, HILL, RUINS | Chaumière |
| Forge | 40 | 65 or, 45 bois, 20 pierre, 35 fer | — | PLAIN, HILL, RUINS | Atelier |
| Bibliothèque des astres | 35 | 100 or, 70 bois, 30 pierre, 30 fer, 20 vivres | 3 or | PLAIN, HILL, RUINS | Monastère |
| Boulangerie | 25 | 25 or, 35 bois, 10 pierre, 5 fer, 10 vivres | 7 vivres | PLAIN, HILL, FOREST, RUINS | Ferme |
| Puits | 30 | 5 or, 20 bois, 10 pierre | 2 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Avant-poste | 35 | 35 or, 35 bois, 5 fer | 1 or, 3 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Village | 35 | 60 or, 50 bois, 20 pierre, 10 fer, 25 vivres | 3 or, 4 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Ferme | 15 | 20 or, 25 bois | 6 vivres | PLAIN | — |
| Scierie | 20 | 25 or, 20 bois, 5 fer | 5 bois | FOREST | — |
| Mine | 25 | 35 or, 35 bois, 5 fer | 4 fer | HILL | — |
| Marché | 25 | 50 or, 35 bois, 10 fer, 10 vivres | 5 or | PLAIN, HILL, RUINS | — |
| Entrepôt | 30 | 35 or, 45 bois, 15 pierre, 10 fer | — | PLAIN, HILL, FOREST, RUINS | — |
| Atelier | 30 | 65 or, 45 bois, 15 pierre, 25 fer | 2 or | PLAIN, HILL, RUINS | — |
| Caserne | 40 | 60 or, 45 bois, 20 pierre, 25 fer, 10 vivres | — | PLAIN, HILL, RUINS | — |
| Fort | 65 | 90 or, 45 bois, 65 pierre, 65 fer | — | PLAIN, HILL, RUINS | — |
| Tour de guet | 40 | 45 or, 25 bois, 25 pierre, 30 fer | — | PLAIN, HILL, FOREST, RUINS | — |

## Tourelles de rempart

Équipements fixes partageant les PV du mur, sans production ni entretien. Installation et chaque évolution : 2 PA. Tir manuel : 1 PA. Les prix ci-dessous excluent le mur et les étapes précédentes. Voir [les règles des tourelles](turrets.md).

| Arme | Mur minimal | Attaque / portée | Bonus antiaérien | Coût de cette étape |
| --- | --- | --- | --- | --- |
| Arbalète de rempart | Palissade en bois | 7 / 3 | 0 | 60 or, 50 bois, 20 fer |
| Canon de rempart | Rempart de pierre | 13 / 4 | 0 | 120 or, 60 pierre, 50 fer |
| Tourelle Tesla occulte | Mur en acier | 20 / 5 | 8 | 220 or, 40 pierre, 120 fer |
