# Matières des remparts

Fichier final : `apps/web/public/assets/wall-materials.png` (2172 × 724). Trois matières peintes : bois usé, pierre appareillée, acier riveté. Généré avec l’outil intégré imagegen ; référence de direction artistique : `apps/web/public/assets/industrial.png`.

Les faces sont projetées sur la géométrie hexagonale par `apps/web/src/wall-art.ts`. Les matières peintes sont communes à toutes les orientations ; la géométrie native assure les raccords, extrémités et différences de hauteur. Carte et vignettes partagent ce rendu.

Prompt final :

```text
Use case: stylized-concept. Asset: one game-ready opaque MATERIAL TEXTURE ATLAS for the dark medieval / occult WWII strategy game VOIDMARCH. Exactly THREE equal square material tiles side by side in a 3:1 landscape canvas. Each tile fills its exact third edge-to-edge. LEFT THIRD: dark desaturated weathered oak palisade timbers, closely packed vertical sharpened-grain wooden logs/planks, scratched wood and small iron nails, coarse age and soot; no visible pointed silhouette, just flat repeating timber surface. CENTER THIRD: old rough grey-green gothic stone masonry in staggered horizontal courses, irregular dressed blocks, fine mortar joints, tiny chips and cracks, subtle lichen and soot. RIGHT THIRD: dark olive grey WWII industrial armour plating, staggered rectangular steel plates, small rivets, scratched paint, restrained rusty seams and faint worn nonalphabetic occult incisions. All three are orthographic frontal seamless surface textures, NO perspective, NO extruded geometry, NO outer frame, NO text, NO labels, NO buildings, NO people, NO background, NO lighting gradients, NO cast shadows. Painterly realistic miniature-game material detail matching the weathered iron and medieval stone of the reference atlas. Low contrast, dark muted earthy palette, diffuse ambient lighting; avoid bright highlights, saturated colors or flat vector art. This is a continuous texture sheet to map onto isometric wall faces, not a set of wall sprites.
```

## Portes sur les routes

Une case portant à la fois une route et un rempart utilise automatiquement une porte : double battant de bois renforcé, herse de fer dans un encadrement de pierre, puis porte blindée en acier. Le rendu réutilise les matières peintes existantes et la géométrie Canvas native, sans nouvel atlas raster. Les raccords extérieurs sont conservés. Une porte droite suit l’axe des murs ; dans un angle, elle suit la ligne reliant les deux extrémités (orientations intermédiaires à 30°). Aux jonctions, la paire de murs la plus opposée prime, puis le croisement de la route départage les orientations de façon stable. Les tronçons rejoignent les montants extérieurs, sans traverser le passage central ; l’ouverture plus large et les battants sur la face avant restent lisibles en diagonale. Les tourelles restent posées sur le linteau.

La porte reste le même bâtiment : propriétaire, PV, coût, améliorations, protection des troupes, fermeture des enceintes et blocage des ennemis ne changent pas. Aucune migration ni construction supplémentaire n’est nécessaire. Poser ou retirer une route, améliorer le rempart ou ajouter une tourelle actualise immédiatement son aspect. Le panneau de sélection et les vignettes de combat reprennent la porte.

Vérification : `tests/walls.e2e.ts` couvre les 64 raccords des trois matériaux, avec portes orientées et tourelles sans débordement. `tests/turrets.e2e.ts` vérifie sur une porte la pose, les évolutions, le tir puis le retrait et la remise de la route. Les tests de remparts vérifient déjà que les ennemis ne traversent pas un mur portant une route.

Régression des portes en angle : `tests/wall-gates.test.ts` vérifie les 15 paires de directions avec les 64 raccords de route, puis le dégagement du passage pour toutes les jonctions. La galerie navigateur présente les 3 lignes droites et les 12 angles de chaque matériau, avec et sans tourelle.
