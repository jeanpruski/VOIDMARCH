# Joueurs connectés

Le compteur en bas à gauche ouvre une fenêtre présentant les joueurs connectés (sans les bots), leur nom et bannière, la durée de leur session et leur statut de mission. Le joueur courant apparaît en premier, puis les autres par ordre alphabétique. La durée avance toutes les secondes ; le statut de mission est actualisé avec les états du monde.

La présence est calculée à partir des sockets ayant rejoint le monde. Plusieurs onglets d’un joueur partagent le même début de session ; seul le départ du dernier onglet le retire de la liste. Une nouvelle connexion après déconnexion complète ouvre une nouvelle session. Un redémarrage du serveur repart aussi de nouvelles sessions. Le délai de grâce économique continue de fonctionner indépendamment.

Le serveur publie uniquement `onMission`, sans révéler l’objectif ou la position des missions des autres joueurs. Ce statut signifie qu’une mission acceptée par le joueur est encore active ; aider un allié sans mission personnelle ne change pas ce statut.

Les nouveaux champs publics sont facultatifs pour la compatibilité. Aucun changement de base de données ni remise à zéro. Tests : connexions multiples, reconnexion, grâce économique, statut de mission, compteur, clavier, durées et affichage mobile.
