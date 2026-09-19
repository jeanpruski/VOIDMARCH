# Équilibrage global v0.8 — progression et logistique

Suite à l’[audit du 19 septembre](audit-global-2026-09-19.md), les changements visent un départ accessible, des investissements utiles et un accès au très haut niveau qui exige plusieurs filières. Les valeurs ne prétendent pas garantir un équilibre parfait entre les 289 unités : les parties humaines restent indispensables pour affiner les résultats.

## Développement du royaume

40 PA au départ, plafond normal de 20 et régénération de 1 PA par 30 secondes conservés. Le code de test peut toujours contourner les PA. La présence et la vulnérabilité hors ligne ne changent pas.

Les jalons sont cumulatifs et exigent des bâtiments encore debout :

| Palier           | Infrastructures supplémentaires                                                              |
| ---------------- | -------------------------------------------------------------------------------------------- |
| 1 — Fondations   | Aucune                                                                                       |
| 2 — Manufactures | Atelier 2 et marché 2                                                                        |
| 3 — Industrie    | Atelier 3, forge 3, et scierie à vapeur / carrière mécanisée / mine industrielle 2           |
| 4 — Occultisme   | Laboratoire occulte 3, raffinerie 3, et scierie occulte / carrière runique / mine abyssale 3 |
| 5 — Atome        | Réacteur noir 4, laboratoire des isotopes 4 et raffinerie 4                                  |

Ces jalons règlent le niveau des nouvelles expéditions, les constructions avancées et les recrutements avancés. Les améliorations militaires vers les niveaux 4 et 5 demandent respectivement les paliers Industrie et Occultisme ; les recrues atomiques exigent ensuite Atome. Les prérequis propres à chaque unité restent applicables. Les producteurs, capacités de stockage et bâtisseurs permettent de préparer l’étape suivante : aucune dépendance circulaire dans les deux parcours payants testés.

Le panneau Royaume affiche le palier actuel et les infrastructures manquantes. Les catalogues et confirmations utilisent les mêmes règles que le serveur et montrent le motif du blocage.

Un bâtiment requis détruit peut refermer des accès. Les unités déjà recrutées et leurs entraînements restent acquis ; il faut reconstruire la filière pour recruter de nouveau ses unités avancées.

## Production et investissement

Les coûts initiaux des producteurs restent inchangés. Pour les producteurs d’entrée de gamme (palier économique 0–1), les multiplicateurs de production deviennent **1 / 1,8 / 3 / 4,5 / 6**, et les coefficients de prix des quatre améliorations **0,8 / 1,4 / 8 / 20**. Les producteurs avancés conservent leur progression jusqu’à ×8 et leurs améliorations plus rentables.

Exemple au niveau 5, construction et améliorations incluses, hors prérequis :

| Producteur       | Débit par minute | Somme nominale des matériaux investis |
| ---------------- | ---------------: | ------------------------------------: |
| Scierie          |          48 bois |                                 1 248 |
| Scierie à vapeur |         384 bois |                                10 560 |
| Scierie occulte  |       1 280 bois |                                57 792 |

À débit égal, la filière occulte coûte désormais environ 1,7 fois la somme des matériaux des scieries ordinaires, contre 7,5 auparavant, tout en économisant beaucoup de cases et de PA. Pour la pierre et le fer, l’écart tombe aussi sous ×2. Cette somme n’est pas un taux de conversion entre ressources : le terrain, les prérequis, la fiscalité et le stockage comptent toujours.

## Expéditions et abandon

Un puits niveau 5 ne donne plus accès aux trésors atomiques. Le gain dépend des vrais jalons, de la distance, de l’objectif et du milieu ; il reste indépendant du revenu instantané, donc ne peut pas être amplifié en manipulant un stock ou une production juste avant acceptation.

Base or par palier : **300 / 900 / 3 000 / 9 000 / 24 000**, multipliée par `0,65 + distance/150`, puis ×1,4 en récupération ou ×2,2 en extraction, et ×1,25 en mer. Les autres ressources représentent 80 % / 65 % / 50 % / 90 % de l’or pour bois / pierre / fer / vivres. À 200 cases, une extraction maritime atomique garantit au maximum 130 900 or par la formule (jusqu’à 163 625 avec le trésor surprise de +25 %), avec ses autres matériaux. Le surplus au-delà du stockage est toujours conservé.

Reconnaissance et livraison coûtent 1 PA ; récupération : **3 PA + 40 / 120 / 400 / 1 000 / 2 500 vivres** selon le palier. Le participant qui effectue l’action paie ; le commanditaire reçoit toujours le trésor et le trophée. Le devis reste visible avant le voyage et lors de l’interaction.

Les missions de conquête tiennent également compte des jalons ; une flotte isolée ne suffit pas à créer une mission navale atomique. Les unités et bâtiments ralliés restent une partie importante du butin, avec leur population et leur entretien. Le partage du butin entre alliés n’a pas été changé.

L’abandon reste possible même sans ressources : paiement limité aux fonds disponibles, puis **5 à 30 minutes** sans nouvelle mission si le paiement est incomplet, proportionnellement au manque. Paiement intégral : aucun délai. Aucun emprunt ni dette, aucune perte des troupes du joueur. Le délai vaut pour les deux catégories et survit au rechargement.

## Sièges, soins et garnisons

