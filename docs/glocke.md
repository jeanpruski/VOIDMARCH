# Projet Glocke

Le complexe débloque cinq cloches volantes, une par niveau. Construire ce bâtiment exige un réacteur noir, une fonderie atomique et un observatoire noir. Ces trois infrastructures restent nécessaires au recrutement.

Chaque recrutement coûte 1 PA ; chaque tir manuel coûte 2 PA et touche une seule cible. Les modèles volent au-dessus des remparts sans capturer de terres. Ils restent vulnérables à la DCA. Wacht escorte les aéronefs, Nacht assiège les bâtiments, Sturm chasse les blindés, Götterdämmerung constitue le modèle ultime.

## Modèles et coûts

Statistiques sans entraînement ni rareté. Les coûts des améliorations sont ceux du devis normal (2 PA et ressources, jusqu’au niveau 5).

| Niveau | Modèle | PV | Attaque / siège | Défense | Déplacement / portée | Population | Coût |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Die Glocke I — Vril | 200 | 52 / 140 | 10 | 5 / 4 | 18 | 27 000 or, 3 000 bois, 16 500 fer, 2 250 vivres |
| 2 | Die Glocke — Wacht | 220 | 54 / 150 | 12 | 5 / 4 | 20 | 33 000 or, 3 600 bois, 19 500 fer, 2 700 vivres |
| 3 | Die Glocke II — Nacht | 260 | 60 / 220 | 14 | 4 / 5 | 22 | 39 000 or, 4 200 bois, 24 000 fer, 3 000 vivres |
| 4 | Die Glocke — Sturm | 290 | 62 / 250 | 15 | 4 / 5 | 24 | 48 000 or, 4 800 bois, 30 000 fer, 3 450 vivres |
| 5 | Die Glocke III — Götterdämmerung | 320 | 64 / 290 | 16 | 3 / 6 | 26 | 57 000 or, 5 400 bois, 36 000 fer, 3 900 vivres |

L’entraînement apporte +25 %, +60 %, +80 % puis +100 % aux niveaux 2 à 5. Au niveau 5, Götterdämmerung possède 640 PV, 128 d’attaque et 580 de siège avant rareté. Les améliorations conservent la proportion de blessures des cloches existantes.

Wacht et Sturm réutilisent respectivement les miniatures Vril et Nacht avec leur projectile électrique. Les trois figurines originales et celle du complexe sont documentées dans [assets-glocke.md](assets-glocke.md).

Le contrôle du niveau local et des infrastructures est partagé entre serveur et aperçu optimiste. Les tests unitaires couvrent les coûts, le recrutement, les tirs et les contres ; le scénario navigateur couvre les quatre améliorations et les cinq recrutements et le catalogue mobile. Aucune migration SQL nécessaire.
