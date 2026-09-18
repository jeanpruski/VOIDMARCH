# Progression v0.4 — économie et puissance militaire

> Note historique : les coûts, statistiques et rendements ci-dessous décrivent cette version. Pour les valeurs actuelles, voir [l’équilibrage v0.7](balance-v07.md) et [l’audit du catalogue](balance-audit.md).

Historique : les tarifs et le stockage de cette version sont remplacés par [l’économie v0.5](economy-v05.md). Les statistiques de combat, rendements et bonus d’entraînement restent valables.

Choix du joueur : un écart marqué, d’environ cinq à huit fois la puissance d’une unité de base pour les meilleures unités, avec des contres accessibles. Les 81 unités et les 51 bâtiments existants ont été revus ; aucun nouveau système de jeu n’est ajouté par ce rééquilibrage.

## Puissance et spécialisation

| Exemple        | Attaque de base | Attaque avec formation niveau 3 |
| -------------- | --------------: | ------------------------------: |
| Fantassin      |               8 |                            12,8 |
| Fusilier       |              14 |                            22,4 |
| Char           |              28 |                            44,8 |
| Dragon occulte |              36 |                            57,6 |
| Char Mausolée  |              40 |                              64 |

L’entraînement donne désormais +25 % au niveau 2 et +60 % au niveau 3, contre +10 % et +20 % auparavant, aux PV, à l’attaque et à la défense. Il profite aussi aux troupes déjà formées, en conservant leur proportion de blessures. Le meilleur bâtiment compatible donne le bonus ; construire plusieurs bâtiments identiques ne cumule pas les pourcentages. Les bâtisseurs restent exclus. Le bonus rare de 10 à 30 % reste additionnel.

Le rapport ×5 à ×8 compare l’attaque du Mausolée à celle du fantassin non entraîné. Les dégâts réels dépendent aussi de la défense, du terrain et de la spécialisation : ils ne respectent pas un ratio universel. Les armes de siège conservent une attaque distincte contre les bâtiments ; les unités puissantes restent plus coûteuses en ressources, population et entretien.

Le bazooka gagne un bonus contre les blindés et ignore 75 % de leur défense. Le chasseur de chars isotopique remplit ce rôle au palier atomique. L’antiaérien spécialisé ignore 50 % de la défense des cibles volantes. Les lanciers contrent les cavaliers ; les arbalétriers gardent leur spécialité contre les soldats médiévaux lourds. Les contres profitent eux aussi de l’entraînement. Ils rendent une défense spécialisée possible sans garantir qu’une recrue bon marché gagne seule un duel contre une élite.

Le catalogue affiche le palier et les statistiques réellement obtenues après entraînement. Le tableau complet des prix, statistiques, revenus, infrastructures et exemples de tirs est généré dans [l’audit d’équilibrage](balance-audit.md).

## Économie

Le départ à zéro reste accessible : campement, premier paysan gratuit, 40 PA initiaux, puis plafond de régénération à 20 et un PA toutes les 30 secondes. Scierie, carrière, mine, caserne et archerie ne demandent plus de fer pour lancer ces premières filières. La carrière ne demande pas de pierre ; le milicien et l’archer ne demandent pas de fer.

La récolte manuelle donne 24 bois, 20 pierre, 16 fer, 24 vivres ou 16 or par action, toujours sur le terrain compatible occupé par le paysan. Les producteurs donnent davantage, avec une progression ×1 / ×1,6 / ×2,4 aux niveaux 1 / 2 / 3. Par exemple, une mine sur colline donne 5 / 8 / 12 fer par minute de production active. Les villages conservent leur multiplicateur propre par niveau. Les limites de production hors ligne restent inchangées.

Les coûts industriels, occultes et atomiques augmentent progressivement. L’amélioration ordinaire coûte le prix de base pour passer au niveau 2, puis 1,6 fois ce prix pour atteindre le niveau 3, en plus des PA. Les transformations du campement et des remparts utilisent leurs propres devis. Les entrepôts, greniers et gares offrent davantage de stockage ; l’entretien des troupes est ajusté pour accompagner ces coûts.

Les murs passent à 100 / 240 / 480 PV pour bois / pierre / acier, avec 0 / 6 / 12 de défense. La palissade coûte 30 bois, les évolutions 65 pierre puis 90 fer. Les tourelles passent à 16 / 30 / 48 d’attaque. Les PNJ reçoivent des statistiques adaptées à cette nouvelle échelle, sans hausse de fréquence ni changement du partage du butin.

## Sauvegardes et validation

Une migration versionnée de l’état JSON adapte une seule fois les unités et bâtiments existants, y compris les royaumes archivés. Elle conserve les ressources, les PA, les possessions, les bonus rares, les proportions de blessures et les prix historiques de démolition. Les anciens bonus d’entraînement de 10 / 20 % deviennent 25 / 60 %. Les PNJ déjà apparus gardent leurs statistiques jusqu’à leur disparition ; les nouvelles apparitions utilisent les nouvelles valeurs. Aucun changement SQL ni remise à zéro du monde.

La validation couvre les contres, l’amorçage économique, la production sur terrain compatible, les améliorations et la migration idempotente. Des parcours navigateur vérifient le recrutement et les statistiques entraînées, les PNJ, les tourelles et l’interception des tirs par les murs. Cela ne remplace pas des parties longues : surveiller la durée des sièges, la part d’entretien dans les revenus et la concentration d’armées atomiques. Les soins et réparations conservent leurs règles actuelles et restent un point à observer lors de ces parties.

## Ajouts proposés — pas encore implémentés

1. **Vétérans nommés** : les unités survivantes gagnent des grades et choisissent une spécialité visible. Bonus limités, expérience PvE plafonnée, afin de renforcer l’attachement sans permettre un entraînement infini contre des PNJ.
2. **Sites stratégiques à occuper** : dépôts de carburant, mines de radium, antennes occultes et reliquaires. Chaque site donne un avantage local contestable et une raison de sortir des remparts ; les nouveaux joueurs gardent leur économie de base autonome.
3. **Forteresses et boss PvE** : convois blindés maudits, bunkers sectaires, dragon irradié. Difficulté et récompenses annoncées avant l’attaque, butin partagé selon la contribution, plusieurs approches possibles avec les contres existants.
4. **Doctrines au choix** : blindage industriel, mobilité des éclaireurs ou puissance occulte. Choix avec compromis et possibilité de réorientation ; éviter une succession de bonus que tout le monde finit par empiler.
5. **Contrats d’expédition** : escorter un convoi, secourir une escouade ou sécuriser une route pour obtenir des récompenses lisibles. Pas de série quotidienne perdue en cas d’absence.

Priorité proposée : sites stratégiques, vétérans, puis forteresses PvE. Ils donnent respectivement des objectifs sur la grande carte, de l’attachement aux unités et des défis à plusieurs.
