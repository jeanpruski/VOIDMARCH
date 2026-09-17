# Remparts et trajectoires de combat

Les attaques directes au sol touchent le **premier rempart vivant** qui coupe le segment entre le tireur et sa cible. Cela inclut un mur sur la case de départ ou d’arrivée. Un tir longeant exactement une bordure ne peut pas se glisser entre deux tronçons.

- Fusil, mitrailleuse, arbalète, bazooka, canon à tir tendu, lance-roquettes et pouvoirs occultes directs : interceptés.
- Archer, rôdeur, catapulte, mortier et sapeur atomique : tir en cloche, franchit les murs.
- Toutes les unités aériennes : tir depuis le ciel, franchit les murs.
- Tourelles : tir en hauteur, franchit les murs. Une attaque contre la tourelle endommage son rempart.
- Corps à corps : le rempart doit être détruit avant de toucher l’unité protégée.
- Une cible aérienne n’est pas protégée par les murs au sol ; les restrictions habituelles de ciblage aérien restent applicables.

L’interception utilise la défense du mur, son terrain et les dégâts contre les bâtiments du tireur. Même si le mur tombe, aucun dégât excédentaire ne traverse : il faut une nouvelle attaque. Un mur détruit ne bloque plus les tirs suivants.

Un mur appartenant au tireur bloque l’ordre sans dépense de PA ni dégâts alliés. Les trêves et la protection initiale de la cible visée **et** du propriétaire du mur intercepteur sont respectées. Les bots suivent les mêmes règles.

Les ripostes des PNJ suivent exactement la même trajectoire : un archer peut tirer au-dessus de son propre rempart, puis voir la riposte du fusilier PNJ absorbée par ce rempart. Les dégâts et les éventuelles destructions concernent alors le mur, pas l’archer.

Le panneau de confirmation montre la véritable cible touchée, les dégâts correspondants et un avertissement d’interception. La riposte estimée précise aussi lorsqu’un mur protège l’attaquant. Le projectile immédiat et le rapport serveur pointent vers le mur touché.

Validation : `tests/wall-combat.test.ts` (armes, six directions, bordures, dégâts, destruction, ripostes et diplomatie), régressions remparts/aviation/tourelles et parcours navigateur dans `tests/wall-combat.e2e.ts`.
