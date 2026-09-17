# Héros de VOIDMARCH

Chaque royaume humain possède un seul héros, sans entretien ni consommation de population. Il apparaît sur une case libre et praticable tirée au hasard à 1 à 4 hexagones du bâtiment de départ, en terrain neutre ou allié, et laisse la case du premier paysan libre. Cette règle s’applique aussi à son retour après une mise hors combat. Si aucune case ne convient dans ce rayon, il attend qu’une place se libère. Les royaumes bots n’en reçoivent pas.

## Identité et apparence

À l’inscription, le joueur choisit parmi 15 têtes, 15 tenues et armures, 15 ensembles de bottes et 15 armes ou accessoires. Chaque élément possède sa couleur indépendante, avec palette et sélecteur libre. Les uniformes militaires, casquettes d’officier, armures médiévales, masques et équipements occultes peuvent être mélangés. L’aperçu et la figurine sur la carte utilisent exactement le même assemblage.

L’apparence est définitive après inscription. Les invités et les royaumes existants reçoivent une apparence aléatoire, enregistrée une seule fois. Transformer un compte invité en compte permanent conserve le héros. Le pseudo du joueur apparaît au-dessus de sa tête sur la carte et suit ses déplacements. Les équipements sont cosmétiques : toutes les apparences disposent des mêmes capacités.

## Présence et pouvoirs

Le héros a 80 PV, 6 de défense, 4 de mouvement et 5 de vision. Il se déplace selon les règles ordinaires, y compris les routes et territoires. Il ne peut ni attaquer directement, ni capturer, ni construire. Son arme est un accessoire visuel.

Les troupes alliées situées à 2 hexagones reçoivent un bonus automatique d’attaque et de défense : 8 % au grade 1, 10 % au grade 2, 12 % au grade 3. Le bonus ne s’applique ni aux bâtiments, ni au héros lui-même. Il cesse hors de portée ou pendant sa convalescence. Plusieurs auras ne se cumulent pas.

| Pouvoir                    | Coût                  | Effet                                                                                                                   |
| -------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Secours de campagne        | 2 PA                  | Rend 20 % des PV maximum aux alliés biologiques blessés à 2 cases, héros compris. Aucun soin des véhicules.             |
| Superviser les réparations | 2 PA, 20 bois, 10 fer | Rend 20 % des PV maximum aux bâtiments alliés blessés à 1 case.                                                         |
| Reconnaissance occulte     | 2 PA                  | Cartographie le terrain à 8 cases et le conserve dans l’exploration. Ne permet pas de suivre les ennemis en permanence. |

Chaque pouvoir a sa propre recharge de 5 minutes. Un soin ou une réparation sans cible blessée est refusé sans coût. Chaque utilisation réussie rapporte 2 points d’expérience, jusqu’à 60 : grade 2 à 20, grade 3 à 60. Les coûts, descriptions et recharges figurent dans la sélection du héros et dans le panneau Royaume.

## Mise hors combat

À zéro PV, le héros quitte temporairement la carte et revient après 5 minutes, avec ses PV restaurés, la même apparence, l’expérience et les recharges conservées. Il attend une case libre près de la capitale si nécessaire. Si le royaume a été vaincu, il attend aussi sa reconstruction. Il est impossible d’en recruter un deuxième.

## Persistance et validation

L’apparence choisie est enregistrée dans les paramètres du compte, puis dans l’état du royaume. Les pouvoirs, l’expérience et la convalescence sont validés côté serveur. Les héros manquants sont créés automatiquement lors des transactions du monde, y compris au démarrage. Aucun changement de schéma SQL ni réinitialisation du monde n’est nécessaire.

Les tests `heroes.test.ts` et `hero-auth.test.ts` couvrent l’unicité, les règles de combat, la convalescence, les pouvoirs, les bonus, les coûts et la permanence de l’apparence. `heroes.e2e.ts` vérifie l’inscription personnalisée, les 15 variantes, le rendu mobile et un soin réellement exécuté par le moteur via une simulation réseau locale.

Planches et prompts : [assets-heroes.md](assets-heroes.md).
