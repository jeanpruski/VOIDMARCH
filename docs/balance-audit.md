# Audit d’équilibrage — progression v0.4

Rapport reproductible : `node --import tsx scripts/audit-balance.ts`. Les coûts sont ceux de base, avant le bonus de construction de la Cendre. Le premier bâtiment de recrutement est utilisé pour calculer la chaîne d’infrastructure ; d’autres accès peuvent exister.

## Corrections appliquées

- Progression : entraînement +25 % au niveau 2, +60 % au niveau 3 ; production hors villes ×1,6 puis ×2,4. Les bonus d’entraînement s’appliquent aussi aux troupes existantes, sans cumuler plusieurs bâtiments.
- Référence de puissance : fantassin 8 d’attaque, char Mausolée 40, char Mausolée entraîné 64. Ce rapport ×5 à ×8 porte sur l’attaque ; blindage, terrain, rareté et contres modifient les dégâts effectivement reçus.
- Contres : bazooka et chasseur de chars isotopique ignorent 75 % du blindage des cibles blindées ; armes antiaériennes spécialisées ignorent 50 % de la défense aérienne. Les bonus de contre bénéficient de l’entraînement.
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

| Unité | Palier | PV / attaque / défense de base | Attaque avec formation niveau 3 | Déplacement / portée | Places | Coût | Entretien par minute | Infrastructure requise (nombre) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Héros | Civil | 80 / 0 / 6 | 0 | 4 / 0 | 0 | — | — | 0 |
| Grenadier au radium | Division atomique | 70 / 28 / 8 | 44.8 | 3 / 3 | 7 | 375 or, 40 bois, 175 fer, 60 vivres | 1.08 or, 0.25 vivres | 12 |
| Sentinelle de cobalt | Division atomique | 112 / 25 / 15 | 40 | 2 / 2 | 7 | 465 or, 45 bois, 250 fer, 65 vivres | 1.38 or, 0.25 vivres | 13 |
| Tireur isotopique | Division atomique | 55 / 37 / 5 | 59.2 | 3 / 6 | 7 | 515 or, 40 bois, 185 fer, 50 vivres | 1.32 or, 0.25 vivres | 12 |
| Sapeur atomique | Division atomique | 76 / 24 / 8 | 38.4 | 2 / 3 | 7 | 540 or, 65 bois, 265 fer, 65 vivres | 1.56 or, 0.25 vivres | 12 |
| Exécuteur blafard | Apocalypse | 135 / 40 / 12 | 64 | 2 / 1 | 7 | 765 or, 45 bois, 360 fer, 115 vivres | 2.14 or, 0.25 vivres | 16 |
| Templier gamma | Apocalypse | 105 / 34 / 12 | 54.4 | 3 / 4 | 11 | 795 or, 55 bois, 375 fer, 100 vivres | 2.21 or, 0.25 vivres | 16 |
| Hussard au radium | Division atomique | 82 / 30 / 8 | 48 | 6 / 1 | 8 | 425 or, 45 bois, 150 fer, 115 vivres | 1.23 or, 0.65 vivres | 13 |
| Lancier isotopique | Division atomique | 95 / 36 / 8 | 57.6 | 5 / 1 | 8 | 490 or, 50 bois, 215 fer, 125 vivres | 1.47 or, 0.65 vivres | 13 |
| Cuirassier de cobalt | Division atomique | 138 / 30 / 16 | 48 | 4 / 1 | 8 | 590 or, 60 bois, 275 fer, 150 vivres | 1.79 or, 0.65 vivres | 13 |
| Dragon des cendres | Division atomique | 80 / 29 / 8 | 46.4 | 5 / 4 | 8 | 515 or, 50 bois, 195 fer, 120 vivres | 1.47 or, 0.65 vivres | 13 |
| Éclaireur blafard | Division atomique | 72 / 26 / 6 | 41.6 | 7 / 3 | 8 | 525 or, 45 bois, 160 fer, 125 vivres | 1.43 or, 0.65 vivres | 17 |
| Paladin gamma | Apocalypse | 140 / 38 / 14 | 60.8 | 4 / 1 | 12 | 840 or, 75 bois, 375 fer, 210 vivres | 2.5 or, 0.65 vivres | 16 |
| Estafette au radium | Division atomique | 66 / 24 / 6 | 38.4 | 9 / 3 | 9 | 450 or, 35 bois, 200 fer, 45 vivres | 1.22 or, 0.8 fer, 0.25 vivres | 13 |
| Moto d’assaut isotopique | Division atomique | 85 / 32 / 8 | 51.2 | 7 / 3 | 9 | 525 or, 40 bois, 250 fer, 50 vivres | 1.44 or, 1 fer, 0.25 vivres | 13 |
| Side-car de cobalt | Division atomique | 110 / 28 / 14 | 44.8 | 5 / 3 | 9 | 565 or, 50 bois, 290 fer, 60 vivres | 1.61 or, 0.9 fer, 0.25 vivres | 13 |
| Chasseur blafard motorisé | Division atomique | 72 / 38 / 6 | 60.8 | 7 / 5 | 9 | 625 or, 40 bois, 265 fer, 50 vivres | 1.63 or, 1.15 fer, 0.25 vivres | 13 |
| Tricycle gamma | Division atomique | 90 / 24 / 8 | 38.4 | 6 / 5 | 9 | 600 or, 45 bois, 290 fer, 50 vivres | 1.64 or, 0.8 fer, 0.25 vivres | 13 |
| Moto de l’Apocalypse | Apocalypse | 108 / 32 / 10 | 51.2 | 5 / 4 | 13 | 900 or, 70 bois, 420 fer, 75 vivres | 2.44 or, 1 fer, 0.25 vivres | 13 |
| Automitrailleuse au radium | Division atomique | 105 / 28 / 10 | 44.8 | 7 / 4 | 14 | 615 or, 65 bois, 315 fer, 50 vivres | 1.74 or, 0.9 fer, 0.25 vivres | 13 |
| Semi-chenillé de cobalt | Division atomique | 142 / 34 / 14 | 54.4 | 4 / 3 | 14 | 725 or, 70 bois, 400 fer, 65 vivres | 2.1 or, 1.05 fer, 0.25 vivres | 14 |
| Chasseur de chars isotopique | Division atomique | 120 / 36 / 10 | 57.6 | 3 / 5 | 14 | 865 or, 65 bois, 465 fer, 70 vivres | 2.44 or, 1.1 fer, 0.25 vivres | 14 |
| Char Mausolée | Apocalypse | 220 / 40 / 18 | 64 | 2 / 3 | 14 | 1350 or, 105 bois, 780 fer, 115 vivres | 3.92 or, 1.2 fer, 0.25 vivres | 15 |
| Chenillé Flak gamma | Division atomique | 125 / 24 / 12 | 38.4 | 3 / 6 | 14 | 825 or, 60 bois, 440 fer, 65 vivres | 2.32 or, 0.8 fer, 0.25 vivres | 17 |
| Chenillé de l’Apocalypse | Apocalypse | 156 / 36 / 12 | 57.6 | 2 / 6 | 18 | 1470 or, 120 bois, 825 fer, 105 vivres | 4.2 or, 1.1 fer, 0.25 vivres | 15 |
| Épervier au radium | Division atomique | 68 / 19 / 6 | 30.4 | 12 / 3 | 14 | 650 or, 65 bois, 300 fer, 45 vivres | 1.77 or, 0.68 fer, 0.25 vivres | 15 |
| Intercepteur isotopique | Division atomique | 92 / 31 / 8 | 49.6 | 10 / 4 | 14 | 815 or, 70 bois, 425 fer, 60 vivres | 2.28 or, 0.98 fer, 0.25 vivres | 15 |
| Avion d’assaut cobalt | Division atomique | 128 / 40 / 14 | 64 | 6 / 3 | 14 | 950 or, 90 bois, 515 fer, 70 vivres | 2.71 or, 1.2 fer, 0.25 vivres | 15 |
| Chasseur nocturne blafard | Division atomique | 82 / 36 / 8 | 57.6 | 8 / 5 | 14 | 975 or, 75 bois, 465 fer, 60 vivres | 2.63 or, 1.1 fer, 0.25 vivres | 15 |
| Bombardier gamma | Division atomique | 140 / 30 / 10 | 48 | 5 / 4 | 14 | 1190 or, 115 bois, 625 fer, 85 vivres | 3.36 or, 0.95 fer, 0.25 vivres | 17 |
| Aile de l’Apocalypse | Apocalypse | 180 / 40 / 14 | 64 | 4 / 5 | 18 | 1875 or, 180 bois, 1020 fer, 135 vivres | 5.35 or, 1.2 fer, 0.25 vivres | 18 |
| Autogire au radium | Division atomique | 75 / 24 / 6 | 38.4 | 9 / 3 | 12 | 640 or, 50 bois, 300 fer, 45 vivres | 1.73 or, 0.8 fer, 0.25 vivres | 15 |
| Hélicoptère isotopique | Division atomique | 95 / 34 / 8 | 54.4 | 7 / 4 | 12 | 800 or, 65 bois, 415 fer, 60 vivres | 2.23 or, 1.05 fer, 0.25 vivres | 15 |
| Canonnière cobalt | Division atomique | 145 / 40 / 16 | 64 | 4 / 3 | 12 | 1015 or, 85 bois, 540 fer, 75 vivres | 2.86 or, 1.2 fer, 0.25 vivres | 15 |
| Hélicoptère Chasseur blafard | Division atomique | 86 / 40 / 6 | 64 | 6 / 5 | 12 | 1025 or, 65 bois, 490 fer, 65 vivres | 2.74 or, 1.2 fer, 0.25 vivres | 15 |
| Hélicoptère Flak gamma | Division atomique | 105 / 25 / 10 | 40 | 6 / 5 | 12 | 925 or, 70 bois, 465 fer, 65 vivres | 2.54 or, 0.82 fer, 0.25 vivres | 17 |
| Hélicoptère de l’Apocalypse | Apocalypse | 165 / 38 / 12 | 60.8 | 4 / 4 | 16 | 1650 or, 145 bois, 870 fer, 120 vivres | 4.64 or, 1.15 fer, 0.25 vivres | 17 |
| Die Glocke I — Vril | Projet Glocke | 200 / 52 / 10 | 83.2 | 5 / 4 | 18 | 1800 or, 200 bois, 1100 fer, 150 vivres | 5.42 or, 1.5 fer, 0.25 vivres | 18 |
| Die Glocke II — Nacht | Projet Glocke | 260 / 60 / 14 | 96 | 4 / 5 | 22 | 2600 or, 280 bois, 1600 fer, 200 vivres | 7.8 or, 1.7 fer, 0.25 vivres | 18 |
| Die Glocke III — Götterdämmerung | Projet Glocke | 320 / 64 / 16 | 102.4 | 3 / 6 | 26 | 3800 or, 360 bois, 2400 fer, 260 vivres | 11.37 or, 1.8 fer, 0.25 vivres | 18 |
| Terrassier arcanique | Fondations | 28 / 0 / 4 | 0 | 3 / 1 | 5 | 60 or, 35 bois, 30 fer, 20 vivres | 0.24 or, 0.25 vivres | 1 |
| Avion de reconnaissance | Guerre industrielle | 32 / 6 / 2 | 9.6 | 10 / 2 | 8 | 165 or, 45 bois, 105 fer, 20 vivres | 0.56 or, 0.35 fer, 0.25 vivres | 4 |
| Chasseur Nachtjäger | Guerre industrielle | 62 / 27 / 5 | 43.2 | 8 / 3 | 8 | 255 or, 50 bois, 175 fer, 25 vivres | 0.84 or, 0.88 fer, 0.25 vivres | 8 |
| Bombardier funèbre | Guerre industrielle | 78 / 20 / 5 | 32 | 5 / 3 | 12 | 335 or, 70 bois, 245 fer, 35 vivres | 1.14 or, 0.7 fer, 0.25 vivres | 9 |
| Dirigeable de guerre | Guerre industrielle | 120 / 24 / 8 | 38.4 | 4 / 4 | 12 | 415 or, 115 bois, 255 fer, 50 vivres | 1.39 or, 0.8 fer, 0.25 vivres | 10 |
| Dragon du Reich noir | Guerre occulte | 150 / 36 / 12 | 57.6 | 5 / 2 | 12 | 625 or, 75 bois, 315 fer, 190 vivres | 2.01 or, 2 vivres | 13 |
| Canon antiaérien Flak | Guerre industrielle | 54 / 12 / 5 | 19.2 | 2 / 5 | 8 | 150 or, 35 bois, 115 fer, 25 vivres | 0.54 or, 0.5 fer, 0.25 vivres | 7 |
| Voltigeur Tesla | Guerre occulte | 44 / 24 / 6 | 38.4 | 2 / 3 | 5 | 150 or, 25 bois, 100 fer, 35 vivres | 0.52 or, 0.25 vivres | 7 |
| Chasseur de maléfices | Guerre occulte | 36 / 23 / 4 | 36.8 | 4 / 3 | 5 | 125 or, 45 bois, 50 fer, 35 vivres | 0.42 or, 0.25 vivres | 9 |
| Médecin de la peste | Civil | 28 / 4 / 4 | 6.4 | 3 / 1 | 5 | 85 or, 20 bois, 20 fer, 35 vivres | 0.27 or, 0.25 vivres | 3 |
| Grenadier revenant | Guerre occulte | 54 / 22 / 7 | 35.2 | 2 / 2 | 5 | 120 or, 20 bois, 75 fer, 25 vivres | 0.4 or, 0.25 vivres | 9 |
| Cavalier spectral | Guerre occulte | 58 / 26 / 7 | 41.6 | 5 / 1 | 5 | 200 or, 35 bois, 90 fer, 50 vivres | 0.63 or, 0.65 vivres | 9 |
| Marcheur de siège | Guerre occulte | 100 / 27 / 10 | 43.2 | 2 / 4 | 12 | 275 or, 75 bois, 225 fer, 40 vivres | 1.02 or, 0.88 fer, 0.25 vivres | 10 |
| Char possédé | Guerre occulte | 140 / 34 / 15 | 54.4 | 2 / 3 | 12 | 375 or, 85 bois, 315 fer, 60 vivres | 1.39 or, 1.05 fer, 0.25 vivres | 10 |
| Section de mortier | Guerre industrielle | 30 / 16 / 2 | 25.6 | 2 / 5 | 6 | 130 or, 50 bois, 90 fer, 25 vivres | 0.49 or, 0.25 vivres | 6 |
| Fusilier | Guerre industrielle | 34 / 14 / 4 | 22.4 | 3 / 4 | 5 | 55 or, 20 bois, 35 fer, 20 vivres | 0.22 or, 0.25 vivres | 4 |
| Soldat d’assaut | Guerre industrielle | 44 / 19 / 6 | 30.4 | 3 / 2 | 5 | 85 or, 15 bois, 55 fer, 25 vivres | 0.3 or, 0.25 vivres | 4 |
| Mitrailleur | Guerre industrielle | 38 / 22 / 4 | 35.2 | 2 / 4 | 5 | 100 or, 25 bois, 65 fer, 25 vivres | 0.36 or, 0.25 vivres | 5 |
| Tireur des brumes | Guerre industrielle | 26 / 24 / 2 | 38.4 | 3 / 6 | 5 | 110 or, 30 bois, 60 fer, 20 vivres | 0.37 or, 0.25 vivres | 5 |
| Chasseur de blindés | Guerre industrielle | 34 / 12 / 3 | 19.2 | 2 / 4 | 5 | 115 or, 25 bois, 75 fer, 25 vivres | 0.4 or, 0.25 vivres | 5 |
| Officier au sabre | Guerre industrielle | 42 / 16 / 6 | 25.6 | 4 / 2 | 5 | 75 or, 20 bois, 35 fer, 30 vivres | 0.27 or, 0.25 vivres | 4 |
| Moto de reconnaissance | Guerre industrielle | 34 / 12 / 3 | 19.2 | 8 / 2 | 8 | 100 or, 25 bois, 75 fer, 20 vivres | 0.37 or, 0.5 fer, 0.25 vivres | 2 |
| Automitrailleuse | Guerre industrielle | 64 / 20 / 7 | 32 | 6 / 3 | 8 | 150 or, 30 bois, 115 fer, 25 vivres | 0.53 or, 0.7 fer, 0.25 vivres | 4 |
| Char de rupture | Guerre industrielle | 110 / 28 / 12 | 44.8 | 3 / 4 | 12 | 220 or, 45 bois, 200 fer, 30 vivres | 0.82 or, 0.9 fer, 0.25 vivres | 8 |
| Canon de campagne | Guerre industrielle | 40 / 22 / 3 | 35.2 | 2 / 6 | 8 | 145 or, 60 bois, 115 fer, 20 vivres | 0.57 or, 0.75 fer, 0.25 vivres | 6 |
| Batterie de fusées | Guerre industrielle | 52 / 30 / 4 | 48 | 2 / 7 | 8 | 255 or, 50 bois, 210 fer, 25 vivres | 0.9 or, 0.95 fer, 0.25 vivres | 13 |
| Chevalier mécanique | Guerre occulte | 82 / 28 / 10 | 44.8 | 3 / 1 | 8 | 215 or, 40 bois, 175 fer, 25 vivres | 0.76 or, 0.9 fer, 0.25 vivres | 9 |
| Paysan | Civil | 12 / 0 / 0 | 0 | 3 / 1 | 3 | 5 or, 10 bois, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Milicien | Fondations | 22 / 6 / 2 | 9.6 | 3 / 1 | 5 | 15 or, 10 bois, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Lancier | Fondations | 32 / 8 / 5 | 12.8 | 3 / 1 | 5 | 30 or, 20 bois, 15 fer, 15 vivres | 0.15 or, 0.25 vivres | 1 |
| Arbalétrier | Armée médiévale | 26 / 13 / 3 | 20.8 | 2 / 3 | 5 | 45 or, 25 bois, 20 fer, 15 vivres | 0.17 or, 0.25 vivres | 3 |
| Rôdeur | Armée médiévale | 26 / 11 / 4 | 17.6 | 4 / 3 | 5 | 55 or, 35 bois, 10 fer, 20 vivres | 0.2 or, 0.25 vivres | 1 |
| Cavalier léger | Armée médiévale | 30 / 9 / 3 | 14.4 | 6 / 1 | 5 | 50 or, 10 bois, 15 fer, 30 vivres | 0.17 or, 0.65 vivres | 2 |
| Paladin | Armée médiévale | 60 / 16 / 9 | 25.6 | 2 / 1 | 5 | 110 or, 10 bois, 60 fer, 35 vivres | 0.36 or, 0.25 vivres | 4 |
| Bélier | Armée médiévale | 70 / 4 / 7 | 6.4 | 2 / 1 | 6 | 75 or, 90 bois, 35 fer, 15 vivres | 0.36 or, 0.25 vivres | 1 |
| Guérisseuse | Civil | 20 / 0 / 2 | 0 | 3 / 1 | 5 | 45 or, 10 bois, 5 fer, 25 vivres | 0.15 or, 0.25 vivres | 2 |
| Ingénieur | Civil | 26 / 3 / 4 | 3 | 3 / 1 | 5 | 45 or, 30 bois, 20 fer, 15 vivres | 0.18 or, 0.25 vivres | 1 |
| Berserker | Armée médiévale | 38 / 19 / 1 | 30.4 | 3 / 1 | 5 | 65 or, 10 bois, 30 fer, 30 vivres | 0.23 or, 0.25 vivres | 3 |
| Acolyte du Vide | Guerre occulte | 30 / 22 / 3 | 35.2 | 2 / 3 | 5 | 125 or, 25 bois, 40 fer, 35 vivres | 0.38 or, 0.25 vivres | 3 |
| Éclaireur | Fondations | 16 / 3 / 1 | 4.8 | 5 / 1 | 5 | 20 or, 15 bois, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Fantassin | Fondations | 30 / 8 / 4 | 12.8 | 3 / 1 | 5 | 25 or, 10 bois, 10 fer, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Garde | Fondations | 46 / 6 / 8 | 9.6 | 2 / 1 | 5 | 45 or, 25 fer, 15 vivres | 0.15 or, 0.25 vivres | 1 |
| Archer | Fondations | 22 / 10 / 2 | 16 | 2 / 3 | 5 | 30 or, 25 bois, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Chevalier | Armée médiévale | 48 / 14 / 6 | 22.4 | 5 / 1 | 5 | 70 or, 10 bois, 30 fer, 25 vivres | 0.23 or, 0.65 vivres | 2 |
| Engin de siège | Armée médiévale | 30 / 7 / 2 | 11.2 | 1 / 4 | 6 | 90 or, 65 bois, 40 fer, 10 vivres | 0.34 or, 0.25 vivres | 2 |

