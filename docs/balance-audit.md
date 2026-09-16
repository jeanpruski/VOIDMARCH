# Audit d’équilibrage — ressources, population et catalogue

Rapport reproductible : `node --import tsx scripts/audit-balance.ts`. Les coûts sont ceux de base, avant le bonus de construction de la Cendre. Le premier bâtiment de recrutement est utilisé pour calculer la chaîne d’infrastructure ; d’autres accès peuvent exister.

## Corrections appliquées

- Récolte uniquement sur la case occupée, jamais sur une voisine ni sur une terre adverse. Bois : forêt ; pierre : colline/montagne ; fer : colline ; vivres : plaine/rivière/marais ; or : ruines. Les vestiges cosmiques se fouillent par leur action dédiée.
- Pierre ajoutée aux stocks, échanges, coûts et sauvegardes. Carrière accessible sans coût initial en pierre. La mine extrait le fer sur colline ; la carrière extrait la pierre sur colline ou montagne.
- Aucun revenu brut par simple propriété d’une case. Le campement ne produit plus de bois, les forges/ateliers/raffineries/manufactures ne génèrent plus de fer sans mine. Le grenier stocke sans générer de vivres.
- Entretien proportionné au prix des unités ; les machines consomment aussi du fer. Mobilisation unifiée entre recrutement, interface et croissance : paysan 3, soldats 5, siège médiéval 6, machines 8, char 12.
- Croissance bornée selon le bâtiment : un campement ou une chaumière ne finit plus avec la capacité d’une ville. Les populations existantes ne sont pas supprimées.
- Montagne accessible au paysan pour la pierre ; véhicules et cavaliers ont besoin de routes en montagne ou marais. Les machines ralentissent en forêt.
- L’amélioration campement → avant-poste ne réduit plus la résistance ni la production de vivres. Les améliorations de villes en pierre utilisent désormais cette ressource.

## Limites de la validation

Les tests vérifient les sources de ressources, les refus serveur, le départ à zéro, les prérequis, les plafonds, la migration et les contres militaires. Ils ne prouvent pas un équilibre parfait entre joueurs. Les rencontres réelles, les coalitions, les sièges prolongés et le rythme à 1 PA par minute nécessitent des parties longues. Une pénurie arrête la croissance ; elle ne supprime pas automatiquement les armées. Les chaînes industrielles mobilisent les cinq ressources existantes, sans jauges distinctes de pétrole ou de munitions.

## Unités

| Unité | PV / attaque / défense | Déplacement / portée | Places | Coût | Entretien par minute | Infrastructure requise (nombre) |
| --- | --- | --- | --- | --- | --- | --- |
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
| Garde | 15 / 2 / 5 | 2 / 1 | 5 | 45 or, 25 fer, 15 vivres | 0.21 or, 0.25 vivres | 2 |
| Archer | 7 / 4 / 1 | 2 / 3 | 5 | 35 or, 25 bois, 5 fer, 10 vivres | 0.19 or, 0.25 vivres | 1 |
| Chevalier | 10 / 5 / 2 | 5 / 1 | 5 | 70 or, 10 bois, 30 fer, 25 vivres | 0.34 or, 0.65 vivres | 2 |
| Engin de siège | 8 / 3 / 1 | 1 / 4 | 6 | 90 or, 65 bois, 40 fer, 10 vivres | 0.51 or, 0.25 vivres | 2 |

## Bâtiments

| Bâtiment | PV | Coût | Production brute / minute | Terrains | Prérequis |
| --- | --- | --- | --- | --- | --- |
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
