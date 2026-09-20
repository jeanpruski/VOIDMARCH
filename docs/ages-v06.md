> La progression courante est décrite dans [Époques du royaume](kingdom-eras.md). Les règles de déblocage automatique ci-dessous décrivent la version antérieure.

# Les cinq âges de VOIDMARCH

> Note historique : les coûts, statistiques et rendements ci-dessous décrivent cette version. Pour les valeurs actuelles, voir [l’équilibrage v0.7](balance-v07.md) et [l’audit du catalogue](balance-audit.md).

Les 54 bâtiments développables passent à cinq niveaux : 1 Fondations médiévales, 2 Empire (Renaissance / époque napoléonienne), 3 Guerre industrielle, 4 Complexe avancé, 5 Âge atomique. Les installations déjà industrielles ou atomiques affinent leur propre époque sur cinq niveaux ; elles ne redeviennent pas médiévales. Le dépôt ferroviaire commence à l’âge industriel. Les fondations campement et avant-poste conservent leur transformation en village, puis le village possède cinq niveaux.

Le niveau 1 conserve l’illustration connue du joueur. Chaque bâtiment dispose d’une nouvelle planche de quatre illustrations architecturales pour ses niveaux 2 à 5 : 216 évolutions peintes, chargées à la demande. Carte, sélection, liste des villes, aperçu de combat et fenêtre d’amélioration affichent le même niveau. Cette dernière présente les deux apparences et les recrutements nouvellement débloqués.

## Économie et sauvegardes

- Niveaux 1–3 inchangés : aucun stock, bâtiment, niveau, blessure ou reçu de démolition n’est réinitialisé. Aucune migration SQL nécessaire.
- Améliorations ordinaires : 2 PA + 2,5 / 5 / 12 / 25 fois le prix du bâtiment de niveau 1, pour passer respectivement aux niveaux 2 / 3 / 4 / 5. Le devis est partagé par le serveur et le frontend, et les ressources sont réellement débitées.
- Production : ×1 / ×1,6 / ×2,4 / ×3,6 / ×5,2. Les villages conservent leur coefficient spécifique ×niveau.
- Formation militaire : +0 / +25 / +60 / +100 / +160 % aux PV, attaque et défense des recrues et des troupes existantes correspondantes. Meilleur bonus uniquement, sans cumul. Les blessures relatives sont conservées.
- Au niveau 5, les producteurs ajoutent 8 000 places par ressource à la réserve du royaume. Entrepôt : 1 000 / 4 000 / 16 000 / 50 000 / 150 000 ; grenier : 500 / 2 000 / 8 000 / 25 000 / 75 000 ; dépôt ferroviaire : 1 500 / 7 500 / 30 000 / 90 000 / 270 000.
- Les PV restent proportionnels au niveau ; la capacité de population et la vision continuent à progresser. Les restrictions de terrain, bâtisseurs et prérequis restent applicables.

## Remparts et tourelles

Bois → pierre → acier → béton blindé → enceinte atomique. Les deux nouveaux tronçons exigent notamment pierre et fer, s’obtiennent exclusivement par amélioration et conservent les règles de passage, d’enceinte et de portes sur route.

Béton : 900 PV, défense 20. Atomique : 1 600 PV, défense 32. Deux nouvelles tourelles : automatique de forteresse (72 attaque, portée 5), lance à neutrons (110 attaque, portée 6). Chaque tourelle exige le palier de mur correspondant ; tir manuel à 1 PA. Les évolutions ne remboursent toujours que la construction initiale et la pose initiale de la tourelle lors d’une démolition.

## Six unités supplémentaires

| Unité                       | Recrutement                               | Prérequis supplémentaires                |
| --------------------------- | ----------------------------------------- | ---------------------------------------- |
| Mousquetaire impérial       | Caserne niveau 2                          | Forge                                    |
| Grenadier des cendres       | Caserne niveau 2                          | Forge                                    |
| Cuirassier du crépuscule    | Écurie niveau 2                           | Forge                                    |
| Commando de l’éclipse       | Caserne ou arsenal niveau 4               | Relais radio                             |
| Escouade de drones spectres | Atelier niveau 4                          | Relais radio et manufacture de munitions |
| Garde à neutrons            | Caserne ou caserne des revenants niveau 5 | Réacteur noir                            |

Chaque unité a sa propre figurine. Les 85 unités précédentes sont conservées. Les grenades et drones passent les remparts par une trajectoire indirecte ; mousquets, fusils et rayons respectent les obstacles des tirs directs.

## Visuels et vérifications

Images créées avec l’outil imagegen intégré, RGBA conservé sans retouche locale. Fichiers : `apps/web/public/assets/ages/*.png` et `apps/web/public/assets/epoch-*.png`. Les prompts et les sources sont consignés dans `assets-ages.json`. Chaque planche de bâtiments est isolée et normalisée vers quatre cellules de 256 pixels, sans préchargement global des 54 planches.

Tests : devis et paiement des quatre améliorations, niveau maximal, anciennes sauvegardes, bonus militaires avec blessures conservées, recrutement par époque, cinq paliers de murs/tourelles, transparence et différences des 216 nouvelles images, portes et raccords, création et affichage navigateur.

## Extension des armées

20 renforts supplémentaires, quatre par époque, portent le catalogue à 111 unités. Voir [les renforts des cinq époques](era-reinforcements.md) pour leurs coûts, bâtiments et niveaux requis.
