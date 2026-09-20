# Époques du royaume

Les nouveaux royaumes commencent au **Moyen Âge (époque 1)**. Une époque acquise est enregistrée dans la sauvegarde ; perdre un bâtiment ou recharger la page ne la fait pas redescendre. Aucun bâtiment ni type d’unité n’est supprimé.

| Époque à ouvrir          | Trophées cumulés | Infrastructures de l’époque précédente                                            |      Or |   Bois | Pierre |     Fer | Vivres |
| ------------------------ | ---------------: | --------------------------------------------------------------------------------- | ------: | -----: | -----: | ------: | -----: |
| 2 — Renaissance / Empire |                1 | Atelier 1, Marché 1                                                               |     800 |    600 |    400 |     250 |    500 |
| 3 — Guerre industrielle  |                5 | Atelier 2, Forge 2, Scierie à vapeur ou Carrière mécanisée ou Mine industrielle 2 |   6 000 |  3 500 |  2 500 |   3 000 |  2 500 |
| 4 — Technologie occulte  |               20 | Atelier 3, Raffinerie 3, Relais radio 3                                           |  30 000 | 15 000 | 12 000 |  20 000 | 12 000 |
| 5 — Ère atomique         |               50 | Laboratoire occulte 4, Raffinerie 4, Observatoire noir 4                          | 150 000 | 60 000 | 60 000 | 100 000 | 50 000 |

Dans **Royaume**, les conditions, coûts et éventuels problèmes de stockage sont affichés avant le bouton « Passer à l’époque suivante · 5 PA ». Les ressources sont débitées une fois, les trophées sont conservés. Les époques se franchissent dans l’ordre. Un double clic, une requête forgée, un autre propriétaire ou un stock insuffisant ne permettent pas de contourner ces règles. Le client utilise les mêmes règles que le serveur.

## Constructions, formations et apparence

Chaque bâtiment possède une époque minimale explicite, indépendante de son prix. Le garage, les chars et les avions demandent l’époque 3 ; les installations occultes avancées l’époque 4 ; les infrastructures nucléaires l’époque 5. Les infrastructures de base, ports, ateliers, bibliothèques et forges restent médiévaux. Les producteurs mécanisés sont accessibles à l’époque 2. L’héliport exige le laboratoire occulte, le garage et le relais radio, sans dépendre du laboratoire isotopique de l’époque suivante.

Le niveau maximal des bâtiments et tourelles correspond à l’époque acquise. Les fondations camp → avant-poste → village restent possibles au niveau 1. Les coûts et bénéfices individuels d’amélioration restent applicables. Le garage peut être construit au niveau 1 à l’époque 3 puis amélioré jusqu’au niveau 3 ; son apparence reste industrielle à ces trois niveaux. Les bâtiments navals utilisent au minimum le visuel de leur époque d’introduction, y compris dans les catalogues et sur la carte.

Chaque unité affiche son époque requise et, séparément, le niveau de son bâtiment formateur. Les exigences communes suivent l’époque la plus avancée de ses infrastructures ; une route alternative ne contourne jamais ce verrou. Les unités radioactives restent atomiques. Les chevaliers et cavaliers légers peuvent être formés dans l’écurie médiévale de niveau 1 ; les cuirassiers restent au niveau 2. Le terrassier mécanisé attend l’époque 3. Les anciens recrutements restent possibles aux époques suivantes. « Disponibles maintenant » reste coché par défaut.

Les missions et expéditions suivent l’époque acquise ; les conquêtes gardent aussi leur condition de niveau militaire. Les offres exceptionnelles à +1 restent possibles. Leurs panneaux renvoient au passage volontaire dans Royaume, sans promettre de déblocage automatique à l’obtention d’un trophée.

## Sauvegardes et bots

`Realm.era = { version: 1, level }` est persisté dans le JSON du monde : aucune migration SQL supplémentaire. Une migration idempotente traite les royaumes et leurs archives qui ne possèdent pas encore ce champ. Elle conserve le maximum des anciens déblocages, des niveaux/époques des bâtiments et tourelles et des époques des unités possédées, passagers compris. Elle n’offre aucune ressource et ne détruit aucun actif. Les nouveaux comptes ne bénéficient pas de cette reprise.

Les bots débutent eux aussi avec une capitale médiévale. Ils préparent les infrastructures et le stockage, réservent les ressources puis exécutent le même passage payant ; seule la condition de trophées est levée pour eux. Un passage compte dans leurs décisions ordinaires.

## Vérifications

Tests de toutes les chaînes de prérequis, classification des 289 unités, passage des quatre époques, coûts/PA, rejets atomiques sans débit, migration des sauvegardes/archives, persistance, parité client/serveur et contrôles du navigateur sur ordinateur/mobile. Les simulations économiques paient également les passages et le stockage nécessaire. Elles supposent les trophées déjà acquis, sans adversaire ni temps de trajet : leurs durées ne sont pas une promesse de temps de partie. Un parcours progressif de producteurs niveau 3 atteint le complexe Glocke niveau 5 en environ 72 heures de production active ; maximiser trop tôt les producteurs dans le parcours niveau 5 porte ce total à environ 162 heures. Les récompenses de missions, échanges et butins ne sont pas inclus.
