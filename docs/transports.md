# Transports de troupes

Six unités spécialisées, sans attaque ni capture, avec une vision de base de 2 cases. Les unités de reconnaissance existantes gardent leur rôle. Le bonus du site radio peut ajouter sa case habituelle de vision. Les passagers ne procurent aucune vision, aura ou action depuis la soute.

| Transport | Recrutement | Places | Mouvement hors réseau |
| --- | --- | ---: | ---: |
| Side-car des convois | Garage niveau 1 | 2 fantassins | 10 |
| Transport blindé des cendres | Garage niveau 2 | 4 fantassins | 8 |
| Camion de la longue marche | Garage niveau 3 + raffinerie | 8 partagées | 9 |
| Avion-cargo Corbeau | Aérodrome niveau 3 + raffinerie | 12 partagées | 16 |
| Hélicoptère Passeur | Héliport niveau 2 | 8 partagées | 12 |
| Dirigeable Arche noire | Chantier de dirigeables niveau 3 + raffinerie | 16 partagées | 12 |

Les transports ont un prix explicite tenant compte de leur capacité, au lieu d’être tarifés comme des combattants. Leurs statistiques de mobilité et de vision restent fixes ; l’entraînement peut renforcer leur survie. Les restrictions de terrain et les itinéraires explorés restent applicables. Les routes et terres personnelles conservent le déplacement continu pour 1 PA.

## Embarquement et débarquement

Sélectionner un transport, ouvrir **Transport**, puis embarquer une troupe personnelle sur une case voisine. On peut également sélectionner la troupe et choisir un transport voisin. Les capacités partagées coûtent 1 place pour un fantassin/civil/héros, 2 pour un cavalier, 4 pour une moto ou une voiture légère (automitrailleuse ou voiture de reconnaissance au radium). Les véhicules lourds, l’artillerie, les avions et les transports déjà chargés sont exclus. Aucune soute imbriquée.

Un camion peut donc prendre huit fantassins, quatre fantassins et une moto, ou deux petits véhicules. Le side-car et le transport blindé n’acceptent que les passagers d’une place.

Chaque embarquement et chaque débarquement coûte **1 PA par troupe**. Déplacer le véhicule coûte ensuite **1 PA pour tout le chargement**. Le manifeste indique les passagers, leurs PV et leurs places. Le débarquement propose les cases voisines libres, visibles et praticables ; choisir les coordonnées puis **Débarquer**. Une rivière sans route, une case occupée ou un mur/bâtiment ennemi bloque la sortie. Un avion-cargo doit charger/décharger depuis une plaine ou un aérodrome ami. Hélicoptères et dirigeables déposent leurs passagers sur une case voisine praticable.

Sur la carte, chaque transport du joueur porte un badge permanent **places occupées / capacité** (par exemple **2/4** pour deux fantassins dans le transport blindé). Fond sombre, contour de la bannière et chiffres renforcés ; le contour devient doré quand le transport est plein. Le badge reste lisible au dézoom détaillé, accompagne le véhicule en mouvement et se met à jour après embarquement ou débarquement. Une cavalerie occupe deux places, une moto ou un petit véhicule quatre ; le manifeste indique aussi le nombre exact de passagers.

Les passagers restent dans Armées, avec « À bord ». Cliquer sur eux ou sur « Aller à mon héros » localise leur transport. Ils conservent identité, blessures, rareté, entraînement et équipements. Population, entretien et valeur militaire sont conservés. L’embarquement ne permet pas de recruter à nouveau un premier paysan gratuit.

## Destruction

Les passagers tentent de sortir sur les six cases voisines, sans superposition, avec 50 % de leurs PV restants (arrondi à une décimale, minimum 1 PV). Ceux sans case disponible sont perdus ; un héros sans issue commence sa récupération normale de cinq minutes. Une frappe atomique détruit aussi le chargement, sans évacuation hors du rayon ; le héros reste immortel et part en récupération. Aucun PA facturé pour une évacuation d’urgence.

## Persistance et contrôles

Les passagers sont persistés dans `Unit.cargo`, absents du dictionnaire des unités sur la carte ; `carrierId` identifie leur statut. Le serveur valide propriétaire, distance, capacité, terrain et PA. Les snapshots adverses ne contiennent pas le manifeste. Les anciennes sauvegardes restent compatibles, sans migration SQL. Archives et reconstruction réattribuent correctement les identifiants des passagers et de leur transport.

## Illustrations

Créées avec l’outil intégré `imagegen`, dans `apps/web/public/assets/transport-{sidecar,carrier,truck,plane,helicopter,airship}.png`. Les transparences sont vérifiées dans le navigateur. Les sprites utilisent le même atlas normalisé, socle et marqueur de couleur que les autres unités. L’hélicoptère et le dirigeable ont été recadrés par une seconde génération pour garder leurs silhouettes entières.

Prompt commun final (génération ; remplacer SUBJECT par chaque sujet ci-dessous) :

> Use case: stylized-concept. Asset type: isolated game unit sprite for dark occult medieval / WWII dieselpunk strategy VOIDMARCH. Subject: SUBJECT. Hand-painted realistic tabletop miniature with crisp detailed silhouette, aged gunmetal steel, desaturated olive canvas, restrained amber occult light, no guns. Three-quarter isometric view facing lower left, complete vehicle centered with generous 15% clear margin. Ground vehicles on a thin dark oval rocky miniature base; aircraft hovering above a similar oval display base with a tiny discreet support. Single object only. Genuinely transparent alpha background, no checkerboard, no backdrop, no ground outside the base, no text, labels, insignia or watermark. High quality cohesive realistic miniature rendering, not flat icon. Square image.

Sujets :

- Side-car : a rugged military motorcycle with a wide two-seat sidecar, cargo panniers
- Transport blindé : a compact armored troop carrier half-track with open troop compartment, benches and rear door, four passengers capacity
- Camion : a heavy six-wheel military transport truck with canvas-covered cargo bed, folded rear loading ramp and strapped crates
- Avion : a large twin-engine propeller military cargo airplane with bulky freight fuselage and visible closed rear cargo door
- Hélicoptère : a dark twin-rotor military transport helicopter with bulky cabin and side boarding doors
- Dirigeable : an enormous occult military cargo dirigible, ribbed dark envelope, large armored cargo gondola and hanging freight loading platform

Prompt de correction final pour hélicoptère et dirigeable :

> Edit this game miniature sprite. Preserve the subject, all details, design, materials, lighting, camera angle and genuine transparent alpha background. Fix the cropped silhouette: zoom out so that the ENTIRE object, including all rotor blades, fins, propellers, tail and oval base, fits inside the canvas with 18% transparent padding on EVERY edge. Reconstruct missing clipped blade and fin tips naturally. No text, no background, no checkerboard. Square PNG.
