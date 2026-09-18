# Audit d’équilibrage — économie v0.5

Rapport reproductible : `node --import tsx scripts/audit-balance.ts`. Les coûts sont ceux de base, avant le bonus de construction de la Cendre. Le premier bâtiment de recrutement est utilisé pour calculer la chaîne d’infrastructure ; d’autres accès peuvent exister.

## Corrections appliquées

- Progression : entraînement +25 % au niveau 2, +60 % au niveau 3 ; production hors villes ×1,6 puis ×2,4. Les bonus d’entraînement s’appliquent aussi aux troupes existantes, sans cumuler plusieurs bâtiments.
- Référence de puissance : fantassin 8 d’attaque, char Mausolée 40, char Mausolée entraîné 64. Ce rapport ×5 à ×8 porte sur l’attaque ; blindage, terrain, rareté et contres modifient les dégâts effectivement reçus.
- Contres : bazooka et chasseur de chars isotopique ignorent 75 % du blindage des cibles blindées ; armes antiaériennes spécialisées ignorent 50 % de la défense aérienne. Les bonus de contre bénéficient de l’entraînement.
- Récolte uniquement sur la case occupée, jamais sur une voisine ni sur une terre adverse. Bois : forêt ; pierre : colline/montagne ; fer : colline ; vivres : plaine/rivière/marais ; or : ruines. Les vestiges cosmiques se fouillent par leur action dédiée.
- Pierre ajoutée aux stocks, échanges, coûts et sauvegardes. Carrière accessible sans coût initial en pierre. La mine extrait le fer sur colline ; la carrière extrait la pierre sur colline ou montagne.
- Aucun revenu brut par simple propriété d’une case. Le campement ne produit plus de bois, les forges/ateliers/raffineries/manufactures ne génèrent plus de fer sans mine. Le grenier stocke sans générer de vivres.
- Prix progressifs : bâtiments intermédiaires ×1,5 / ×2,5 / ×4 / ×7 ; fin de progression ×10 / ×12 / ×15 par rapport à v0.4. Unités médiévales ×2,5, industrielles ×4, occultes ×7, atomiques ×10, Apocalypse ×12 et Glocke ×15. Fondations et civils ordinaires conservés.
- Améliorations ordinaires : 2 PA et débit de 2,5 fois le nouveau coût de construction pour le niveau 2, puis 5 fois pour le niveau 3. Campements, villes et murs ont leurs devis spécifiques. Les coûts de chaque étape ne sont pas cumulatifs.
- Entretien conservé aux valeurs v0.4, séparé du nouveau prix de recrutement ; les machines consomment aussi du fer. Mobilisation : paysan 3, soldats 5, siège médiéval 6, machines légères 8, chars / bombardiers / dirigeables / dragons 12 ; division atomique de 7 à 18 places selon le modèle.
- Croissance bornée selon le bâtiment : un campement ou une chaumière ne finit plus avec la capacité d’une ville. Les populations existantes ne sont pas supprimées.
- Montagne accessible au paysan pour la pierre ; véhicules et cavaliers ont besoin de routes en montagne ou marais. Les machines terrestres ralentissent en forêt. Les unités volantes survolent tous les terrains et les remparts pour un point de déplacement par case.
- L’amélioration campement → avant-poste ne réduit plus la résistance ni la production de vivres. Les améliorations de villes en pierre utilisent désormais cette ressource.

## Limites de la validation

Les tests vérifient les sources de ressources, les refus serveur, le départ à zéro, les prérequis, les plafonds, la migration et les contres militaires. Ils ne prouvent pas un équilibre parfait entre joueurs. Les rencontres réelles, les coalitions, les sièges prolongés et le rythme à 1 PA par minute nécessitent des parties longues. Une pénurie arrête la croissance ; elle ne supprime pas automatiquement les armées. Les chaînes industrielles mobilisent les cinq ressources existantes, sans jauges distinctes de pétrole ou de munitions.

## Unités

