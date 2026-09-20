# Repérage des capitales

Sur la carte, taper **zsx**, puis **Entrée**, sans sélectionner un champ de texte ni ouvrir une fenêtre. Répéter le code pour désactiver. Comme le code des PA illimités, il est utilisable par tout joueur qui le connaît. Aucun bouton de découverte du code n’est ajouté dans l’interface.

Le serveur mémorise `capitalRadar` sur le royaume. Les deux modes sont désactivés côté serveur à chaque lancement, rechargement de page ou nouvelle connexion au compte, avant l’envoi de la carte. Une simple reconnexion réseau ou le renouvellement automatique du jeton dans la même page conserve le choix. Les modes sont communs au royaume : ouvrir un nouvel onglet les désactive aussi dans les autres onglets du compte. L’API authentifiée `/api/admin/capital-radar` vérifie le code et limite les tentatives à 5 par minute.

Quand le repérage est actif, les flèches sur les bords de la carte indiquent les capitales actuelles de tous les autres royaumes non vaincus, joueurs et bots, y compris sous le brouillard et pendant une trêve. Chaque repère porte le nom du royaume, sa couleur et sa distance. Les groupes de repères sont défilables si plusieurs capitales se trouvent du même côté.

La distance est la distance hexagonale directe depuis la case au centre de la caméra, et non depuis sa propre capitale ou son unité sélectionnée. Ce n’est pas une longueur de trajet praticable. Le déplacement de caméra actualise les flèches et les distances ; zoomer sans déplacer le centre ne change pas la distance. Une capitale déjà dans la fenêtre conserve son repère et peut afficher 0 case si elle est au centre.

Les coordonnées sont envoyées dans `enemyCapitals` uniquement aux joueurs ayant activé ce code. Il ne révèle ni terrain, ni armée, ni vision de combat, et n’autorise aucun ordre supplémentaire. Le code `aqw` reste indépendant.

Tests : filtrage des coordonnées, conservation du brouillard, royaumes vaincus et propre capitale exclus, déplacement d’une capitale, géométrie des quatre directions, centre caméra et zoom, activation/désactivation, saisie dans un champ, raccourcis, plusieurs repères, mobile et compatibilité avec les PA illimités.