## Bâtiments

| Bâtiment | PV de base | Coût initial | Production brute / minute niveau 1 | Production brute / minute niveau 3 | Terrains | Prérequis |
| --- | --- | --- | --- | --- | --- | --- |
| Scierie à vapeur | 130 | 120 or, 80 bois, 40 pierre, 35 fer | 16 bois | 38.4 bois | FOREST | Scierie, Atelier |
| Carrière mécanisée | 160 | 140 or, 90 bois, 50 pierre, 45 fer | 12 pierre | 28.8 pierre | HILL, MOUNTAIN | Carrière de pierre, Atelier |
| Mine industrielle | 150 | 160 or, 90 bois, 70 pierre, 50 fer | 10 fer | 24 fer | HILL | Mine, Forge |
| Scierie des ombres | 240 | 420 or, 180 bois, 120 pierre, 140 fer | 28 bois | 67.2 bois | FOREST | Scierie à vapeur, Laboratoire des cendres |
| Carrière runique | 280 | 460 or, 180 bois, 160 pierre, 160 fer | 21 pierre | 50.4 pierre | HILL, MOUNTAIN | Carrière mécanisée, Laboratoire des cendres |
| Mine des abysses | 260 | 500 or, 180 bois, 200 pierre, 180 fer | 18 fer | 43.2 fer | HILL | Mine industrielle, Laboratoire des cendres |
| Complexe des cloches | 750 | 2200 or, 500 bois, 700 pierre, 1200 fer | — | — | PLAIN, RUINS | Réacteur noir, Fonderie atomique, Observatoire noir |
| Laboratoire des isotopes | 385 | 440 or, 160 bois, 200 pierre, 300 fer | — | — | PLAIN, HILL, RUINS | Laboratoire des cendres, Manufacture de munitions |
| Réacteur noir | 630 | 800 or, 200 bois, 400 pierre, 560 fer | 16 or | 38.4 or | PLAIN, HILL, RUINS | Laboratoire des isotopes, Raffinerie |
| Héliport occulte | 430 | 560 or, 180 bois, 240 pierre, 360 fer | — | — | PLAIN, RUINS | Laboratoire des isotopes, Garage militaire, Relais radio |
| Fonderie atomique | 625 | 1250 or, 340 bois, 435 pierre, 865 fer | — | — | PLAIN, HILL, RUINS | Réacteur noir, Usine de blindés |
| Aérodrome militaire | 265 | 225 or, 140 bois, 100 pierre, 140 fer | — | — | PLAIN, RUINS | Garage militaire, Relais radio |
| Chantier de dirigeables | 380 | 360 or, 225 bois, 155 pierre, 255 fer | — | — | PLAIN, RUINS | Aérodrome militaire, Raffinerie |
| Sanctuaire draconique | 440 | 445 or, 170 bois, 275 pierre, 240 fer | — | — | HILL, MOUNTAIN, RUINS, CORRUPTION | Observatoire noir, Caserne des revenants |
| École de défense antiaérienne | 280 | 140 or, 70 bois, 95 pierre, 120 fer | — | — | PLAIN, HILL, RUINS | Manufacture de munitions, Relais radio |
| Palissade en bois | 100 | 30 bois | — | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | — |
| Rempart de pierre | 240 | 65 pierre | — | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | Évolution uniquement : palissade en bois (2 PA, coût sans réduction) |
| Mur en acier | 480 | 90 fer | — | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | Évolution uniquement : rempart de pierre (2 PA, coût sans réduction) |
| Tour Tesla | 380 | 155 or, 80 bois, 120 pierre, 155 fer | — | — | PLAIN, HILL, RUINS | Forge, Laboratoire des cendres |
| Caserne des revenants | 300 | 170 or, 105 bois, 115 pierre, 85 fer | — | — | PLAIN, HILL, RUINS | Caserne, Laboratoire des cendres |
| Fonderie alchimique | 260 | 225 or, 120 bois, 85 pierre, 140 fer | 10 or | 24 or | PLAIN, HILL, RUINS | Raffinerie, Laboratoire des cendres |
| Observatoire noir | 220 | 240 or, 140 bois, 105 pierre, 115 fer | — | — | PLAIN, HILL, RUINS | Bibliothèque des astres, Relais radio |
| Carrière de pierre | 75 | 20 or, 30 bois | 6 pierre | 14.4 pierre | HILL, MOUNTAIN | — |
| Arsenal | 175 | 100 or, 95 bois, 50 pierre, 50 fer | — | — | PLAIN, HILL, RUINS | Caserne, Forge |
| Bunker | 350 | 100 or, 50 bois, 115 pierre, 140 fer | — | — | PLAIN, HILL, RUINS | Forge |
| Garage militaire | 175 | 115 or, 95 bois, 80 fer | — | — | PLAIN, HILL, RUINS | Atelier |
| Usine de blindés | 265 | 225 or, 140 bois, 95 pierre, 185 fer | — | — | PLAIN, HILL, RUINS | Garage militaire, Raffinerie |
| Raffinerie | 160 | 140 or, 100 bois, 50 pierre, 100 fer | 6 or | 14.4 or | PLAIN, HILL, RUINS | Forge |
| Manufacture de munitions | 160 | 120 or, 95 bois, 35 pierre, 85 fer | — | — | PLAIN, HILL, RUINS | Arsenal |
| Relais radio | 125 | 105 or, 60 bois, 25 pierre, 95 fer | — | — | PLAIN, HILL, RUINS | Atelier |
| Hôpital militaire | 175 | 95 or, 95 bois, 30 pierre, 35 fer, 45 vivres | — | — | PLAIN, HILL, RUINS | Chaumière, Monastère |
| Batterie fortifiée | 300 | 155 or, 85 bois, 70 pierre, 140 fer | — | — | PLAIN, HILL, RUINS | Manufacture de munitions |
| Laboratoire des cendres | 240 | 255 or, 140 bois, 105 pierre, 170 fer | — | — | PLAIN, HILL, RUINS | Bibliothèque des astres, Forge |
| Rampe de lancement | 260 | 290 or, 140 bois, 105 pierre, 240 fer | — | — | PLAIN, HILL, RUINS | Usine de blindés, Laboratoire des cendres |
| Dépôt ferroviaire | 195 | 130 or, 130 bois, 45 pierre, 105 fer | 5 or | 12 or | PLAIN, HILL, RUINS | Atelier, Entrepôt |
| Campement | 75 | 25 bois | 2 or, 4 vivres | 4.8 or, 9.6 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Chaumière | 50 | 20 bois | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Grenier | 65 | 15 or, 40 bois | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Cabane de chasse | 50 | 20 bois | 5 vivres | 12 vivres | FOREST | — |
| Pêcherie | 50 | 10 or, 30 bois | 10 vivres | 24 vivres | RIVER, MARSH | — |
| Écurie | 105 | 65 or, 70 bois, 20 fer, 30 vivres | — | — | PLAIN, HILL | Caserne |
| Archerie | 90 | 35 or, 50 bois, 10 pierre, 10 vivres | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Monastère | 135 | 90 or, 70 bois, 45 pierre, 35 fer, 25 vivres | 3 or, 3 vivres | 7.2 or, 7.2 vivres | PLAIN, HILL, RUINS | Chaumière |
| Forge | 140 | 95 or, 65 bois, 30 pierre, 50 fer | — | — | PLAIN, HILL, RUINS | Atelier |
| Bibliothèque des astres | 105 | 115 or, 80 bois, 35 pierre, 35 fer, 25 vivres | 4 or | 9.6 or | PLAIN, HILL, RUINS | Monastère |
| Boulangerie | 75 | 30 or, 40 bois, 15 pierre, 10 fer, 15 vivres | 14 vivres | 33.6 vivres | PLAIN, HILL, FOREST, RUINS | Ferme |
| Puits | 75 | 5 or, 20 bois, 10 pierre | 3 vivres | 7.2 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Avant-poste | 90 | 35 or, 35 bois, 5 fer | 3 or, 5 vivres | 7.2 or, 12 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Village | 105 | 70 or, 60 bois, 25 pierre, 15 fer, 30 vivres | 6 or, 6 vivres | 18 or, 18 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Ferme | 40 | 20 or, 25 bois | 8 vivres | 19.2 vivres | PLAIN | — |
| Scierie | 50 | 15 or, 25 bois | 8 bois | 19.2 bois | FOREST | — |
| Mine | 65 | 30 or, 35 bois, 10 pierre | 5 fer | 12 fer | HILL | — |
| Marché | 75 | 60 or, 40 bois, 15 fer, 15 vivres | 8 or | 19.2 or | PLAIN, HILL, RUINS | — |
| Entrepôt | 90 | 40 or, 50 bois, 20 pierre, 15 fer | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Atelier | 90 | 75 or, 50 bois, 20 pierre, 30 fer | 2 or | 4.8 or | PLAIN, HILL, RUINS | — |
| Caserne | 120 | 35 or, 45 bois, 15 pierre, 10 vivres | — | — | PLAIN, HILL, RUINS | — |
| Fort | 195 | 100 or, 50 bois, 75 pierre, 75 fer | — | — | PLAIN, HILL, RUINS | — |
| Tour de guet | 120 | 50 or, 30 bois, 30 pierre, 35 fer | — | — | PLAIN, HILL, FOREST, RUINS | — |

