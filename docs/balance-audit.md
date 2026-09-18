# Audit d’équilibrage — économie et cinq âges v0.7

Rapport reproductible : `node --import tsx scripts/audit-balance.ts`. Les coûts sont ceux de base, avant le bonus de construction de la Cendre. Le premier bâtiment de recrutement est utilisé pour calculer la chaîne d’infrastructure ; d’autres accès peuvent exister.

## Corrections appliquées

- Économie : production ×1 / ×1,8 / ×3 / ×5 / ×8 hors villes. Extracteurs industriels : 48 bois, 36 pierre ou 30 fer/min ; occultes : 160 bois, 120 pierre ou 100 fer/min. Mine d’or 24, fonderie alchimique 30, réacteur 120 or/min. Terrains requis inchangés.
- Améliorations : producteurs sans recrutement ×0,8 / ×1,4 / ×2,4 / ×4 du prix de construction ; autres bâtiments ×2 / ×4 / ×8 / ×16. Planchers militaires en or, bois, pierre et fer pour payer réellement les nouveaux recrutements. Les devis des villes et des remparts restent distincts. Chaque amélioration coûte 2 PA et débite les ressources.
- Formation : +25 / +60 / +80 / +100 % aux niveaux 2 à 5, appliquée aussi aux troupes existantes sans cumul des recruteurs. Statistiques de base harmonisées par palier et rôle ; rareté et vétérans conservés.
- Prix des combattants de paliers 2 à 6 calculés sur leurs PV, attaque, défense, portée, mobilité et spécialités ; allocation des matériaux par rôle. Fondations, civils et prix exceptionnels des Glocke conservés. Les réductions ciblées remplacent l’inflation uniforme.
- Mobilisation et entretien harmonisés par rôle et palier. Les unités mécanisées consomment du fer, les cavaliers davantage de vivres. Un manque de population bloque les nouvelles recrues sans supprimer les armées présentes.
- Contres : bazooka +32 contre le blindage, Flak +30 contre l’aérien ; défense ignorée à 75 % / 50 %. École antiaérienne accessible après les munitions sans relais radio. Les contres spécialisés reçoivent une réduction de prix de 20 %.
- Grenades d’infanterie : 1 PA. Artillerie et bombardiers de siège : 2 PA, attaque contre bâtiments renforcée. Les Glocke conservent leur coût très élevé et doublent leur puissance structurelle de base. Aucun tir automatique ni dégât de zone ajouté.
- Stockage : logistique dédiée conservée ; les extracteurs ajoutent du stockage dès le niveau 2, triplé pour les filières industrielles et occultes.
- Migration v4 : conserve le pourcentage de blessures, les bonus rares, les stocks, les PA, les possessions et remboursements historiques, archives incluses. Les PNJ existants gardent leurs statistiques tirées au sort.
- Voir les parcours chiffrés et limites dans [les simulations](balance-simulations.md) et les choix dans [les notes v0.7](balance-v07.md).

## Limites de la validation

Les tests vérifient les sources de ressources, les refus serveur, le départ à zéro, les prérequis, les plafonds, la migration et les contres militaires. Ils ne prouvent pas un équilibre parfait entre joueurs. Les rencontres réelles, les coalitions, les sièges prolongés et le rythme à 1 PA toutes les 30 secondes nécessitent des parties longues. Une pénurie arrête la croissance ; elle ne supprime pas automatiquement les armées. Les chaînes industrielles mobilisent les cinq ressources existantes, sans jauges distinctes de pétrole ou de munitions.

## Unités

