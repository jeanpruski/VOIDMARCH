# Rencontres neutres

Les PNJ sont des rencontres PvE facultatives. Ils restent sur place et ne déclenchent jamais d’attaque. Un PNJ survivant riposte immédiatement contre son attaquant si sa portée et les règles de combat le permettent. Il ne poursuit personne. Combattre un PNJ ne retire pas la protection PvP du débutant.

## Apparition

- Une tentative avec **5 % de réussite toutes les 5 minutes**, par zone de 32 × 32 hexagones occupée par la capitale ou une unité d’un joueur connecté. Premier tirage à l’activation de la zone ; aucun rattrapage des périodes hors ligne.
- Maximum **1 PNJ par zone**, **30 dans le monde**, durée de présence **45 minutes**. En l’absence de plafond ou d’obstacle, cela correspond à environ une apparition toutes les 100 minutes par zone active.
- Seulement sur une plaine, forêt ou colline neutre, sans bâtiment, route ni lieu remarquable. Au moins 6 cases des capitales, 2 des unités, 8 des autres PNJ ; pas sur un événement disponible ou juste à côté.
- Chaque profil a la même probabilité. Le brouillard de guerre masque les rencontres non découvertes.

## Cinq profils

| Profil               | PV de base | Attaque | Défense | Portée | Butin de base              |
| -------------------- | ---------: | ------: | ------: | -----: | -------------------------- |
| Déserteur des brumes |         24 |       6 |       1 |      2 | 90 or, 70 vivres           |
| Pillard cuirassé     |         38 |       7 |       5 |      1 | 100 or, 85 bois, 65 pierre |
| Cultiste des ondes   |         28 |      10 |       1 |      3 | 140 or, 90 fer             |
| Égaré irradié        |         58 |       9 |       3 |      1 | 100 or, 140 fer, 90 vivres |
| Motard des cendres   |         36 |       8 |       3 |      2 | 120 or, 100 fer, 75 bois   |

Les rôles diffèrent : déserteur accessible, pillard blindé à courte portée, cultiste fragile mais offensif, mutant endurant et motard polyvalent. Les rencontres restent facultatives et immobiles.

À l’apparition : PV ±2 et attaque/défense ±1, puis multiplication selon le rang. Le butin suit le rang, la puissance tirée et une variation de ±10 %. Les statistiques et les gains exacts sont annoncés avant le combat et ne changent pas au rechargement.

| Rang    | Développement local | Statistiques × | Butin × |
| ------- | ------------------: | -------------: | ------: |
| Errant  |                   1 |              1 |       1 |
| Aguerri |                   2 |            1,4 |     2,5 |
| Vétéran |                   3 |              2 |       5 |
| Élite   |                   4 |              3 |      10 |
| Némésis |                   5 |            4,5 |      18 |

Le développement est celui du royaume humain le moins avancé à 16 cases du lieu (capitale ou unité vivante, y compris hors ligne). Cela protège les voisins débutants. Sans voisin identifié, rang 1. Les rencontres déjà présentes conservent leurs statistiques et récompenses jusqu’à leur expiration ; la densité diminue naturellement, sans supprimer une cible en cours de combat.

## Combat et récompenses

Sélectionner un PNJ permet de consulter ses statistiques, son butin et le temps restant. Le bouton d’attaque choisit une troupe ou une tourelle à portée ; le ciblage manuel habituel reste disponible. La confirmation affiche les dégâts possibles et la riposte estimée. Une attaque coûte les PA habituels ; la riposte ne consomme pas de PA supplémentaires.

Les ressources ne sont attribuées qu’à la mort du PNJ, avec une notification et une entrée au journal. Si plusieurs royaumes participent, le butin est partagé selon les dégâts réellement infligés, sans avantage au dernier coup. Les contributeurs encore existants reçoivent leur part même hors ligne. Aucun butin à l’expiration.

**65 % des nouveaux PNJ portent 1 à 3 PA**. Ils sont partagés selon la contribution et intégralement conservés, même au-delà de la réserve habituelle de 20 PA. La régénération naturelle reste suspendue au-dessus du plafond. Les ressources sont également conservées au-delà du stockage. Le montant annoncé est le butin total, pas une récompense pour chaque participant.

Les rencontres vaincues disparaissent de la carte et du panneau des événements. Les PNJ ne sont ni recrutables ni contrôlables. Les cinq figurines disposent d’un socle cohérent avec les unités existantes ; leurs sources et prompts sont dans [assets-npcs.md](assets-npcs.md).

## Technique et validation

Configuration dans `packages/config/src/npcs.ts`, apparition/récompenses dans `apps/server/src/npcs.ts`. Métadonnées persistées avec l’état du monde existant : aucune migration SQL supplémentaire.

`tests/npcs.test.ts` couvre les statistiques, la visibilité, la riposte, les tourelles, le partage du butin, les PA et les limites d’apparition. `tests/npcs.e2e.ts` vérifie les cinq textures, le parcours de combat, les récompenses, la disparition et l’affichage mobile avec un monde de test en mémoire.
