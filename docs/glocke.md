# Projet Glocke

Trois cloches volantes et un bâtiment de création portent le catalogue à **84 unités et 52 bâtiments**. Inspiration fictionnelle : [Die Glocke](https://fr.wikipedia.org/wiki/Die_Glocke), récit d’arme secrète et d’antigravité présenté comme non prouvé par la référence. L’adaptation garde les factions imaginaires, les matières industrielles sombres et les accents occultes du jeu.

## Accès en fin de progression

Construire un **Complexe des cloches** sur plaine ou ruines exige un **Réacteur noir**, une **Fonderie atomique** et un **Observatoire noir**. Leurs propres chaînes de prérequis restent obligatoires. Coût initial du complexe : 33 000 or, 7 500 bois, 10 500 pierre, 18 000 fer et 1 PA, avant réduction de faction. Il possède 750 PV de base, ne produit aucune ressource et ne tire pas automatiquement.

Le bâtiment débloque un modèle par niveau. Les évolutions coûtent 2 PA et les ressources du devis normal : ×2,5 le nouveau prix de base pour le niveau 2, puis ×5 pour le niveau 3, sans réduction de faction sur les améliorations. Le niveau est exigé sur le complexe sélectionné ; posséder un autre complexe plus avancé ne permet pas de recruter le modèle III depuis un complexe niveau 1. Les infrastructures de soutien doivent encore appartenir au joueur au recrutement.

## Trois modèles

| Modèle                           | Niveau du complexe | PV de base | Attaque / siège de base | Défense | Déplacement / portée | Mobilisation | Prix de recrutement                       |
| -------------------------------- | -----------------: | ---------: | ----------------------: | ------: | -------------------: | -----------: | ----------------------------------------- |
| Die Glocke I — Vril              |                  1 |        200 |                 52 / 70 |      10 |                5 / 4 |           18 | 27 000 or, 16 500 fer, 3 000 bois, 2 250 vivres |
| Die Glocke II — Nacht            |                  2 |        260 |                60 / 110 |      14 |                4 / 5 |           22 | 39 000 or, 24 000 fer, 4 200 bois, 3 000 vivres |
| Die Glocke III — Götterdämmerung |                  3 |        320 |                64 / 145 |      16 |                3 / 6 |           26 | 57 000 or, 36 000 fer, 5 400 bois, 3 900 vivres |

Chaque recrutement coûte 1 PA. Les statistiques ci-dessus précèdent l’entraînement. Au niveau 2, le complexe donne +25 % ; au niveau 3, +60 %, aux PV, à l’attaque, aux dégâts de siège et à la défense. La cloche III sort donc au minimum avec **512 PV, 102,4 d’attaque et 232 de siège**, avant rareté. Les cloches déjà créées bénéficient des améliorations en conservant leur proportion de blessures. La chance rare de 1 % et son bonus habituel restent applicables.

## Combat et contraintes

- Tir manuel à **2 PA**, sur une seule cible visible. Vril et Götterdämmerung émettent des décharges vertes ; Nacht projette un orbe violet. Aucun dégât de zone ni tir automatique.
- Vol au-dessus des terrains et remparts, sans capture de cases. Les tirs aériens franchissent les remparts ; les trêves et protections habituelles restent respectées.
- Les défenses antiaériennes bénéficient de leurs bonus contre elles. La mobilité diminue avec la puissance ; leur prix, mobilisation et entretien en or/fer/vivres sont élevés.
- Machines mécaniques : réparations avec or et fer, soins biologiques inapplicables. Pas de ressource supplémentaire.
- Onglet **Cloches occultes**, recherche par nom ou complexe, palier **Projet Glocke**, coûts et niveau minimal visibles. Les trois modèles ne sont pas inclus dans le filtre des 36 unités atomiques existantes.

## Intégration et validation

Les nouvelles clés utilisent les mécanismes existants de sauvegarde, recrutement, attaques, rareté, amélioration et animation. Aucune migration SQL. Le contrôle des infrastructures et du niveau de recrutement est partagé entre serveur, catalogue et prévisualisation optimiste.

`tests/glocke.test.ts` vérifie la construction avancée, les refus sans prérequis ou niveau, les coûts, les statistiques des recrues, les améliorations, les tirs aériens et les contres. Les suites communes testent aussi leurs déplacements et les 84 recrutements. `tests/glocke.e2e.ts` vérifie les trois niveaux successifs, le recrutement, les images et le catalogue mobile.

Les quatre figurines et leurs prompts sont documentés dans [assets-glocke.md](assets-glocke.md).
