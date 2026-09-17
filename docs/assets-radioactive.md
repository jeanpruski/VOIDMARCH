# Assets de la division atomique

Générés avec l’outil imagegen intégré, le 17 septembre 2026. Référence de style : `apps/web/public/assets/aviation.png`. Les PNG finaux sont dans `apps/web/public/assets/rad-*.png`.

Les deux générations ont produit un fond opaque malgré la demande de transparence. Détourage local, figurine par figurine, puis contrôle des marges et de la transparence avant intégration. L’ordre de lecture des cellules correspond exactement aux frames déclarées dans `ui.tsx`.

Traitement local : rembg 2.0.84, modèle `isnet-general-use`, masque calculé sur chaque cellule, alpha inférieur à 32 supprimé. Les couleurs des figurines sont conservées. Les figurines sont ensuite recentrées avec une marge transparente de 16 pixels pour empêcher les silhouettes voisines de se toucher. Ces outils ne sont pas des dépendances de l’application.

Sources conservées dans le dossier de génération `01a0aa6c-0543-7b73-9066-08f4dfe4531f` :

| Asset final | Source avant détourage |
| --- | --- |
| `apps/web/public/assets/rad-infantry.png` | `exec-41f66596-f681-4382-b733-da6232c751d6.png` |
| `apps/web/public/assets/rad-cavalry.png` | `exec-7b40afa4-e01e-4639-af11-b42e1e6ba19b.png` |
| `apps/web/public/assets/rad-motorcycles.png` | `exec-37dbb596-eda6-4474-8f11-7400ec32f634.png` |
| `apps/web/public/assets/rad-vehicles.png` | `exec-4ada089e-6307-47e5-b032-8c3c48c98f8e.png` |
| `apps/web/public/assets/rad-planes.png` | `exec-d237d7fd-7194-4070-9479-189aba04c1e7.png` |
| `apps/web/public/assets/rad-helicopters.png` | `exec-bbbcad80-f1e0-46d3-aced-b90eb5123e7e.png` |
| `apps/web/public/assets/rad-buildings.png` | `exec-93ff380c-bf87-41e1-8d33-09ab19a62093.png` |

## rad-infantry

```text
Use case: stylized-concept. Asset: production transparent PNG sprite atlas for VOIDMARCH. Reference image is STYLE ONLY. Painted realistic tabletop miniatures, dark WWII dieselpunk meets medieval Lovecraft occult horror, worn gunmetal, dirty olive, brass, muted bone and small eerie radioactive lime-green glow accents. Each miniature on its own low dark oval bevelled rubble base; air units mounted above base on a discreet metal flight stand. Camera three-quarter isometric, entire silhouette visible, crisp at small scale. TRUE RGBA transparency, no painted checkerboard, no background scene, no text, numbers, letters, logos, flags or real-world insignia. Exact equal grid 3 columns by 2 rows, six DIFFERENT isolated objects, left-to-right then top-to-bottom, each centered in its cell and contained within 76% cell width and 80% cell height; generous transparent gutters, NO overlaps, no extra objects outside bases. Match reference finish and base style, not its subjects. Six subjects in exact reading order: 1 Radium grenadier in lead-lined trenchcoat and gas mask, compact radioactive submachine gun. 2 Cobalt sentinel in thick medieval plate over WWII uniform with rectangular shield and green glowing pistol. 3 Isotope sniper with very long scoped rifle, hood and round respirator. 4 Atomic sapper with backpack canisters and heavy shoulder mortar, crouched posture. 5 Pallid executioner in power armor carrying enormous green-edged axe. 6 Gamma templar with sealed steel helmet, luminous heavy electric rifle and armored cape.
```

## rad-cavalry

```text
Use case: stylized-concept. Asset: production transparent PNG sprite atlas for VOIDMARCH. Reference image is STYLE ONLY. Painted realistic tabletop miniatures, dark WWII dieselpunk meets medieval Lovecraft occult horror, worn gunmetal, dirty olive, brass, muted bone and small eerie radioactive lime-green glow accents. Each miniature on its own low dark oval bevelled rubble base; air units mounted above base on a discreet metal flight stand. Camera three-quarter isometric, entire silhouette visible, crisp at small scale. TRUE RGBA transparency, no painted checkerboard, no background scene, no text, numbers, letters, logos, flags or real-world insignia. Exact equal grid 3 columns by 2 rows, six DIFFERENT isolated objects, left-to-right then top-to-bottom, each centered in its cell and contained within 76% cell width and 80% cell height; generous transparent gutters, NO overlaps, no extra objects outside bases. Match reference finish and base style, not its subjects. Six subjects in exact reading order: 1 Radium hussar on lean horse, curved sabre and gas mask. 2 Isotope lancer on horse with long green crystal tipped lance angled within cell. 3 Cobalt cuirassier on heavily armored horse with thick plates and shield. 4 Ash dragoon on horse with long rifle. 5 Pallid outrider on skeletal horse with cloak and compact carbine. 6 Gamma paladin on huge armored black warhorse with glowing hammer and reactor saddle.
```

