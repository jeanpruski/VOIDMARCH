# Économie v0.5 — investissements et fin de progression

Les améliorations prélevaient déjà les ressources côté serveur. Ce changement augmente leurs prix et rend le débit explicite dans la fenêtre de confirmation : coût, stock actuel, manque éventuel et stock après paiement. L’affichage anticipé et le serveur partagent le même devis. Les PA illimités ne dispensent jamais du paiement en ressources.

## Prix de construction et recrutement

Multiplicateurs par rapport au catalogue v0.4, appliqués à chaque ressource puis arrondis au supérieur :

| Progression | Bâtiments | Unités |
| --- | ---: | ---: |
| Fondations et démarrage | ×1 | ×1 |
| Premiers développements civils / médiévaux | ×1,5 | — |
| Ateliers, logistique, savoir / armée médiévale | ×2,5 | ×2,5 |
| Industrie | ×4 | ×4 |
| Industrie lourde et occulte | ×7 | ×7 pour l’occulte |
| Atomique et sanctuaire draconique | ×10 | ×10 pour l’atomique |
| Réacteur noir, fonderie atomique / Apocalypse | ×12 | ×12 |
| Projet Glocke | ×15 | ×15 |

La répartition exhaustive est dans `packages/config/src/economy.ts` et les paliers d’unités dans `progression.ts`. Les fantassins, archers, paysans et spécialistes civils ordinaires gardent leurs prix. Le premier paysan reste gratuit ; scierie, carrière et mine de départ restent accessibles sans leurs propres minerais. Les contres industriels sont renchéris avec leur palier, tout en restant beaucoup moins chers que les élites atomiques.

Exemples hors réduction de faction :

| Objet | Ancien prix en or | Nouveau prix en or |
| --- | ---: | ---: |
| Laboratoire des isotopes | 440 | 4 400 |
| Fonderie atomique | 1 250 | 15 000 |
| Complexe des cloches | 2 200 | 33 000 |
| Die Glocke III | 3 800 | 57 000 |

Le fer, bois, pierre et les vivres des devis sont multipliés dans les mêmes proportions. Une Glocke III demande aussi 36 000 fer, 5 400 bois et 3 900 vivres. Les prix complets, les productions et les chaînes d’accès figurent dans [l’audit généré](balance-audit.md).

## Améliorations payantes

- Bâtiment ordinaire : niveau 1 → 2 = **2,5 fois son nouveau prix initial** ; niveau 2 → 3 = **5 fois son nouveau prix initial**. Chaque étape coûte en plus **2 PA**. Le paiement du niveau précédent n’est pas inclus dans le suivant.
- Campement → avant-poste : 20 or, 60 bois, 30 vivres.
- Avant-poste → village : 120 or, 135 bois, 60 pierre, 30 fer, 60 vivres.
- Village → ville : 300 or, 240 bois, 120 pierre, 120 fer, 150 vivres.
- Ville → niveau 3 : 1 200 or, 960 bois, 480 pierre, 480 fer, 600 vivres.
- Palissade → pierre : 98 pierre ; pierre → acier : 225 fer. La route et la tourelle restent présentes.
- Le complexe des cloches demande désormais 82 500 or au passage au niveau 2, puis 165 000 au passage au niveau 3, en plus des autres ressources et PA.

Les prérequis de population restent des conditions, sans consommation d’habitants. Les améliorations continuent d’entraîner les troupes déjà créées. Les statistiques de combat, les rendements et leurs multiplicateurs restent inchangés : le frein supplémentaire est l’investissement, et non une perte de puissance ou de production après achat. Les frais d’entretien restent aux valeurs v0.4 ; ils sont découplés de l’inflation du prix de recrutement afin de ne pas multiplier rétroactivement les dépenses des armées existantes par quinze. Les tourelles conservent leur tarification propre.

## Stockage et accès aux projets coûteux

Capacité ajoutée **par ressource**, en plus des 800 de base :

| Infrastructure | Niveau 1 | Niveau 2 | Niveau 3 |
| --- | ---: | ---: | ---: |
| Grenier | 500 | 2 000 | 8 000 |
| Entrepôt | 1 000 | 4 000 | 16 000 |
| Gare | 1 500 | 7 500 | 30 000 |

Les capacités s’additionnent. Le premier entrepôt et ses améliorations sont payables avec les capacités précédentes. Une gare entièrement améliorée devient ensuite accessible ; plusieurs gares permettent d’économiser pour les plus gros projets. Les menus indiquent lorsqu’un coût restant à réunir dépasse le stockage actuel et conseillent ces infrastructures. Un stock exceptionnel déjà supérieur au plafond reste utilisable.

## Sauvegardes et validation

La version d’équilibrage passe de 2 à 3. Aucun paiement rétroactif, aucune suppression de ressources, de bâtiments ou d’unités. Les proportions de blessures et l’entraînement des sauvegardes v2 ne sont pas recalculés. Les remboursements de démolition déjà enregistrés restent inchangés ; les coûts historiques manquants sont enregistrés avec l’ancien catalogue avant application du nouveau. Les archives suivent la même règle. Les anciennes sauvegardes v1 passent aussi par leur migration de statistiques initiale, une seule fois.

Les tests couvrent le débit exact de chaque devis d’amélioration, le refus atomique en cas de manque, la concordance frontend/serveur, le stockage nécessaire à la fin de progression et la migration idempotente. Le parcours navigateur Glocke contrôle les prix, le paiement des évolutions et recrutements ainsi que la fenêtre sur mobile. Ces contrôles garantissent les règles ; le rythme d’une longue partie reste à ajuster à partir du jeu réel.
