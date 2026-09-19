# Audit global d’équilibrage — 19 septembre 2026

Audit de la version locale actuelle, incluant les nouveautés non encore publiées. **Aucune valeur ni règle du jeu n’a été modifiée.** Les propositions ci-dessous sont à discuter avant implémentation. Objectif retenu : guerres de royaumes assez lentes, progression gratifiante, alliances utiles, élites puissantes avec des contres accessibles.

## Périmètre et méthode

- Catalogue inspecté : **289 types d’unités, 66 types de bâtiments**, cinq niveaux de bâtiments, cinq ressources.
- Lecture du calcul réel des revenus, prix, améliorations, recrutement, statistiques, terrain, entraînement, provisions, transports, missions, expéditions, défenses, nucléaire et décisions des bots.
- Deux parcours économiques utilisant les commandes serveur, 60 escarmouches déterministes, trois développements de bots sur 12 heures simulées, comparaison des récompenses d’expédition aux cinq niveaux, vérifications ciblées par commandes serveur.
- **899 tests existants réussis, 19 fichiers** : économie, progression, recrutement, combats, soutien, vivres, mer, expéditions, missions, transports, tourelles, remparts, terrains, héros, stratégie et développement des bots.
- Données : [résultats](../output/balance-audit-2026-09-19/results.json), [reproductions ciblées](../output/balance-audit-2026-09-19/probes.json). Scripts sans accès à la base ni au réseau : [audit.ts](../output/balance-audit-2026-09-19/audit.ts), [probes.ts](../output/balance-audit-2026-09-19/probes.ts).

Reproduction depuis la racine :

```sh
node --import tsx output/balance-audit-2026-09-19/audit.ts
node --import tsx output/balance-audit-2026-09-19/probes.ts
```

Les mondes de test sont synthétiques et ne touchent aucune sauvegarde. Les sommes de matériaux utilisées pour comparer des investissements ne constituent pas un taux de conversion entre ressources. Les résultats ne remplacent pas des parties longues entre humains ; aucune télémétrie de production n’a été consultée. Les variantes d’environnement du serveur, notamment `AP_INTERVAL_MS`, ne sont pas vérifiées ici.

## 1. Priorité critique : les expéditions peuvent court-circuiter l’économie

Le niveau d’une expédition prend le **maximum des niveaux de tous les bâtiments possédés**, sans distinguer un puits d’une infrastructure atomique. Le multiplicateur des récompenses passe de 1 à 4, 14, 45, puis **120**.

Reproduction avec les commandes BUILD/UPGRADE : construire et améliorer un puits jusqu’au niveau 5 coûte au total **48 or + 192 bois + 96 pierre, et 9 PA**. Toutes les commandes sont acceptées. Le financement et la case possédée sont fournis dans ce test : ce n’est pas une mesure du temps nécessaire pour les obtenir depuis un départ à zéro.

Dans le monde testé, ce seul puits rend disponibles notamment :

| Offre | Distance depuis la capitale | Or | Bois | Pierre | Fer | Vivres |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Reconnaissance | 134 | 333 360 | 259 280 | 203 720 | 166 680 | 296 320 |
| Récupération | 67 | 355 320 | 276 360 | 217 140 | 177 660 | 315 840 |
| Extraction | 67 | 568 512 | 442 176 | 347 424 | 284 256 | 505 344 |

Le trajet reste à effectuer. Cependant, ces sites n’ont pas de combat obligatoire, le héros est éligible aux interactions terrestres, et les gains dépassent volontairement le stockage sans être perdus. Les nouveaux tirages peuvent suivre immédiatement une victoire. À infrastructure donnée, « récupération » demande actuellement la même interaction locale que « reconnaissance », pour un coefficient supérieur de 50 % ; les distances et lieux proposés peuvent différer.

**Proposition :** déterminer un véritable palier d’aventure à partir de plusieurs jalons de développement ; calibrer les récompenses sur une économie de référence par palier et l’effort du trajet, avec un plafond. Garder de beaux trésors et la protection du surplus. Donner à la récupération une exigence supplémentaire explicite. Éviter de baser le gain directement sur le revenu instantané du joueur, trop facile à manipuler.

L’abandon est aussi affecté : la récupération ci-dessus demande **71 064 or et 63 168 vivres** pour sortir d’une mission pourtant accessible avec le seul puits. Sans moyens, l’abandon est refusé et bloque l’autre mission. Une sortie de secours pénalisée mais toujours possible mérite discussion.

