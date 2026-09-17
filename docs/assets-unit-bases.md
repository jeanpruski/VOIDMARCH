# Socles des unités — harmonisation

Créés avec l’outil intégré imagegen (édition à partir des figurines existantes et de `occult.png` comme référence des socles). Les 30 anciennes unités rejoignent les 8 nouvelles avec un socle sombre biseauté et du gravier. Les bâtiments conservent leurs illustrations.

Les trois fichiers sont dans `apps/web/public/assets/`. Le rendu normalise leurs cellules pour la carte Phaser et les vignettes React, avec une marge transparente commune.

## `units-medieval.png`

Source : `miniatures.png` ; référence : `occult.png`.

Prompt final :

```text
Use case: precise-object-edit. Asset: transparent PNG unit sprite atlas for VOIDMARCH. Image 1 is the edit target: preserve the existing unit designs, poses, equipment, silhouettes and weathered painted miniature style. Image 2 is a supporting STYLE reference ONLY for the small tabletop BASES. Add a small charcoal-black bevelled tabletop base under every target unit, with sparse grey gravel/earth on top, matching image 2. Round bases for foot soldiers, discreet oval bases for horses and vehicles. Keep bases proportional and unobtrusive, not tall plinths. True transparent alpha background, no painted checkerboard, no scenery or background color. Each sprite wholly visible, centered within its equal grid cell, at most 78% cell width and 85% cell height including weapons and base, large clear transparent gutters. No text, numbers, labels or logos. Do not include any buildings or any units from reference image 2. Extract and edit ONLY the six units in the FIRST ROW of image 1; omit all other rows. Output exactly six separate units arranged in 3 equal columns and 2 equal rows (landscape 3:2). Reading order: 1 hooded scout with spear and lantern; 2 red-tabard infantry swordsman with shield; 3 fur-shouldered heavy guard with huge rectangular shield; 4 red-hooded archer drawing longbow; 5 armoured mounted knight with long lance; 6 wooden iron-braced trebuchet. Preserve each identity from image 1; the only intended change is adding the matching bases and transparent isolation.
```

## `units-civil.png`

Source : `expansion.png` ; référence : `occult.png`.

Prompt final :

```text
Use case: precise-object-edit. Asset: transparent PNG unit sprite atlas for VOIDMARCH. Image 1 is the edit target: preserve the existing unit designs, poses, equipment, silhouettes and weathered painted miniature style. Image 2 is a supporting STYLE reference ONLY for the small tabletop BASES. Add a small charcoal-black bevelled tabletop base under every target unit, with sparse grey gravel/earth on top, matching image 2. Round bases for foot soldiers, discreet oval bases for horses and vehicles. Keep bases proportional and unobtrusive, not tall plinths. True transparent alpha background, no painted checkerboard, no scenery or background color. Each sprite wholly visible, centered within its equal grid cell, at most 78% cell width and 85% cell height including weapons and base, large clear transparent gutters. No text, numbers, labels or logos. Do not include any buildings or any units from reference image 2. Extract and edit ONLY the twelve units in the FIRST TWO ROWS of image 1; omit buildings in rows 3 and 4. Output exactly twelve separate units arranged in 6 equal columns and 2 equal rows (landscape 3:1). Row 1 left to right: peasant with axe and basket; ragged militia with club and round shield; armoured spearman; armoured crossbowman; green hooded ranger with bow; red-cloaked light cavalry horseman with spear. Row 2 left to right: pale-tabard paladin on foot with hammer; covered wooden wheeled battering ram; hooded female healer with bandages and lantern; apron-wearing engineer with hammer and tool bag; fur-cloaked berserker with two axes; hooded void acolyte holding cyan stone relic. Keep all twelve identities and their exact order. Background MUST be real alpha transparency, not the checkerboard visible in image 1.
```

## `units-industrial.png`

Source : `industrial.png` ; référence : `occult.png`.

Prompt final :

```text
Use case: precise-object-edit. Asset: transparent PNG unit sprite atlas for VOIDMARCH. Image 1 is the edit target: preserve the existing unit designs, poses, equipment, silhouettes and weathered painted miniature style. Image 2 is a supporting STYLE reference ONLY for the small tabletop BASES. Add a small charcoal-black bevelled tabletop base under every target unit, with sparse grey gravel/earth on top, matching image 2. Round bases for foot soldiers, discreet oval bases for horses and vehicles. Keep bases proportional and unobtrusive, not tall plinths. True transparent alpha background, no painted checkerboard, no scenery or background color. Each sprite wholly visible, centered within its equal grid cell, at most 78% cell width and 85% cell height including weapons and base, large clear transparent gutters. No text, numbers, labels or logos. Do not include any buildings or any units from reference image 2. Extract and edit ONLY the twelve units in the FIRST TWO ROWS of image 1; omit buildings in rows 3 and 4. Output exactly twelve separate units arranged in 6 equal columns and 2 equal rows (landscape 3:1). Row 1 left to right: steel-helmet rifleman with bolt-action rifle; masked stormtrooper with submachine gun; kneeling heavy machine gunner with tripod gun and ammo box; red-hooded crouching sniper with scoped rifle; masked bazooka trooper with shoulder rocket launcher; trenchcoat officer with pistol and sabre. Row 2 left to right: military motorcycle with sidecar and rider; four-wheel armoured car; compact tracked tank; towed two-wheel field cannon; tracked multiple rocket launcher; iron revenant armoured exoskeleton knight with sword and shield and amber visor. Keep all twelve identities and their exact order.
```