| Unité | Palier | PV / attaque / défense de base | Attaque avec formation niveau 3 | Déplacement / portée | Places | Coût | Entretien par minute | Infrastructure requise (nombre) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Héros | Civil | 80 / 0 / 6 | 0 | 6 / 0 | 0 | — | — | 0 |
| Grenadier au radium | Division atomique | 70 / 28 / 8 | 44.8 | 3 / 3 | 7 | 3750 or, 400 bois, 1750 fer, 600 vivres | 1.08 or, 0.25 vivres | 12 |
| Sentinelle de cobalt | Division atomique | 112 / 25 / 15 | 40 | 2 / 2 | 7 | 4650 or, 450 bois, 2500 fer, 650 vivres | 1.38 or, 0.25 vivres | 13 |
| Tireur isotopique | Division atomique | 55 / 37 / 5 | 59.2 | 3 / 6 | 7 | 5150 or, 400 bois, 1850 fer, 500 vivres | 1.32 or, 0.25 vivres | 12 |
| Sapeur atomique | Division atomique | 76 / 24 / 8 | 38.4 | 2 / 3 | 7 | 5400 or, 650 bois, 2650 fer, 650 vivres | 1.56 or, 0.25 vivres | 12 |
| Exécuteur blafard | Apocalypse | 135 / 40 / 12 | 64 | 2 / 1 | 7 | 9180 or, 540 bois, 4320 fer, 1380 vivres | 2.14 or, 0.25 vivres | 16 |
| Templier gamma | Apocalypse | 105 / 34 / 12 | 54.4 | 3 / 4 | 11 | 9540 or, 660 bois, 4500 fer, 1200 vivres | 2.21 or, 0.25 vivres | 16 |
| Hussard au radium | Division atomique | 82 / 30 / 8 | 48 | 6 / 1 | 8 | 4250 or, 450 bois, 1500 fer, 1150 vivres | 1.23 or, 0.65 vivres | 13 |
| Lancier isotopique | Division atomique | 95 / 36 / 8 | 57.6 | 5 / 1 | 8 | 4900 or, 500 bois, 2150 fer, 1250 vivres | 1.47 or, 0.65 vivres | 13 |
| Cuirassier de cobalt | Division atomique | 138 / 30 / 16 | 48 | 4 / 1 | 8 | 5900 or, 600 bois, 2750 fer, 1500 vivres | 1.79 or, 0.65 vivres | 13 |
| Dragon des cendres | Division atomique | 80 / 29 / 8 | 46.4 | 5 / 4 | 8 | 5150 or, 500 bois, 1950 fer, 1200 vivres | 1.47 or, 0.65 vivres | 13 |
| Éclaireur blafard | Division atomique | 72 / 26 / 6 | 41.6 | 7 / 3 | 8 | 5250 or, 450 bois, 1600 fer, 1250 vivres | 1.43 or, 0.65 vivres | 17 |
| Paladin gamma | Apocalypse | 140 / 38 / 14 | 60.8 | 4 / 1 | 12 | 10080 or, 900 bois, 4500 fer, 2520 vivres | 2.5 or, 0.65 vivres | 16 |
| Estafette au radium | Division atomique | 66 / 24 / 6 | 38.4 | 9 / 3 | 9 | 4500 or, 350 bois, 2000 fer, 450 vivres | 1.22 or, 0.8 fer, 0.25 vivres | 13 |
| Moto d’assaut isotopique | Division atomique | 85 / 32 / 8 | 51.2 | 7 / 3 | 9 | 5250 or, 400 bois, 2500 fer, 500 vivres | 1.44 or, 1 fer, 0.25 vivres | 13 |
| Side-car de cobalt | Division atomique | 110 / 28 / 14 | 44.8 | 5 / 3 | 9 | 5650 or, 500 bois, 2900 fer, 600 vivres | 1.61 or, 0.9 fer, 0.25 vivres | 13 |
| Chasseur blafard motorisé | Division atomique | 72 / 38 / 6 | 60.8 | 7 / 5 | 9 | 6250 or, 400 bois, 2650 fer, 500 vivres | 1.63 or, 1.15 fer, 0.25 vivres | 13 |
| Tricycle gamma | Division atomique | 90 / 24 / 8 | 38.4 | 6 / 5 | 9 | 6000 or, 450 bois, 2900 fer, 500 vivres | 1.64 or, 0.8 fer, 0.25 vivres | 13 |
| Moto de l’Apocalypse | Apocalypse | 108 / 32 / 10 | 51.2 | 5 / 4 | 13 | 10800 or, 840 bois, 5040 fer, 900 vivres | 2.44 or, 1 fer, 0.25 vivres | 13 |
| Automitrailleuse au radium | Division atomique | 105 / 28 / 10 | 44.8 | 7 / 4 | 14 | 6150 or, 650 bois, 3150 fer, 500 vivres | 1.74 or, 0.9 fer, 0.25 vivres | 13 |
| Semi-chenillé de cobalt | Division atomique | 142 / 34 / 14 | 54.4 | 4 / 3 | 14 | 7250 or, 700 bois, 4000 fer, 650 vivres | 2.1 or, 1.05 fer, 0.25 vivres | 14 |
| Chasseur de chars isotopique | Division atomique | 120 / 36 / 10 | 57.6 | 3 / 5 | 14 | 8650 or, 650 bois, 4650 fer, 700 vivres | 2.44 or, 1.1 fer, 0.25 vivres | 14 |
| Char Mausolée | Apocalypse | 220 / 40 / 18 | 64 | 2 / 3 | 14 | 16200 or, 1260 bois, 9360 fer, 1380 vivres | 3.92 or, 1.2 fer, 0.25 vivres | 15 |
| Chenillé Flak gamma | Division atomique | 125 / 24 / 12 | 38.4 | 3 / 6 | 14 | 8250 or, 600 bois, 4400 fer, 650 vivres | 2.32 or, 0.8 fer, 0.25 vivres | 17 |
| Chenillé de l’Apocalypse | Apocalypse | 156 / 36 / 12 | 57.6 | 2 / 6 | 18 | 17640 or, 1440 bois, 9900 fer, 1260 vivres | 4.2 or, 1.1 fer, 0.25 vivres | 15 |
| Épervier au radium | Division atomique | 68 / 19 / 6 | 30.4 | 12 / 3 | 14 | 6500 or, 650 bois, 3000 fer, 450 vivres | 1.77 or, 0.68 fer, 0.25 vivres | 15 |
| Intercepteur isotopique | Division atomique | 92 / 31 / 8 | 49.6 | 10 / 4 | 14 | 8150 or, 700 bois, 4250 fer, 600 vivres | 2.28 or, 0.98 fer, 0.25 vivres | 15 |
| Avion d’assaut cobalt | Division atomique | 128 / 40 / 14 | 64 | 6 / 3 | 14 | 9500 or, 900 bois, 5150 fer, 700 vivres | 2.71 or, 1.2 fer, 0.25 vivres | 15 |
| Chasseur nocturne blafard | Division atomique | 82 / 36 / 8 | 57.6 | 8 / 5 | 14 | 9750 or, 750 bois, 4650 fer, 600 vivres | 2.63 or, 1.1 fer, 0.25 vivres | 15 |
| Bombardier gamma | Division atomique | 140 / 30 / 10 | 48 | 5 / 4 | 14 | 11900 or, 1150 bois, 6250 fer, 850 vivres | 3.36 or, 0.95 fer, 0.25 vivres | 17 |
| Aile de l’Apocalypse | Apocalypse | 180 / 40 / 14 | 64 | 4 / 5 | 18 | 22500 or, 2160 bois, 12240 fer, 1620 vivres | 5.35 or, 1.2 fer, 0.25 vivres | 18 |
| Autogire au radium | Division atomique | 75 / 24 / 6 | 38.4 | 9 / 3 | 12 | 6400 or, 500 bois, 3000 fer, 450 vivres | 1.73 or, 0.8 fer, 0.25 vivres | 15 |
| Hélicoptère isotopique | Division atomique | 95 / 34 / 8 | 54.4 | 7 / 4 | 12 | 8000 or, 650 bois, 4150 fer, 600 vivres | 2.23 or, 1.05 fer, 0.25 vivres | 15 |
| Canonnière cobalt | Division atomique | 145 / 40 / 16 | 64 | 4 / 3 | 12 | 10150 or, 850 bois, 5400 fer, 750 vivres | 2.86 or, 1.2 fer, 0.25 vivres | 15 |
| Hélicoptère Chasseur blafard | Division atomique | 86 / 40 / 6 | 64 | 6 / 5 | 12 | 10250 or, 650 bois, 4900 fer, 650 vivres | 2.74 or, 1.2 fer, 0.25 vivres | 15 |
| Hélicoptère Flak gamma | Division atomique | 105 / 25 / 10 | 40 | 6 / 5 | 12 | 9250 or, 700 bois, 4650 fer, 650 vivres | 2.54 or, 0.82 fer, 0.25 vivres | 17 |
| Hélicoptère de l’Apocalypse | Apocalypse | 165 / 38 / 12 | 60.8 | 4 / 4 | 16 | 19800 or, 1740 bois, 10440 fer, 1440 vivres | 4.64 or, 1.15 fer, 0.25 vivres | 17 |
| Die Glocke I — Vril | Projet Glocke | 200 / 52 / 10 | 83.2 | 5 / 4 | 18 | 27000 or, 3000 bois, 16500 fer, 2250 vivres | 5.42 or, 1.5 fer, 0.25 vivres | 18 |
| Die Glocke II — Nacht | Projet Glocke | 260 / 60 / 14 | 96 | 4 / 5 | 22 | 39000 or, 4200 bois, 24000 fer, 3000 vivres | 7.8 or, 1.7 fer, 0.25 vivres | 18 |
| Die Glocke III — Götterdämmerung | Projet Glocke | 320 / 64 / 16 | 102.4 | 3 / 6 | 26 | 57000 or, 5400 bois, 36000 fer, 3900 vivres | 11.37 or, 1.8 fer, 0.25 vivres | 18 |
| Terrassier arcanique | Fondations | 28 / 0 / 4 | 0 | 3 / 1 | 5 | 60 or, 35 bois, 30 fer, 20 vivres | 0.24 or, 0.25 vivres | 1 |
| Avion de reconnaissance | Guerre industrielle | 32 / 6 / 2 | 9.6 | 10 / 2 | 8 | 660 or, 180 bois, 420 fer, 80 vivres | 0.56 or, 0.35 fer, 0.25 vivres | 4 |
| Chasseur Nachtjäger | Guerre industrielle | 62 / 27 / 5 | 43.2 | 8 / 3 | 8 | 1020 or, 200 bois, 700 fer, 100 vivres | 0.84 or, 0.88 fer, 0.25 vivres | 8 |
| Bombardier funèbre | Guerre industrielle | 78 / 20 / 5 | 32 | 5 / 3 | 12 | 1340 or, 280 bois, 980 fer, 140 vivres | 1.14 or, 0.7 fer, 0.25 vivres | 9 |
| Dirigeable de guerre | Guerre industrielle | 120 / 24 / 8 | 38.4 | 4 / 4 | 12 | 1660 or, 460 bois, 1020 fer, 200 vivres | 1.39 or, 0.8 fer, 0.25 vivres | 10 |
| Dragon du Reich noir | Guerre occulte | 150 / 36 / 12 | 57.6 | 5 / 2 | 12 | 4375 or, 525 bois, 2205 fer, 1330 vivres | 2.01 or, 2 vivres | 13 |
| Canon antiaérien Flak | Guerre industrielle | 54 / 12 / 5 | 19.2 | 2 / 5 | 8 | 600 or, 140 bois, 460 fer, 100 vivres | 0.54 or, 0.5 fer, 0.25 vivres | 7 |
| Voltigeur Tesla | Guerre occulte | 44 / 24 / 6 | 38.4 | 2 / 3 | 5 | 1050 or, 175 bois, 700 fer, 245 vivres | 0.52 or, 0.25 vivres | 7 |
| Chasseur de maléfices | Guerre occulte | 36 / 23 / 4 | 36.8 | 4 / 3 | 5 | 875 or, 315 bois, 350 fer, 245 vivres | 0.42 or, 0.25 vivres | 9 |
| Médecin de la peste | Civil | 28 / 4 / 4 | 6.4 | 3 / 1 | 5 | 85 or, 20 bois, 20 fer, 35 vivres | 0.27 or, 0.25 vivres | 3 |
| Grenadier revenant | Guerre occulte | 54 / 22 / 7 | 35.2 | 2 / 2 | 5 | 840 or, 140 bois, 525 fer, 175 vivres | 0.4 or, 0.25 vivres | 9 |
| Cavalier spectral | Guerre occulte | 58 / 26 / 7 | 41.6 | 5 / 1 | 5 | 1400 or, 245 bois, 630 fer, 350 vivres | 0.63 or, 0.65 vivres | 9 |
| Marcheur de siège | Guerre occulte | 100 / 27 / 10 | 43.2 | 2 / 4 | 12 | 1925 or, 525 bois, 1575 fer, 280 vivres | 1.02 or, 0.88 fer, 0.25 vivres | 10 |
| Char possédé | Guerre occulte | 140 / 34 / 15 | 54.4 | 2 / 3 | 12 | 2625 or, 595 bois, 2205 fer, 420 vivres | 1.39 or, 1.05 fer, 0.25 vivres | 10 |
| Section de mortier | Guerre industrielle | 30 / 16 / 2 | 25.6 | 2 / 5 | 6 | 520 or, 200 bois, 360 fer, 100 vivres | 0.49 or, 0.25 vivres | 6 |
| Fusilier | Guerre industrielle | 34 / 14 / 4 | 22.4 | 3 / 4 | 5 | 220 or, 80 bois, 140 fer, 80 vivres | 0.22 or, 0.25 vivres | 4 |
| Soldat d’assaut | Guerre industrielle | 44 / 19 / 6 | 30.4 | 3 / 2 | 5 | 340 or, 60 bois, 220 fer, 100 vivres | 0.3 or, 0.25 vivres | 4 |
| Mitrailleur | Guerre industrielle | 38 / 22 / 4 | 35.2 | 2 / 4 | 5 | 400 or, 100 bois, 260 fer, 100 vivres | 0.36 or, 0.25 vivres | 5 |
| Tireur des brumes | Guerre industrielle | 26 / 24 / 2 | 38.4 | 3 / 6 | 5 | 440 or, 120 bois, 240 fer, 80 vivres | 0.37 or, 0.25 vivres | 5 |
| Chasseur de blindés | Guerre industrielle | 34 / 12 / 3 | 19.2 | 2 / 4 | 5 | 460 or, 100 bois, 300 fer, 100 vivres | 0.4 or, 0.25 vivres | 5 |
| Officier au sabre | Guerre industrielle | 42 / 16 / 6 | 25.6 | 4 / 2 | 5 | 300 or, 80 bois, 140 fer, 120 vivres | 0.27 or, 0.25 vivres | 4 |
| Moto de reconnaissance | Guerre industrielle | 34 / 12 / 3 | 19.2 | 8 / 2 | 8 | 400 or, 100 bois, 300 fer, 80 vivres | 0.37 or, 0.5 fer, 0.25 vivres | 2 |
| Automitrailleuse | Guerre industrielle | 64 / 20 / 7 | 32 | 6 / 3 | 8 | 600 or, 120 bois, 460 fer, 100 vivres | 0.53 or, 0.7 fer, 0.25 vivres | 4 |
| Char de rupture | Guerre industrielle | 110 / 28 / 12 | 44.8 | 3 / 4 | 12 | 880 or, 180 bois, 800 fer, 120 vivres | 0.82 or, 0.9 fer, 0.25 vivres | 8 |
| Canon de campagne | Guerre industrielle | 40 / 22 / 3 | 35.2 | 2 / 6 | 8 | 580 or, 240 bois, 460 fer, 80 vivres | 0.57 or, 0.75 fer, 0.25 vivres | 6 |
| Batterie de fusées | Guerre industrielle | 52 / 30 / 4 | 48 | 2 / 7 | 8 | 1020 or, 200 bois, 840 fer, 100 vivres | 0.9 or, 0.95 fer, 0.25 vivres | 13 |
| Chevalier mécanique | Guerre occulte | 82 / 28 / 10 | 44.8 | 3 / 1 | 8 | 1505 or, 280 bois, 1225 fer, 175 vivres | 0.76 or, 0.9 fer, 0.25 vivres | 9 |
| Paysan | Civil | 12 / 0 / 0 | 0 | 3 / 1 | 3 | 5 or, 10 bois, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Milicien | Fondations | 22 / 6 / 2 | 9.6 | 3 / 1 | 5 | 15 or, 10 bois, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Lancier | Fondations | 32 / 8 / 5 | 12.8 | 3 / 1 | 5 | 30 or, 20 bois, 15 fer, 15 vivres | 0.15 or, 0.25 vivres | 1 |
| Arbalétrier | Armée médiévale | 26 / 13 / 3 | 20.8 | 2 / 3 | 5 | 113 or, 63 bois, 50 fer, 38 vivres | 0.17 or, 0.25 vivres | 3 |
| Rôdeur | Armée médiévale | 26 / 11 / 4 | 17.6 | 4 / 3 | 5 | 138 or, 88 bois, 25 fer, 50 vivres | 0.2 or, 0.25 vivres | 1 |
| Cavalier léger | Armée médiévale | 30 / 9 / 3 | 14.4 | 6 / 1 | 5 | 125 or, 25 bois, 38 fer, 75 vivres | 0.17 or, 0.65 vivres | 2 |
| Paladin | Armée médiévale | 60 / 16 / 9 | 25.6 | 2 / 1 | 5 | 275 or, 25 bois, 150 fer, 88 vivres | 0.36 or, 0.25 vivres | 4 |
| Bélier | Armée médiévale | 70 / 4 / 7 | 6.4 | 2 / 1 | 6 | 188 or, 225 bois, 88 fer, 38 vivres | 0.36 or, 0.25 vivres | 1 |
| Guérisseuse | Civil | 20 / 0 / 2 | 0 | 3 / 1 | 5 | 45 or, 10 bois, 5 fer, 25 vivres | 0.15 or, 0.25 vivres | 2 |
| Ingénieur | Civil | 26 / 3 / 4 | 3 | 3 / 1 | 5 | 45 or, 30 bois, 20 fer, 15 vivres | 0.18 or, 0.25 vivres | 1 |
| Berserker | Armée médiévale | 38 / 19 / 1 | 30.4 | 3 / 1 | 5 | 163 or, 25 bois, 75 fer, 75 vivres | 0.23 or, 0.25 vivres | 3 |
| Acolyte du Vide | Guerre occulte | 30 / 22 / 3 | 35.2 | 2 / 3 | 5 | 875 or, 175 bois, 280 fer, 245 vivres | 0.38 or, 0.25 vivres | 3 |
| Éclaireur | Fondations | 16 / 3 / 1 | 4.8 | 5 / 1 | 5 | 20 or, 15 bois, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Fantassin | Fondations | 30 / 8 / 4 | 12.8 | 3 / 1 | 5 | 25 or, 10 bois, 10 fer, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Garde | Fondations | 46 / 6 / 8 | 9.6 | 2 / 1 | 5 | 45 or, 25 fer, 15 vivres | 0.15 or, 0.25 vivres | 1 |
| Archer | Fondations | 22 / 10 / 2 | 16 | 2 / 3 | 5 | 30 or, 25 bois, 10 vivres | 0.15 or, 0.25 vivres | 1 |
| Chevalier | Armée médiévale | 48 / 14 / 6 | 22.4 | 5 / 1 | 5 | 175 or, 25 bois, 75 fer, 63 vivres | 0.23 or, 0.65 vivres | 2 |
| Engin de siège | Armée médiévale | 30 / 7 / 2 | 11.2 | 1 / 4 | 6 | 225 or, 163 bois, 100 fer, 25 vivres | 0.34 or, 0.25 vivres | 2 |