- Réparer un bâtiment coûte 1 PA et ses matériaux, à hauteur de 20 % de son investissement nominal, proportionnellement aux PV restaurés. Les devis sont partagés entre serveur, client et bots. Pour un rempart évolué, le matériau courant sert de référence.
- Pendant les 90 secondes après un dégât : restauration limitée à **10 % des PV max d’un bâtiment**, 15 % pour une unité ou 20 % avec provisions ; **30 secondes entre deux réparations**. Aucune amélioration permettant de restaurer intégralement un bâtiment sous le feu.
- Hors combat : jusqu’à 50 % des PV, ou 75 % pour une troupe approvisionnée. Les sorts de soin existants conservent leurs règles.
- Si aucun défenseur de mission ne peut riposter, un seul peut avancer d’au plus deux points de mouvement vers l’attaquant, en restant près du site. Il respecte les murs et les cases occupées. Aucun raid autonome vers une capitale.

Dans le scénario de l’audit, le mortier à neutrons détruit désormais le rempart atomique après **5 tirs en salve ou 6 tirs espacés**, malgré les réparations immédiates autorisées. Auparavant, chaque tir était entièrement effacé pour 10 or et 15 bois. C’est un duel synthétique : pas de tourelle, garnison, héros ou contre-attaque contre le mortier.

## Vivres, marine et bots

Après épuisement des réserves : **−10 % d’attaque après 10 minutes actives de pénurie**, puis **−20 % après 30 minutes**. Cela affecte aussi les passagers, recrues et captures, jamais les héros, PNJ, bâtisseurs ou unités sans attaque. Aucun dégât ni décès. Une minute active correctement alimentée efface deux minutes de pénurie ; cumul plafonné à 45 minutes. Aucun cumul pendant l’arrêt de l’économie hors ligne. Les provisions de campagne restent un bonus séparé.

Les grands navires de combat demandent davantage de population et d’entretien : cuirassé atomique **22 places**, Léviathan **17**. Transports et bateaux de pêche gardent leur capacité. Les dégâts navals n’ont pas été réduits uniformément : les tests de flotte confirment des contres antérieurs moins coûteux.

Les bots conservent **3 à 10 décisions toutes les dix minutes**, se dotent des jalons manquants et limitent les améliorations agricoles quand le surplus est suffisant. Sur trois mondes défensifs pendant 24 heures : 39 bâtiments, trois bâtisseurs chacun, aucun ordre rejeté ; surplus alimentaire final 30,4–34,9/min. Une grande part de leurs ordres reste consacrée à la marche et à l’exploration.

## Mesures et validation

Deux parcours économiques règlent réellement les achats, améliorations, stockage et PA avec le moteur serveur. Départ après les récoltes de fondation ; sites favorables préattribués et trajets suivants exclus. Présence continue, ni guerre ni trésor, pas d’optimisation exhaustive.

| Jalon                  | Producteurs montés au niveau 3 | Producteurs montés au niveau 5 |
| ---------------------- | -----------------------------: | -----------------------------: |
| Premier marché         |                         22 min |                         22 min |
| Arsenal 3              |                        194 min |                      457,5 min |
| Arsenal 5              |                      723,5 min |                        948 min |
| Complexe des cloches 5 |                    2 262,5 min |                    1 962,5 min |

Les producteurs coûteux retardent le premier armement mais accélèrent la fin du parcours. Les **32,7–37,7 heures actives** finales sont des repères pour ces scénarios, pas un délai imposé, minimum ou garanti à tous les joueurs.

Cent escarmouches, vingt graines par scénario, initiative alternée, unités immobiles à portée :

- Six chasseurs de blindés 3 battent un Mausolée 5 : 20/20 ; six fusiliers 3 : 0/20.
- Sept Flak 3 battent une Glocke Apocalypse 5 : 20/20.
- Sept sous-marins des profondeurs 3 battent un cuirassé atomique 5 : 20/20, pour 59 500 or de recrutement contre 100 000.
- Deux sous-marins chasseurs 4 battent ce cuirassé : 20/20.

Ces essais ne modélisent pas toutes les manœuvres, distances initiales ou interventions alliées. La DCA n’est pas un contre universel aux coques blindées ; les dégâts côtiers par famille sont aussi consignés.

Tests : progression, facturation et refus sans mutation, cohérence des prédictions, réparation sous le feu, famine fragmentée ou hors ligne, recrutement/capture/passagers, abandon sauvegardé, accès aux deux tableaux de missions, déplacement défensif et contres navals. Chrome couvre les panneaux de jalons, les raisons de blocage, les vivres, les soins, les missions et l’abandon sans fonds, y compris sur petit écran. Compilation de production réussie ; l’avertissement habituel sur les gros fichiers JavaScript demeure. Les tests de base de données conditionnels ne sont pas exécutés ici.

Reproduction sans toucher aux comptes :

```sh
npm test
npm run build
node --import tsx scripts/simulate-balance-v08.ts
# Serveur Vite local lancé pour les contrôles Chrome :
npx playwright test tests/balance-v08.e2e.ts tests/missions.e2e.ts tests/supplies.e2e.ts
```

[Résultats chiffrés](../output/balance-v08/results.json) · [Bots sur 24 heures](../output/balance-v08/bots-24h.json).

## Application aux sauvegardes

Aucune remise à zéro ni migration SQL. Les champs ajoutés sont facultatifs : absence de pénurie ou de dernier dégât signifie aucun malus initial. Les stocks, bâtiments, blessures, unités et entraînements existants sont conservés. Les producteurs ordinaires 4–5 utilisent immédiatement le nouveau rendement et les grands navires le nouvel entretien. Les nouvelles constructions, améliorations et recrues utilisent les nouveaux prérequis et tarifs. Les missions déjà acceptées gardent leurs récompenses promises ; les nouvelles offres sont recalculées. Aucun remboursement rétroactif des achats.

Changements locaux à déployer après publication du code ; aucune modification du serveur de production effectuée pendant cet équilibrage.