## rad-motorcycles

```text
Use case: stylized-concept. Asset: production transparent PNG sprite atlas for VOIDMARCH. Reference image is STYLE ONLY. Painted realistic tabletop miniatures, dark WWII dieselpunk meets medieval Lovecraft occult horror, worn gunmetal, dirty olive, brass, muted bone and small eerie radioactive lime-green glow accents. Each miniature on its own low dark oval bevelled rubble base; air units mounted above base on a discreet metal flight stand. Camera three-quarter isometric, entire silhouette visible, crisp at small scale. TRUE RGBA transparency, no painted checkerboard, no background scene, no text, numbers, letters, logos, flags or real-world insignia. Exact equal grid 3 columns by 2 rows, six DIFFERENT isolated objects, left-to-right then top-to-bottom, each centered in its cell and contained within 76% cell width and 80% cell height; generous transparent gutters, NO overlaps, no extra objects outside bases. Match reference finish and base style, not its subjects. Six subjects in exact reading order: 1 Radium dispatch rider on lean WWII military motorcycle with rifle. 2 Isotope assault motorcycle with forward twin machine guns and armored rider. 3 Cobalt motorcycle with armored sidecar and shielded gunner. 4 Pallid hunter motorcycle with long precision rifle mount and hooded rider. 5 Gamma trike with small twin anti-air gun barrels elevated. 6 Apocalypse heavy tracked-rear motorcycle with rocket sidecar, lead shielding and green reactor.
```

## rad-vehicles

```text
Use case: stylized-concept. Asset: production transparent PNG sprite atlas for VOIDMARCH. Reference image is STYLE ONLY. Painted realistic tabletop miniatures, dark WWII dieselpunk meets medieval Lovecraft occult horror, worn gunmetal, dirty olive, brass, muted bone and small eerie radioactive lime-green glow accents. Each miniature on its own low dark oval bevelled rubble base; air units mounted above base on a discreet metal flight stand. Camera three-quarter isometric, entire silhouette visible, crisp at small scale. TRUE RGBA transparency, no painted checkerboard, no background scene, no text, numbers, letters, logos, flags or real-world insignia. Exact equal grid 3 columns by 2 rows, six DIFFERENT isolated objects, left-to-right then top-to-bottom, each centered in its cell and contained within 76% cell width and 80% cell height; generous transparent gutters, NO overlaps, no extra objects outside bases. Match reference finish and base style, not its subjects. Six subjects in exact reading order: 1 Radium armored scout car with four wheels and small turret. 2 Cobalt assault half-track with heavy autocannon and lead armor. 3 Isotope tank destroyer with low chassis and very long green-reactor cannon. 4 Mausoleum heavy tank, huge thick sloped plates, occult reliefs and short massive gun. 5 Gamma anti-air crawler with quad elevated gun barrels and radar dish. 6 Apocalypse siege crawler with six massive radioactive rocket tubes and rear green reactor.
```

## rad-planes

```text
Use case: stylized-concept. Asset: production transparent PNG sprite atlas for VOIDMARCH. Reference image is STYLE ONLY. Painted realistic tabletop miniatures, dark WWII dieselpunk meets medieval Lovecraft occult horror, worn gunmetal, dirty olive, brass, muted bone and small eerie radioactive lime-green glow accents. Each miniature on its own low dark oval bevelled rubble base; air units mounted above base on a discreet metal flight stand. Camera three-quarter isometric, entire silhouette visible, crisp at small scale. TRUE RGBA transparency, no painted checkerboard, no background scene, no text, numbers, letters, logos, flags or real-world insignia. Exact equal grid 3 columns by 2 rows, six DIFFERENT isolated objects, left-to-right then top-to-bottom, each centered in its cell and contained within 76% cell width and 80% cell height; generous transparent gutters, NO overlaps, no extra objects outside bases. Match reference finish and base style, not its subjects. Six subjects in exact reading order: 1 Radium reconnaissance propeller plane, slender wings, camera pod, lightly armed. 2 Isotope interceptor with twin propellers, sharp silhouette and glowing wing guns. 3 Cobalt armored ground-attack plane with thick fuselage, twin engines and underwing cannons. 4 Pallid night fighter with black wings, radar antenna nose and green reactor. 5 Gamma heavy bomber with four propeller engines and green glowing bomb rack. 6 Apocalypse flying-wing occult bomber, angular broad wing and three green reactor exhausts. Wings must remain fully within each cell.
```