## Tourelles de rempart

Équipements fixes partageant les PV du mur, sans production ni entretien. Installation et chaque évolution : 2 PA. Tir manuel : 1 PA. Les prix ci-dessous excluent le mur et les étapes précédentes. Voir [les règles des tourelles](turrets.md).

| Arme | Mur minimal | Attaque / portée | Bonus antiaérien | Coût de cette étape |
| --- | --- | --- | --- | --- |
| Arbalète de rempart | Palissade en bois | 16 / 3 | 0 | 60 or, 50 bois, 20 fer |
| Canon de rempart | Rempart de pierre | 30 / 4 | 0 | 120 or, 60 pierre, 50 fer |
| Tourelle Tesla occulte | Mur en acier | 48 / 5 | 18 | 220 or, 40 pierre, 120 fer |

## Comparatif de tirs sur plaine

Cibles à pleine santé, sans rareté, remparts, trêves ni ripostes. Le nombre de tirs utilise le minimum des dégâts : il ne représente pas une victoire garantie en duel. Les bonus indiquent le niveau d’entraînement, pas un niveau individuel acquis par expérience.

| Attaquant | Entraînement | Cible | Entraînement | Dégâts par tir | Tirs nécessaires au maximum |
| --- | --- | --- | --- | --- | --- |
| Fantassin | +0 % | Milicien | +0 % | 5–7 | 5 |
| Fusilier | +0 % | Milicien | +0 % | 11–13 | 2 |
| Char de rupture | +0 % | Milicien | +0 % | 25–27 | 1 |
| Char Mausolée | +60 % | Milicien | +0 % | 61–63 | 1 |
| Fusilier | +25 % | Char Mausolée | +60 % | 1–2 | 352 |
| Chasseur de blindés | +25 % | Char Mausolée | +60 % | 37–39 | 10 |
| Chasseur de chars isotopique | +60 % | Char Mausolée | +60 % | 97–99 | 4 |
| Fusilier | +60 % | Aile de l’Apocalypse | +60 % | 1–2 | 288 |
| Canon antiaérien Flak | +60 % | Aile de l’Apocalypse | +60 % | 42–44 | 7 |

