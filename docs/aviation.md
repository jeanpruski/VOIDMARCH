# Aviation — 17 septembre 2026

Le catalogue compte désormais 44 unités et 47 types de bâtiments.

| Unité | Recrutement | Rôle | Déplacement / vision / portée | Attaque |
| --- | --- | --- | --- | --- |
| Avion de reconnaissance | Aérodrome + radio | Observer rapidement | 10 / 12 / 2 | 2, 1 PA |
| Chasseur Nachtjäger | Aérodrome + munitions | Interception, +5 contre l’aérien | 8 / 8 / 3 | 10, 1 PA |
| Bombardier funèbre | Aérodrome + munitions + raffinerie | Bombardement | 5 / 7 / 3 | 7, ou 18 contre bâtiments, 2 PA |
| Dirigeable de guerre | Chantier de dirigeables + munitions | Bombardement et surveillance | 4 / 9 / 4 | 9, ou 16 contre bâtiments, 2 PA |
| Dragon du Reich noir | Sanctuaire draconique + fonderie alchimique | Souffle occulte, siège | 5 / 8 / 2 | 14, ou 20 contre bâtiments, 2 PA |
| Canon antiaérien Flak | École de défense antiaérienne + munitions | Défense mobile, +10 contre l’aérien | 2 / 6 / 5 | 5, 1 PA |

La Flak reste terrestre ; les cinq autres unités volent. Chaque hexagone survolé coûte un point de déplacement, quel que soit le terrain ou la présence d’une route. Le trajet coûte toujours 1 PA. Les unités aériennes survolent les murs et les unités, mais leur case d’arrivée doit être libre de toute autre unité. Elles peuvent stationner au-dessus d’un bâtiment. Les régions inconnues restent inaccessibles et la portée de déplacement est contrôlée par le serveur.

Aucune unité aérienne ne capture de territoire. Les unités terrestres de portée 1 ne peuvent pas les attaquer ; celles de portée supérieure à 1 le peuvent, dans leur portée habituelle. Les avions et dragons ne bénéficient pas du couvert du terrain ou des murs. Une attaque aérienne peut aussi atteindre une troupe terrestre derrière un mur. Trêves, protection initiale, visibilité, PA et ressources gardent leurs règles habituelles.

Les bâtiments de défense n’ouvrent pas automatiquement le feu : l’école antiaérienne forme des canons qui tirent sur ordre du joueur. Les attaques du bombardier, du dirigeable et du dragon coûtent 2 PA. Les appareils mécaniques se réparent avec de l’or et du fer ; le dragon se soigne avec de l’or et des vivres. Son entretien coûte 2 vivres par minute en plus de l’or, pour limiter les armées de dragons.

## Progression

- Garage et relais radio → aérodrome (plaine ou ruines).
- Aérodrome et raffinerie → chantier de dirigeables (plaine ou ruines).
- Observatoire noir et caserne des revenants → sanctuaire draconique (colline, montagne, ruines ou sol corrompu).
- Munitions et radio → école de défense antiaérienne (plaine, colline ou ruines).

Les quatre bâtiments ont trois niveaux. Chaque amélioration apporte +10 % aux PV, à l’attaque et à la défense des recrues correspondantes, existantes et futures ; le pourcentage de santé courant est conservé. Les améliorations ne se cumulent pas entre plusieurs bâtiments identiques : le meilleur niveau s’applique. Les unités peuvent être rares selon la règle existante de 1 %. Démolition, remboursement initial, terrain, rayon de construction et population utilisent les règles communes.

L’onglet Aviation rassemble les cinq unités volantes ; la Flak se trouve dans Artillerie. Les figurines utilisent l’atlas `aviation.png` et la même isolation des silhouettes que les autres unités, avec un socle et une marge pour préserver les ailes.

Aucune migration SQL ou réinitialisation du monde n’est nécessaire. Déployer client et serveur ensemble : les règles de mouvement et de ciblage ont évolué.

## Catalogue de construction

À la demande du joueur, la palissade en bois est épinglée tout en haut du catalogue, avant le classement habituel par compatibilité de terrain et progression. Les filtres restent applicables : elle figure en premier dans Tous et Défenses lorsqu’elle correspond à la recherche.
