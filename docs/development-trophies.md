# Développement et trophées

Les niveaux de développement 2, 3, 4 et 5 exigent respectivement **1, 5, 20 et 50 trophées au total**. Missions de conquête et expéditions réussies comptent dans le même historique personnel. Les trophées ne sont jamais dépensés ; un abandon, une découverte seule, les médailles d’un allié et le prestige des guerres ne comptent pas. Les conditions cumulatives d’infrastructure restent nécessaires ; les conquêtes conservent également leur condition de recruteur.

La règle est partagée entre serveur, catalogue et prévisualisation : accès aux unités, constructions/évolutions déjà soumises au développement, tableaux de missions et d’expéditions, recettes et quotas de logistique, adaptation des PNJ. Elle ne transforme pas chaque niveau individuel de bâtiment en niveau de royaume : les améliorations civiles nécessaires pour préparer le palier restent possibles. Les offres exceptionnelles à +1 niveau (5 %) sont conservées ; réussir une telle mission attribue son trophée normal, pas un déblocage automatique d’époque.

Les compteurs « Trophées : X/Y » apparaissent dans Royaume et dans les deux tableaux de missions, en rouge lorsque le seuil manque. Les conditions de construction et recrutement indiquent aussi le nombre manquant. La vigie reçoit le niveau calculé par le serveur.

## Compatibilité

Une migration idempotente enregistre le développement accessible au moment de la mise à jour des royaumes existants et de leurs archives. Ce niveau est exempté de la nouvelle condition de trophées, sans fabriquer de médaille ni toucher aux ressources. Les prochains niveaux demandent le total normal. Les bâtiments requis restent nécessaires, comme auparavant ; la destruction de l’infrastructure peut toujours réduire l’accès. Les nouveaux royaumes commencent sans exemption. Aucune remise à zéro ni migration SQL.

Les bots, qui ne réalisent pas de missions, conservent leur progression par bâtiments, conformément au choix du joueur. Leur nombre de trophées reste réel : aucune médaille artificielle n’est ajoutée au classement.

Le script de simulation économique conserve une exemption de trophées explicite pour comparer les investissements, la production, le stockage et les PA. Ses durées excluent le temps des missions et ne représentent donc pas le temps de progression complet d’un nouveau joueur.