| Unité | Palier | PV / attaque / défense de base | Attaque avec formation niveau 5 | Déplacement / portée | PA / attaque | Places | Coût | Entretien par minute | Infrastructure requise (nombre) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gardien au khopesh noir | Division atomique | 112 / 28.4 / 12 | 56.8 | 4 / 1 | 1 | 8 | 3330 or, 666 bois, 400 pierre, 1332 fer, 999 vivres | 2.1 or, 0.5 vivres | 10 |
| Fusilier d’Anubis | Apocalypse | 138 / 30 / 13 | 60 | 3 / 4 | 1 | 9 | 6415 or, 1283 bois, 770 pierre, 3849 fer, 1925 vivres | 3.7 or, 0.5 vivres | 18 |
| Immortel d’Osiris | Apocalypse | 199 / 31.1 / 19 | 62.2 | 3 / 4 | 1 | 9 | 7745 or, 1549 bois, 930 pierre, 4647 fer, 2324 vivres | 3.7 or, 0.5 vivres | 18 |
| Lancier scarabée | Division atomique | 145 / 28.6 / 13 | 57.2 | 6 / 1 | 1 | 9 | 3585 or, 717 bois, 431 pierre, 2151 fer, 1972 vivres | 2.2 or, 0.8 vivres | 10 |
| Dragonnier de Sobek | Apocalypse | 172 / 30.3 / 15 | 60.6 | 6 / 3 | 1 | 10 | 6990 or, 1398 bois, 839 pierre, 4194 fer, 3845 vivres | 3.8 or, 0.9 vivres | 18 |
| Garde du sphinx noir | Apocalypse | 229 / 31.5 / 23 | 63 | 5 / 1 | 1 | 10 | 8010 or, 1602 bois, 962 pierre, 4806 fer, 4406 vivres | 3.8 or, 0.9 vivres | 18 |
| Moto des dunes noires | Division atomique | 102 / 27.7 / 8 | 55.4 | 9 / 3 | 1 | 10 | 3145 or, 787 bois, 378 pierre, 2516 fer, 472 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 9 |
| Side-car de Khépri | Apocalypse | 145 / 29.8 / 12 | 59.6 | 7 / 4 | 1 | 11 | 6345 or, 1587 bois, 762 pierre, 5076 fer, 952 vivres | 3.9 or, 1.6 fer, 0.7 vivres | 17 |
| Tricycle de Seth | Apocalypse | 154 / 30.3 / 15 | 60.6 | 6 / 5 | 1 | 11 | 5900 or, 1475 bois, 708 pierre, 4720 fer, 885 vivres | 3.9 or, 1.6 fer, 0.7 vivres | 17 |
| Automitrailleuse du chacal | Division atomique | 145 / 27.9 / 11 | 55.8 | 8 / 3 | 1 | 10 | 3585 or, 897 bois, 431 pierre, 2868 fer, 538 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 9 |
| Blindé du cobra royal | Apocalypse | 205 / 30 / 18 | 60 | 6 / 4 | 1 | 18 | 7810 or, 1953 bois, 938 pierre, 6248 fer, 1172 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 17 |
| Chasseur de chars d’Horus | Apocalypse | 190 / 29.9 / 13 | 59.8 | 6 / 5 | 1 | 18 | 6410 or, 1603 bois, 770 pierre, 5128 fer, 962 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 17 |
| Char scarabée noir | Division atomique | 234 / 29.5 / 18 | 59 | 4 / 4 | 1 | 16 | 4810 or, 1203 bois, 578 pierre, 3848 fer, 722 vivres | 2.8 or, 1.5 fer, 1 vivres | 11 |
| Char obélisque | Apocalypse | 275 / 31.1 / 23 | 62.2 | 3 / 4 | 1 | 18 | 7600 or, 1900 bois, 912 pierre, 6080 fer, 1140 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 17 |
| Pyramide de guerre | Apocalypse | 305 / 31.8 / 24.6 | 63.6 | 2 / 4 | 2 | 18 | 11455 or, 2864 bois, 1375 pierre, 9164 fer, 1719 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 17 |
| Lance solaire | Division atomique | 123 / 28.6 / 10 | 57.2 | 3 / 6 | 2 | 10 | 3730 or, 933 bois, 448 pierre, 2984 fer, 560 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 12 |
| Mortier sarcophage | Apocalypse | 153 / 29.8 / 12 | 59.6 | 2 / 6 | 2 | 11 | 8465 or, 2117 bois, 1016 pierre, 6772 fer, 1270 vivres | 3.9 or, 1.6 fer, 0.7 vivres | 18 |
| Batterie d’Apophis | Apocalypse | 159 / 30.6 / 14 | 61.2 | 2 / 7 | 2 | 11 | 9030 or, 2258 bois, 1084 pierre, 7224 fer, 1355 vivres | 3.9 or, 1.6 fer, 0.7 vivres | 18 |
| Intercepteur ibis | Division atomique | 145 / 28.3 / 10 | 56.6 | 10 / 4 | 1 | 13 | 4545 or, 1137 bois, 546 pierre, 3636 fer, 682 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 10 |
| Faucon de guerre | Apocalypse | 190 / 30.4 / 14 | 60.8 | 8 / 4 | 1 | 14 | 6570 or, 1643 bois, 789 pierre, 5256 fer, 986 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 18 |
| Bombardier de l’éclipse | Apocalypse | 198 / 30.3 / 17 | 60.6 | 5 / 5 | 2 | 14 | 10030 or, 2508 bois, 1204 pierre, 8024 fer, 1505 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 18 |
| Gyrocoptère Ânkh | Division atomique | 135 / 27.8 / 8 | 55.6 | 8 / 4 | 1 | 13 | 4075 or, 1019 bois, 489 pierre, 3260 fer, 612 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 14 |
| Canonnière de Râ | Apocalypse | 195 / 30.3 / 15 | 60.6 | 6 / 4 | 1 | 14 | 6590 or, 1648 bois, 791 pierre, 5272 fer, 989 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 18 |
| Barque du soleil noir | Apocalypse | 298 / 31.4 / 22 | 62.8 | 3 / 5 | 2 | 14 | 11920 or, 2980 bois, 1431 pierre, 9536 fer, 1788 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 18 |
| Rônin chromé | Division atomique | 101 / 28.6 / 10 | 57.2 | 5 / 1 | 1 | 8 | 3195 or, 639 bois, 1278 fer, 959 vivres | 2.1 or, 0.5 vivres | 10 |
| Ashigaru électromagnétique | Apocalypse | 114 / 30.2 / 9 | 60.4 | 4 / 5 | 1 | 9 | 6055 or, 1211 bois, 3633 fer, 1817 vivres | 3.7 or, 0.5 vivres | 17 |
| Garde Oni | Apocalypse | 184 / 31.7 / 20 | 63.4 | 4 / 1 | 1 | 9 | 6195 or, 1239 bois, 3717 fer, 1859 vivres | 3.7 or, 0.5 vivres | 17 |
| Lancier Kirin | Division atomique | 135 / 28.8 / 11 | 57.6 | 7 / 1 | 1 | 16 | 3460 or, 865 bois, 2768 fer, 1904 vivres | 2.8 or, 1.5 fer, 1.3 vivres | 10 |
| Dragon néon | Apocalypse | 170 / 30.4 / 13 | 60.8 | 7 / 3 | 1 | 18 | 6865 or, 1717 bois, 5492 fer, 3776 vivres | 4.4 or, 1.9 fer, 1.4 vivres | 18 |
| Daimyō du tigre d’acier | Apocalypse | 212 / 31.6 / 21 | 63.2 | 6 / 1 | 1 | 18 | 7700 or, 1925 bois, 6160 fer, 4235 vivres | 4.4 or, 1.9 fer, 1.4 vivres | 18 |
| Moto Shinobi | Division atomique | 92 / 27.9 / 6 | 55.8 | 10 / 3 | 1 | 10 | 3015 or, 754 bois, 2412 fer, 453 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 9 |
| Side-car Raijin | Apocalypse | 130 / 30 / 10 | 60 | 8 / 4 | 1 | 11 | 6070 or, 1518 bois, 4856 fer, 911 vivres | 3.9 or, 1.6 fer, 0.7 vivres | 17 |
| Tricycle du shōgun | Apocalypse | 150 / 30.4 / 13 | 60.8 | 7 / 5 | 1 | 11 | 5780 or, 1445 bois, 4624 fer, 867 vivres | 3.9 or, 1.6 fer, 0.7 vivres | 17 |
| Éclaireur Kitsune | Division atomique | 130 / 28.1 / 9 | 56.2 | 9 / 3 | 1 | 10 | 3420 or, 855 bois, 2736 fer, 513 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 9 |
| Blindé Tanuki | Apocalypse | 184 / 30.2 / 16 | 60.4 | 7 / 4 | 1 | 18 | 7460 or, 1865 bois, 5968 fer, 1119 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 17 |
| Chasseur Tengu | Apocalypse | 173 / 30 / 11 | 60 | 7 / 5 | 1 | 18 | 6160 or, 1540 bois, 4928 fer, 924 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 17 |
| Char Tetsubō | Division atomique | 212 / 29.7 / 16 | 59.4 | 5 / 4 | 1 | 16 | 4590 or, 1148 bois, 3672 fer, 689 vivres | 2.8 or, 1.5 fer, 1 vivres | 11 |
| Char Kabuto | Apocalypse | 248 / 31.2 / 21 | 62.4 | 4 / 4 | 1 | 18 | 7255 or, 1814 bois, 5804 fer, 1089 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 17 |
| Forteresse Oni | Apocalypse | 298 / 32 / 24.2 | 64 | 3 / 4 | 2 | 18 | 11405 or, 2852 bois, 9124 fer, 1711 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 17 |
| Railgun Yumi | Division atomique | 120 / 28.8 / 8 | 57.6 | 4 / 6 | 2 | 10 | 3665 or, 917 bois, 2932 fer, 550 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 12 |
| Mortier Taiko | Apocalypse | 149 / 30 / 10 | 60 | 3 / 6 | 2 | 11 | 8320 or, 2080 bois, 6656 fer, 1248 vivres | 3.9 or, 1.6 fer, 0.7 vivres | 18 |
| Batterie Orochi | Apocalypse | 155 / 30.8 / 12 | 61.6 | 3 / 7 | 2 | 11 | 8885 or, 2222 bois, 7108 fer, 1333 vivres | 3.9 or, 1.6 fer, 0.7 vivres | 18 |
| Intercepteur Tsuru | Division atomique | 130 / 28.5 / 8 | 57 | 11 / 4 | 1 | 13 | 4380 or, 1095 bois, 3504 fer, 657 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 10 |
| Avion d’assaut Hayabusa | Apocalypse | 171 / 30.6 / 12 | 61.2 | 9 / 4 | 1 | 14 | 6305 or, 1577 bois, 5044 fer, 946 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 18 |
| Bombardier Yomi | Apocalypse | 193 / 30.4 / 15 | 60.8 | 6 / 5 | 2 | 14 | 9865 or, 2467 bois, 7892 fer, 1480 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 18 |
| Hélicoptère Tonbo | Division atomique | 122 / 28 / 6 | 56 | 9 / 4 | 1 | 13 | 3925 or, 982 bois, 3140 fer, 589 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 14 |
| Canonnière Raijū | Apocalypse | 176 / 30.4 / 13 | 60.8 | 7 / 4 | 1 | 14 | 6320 or, 1580 bois, 5056 fer, 948 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 18 |
| Citadelle volante du shōgun | Apocalypse | 270 / 31.6 / 20 | 63.2 | 4 / 5 | 2 | 14 | 11480 or, 2870 bois, 9184 fer, 1722 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 18 |
| Mousquetaire carmin | Armée médiévale | 43 / 14.8 / 4 | 29.6 | 3 / 3 | 1 | 5 | 185 or, 56 bois, 74 fer, 56 vivres | 0.5 or, 0.3 vivres | 3 |
| Grenadier du calice | Armée médiévale | 51 / 15 / 5 | 30 | 3 / 2 | 1 | 5 | 185 or, 56 bois, 74 fer, 56 vivres | 0.5 or, 0.3 vivres | 3 |
| Piquier de la Cour sanglante | Armée médiévale | 59 / 14.8 / 8 | 29.6 | 3 / 1 | 1 | 5 | 220 or, 66 bois, 88 fer, 66 vivres | 0.5 or, 0.3 vivres | 3 |
| Éclaireur nocturne | Armée médiévale | 46 / 14.2 / 3 | 28.4 | 8 / 1 | 1 | 6 | 170 or, 51 bois, 68 fer, 94 vivres | 0.6 or, 0.7 vivres | 4 |
| Hussard écarlate | Armée médiévale | 67 / 15.6 / 6 | 31.2 | 7 / 1 | 1 | 6 | 215 or, 65 bois, 86 fer, 119 vivres | 0.6 or, 0.7 vivres | 4 |
| Cuirassier du tombeau | Armée médiévale | 70 / 15.8 / 9.7 | 31.6 | 5 / 1 | 1 | 6 | 240 or, 72 bois, 144 fer, 132 vivres | 0.6 or, 0.7 vivres | 4 |
| Canon reliquaire | Armée médiévale | 59 / 15.1 / 5 | 30.2 | 2 / 4 | 2 | 7 | 230 or, 58 bois, 184 fer, 35 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Mortier des lamentations | Armée médiévale | 47 / 14.8 / 4 | 29.6 | 2 / 5 | 2 | 7 | 225 or, 57 bois, 180 fer, 34 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Orgue de la Cour rouge | Armée médiévale | 59 / 15.8 / 4 | 31.6 | 2 / 3 | 1 | 7 | 200 or, 50 bois, 160 fer, 30 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Carrosse de chasse | Armée médiévale | 60 / 14.8 / 5 | 29.6 | 5 / 3 | 1 | 7 | 210 or, 53 bois, 168 fer, 32 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Fourgon funéraire | Armée médiévale | 88 / 15 / 9.9 | 30 | 3 / 2 | 1 | 10 | 255 or, 64 bois, 204 fer, 39 vivres | 0.9 or, 0.4 fer, 0.6 vivres | 2 |
| Ballon du crépuscule | Armée médiévale | 61 / 14.6 / 3 | 29.2 | 3 / 3 | 2 | 10 | 240 or, 60 bois, 192 fer, 36 vivres | 0.9 or, 0.4 fer, 0.6 vivres | 5 |
| Fusilier des veines noires | Guerre industrielle | 77 / 21.2 / 8 | 42.4 | 4 / 4 | 1 | 6 | 625 or, 125 bois, 250 fer, 188 vivres | 0.7 or, 0.4 vivres | 5 |
| Mitrailleur du caveau | Guerre industrielle | 85 / 21.3 / 10 | 42.6 | 3 / 4 | 1 | 6 | 655 or, 131 bois, 262 fer, 197 vivres | 0.7 or, 0.4 vivres | 5 |
| Briseur de cercueils | Guerre industrielle | 66 / 20.6 / 6 | 41.2 | 3 / 4 | 1 | 6 | 515 or, 103 bois, 206 fer, 155 vivres | 0.7 or, 0.4 vivres | 5 |
| Moto funéraire | Guerre industrielle | 73 / 20.4 / 5 | 40.8 | 8 / 3 | 1 | 8 | 580 or, 145 bois, 464 fer, 87 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Side-car des héritiers | Guerre industrielle | 88 / 21 / 8 | 42 | 6 / 4 | 1 | 8 | 660 or, 165 bois, 528 fer, 99 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Dragon sanguinaire | Guerre industrielle | 98 / 21.5 / 9 | 43 | 6 / 3 | 1 | 7 | 665 or, 133 bois, 266 fer, 366 vivres | 0.8 or, 0.7 vivres | 6 |
| Char Nosferatu | Guerre industrielle | 128 / 21.5 / 13 | 43 | 5 / 4 | 1 | 12 | 825 or, 207 bois, 660 fer, 124 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 8 |
| Char du sépulcre | Guerre industrielle | 137 / 21.9 / 14 | 43.8 | 3 / 4 | 1 | 12 | 845 or, 212 bois, 676 fer, 127 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 8 |
| Obusier des martyrs | Guerre industrielle | 70 / 21.1 / 8 | 42.2 | 2 / 6 | 2 | 8 | 725 or, 182 bois, 580 fer, 109 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| DCA des gargouilles | Guerre industrielle | 69 / 20.7 / 8 | 41.4 | 3 / 5 | 1 | 8 | 570 or, 143 bois, 456 fer, 86 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Chasseur chauve-souris | Guerre industrielle | 91 / 20.9 / 7 | 41.8 | 9 / 4 | 1 | 11 | 835 or, 209 bois, 668 fer, 126 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 9 |
| Bombardier du dernier bal | Guerre industrielle | 111 / 21.1 / 9 | 42.2 | 6 / 4 | 2 | 11 | 860 or, 215 bois, 688 fer, 129 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 9 |
| Fusilier naufragé | Armée médiévale | 48 / 14.8 / 4 | 29.6 | 3 / 3 | 1 | 5 | 185 or, 56 bois, 74 fer, 56 vivres | 0.5 or, 0.3 vivres | 3 |
| Grenadier des épaves | Armée médiévale | 56 / 15 / 5 | 30 | 3 / 2 | 1 | 5 | 190 or, 57 bois, 76 fer, 57 vivres | 0.5 or, 0.3 vivres | 3 |
| Piquier des profondeurs | Armée médiévale | 60 / 14.6 / 8 | 29.2 | 3 / 1 | 1 | 5 | 220 or, 66 bois, 88 fer, 66 vivres | 0.5 or, 0.3 vivres | 3 |
| Éclaireur des grèves | Armée médiévale | 51 / 14.2 / 3 | 28.4 | 8 / 1 | 1 | 6 | 175 or, 53 bois, 70 fer, 97 vivres | 0.6 or, 0.7 vivres | 4 |
| Lancier des marées | Armée médiévale | 68 / 15.3 / 6 | 30.6 | 7 / 1 | 1 | 6 | 215 or, 65 bois, 86 fer, 119 vivres | 0.6 or, 0.7 vivres | 4 |
| Cuirassier du récif | Armée médiévale | 71 / 15.6 / 9.7 | 31.2 | 5 / 1 | 1 | 6 | 240 or, 72 bois, 144 fer, 132 vivres | 0.6 or, 0.7 vivres | 4 |
| Canon du Kraken | Armée médiévale | 60 / 15.1 / 5 | 30.2 | 2 / 4 | 2 | 7 | 230 or, 58 bois, 184 fer, 35 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Mortier des fosses | Armée médiévale | 48 / 14.8 / 4 | 29.6 | 2 / 5 | 2 | 7 | 225 or, 57 bois, 180 fer, 34 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Orgue des naufrages | Armée médiévale | 60 / 15.8 / 4 | 31.6 | 2 / 3 | 1 | 7 | 200 or, 50 bois, 160 fer, 30 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Attelage des contrebandiers | Armée médiévale | 61 / 14.8 / 5 | 29.6 | 5 / 3 | 1 | 7 | 210 or, 53 bois, 168 fer, 32 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Fourgon du bathyscaphe | Armée médiévale | 89 / 15 / 9.9 | 30 | 3 / 2 | 1 | 10 | 255 or, 64 bois, 204 fer, 39 vivres | 0.9 or, 0.4 fer, 0.6 vivres | 2 |
| Ballon des brumes salées | Armée médiévale | 66 / 14.6 / 3 | 29.2 | 3 / 3 | 2 | 10 | 245 or, 62 bois, 196 fer, 37 vivres | 0.9 or, 0.4 fer, 0.6 vivres | 5 |
| Commando scaphandrier | Guerre industrielle | 82 / 21 / 8 | 42 | 4 / 4 | 1 | 6 | 630 or, 126 bois, 252 fer, 189 vivres | 0.7 or, 0.4 vivres | 5 |
| Mitrailleur du Léviathan | Guerre industrielle | 86 / 21.3 / 10 | 42.6 | 3 / 4 | 1 | 6 | 660 or, 132 bois, 264 fer, 198 vivres | 0.7 or, 0.4 vivres | 5 |
| Harponneur antichar | Guerre industrielle | 71 / 20.6 / 6 | 41.2 | 3 / 4 | 1 | 6 | 525 or, 105 bois, 210 fer, 158 vivres | 0.7 or, 0.4 vivres | 5 |
| Moto des embruns | Guerre industrielle | 78 / 20.4 / 5 | 40.8 | 8 / 3 | 1 | 8 | 585 or, 147 bois, 468 fer, 88 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Side-car des épaves | Guerre industrielle | 89 / 21 / 8 | 42 | 6 / 4 | 1 | 8 | 660 or, 165 bois, 528 fer, 99 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Dragon des récifs | Guerre industrielle | 99 / 21.2 / 9 | 42.4 | 6 / 3 | 1 | 7 | 665 or, 133 bois, 266 fer, 366 vivres | 0.8 or, 0.7 vivres | 6 |
| Blindé des marées | Guerre industrielle | 129 / 21.5 / 13 | 43 | 5 / 4 | 1 | 12 | 830 or, 208 bois, 664 fer, 125 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 8 |
| Char Léviathan | Guerre industrielle | 138 / 21.9 / 14 | 43.8 | 3 / 4 | 1 | 12 | 845 or, 212 bois, 676 fer, 127 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 8 |
| Obusier du gouffre | Guerre industrielle | 71 / 21.1 / 8 | 42.2 | 2 / 6 | 2 | 8 | 725 or, 182 bois, 580 fer, 109 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| DCA des abysses | Guerre industrielle | 70 / 20.7 / 8 | 41.4 | 3 / 5 | 1 | 8 | 575 or, 144 bois, 460 fer, 87 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Chasseur Pétrel | Guerre industrielle | 96 / 20.9 / 7 | 41.8 | 9 / 4 | 1 | 11 | 845 or, 212 bois, 676 fer, 127 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 9 |
| Bombardier Albatros | Guerre industrielle | 112 / 21.1 / 9 | 42.2 | 6 / 4 | 2 | 11 | 865 or, 217 bois, 692 fer, 130 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 9 |
| Arquebusier des bois noirs | Armée médiévale | 36 / 14.8 / 3 | 29.6 | 4 / 3 | 1 | 5 | 175 or, 53 bois, 70 fer, 53 vivres | 0.5 or, 0.3 vivres | 3 |
| Grenadier des spores | Armée médiévale | 43 / 15 / 4 | 30 | 4 / 2 | 1 | 5 | 175 or, 53 bois, 70 fer, 53 vivres | 0.5 or, 0.3 vivres | 3 |
| Piquier des épines | Armée médiévale | 56 / 14.6 / 7 | 29.2 | 4 / 1 | 1 | 5 | 215 or, 65 bois, 86 fer, 65 vivres | 0.5 or, 0.3 vivres | 3 |
| Éclaireur des clairières | Armée médiévale | 39 / 14.2 / 2 | 28.4 | 9 / 1 | 1 | 6 | 165 or, 50 bois, 66 fer, 91 vivres | 0.6 or, 0.7 vivres | 4 |
| Lancier au cerf maudit | Armée médiévale | 58 / 15.3 / 5 | 30.6 | 8 / 1 | 1 | 6 | 205 or, 62 bois, 82 fer, 113 vivres | 0.6 or, 0.7 vivres | 4 |
| Cuirassier des ramures | Armée médiévale | 68 / 15.6 / 9 | 31.2 | 6 / 1 | 1 | 6 | 235 or, 71 bois, 141 fer, 130 vivres | 0.6 or, 0.7 vivres | 4 |
| Couleuvrine de ronces | Armée médiévale | 58 / 15.1 / 4 | 30.2 | 2 / 4 | 2 | 7 | 220 or, 55 bois, 176 fer, 33 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Mortier des souches | Armée médiévale | 45 / 14.8 / 3 | 29.6 | 2 / 5 | 2 | 7 | 215 or, 54 bois, 172 fer, 33 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Orgue des épines | Armée médiévale | 54 / 15.8 / 3 | 31.6 | 3 / 3 | 1 | 7 | 190 or, 48 bois, 152 fer, 29 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Chariot des sorcières | Armée médiévale | 58 / 14.8 / 4 | 29.6 | 6 / 3 | 1 | 7 | 205 or, 52 bois, 164 fer, 31 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Fourgon des racines | Armée médiévale | 83 / 15 / 9.7 | 30 | 4 / 2 | 1 | 10 | 255 or, 64 bois, 204 fer, 39 vivres | 0.9 or, 0.4 fer, 0.6 vivres | 2 |
| Ballon de la chasse sauvage | Armée médiévale | 52 / 14.6 / 2 | 29.2 | 3 / 3 | 2 | 10 | 230 or, 58 bois, 184 fer, 35 vivres | 0.9 or, 0.4 fer, 0.6 vivres | 5 |
| Tireur des brumes | Guerre industrielle | 67 / 21 / 7 | 42 | 5 / 4 | 1 | 6 | 600 or, 120 bois, 240 fer, 180 vivres | 0.7 or, 0.4 vivres | 5 |
| Mitrailleur des halliers | Guerre industrielle | 79 / 21.3 / 9 | 42.6 | 4 / 4 | 1 | 6 | 640 or, 128 bois, 256 fer, 192 vivres | 0.7 or, 0.4 vivres | 5 |
| Briseur de sève | Guerre industrielle | 57 / 20.6 / 5 | 41.2 | 4 / 4 | 1 | 6 | 500 or, 100 bois, 200 fer, 150 vivres | 0.7 or, 0.4 vivres | 5 |
| Moto aux racines | Guerre industrielle | 63 / 20.4 / 4 | 40.8 | 9 / 3 | 1 | 8 | 555 or, 139 bois, 444 fer, 84 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Side-car des sous-bois | Guerre industrielle | 85 / 21 / 7 | 42 | 7 / 4 | 1 | 8 | 650 or, 163 bois, 520 fer, 98 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Dragon des futaies | Guerre industrielle | 90 / 21.2 / 8 | 42.4 | 7 / 3 | 1 | 7 | 645 or, 129 bois, 258 fer, 355 vivres | 0.8 or, 0.7 vivres | 6 |
| Char des taillis | Guerre industrielle | 122 / 21.5 / 12 | 43 | 6 / 4 | 1 | 12 | 810 or, 203 bois, 648 fer, 122 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 8 |
| Char sylvestre | Guerre industrielle | 133 / 21.9 / 13.8 | 43.8 | 3 / 4 | 1 | 12 | 835 or, 209 bois, 668 fer, 126 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 8 |
| Obusier des ronces | Guerre industrielle | 67 / 21.1 / 7 | 42.2 | 2 / 6 | 2 | 8 | 705 or, 177 bois, 564 fer, 106 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| DCA des corbeaux | Guerre industrielle | 67 / 20.7 / 7 | 41.4 | 4 / 5 | 1 | 8 | 565 or, 142 bois, 452 fer, 85 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Chasseur de la canopée | Guerre industrielle | 79 / 20.9 / 6 | 41.8 | 10 / 4 | 1 | 11 | 810 or, 203 bois, 648 fer, 122 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 9 |
| Bombardier des spores | Guerre industrielle | 107 / 21.1 / 8 | 42.2 | 7 / 4 | 2 | 11 | 850 or, 213 bois, 680 fer, 128 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 9 |
| Chasseur polaire | Armée médiévale | 44 / 14.8 / 6 | 29.6 | 3 / 3 | 1 | 5 | 195 or, 59 bois, 78 fer, 59 vivres | 0.5 or, 0.3 vivres | 3 |
| Grenadier des congères | Armée médiévale | 53 / 15 / 7 | 30 | 3 / 2 | 1 | 5 | 195 or, 59 bois, 78 fer, 59 vivres | 0.5 or, 0.3 vivres | 3 |
| Piquier du gel noir | Armée médiévale | 60 / 14.6 / 8.4 | 29.2 | 3 / 1 | 1 | 5 | 225 or, 68 bois, 90 fer, 68 vivres | 0.5 or, 0.3 vivres | 3 |
| Éclaireur des blizzards | Armée médiévale | 47 / 14.2 / 5 | 28.4 | 7 / 1 | 1 | 6 | 180 or, 54 bois, 72 fer, 100 vivres | 0.6 or, 0.7 vivres | 4 |
| Lancier sur loup | Armée médiévale | 67 / 15.3 / 8 | 30.6 | 6 / 1 | 1 | 6 | 220 or, 66 bois, 88 fer, 122 vivres | 0.6 or, 0.7 vivres | 4 |
| Cuirassier du grand hiver | Armée médiévale | 71 / 15.6 / 10.1 | 31.2 | 5 / 1 | 1 | 6 | 240 or, 72 bois, 144 fer, 132 vivres | 0.6 or, 0.7 vivres | 4 |
| Canon de l’hiver | Armée médiévale | 60 / 15.1 / 7 | 30.2 | 2 / 4 | 2 | 7 | 240 or, 60 bois, 192 fer, 36 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Mortier des glaces | Armée médiévale | 47 / 14.8 / 6 | 29.6 | 2 / 5 | 2 | 7 | 235 or, 59 bois, 188 fer, 36 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Orgue des avalanches | Armée médiévale | 59 / 15.8 / 6 | 31.6 | 2 / 3 | 1 | 7 | 210 or, 53 bois, 168 fer, 32 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Traîneau de guerre | Armée médiévale | 60 / 14.8 / 7 | 29.6 | 5 / 3 | 1 | 7 | 220 or, 55 bois, 176 fer, 33 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Fourgon des banquises | Armée médiévale | 89 / 15 / 10.3 | 30 | 3 / 2 | 1 | 10 | 260 or, 65 bois, 208 fer, 39 vivres | 0.9 or, 0.4 fer, 0.6 vivres | 2 |
| Ballon de l’aurore | Armée médiévale | 64 / 14.6 / 5 | 29.2 | 3 / 3 | 2 | 10 | 255 or, 64 bois, 204 fer, 39 vivres | 0.9 or, 0.4 fer, 0.6 vivres | 5 |
| Fantassin du pergélisol | Guerre industrielle | 81 / 21 / 10 | 42 | 4 / 4 | 1 | 6 | 655 or, 131 bois, 262 fer, 197 vivres | 0.7 or, 0.4 vivres | 5 |
| Mitrailleur du bunker gelé | Guerre industrielle | 87 / 21.3 / 11.2 | 42.6 | 3 / 4 | 1 | 6 | 675 or, 135 bois, 270 fer, 203 vivres | 0.7 or, 0.4 vivres | 5 |
| Briseur de glaciers | Guerre industrielle | 69 / 20.6 / 8 | 41.2 | 3 / 4 | 1 | 6 | 540 or, 108 bois, 216 fer, 162 vivres | 0.7 or, 0.4 vivres | 5 |
| Moto chenillée | Guerre industrielle | 77 / 20.4 / 7 | 40.8 | 7 / 3 | 1 | 8 | 600 or, 150 bois, 480 fer, 90 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Side-car du blizzard | Guerre industrielle | 89 / 21 / 10 | 42 | 6 / 4 | 1 | 8 | 685 or, 172 bois, 548 fer, 103 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Dragon des neiges | Guerre industrielle | 99 / 21.2 / 11 | 42.4 | 5 / 3 | 1 | 7 | 680 or, 136 bois, 272 fer, 375 vivres | 0.8 or, 0.7 vivres | 6 |
| Char de la toundra | Guerre industrielle | 130 / 21.5 / 13.6 | 43 | 5 / 4 | 1 | 12 | 835 or, 209 bois, 668 fer, 126 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 8 |
| Char brise-glace | Guerre industrielle | 140 / 21.9 / 14.4 | 43.8 | 3 / 4 | 1 | 12 | 855 or, 214 bois, 684 fer, 129 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 8 |
| Obusier des avalanches | Guerre industrielle | 71 / 21.1 / 10 | 42.2 | 2 / 6 | 2 | 8 | 750 or, 188 bois, 600 fer, 113 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| DCA de l’aurore | Guerre industrielle | 70 / 20.7 / 10 | 41.4 | 3 / 5 | 1 | 8 | 590 or, 148 bois, 472 fer, 89 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 7 |
| Chasseur du blizzard | Guerre industrielle | 97 / 20.9 / 9 | 41.8 | 9 / 4 | 1 | 11 | 870 or, 218 bois, 696 fer, 131 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 9 |
| Bombardier Boréal | Guerre industrielle | 113 / 21.1 / 11 | 42.2 | 6 / 4 | 2 | 11 | 890 or, 223 bois, 712 fer, 134 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 9 |
| Hallebardier des remparts | Fondations | 42 / 10 / 5 | 20 | 3 / 1 | 1 | 5 | 45 or, 25 bois, 20 fer, 25 vivres | 0.2 or, 0.3 vivres | 1 |
| Archer des longues ombres | Fondations | 25 / 11 / 2 | 22 | 3 / 4 | 1 | 5 | 50 or, 50 bois, 10 fer, 20 vivres | 0.2 or, 0.3 vivres | 1 |
| Éclaireur des landes | Fondations | 32 / 7 / 2 | 14 | 8 / 1 | 1 | 5 | 65 or, 20 bois, 10 fer, 50 vivres | 0.2 or, 0.7 vivres | 2 |
| Chariot de guerre | Fondations | 62 / 12 / 7 | 24 | 3 / 2 | 1 | 8 | 90 or, 100 bois, 35 fer, 30 vivres | 0.4 or, 0.5 fer, 0.3 vivres | 2 |
| Piquier de la Cour noire | Armée médiévale | 58 / 14.7 / 8 | 29.4 | 3 / 1 | 1 | 5 | 220 or, 66 bois, 88 fer, 66 vivres | 0.5 or, 0.3 vivres | 3 |
| Dragon de l’Empire noir | Armée médiévale | 66 / 15 / 6 | 30 | 6 / 3 | 1 | 6 | 225 or, 68 bois, 90 fer, 124 vivres | 0.6 or, 0.7 vivres | 4 |
| Canon impérial | Armée médiévale | 60 / 14.6 / 5 | 29.2 | 2 / 4 | 2 | 7 | 225 or, 57 bois, 180 fer, 34 vivres | 0.7 or, 0.3 fer, 0.4 vivres | 2 |
| Aérostat des augures | Armée médiévale | 55 / 14.1 / 3 | 28.2 | 4 / 3 | 2 | 10 | 235 or, 59 bois, 188 fer, 36 vivres | 0.9 or, 0.4 fer, 0.6 vivres | 5 |
| Sapeur des tranchées | Guerre industrielle | 72 / 20.6 / 7 | 41.2 | 3 / 2 | 2 | 7 | 605 or, 121 bois, 242 fer, 182 vivres | 0.8 or, 0.4 vivres | 5 |
| Lance-flammes des cendres | Guerre industrielle | 82 / 21.3 / 8 | 42.6 | 3 / 2 | 1 | 6 | 575 or, 115 bois, 230 fer, 173 vivres | 0.7 or, 0.4 vivres | 5 |
| Chasseur de chars funéraire | Guerre industrielle | 128 / 20.7 / 13 | 41.4 | 4 / 4 | 1 | 12 | 725 or, 182 bois, 580 fer, 109 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 8 |
| Bombardier des corbeaux | Guerre industrielle | 100 / 21.1 / 7 | 42.2 | 8 / 3 | 2 | 11 | 805 or, 202 bois, 644 fer, 121 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 9 |
| Tireur électromagnétique | Guerre occulte | 78 / 26.7 / 6 | 53.4 | 3 / 6 | 1 | 7 | 1650 or, 330 bois, 660 fer, 495 vivres | 1.3 or, 0.4 vivres | 9 |
| Moto spectre | Guerre occulte | 112 / 25.9 / 11 | 51.8 | 9 / 4 | 1 | 9 | 1885 or, 472 bois, 1508 fer, 283 vivres | 1.5 or, 1 fer, 0.5 vivres | 5 |
| Blindé lance-missiles | Guerre occulte | 183 / 26.9 / 16.8 | 53.8 | 4 / 6 | 2 | 14 | 2780 or, 695 bois, 2224 fer, 417 vivres | 1.9 or, 1.2 fer, 0.8 vivres | 9 |
| Intercepteur de minuit | Guerre occulte | 118 / 26.1 / 10 | 52.2 | 12 / 5 | 1 | 12 | 2380 or, 595 bois, 1904 fer, 357 vivres | 1.7 or, 1.1 fer, 0.7 vivres | 9 |
| Cuirassé du réacteur | Apocalypse | 270 / 31.8 / 24 | 63.6 | 3 / 5 | 2 | 18 | 11145 or, 2787 bois, 8916 fer, 1672 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 15 |
| Intercepteur gamma | Apocalypse | 175 / 30.5 / 15 | 61 | 12 / 5 | 1 | 14 | 8905 or, 2227 bois, 7124 fer, 1336 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 17 |
| Mortier à neutrons | Apocalypse | 118 / 29.2 / 10 | 58.4 | 2 / 7 | 2 | 11 | 8040 or, 2010 bois, 6432 fer, 1206 vivres | 3.9 or, 1.6 fer, 0.7 vivres | 16 |
| Séraphin du réacteur | Apocalypse | 230 / 31.5 / 17 | 63 | 7 / 3 | 2 | 14 | 10150 or, 2030 bois, 4060 fer, 3045 vivres | 4.1 or, 0.8 vivres | 19 |
| Mousquetaire impérial | Armée médiévale | 38 / 14.8 / 4 | 29.6 | 3 / 3 | 1 | 5 | 180 or, 54 bois, 72 fer, 54 vivres | 0.5 or, 0.3 vivres | 3 |
| Grenadier des cendres | Armée médiévale | 48 / 15.1 / 5 | 30.2 | 3 / 2 | 1 | 5 | 180 or, 54 bois, 72 fer, 54 vivres | 0.5 or, 0.3 vivres | 3 |
| Cuirassier du crépuscule | Armée médiévale | 67 / 15.5 / 8 | 31 | 6 / 1 | 1 | 6 | 230 or, 69 bois, 138 fer, 127 vivres | 0.6 or, 0.7 vivres | 4 |
| Commando de l’éclipse | Guerre occulte | 100 / 26.2 / 11 | 52.4 | 5 / 4 | 1 | 7 | 1770 or, 354 bois, 708 fer, 531 vivres | 1.3 or, 0.4 vivres | 3 |
| Escouade de drones spectres | Guerre occulte | 86 / 26 / 8 | 52 | 4 / 5 | 1 | 9 | 1670 or, 418 bois, 1336 fer, 251 vivres | 1.5 or, 1 fer, 0.5 vivres | 6 |
| Garde à neutrons | Apocalypse | 180 / 31.3 / 18 | 62.6 | 3 / 4 | 1 | 9 | 7445 or, 1489 bois, 4467 fer, 2234 vivres | 3.7 or, 0.5 vivres | 12 |
| Héros | Civil | 80 / 0 / 6 | 0 | 6 / 0 | — | 0 | — | — | 0 |
| Grenadier au radium | Division atomique | 87 / 27.4 / 8 | 54.8 | 3 / 3 | 1 | 8 | 2825 or, 565 bois, 1130 fer, 848 vivres | 2.1 or, 0.5 vivres | 12 |
| Sentinelle de cobalt | Division atomique | 112 / 27.1 / 15 | 54.2 | 2 / 2 | 1 | 8 | 3190 or, 638 bois, 1276 fer, 957 vivres | 2.1 or, 0.5 vivres | 13 |
| Tireur isotopique | Division atomique | 66 / 28.3 / 5 | 56.6 | 3 / 6 | 1 | 8 | 2910 or, 582 bois, 1164 fer, 873 vivres | 2.1 or, 0.5 vivres | 12 |
| Sapeur atomique | Division atomique | 88 / 27 / 8 | 54 | 2 / 3 | 2 | 9 | 3575 or, 715 bois, 1430 fer, 1073 vivres | 2.2 or, 0.5 vivres | 12 |
| Exécuteur blafard | Apocalypse | 135 / 29.6 / 12 | 59.2 | 2 / 1 | 1 | 9 | 5365 or, 1073 bois, 2146 fer, 1610 vivres | 3.7 or, 0.5 vivres | 16 |
| Templier gamma | Apocalypse | 113 / 29.1 / 12 | 58.2 | 3 / 4 | 1 | 9 | 4725 or, 945 bois, 1890 fer, 1418 vivres | 3.7 or, 0.5 vivres | 16 |
| Hussard au radium | Division atomique | 100 / 27.6 / 8 | 55.2 | 6 / 1 | 1 | 9 | 2795 or, 559 bois, 1118 fer, 1538 vivres | 2.2 or, 0.8 vivres | 13 |
| Lancier isotopique | Division atomique | 103 / 28.2 / 8 | 56.4 | 5 / 1 | 1 | 9 | 2815 or, 563 bois, 1126 fer, 1549 vivres | 2.2 or, 0.8 vivres | 13 |
| Cuirassier de cobalt | Division atomique | 138 / 27.6 / 16 | 55.2 | 4 / 1 | 1 | 9 | 3405 or, 681 bois, 1362 fer, 1873 vivres | 2.2 or, 0.8 vivres | 13 |
| Dragon des cendres | Division atomique | 100 / 27.5 / 8 | 55 | 5 / 4 | 1 | 9 | 3105 or, 621 bois, 1242 fer, 1708 vivres | 2.2 or, 0.8 vivres | 13 |
| Éclaireur blafard | Division atomique | 98 / 27.2 / 6 | 54.4 | 7 / 3 | 1 | 9 | 2925 or, 585 bois, 1170 fer, 1609 vivres | 2.2 or, 0.8 vivres | 17 |
| Paladin gamma | Apocalypse | 140 / 38 / 14 | 76 | 4 / 1 | 1 | 12 | 10080 or, 900 bois, 4500 fer, 2520 vivres | 2.5 or, 0.7 vivres | 16 |
| Estafette au radium | Division atomique | 86 / 27 / 6 | 54 | 9 / 3 | 1 | 10 | 2895 or, 724 bois, 2316 fer, 435 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 13 |
| Moto d’assaut isotopique | Division atomique | 90 / 27.8 / 8 | 55.6 | 7 / 3 | 1 | 10 | 2995 or, 749 bois, 2396 fer, 450 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 13 |
| Side-car de cobalt | Division atomique | 110 / 27.4 / 14 | 54.8 | 5 / 3 | 1 | 10 | 3350 or, 838 bois, 2680 fer, 503 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 13 |
| Chasseur blafard motorisé | Division atomique | 72 / 28.4 / 6 | 56.8 | 7 / 5 | 1 | 10 | 3025 or, 757 bois, 2420 fer, 454 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 13 |
| Tricycle gamma | Division atomique | 90 / 27 / 8 | 54 | 6 / 5 | 1 | 10 | 2835 or, 709 bois, 2268 fer, 426 vivres | 2.3 or, 1.3 fer, 0.6 vivres | 13 |
| Moto de l’Apocalypse | Apocalypse | 114 / 28.9 / 10 | 57.8 | 5 / 4 | 2 | 11 | 7465 or, 1867 bois, 5972 fer, 1120 vivres | 3.9 or, 1.6 fer, 0.7 vivres | 13 |
| Automitrailleuse au radium | Division atomique | 130 / 27.4 / 10 | 54.8 | 7 / 4 | 1 | 16 | 3645 or, 912 bois, 2916 fer, 547 vivres | 2.8 or, 1.5 fer, 1 vivres | 13 |
| Semi-chenillé de cobalt | Division atomique | 142 / 28 / 14 | 56 | 4 / 3 | 1 | 16 | 3750 or, 938 bois, 3000 fer, 563 vivres | 2.8 or, 1.5 fer, 1 vivres | 14 |
| Chasseur de chars isotopique | Division atomique | 133 / 28.2 / 10 | 56.4 | 3 / 5 | 1 | 16 | 3230 or, 808 bois, 2584 fer, 485 vivres | 2.8 or, 1.5 fer, 1 vivres | 14 |
| Char Mausolée | Apocalypse | 220 / 29.6 / 18 | 59.2 | 2 / 3 | 1 | 18 | 7550 or, 1888 bois, 6040 fer, 1133 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 15 |
| Chenillé Flak gamma | Division atomique | 134 / 27 / 12 | 54 | 3 / 6 | 1 | 16 | 3485 or, 872 bois, 2788 fer, 523 vivres | 2.8 or, 1.5 fer, 1 vivres | 16 |
| Chenillé de l’Apocalypse | Apocalypse | 170 / 29.2 / 12 | 58.4 | 2 / 6 | 2 | 18 | 8855 or, 2214 bois, 7084 fer, 1329 vivres | 4.4 or, 1.9 fer, 1.1 vivres | 15 |
| Épervier au radium | Division atomique | 105 / 19 / 6 | 38 | 12 / 3 | 1 | 13 | 3065 or, 767 bois, 2452 fer, 460 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 15 |
| Intercepteur isotopique | Division atomique | 109 / 27.7 / 8 | 55.4 | 10 / 4 | 1 | 13 | 4015 or, 1004 bois, 3212 fer, 603 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 15 |
| Avion d’assaut cobalt | Division atomique | 135 / 28.6 / 14 | 57.2 | 6 / 3 | 1 | 13 | 4120 or, 1030 bois, 3296 fer, 618 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 15 |
| Chasseur nocturne blafard | Division atomique | 85 / 28.2 / 8 | 56.4 | 8 / 5 | 1 | 13 | 3775 or, 944 bois, 3020 fer, 567 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 15 |
| Bombardier gamma | Division atomique | 140 / 27.6 / 10 | 55.2 | 5 / 4 | 2 | 13 | 4630 or, 1158 bois, 3704 fer, 695 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 17 |
| Aile de l’Apocalypse | Apocalypse | 180 / 29.6 / 14 | 59.2 | 4 / 5 | 2 | 14 | 9370 or, 2343 bois, 7496 fer, 1406 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 18 |
| Autogire au radium | Division atomique | 106 / 27 / 6 | 54 | 9 / 3 | 1 | 13 | 3370 or, 843 bois, 2696 fer, 506 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 15 |
| Hélicoptère isotopique | Division atomique | 110 / 28 / 8 | 56 | 7 / 4 | 1 | 13 | 3595 or, 899 bois, 2876 fer, 540 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 15 |
| Canonnière cobalt | Division atomique | 145 / 28.6 / 16 | 57.2 | 4 / 3 | 1 | 13 | 4225 or, 1057 bois, 3380 fer, 634 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 15 |
| Hélicoptère Chasseur blafard | Division atomique | 86 / 28.6 / 6 | 57.2 | 6 / 5 | 1 | 13 | 3430 or, 858 bois, 2744 fer, 515 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 15 |
| Hélicoptère Flak gamma | Division atomique | 105 / 27.1 / 10 | 54.2 | 6 / 5 | 1 | 13 | 4175 or, 1044 bois, 3340 fer, 627 vivres | 2.5 or, 1.4 fer, 0.8 vivres | 17 |
| Hélicoptère de l’Apocalypse | Apocalypse | 165 / 29.4 / 12 | 58.8 | 4 / 4 | 2 | 14 | 8810 or, 2203 bois, 7048 fer, 1322 vivres | 4.1 or, 1.8 fer, 0.8 vivres | 17 |
| Die Glocke I — Vril | Projet Glocke | 200 / 52 / 10 | 104 | 5 / 4 | 2 | 18 | 27000 or, 3000 bois, 16500 fer, 2250 vivres | 6.4 or, 2.2 fer, 1.1 vivres | 18 |
| Die Glocke II — Nacht | Projet Glocke | 260 / 60 / 14 | 120 | 4 / 5 | 2 | 22 | 39000 or, 4200 bois, 24000 fer, 3000 vivres | 6.8 or, 2.4 fer, 1.3 vivres | 18 |
| Die Glocke III — Götterdämmerung | Projet Glocke | 320 / 64 / 16 | 128 | 3 / 6 | 2 | 26 | 57000 or, 5400 bois, 36000 fer, 3900 vivres | 7.1 or, 2.5 fer, 1.6 vivres | 18 |
| Terrassier arcanique | Fondations | 28 / 0 / 4 | 0 | 3 / 1 | — | 5 | 60 or, 35 bois, 30 fer, 20 vivres | 0.2 or, 0.3 vivres | 1 |
| Avion de reconnaissance | Guerre industrielle | 55 / 6 / 2 | 12 | 10 / 2 | 1 | 11 | 405 or, 102 bois, 324 fer, 61 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 4 |
| Chasseur Nachtjäger | Guerre industrielle | 62 / 20.9 / 5 | 41.8 | 8 / 3 | 1 | 11 | 655 or, 164 bois, 524 fer, 99 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 8 |
| Bombardier funèbre | Guerre industrielle | 78 / 20.1 / 5 | 40.2 | 5 / 3 | 2 | 11 | 710 or, 178 bois, 568 fer, 107 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 9 |
| Dirigeable de guerre | Guerre industrielle | 108 / 20.6 / 8 | 41.2 | 4 / 4 | 2 | 11 | 825 or, 207 bois, 660 fer, 124 vivres | 1.1 or, 0.7 fer, 0.7 vivres | 10 |
| Dragon du Reich noir | Guerre occulte | 150 / 25.8 / 12 | 51.6 | 5 / 2 | 2 | 12 | 2335 or, 467 bois, 934 fer, 701 vivres | 1.7 or, 2 vivres | 13 |
| Canon antiaérien Flak | Guerre industrielle | 54 / 12 / 5 | 24 | 2 / 5 | 1 | 8 | 430 or, 108 bois, 344 fer, 65 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 6 |
| Voltigeur Tesla | Guerre occulte | 65 / 24.6 / 6 | 49.2 | 2 / 3 | 1 | 7 | 1330 or, 266 bois, 532 fer, 399 vivres | 1.3 or, 0.4 vivres | 7 |
| Chasseur de maléfices | Guerre occulte | 63 / 24.5 / 4 | 49 | 4 / 3 | 1 | 7 | 1300 or, 260 bois, 520 fer, 390 vivres | 1.3 or, 0.4 vivres | 9 |
| Médecin de la peste | Civil | 28 / 4 / 4 | 8 | 3 / 1 | 1 | 5 | 85 or, 20 bois, 20 fer, 35 vivres | 0.3 or, 0.3 vivres | 3 |
| Grenadier revenant | Guerre occulte | 67 / 24.4 / 7 | 48.8 | 2 / 2 | 1 | 7 | 1295 or, 259 bois, 518 fer, 389 vivres | 1.3 or, 0.4 vivres | 9 |
| Cavalier spectral | Guerre occulte | 76 / 24.8 / 7 | 49.6 | 5 / 1 | 1 | 8 | 1335 or, 267 bois, 534 fer, 735 vivres | 1.4 or, 0.8 vivres | 9 |
| Marcheur de siège | Guerre occulte | 104 / 24.9 / 10 | 49.8 | 2 / 4 | 2 | 14 | 2050 or, 513 bois, 1640 fer, 308 vivres | 1.9 or, 1.2 fer, 0.8 vivres | 10 |
| Char possédé | Guerre occulte | 140 / 25.6 / 15 | 51.2 | 2 / 3 | 1 | 14 | 2000 or, 500 bois, 1600 fer, 300 vivres | 1.9 or, 1.2 fer, 0.8 vivres | 10 |
| Section de mortier | Guerre industrielle | 35 / 19.7 / 2 | 39.4 | 2 / 5 | 2 | 7 | 540 or, 108 bois, 216 fer, 162 vivres | 0.8 or, 0.4 vivres | 6 |
| Fusilier | Guerre industrielle | 46 / 19.4 / 4 | 38.8 | 3 / 4 | 1 | 6 | 495 or, 99 bois, 198 fer, 149 vivres | 0.7 or, 0.4 vivres | 4 |
| Soldat d’assaut | Guerre industrielle | 48 / 20 / 6 | 40 | 3 / 2 | 1 | 6 | 475 or, 95 bois, 190 fer, 143 vivres | 0.7 or, 0.4 vivres | 4 |
| Mitrailleur | Guerre industrielle | 47 / 20.3 / 4 | 40.6 | 2 / 4 | 1 | 6 | 500 or, 100 bois, 200 fer, 150 vivres | 0.7 or, 0.4 vivres | 5 |
| Tireur des brumes | Guerre industrielle | 35 / 20.6 / 2 | 41.2 | 3 / 6 | 1 | 6 | 520 or, 104 bois, 208 fer, 156 vivres | 0.7 or, 0.4 vivres | 5 |
| Chasseur de blindés | Guerre industrielle | 46 / 12 / 3 | 24 | 2 / 4 | 1 | 6 | 380 or, 76 bois, 152 fer, 114 vivres | 0.7 or, 0.4 vivres | 5 |
| Officier au sabre | Guerre industrielle | 48 / 19.7 / 6 | 39.4 | 4 / 2 | 1 | 6 | 480 or, 96 bois, 192 fer, 144 vivres | 0.7 or, 0.4 vivres | 4 |
| Moto de reconnaissance | Guerre industrielle | 46 / 12 / 3 | 24 | 8 / 2 | 1 | 8 | 380 or, 95 bois, 304 fer, 57 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 2 |
| Automitrailleuse | Guerre industrielle | 72 / 20.1 / 7 | 40.2 | 6 / 3 | 1 | 12 | 620 or, 155 bois, 496 fer, 93 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 4 |
| Char de rupture | Guerre industrielle | 110 / 21 / 12 | 42 | 3 / 4 | 1 | 12 | 760 or, 190 bois, 608 fer, 114 vivres | 1.2 or, 0.8 fer, 0.7 vivres | 8 |
| Canon de campagne | Guerre industrielle | 40 / 20.3 / 3 | 40.6 | 2 / 6 | 2 | 8 | 600 or, 150 bois, 480 fer, 90 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 6 |
| Batterie de fusées | Guerre industrielle | 52 / 21.2 / 4 | 42.4 | 2 / 7 | 2 | 8 | 670 or, 168 bois, 536 fer, 101 vivres | 0.9 or, 0.6 fer, 0.5 vivres | 13 |
| Chevalier mécanique | Guerre occulte | 100 / 25 / 10 | 50 | 3 / 1 | 1 | 14 | 1575 or, 394 bois, 1260 fer, 237 vivres | 1.9 or, 1.2 fer, 0.8 vivres | 9 |
| Paysan | Civil | 12 / 0 / 0 | 0 | 3 / 1 | — | 3 | 5 or, 10 bois, 10 vivres | 0.1 or, 0.3 vivres | 1 |
| Milicien | Fondations | 22 / 6 / 2 | 12 | 3 / 1 | 1 | 5 | 15 or, 10 bois, 10 vivres | 0.1 or, 0.3 vivres | 1 |
| Lancier | Fondations | 32 / 8 / 5 | 16 | 3 / 1 | 1 | 5 | 30 or, 20 bois, 15 fer, 15 vivres | 0.1 or, 0.3 vivres | 1 |
| Arbalétrier | Armée médiévale | 32 / 14.2 / 3 | 28.4 | 2 / 3 | 1 | 5 | 165 or, 50 bois, 66 fer, 50 vivres | 0.5 or, 0.3 vivres | 3 |
| Rôdeur | Armée médiévale | 32 / 14 / 4 | 28 | 4 / 3 | 1 | 5 | 175 or, 53 bois, 70 fer, 53 vivres | 0.5 or, 0.3 vivres | 1 |
| Cavalier léger | Armée médiévale | 37 / 9 / 3 | 18 | 6 / 1 | 1 | 6 | 130 or, 39 bois, 52 fer, 72 vivres | 0.6 or, 0.7 vivres | 2 |
| Paladin | Armée médiévale | 60 / 16 / 9 | 32 | 2 / 1 | 1 | 5 | 275 or, 25 bois, 150 fer, 88 vivres | 0.4 or, 0.3 vivres | 4 |
| Bélier | Armée médiévale | 60 / 4 / 7 | 8 | 2 / 1 | 2 | 6 | 150 or, 45 bois, 60 fer, 45 vivres | 0.6 or, 0.4 vivres | 1 |
| Guérisseuse | Civil | 20 / 0 / 2 | 0 | 3 / 1 | — | 5 | 45 or, 10 bois, 5 fer, 25 vivres | 0.1 or, 0.3 vivres | 2 |
| Ingénieur | Civil | 26 / 3 / 4 | 3 | 3 / 1 | 1 | 5 | 45 or, 30 bois, 20 fer, 15 vivres | 0.2 or, 0.3 vivres | 1 |
| Berserker | Armée médiévale | 38 / 14.9 / 1 | 29.8 | 3 / 1 | 1 | 5 | 140 or, 42 bois, 56 fer, 42 vivres | 0.5 or, 0.3 vivres | 3 |
| Acolyte du Vide | Guerre occulte | 62 / 24.4 / 3 | 48.8 | 2 / 3 | 1 | 7 | 1230 or, 246 bois, 492 fer, 369 vivres | 1.3 or, 0.4 vivres | 3 |
| Éclaireur | Fondations | 16 / 3 / 1 | 6 | 5 / 1 | 1 | 5 | 20 or, 15 bois, 10 vivres | 0.1 or, 0.3 vivres | 1 |
| Fantassin | Fondations | 30 / 8 / 4 | 16 | 3 / 1 | 1 | 5 | 25 or, 10 bois, 10 fer, 10 vivres | 0.1 or, 0.3 vivres | 1 |
| Garde | Fondations | 46 / 6 / 8 | 12 | 2 / 1 | 1 | 5 | 45 or, 25 fer, 15 vivres | 0.1 or, 0.3 vivres | 1 |
| Archer | Fondations | 22 / 10 / 2 | 20 | 2 / 3 | 1 | 5 | 30 or, 25 bois, 10 vivres | 0.1 or, 0.3 vivres | 1 |
| Chevalier | Armée médiévale | 48 / 14.3 / 6 | 28.6 | 5 / 1 | 1 | 6 | 180 or, 54 bois, 72 fer, 100 vivres | 0.6 or, 0.7 vivres | 2 |
| Engin de siège | Armée médiévale | 33 / 7 / 2 | 14 | 1 / 4 | 2 | 6 | 150 or, 45 bois, 60 fer, 45 vivres | 0.6 or, 0.4 vivres | 2 |

