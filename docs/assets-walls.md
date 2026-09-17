# Matières des remparts

Fichier final : `apps/web/public/assets/wall-materials.png` (2172 × 724). Trois matières peintes : bois usé, pierre appareillée, acier riveté. Généré avec l’outil intégré imagegen ; référence de direction artistique : `apps/web/public/assets/industrial.png`.

Les faces sont projetées sur la géométrie hexagonale par `apps/web/src/wall-art.ts`. Les matières peintes sont communes à toutes les orientations ; la géométrie native assure les raccords, extrémités et différences de hauteur. Carte et vignettes partagent ce rendu.

Prompt final :

```text
Use case: stylized-concept. Asset: one game-ready opaque MATERIAL TEXTURE ATLAS for the dark medieval / occult WWII strategy game VOIDMARCH. Exactly THREE equal square material tiles side by side in a 3:1 landscape canvas. Each tile fills its exact third edge-to-edge. LEFT THIRD: dark desaturated weathered oak palisade timbers, closely packed vertical sharpened-grain wooden logs/planks, scratched wood and small iron nails, coarse age and soot; no visible pointed silhouette, just flat repeating timber surface. CENTER THIRD: old rough grey-green gothic stone masonry in staggered horizontal courses, irregular dressed blocks, fine mortar joints, tiny chips and cracks, subtle lichen and soot. RIGHT THIRD: dark olive grey WWII industrial armour plating, staggered rectangular steel plates, small rivets, scratched paint, restrained rusty seams and faint worn nonalphabetic occult incisions. All three are orthographic frontal seamless surface textures, NO perspective, NO extruded geometry, NO outer frame, NO text, NO labels, NO buildings, NO people, NO background, NO lighting gradients, NO cast shadows. Painterly realistic miniature-game material detail matching the weathered iron and medieval stone of the reference atlas. Low contrast, dark muted earthy palette, diffuse ambient lighting; avoid bright highlights, saturated colors or flat vector art. This is a continuous texture sheet to map onto isometric wall faces, not a set of wall sprites.
```
