# Biomes du monde

Quatre ambiances : tempéré (illustrations existantes), enneigé, désertique et automnal. Régions déterministes d’environ 100 × 100 hexagones, soit environ 10 000 cases, avec centres décalés et frontières courbes. La taille exacte varie naturellement.

Le biome habille les terrains : les noms, ressources, coûts des terrains et règles de construction restent identiques. Certaines unités possèdent une adaptation innée : +1 déplacement si l’ordre commence dans leur biome de prédilection (voir `biome-adaptations.md`). Le désert possède des bosquets d’acacias et de palmiers pour les forêts ; la neige conserve des rivières fonctionnelles. Les terres brûlées restent reconnaissables. Le biome est indiqué séparément dans les informations du terrain ; les cases inconnues ne le révèlent pas.

Compatibilité : les anciennes cases et mémoires explorées reçoivent leur biome à la lecture, sans modification de leurs bâtiments, routes, propriétaires ou ressources. Aucun effacement du monde ni migration SQL. La vue stratégique conserve son rendu simple.

## Transitions entre régions

Sur une bande irrégulière d’environ 3 à 7 hexagones au total, le sol et l’eau mélangent progressivement les couleurs des biomes voisins. Les arbres et reliefs alternent entre leurs illustrations, sans superposition transparente des silhouettes. Le cœur des régions conserve son ambiance. La minicarte reprend les couleurs mélangées ; les couleurs des royaumes et le brouillard restent prioritaires.

Ce rendu dépend uniquement de la graine du monde et des coordonnées : même résultat après rechargement, déplacement de caméra ou nouvelle visite. Les frontières existantes, noms, ressources et propriétés ne changent pas. Les adaptations de déplacement utilisent le biome de référence de la case, jamais le mélange visuel. Aucun nouvel atlas ni aucune réinitialisation nécessaires. Le calcul visuel utilise un cache borné partagé entre carte et minicarte.

Validation : tests de continuité des couleurs, déterminisme après éviction du cache, préservation des régions et des terrains spéciaux ; test navigateur sur une frontière naturelle, rechargement et aperçu `test-results/biome-transitions.png`.

## Illustrations

Validation : tests de déterminisme, taille des régions, compatibilité des anciennes cases, brouillard de guerre et couleurs des terres brûlées ; contrôle Chrome des quatre ambiances, des 12 décors de chaque atlas et de leur transparence. Compilation de production validée. Aperçu de comparaison dans `test-results/biomes-map.png` (les bandes rapprochées servent uniquement à comparer les ambiances, elles ne représentent pas la taille réelle des régions).

Génération par l’outil image_gen intégré, avec terrain.png comme référence de style et de disposition. Trois atlas transparents de 12 décors chacun, isolés par le découpage déjà utilisé en jeu. Les fichiers sources générés sont conservés.

### snow

Fichier : `apps/web/public/assets/terrain-snow.png`

Prompt utilisé :

```text
Use case: stylized-concept. Asset type: production transparent terrain sprite atlas for VOIDMARCH. The supplied image is a STYLE AND LAYOUT REFERENCE. Create a NEW equivalent atlas in this theme: Boreal snow biome: snow blankets the ground, frosted firs and birches, blue-gray granite, icy marsh fringes, snowdrifts on ruins. Keep wood-producing forests visibly wooded; snow plain low and open. Match the reference's realistic detailed hand-painted isometric miniature terrain, restrained colors, sharp silhouettes, camera angle, small flat ground patches, no plinths. Exactly FOUR columns by THREE rows, 12 equal square cells, ordered left to right then top to bottom: row 1: deciduous/acacia/birch FOREST grove; conifer/palm FOREST grove; tall rocky MOUNTAIN group; low rocky HILLS. Row 2: ruined stone arch and columns; small reedy MARSH pool; low flat open PLAIN grass/sand/snow patch with tiny shrubs only; small dead twisted trees. Row 3: ruined stone house; small stone bridge over water; occult corrupted clearing with a dark rift; steep rocky cliff group. Each sprite centered completely inside its own cell with at least 15% empty margin on every cell edge, silhouettes never touch across cells. Real transparent alpha background between and around sprites, not a checkerboard painting; no colored sheet background, no grid lines, no text, no labels, no people, no vehicles, no flags. Landscape aspect ratio 4:3. Individual terrain fragments, not hexagonal tiles. Keep plain low and sparse, hills low, mountain tall so types are immediately distinguishable.
```

