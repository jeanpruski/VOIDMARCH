# Combats plus courts — Saison 0

Objectif : 2 à 4 attaques à forces égales, sans changer les PV des unités ou des bâtiments. Ce n’est pas une limite universelle de quatre coups : un fusil reste peu adapté contre un blindé, un ingénieur ne devient pas un combattant et les avantages de terrain restent utiles.

## Réglage

Le coefficient d’impact offensif est défini par type d’unité dans `packages/game-rules/src/combat-pace.ts`, à partir du catalogue de base. Point de départ : puissance offensive doublée. Les profils très résistants obtiennent seulement le complément nécessaire pour tenir quatre coups de référence, au lieu de recevoir la même cadence que les attaquants fragiles. Ceux-ci conservent leur puissance doublée, plafonnée uniquement pour éviter le meurtre de leur équivalent en un coup. L’étalon est un adversaire identique, sur plaine (mer pour les navires), sans entraînement.

Le coefficient reste fixe pendant le combat. Il ne dépend ni des PV restants, ni des PV ou du niveau de la cible. Les bonus de terrain, d’entraînement, d’aura, de ravitaillement, d’expérience, de soutien et de rareté continuent de s’appliquer. La défense et la pénétration d’armure sont conservées. Les statistiques ATQ/DÉF affichées sont des caractéristiques, et non directement les dégâts ; l’aperçu de combat affiche les dégâts finaux et une fourchette de coups nécessaires.

Les dégâts contre les bâtiments augmentent de 50 % avant l’arrondi final. Leurs PV, les coûts en PA et les règles d’interception des remparts sont conservés. Un coup qui détruit un rempart ne traverse pas celui-ci pour toucher la troupe derrière.

Tourelles et PNJ utilisent une puissance offensive ×2 contre les unités. Les ripostes utilisent la même formule que les attaques. Les sous-marins conservent leur coefficient ×2 et gagnent des torpilles perforantes contre les navires blindés : bonus de 40 / 60 / 90 selon le modèle et 75 % de défense ignorée. Cela préserve leur rôle contre les cuirassés qui profitent aussi des combats plus rapides.

## Vérification reproductible

`node --import tsx scripts/audit-combat-pace.ts`

1 345 duels de référence : 269 profils avec attaque positive × 5 bonus d’entraînement (0, 25, 60, 80, 100 %). 1 320 restent entre 2 et 4 coups même en utilisant uniquement les dégâts minimum ou maximum. Les 25 exceptions sont cinq rôles testés contre leur propre type : DCA neutronique, avion de reconnaissance, médecin de peste, bélier et ingénieur. Leurs attaques hors spécialité restent volontairement faibles.

Exemples sans entraînement, contre leur propre type :

| Profil | PV conservés | Dégâts par attaque | Coups |
| --- | ---: | ---: | ---: |
| Infanterie | 30 | 11–13 | 3 |
| Garde | 46 | 13–15 | 4 |
| Chevalier | 48 | 29–31 | 2 |
| Fusilier | 46 | 34–36 | 2 |
| Char | 110 | 32–34 | 4 |
| Forteresse Oni | 298 | 76–78 | 4 |
| Béhémoth pyramidal | 305 | 78–80 | 4 |
| Cuirassé atomique | 600 | 167–169 | 4 |

Les tests couvrent également les vrais tirs serveur, les ripostes, la pénétration, les terrains, la protection par remparts et les affrontements navals existants. Ces simulations mesurent les impacts nécessaires pour mettre une cible hors combat ; elles ne constituent pas une garantie de victoire ou de survie de l’attaquant.

Aucune migration de PV ni réinitialisation du monde n’est requise. Le client et le serveur doivent être déployés ensemble pour conserver le même aperçu des dégâts.

## Audit global complémentaire

Le premier calibrage comprimait trop l’offensive des unités fragiles tout en renforçant les défenseurs. Sur une cible Garde, sans entraînement, un berserker passe de 9–11 à 21–23 dégâts ; le Garde de 16–18 à 13–15 ; l’archer de 3–5 à 11–13. Les rôles restent différents : portée, résistance, terrain, population, coût et initiative comptent toujours. Le Garde reste un bon combattant au contact ; un prix supérieur ne garantit pas de gagner chaque duel.

Le script exécute aussi 70 affrontements par le moteur serveur, avec alternance de l’initiative et dix tirages par scénario. Un berserker entraîné au niveau 2 bat un Garde niveau 1 ; celui-ci bat l’infanterie niveau 1 au contact. Le char niveau 3 bat le fusilier de même entraînement ; bazooka et char de même entraînement gagnent chacun cinq duels selon l’initiative. La DCA bat le bombardier. Ces échanges commencent à portée et ne simulent pas l’approche, la retraite ou le tir à distance en mouvement. Les tests existants vérifient en outre les groupes antichars et les groupes de sous-marins face aux élites de niveau 5, ainsi que les murs, les ripostes et le rendement des armes de siège par PA.

### Soins

La guérisseuse restaure désormais 20 % des PV maximum des alliés biologiques à deux cases (minimum 6 PV), les autres soigneurs 10 % (minimum 3 PV), pour 1 PA. Les soins suivent donc les PV entraînés et restent utiles en fin de progression. Ils sont limités aux blessures réelles et excluent machines, passagers et unités à zéro PV.

Après des dégâts reçus il y a moins de 90 secondes, un délai de 30 secondes par cible est partagé entre cette capacité et la réparation individuelle. Alterner plusieurs soigneurs ou une réparation ne contourne pas ce délai. Le moteur et la prédiction client utilisent le même calcul. Les pouvoirs du héros, soumis à leur propre recharge de cinq minutes, restent distincts.

### Économie et progression

Les prix, récompenses de mission/expédition, paliers de trophées, PV et coûts en PA sont conservés. Le benchmark économique utilisait une ancienne dotation après récoltes ; il utilise maintenant les ressources de départ réelles et sept PA pour le paysan et les premiers déplacements.

Deux parcours paient réellement constructions, améliorations et stockage. Avec les producteurs limités au niveau 3, le parcours atteint l’époque 5 après environ 40,5 heures simulées et le complexe des cloches niveau 5 après 71 heures. Investir systématiquement dans tous les producteurs jusqu’au niveau 5 demande davantage de capital : respectivement 132,8 et 160,7 heures dans ce parcours précis.

Ce sont des mesures économiques contrôlées, **pas des temps promis aux joueurs** : les cinquante trophées sont supposés déjà acquis, le terrain est favorable, les déplacements après le départ et les guerres sont exclus, et aucun butin de mission n’est ajouté. Les missions accélèrent le financement ; leur obtention et les trajets prennent du temps. Les tests contrôlent également les rendements des producteurs, les prérequis et les dépenses d’entretien. Des parties réelles restent nécessaires pour mesurer les stratégies dominantes en multijoueur.