## rad-helicopters

```text
Use case: stylized-concept. Asset: production transparent PNG sprite atlas for VOIDMARCH. Reference image is STYLE ONLY. Painted realistic tabletop miniatures, dark WWII dieselpunk meets medieval Lovecraft occult horror, worn gunmetal, dirty olive, brass, muted bone and small eerie radioactive lime-green glow accents. Each miniature on its own low dark oval bevelled rubble base; air units mounted above base on a discreet metal flight stand. Camera three-quarter isometric, entire silhouette visible, crisp at small scale. TRUE RGBA transparency, no painted checkerboard, no background scene, no text, numbers, letters, logos, flags or real-world insignia. Exact equal grid 3 columns by 2 rows, six DIFFERENT isolated objects, left-to-right then top-to-bottom, each centered in its cell and contained within 76% cell width and 80% cell height; generous transparent gutters, NO overlaps, no extra objects outside bases. Match reference finish and base style, not its subjects. Six subjects in exact reading order: 1 Radium scout helicopter, WWII experimental bubble cockpit, skeletal tail and two-bladed rotor. 2 Isotope light attack helicopter, narrow cockpit and twin gun pods. 3 Cobalt armored gunship, squat armored hull, stub wings and single main rotor. 4 Pallid hunter helicopter with slim tandem cockpit and long scoped nose cannon. 5 Gamma anti-air helicopter with elevated twin cannons and compact radar dish. 6 Apocalypse siege helicopter with twin tandem rotors, heavy rocket racks and green reactor body. Rotor blades fully within cells, no cropping, no motion blur.
```

## rad-buildings

```text
Use case: stylized-concept. Asset: production transparent PNG sprite atlas for VOIDMARCH. Reference image is STYLE ONLY. Painted realistic tabletop miniatures, dark WWII dieselpunk meets medieval Lovecraft occult horror, worn gunmetal, dirty olive, brass, muted bone and small eerie radioactive lime-green glow accents. Each miniature on its own low dark oval bevelled rubble base; air units mounted above base on a discreet metal flight stand. Camera three-quarter isometric, entire silhouette visible, crisp at small scale. TRUE RGBA transparency, no painted checkerboard, no background scene, no text, numbers, letters, logos, flags or real-world insignia. Exact equal grid 2 columns by 2 rows, four DIFFERENT isolated objects, left-to-right then top-to-bottom, each centered in its cell and contained within 76% cell width and 80% cell height; generous transparent gutters, NO overlaps, no extra objects outside bases. Match reference finish and base style, not its subjects. Four subjects in exact reading order: 1 Isotope laboratory: compact gothic laboratory with glass green isotope chambers, pipes and lead vault. 2 Black atomic reactor: squat armored containment dome with cathedral buttresses, green core and cooling stacks. 3 Occult helipad: concrete octagonal landing pad with circular landing marking WITHOUT letters, short control tower and one parked tiny rotorcraft. 4 Atomic foundry: heavy bunker factory with blast furnace, gantry crane and lead-lined green glowing vats.
```

## Correction de fond demandée à imagegen

```text
Use case: background-extraction. Edit the supplied game sprite sheet. Keep ALL six figurines, their bases, details, colors, placement and 3 by 2 cell order unchanged. Remove the entire dark blurred gradient background between and around the figurines, including enclosed gaps between legs, wheels, rotor supports, weapons, and bases. Deliver an actual RGBA PNG with alpha=0 everywhere outside the cutout miniatures. TRUE TRANSPARENCY is mandatory. No checkerboard, no black or solid backdrop, no atmospheric haze, no cast shadows outside the miniature base. Preserve slender weapons and flight stands. Do not add or duplicate objects.
```
