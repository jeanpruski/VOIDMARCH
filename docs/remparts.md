# Remparts sur hexagones entiers

Choix validé : chaque tronçon occupe une case, comme un bâtiment. Construire une **Palissade en bois** dans l’onglet **Défenses**, puis sélectionner ce tronçon et choisir **Améliorer** pour changer son matériau. Une case ne peut pas accueillir à la fois un rempart et un autre bâtiment.

| Palier            | Matériau à payer            | PA  | PV  | Défense propre |
| ----------------- | --------------------------- | --- | --- | -------------- |
| Palissade en bois | 30 bois (27 pour la Cendre) | 1   | 100 | 0              |
| Rempart de pierre | 98 pierre                   | 2   | 240 | 6              |
| Mur en acier      | 225 fer                      | 2   | 480 | 12             |

La ressource fer sert à produire l’acier ; aucune sixième ressource n’est ajoutée. Les paliers pierre et acier sont des évolutions du même tronçon, et ne se construisent pas directement. L’évolution répare intégralement le mur, conformément aux autres améliorations. Le coût initial de la palissade reste enregistré pour la démolition : les améliorations ne sont pas remboursées.

Les remparts suivent les mêmes règles de chantier que les bâtiments : terres possédées ou terrain neutre à trois cases d’un bâtiment avec un bâtisseur à une case du chantier. Terrains autorisés : plaine, forêt, colline, montagne et ruines. Pas de construction sur une rivière ou un marais.

## Passage et siège

- Les unités du propriétaire traversent librement, sous réserve du terrain et d’une éventuelle unité occupant la case.
- Les unités terrestres des autres royaumes sont bloquées, même sur une route et même pendant une trêve. Une trêve interdit d’attaquer ; elle ne donne pas un droit de passage.
- Le serveur contrôle chaque case du chemin, pas seulement la destination. Les chemins terrestres prévisualisés et les bots évitent les remparts adverses. Les unités volantes peuvent les survoler.
- Un rempart ne peut pas être capturé. Il faut le contourner ou le détruire pour ouvrir une brèche. Après destruction, la case redevient franchissable ; la propriété du terrain et les routes sont conservées.
- En mode attaque terrestre contre une unité terrestre, un rempart adverse prend priorité sur la troupe stationnée dessus : il faut ouvrir la brèche. Les attaques aériennes ignorent cette protection, et les cibles volantes ne sont pas protégées par le mur.
- Les murs sont des cibles de bâtiment : les dégâts de siège, les PA, la portée, la défense du terrain et les protections diplomatiques habituelles s’appliquent. Ils interceptent les attaques directes au sol qui traversent leur hexagone, y compris les ripostes. Les tirs en cloche, aériens et depuis les tourelles les franchissent ; voir [la protection par les remparts](wall-combat.md).
- Les remparts peuvent être réparés ou démolis avec les actions de bâtiment existantes. Les barres de vie apparaissent après des dégâts.

## Rendu

`apps/web/src/wall-art.ts` projette les matières peintes de `apps/web/public/assets/wall-materials.png` sur la géométrie hexagonale : bois pointu et traverses, pierre appareillée et créneaux, acier riveté et traces de rouille. Carte et menus utilisent la même source. Texture créée avec imagegen intégré ; prompt et provenance dans `assets-walls.md`.

Les six voisins appartenant au même royaume déterminent les raccords, y compris entre matériaux différents. Le rendu couvre 64 configurations par matériau : tronçon isolé, six extrémités, lignes droites, angles, jonctions et croisements. Chaque demi-tronçon rejoint exactement la bordure commune ; un pilier ferme le raccord central. Les différences de hauteur entre matériaux restent visibles.

Les textures sont mises en cache et recalculées au changement des voisins. Une destruction coupe le raccord et laisse une extrémité fermée. Le brouillard conserve seulement les informations déjà observées.

## Vérification

- `tests/walls.test.ts` : matériaux, progression, remboursement, routes, passage ami/ennemi, chemin à plusieurs étapes, contournement, enceinte fermée, brèche, trêve, capture interdite et six directions de raccord.
- `tests/walls.e2e.ts` : contrôle des 192 configurations et absence de rognage.
- `tests/founding.e2e.ts` : construction et deux évolutions via l’interface, vues réelles de remparts sur ordinateur et mobile.

Les remparts utilisent la sauvegarde des bâtiments existante : ils suivent automatiquement les règles de persistance, d’archivage, de reconstruction après défaite et de suppression des invités.

## Territoire à l’intérieur d’une enceinte — 17 septembre 2026

Une boucle entièrement fermée de remparts du même joueur revendique automatiquement les cases neutres à l’intérieur. Bois, pierre et acier peuvent être mélangés. Une montagne, un autre bâtiment ou un mur adverse ne remplace pas un tronçon manquant. Aucun PA de capture supplémentaire n’est demandé : le joueur paie seulement la construction normale du dernier tronçon.

Les cases prennent la couleur du propriétaire. Le contour coloré suit uniquement la frontière du territoire, sans séparer les hexagones voisins du même royaume ; les drapeaux de territoire sont réservés aux cases bâties. Les terres et bâtiments ennemis ne changent jamais de propriétaire automatiquement. Une unité ennemie sur une case neutre reste ennemie et bloque la construction sur sa case.

À l’intérieur, on peut construire au-delà du rayon de trois cases des bâtiments, à condition d’avoir **un paysan ou un ingénieur à une case maximum du chantier**. Les coûts, PA, prérequis et restrictions de terrain restent obligatoires. Le panneau de sélection explique le statut de la terre et masque Construire si aucun bâtisseur n’est proche. Les règles de construction des autres terres possédées sont inchangées.

À l’ouverture d’une brèche, **les cases intérieures sans bâtiment redeviennent neutres**. Cela inclut les cases vides possédées avant la fermeture, une route et une case occupée uniquement par une unité. Les unités et routes ne sont pas supprimées. Les cases portant un bâtiment restent au propriétaire et redeviennent des possessions ordinaires. Les terres extérieures à l’enceinte ne changent pas. Une enceinte intérieure encore fermée conserve sa propre zone ; refermer une brèche revendique à nouveau les cases neutres.

Le résultat de l’action et le journal indiquent le nombre de cases gagnées ou libérées. La confirmation de démolition d’un mur explique les conséquences d’une brèche. L’entretien territorial normal s’applique aux nouvelles terres, sans production gratuite.

Les marqueurs de territoire d’enceinte sont sauvegardés dans le monde JSON et les archives. Les anciennes enceintes fermées sont reconnues au démarrage, sans migration SQL ni réinitialisation. La suppression d’un invité efface aussi ses marqueurs d’enceinte.

La détection utilise des intervalles libres par rangée et une propagation depuis l’extérieur : elle gère les enceintes irrégulières, imbriquées et les villes très éloignées sans parcourir le rectangle vide qui les sépare. `tests/enclosures.test.ts` compare le résultat à une propagation indépendante sur 150 dispositions et teste une muraille ouverte de 10 000 tronçons.