## Bâtiments

| Bâtiment | PV de base | Coût initial | Production brute / minute niveau 1 | Production brute / minute au niveau maximal | Terrains | Prérequis |
| --- | --- | --- | --- | --- | --- | --- |
| Scierie à vapeur | 130 | 480 or, 320 bois, 160 pierre, 140 fer | 48 bois | 384 bois | FOREST | Scierie, Atelier |
| Carrière mécanisée | 160 | 560 or, 360 bois, 200 pierre, 180 fer | 36 pierre | 288 pierre | HILL, MOUNTAIN | Carrière de pierre, Atelier |
| Mine industrielle | 150 | 640 or, 360 bois, 280 pierre, 200 fer | 30 fer | 240 fer | HILL | Mine de fer, Forge |
| Scierie des ombres | 240 | 2940 or, 1260 bois, 840 pierre, 980 fer | 160 bois | 1280 bois | FOREST | Scierie à vapeur, Laboratoire des cendres |
| Carrière runique | 280 | 3220 or, 1260 bois, 1120 pierre, 1120 fer | 120 pierre | 960 pierre | HILL, MOUNTAIN | Carrière mécanisée, Laboratoire des cendres |
| Mine des abysses | 260 | 3500 or, 1260 bois, 1400 pierre, 1260 fer | 100 fer | 800 fer | HILL | Mine industrielle, Laboratoire des cendres |
| Complexe des cloches | 750 | 33000 or, 7500 bois, 10500 pierre, 18000 fer | — | — | PLAIN, RUINS | Réacteur noir, Fonderie atomique, Observatoire noir |
| Laboratoire des isotopes | 385 | 4400 or, 1600 bois, 2000 pierre, 3000 fer | — | — | PLAIN, HILL, RUINS | Laboratoire des cendres, Manufacture de munitions |
| Réacteur noir | 630 | 9600 or, 2400 bois, 4800 pierre, 6720 fer | 120 or | 960 or | PLAIN, HILL, RUINS | Laboratoire des isotopes, Raffinerie |
| Héliport occulte | 430 | 5600 or, 1800 bois, 2400 pierre, 3600 fer | — | — | PLAIN, RUINS | Laboratoire des isotopes, Garage militaire, Relais radio |
| Fonderie atomique | 625 | 15000 or, 4080 bois, 5220 pierre, 10380 fer | — | — | PLAIN, HILL, RUINS | Réacteur noir, Usine de blindés |
| Aérodrome militaire | 265 | 1575 or, 980 bois, 700 pierre, 980 fer | — | — | PLAIN, RUINS | Garage militaire, Relais radio |
| Chantier de dirigeables | 380 | 2520 or, 1575 bois, 1085 pierre, 1785 fer | — | — | PLAIN, RUINS | Aérodrome militaire, Raffinerie |
| Sanctuaire draconique | 440 | 4450 or, 1700 bois, 2750 pierre, 2400 fer | — | — | HILL, MOUNTAIN, RUINS, CORRUPTION | Observatoire noir, Caserne des revenants |
| École de défense antiaérienne | 280 | 560 or, 280 bois, 380 pierre, 480 fer | — | — | PLAIN, HILL, RUINS | Manufacture de munitions |
| Palissade en bois | 100 | 30 bois | — | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | — |
| Rempart de pierre | 240 | 98 pierre | — | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | Évolution uniquement : Palissade en bois (2 PA, coût sans réduction) |
| Mur en acier | 480 | 225 fer | — | — | PLAIN, HILL, FOREST, RUINS, MOUNTAIN | Évolution uniquement : Rempart de pierre (2 PA, coût sans réduction) |
| Rempart en béton blindé | 900 | 1400 or, 1820 pierre, 1260 fer | — | — | PLAIN, HILL, FOREST, RUINS | Évolution uniquement : Mur en acier (2 PA, coût sans réduction) |
| Enceinte atomique | 1600 | 4800 or, 3600 pierre, 4200 fer | — | — | PLAIN, HILL, FOREST, RUINS | Évolution uniquement : Rempart en béton blindé (2 PA, coût sans réduction) |
| Tour Tesla | 380 | 1085 or, 560 bois, 840 pierre, 1085 fer | — | — | PLAIN, HILL, RUINS | Forge, Laboratoire des cendres |
| Caserne des revenants | 300 | 1190 or, 735 bois, 805 pierre, 595 fer | — | — | PLAIN, HILL, RUINS | Caserne, Laboratoire des cendres |
| Fonderie alchimique | 260 | 1575 or, 840 bois, 595 pierre, 980 fer | 30 or | 240 or | PLAIN, HILL, RUINS | Raffinerie, Laboratoire des cendres |
| Observatoire noir | 220 | 1680 or, 980 bois, 735 pierre, 805 fer | — | — | PLAIN, HILL, RUINS | Bibliothèque des astres, Relais radio |
| Carrière de pierre | 75 | 20 or, 30 bois | 6 pierre | 48 pierre | HILL, MOUNTAIN | — |
| Arsenal | 175 | 400 or, 380 bois, 200 pierre, 200 fer | — | — | PLAIN, HILL, RUINS | Caserne, Forge |
| Bunker | 350 | 400 or, 200 bois, 460 pierre, 560 fer | — | — | PLAIN, HILL, RUINS | Forge |
| Garage militaire | 175 | 460 or, 380 bois, 320 fer | — | — | PLAIN, HILL, RUINS | Atelier |
| Usine de blindés | 265 | 1575 or, 980 bois, 665 pierre, 1295 fer | — | — | PLAIN, HILL, RUINS | Garage militaire, Raffinerie |
| Raffinerie | 160 | 560 or, 400 bois, 200 pierre, 400 fer | 6 or | 48 or | PLAIN, HILL, RUINS | Forge |
| Manufacture de munitions | 160 | 480 or, 380 bois, 140 pierre, 340 fer | — | — | PLAIN, HILL, RUINS | Arsenal |
| Relais radio | 125 | 420 or, 240 bois, 100 pierre, 380 fer | — | — | PLAIN, HILL, RUINS | Atelier |
| Hôpital militaire | 175 | 380 or, 380 bois, 120 pierre, 140 fer, 180 vivres | — | — | PLAIN, HILL, RUINS | Chaumière, Monastère |
| Batterie fortifiée | 300 | 620 or, 340 bois, 280 pierre, 560 fer | — | — | PLAIN, HILL, RUINS | Manufacture de munitions |
| Laboratoire des cendres | 240 | 1785 or, 980 bois, 735 pierre, 1190 fer | — | — | PLAIN, HILL, RUINS | Bibliothèque des astres, Forge |
| Rampe de lancement | 260 | 2030 or, 980 bois, 735 pierre, 1680 fer | — | — | PLAIN, HILL, RUINS | Usine de blindés, Laboratoire des cendres |
| Dépôt ferroviaire | 195 | 325 or, 325 bois, 113 pierre, 263 fer | 5 or | 40 or | PLAIN, HILL, RUINS | Atelier, Entrepôt |
| Campement | 75 | 25 bois | 2 or, 4 vivres | 2 or, 4 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Chaumière | 50 | 20 bois | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Grenier | 65 | 23 or, 60 bois | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Cabane de chasse | 50 | 20 bois | 5 vivres | 40 vivres | FOREST | — |
| Pêcherie | 50 | 10 or, 30 bois | 10 vivres | 80 vivres | RIVER, MARSH | — |
| Écurie | 105 | 98 or, 105 bois, 30 fer, 45 vivres | — | — | PLAIN, HILL | Caserne |
| Archerie | 90 | 35 or, 50 bois, 10 pierre, 10 vivres | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Monastère | 135 | 135 or, 105 bois, 68 pierre, 53 fer, 38 vivres | 3 or, 3 vivres | 24 or, 24 vivres | PLAIN, HILL, RUINS | Chaumière |
| Forge | 140 | 238 or, 163 bois, 75 pierre, 125 fer | — | — | PLAIN, HILL, RUINS | Atelier |
| Bibliothèque des astres | 105 | 288 or, 200 bois, 88 pierre, 88 fer, 63 vivres | 4 or | 32 or | PLAIN, HILL, RUINS | Monastère |
| Boulangerie | 75 | 45 or, 60 bois, 23 pierre, 15 fer, 23 vivres | 24 vivres | 192 vivres | PLAIN, HILL, FOREST, RUINS | Ferme |
| Puits | 75 | 5 or, 20 bois, 10 pierre | 3 vivres | 24 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Avant-poste | 90 | 35 or, 35 bois, 5 fer | 3 or, 5 vivres | 3 or, 5 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Village | 105 | 105 or, 90 bois, 38 pierre, 23 fer, 45 vivres | 6 or, 6 vivres | 30 or, 30 vivres | PLAIN, HILL, FOREST, RUINS | — |
| Ferme | 40 | 20 or, 25 bois | 8 vivres | 64 vivres | PLAIN | — |
| Scierie | 50 | 15 or, 25 bois | 8 bois | 64 bois | FOREST | — |
| Mine de fer | 65 | 30 or, 35 bois, 10 pierre | 5 fer | 40 fer | HILL | — |
| Mine d’or | 120 | 400 or, 300 bois, 225 pierre, 150 fer | 24 or | 192 or | HILL, MOUNTAIN | Mine de fer, Atelier |
| Marché | 75 | 90 or, 60 bois, 23 fer, 23 vivres | 8 or | 64 or | PLAIN, HILL, RUINS | — |
| Entrepôt | 90 | 60 or, 75 bois, 30 pierre, 23 fer | — | — | PLAIN, HILL, FOREST, RUINS | — |
| Atelier | 90 | 188 or, 125 bois, 50 pierre, 75 fer | 2 or | 16 or | PLAIN, HILL, RUINS | — |
| Caserne | 120 | 35 or, 45 bois, 15 pierre, 10 vivres | — | — | PLAIN, HILL, RUINS | — |
| Fort | 195 | 250 or, 125 bois, 188 pierre, 188 fer | — | — | PLAIN, HILL, RUINS | — |
| Tour de guet | 120 | 75 or, 45 bois, 45 pierre, 53 fer | — | — | PLAIN, HILL, FOREST, RUINS | — |

