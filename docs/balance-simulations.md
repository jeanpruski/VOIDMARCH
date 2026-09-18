# Simulations d’équilibrage v0.7

Reproduction : `node --import tsx scripts/simulate-balance.ts`. Le modèle emploie les commandes BUILD/UPGRADE/GATHER du serveur : dépenses, prérequis, stockage, production nette et PA réels. Départ après 13 récoltes manuelles, un paysan gratuit et six déplacements (20 PA utilisés), puis fouille active de ruines proches jusqu’au premier marché. Chantiers favorables considérés accessibles et revendiqués, déplacement et conquête ultérieurs exclus, joueur présent en continu, aucune récompense ni attaque adverse, contamination non simulée. Les durées sont des repères de ce parcours économique, pas une promesse de durée de partie ni un parcours optimal.

| Investissement | Minutes actives cumulées | Capacité par ressource | Or/min net | Bois/min net | Pierre/min net | Fer/min net |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Scierie | 0 | 800 | 1.8 | 8 | 0 | 0 |
| Carrière de pierre | 0 | 800 | 1.7 | 8 | 6 | 0 |
| Mine de fer | 0 | 800 | 1.7 | 8 | 6 | 5 |
| Ferme | 2.5 | 800 | 1.7 | 8 | 6 | 5 |
| Chaumière | 5 | 800 | 1.6 | 8 | 6 | 5 |
| Entrepôt | 14.5 | 1800 | 1.6 | 8 | 6 | 5 |
| Marché | 22 | 1800 | 9.5 | 8 | 6 | 5 |
| Scierie niveau 2 | 24.5 | 2050 | 9.5 | 14.4 | 6 | 5 |
| Scierie niveau 3 | 27 | 2550 | 9.5 | 24 | 6 | 5 |
| Carrière de pierre niveau 2 | 28 | 2800 | 9.5 | 24 | 10.8 | 5 |
| Carrière de pierre niveau 3 | 30 | 3300 | 9.5 | 24 | 18 | 5 |
| Mine de fer niveau 2 | 31 | 3550 | 9.5 | 24 | 18 | 9 |
| Mine de fer niveau 3 | 35 | 4050 | 9.5 | 24 | 18 | 15 |
| Marché niveau 2 | 42.5 | 4050 | 15.9 | 24 | 18 | 15 |
| Marché niveau 3 | 50.5 | 4050 | 25.5 | 24 | 18 | 15 |
| Atelier | 58 | 4050 | 27.5 | 24 | 18 | 15 |
| Mine d’or | 72.5 | 4050 | 51.5 | 24 | 18 | 15 |
| Forge | 77.5 | 4050 | 51.4 | 24 | 18 | 15 |
| Scierie à vapeur | 86.5 | 4050 | 51.4 | 72 | 18 | 15 |
| Carrière mécanisée | 97.5 | 4050 | 51.3 | 72 | 54 | 15 |
| Mine industrielle | 110 | 4050 | 51.3 | 72 | 54 | 45 |
| Caserne | 110.5 | 4050 | 51.3 | 72 | 54 | 45 |
| Arsenal | 118.5 | 4050 | 51.2 | 72 | 54 | 45 |
| Mine d’or niveau 2 | 124.5 | 4300 | 70.4 | 72 | 54 | 45 |
| Mine d’or niveau 3 | 132.5 | 4800 | 99.2 | 72 | 54 | 45 |
| Scierie à vapeur niveau 2 | 136.5 | 5550 | 99.2 | 110.4 | 54 | 45 |
| Scierie à vapeur niveau 3 | 143.5 | 7050 | 99.2 | 168 | 54 | 45 |
| Carrière mécanisée niveau 2 | 148 | 7800 | 99.2 | 168 | 82.8 | 45 |
| Carrière mécanisée niveau 3 | 156 | 9300 | 99.2 | 168 | 126 | 45 |
| Mine industrielle niveau 2 | 161 | 10050 | 99.2 | 168 | 126 | 69 |
| Mine industrielle niveau 3 | 170 | 11550 | 99.2 | 168 | 126 | 105 |
| Arsenal niveau 2 | 178 | 11550 | 99.2 | 168 | 126 | 105 |
| Arsenal niveau 3 | 194 | 11550 | 99.2 | 168 | 126 | 105 |
| Monastère | 195.5 | 11550 | 102.2 | 168 | 126 | 105 |
| Bibliothèque des astres | 198.5 | 11550 | 106.1 | 168 | 126 | 105 |
| Laboratoire des cendres | 215 | 11550 | 106.1 | 168 | 126 | 105 |
| Scierie des ombres | 243 | 11550 | 106.1 | 328 | 126 | 105 |
| Carrière runique | 273.5 | 11550 | 105.9 | 328 | 246 | 105 |
| Mine des abysses | 306.5 | 11550 | 105.9 | 328 | 246 | 205 |
| Raffinerie | 311.5 | 11550 | 111.8 | 328 | 246 | 205 |
| Fonderie alchimique | 325.5 | 11550 | 141.8 | 328 | 246 | 205 |
| Scierie des ombres niveau 2 | 342.5 | 12300 | 141.8 | 456 | 246 | 205 |
| Scierie des ombres niveau 3 | 371.5 | 13800 | 141.8 | 648 | 246 | 205 |
| Carrière runique niveau 2 | 389.5 | 14550 | 141.8 | 648 | 342 | 205 |
| Carrière runique niveau 3 | 421.5 | 16050 | 141.8 | 648 | 486 | 205 |
| Mine des abysses niveau 2 | 441 | 16800 | 141.8 | 648 | 486 | 285 |
| Mine des abysses niveau 3 | 475.5 | 18300 | 141.8 | 648 | 486 | 405 |
| Fonderie alchimique niveau 2 | 484.5 | 18300 | 165.8 | 648 | 486 | 405 |
| Fonderie alchimique niveau 3 | 498 | 18300 | 201.8 | 648 | 486 | 405 |
| Arsenal niveau 4 | 514 | 18300 | 201.8 | 648 | 486 | 405 |
| Manufacture de munitions | 516 | 18300 | 201.8 | 648 | 486 | 405 |
| Laboratoire des isotopes | 538 | 18300 | 201.7 | 648 | 486 | 405 |
| Réacteur noir | 585.5 | 18300 | 321.7 | 648 | 486 | 405 |
| Réacteur noir niveau 2 | 609.5 | 18300 | 417.7 | 648 | 486 | 405 |
| Réacteur noir niveau 3 | 641.5 | 18300 | 561.7 | 648 | 486 | 405 |
| Arsenal niveau 5 | 659.5 | 18300 | 561.7 | 648 | 486 | 405 |

