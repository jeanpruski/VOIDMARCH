# Rencontres neutres

Les PNJ sont des rencontres PvE facultatives. Ils restent sur place et ne déclenchent jamais d’attaque. Un PNJ survivant riposte immédiatement contre son attaquant si sa portée et les règles de combat le permettent. Il ne poursuit personne. Combattre un PNJ ne retire pas la protection PvP du débutant.

## Apparition

- Une tentative avec **20 % de réussite toutes les 5 minutes**, par zone de 32 × 32 hexagones occupée par la capitale ou une unité d’un joueur connecté. Premier tirage à l’activation de la zone ; aucun rattrapage des périodes hors ligne.
- Maximum **2 PNJ par zone**, **60 dans le monde**, durée de présence **45 minutes**. En l’absence de plafond ou d’obstacle, cela correspond à environ une apparition toutes les 25 minutes par zone active.
- Seulement sur une plaine, forêt ou colline neutre, sans bâtiment, route ni lieu remarquable. Au moins 6 cases des capitales, 2 des unités, 5 des autres PNJ ; pas sur un événement disponible ou juste à côté.
- Chaque profil a la même probabilité. Le brouillard de guerre masque les rencontres non découvertes.

## Cinq profils

| Profil               | PV de base | Attaque | Défense | Portée | Butin de base             |
| -------------------- | ---------: | ------: | ------: | -----: | ------------------------- |
| Déserteur des brumes |         26 |       7 |       2 |      2 | 25 or, 20 nourriture      |
| Pillard cuirassé     |         40 |       9 |       4 |      1 | 30 or, 25 bois, 15 pierre |
| Cultiste des ondes   |         34 |      11 |       3 |      3 | 40 or, 20 fer             |
| Égaré irradié        |         54 |      12 |       5 |      1 | 35 fer, 25 nourriture     |
| Motard des cendres   |         42 |      10 |       4 |      2 | 35 or, 25 fer, 15 bois    |

À l’apparition : PV ±2, attaque/défense ±1, ressources ±20 %. Les statistiques exactes sont visibles avant le combat. Les rencontres dangereuses demandent des troupes préparées ; attaquer hors de portée empêche la riposte.

## Combat et récompenses

Sélectionner un PNJ permet de consulter ses statistiques, son butin et le temps restant. Le bouton d’attaque choisit une troupe ou une tourelle à portée ; le ciblage manuel habituel reste disponible. La confirmation affiche les dégâts possibles et la riposte estimée. Une attaque coûte les PA habituels ; la riposte ne consomme pas de PA supplémentaires.

Les ressources ne sont attribuées qu’à la mort du PNJ, avec une notification et une entrée au journal. Si plusieurs royaumes participent, le butin est partagé selon les dégâts réellement infligés, sans avantage au dernier coup. Les contributeurs encore existants reçoivent leur part même hors ligne. Aucun butin à l’expiration.

**15 % des PNJ portent des PA** : généralement 1, parfois 2. Ces PA sont également partagés et plafonnés à 15 pour chaque bénéficiaire, sans retirer un éventuel surplus de départ. Le montant annoncé est le butin total, pas une récompense pour chaque participant.

Les rencontres vaincues disparaissent de la carte et du panneau des événements. Les PNJ ne sont ni recrutables ni contrôlables. Les cinq figurines disposent d’un socle cohérent avec les unités existantes ; leurs sources et prompts sont dans [assets-npcs.md](assets-npcs.md).

## Technique et validation

Configuration dans `packages/config/src/npcs.ts`, apparition/récompenses dans `apps/server/src/npcs.ts`. Métadonnées persistées avec l’état du monde existant : aucune migration SQL supplémentaire.

`tests/npcs.test.ts` couvre les statistiques, la visibilité, la riposte, les tourelles, le partage du butin, les PA et les limites d’apparition. `tests/npcs.e2e.ts` vérifie les cinq textures, le parcours de combat, les récompenses, la disparition et l’affichage mobile avec un monde de test en mémoire.
