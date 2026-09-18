# Figurines modulaires des héros

## Proportions — version 3

Le bas du corps complet (bassin, cuisses, jambes et pieds) passe de 112 à 143 pixels de hauteur, soit +28 %. Les pièces de robes et jupes longues suivent la même correction. Le torse passe de 120 × 104 à 108 × 92 pixels et la tête de 54 × 55 à 49 × 50 pixels ; les raccords du cou et de la taille sont ajustés ensemble. Les pieds restent à la même hauteur sur le socle peint. La silhouette conserve son cadre de 256 × 256 pixels et ses dimensions d’affichage sur la carte.

Cette composition est commune aux héros existants, au créateur et aux portraits. Les quinze variantes, les choix et les couleurs restent identiques. La clé de texture utilise `proportions-v3`. Les deux styles signalés (uniforme de tranchée et tenue longue d’officier), ainsi que les quinze ensembles, ont été comparés visuellement avant/après.

## Proportions — version 2

Le rendu commun à la carte, au portrait et au créateur allonge le bas du corps de 96 à 112 pixels et remonte le torse. Les jambes visibles sous la tenue passent de 57 à 73 pixels environ, sans déplacer les pieds sur le socle. Les quinze variantes utilisent ces mêmes ancrages ; les planches, couleurs et choix des joueurs sont conservés. La clé des textures inclut cette version pour éviter de réutiliser une ancienne composition.

## Socle peint — version 2

Fichier final : `apps/web/public/assets/hero-base-v2.png`.

Généré avec l’outil imagegen intégré à partir des planches `units-industrial.png` et `units-medieval.png` comme références de style. Socle vide avec tranche noire biseautée et gravats peints, pour obtenir le même rendu que les unités au sol. La transparence RGBA générée est conservée ; aucune retouche locale de l’image. Le rendu isole la silhouette comme pour les autres figurines, puis assemble le héros par-dessus. Ce socle remplace les ellipses et le gravier dessinés en Canvas. L’ovale lumineux de bannière reste un marqueur séparé, animé comme celui des PNJ et teinté avec la couleur du joueur.

Source : `/Users/jeanpruski/.codex/generated_images/01a0aa6c-0543-7b73-9066-08f4dfe4531f/exec-042ffeb7-f29a-4b86-acbf-fd72916b71c8.png`.

Prompt final :

```text
Use case: stylized-concept. Asset type: single transparent tabletop miniature base sprite for VOIDMARCH. Reference images are STYLE REFERENCES ONLY: match exactly the small black-rimmed rubble bases under the standing foot soldiers in units-industrial.png and units-medieval.png, with the same richly painted miniature quality, dark palette, tiny chipped stones and natural shading. Generate ONE EMPTY BASE ONLY, no character, no boots, no equipment, no skulls, no scenery above ankle height. Low round miniature base viewed at the same shallow three-quarter camera angle, projected as a horizontal oval, width approximately 3 times total height. Thin matte charcoal black beveled vertical rim, realistic finely detailed brown-grey earth, scattered angular gravel and a few slightly larger flat stones. Keep center clear and level so a standing character can be composited onto it. Top-left soft studio light, subtle shadows inside the stones. No gold border, no glowing outline, no star, no lettering, no green flat vector surface. True RGBA transparent background, no painted checkerboard, no ground plane, no backdrop, no external cast shadow. Entire oval contained in frame, centered, with generous transparent margin. Only one base, not an atlas. Production quality raster miniature asset, consistent with the reference ground units.
```

## Planches d’origine

Génération avec l’outil imagegen intégré, le 17 septembre 2026. Quatre planches de 15 pièces, toutes générées séparément, grille 5 × 3. La transparence RGBA est conservée. Aucun détourage local ni appel API externe. Les couleurs sont appliquées dans le rendu Canvas aux matières neutres ; les tons de peau, laiton et lumières sont préservés autant que possible. Les éléments sont isolés par silhouettes, puis assemblés dans les mêmes points d’ancrage pour le créateur et la carte. Socle dessiné par le rendu du jeu.

## hero-heads

Fichier final : `apps/web/public/assets/hero-heads.png`.

Source conservée : `/Users/jeanpruski/.codex/generated_images/01a0aa6c-0543-7b73-9066-08f4dfe4531f/exec-fd8c0f13-73a3-4f20-b810-52cd9aaa25d9.png`.

```text
Use case: stylized-concept. Production modular character sprite atlas for dark game VOIDMARCH. EXACTLY FIFTEEN isolated pieces in an evenly spaced 5 COLUMN by 3 ROW grid, read left to right. Painted tabletop miniature style, realistic detail, charcoal gray desaturated metal/fabric allowing runtime recoloring. Slight three-quarter front view, all pieces face same direction. True RGBA transparent background, NO checkerboard, NO grid lines, NO labels, NO text, NO insignia, no Nazi symbols. Generous transparent gutters. Each item centered in its cell, contained within 70% width and height. NO complete characters, no scenic bases. These are interchangeable pieces of one paper-doll hero. HEADS ONLY ending at short neck peg, identical scale and center alignment. Fifteen different head designs: 1 officer peaked cap with plain metal clasp and stern face, 2 steel WWII helmet with respirator, 3 medieval closed visor, 4 hooded occult face, 5 officer peaked cap with goggles and bearded face, 6 armored crusader greathelm, 7 plague doctor beak mask, 8 leather pilot cap with goggles, 9 unhelmeted short-haired woman, 10 unhelmeted dark-skinned man with beard, 11 bandaged veteran in plain field cap, 12 hornless ornate gothic knight helmet, 13 hood with gas mask, 14 skull-faced mechanical mask, 15 woman in peaked officer cap. Human faces natural skin tones, headwear neutral gray.
```

