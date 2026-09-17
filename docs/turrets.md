# Tourelles de rempart

Sélectionner un de ses remparts, puis **Installer une tourelle · 2 PA**. Un paysan ou un ingénieur vivant doit se trouver sur la case ou une case voisine. Une case occupée par un adversaire ne peut pas être équipée.

La tourelle est un équipement du mur : elle n’occupe pas une nouvelle case, ne gêne pas le passage des unités du propriétaire et conserve les raccords de l’enceinte. Elle partage les points de vie du rempart et disparaît avec lui.

| Niveau | Arme                   | Mur minimal | Attaque | Portée  | Prix de cette étape, hors mur    |
| ------ | ---------------------- | ----------- | ------- | ------- | -------------------------------- |
| 1      | Arbalète de rempart    | Bois        | 16      | 3 cases | 2 PA, 60 or, 50 bois, 20 fer     |
| 2      | Canon de rempart       | Pierre      | 30      | 4 cases | 2 PA, 120 or, 60 pierre, 50 fer  |
| 3      | Tourelle Tesla occulte | Acier       | 48      | 5 cases | 2 PA, 220 or, 40 pierre, 120 fer |

Les évolutions du mur et de l’arme sont séparées. Un rempart de pierre peut garder son arbalète ; il faut ensuite améliorer la tourelle pour obtenir le canon. Un mur en acier peut accueillir les trois niveaux. Chaque arme commence au niveau 1, même sur un mur déjà amélioré. Les évolutions de tourelle ne demandent pas de bâtisseur et ne réparent pas le mur.

## Tir manuel

Sélectionner le rempart équipé, cliquer sur **Tirer avec la tourelle · 1 PA**, puis choisir une cible ennemie dans la portée surlignée. La confirmation indique les dégâts estimés. Chaque tir coûte 1 PA, à tous les niveaux. Aucun tir automatique n’a lieu, même lorsqu’un ennemi entre dans la zone.

Le tir est possible de 1 case jusqu’à la portée indiquée, jamais sur la case de la tourelle. Les unités et bâtiments ennemis sont ciblables ; les trêves et la protection initiale restent appliquées. Le tir élevé franchit les remparts. La tourelle révèle les cases dans sa portée. Les cibles aériennes sont accessibles, avec un bonus de 18 dégâts pour le Tesla. Les dégâts réels tiennent compte de la défense de la cible et de son terrain.

Les projectiles partent du sommet du mur : carreau, obus puis décharge électrique. L’option de réduction des animations reste respectée.

## Démolition et sauvegardes

Démolir un rempart équipé retire aussi sa tourelle. Le remboursement comprend la construction initiale du mur et l’installation de l’arbalète ; les évolutions du mur et de la tourelle ne sont pas remboursées. La destruction par un adversaire ne rembourse rien.

Les équipements sont sauvegardés avec leur bâtiment (`turretLevel`, `turretConstructionCost`). Ces champs facultatifs laissent les anciens murs inchangés. Les ordres et les coûts sont validés par le serveur. Un marqueur de travaux apparaît immédiatement ; l’arme installée ou améliorée apparaît à la confirmation.