Sources : `apps/server/src/expeditions.ts` (`expeditionOffers`, `expeditionInteraction`), `apps/server/src/missions.ts` (abandon).

## 2. Priorité élevée : réparation des bâtiments et sièges

REPAIR ne demande ni bâtisseur adjacent, ni dépôt, ni délai. Pour **1 PA, 10 or et 15 bois**, il rend jusqu’à **50 % des PV maximum**, quel que soit le matériau ou le prix du bâtiment.

| Rempart | PV max | Réparation maximale / ordre |
| --- | ---: | ---: |
| Bois | 100 | 50 |
| Pierre | 240 | 120 |
| Acier | 480 | 240 |
| Béton | 900 | 450 |
| Atomique | 1 600 | 800 |

Un mortier à neutrons entraîné au niveau 5 inflige **431–433 dégâts** à l’enceinte atomique pour **2 PA** sans autres bonus. Douze cycles ATTACK puis REPAIR ont été exécutés : le mur revient à **1 600 PV à chaque cycle**, pour seulement 120 or et 180 bois au total côté défenseur.

Ce scénario suppose que le défenseur réagit entre les tirs. Une salve de plusieurs ordres avant sa réaction ou une attaque pendant son absence change l’issue : on ne peut pas conclure que tous les sièges sont impossibles. Mais la réparation domine fortement une attaque soutenue à rythme égal.

**Proposition :** coût proportionnel au matériau, au palier et aux PV réparés ; réparation limitée ou ralentie après un dégât récent ; rôle utile pour les ingénieurs. Préserver la remise en état rapide et abordable hors combat. Retester les sièges avant de toucher aux PV des murs ou aux dégâts de l’artillerie.

Sources : `packages/game-rules/src/supplies.ts` (`repairPlan`), `apps/server/src/engine.ts` (REPAIR), reproductions ciblées.

## 3. Priorité élevée : multiplier les petits producteurs est très rentable

Les producteurs de base ont des améliorations particulièrement bon marché. Les bâtiments avancés produisent davantage sur une seule case, mais le prix par unité de production augmente beaucoup.

Exemple, construction et quatre améliorations incluses, hors prérequis :

| Production de bois | Bois/min | Or investi | Bois investi | Autres matériaux | PA construction + améliorations |
| --- | ---: | ---: | ---: | --- | ---: |
| 1 scierie niv. 5 | 64 | 144 | 240 | Aucun | 9 |
| 20 scieries niv. 5 | 1 280 | 2 880 | 4 800 | Aucun | 180 |
| 1 scierie occulte niv. 5 | 1 280 | 28 224 | 12 096 | 8 064 pierre + 9 408 fer | 9 |

Le total nominal des matériaux est **7,5 fois supérieur** pour la scierie occulte à débit égal. Elle économise 19 emplacements, beaucoup d’ordres et des déplacements : ce sont de vrais avantages, à conserver. Mais un joueur disposant d’espace et de temps a un fort intérêt à multiplier les scieries ordinaires.

À débit égal, vingt carrières ordinaires niv. 5 coûtent 9 600 matériaux contre 64 512 pour une carrière runique ; vingt mines ordinaires niv. 5, 14 400 contre 71 232 pour une mine abyssale. Les contraintes de terrain, la fiscalité territoriale et les prérequis ne sont pas inclus dans ces sommes.

**Proposition :** garder un départ généreux, puis rendre les améliorations 4–5 des producteurs de base moins dominantes et améliorer l’intérêt économique des filières industrielles/occultes. Éviter une hausse générale de tous les prix. Mesurer séparément rendement par ressource, par case et par PA.

## 4. Rythme économique : progression présente, coupure marquée vers le niveau 4

Deux parcours sans trésor, guerre ou adversaire, avec terrain favorable et présence continue :

| Jalon | Producteurs montés au niv. 3 | Producteurs montés au niv. 5 |
| --- | ---: | ---: |
| Premier marché | 22 min | 22 min |
| Arsenal niv. 3 | 194 min | 235,5 min |
| Arsenal niv. 4 | 514 min | 606 min |
| Arsenal niv. 5 | 659,5 min | 676,5 min |

Le début du modèle est situé après vingt PA de fondation, avec des récoltes déjà créditées. Les trajets après ce point ne sont pas simulés ; les chantiers sont préattribués. Ce sont des repères sur un parcours, **pas le temps minimal ou typique d’un joueur**. Les quelque onze heures finales sont des heures actives dans ce modèle.

