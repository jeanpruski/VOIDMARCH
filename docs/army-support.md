# Entraînement et soutien militaire

Le meilleur entraînement reste la base commune aux PV, attaque et défense. Une unité conserve le meilleur entraînement déjà acquis. Les autres bâtiments améliorés apportent désormais un soutien complémentaire aux types qu’ils peuvent effectivement recruter à leur niveau actuel. Les bâtiments de niveau 1 ne fournissent aucun complément.

## Rendement et plafonds

Par type d’unité, les bâtiments de formation sont classés par entraînement puis niveau. Parmi ceux capables de recruter cette unité et de niveau 2 minimum, un bâtiment principal est réservé ; les suivants contribuent `(niveau − 1)` points, pondérés à 100 %, 60 %, 40 %, puis 20 %. Le total est plafonné à 10 points. Identifiants dédupliqués, bâtiments détruits exclus, calcul séparé par propriétaire.

| Rôle                  | Attaque par point             | Défense par point      | PV par point            | Palier déplacement | Palier vision             |
| --------------------- | ----------------------------- | ---------------------- | ----------------------- | ------------------ | ------------------------- |
| Infanterie de contact | 1,5 %                         | 3 %                    | 2 %                     | 6                  | 6                         |
| Tireurs / siège       | 3 %                           | 1,5 % (3 % si blindés) | 2 % (3 % si mécaniques) | 6 (4 si mobiles)   | 4 (6 si volants)          |
| Cavaliers / volants   | 2,5 % (3 % si tir à distance) | 1,5 % (3 % si blindés) | 2 % (3 % si mécaniques) | 4                  | 6 (4 si tireur terrestre) |
| Transports            | aucune                        | 1,5 % (3 % si blindés) | 3 %                     | 4                  | aucun                     |

Plafonds des compléments : **+15 % attaque, +15 % défense, +15 % PV, +1 point de déplacement, +1 case de vision**. Les pourcentages sont appliqués une seule fois aux statistiques entraînées et rares ; l’expérience reste prise en compte. Ils ne modifient ni portée de tir, ni capacités de transport, ni prix en PA. Un point de déplacement n’annule pas les coûts des terrains, les obstacles ou les règles des routes. Les transports gardent leur faible vision. Héros, bâtisseurs et PNJ exclus.

## Terrains

Les affinités déjà présentes restent propres à chaque unité : forêt, plaines, montagnes, ruines, etc. Tous les 2 points de soutien ajoutent 1 point de pourcentage à une affinité positive, maximum 5. Exemple : un rôdeur à +30 % d’attaque en forêt peut atteindre +35 %. Une composante nulle reste nulle ; aucun avantage hors des terrains prévus. Les volants n’obtiennent pas d’affinité terrestre. Le biome ne modifie pas ces affinités de combat. Certaines unités ont en plus une adaptation innée de déplacement à leur biome (voir `biome-adaptations.md`), indépendante du soutien.

## Cycle de vie et interface

Les compléments dépendent des infrastructures encore possédées : démolition, destruction, capture et transferts recalculent les soutiens. Aucun cumul obtenu en reconstruisant le même bâtiment. Les troupes existantes, nouvelles et embarquées utilisent les mêmes règles. Le ratio de PV est conservé lorsque le maximum change, sans soin gratuit ; rareté et expérience restent conservées.

Les sauvegardes existantes sont actualisées à leur chargement, les actions et la simulation resynchronisent les unités. Pas de migration SQL, réinitialisation ou perte de progression. Les archives historiques restent des archives ; au retour des unités dans le monde, leur soutien est recalculé.

Le recrutement affiche les statistiques complètes et les affinités renforcées. La fiche de troupe distingue entraînement et soutien. Avant une amélioration, les changements exacts sont regroupés par types de troupes, avec leurs noms consultables et les règles de cumul. Un plafond ou un niveau ne donnant pas encore de complément est signalé.

Validation : rendement décroissant, plafonds sur tout le catalogue, monotonie des améliorations, blessures, perte d’infrastructures, passagers, affinités, recrutement et prévision optimiste, déplacements individuels/groupés et vision. Vérification navigateur des gains annoncés et des fiches de recrutement.

## Origine des bonus dans la fiche d’unité

Le badge d’entraînement des troupes possédées ouvre un détail avec le bâtiment qui assure actuellement le palier principal, son niveau et ses coordonnées. Les bâtiments secondaires sont listés dans l’ordre du rendement décroissant, avec leur contribution effective après plafonds. La somme des contributions correspond au soutien appliqué ; les paliers communs apparaissent sur le bâtiment qui les fait franchir dans cet ordre.

Le détail distingue les affinités innées, leur renfort militaire, la rareté et l’expérience. Si l’entraînement conservé dépasse celui des bâtiments actuels, le panneau le signale sans inventer d’origine historique (celle-ci n’est pas enregistrée). Aucun détail des infrastructures ennemies n’est révélé. Aucune modification de l’équilibrage.