## Dépenses d’évolution

Chaque ligne est un paiement supplémentaire réel, en plus de 2 PA. Les habitants requis ne sont pas consommés.

| Bâtiment actuel | Évolution | Ressources débitées | Stockage total ajouté après évolution |
| --- | --- | --- | --- |
| Scierie à vapeur · 1 | Scierie à vapeur · niveau 2 | 384 or, 256 bois, 128 pierre, 112 fer | 750 par ressource |
| Scierie à vapeur · 2 | Scierie à vapeur · niveau 3 | 672 or, 448 bois, 224 pierre, 196 fer | 2250 par ressource |
| Scierie à vapeur · 3 | Scierie à vapeur · niveau 4 | 1152 or, 768 bois, 384 pierre, 336 fer | 7500 par ressource |
| Scierie à vapeur · 4 | Scierie à vapeur · niveau 5 | 1920 or, 1280 bois, 640 pierre, 560 fer | 24000 par ressource |
| Carrière mécanisée · 1 | Carrière mécanisée · niveau 2 | 448 or, 288 bois, 160 pierre, 144 fer | 750 par ressource |
| Carrière mécanisée · 2 | Carrière mécanisée · niveau 3 | 784 or, 504 bois, 280 pierre, 252 fer | 2250 par ressource |
| Carrière mécanisée · 3 | Carrière mécanisée · niveau 4 | 1344 or, 864 bois, 480 pierre, 432 fer | 7500 par ressource |
| Carrière mécanisée · 4 | Carrière mécanisée · niveau 5 | 2240 or, 1440 bois, 800 pierre, 720 fer | 24000 par ressource |
| Mine industrielle · 1 | Mine industrielle · niveau 2 | 512 or, 288 bois, 224 pierre, 160 fer | 750 par ressource |
| Mine industrielle · 2 | Mine industrielle · niveau 3 | 896 or, 504 bois, 392 pierre, 280 fer | 2250 par ressource |
| Mine industrielle · 3 | Mine industrielle · niveau 4 | 1536 or, 864 bois, 672 pierre, 480 fer | 7500 par ressource |
| Mine industrielle · 4 | Mine industrielle · niveau 5 | 2560 or, 1440 bois, 1120 pierre, 800 fer | 24000 par ressource |
| Scierie des ombres · 1 | Scierie des ombres · niveau 2 | 2352 or, 1008 bois, 672 pierre, 784 fer | 750 par ressource |
| Scierie des ombres · 2 | Scierie des ombres · niveau 3 | 4116 or, 1764 bois, 1176 pierre, 1372 fer | 2250 par ressource |
| Scierie des ombres · 3 | Scierie des ombres · niveau 4 | 7056 or, 3024 bois, 2016 pierre, 2352 fer | 7500 par ressource |
| Scierie des ombres · 4 | Scierie des ombres · niveau 5 | 11760 or, 5040 bois, 3360 pierre, 3920 fer | 24000 par ressource |
| Carrière runique · 1 | Carrière runique · niveau 2 | 2576 or, 1008 bois, 896 pierre, 896 fer | 750 par ressource |
| Carrière runique · 2 | Carrière runique · niveau 3 | 4508 or, 1764 bois, 1568 pierre, 1568 fer | 2250 par ressource |
| Carrière runique · 3 | Carrière runique · niveau 4 | 7728 or, 3024 bois, 2688 pierre, 2688 fer | 7500 par ressource |
| Carrière runique · 4 | Carrière runique · niveau 5 | 12880 or, 5040 bois, 4480 pierre, 4480 fer | 24000 par ressource |
| Mine des abysses · 1 | Mine des abysses · niveau 2 | 2800 or, 1008 bois, 1120 pierre, 1008 fer | 750 par ressource |
| Mine des abysses · 2 | Mine des abysses · niveau 3 | 4900 or, 1764 bois, 1960 pierre, 1764 fer | 2250 par ressource |
| Mine des abysses · 3 | Mine des abysses · niveau 4 | 8400 or, 3024 bois, 3360 pierre, 3024 fer | 7500 par ressource |
| Mine des abysses · 4 | Mine des abysses · niveau 5 | 14000 or, 5040 bois, 5600 pierre, 5040 fer | 24000 par ressource |
| Complexe des cloches · 1 | Complexe des cloches · niveau 2 | 66000 or, 15000 bois, 21000 pierre, 36000 fer | 0 par ressource |
| Complexe des cloches · 2 | Complexe des cloches · niveau 3 | 132000 or, 30000 bois, 42000 pierre, 72000 fer | 0 par ressource |
| Complexe des cloches · 3 | Complexe des cloches · niveau 4 | 264000 or, 60000 bois, 84000 pierre, 144000 fer | 0 par ressource |
| Complexe des cloches · 4 | Complexe des cloches · niveau 5 | 528000 or, 120000 bois, 168000 pierre, 288000 fer | 0 par ressource |
| Laboratoire des isotopes · 1 | Laboratoire des isotopes · niveau 2 | 8800 or, 3200 bois, 4000 pierre, 6000 fer | 0 par ressource |
| Laboratoire des isotopes · 2 | Laboratoire des isotopes · niveau 3 | 17600 or, 6400 bois, 8000 pierre, 12000 fer | 0 par ressource |
| Laboratoire des isotopes · 3 | Laboratoire des isotopes · niveau 4 | 35200 or, 12800 bois, 16000 pierre, 24000 fer | 0 par ressource |
| Laboratoire des isotopes · 4 | Laboratoire des isotopes · niveau 5 | 70400 or, 25600 bois, 32000 pierre, 48000 fer | 0 par ressource |
| Réacteur noir · 1 | Réacteur noir · niveau 2 | 7680 or, 1920 bois, 3840 pierre, 5376 fer | 0 par ressource |
| Réacteur noir · 2 | Réacteur noir · niveau 3 | 13440 or, 3360 bois, 6720 pierre, 9408 fer | 0 par ressource |
| Réacteur noir · 3 | Réacteur noir · niveau 4 | 23040 or, 5760 bois, 11520 pierre, 16128 fer | 0 par ressource |
| Réacteur noir · 4 | Réacteur noir · niveau 5 | 38400 or, 9600 bois, 19200 pierre, 26880 fer | 8000 par ressource |
| Héliport occulte · 1 | Héliport occulte · niveau 2 | 11200 or, 3600 bois, 4800 pierre, 7200 fer | 0 par ressource |
| Héliport occulte · 2 | Héliport occulte · niveau 3 | 22400 or, 7200 bois, 9600 pierre, 14400 fer | 0 par ressource |
| Héliport occulte · 3 | Héliport occulte · niveau 4 | 44800 or, 14400 bois, 19200 pierre, 28800 fer | 0 par ressource |
| Héliport occulte · 4 | Héliport occulte · niveau 5 | 89600 or, 28800 bois, 38400 pierre, 57600 fer | 0 par ressource |
| Fonderie atomique · 1 | Fonderie atomique · niveau 2 | 30000 or, 8160 bois, 10440 pierre, 20760 fer | 0 par ressource |
| Fonderie atomique · 2 | Fonderie atomique · niveau 3 | 60000 or, 16320 bois, 20880 pierre, 41520 fer | 0 par ressource |
| Fonderie atomique · 3 | Fonderie atomique · niveau 4 | 120000 or, 32640 bois, 41760 pierre, 83040 fer | 0 par ressource |
| Fonderie atomique · 4 | Fonderie atomique · niveau 5 | 240000 or, 65280 bois, 83520 pierre, 166080 fer | 0 par ressource |
| Aérodrome militaire · 1 | Aérodrome militaire · niveau 2 | 3150 or, 1960 bois, 1400 pierre, 1960 fer | 0 par ressource |
| Aérodrome militaire · 2 | Aérodrome militaire · niveau 3 | 6300 or, 3920 bois, 2800 pierre, 3920 fer | 0 par ressource |
| Aérodrome militaire · 3 | Aérodrome militaire · niveau 4 | 12600 or, 7840 bois, 5600 pierre, 7840 fer | 0 par ressource |
| Aérodrome militaire · 4 | Aérodrome militaire · niveau 5 | 25200 or, 15680 bois, 11200 pierre, 15680 fer | 0 par ressource |
| Chantier de dirigeables · 1 | Chantier de dirigeables · niveau 2 | 5040 or, 3150 bois, 2170 pierre, 3570 fer | 0 par ressource |
| Chantier de dirigeables · 2 | Chantier de dirigeables · niveau 3 | 10080 or, 6300 bois, 4340 pierre, 7140 fer | 0 par ressource |
| Chantier de dirigeables · 3 | Chantier de dirigeables · niveau 4 | 20160 or, 12600 bois, 8680 pierre, 14280 fer | 0 par ressource |
| Chantier de dirigeables · 4 | Chantier de dirigeables · niveau 5 | 40320 or, 25200 bois, 17360 pierre, 28560 fer | 0 par ressource |
| Sanctuaire draconique · 1 | Sanctuaire draconique · niveau 2 | 8900 or, 3400 bois, 5500 pierre, 4800 fer | 0 par ressource |
| Sanctuaire draconique · 2 | Sanctuaire draconique · niveau 3 | 17800 or, 6800 bois, 11000 pierre, 9600 fer | 0 par ressource |
| Sanctuaire draconique · 3 | Sanctuaire draconique · niveau 4 | 35600 or, 13600 bois, 22000 pierre, 19200 fer | 0 par ressource |
| Sanctuaire draconique · 4 | Sanctuaire draconique · niveau 5 | 71200 or, 27200 bois, 44000 pierre, 38400 fer | 0 par ressource |
| École de défense antiaérienne · 1 | École de défense antiaérienne · niveau 2 | 1120 or, 560 bois, 760 pierre, 960 fer | 0 par ressource |
| École de défense antiaérienne · 2 | École de défense antiaérienne · niveau 3 | 2240 or, 1120 bois, 1520 pierre, 1920 fer | 0 par ressource |
| École de défense antiaérienne · 3 | École de défense antiaérienne · niveau 4 | 4480 or, 2240 bois, 3040 pierre, 3840 fer | 0 par ressource |
| École de défense antiaérienne · 4 | École de défense antiaérienne · niveau 5 | 10000 or, 5000 bois, 6080 pierre, 7680 fer | 0 par ressource |
| Palissade en bois · 1 | Rempart de pierre | 98 pierre | 0 par ressource |
| Rempart de pierre · 1 | Mur en acier | 225 fer | 0 par ressource |
| Mur en acier · 1 | Rempart en béton blindé | 1400 or, 1820 pierre, 1260 fer | 0 par ressource |
| Rempart en béton blindé · 1 | Enceinte atomique | 4800 or, 3600 pierre, 4200 fer | 0 par ressource |
| Tour Tesla · 1 | Tour Tesla · niveau 2 | 2170 or, 1120 bois, 1680 pierre, 2170 fer | 0 par ressource |
| Tour Tesla · 2 | Tour Tesla · niveau 3 | 4340 or, 2240 bois, 3360 pierre, 4340 fer | 0 par ressource |
| Tour Tesla · 3 | Tour Tesla · niveau 4 | 8680 or, 4480 bois, 6720 pierre, 8680 fer | 0 par ressource |
| Tour Tesla · 4 | Tour Tesla · niveau 5 | 17360 or, 8960 bois, 13440 pierre, 17360 fer | 0 par ressource |
| Caserne des revenants · 1 | Caserne des revenants · niveau 2 | 2380 or, 1470 bois, 1610 pierre, 1190 fer | 0 par ressource |
| Caserne des revenants · 2 | Caserne des revenants · niveau 3 | 4760 or, 2940 bois, 3220 pierre, 2380 fer | 0 par ressource |
| Caserne des revenants · 3 | Caserne des revenants · niveau 4 | 9520 or, 5880 bois, 6440 pierre, 4760 fer | 0 par ressource |
| Caserne des revenants · 4 | Caserne des revenants · niveau 5 | 19040 or, 11760 bois, 12880 pierre, 9520 fer | 0 par ressource |
| Fonderie alchimique · 1 | Fonderie alchimique · niveau 2 | 1260 or, 672 bois, 476 pierre, 784 fer | 0 par ressource |
| Fonderie alchimique · 2 | Fonderie alchimique · niveau 3 | 2205 or, 1176 bois, 833 pierre, 1372 fer | 0 par ressource |
| Fonderie alchimique · 3 | Fonderie alchimique · niveau 4 | 3780 or, 2016 bois, 1428 pierre, 2352 fer | 0 par ressource |
| Fonderie alchimique · 4 | Fonderie alchimique · niveau 5 | 6300 or, 3360 bois, 2380 pierre, 3920 fer | 8000 par ressource |
| Observatoire noir · 1 | Observatoire noir · niveau 2 | 3360 or, 1960 bois, 1470 pierre, 1610 fer | 0 par ressource |
| Observatoire noir · 2 | Observatoire noir · niveau 3 | 6720 or, 3920 bois, 2940 pierre, 3220 fer | 0 par ressource |
| Observatoire noir · 3 | Observatoire noir · niveau 4 | 13440 or, 7840 bois, 5880 pierre, 6440 fer | 0 par ressource |
| Observatoire noir · 4 | Observatoire noir · niveau 5 | 26880 or, 15680 bois, 11760 pierre, 12880 fer | 0 par ressource |
| Carrière de pierre · 1 | Carrière de pierre · niveau 2 | 16 or, 24 bois | 250 par ressource |
| Carrière de pierre · 2 | Carrière de pierre · niveau 3 | 28 or, 42 bois | 750 par ressource |
| Carrière de pierre · 3 | Carrière de pierre · niveau 4 | 48 or, 72 bois | 2500 par ressource |
| Carrière de pierre · 4 | Carrière de pierre · niveau 5 | 80 or, 120 bois | 8000 par ressource |
| Arsenal · 1 | Arsenal · niveau 2 | 800 or, 760 bois, 400 pierre, 400 fer | 0 par ressource |
| Arsenal · 2 | Arsenal · niveau 3 | 1600 or, 1520 bois, 800 pierre, 800 fer | 0 par ressource |
| Arsenal · 3 | Arsenal · niveau 4 | 3200 or, 3040 bois, 1600 pierre, 1600 fer | 0 par ressource |
| Arsenal · 4 | Arsenal · niveau 5 | 10000 or, 6080 bois, 4000 pierre, 6000 fer | 0 par ressource |
| Bunker · 1 | Bunker · niveau 2 | 800 or, 400 bois, 920 pierre, 1120 fer | 0 par ressource |
| Bunker · 2 | Bunker · niveau 3 | 1600 or, 800 bois, 1840 pierre, 2240 fer | 0 par ressource |
| Bunker · 3 | Bunker · niveau 4 | 3200 or, 1600 bois, 3680 pierre, 4480 fer | 0 par ressource |
| Bunker · 4 | Bunker · niveau 5 | 6400 or, 3200 bois, 7360 pierre, 8960 fer | 0 par ressource |
| Garage militaire · 1 | Garage militaire · niveau 2 | 920 or, 760 bois, 32 pierre, 640 fer | 0 par ressource |
| Garage militaire · 2 | Garage militaire · niveau 3 | 1840 or, 1520 bois, 200 pierre, 1280 fer | 0 par ressource |
| Garage militaire · 3 | Garage militaire · niveau 4 | 3680 or, 3040 bois, 1000 pierre, 2560 fer | 0 par ressource |
| Garage militaire · 4 | Garage militaire · niveau 5 | 10000 or, 6080 bois, 4000 pierre, 6000 fer | 0 par ressource |
| Usine de blindés · 1 | Usine de blindés · niveau 2 | 3150 or, 1960 bois, 1330 pierre, 2590 fer | 0 par ressource |
| Usine de blindés · 2 | Usine de blindés · niveau 3 | 6300 or, 3920 bois, 2660 pierre, 5180 fer | 0 par ressource |
| Usine de blindés · 3 | Usine de blindés · niveau 4 | 12600 or, 7840 bois, 5320 pierre, 10360 fer | 0 par ressource |
| Usine de blindés · 4 | Usine de blindés · niveau 5 | 25200 or, 15680 bois, 10640 pierre, 20720 fer | 0 par ressource |
| Raffinerie · 1 | Raffinerie · niveau 2 | 448 or, 320 bois, 160 pierre, 320 fer | 0 par ressource |
| Raffinerie · 2 | Raffinerie · niveau 3 | 784 or, 560 bois, 280 pierre, 560 fer | 0 par ressource |
| Raffinerie · 3 | Raffinerie · niveau 4 | 1344 or, 960 bois, 480 pierre, 960 fer | 0 par ressource |
| Raffinerie · 4 | Raffinerie · niveau 5 | 2240 or, 1600 bois, 800 pierre, 1600 fer | 8000 par ressource |
| Manufacture de munitions · 1 | Manufacture de munitions · niveau 2 | 960 or, 760 bois, 280 pierre, 680 fer | 0 par ressource |
| Manufacture de munitions · 2 | Manufacture de munitions · niveau 3 | 1920 or, 1520 bois, 560 pierre, 1360 fer | 0 par ressource |
| Manufacture de munitions · 3 | Manufacture de munitions · niveau 4 | 3840 or, 3040 bois, 1120 pierre, 2720 fer | 0 par ressource |
| Manufacture de munitions · 4 | Manufacture de munitions · niveau 5 | 7680 or, 6080 bois, 2240 pierre, 5440 fer | 0 par ressource |
| Relais radio · 1 | Relais radio · niveau 2 | 840 or, 480 bois, 200 pierre, 760 fer | 0 par ressource |
| Relais radio · 2 | Relais radio · niveau 3 | 1680 or, 960 bois, 400 pierre, 1520 fer | 0 par ressource |
| Relais radio · 3 | Relais radio · niveau 4 | 3360 or, 1920 bois, 800 pierre, 3040 fer | 0 par ressource |
| Relais radio · 4 | Relais radio · niveau 5 | 6720 or, 3840 bois, 1600 pierre, 6080 fer | 0 par ressource |
| Hôpital militaire · 1 | Hôpital militaire · niveau 2 | 760 or, 760 bois, 240 pierre, 280 fer, 360 vivres | 0 par ressource |
| Hôpital militaire · 2 | Hôpital militaire · niveau 3 | 1520 or, 1520 bois, 480 pierre, 560 fer, 720 vivres | 0 par ressource |
| Hôpital militaire · 3 | Hôpital militaire · niveau 4 | 3040 or, 3040 bois, 1000 pierre, 1500 fer, 1440 vivres | 0 par ressource |
| Hôpital militaire · 4 | Hôpital militaire · niveau 5 | 10000 or, 6080 bois, 4000 pierre, 6000 fer, 2880 vivres | 0 par ressource |
| Batterie fortifiée · 1 | Batterie fortifiée · niveau 2 | 1240 or, 680 bois, 560 pierre, 1120 fer | 0 par ressource |
| Batterie fortifiée · 2 | Batterie fortifiée · niveau 3 | 2480 or, 1360 bois, 1120 pierre, 2240 fer | 0 par ressource |
| Batterie fortifiée · 3 | Batterie fortifiée · niveau 4 | 4960 or, 2720 bois, 2240 pierre, 4480 fer | 0 par ressource |
| Batterie fortifiée · 4 | Batterie fortifiée · niveau 5 | 10000 or, 5440 bois, 4480 pierre, 8960 fer | 0 par ressource |
| Laboratoire des cendres · 1 | Laboratoire des cendres · niveau 2 | 3570 or, 1960 bois, 1470 pierre, 2380 fer | 0 par ressource |
| Laboratoire des cendres · 2 | Laboratoire des cendres · niveau 3 | 7140 or, 3920 bois, 2940 pierre, 4760 fer | 0 par ressource |
| Laboratoire des cendres · 3 | Laboratoire des cendres · niveau 4 | 14280 or, 7840 bois, 5880 pierre, 9520 fer | 0 par ressource |
| Laboratoire des cendres · 4 | Laboratoire des cendres · niveau 5 | 28560 or, 15680 bois, 11760 pierre, 19040 fer | 0 par ressource |
| Rampe de lancement · 1 | Rampe de lancement · niveau 2 | 4060 or, 1960 bois, 1470 pierre, 3360 fer | 0 par ressource |
| Rampe de lancement · 2 | Rampe de lancement · niveau 3 | 8120 or, 3920 bois, 2940 pierre, 6720 fer | 0 par ressource |
| Rampe de lancement · 3 | Rampe de lancement · niveau 4 | 16240 or, 7840 bois, 5880 pierre, 13440 fer | 0 par ressource |
| Rampe de lancement · 4 | Rampe de lancement · niveau 5 | 32480 or, 15680 bois, 11760 pierre, 26880 fer | 0 par ressource |
| Dépôt ferroviaire · 1 | Dépôt ferroviaire · niveau 2 | 260 or, 260 bois, 91 pierre, 211 fer | 7500 par ressource |
| Dépôt ferroviaire · 2 | Dépôt ferroviaire · niveau 3 | 455 or, 455 bois, 159 pierre, 369 fer | 30000 par ressource |
| Dépôt ferroviaire · 3 | Dépôt ferroviaire · niveau 4 | 780 or, 780 bois, 272 pierre, 632 fer | 90000 par ressource |
| Dépôt ferroviaire · 4 | Dépôt ferroviaire · niveau 5 | 1300 or, 1300 bois, 452 pierre, 1052 fer | 270000 par ressource |
| Campement · 1 | Avant-poste | 20 or, 60 bois, 30 vivres | 0 par ressource |
| Chaumière · 1 | Chaumière · niveau 2 | 40 bois | 0 par ressource |
| Chaumière · 2 | Chaumière · niveau 3 | 80 bois | 0 par ressource |
| Chaumière · 3 | Chaumière · niveau 4 | 160 bois | 0 par ressource |
| Chaumière · 4 | Chaumière · niveau 5 | 320 bois | 0 par ressource |
| Grenier · 1 | Grenier · niveau 2 | 46 or, 120 bois | 2000 par ressource |
| Grenier · 2 | Grenier · niveau 3 | 92 or, 240 bois | 8000 par ressource |
| Grenier · 3 | Grenier · niveau 4 | 184 or, 480 bois | 25000 par ressource |
| Grenier · 4 | Grenier · niveau 5 | 368 or, 960 bois | 75000 par ressource |
| Cabane de chasse · 1 | Cabane de chasse · niveau 2 | 16 bois | 250 par ressource |
| Cabane de chasse · 2 | Cabane de chasse · niveau 3 | 28 bois | 750 par ressource |
| Cabane de chasse · 3 | Cabane de chasse · niveau 4 | 48 bois | 2500 par ressource |
| Cabane de chasse · 4 | Cabane de chasse · niveau 5 | 80 bois | 8000 par ressource |
| Pêcherie · 1 | Pêcherie · niveau 2 | 8 or, 24 bois | 250 par ressource |
| Pêcherie · 2 | Pêcherie · niveau 3 | 14 or, 42 bois | 750 par ressource |
| Pêcherie · 3 | Pêcherie · niveau 4 | 24 or, 72 bois | 2500 par ressource |
| Pêcherie · 4 | Pêcherie · niveau 5 | 40 or, 120 bois | 8000 par ressource |
| Écurie · 1 | Écurie · niveau 2 | 196 or, 210 bois, 32 pierre, 60 fer, 90 vivres | 0 par ressource |
| Écurie · 2 | Écurie · niveau 3 | 500 or, 420 bois, 200 pierre, 300 fer, 180 vivres | 0 par ressource |
| Écurie · 3 | Écurie · niveau 4 | 2500 or, 1250 bois, 1000 pierre, 1500 fer, 360 vivres | 0 par ressource |
| Écurie · 4 | Écurie · niveau 5 | 10000 or, 5000 bois, 4000 pierre, 6000 fer, 720 vivres | 0 par ressource |
| Archerie · 1 | Archerie · niveau 2 | 80 or, 100 bois, 32 pierre, 48 fer, 20 vivres | 0 par ressource |
| Archerie · 2 | Archerie · niveau 3 | 500 or, 250 bois, 200 pierre, 300 fer, 40 vivres | 0 par ressource |
| Archerie · 3 | Archerie · niveau 4 | 2500 or, 1250 bois, 1000 pierre, 1500 fer, 80 vivres | 0 par ressource |
| Archerie · 4 | Archerie · niveau 5 | 10000 or, 5000 bois, 4000 pierre, 6000 fer, 160 vivres | 0 par ressource |
| Monastère · 1 | Monastère · niveau 2 | 270 or, 210 bois, 136 pierre, 106 fer, 76 vivres | 0 par ressource |
| Monastère · 2 | Monastère · niveau 3 | 540 or, 420 bois, 272 pierre, 300 fer, 152 vivres | 0 par ressource |
| Monastère · 3 | Monastère · niveau 4 | 2500 or, 1250 bois, 1000 pierre, 1500 fer, 304 vivres | 0 par ressource |
| Monastère · 4 | Monastère · niveau 5 | 10000 or, 5000 bois, 4000 pierre, 6000 fer, 608 vivres | 8000 par ressource |
| Forge · 1 | Forge · niveau 2 | 476 or, 326 bois, 150 pierre, 250 fer | 0 par ressource |
| Forge · 2 | Forge · niveau 3 | 952 or, 652 bois, 300 pierre, 500 fer | 0 par ressource |
| Forge · 3 | Forge · niveau 4 | 1904 or, 1304 bois, 600 pierre, 1000 fer | 0 par ressource |
| Forge · 4 | Forge · niveau 5 | 3808 or, 2608 bois, 1200 pierre, 2000 fer | 0 par ressource |
| Bibliothèque des astres · 1 | Bibliothèque des astres · niveau 2 | 576 or, 400 bois, 176 pierre, 176 fer, 126 vivres | 0 par ressource |
| Bibliothèque des astres · 2 | Bibliothèque des astres · niveau 3 | 1152 or, 800 bois, 352 pierre, 352 fer, 252 vivres | 0 par ressource |
| Bibliothèque des astres · 3 | Bibliothèque des astres · niveau 4 | 2500 or, 1600 bois, 1000 pierre, 1500 fer, 504 vivres | 0 par ressource |
| Bibliothèque des astres · 4 | Bibliothèque des astres · niveau 5 | 10000 or, 5000 bois, 4000 pierre, 6000 fer, 1008 vivres | 8000 par ressource |
| Boulangerie · 1 | Boulangerie · niveau 2 | 36 or, 48 bois, 19 pierre, 12 fer, 19 vivres | 0 par ressource |
| Boulangerie · 2 | Boulangerie · niveau 3 | 63 or, 84 bois, 33 pierre, 21 fer, 33 vivres | 0 par ressource |
| Boulangerie · 3 | Boulangerie · niveau 4 | 108 or, 144 bois, 56 pierre, 36 fer, 56 vivres | 0 par ressource |
| Boulangerie · 4 | Boulangerie · niveau 5 | 180 or, 240 bois, 92 pierre, 60 fer, 92 vivres | 8000 par ressource |
| Puits · 1 | Puits · niveau 2 | 4 or, 16 bois, 8 pierre | 0 par ressource |
| Puits · 2 | Puits · niveau 3 | 7 or, 28 bois, 14 pierre | 0 par ressource |
| Puits · 3 | Puits · niveau 4 | 12 or, 48 bois, 24 pierre | 0 par ressource |
| Puits · 4 | Puits · niveau 5 | 20 or, 80 bois, 40 pierre | 8000 par ressource |
| Avant-poste · 1 | Village | 120 or, 135 bois, 60 pierre, 30 fer, 60 vivres | 0 par ressource |
| Village · 1 | Bourg impérial | 300 or, 240 bois, 120 pierre, 120 fer, 150 vivres | 0 par ressource |
| Village · 2 | Ville industrielle | 1200 or, 960 bois, 480 pierre, 480 fer, 600 vivres | 0 par ressource |
| Village · 3 | Métropole | 3600 or, 2880 bois, 1440 pierre, 1440 fer, 1800 vivres | 0 par ressource |
| Village · 4 | Cité atomique | 9600 or, 7680 bois, 3840 pierre, 3840 fer, 4800 vivres | 8000 par ressource |
| Ferme · 1 | Ferme · niveau 2 | 16 or, 20 bois | 250 par ressource |
| Ferme · 2 | Ferme · niveau 3 | 28 or, 35 bois | 750 par ressource |
| Ferme · 3 | Ferme · niveau 4 | 48 or, 60 bois | 2500 par ressource |
| Ferme · 4 | Ferme · niveau 5 | 80 or, 100 bois | 8000 par ressource |
| Scierie · 1 | Scierie · niveau 2 | 12 or, 20 bois | 250 par ressource |
| Scierie · 2 | Scierie · niveau 3 | 21 or, 35 bois | 750 par ressource |
| Scierie · 3 | Scierie · niveau 4 | 36 or, 60 bois | 2500 par ressource |
| Scierie · 4 | Scierie · niveau 5 | 60 or, 100 bois | 8000 par ressource |
| Mine de fer · 1 | Mine de fer · niveau 2 | 24 or, 28 bois, 8 pierre | 250 par ressource |
| Mine de fer · 2 | Mine de fer · niveau 3 | 42 or, 49 bois, 14 pierre | 750 par ressource |
| Mine de fer · 3 | Mine de fer · niveau 4 | 72 or, 84 bois, 24 pierre | 2500 par ressource |
| Mine de fer · 4 | Mine de fer · niveau 5 | 120 or, 140 bois, 40 pierre | 8000 par ressource |
| Mine d’or · 1 | Mine d’or · niveau 2 | 320 or, 240 bois, 180 pierre, 120 fer | 250 par ressource |
| Mine d’or · 2 | Mine d’or · niveau 3 | 560 or, 420 bois, 315 pierre, 210 fer | 750 par ressource |
| Mine d’or · 3 | Mine d’or · niveau 4 | 960 or, 720 bois, 540 pierre, 360 fer | 2500 par ressource |
| Mine d’or · 4 | Mine d’or · niveau 5 | 1600 or, 1200 bois, 900 pierre, 600 fer | 8000 par ressource |
| Marché · 1 | Marché · niveau 2 | 72 or, 48 bois, 19 fer, 19 vivres | 0 par ressource |
| Marché · 2 | Marché · niveau 3 | 126 or, 84 bois, 33 fer, 33 vivres | 0 par ressource |
| Marché · 3 | Marché · niveau 4 | 216 or, 144 bois, 56 fer, 56 vivres | 0 par ressource |
| Marché · 4 | Marché · niveau 5 | 360 or, 240 bois, 92 fer, 92 vivres | 8000 par ressource |
| Entrepôt · 1 | Entrepôt · niveau 2 | 120 or, 150 bois, 60 pierre, 46 fer | 4000 par ressource |
| Entrepôt · 2 | Entrepôt · niveau 3 | 240 or, 300 bois, 120 pierre, 92 fer | 16000 par ressource |
| Entrepôt · 3 | Entrepôt · niveau 4 | 480 or, 600 bois, 240 pierre, 184 fer | 50000 par ressource |
| Entrepôt · 4 | Entrepôt · niveau 5 | 960 or, 1200 bois, 480 pierre, 368 fer | 150000 par ressource |
| Atelier · 1 | Atelier · niveau 2 | 376 or, 250 bois, 100 pierre, 150 fer | 0 par ressource |
| Atelier · 2 | Atelier · niveau 3 | 752 or, 500 bois, 200 pierre, 300 fer | 0 par ressource |
| Atelier · 3 | Atelier · niveau 4 | 2500 or, 1250 bois, 1000 pierre, 1500 fer | 0 par ressource |
| Atelier · 4 | Atelier · niveau 5 | 10000 or, 5000 bois, 4000 pierre, 6000 fer | 8000 par ressource |
| Caserne · 1 | Caserne · niveau 2 | 80 or, 90 bois, 32 pierre, 48 fer, 20 vivres | 0 par ressource |
| Caserne · 2 | Caserne · niveau 3 | 500 or, 250 bois, 200 pierre, 300 fer, 40 vivres | 0 par ressource |
| Caserne · 3 | Caserne · niveau 4 | 2500 or, 1250 bois, 1000 pierre, 1500 fer, 80 vivres | 0 par ressource |
| Caserne · 4 | Caserne · niveau 5 | 10000 or, 5000 bois, 4000 pierre, 6000 fer, 160 vivres | 0 par ressource |
| Fort · 1 | Fort · niveau 2 | 500 or, 250 bois, 376 pierre, 376 fer | 0 par ressource |
| Fort · 2 | Fort · niveau 3 | 1000 or, 500 bois, 752 pierre, 752 fer | 0 par ressource |
| Fort · 3 | Fort · niveau 4 | 2500 or, 1250 bois, 1504 pierre, 1504 fer | 0 par ressource |
| Fort · 4 | Fort · niveau 5 | 10000 or, 5000 bois, 4000 pierre, 6000 fer | 0 par ressource |
| Tour de guet · 1 | Tour de guet · niveau 2 | 150 or, 90 bois, 90 pierre, 106 fer | 0 par ressource |
| Tour de guet · 2 | Tour de guet · niveau 3 | 300 or, 180 bois, 180 pierre, 212 fer | 0 par ressource |
| Tour de guet · 3 | Tour de guet · niveau 4 | 600 or, 360 bois, 360 pierre, 424 fer | 0 par ressource |
| Tour de guet · 4 | Tour de guet · niveau 5 | 1200 or, 720 bois, 720 pierre, 848 fer | 0 par ressource |