## Bâtiments

| Bâtiment | PV de base | Coût initial | Production brute / minute niveau 1 | Production brute / minute niveau 3 | Terrains | Prérequis |
| --- | --- | --- | --- | --- | --- | --- |
| Scierie à vapeur | 130 | 480 or, 320 bois, 160 pierre, 140 fer | 16 bois | 38.4 bois | FOREST | Scierie, Atelier |
| Carrière mécanisée | 160 | 560 or, 360 bois, 200 pierre, 180 fer | 12 pierre | 28.8 pierre | HILL, MOUNTAIN | Carrière de pierre, Atelier |
| Mine industrielle | 150 | 640 or, 360 bois, 280 pierre, 200 fer | 10 fer | 24 fer | HILL | Mine de fer, Forge |
| Scierie des ombres | 240 | 2940 or, 1260 bois, 840 pierre, 980 fer | 28 bois | 67.2 bois | FOREST | Scierie à vapeur, Laboratoire des cendres |
| Carrière runique | 280 | 3220 or, 1260 bois, 1120 pierre, 1120 fer | 21 pierre | 50.4 pierre | HILL, MOUNTAIN | Carrière mécanisée, Laboratoire des cendres |
| Mine des abysses | 260 | 3500 or, 1260 bois, 1400 pierre, 1260 fer | 18 fer | 43.2 fer | HILL | Mine industrielle, Laboratoire des cendres |
| Complexe des cloches | 750 | 33000 or, 7500 bois, 10500 pierre, 18000 fer | — | — | PLAIN, RUINS | Réacteur noir, Fonderie atomique, Observatoire noir |
| Laboratoire des isotopes | 385 | 4400 or, 1600 bois, 2000 pierre, 3000 fer | — | — | PLAIN, HILL, RUINS | Laboratoire des cendres, Manufacture de munitions |
| Réacteur noir | 630 | 9600 or, 2400 bois, 4800 pierre, 6720 fer | 16 or | 38.4 or | PLAIN, HILL, RUINS | Laboratoire des isotopes, Raffinerie |
| Héliport occulte | 430 | 5600 or, 1800 bois, 2400 pierre, 3600 fer | — | — | PLAIN, RUINS | Laboratoire des isotopes, Garage militaire, Relais radio |
| Fonderie atomique | 625 | 15000 or, 4080 bois, 5220 pierre, 10380 fer | — | — | PLAIN, HILL, RUINS | Réacteur noir, Usine de blindés |
| Aérodrome militaire | 265 | 1575 or, 980 bois, 700 pierre, 980 fer | — | — | PLAIN, RUINS | Garage militaire, Relais radio |
| Chantier de dirigeables | 380 | 2520 or, 1575 bois, 1085 pierre, 1785 fer | — | — | PLAIN, RUINS | Aérodrome militaire, Raffinerie |
| Sanctuaire draconique | 440 | 4450 or, 1700 bois, 2750 pierre, 2400 fer | — | — | HILL, MOUNTAIN, RUINS, CORRUPTION | Observatoire noir, Caserne des revenants |
| École de défense antiaérienne | 280 | 560 or, 280 bois, 380 pierre, 480 fer | — | — | PLAIN, HILL, RUINS | Manufacture de munitions, Relais radio |
| Palissade en bois | 100 | 30 bois | — | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | — |
| Rempart de pierre | 240 | 98 pierre | — | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | Évolution uniquement : palissade en bois (2 PA, coût sans réduction) |
| Mur en acier | 480 | 225 fer | — | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | Évolution uniquement : rempart de pierre (2 PA, coût sans réduction) |
| Tour Tesla | 380 | 1085 or, 560 bois, 840 pierre, 1085 fer | — | — | PLAIN, HILL, RUINS | Forge, Laboratoire des cendres |
| Caserne des revenants | 300 | 1190 or, 735 bois, 805 pierre, 595 fer | — | — | PLAIN, HILL, RUINS | Caserne, Laboratoire des cendres |
| Fonderie alchimique | 260 | 1575 or, 840 bois, 595 pierre, 980 fer | 10 or | 24 or | PLAIN, HILL, RUINS | Raffinerie, Laboratoire des cendres |
| Observatoire noir | 220 | 1680 or, 980 bois, 735 pierre, 805 fer | — | — | PLAIN, HILL, RUINS | Bibliothèque des astres, Relais radio |
| Carrière de pierre | 75 | 20 or, 30 bois | 6 pierre | 14.4 pierre | HILL, MOUNTAIN | — |
| Arsenal | 175 | 400 or, 380 bois, 200 pierre, 200 fer | — | — | PLAIN, HILL, RUINS | Caserne, Forge |
| Bunker | 350 | 400 or, 200 bois, 460 pierre, 560 fer | — | — | PLAIN, HILL, RUINS | Forge |
| Garage militaire | 175 | 460 or, 380 bois, 320 fer | — | — | PLAIN, HILL, RUINS | Atelier |
| Usine de blindés | 265 | 1575 or, 980 bois, 665 pierre, 1295 fer | — | — | PLAIN, HILL, RUINS | Garage militaire, Raffinerie |
| Raffinerie | 160 | 560 or, 400 bois, 200 pierre, 400 fer | 6 or | 14.4 or | PLAIN, HILL, RUINS | Forge |
| Manufacture de munitions | 160 | 480 or, 380 bois, 140 pierre, 340 fer | — | — | PLAIN, HILL, RUINS | Arsenal |
| Relais radio | 125 | 420 or, 240 bois, 100 pierre, 380 fer | — | — | PLAIN, HILL, RUINS | Atelier |
| Hôpital militaire | 175 | 380 or, 380 bois, 120 pierre, 140 fer, 180 vivres | — | — | PLAIN, HILL, RUINS | Chaumière, Monastère |
| Batterie fortifiée | 300 | 620 or, 340 bois, 280 pierre, 560 fer | — | — | PLAIN, HILL, RUINS | Manufacture de munitions |
| Laboratoire des cendres | 240 | 1785 or, 980 bois, 735 pierre, 1190 fer | — | — | PLAIN, HILL, RUINS | Bibliothèque des astres, Forge |
| Rampe de lancement | 260 | 2030 or, 980 bois, 735 pierre, 1680 fer | — | — | PLAIN, HILL, RUINS | Usine de blindés, Laboratoire des cendres |
| Dépôt ferroviaire | 195 | 325 or, 325 bois, 113 pierre, 263 fer | 5 or | 12 or | PLAIN, HILL, RUINS | Atelier, Entrepôt |
| Campement | 75 | 25 bois | 2 or, 4 vivres | 4.8 or, 9.6 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Chaumière | 50 | 20 bois | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Grenier | 65 | 23 or, 60 bois | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Cabane de chasse | 50 | 20 bois | 5 vivres | 12 vivres | FOREST | — |
| Pêcherie | 50 | 10 or, 30 bois | 10 vivres | 24 vivres | RIVER, MARSH | — |
| Écurie | 105 | 98 or, 105 bois, 30 fer, 45 vivres | — | — | PLAIN, HILL | Caserne |
| Archerie | 90 | 35 or, 50 bois, 10 pierre, 10 vivres | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Monastère | 135 | 135 or, 105 bois, 68 pierre, 53 fer, 38 vivres | 3 or, 3 vivres | 7.2 or, 7.2 vivres | PLAIN, HILL, RUINS | Chaumière |
| Forge | 140 | 238 or, 163 bois, 75 pierre, 125 fer | — | — | PLAIN, HILL, RUINS | Atelier |
| Bibliothèque des astres | 105 | 288 or, 200 bois, 88 pierre, 88 fer, 63 vivres | 4 or | 9.6 or | PLAIN, HILL, RUINS | Monastère |
| Boulangerie | 75 | 45 or, 60 bois, 23 pierre, 15 fer, 23 vivres | 14 vivres | 33.6 vivres | PLAIN, HILL, FOREST, RUINS | Ferme |
| Puits | 75 | 5 or, 20 bois, 10 pierre | 3 vivres | 7.2 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Avant-poste | 90 | 35 or, 35 bois, 5 fer | 3 or, 5 vivres | 7.2 or, 12 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Village | 105 | 105 or, 90 bois, 38 pierre, 23 fer, 45 vivres | 6 or, 6 vivres | 18 or, 18 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Ferme | 40 | 20 or, 25 bois | 8 vivres | 19.2 vivres | PLAIN | — |
| Scierie | 50 | 15 or, 25 bois | 8 bois | 19.2 bois | FOREST | — |
| Mine de fer | 65 | 30 or, 35 bois, 10 pierre | 5 fer | 12 fer | HILL | — |
| Mine d’or | 120 | 400 or, 300 bois, 225 pierre, 150 fer | 12 or | 28.8 or | HILL, MOUNTAIN | Mine de fer, Atelier |
| Marché | 75 | 90 or, 60 bois, 23 fer, 23 vivres | 8 or | 19.2 or | PLAIN, HILL, RUINS | — |
| Entrepôt | 90 | 60 or, 75 bois, 30 pierre, 23 fer | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Atelier | 90 | 188 or, 125 bois, 50 pierre, 75 fer | 2 or | 4.8 or | PLAIN, HILL, RUINS | — |
| Caserne | 120 | 35 or, 45 bois, 15 pierre, 10 vivres | — | — | PLAIN, HILL, RUINS | — |
| Fort | 195 | 250 or, 125 bois, 188 pierre, 188 fer | — | — | PLAIN, HILL, RUINS | — |
| Tour de guet | 120 | 75 or, 45 bois, 45 pierre, 53 fer | — | — | PLAIN, HILL, FOREST, RUINS | — |

