# Adaptations innées aux biomes

Certaines unités terrestres disposent de **+1 point de déplacement** lorsque leur ordre MOVE commence dans leur biome de prédilection. Aucun bâtiment ou niveau supplémentaire n’est nécessaire. Ce n’est pas une réduction du coût des cases : obstacles, occupation, remparts et terrains impraticables gardent leurs règles.

| Biome      | Attribution                                                                                                                                                                            | Types adaptés |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Enneigé    | Légions du Givre terrestres                                                                                                                                                            | 21            |
| Désertique | Dynasties du Soleil noir terrestres                                                                                                                                                    | 18            |
| Tempéré    | Ronces terrestres hors sélection automnale, éclaireur et rôdeur                                                                                                                        | 18            |
| Automnal   | Grenadier des spores, mortier des souches, chariot des sorcières, tireur des brumes, DCA des corbeaux, cavalier spectral, médecin de la peste, cuirassier du tombeau, char du sépulcre | 9             |

66 types adaptés sur 269. Une seule adaptation par unité. Héros, bâtisseurs, PNJ neutres et aéronefs exclus ; une affinité de combat en forêt ne donne pas automatiquement une adaptation climatique. Les troupes de mission récupérées peuvent utiliser leur adaptation innée après leur passage sous le commandement d’un joueur.

## Ordres et cumul

Budget = mobilité permanente (incluant le soutien militaire) + adaptation éventuelle + bonus de faction existant. Le cumul du soutien et de l’adaptation est au maximum +2 ; le bonus de cavalerie de la faction du Fer reste séparé. Ni les PA consommés par troupe, ni la vision, la portée, les capacités de transport ou les statistiques de combat ne changent.

Le budget est fixé **une fois au départ de chaque ordre**. Quitter le biome pendant cet ordre ne retire pas le bonus ; y entrer ne le donne pas en cours de route. L’ordre suivant utilise sa nouvelle case de départ. Routes et territoires reliés conservent leur trajet illimité pour 1 PA. Chaque membre d’un groupe utilise sa propre position et son propre budget.

Le biome enregistré sur la case fait foi, même dans les transitions visuelles de 3 à 7 cases. Les anciennes cases sans champ biome retrouvent leur biome déterministe avec la graine du monde. Le choix du décor mélangé n’intervient jamais ; aucune variation au rechargement. Un terrain inconnu ne révèle pas son biome par le calcul du bonus.

## Interface et compatibilité

La fiche de troupe affiche la mobilité effective et une ligne d’adaptation active/inactive. Le recrutement et la fenêtre « Origine des bonus » expliquent son origine innée. La recherche du catalogue accepte les noms de biomes et d’adaptations (ex. « froid », « sables », « automnal »). Les trajets, les surbrillances, les prévisions optimistes, les ordres groupés et le serveur utilisent la même règle. L’estimation de voyage recalcule le budget à chaque départ simulé.

Aucune modification des unités enregistrées, aucun nouveau champ persistant ni migration SQL. Les unités existantes reçoivent automatiquement cette règle.

Validation : couverture des quatre biomes, exclusions, cumul borné, transitions, compatibilité des anciennes cases, départ figé, serveur/prévision, groupes, routes, impraticabilité, voyages multi-PA ; navigateur sur les quatre adaptations, portée de la carte, franchissement d’une frontière et catalogue mobile.
