# Équilibrage v0.7 — progression, investissement et spécialisation

Cette version couvre les 255 types d’unités et les 61 types de bâtiments du catalogue. Le départ conserve 40 PA, une réserve régénérable de 20 PA, un PA toutes les 30 secondes et le premier paysan gratuit. Les premières constructions gardent leur prix ; bois et minerais restent liés à leurs terrains.

## Économie

Les grands producteurs occupent moins de terrain pour un débit supérieur. Leurs améliorations deviennent des investissements amortissables, tandis que les bâtiments de recrutement paient aussi leurs nouveaux déblocages.

| Production brute / minute, niveau 1 | Fondations | Industrie | Occulte |
| --- | ---: | ---: | ---: |
| Bois | 8 | 48 | 160 |
| Pierre | 6 | 36 | 120 |
| Fer | 5 | 30 | 100 |

La mine d’or produit 24 or/min, la fonderie alchimique 30 et le réacteur noir 120. La boulangerie produit 24 vivres/min. Multiplicateurs des niveaux 1 à 5 : **1 / 1,8 / 3 / 5 / 8** ; les villages conservent leur multiplicateur propre. Un terrain incompatible ou brûlé ne produit toujours aucun minerai.

Les extractions ajoutent dès le niveau 2 **250 / 750 / 2 500 / 8 000** places de stockage par ressource ; les extracteurs industriels et occultes en ajoutent trois fois plus. Entrepôts, greniers et gares gardent leur rôle de stockage massif. Les stocks déjà accumulés ne sont pas effacés.

## Améliorations

Chaque évolution débite ses ressources et coûte 2 PA. Prix des étapes successives, exprimés en multiples du prix initial :

- Producteurs sans recrutement : **0,8 / 1,4 / 2,4 / 4**.
- Autres bâtiments ordinaires : **2 / 4 / 8 / 16**.
- Les bâtiments militaires ont aussi un minimum de **80 / 500 / 2 500 / 10 000 or**, accompagné de bois (50 %), pierre (40 %) et fer (60 %). Le plus élevé du devis habituel et du plancher est appliqué, ressource par ressource.
- Campement, avant-poste, villes et remparts conservent leurs devis spécifiques.

Le plancher évite de débloquer une armée moderne pour quelques centaines de ressources en améliorant une caserne de départ. Les niveaux 4 et 5 restent des investissements importants ; les chaînes industrielles très coûteuses gardent un prix proportionnel à leur construction.

## Armées et contres

Les statistiques résolues sont dans `UNITS`, les profils dans `UNIT_PROFILES`. Les fichiers de thèmes conservent les silhouettes de conception ; `packages/config/src/balance.ts` les convertit dans une échelle commune. Les différences de mobilité, portée, blindage et spécialités subsistent. Les plafonds souples gardent les variantes résistantes ou fragiles plutôt que d’aplatir toutes les figurines d’un même rôle.

Les prix des paliers 2 à 6 suivent un budget de puissance comprenant PV, attaque, défense, portée, déplacement, capacités de contre, vol, blindage et siège. Les matériaux suivent le rôle : davantage de fer pour les machines, davantage de vivres pour la cavalerie. Les unités civiles, l’armée de départ et les prix exceptionnels des Glocke restent hors de cette nouvelle tarification.

Les populations et entretiens sont harmonisés par rôle et palier. Une variante récente ne mobilise plus arbitrairement trois habitants contre cinq pour son équivalent ancien. Les armées avancées consomment plus d’or, les machines du fer et les montures des vivres. Ces dépenses s’appliquent aussi aux armées existantes ; un dépassement de mobilisation empêche de nouvelles recrues, sans effacer de troupes.

L’entraînement des niveaux 1 à 5 donne **0 / 25 / 60 / 80 / 100 %** aux PV, attaque et défense, sans cumul entre bâtiments. Les meilleurs niveaux renforcent aussi les troupes existantes. Par exemple, le Mausolée entraîné au maximum atteint **59,2 d’attaque**, contre **8** pour le fantassin débutant. Rareté, vétérans, aura et contres peuvent modifier les dégâts ; le rapport n’est pas universel.

Le bazooka gagne +32 contre les blindés et ignore 75 % de leur défense. La Flak gagne +30 contre les aéronefs et ignore 50 % de leur défense. Les spécialistes antichars et antiaériens au sol ont une réduction de 20 % sur leur budget de prix. L’école de DCA demande les munitions, sans imposer de relais radio.

Les grenades d’infanterie coûtent 1 PA. Les véritables sapeurs de siège, canons, mortiers et bombardiers gardent 2 PA et une puissance renforcée contre les bâtiments. Les Glocke doublent leur attaque structurelle de base ; leur prix et leur vulnérabilité à la DCA demeurent. Les remparts conservent leurs PV et leurs interceptions : l’artillerie devient une réponse spécialisée aux défenses, sans rendre les tirs ordinaires équivalents.

## Vérification et reprise des sauvegardes

Les [simulations reproductibles](balance-simulations.md) font payer les commandes du vrai serveur dans deux parcours économiques, puis comparent les tirs et 80 escarmouches sur terrain plat. Dans ces conditions, un bazooka seul perd contre un Mausolée avancé ; six bazookas le battent, alors que six fusiliers échouent. Les unités mobiles, les murs, les auras, les coalitions et les joueurs qui réagissent peuvent changer ces résultats.

La migration `balanceVersion: 4` s’exécute au chargement du monde. Elle conserve les proportions de blessures, la rareté, les victoires, les ressources, les PA, les possessions et les remboursements historiques. Les archives sont adaptées aussi. Les PNJ présents gardent leurs statistiques propres. Les anciens bonus de formation +100 / +160 % deviennent +80 / +100 %. Aucune remise à zéro du monde ni migration SQL nécessaire.

Le [catalogue chiffré complet](balance-audit.md) inclut les coûts, les statistiques finales, l’entretien, la mobilisation, les PA d’attaque et les devis d’évolution. Ces simulations bornées réduisent les incohérences ; les parties longues restent nécessaires pour mesurer l’accumulation de ressources, les sièges et les grandes alliances.