## Coût des filières de recrutement

Chaque prérequis est compté une seule fois, au coût de construction de base. Hors évolutions de bâtiments, habitat, entretien, recrutement, routes et PA. Ces montants servent à comparer les filières ; ils ne sont pas des durées de progression.

| Recrue visée | Infrastructure minimale retenue | Investissement initial |
| --- | --- | --- |
| Fantassin | Caserne | 35 or, 45 bois, 15 pierre, 10 vivres |
| Chevalier | Caserne, Écurie | 100 or, 115 bois, 15 pierre, 20 fer, 40 vivres |
| Char de rupture | Usine de blindés, Garage militaire, Atelier, Raffinerie, Forge, Manufacture de munitions, Arsenal, Caserne | 905 or, 685 bois, 295 pierre, 580 fer, 10 vivres |
| Char possédé | Fonderie alchimique, Raffinerie, Forge, Atelier, Laboratoire des cendres, Bibliothèque des astres, Monastère, Chaumière, Usine de blindés, Garage militaire | 1335 or, 880 bois, 465 pierre, 825 fer, 50 vivres |
| Char Mausolée | Réacteur noir, Laboratoire des isotopes, Laboratoire des cendres, Bibliothèque des astres, Monastère, Chaumière, Forge, Atelier, Manufacture de munitions, Arsenal, Caserne, Raffinerie, Fonderie atomique, Usine de blindés, Garage militaire | 3855 or, 1695 bois, 1515 pierre, 2545 fer, 60 vivres |
| Aile de l’Apocalypse | Réacteur noir, Laboratoire des isotopes, Laboratoire des cendres, Bibliothèque des astres, Monastère, Chaumière, Forge, Atelier, Manufacture de munitions, Arsenal, Caserne, Raffinerie, Fonderie atomique, Usine de blindés, Garage militaire, Chantier de dirigeables, Aérodrome militaire, Relais radio | 4545 or, 2120 bois, 1795 pierre, 3035 fer, 60 vivres |