## Amortissement des améliorations de producteurs

Total de toutes les ressources payées divisé par le supplément de production du matériau extrait ; indicateur de rendement matériel à valeurs égales, hors chaîne d’accès et PA. Les matériaux ne sont pas interchangeables et ce ratio ne garantit pas la rentabilité stratégique.

| Producteur | Niveau obtenu | Gain/min | Ressources investies / gain par minute |
| --- | ---: | ---: | ---: |
| Scierie | 2 | 6.4 | 5 min |
| Scierie | 3 | 9.6 | 5.8 min |
| Scierie | 4 | 16 | 6 min |
| Scierie | 5 | 24 | 6.7 min |
| Scierie à vapeur | 2 | 38.4 | 22.9 min |
| Scierie à vapeur | 3 | 57.6 | 26.7 min |
| Scierie à vapeur | 4 | 96 | 27.5 min |
| Scierie à vapeur | 5 | 144 | 30.6 min |
| Scierie des ombres | 2 | 128 | 37.6 min |
| Scierie des ombres | 3 | 192 | 43.9 min |
| Scierie des ombres | 4 | 320 | 45.2 min |
| Scierie des ombres | 5 | 480 | 50.2 min |
| Mine d’or | 2 | 19.2 | 44.8 min |
| Mine d’or | 3 | 28.8 | 52.3 min |
| Mine d’or | 4 | 48 | 53.8 min |
| Mine d’or | 5 | 72 | 59.7 min |

## Variante : réinvestissement économique au niveau 5

Même chemin, mais les producteurs passent au niveau 5 avant la phase suivante : plus de dépenses initiales, davantage de débit ensuite. Sans bonus gratuits.

| Jalon | Producteurs niveau 3 | Producteurs niveau 5 |
| --- | ---: | ---: |
| Arsenal | 118.5 min | 146 min |
| Arsenal niveau 3 | 194 min | 235.5 min |
| Arsenal niveau 4 | 514 min | 606 min |
| Arsenal niveau 5 | 659.5 min | 676.5 min |

## Tirs sur cible immobile

Sans riposte, couvert, rempart, héros ou rareté ; dégâts minimums pour compter les tirs. Ces essais mesurent le rendement des armes et ne prédisent pas seuls le vainqueur d’un duel.

| Attaquant (niveau du recruteur) | Cible (niveau) | Dégâts/tir | Tirs | PA |
| --- | --- | ---: | ---: | ---: |
| Fantassin (1) | Milicien (1) | 5–7 | 5 | 5 |
| Char Mausolée (5) | Fantassin (1) | 54–56 | 1 | 1 |
| Fusilier (3) | Char Mausolée (5) | 1–2 | 440 | 440 |
| Chasseur de blindés (3) | Char Mausolée (5) | 60–62 | 8 | 8 |
| Canon antiaérien Flak (3) | Die Glocke III — Götterdämmerung (5) | 50–52 | 13 | 13 |
| Fusilier (3) | Die Glocke III — Götterdämmerung (5) | 1–2 | 640 | 640 |
| Fantassin du pergélisol (3) | Grenadier au radium (5) | 17–19 | 11 | 11 |

## Escarmouches avec ordres des deux camps

20 graines déterministes par scénario, initiative alternée. Terrain plat, unités immobiles à portée réciproque, un PA de tempo par camp et par étape ; les attaques de siège attendent deux étapes. Vraies commandes serveur, morts et vétérans inclus. Aucune régénération, aura, mur ou manœuvre : ce modèle compare les spécialisations au contact, pas toutes les stratégies possibles.

| Groupe niveau 3 | Adversaire niveau 5 | Victoires du groupe / 20 | Coût en or groupe / adversaire |
| --- | --- | ---: | ---: |
| 1 × Chasseur de blindés | Char Mausolée | 0 | 380 / 7550 |
| 6 × Chasseur de blindés | Char Mausolée | 20 | 2280 / 7550 |
| 6 × Fusilier | Char Mausolée | 0 | 2970 / 7550 |
| 7 × Canon antiaérien Flak | Die Glocke III — Götterdämmerung | 20 | 3010 / 57000 |