## Tourelles de rempart

Équipements fixes partageant les PV du mur, sans production ni entretien. Installation et chaque évolution : 2 PA. Tir manuel : 1 PA. Les prix ci-dessous excluent le mur et les étapes précédentes. Voir [les règles des tourelles](turrets.md).

| Arme | Mur minimal | Attaque / portée | Bonus antiaérien | Coût de cette étape |
| --- | --- | --- | --- | --- |
| Arbalète de rempart | Palissade en bois | 16 / 3 | 0 | 60 or, 50 bois, 20 fer |
| Canon de rempart | Rempart de pierre | 30 / 4 | 0 | 120 or, 60 pierre, 50 fer |
| Tourelle Tesla occulte | Mur en acier | 48 / 5 | 18 | 220 or, 40 pierre, 120 fer |
| Tourelle automatique de forteresse | Rempart en béton blindé | 72 / 5 | 24 | 1400 or, 600 pierre, 1000 fer |
| Lance à neutrons | Enceinte atomique | 110 / 6 | 36 | 7000 or, 1800 pierre, 4200 fer |

## Comparatif de tirs sur plaine

Cibles à pleine santé, sans rareté, remparts, trêves ni ripostes. Le nombre de tirs utilise le minimum des dégâts : il ne représente pas une victoire garantie en duel. Les bonus indiquent le niveau d’entraînement, pas un niveau individuel acquis par expérience.