## Dépenses d’évolution

Chaque ligne est un paiement supplémentaire réel, en plus de 2 PA. Les habitants requis ne sont pas consommés.

| Bâtiment actuel | Évolution | Ressources débitées | Stockage total ajouté après évolution |
| --- | --- | --- | --- |
| Scierie à vapeur · 1 | Scierie à vapeur · niveau 2 | 1200 or, 800 bois, 400 pierre, 350 fer | 0 par ressource |
| Scierie à vapeur · 2 | Scierie à vapeur · niveau 3 | 2400 or, 1600 bois, 800 pierre, 700 fer | 0 par ressource |
| Carrière mécanisée · 1 | Carrière mécanisée · niveau 2 | 1400 or, 900 bois, 500 pierre, 450 fer | 0 par ressource |
| Carrière mécanisée · 2 | Carrière mécanisée · niveau 3 | 2800 or, 1800 bois, 1000 pierre, 900 fer | 0 par ressource |
| Mine industrielle · 1 | Mine industrielle · niveau 2 | 1600 or, 900 bois, 700 pierre, 500 fer | 0 par ressource |
| Mine industrielle · 2 | Mine industrielle · niveau 3 | 3200 or, 1800 bois, 1400 pierre, 1000 fer | 0 par ressource |
| Scierie des ombres · 1 | Scierie des ombres · niveau 2 | 7350 or, 3150 bois, 2100 pierre, 2450 fer | 0 par ressource |
| Scierie des ombres · 2 | Scierie des ombres · niveau 3 | 14700 or, 6300 bois, 4200 pierre, 4900 fer | 0 par ressource |
| Carrière runique · 1 | Carrière runique · niveau 2 | 8050 or, 3150 bois, 2800 pierre, 2800 fer | 0 par ressource |
| Carrière runique · 2 | Carrière runique · niveau 3 | 16100 or, 6300 bois, 5600 pierre, 5600 fer | 0 par ressource |
| Mine des abysses · 1 | Mine des abysses · niveau 2 | 8750 or, 3150 bois, 3500 pierre, 3150 fer | 0 par ressource |
| Mine des abysses · 2 | Mine des abysses · niveau 3 | 17500 or, 6300 bois, 7000 pierre, 6300 fer | 0 par ressource |
| Complexe des cloches · 1 | Complexe des cloches · niveau 2 | 82500 or, 18750 bois, 26250 pierre, 45000 fer | 0 par ressource |
| Complexe des cloches · 2 | Complexe des cloches · niveau 3 | 165000 or, 37500 bois, 52500 pierre, 90000 fer | 0 par ressource |
| Laboratoire des isotopes · 1 | Laboratoire des isotopes · niveau 2 | 11000 or, 4000 bois, 5000 pierre, 7500 fer | 0 par ressource |
| Laboratoire des isotopes · 2 | Laboratoire des isotopes · niveau 3 | 22000 or, 8000 bois, 10000 pierre, 15000 fer | 0 par ressource |
| Réacteur noir · 1 | Réacteur noir · niveau 2 | 24000 or, 6000 bois, 12000 pierre, 16800 fer | 0 par ressource |
| Réacteur noir · 2 | Réacteur noir · niveau 3 | 48000 or, 12000 bois, 24000 pierre, 33600 fer | 0 par ressource |
| Héliport occulte · 1 | Héliport occulte · niveau 2 | 14000 or, 4500 bois, 6000 pierre, 9000 fer | 0 par ressource |
| Héliport occulte · 2 | Héliport occulte · niveau 3 | 28000 or, 9000 bois, 12000 pierre, 18000 fer | 0 par ressource |
| Fonderie atomique · 1 | Fonderie atomique · niveau 2 | 37500 or, 10200 bois, 13050 pierre, 25950 fer | 0 par ressource |
| Fonderie atomique · 2 | Fonderie atomique · niveau 3 | 75000 or, 20400 bois, 26100 pierre, 51900 fer | 0 par ressource |
| Aérodrome militaire · 1 | Aérodrome militaire · niveau 2 | 3938 or, 2450 bois, 1750 pierre, 2450 fer | 0 par ressource |
| Aérodrome militaire · 2 | Aérodrome militaire · niveau 3 | 7875 or, 4900 bois, 3500 pierre, 4900 fer | 0 par ressource |
| Chantier de dirigeables · 1 | Chantier de dirigeables · niveau 2 | 6300 or, 3938 bois, 2713 pierre, 4463 fer | 0 par ressource |
| Chantier de dirigeables · 2 | Chantier de dirigeables · niveau 3 | 12600 or, 7875 bois, 5425 pierre, 8925 fer | 0 par ressource |
| Sanctuaire draconique · 1 | Sanctuaire draconique · niveau 2 | 11125 or, 4250 bois, 6875 pierre, 6000 fer | 0 par ressource |
| Sanctuaire draconique · 2 | Sanctuaire draconique · niveau 3 | 22250 or, 8500 bois, 13750 pierre, 12000 fer | 0 par ressource |
| École de défense antiaérienne · 1 | École de défense antiaérienne · niveau 2 | 1400 or, 700 bois, 950 pierre, 1200 fer | 0 par ressource |
| École de défense antiaérienne · 2 | École de défense antiaérienne · niveau 3 | 2800 or, 1400 bois, 1900 pierre, 2400 fer | 0 par ressource |
| Palissade en bois · 1 | Rempart de pierre | 98 pierre | 0 par ressource |
| Rempart de pierre · 1 | Mur en acier | 225 fer | 0 par ressource |
| Tour Tesla · 1 | Tour Tesla · niveau 2 | 2713 or, 1400 bois, 2100 pierre, 2713 fer | 0 par ressource |
| Tour Tesla · 2 | Tour Tesla · niveau 3 | 5425 or, 2800 bois, 4200 pierre, 5425 fer | 0 par ressource |
| Caserne des revenants · 1 | Caserne des revenants · niveau 2 | 2975 or, 1838 bois, 2013 pierre, 1488 fer | 0 par ressource |
| Caserne des revenants · 2 | Caserne des revenants · niveau 3 | 5950 or, 3675 bois, 4025 pierre, 2975 fer | 0 par ressource |
| Fonderie alchimique · 1 | Fonderie alchimique · niveau 2 | 3938 or, 2100 bois, 1488 pierre, 2450 fer | 0 par ressource |
| Fonderie alchimique · 2 | Fonderie alchimique · niveau 3 | 7875 or, 4200 bois, 2975 pierre, 4900 fer | 0 par ressource |
| Observatoire noir · 1 | Observatoire noir · niveau 2 | 4200 or, 2450 bois, 1838 pierre, 2013 fer | 0 par ressource |
| Observatoire noir · 2 | Observatoire noir · niveau 3 | 8400 or, 4900 bois, 3675 pierre, 4025 fer | 0 par ressource |
| Carrière de pierre · 1 | Carrière de pierre · niveau 2 | 50 or, 75 bois | 0 par ressource |
| Carrière de pierre · 2 | Carrière de pierre · niveau 3 | 100 or, 150 bois | 0 par ressource |
| Arsenal · 1 | Arsenal · niveau 2 | 1000 or, 950 bois, 500 pierre, 500 fer | 0 par ressource |
| Arsenal · 2 | Arsenal · niveau 3 | 2000 or, 1900 bois, 1000 pierre, 1000 fer | 0 par ressource |
| Bunker · 1 | Bunker · niveau 2 | 1000 or, 500 bois, 1150 pierre, 1400 fer | 0 par ressource |
| Bunker · 2 | Bunker · niveau 3 | 2000 or, 1000 bois, 2300 pierre, 2800 fer | 0 par ressource |
| Garage militaire · 1 | Garage militaire · niveau 2 | 1150 or, 950 bois, 800 fer | 0 par ressource |
| Garage militaire · 2 | Garage militaire · niveau 3 | 2300 or, 1900 bois, 1600 fer | 0 par ressource |
| Usine de blindés · 1 | Usine de blindés · niveau 2 | 3938 or, 2450 bois, 1663 pierre, 3238 fer | 0 par ressource |
| Usine de blindés · 2 | Usine de blindés · niveau 3 | 7875 or, 4900 bois, 3325 pierre, 6475 fer | 0 par ressource |
| Raffinerie · 1 | Raffinerie · niveau 2 | 1400 or, 1000 bois, 500 pierre, 1000 fer | 0 par ressource |
| Raffinerie · 2 | Raffinerie · niveau 3 | 2800 or, 2000 bois, 1000 pierre, 2000 fer | 0 par ressource |
| Manufacture de munitions · 1 | Manufacture de munitions · niveau 2 | 1200 or, 950 bois, 350 pierre, 850 fer | 0 par ressource |
| Manufacture de munitions · 2 | Manufacture de munitions · niveau 3 | 2400 or, 1900 bois, 700 pierre, 1700 fer | 0 par ressource |
| Relais radio · 1 | Relais radio · niveau 2 | 1050 or, 600 bois, 250 pierre, 950 fer | 0 par ressource |
| Relais radio · 2 | Relais radio · niveau 3 | 2100 or, 1200 bois, 500 pierre, 1900 fer | 0 par ressource |
| Hôpital militaire · 1 | Hôpital militaire · niveau 2 | 950 or, 950 bois, 300 pierre, 350 fer, 450 vivres | 0 par ressource |
| Hôpital militaire · 2 | Hôpital militaire · niveau 3 | 1900 or, 1900 bois, 600 pierre, 700 fer, 900 vivres | 0 par ressource |
| Batterie fortifiée · 1 | Batterie fortifiée · niveau 2 | 1550 or, 850 bois, 700 pierre, 1400 fer | 0 par ressource |
| Batterie fortifiée · 2 | Batterie fortifiée · niveau 3 | 3100 or, 1700 bois, 1400 pierre, 2800 fer | 0 par ressource |
| Laboratoire des cendres · 1 | Laboratoire des cendres · niveau 2 | 4463 or, 2450 bois, 1838 pierre, 2975 fer | 0 par ressource |
| Laboratoire des cendres · 2 | Laboratoire des cendres · niveau 3 | 8925 or, 4900 bois, 3675 pierre, 5950 fer | 0 par ressource |
| Rampe de lancement · 1 | Rampe de lancement · niveau 2 | 5075 or, 2450 bois, 1838 pierre, 4200 fer | 0 par ressource |
| Rampe de lancement · 2 | Rampe de lancement · niveau 3 | 10150 or, 4900 bois, 3675 pierre, 8400 fer | 0 par ressource |
| Dépôt ferroviaire · 1 | Dépôt ferroviaire · niveau 2 | 813 or, 813 bois, 283 pierre, 658 fer | 7500 par ressource |
| Dépôt ferroviaire · 2 | Dépôt ferroviaire · niveau 3 | 1625 or, 1625 bois, 565 pierre, 1315 fer | 30000 par ressource |
| Campement · 1 | Avant-poste | 20 or, 60 bois, 30 vivres | 0 par ressource |
| Chaumière · 1 | Chaumière · niveau 2 | 50 bois | 0 par ressource |
| Chaumière · 2 | Chaumière · niveau 3 | 100 bois | 0 par ressource |
| Grenier · 1 | Grenier · niveau 2 | 58 or, 150 bois | 2000 par ressource |
| Grenier · 2 | Grenier · niveau 3 | 115 or, 300 bois | 8000 par ressource |
| Cabane de chasse · 1 | Cabane de chasse · niveau 2 | 50 bois | 0 par ressource |
| Cabane de chasse · 2 | Cabane de chasse · niveau 3 | 100 bois | 0 par ressource |
| Pêcherie · 1 | Pêcherie · niveau 2 | 25 or, 75 bois | 0 par ressource |
| Pêcherie · 2 | Pêcherie · niveau 3 | 50 or, 150 bois | 0 par ressource |
| Écurie · 1 | Écurie · niveau 2 | 245 or, 263 bois, 75 fer, 113 vivres | 0 par ressource |
| Écurie · 2 | Écurie · niveau 3 | 490 or, 525 bois, 150 fer, 225 vivres | 0 par ressource |
| Archerie · 1 | Archerie · niveau 2 | 88 or, 125 bois, 25 pierre, 25 vivres | 0 par ressource |
| Archerie · 2 | Archerie · niveau 3 | 175 or, 250 bois, 50 pierre, 50 vivres | 0 par ressource |
| Monastère · 1 | Monastère · niveau 2 | 338 or, 263 bois, 170 pierre, 133 fer, 95 vivres | 0 par ressource |
| Monastère · 2 | Monastère · niveau 3 | 675 or, 525 bois, 340 pierre, 265 fer, 190 vivres | 0 par ressource |
| Forge · 1 | Forge · niveau 2 | 595 or, 408 bois, 188 pierre, 313 fer | 0 par ressource |
| Forge · 2 | Forge · niveau 3 | 1190 or, 815 bois, 375 pierre, 625 fer | 0 par ressource |
| Bibliothèque des astres · 1 | Bibliothèque des astres · niveau 2 | 720 or, 500 bois, 220 pierre, 220 fer, 158 vivres | 0 par ressource |
| Bibliothèque des astres · 2 | Bibliothèque des astres · niveau 3 | 1440 or, 1000 bois, 440 pierre, 440 fer, 315 vivres | 0 par ressource |
| Boulangerie · 1 | Boulangerie · niveau 2 | 113 or, 150 bois, 58 pierre, 38 fer, 58 vivres | 0 par ressource |
| Boulangerie · 2 | Boulangerie · niveau 3 | 225 or, 300 bois, 115 pierre, 75 fer, 115 vivres | 0 par ressource |
| Puits · 1 | Puits · niveau 2 | 13 or, 50 bois, 25 pierre | 0 par ressource |
| Puits · 2 | Puits · niveau 3 | 25 or, 100 bois, 50 pierre | 0 par ressource |
| Avant-poste · 1 | Village | 120 or, 135 bois, 60 pierre, 30 fer, 60 vivres | 0 par ressource |
| Village · 1 | Bourg | 300 or, 240 bois, 120 pierre, 120 fer, 150 vivres | 0 par ressource |
| Village · 2 | Ville | 1200 or, 960 bois, 480 pierre, 480 fer, 600 vivres | 0 par ressource |
| Ferme · 1 | Ferme · niveau 2 | 50 or, 63 bois | 0 par ressource |
| Ferme · 2 | Ferme · niveau 3 | 100 or, 125 bois | 0 par ressource |
| Scierie · 1 | Scierie · niveau 2 | 38 or, 63 bois | 0 par ressource |
| Scierie · 2 | Scierie · niveau 3 | 75 or, 125 bois | 0 par ressource |
| Mine de fer · 1 | Mine de fer · niveau 2 | 75 or, 88 bois, 25 pierre | 0 par ressource |
| Mine de fer · 2 | Mine de fer · niveau 3 | 150 or, 175 bois, 50 pierre | 0 par ressource |
| Mine d’or · 1 | Mine d’or · niveau 2 | 1000 or, 750 bois, 563 pierre, 375 fer | 0 par ressource |
| Mine d’or · 2 | Mine d’or · niveau 3 | 2000 or, 1500 bois, 1125 pierre, 750 fer | 0 par ressource |
| Marché · 1 | Marché · niveau 2 | 225 or, 150 bois, 58 fer, 58 vivres | 0 par ressource |
| Marché · 2 | Marché · niveau 3 | 450 or, 300 bois, 115 fer, 115 vivres | 0 par ressource |
| Entrepôt · 1 | Entrepôt · niveau 2 | 150 or, 188 bois, 75 pierre, 58 fer | 4000 par ressource |
| Entrepôt · 2 | Entrepôt · niveau 3 | 300 or, 375 bois, 150 pierre, 115 fer | 16000 par ressource |
| Atelier · 1 | Atelier · niveau 2 | 470 or, 313 bois, 125 pierre, 188 fer | 0 par ressource |
| Atelier · 2 | Atelier · niveau 3 | 940 or, 625 bois, 250 pierre, 375 fer | 0 par ressource |
| Caserne · 1 | Caserne · niveau 2 | 88 or, 113 bois, 38 pierre, 25 vivres | 0 par ressource |
| Caserne · 2 | Caserne · niveau 3 | 175 or, 225 bois, 75 pierre, 50 vivres | 0 par ressource |
| Fort · 1 | Fort · niveau 2 | 625 or, 313 bois, 470 pierre, 470 fer | 0 par ressource |
| Fort · 2 | Fort · niveau 3 | 1250 or, 625 bois, 940 pierre, 940 fer | 0 par ressource |
| Tour de guet · 1 | Tour de guet · niveau 2 | 188 or, 113 bois, 113 pierre, 133 fer | 0 par ressource |
| Tour de guet · 2 | Tour de guet · niveau 3 | 375 or, 225 bois, 225 pierre, 265 fer | 0 par ressource |

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
| Chevalier | Caserne, Écurie | 133 or, 150 bois, 15 pierre, 30 fer, 55 vivres |
| Char de rupture | Usine de blindés, Garage militaire, Atelier, Raffinerie, Forge, Manufacture de munitions, Arsenal, Caserne | 3936 or, 2853 bois, 1345 pierre, 2755 fer, 10 vivres |
| Char possédé | Fonderie alchimique, Raffinerie, Forge, Atelier, Laboratoire des cendres, Bibliothèque des astres, Monastère, Chaumière, Usine de blindés, Garage militaire | 6804 or, 4193 bois, 2476 pierre, 4526 fer, 101 vivres |
| Char Mausolée | Réacteur noir, Laboratoire des isotopes, Laboratoire des cendres, Bibliothèque des astres, Monastère, Chaumière, Forge, Atelier, Manufacture de munitions, Arsenal, Caserne, Raffinerie, Fonderie atomique, Usine de blindés, Garage militaire | 35144 or, 12238 bois, 14256 pierre, 24186 fer, 111 vivres |
| Aile de l’Apocalypse | Réacteur noir, Laboratoire des isotopes, Laboratoire des cendres, Bibliothèque des astres, Monastère, Chaumière, Forge, Atelier, Manufacture de munitions, Arsenal, Caserne, Raffinerie, Fonderie atomique, Usine de blindés, Garage militaire, Chantier de dirigeables, Aérodrome militaire, Relais radio | 39659 or, 15033 bois, 16141 pierre, 27331 fer, 111 vivres |