La grande coupure avant le niveau 4 inclut la création de la chaîne occulte : elle ne correspond pas au seul devis du bouton d’amélioration. Tout monter immédiatement au niveau 5 retarde les jalons sur ce parcours, ce qui n’est pas forcément mauvais, mais invite à mieux expliquer les investissements utiles.

Production et entretien s’arrêtent hors ligne selon les règles de présence. Cela rend le temps connecté très déterminant ; c’est un choix existant, pas une erreur introduite par les derniers ajouts.

## 5. Vivres et entretien : dépense réelle, contrainte militaire limitée

Le ravitaillement apporte +10 % d’attaque pour huit actions offensives, avec un coût adapté au rôle et à l’époque. L’entretien est bien calculé pour les passagers aussi.

En revanche, une pénurie ramène simplement les stocks à zéro : **aucune baisse des statistiques ou limitation d’attaque**. Le test d’un char Mausolée sans aucun revenu ni stock pendant une heure laisse ses 440 PV et son attaque inchangés. La pénurie freine la population et les achats, mais pas l’armée déjà financée.

**Proposition à discuter :** une pénurie prolongée pendant la présence pourrait dégrader progressivement les bonus de campagne ou certains services, avec une période de grâce, sans destruction automatique des unités et sans dette hors ligne. Cela donnerait aux vivres un rôle stratégique sans transformer le jeu en corvée.

## 6. Combats : conserver les contres et le soutien plafonné

Tests de tirs sans terrain favorable, héros, rareté, soutien ni provisions :

| Attaquant | Cible | Dégâts/tir | Tirs suffisants au dégât minimum |
| --- | --- | ---: | ---: |
| Fantassin sans entraînement | Milice | 5–7 | 5 |
| Char Mausolée entraînement niv. 5 | Milice | 56–58 | 1 |
| Fusilier entraînement niv. 3 | Char Mausolée niv. 5 | 1–2 | 440 |
| Chasseur de blindés entraînement niv. 3 | Même char | 60–62 | 8 |
| Flak entraînement niv. 3 | Glocke Apocalypse niv. 5 | 50–52 | 13 |

Escarmouches serveur, 20 graines et initiative alternée par scénario :

- Six chasseurs de blindés battent un Mausolée : **20/20**. Prix du groupe : 2 280 or contre 7 550 pour le char, hors infrastructure et autres matériaux.
- Six fusiliers contre ce même char : **0/20**.
- Sept Flak contre une Glocke Apocalypse : **20/20**.

Ces unités sont immobiles et à portée dans la simulation : les manœuvres, obstacles et soins peuvent inverser le résultat. Les contres ne sont donc pas une garantie automatique de victoire.

Le Mausolée entraîné a une attaque de base finale 7,4 fois celle d’un fantassin neuf, conforme à l’écart recherché. Les bonus rares, vétérans, provisions, soutien, terrain et héros peuvent l’amplifier. La soustraction de défense crée parfois des dégâts planchers à 1–2 : l’écart des dégâts réellement infligés dépasse alors largement celui des statistiques.

Le soutien secondaire est limité à +15 % attaque/défense/PV et +1 déplacement/vision, avec rendement décroissant. C’est une bonne base à préserver. Le meilleur entraînement reste acquis après la perte du bâtiment ; le soutien secondaire disparaît. Ce comportement est intentionnel, mais permet aussi d’améliorer des recruteurs successivement puis de les démolir en gardant l’entraînement payé.

**Proposition :** conserver la structure des contres ; équilibrer les familles et leurs limites de ciblage plutôt qu’augmenter toutes les attaques. Surveiller les combats entre pairs de niveau 5 cumulant tous les bonus. L’audit ne prouve pas que chacune des 289 unités a une niche optimale.

## 7. Mer, transports, nucléaire et alliances

**Mer.** Les navires suivent une échelle de statistiques et de prix distincte de celle qui harmonise les unités terrestres. Un cuirassé atomique entraîné atteint 1 200 PV / 200 attaque contre 440 / 59,2 pour le Mausolée, mais coûte 100 000 or contre 7 550 et reste contraint à l’eau. Cela justifie des essais supplémentaires côte/flotte/DCA avant une baisse de puissance arbitraire. La population et l’entretien des navires sont relativement faibles pour cette puissance. Le Léviathan n’attaque que les navires ; le sonar et sa révélation temporaire sont de vraies contraintes.