| Attaquant | Entraînement | Cible | Entraînement | Dégâts par tir | Tirs nécessaires au maximum |
| --- | --- | --- | --- | --- | --- |
| Fantassin | +0 % | Milicien | +0 % | 5–7 | 5 |
| Fusilier | +0 % | Milicien | +0 % | 16–18 | 2 |
| Char de rupture | +0 % | Milicien | +0 % | 18–20 | 2 |
| Char Mausolée | +60 % | Milicien | +0 % | 44–46 | 1 |
| Fusilier | +25 % | Char Mausolée | +60 % | 1–2 | 352 |
| Chasseur de blindés | +25 % | Char Mausolée | +60 % | 47–49 | 8 |
| Chasseur de chars isotopique | +60 % | Char Mausolée | +60 % | 85–87 | 5 |
| Fusilier | +60 % | Aile de l’Apocalypse | +60 % | 8–10 | 36 |
| Canon antiaérien Flak | +60 % | Aile de l’Apocalypse | +60 % | 55–57 | 6 |

## Coût des filières de recrutement

Chaque prérequis est compté une seule fois, au coût de construction de base. Inclut les évolutions du premier recruteur jusqu’au niveau minimal demandé. Hors habitat, entretien, recrutement, routes et PA. Ces montants servent à comparer les filières ; ils ne sont pas des durées de progression.