## hero-armors

Fichier final : `apps/web/public/assets/hero-armors.png`.

Source conservée : `/Users/jeanpruski/.codex/generated_images/01a0aa6c-0543-7b73-9066-08f4dfe4531f/exec-482ab67c-f29a-4716-ae04-073fdf02627f.png`.

```text
Use case: stylized-concept. Production modular character sprite atlas for dark game VOIDMARCH. EXACTLY FIFTEEN isolated pieces in an evenly spaced 5 COLUMN by 3 ROW grid, read left to right. Painted tabletop miniature style, realistic detail, charcoal gray desaturated metal/fabric allowing runtime recoloring. Slight three-quarter front view, all pieces face same direction. True RGBA transparent background, NO checkerboard, NO grid lines, NO labels, NO text, NO insignia, no Nazi symbols. Generous transparent gutters. Each item centered in its cell, contained within 70% width and height. NO complete characters, no scenic bases. These are interchangeable pieces of one paper-doll hero. TORSOS ONLY including shoulders and both arms with closed gloved hands down next to hips, cropped straight at belt/waist, NO head, NO legs, NO weapons, NO mannequin. Identical narrow waist position and humanoid dimensions. Fifteen designs: 1 WWII feldgrau officer tunic leather cross belt, 2 medieval steel plate cuirass, 3 short military greatcoat with fur collar, 4 occult hoodless robe torso with chains, 5 black leather officer jacket, 6 mail armor with tabard, 7 trench infantry uniform with ammunition pouches, 8 heavy gothic breastplate with bone relief, 9 pilot bomber jacket, 10 plague physician leather apron torso, 11 radiological protective suit torso, 12 armored military uniform with gorget, 13 occult priest vestments torso, 14 engineer jacket with tools and one mechanical forearm, 15 high-ranking officer double-breasted tunic braided shoulder straps, plain fictional clasp. All stop at waist, no long coat tails.
```

## hero-boots

Fichier final : `apps/web/public/assets/hero-boots.png`.

Source conservée : `/Users/jeanpruski/.codex/generated_images/01a0aa6c-0543-7b73-9066-08f4dfe4531f/exec-ae155b65-880a-42d1-b821-0dd3ec2861a1.png`.

```text
Use case: stylized-concept. Production modular character sprite atlas for dark game VOIDMARCH. EXACTLY FIFTEEN isolated pieces in an evenly spaced 5 COLUMN by 3 ROW grid, read left to right. Painted tabletop miniature style, realistic detail, charcoal gray desaturated metal/fabric allowing runtime recoloring. Slight three-quarter front view, all pieces face same direction. True RGBA transparent background, NO checkerboard, NO grid lines, NO labels, NO text, NO insignia, no Nazi symbols. Generous transparent gutters. Each item centered in its cell, contained within 70% width and height. NO complete characters, no scenic bases. These are interchangeable pieces of one paper-doll hero. LOWER BODY BOOT SETS ONLY: each one a single joined waist-to-feet lower body with BOTH legs and a pair of boots, in identical standing stance, narrow waist at top centered, NO torso, NO base. Fifteen designs: 1 military breeches and tall jackboots, 2 medieval armored greaves, 3 field trousers and lace-up boots, 4 occult robe lower hem and iron boots, 5 leather officer trousers and polished boots, 6 chainmail chausses and sabatons, 7 trench gaiters and worn boots, 8 heavy gothic leg plate, 9 pilot trousers and fur-lined boots, 10 plague physician long leather skirt and shoes, 11 radiological suit trousers and sealed boots, 12 officer jodhpurs and riding boots, 13 priest robe hem with pointed shoes, 14 engineer trousers with one mechanical shin, 15 reinforced commander boots with ornate knee guards. Entire both feet visible, same stance and waist width.
```

## hero-weapons

Fichier final : `apps/web/public/assets/hero-weapons.png`.

Source conservée : `/Users/jeanpruski/.codex/generated_images/01a0aa6c-0543-7b73-9066-08f4dfe4531f/exec-60ecdbba-3c3f-45a6-b8b0-689bbeef2fe3.png`.

```text
Use case: stylized-concept. Production modular character sprite atlas for dark game VOIDMARCH. EXACTLY FIFTEEN isolated pieces in an evenly spaced 5 COLUMN by 3 ROW grid, read left to right. Painted tabletop miniature style, realistic detail, charcoal gray desaturated metal/fabric allowing runtime recoloring. Slight three-quarter front view, all pieces face same direction. True RGBA transparent background, NO checkerboard, NO grid lines, NO labels, NO text, NO insignia, no Nazi symbols. Generous transparent gutters. Each item centered in its cell, contained within 70% width and height. NO complete characters, no scenic bases. These are interchangeable pieces of one paper-doll hero. HANDHELD EQUIPMENT ONLY, no hands or person. All held vertically with grip about 40% from top, blades/barrels angled slightly down, complete silhouette. Fifteen different items: 1 medieval longsword point down, 2 WWII officer pistol barrel down, 3 occult staff with green crystal, 4 ceremonial saber point down, 5 compact WWII submachine gun barrel down, 6 heavy engineering wrench, 7 ritual dagger, 8 field radio handset and short antenna, 9 iron warhammer head low, 10 chained occult censer, 11 Tesla pistol with coil, 12 leather grimoire with clasp, 13 officer baton, 14 gothic mace head low, 15 radium relic lantern. Neutral metal and leather, small eerie light accents only.
```