**Pêche.** Les bateaux donnent 40 à 1 000 vivres par PA selon l’époque, contre 24 pour une récolte terrestre de base. L’action est limitée par le stockage et le navire atomique est cher. Le gain actif est cohérent dans son principe ; la nourriture doit toutefois avoir une utilité suffisante.

**Transports.** Le camion partage huit places et parcourt neuf points de déplacement ; l’avion-cargo douze places et seize points. Embarquer/débarquer coûte 1 PA par passager. Pour huit fantassins parcourant 60 cases de plaine à déplacement 3 : 160 PA de marche contre 23 PA via camion, hors recrutement et mise en place (8 + 7 + 8). C’est un gain utile. Sur une route continue connue, huit marches directes coûtent déjà huit PA : le transport n’a pas vocation à être rentable pour chaque trajet.

**Nucléaire.** Un tir coûte un million de chaque ressource et 10 PA, exige silo et réacteur niveau 5, annonce son impact cinq minutes à l’avance, puis impose six heures de recharge. Rayon 8 : **217 hexagones**. Ce sont de vrais freins. Ils perdent beaucoup de leur poids si les expéditions distribuent trop tôt des centaines de milliers de ressources. Corriger cette source avant de renchérir encore le missile. La reconstruction du terrain entier représente jusqu’à 434 PA de terrassement ; l’impact d’une frappe dépasse donc la seule perte des bâtiments.

**Alliances et présence.** Cinq joueurs coordonnés disposent chacun de leur régénération de PA, soit jusqu’à dix PA/min ensemble contre deux pour un royaume. Les tourelles n’attaquent que sur ordre et les royaumes restent attaquables hors ligne, conformément aux choix du projet. La protection initiale n’est que de dix minutes. Pour des guerres lentes, mieux vaut discuter préparation, avertissements et objectifs de campagne que réduire tous les dégâts. Ne pas changer la règle hors ligne sans accord.

## 8. Missions de conquête, déblocages et bots

Les recruteurs de combat ont désormais des déblocages aux cinq niveaux, sauf la base sous-marine qui commence volontairement au niveau 3. Les bâtiments purement civils ou médicaux n’ont pas nécessairement une nouvelle recrue par niveau.

Une victoire de conquête donne des ressources **et** transfère les survivants et bâtiments : le devis d’équilibrage doit comptabiliser les deux. La garnison riposte avec un défenseur à portée mais ne poursuit pas les attaquants. Les tirs de longue portée peuvent donc réduire fortement le danger dans certaines dispositions ; cela reste à mesurer sur des forteresses complètes. Les alliés peuvent contribuer mais le commanditaire reçoit les biens et le butin : un partage explicite serait utile pour la coopération.

Trois bots de personnalité défensive, sans ennemis, sur douze heures simulées :

- **31–32 bâtiments**, dont 24–25 constructions supplémentaires ; **3 bâtisseurs** chacun.
- **81–83 améliorations**, caserne niveau 4, unités de palier 4 ou 5.
- **Aucune commande refusée** dans ces essais.
- Environ **73–74 % des ordres sont des déplacements**. Cela signale un coût de marche important ; ce chiffre seul ne prouve pas une boucle inutile.
- Vers douze heures : ~300 vivres/min de surplus, 63 000–65 000 vivres en stock, peu d’or disponible.

Les bots commencent avec une installation préétablie ; ils ne sont pas comparables à un humain parti d’un campement. Les essais ne couvrent ni toutes les personnalités ni des guerres prolongées. Ils montrent néanmoins que le blocage « aucun paysan, aucun développement » n’apparaît plus ici. Priorité proposée : allocation économique et déplacements avant toute hausse du nombre d’actions.

## Ordre de travail conseillé, soumis à validation

1. Corriger l’accès aux paliers d’expédition, leurs récompenses et la sortie d’une mission devenue trop coûteuse à abandonner.
2. Revoir les réparations de siège ; comparer défense présente, salve coordonnée et assaut prolongé.
3. Rapprocher la rentabilité des filières productives sans durcir les premiers pas ; réduire les investissements intermédiaires peu gratifiants.
4. Donner aux vivres une contrainte militaire douce et mieux répartir les investissements des bots.
5. Mesurer les affrontements côtiers, les forteresses et les armées cumulant les bonus avant des retouches ciblées d’unités.

Conserver à ce stade : 40 PA au départ, plafond 20, un PA par 30 secondes, les contres spécialisés, les plafonds de soutien et l’intérêt des transports. **Aucune correction, aucun commit, aucun push ni déploiement n’a été effectué pendant cet audit.**