### desert

Fichier : `apps/web/public/assets/terrain-desert.png`

Prompt utilisé :

```text
Use case: stylized-concept. Asset type: production transparent terrain sprite atlas for VOIDMARCH. The supplied image is a STYLE AND LAYOUT REFERENCE. Create a NEW equivalent atlas in this theme: Desert biome: pale ochre sand, red sandstone, dry acacia woodland and date-palm grove, oasis reeds for marsh, wind-worn stone ruins. Wood-producing forests MUST remain dense small groves with actual trunks, NOT cacti or empty sand. Mountain must visibly expose rock. Match the reference's realistic detailed hand-painted isometric miniature terrain, restrained colors, sharp silhouettes, camera angle, small flat ground patches, no plinths. Exactly FOUR columns by THREE rows, 12 equal square cells, ordered left to right then top to bottom: row 1: deciduous/acacia/birch FOREST grove; conifer/palm FOREST grove; tall rocky MOUNTAIN group; low rocky HILLS. Row 2: ruined stone arch and columns; small reedy MARSH pool; low flat open PLAIN grass/sand/snow patch with tiny shrubs only; small dead twisted trees. Row 3: ruined stone house; small stone bridge over water; occult corrupted clearing with a dark rift; steep rocky cliff group. Each sprite centered completely inside its own cell with at least 15% empty margin on every cell edge, silhouettes never touch across cells. Real transparent alpha background between and around sprites, not a checkerboard painting; no colored sheet background, no grid lines, no text, no labels, no people, no vehicles, no flags. Landscape aspect ratio 4:3. Individual terrain fragments, not hexagonal tiles. Keep plain low and sparse, hills low, mountain tall so types are immediately distinguishable.
```

### autumn

Fichier : `apps/web/public/assets/terrain-autumn.png`

Prompt utilisé :

```text
Use case: stylized-concept. Asset type: production transparent terrain sprite atlas for VOIDMARCH. The supplied image is a STYLE AND LAYOUT REFERENCE. Create a NEW equivalent atlas in this theme: Autumn biome: copper and muted amber deciduous woods, dark evergreen conifers, mossy gray granite, dry straw meadows, russet reeds and fallen leaves, old ruined stone structures. Natural subdued colors suited to a dark fantasy war game. Match the reference's realistic detailed hand-painted isometric miniature terrain, restrained colors, sharp silhouettes, camera angle, small flat ground patches, no plinths. Exactly FOUR columns by THREE rows, 12 equal square cells, ordered left to right then top to bottom: row 1: deciduous/acacia/birch FOREST grove; conifer/palm FOREST grove; tall rocky MOUNTAIN group; low rocky HILLS. Row 2: ruined stone arch and columns; small reedy MARSH pool; low flat open PLAIN grass/sand/snow patch with tiny shrubs only; small dead twisted trees. Row 3: ruined stone house; small stone bridge over water; occult corrupted clearing with a dark rift; steep rocky cliff group. Each sprite centered completely inside its own cell with at least 15% empty margin on every cell edge, silhouettes never touch across cells. Real transparent alpha background between and around sprites, not a checkerboard painting; no colored sheet background, no grid lines, no text, no labels, no people, no vehicles, no flags. Landscape aspect ratio 4:3. Individual terrain fragments, not hexagonal tiles. Keep plain low and sparse, hills low, mountain tall so types are immediately distinguishable.
```
