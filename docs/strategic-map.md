# Vue stratégique au dézoom maximal

La carte passe automatiquement en vue stratégique dans les derniers 10 % de la course de dézoom (échelle logarithmique, comme la molette et les boutons). Seuil d’entrée : environ 0,264 ; retour au détail au-dessus de 0,295. Le minimum reste 0,20. Cette marge empêche les bascules répétées autour du seuil.

Les territoires connus utilisent des aplats aux couleurs des bannières, avec un contour extérieur uniquement. Les terres neutres sont sombres et le brouillard de guerre reste respecté. Les régions explorées en mémoire sont réutilisées ; les données actuelles remplacent les souvenirs lorsqu’elles sont disponibles. Les noms des royaumes ne sont affichés que sur leurs territoires connus, avec suppression des étiquettes qui se chevauchent. Un losange repère la capitale du joueur. Les positions des capitales ennemies ne sont pas publiques et ne sont pas révélées par cette vue, y compris lorsque le radar secret est actif.

Les figurines, bâtiments, reliefs, routes, événements, drapeaux, barres de vie, grille et animations ne sont pas créés dans le rendu stratégique. Les projectiles en cours sont annulés visuellement à l’entrée. Les contours sont calculés une fois par état du monde, et seules les cases dans la fenêtre sont dessinées. Les images restent préchargées pour le retour instantané au détail : cette optimisation concerne le rendu, pas le téléchargement initial ni le protocole serveur.

Un clic dans cette vue rapproche la caméra à 0,60 et revient à l’inspection sans envoyer d’ordre de jeu. La molette, les boutons, le déplacement de caméra et la minicarte restent disponibles. La transition de couleur dure 160 ms, sauf si la réduction des animations est activée.

Validation : tests des seuils, des frontières communes et du brouillard ; parcours navigateur sur ordinateur et mobile, contrôle de l’absence de sprites et d’effets au dézoom maximal, restauration du détail et de la grille, navigation par clic et minicarte.

## Filtres de visibilité

La barre de carte propose deux boutons indépendants : **Unités** (toutes les factions, héros, PNJ et caravanes) et **Bâtiments** (toutes les factions, remparts, tourelles, drapeaux et barres de vie associés). Un œil barré et le libellé barré indiquent une couche masquée. Les terrains et les couleurs des territoires restent visibles.

Ces préférences sont locales à la session de navigation, sans requête de jeu ni changement des collisions, revenus ou combats. Un clic n’accroche pas une figurine masquée. Masquer la sélection revient à inspecter sa case. Les filtres sont conservés en passant par la vue stratégique ; sélectionner explicitement un élément dans une liste, ou utiliser le raccourci du héros, réaffiche sa couche. Les effets d’action sont suspendus lorsque l’une des couches est masquée pour garder une vue dégagée. Tout est visible au chargement initial.

`tests/map-layers.e2e.ts` vérifie les deux filtres indépendants, les éléments adverses et neutres, la sélection des cases, le retour au détail et les boutons sur mobile, sans envoyer d’ordre au serveur.