| Recrue visée | Infrastructure minimale retenue | Investissement initial |
| --- | --- | --- |
| Fantassin | Caserne | 35 or, 45 bois, 15 pierre, 10 vivres |
| Chevalier | Caserne, Écurie | 133 or, 150 bois, 15 pierre, 30 fer, 55 vivres |
| Char de rupture | Usine de blindés, Garage militaire, Atelier, Raffinerie, Forge, Manufacture de munitions, Arsenal, Caserne | 3936 or, 2853 bois, 1345 pierre, 2755 fer, 10 vivres |
| Char possédé | Fonderie alchimique, Raffinerie, Forge, Atelier, Laboratoire des cendres, Bibliothèque des astres, Monastère, Chaumière, Usine de blindés, Garage militaire | 6804 or, 4193 bois, 2476 pierre, 4526 fer, 101 vivres |
| Char Mausolée | Réacteur noir, Laboratoire des isotopes, Laboratoire des cendres, Bibliothèque des astres, Monastère, Chaumière, Forge, Atelier, Manufacture de munitions, Arsenal, Caserne, Raffinerie, Fonderie atomique, Usine de blindés, Garage militaire | 35144 or, 12238 bois, 14256 pierre, 24186 fer, 111 vivres |
| Aile de l’Apocalypse | Réacteur noir, Laboratoire des isotopes, Laboratoire des cendres, Bibliothèque des astres, Monastère, Chaumière, Forge, Atelier, Manufacture de munitions, Arsenal, Caserne, Raffinerie, Fonderie atomique, Usine de blindés, Garage militaire, Chantier de dirigeables, Aérodrome militaire, Relais radio | 39659 or, 15033 bois, 16141 pierre, 27331 fer, 111 vivres |
