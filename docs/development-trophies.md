> La progression courante est décrite dans [Époques du royaume](kingdom-eras.md). Les règles de déblocage automatique ci-dessous décrivent la version antérieure.

# Développement et trophées

Les niveaux de développement 2, 3, 4 et 5 exigent respectivement **1, 5, 20 et 50 trophées au total**. Missions de conquête et expéditions réussies comptent dans le même historique personnel. Les trophées ne sont jamais dépensés ; un abandon, une découverte seule, les médailles d’un allié et le prestige des guerres ne comptent pas. Les conditions cumulatives d’infrastructure restent nécessaires ; les conquêtes conservent également leur condition de recruteur.

Les paliers technologiques restent partagés entre serveur, catalogue et prévisualisation : accès aux unités, nouvelles constructions avancées, tableaux de missions et d’expéditions, recettes et quotas de logistique, adaptation des PNJ. Les améliorations individuelles suivent désormais la règle distincte ci-dessous. Les offres exceptionnelles à +1 niveau (5 %) sont conservées ; réussir une telle mission attribue son trophée normal, pas un déblocage automatique d’époque.

Les compteurs « Trophées : X/Y » apparaissent dans Royaume et dans les deux tableaux de missions, en rouge lorsque le seuil manque. Les conditions de construction et recrutement indiquent aussi le nombre manquant. La vigie reçoit le niveau calculé par le serveur.

## Niveaux des bâtiments

Chaque amélioration vers le niveau 2 demande **1 trophée**, vers le niveau 3 **5**, vers le niveau 4 **20**, vers le niveau 5 **50**. C’est le total personnel, jamais une dépense. La règle s’applique à tous les bâtiments civils, militaires et maritimes, aux matériaux des remparts (bois 1 → pierre 2 → acier 3 → béton 4 → atomique 5) et aux tourelles.

Aucun atelier ou marché d’un niveau supérieur n’est nécessaire pour effectuer ces améliorations : un premier trophée permet déjà d’améliorer l’atelier et le marché au niveau 2. Les seuils technologiques des missions, recrutements et nouvelles constructions restent distincts. Les coûts de ressources, les 2 PA, les habitants éventuels, le mur requis pour une tourelle et le délai après combat restent exigés. Campement → avant-poste → village de niveau 1 reste accessible sans trophée.

La fenêtre d’amélioration indique le compteur personnel et le total requis, en rouge si insuffisant, en vert si acquis. Le serveur et la prévisualisation appliquent la même vérification. Les bâtiments déjà améliorés ne sont jamais rétrogradés ; leur prochaine amélioration requiert le total normal, même si le royaume bénéficie d’un ancien accès technologique conservé.

## Compatibilité

Une migration idempotente enregistre le développement accessible au moment de la mise à jour des royaumes existants et de leurs archives. Ce palier technologique est exempté de la condition de trophées, sans fabriquer de médaille ni toucher aux ressources. Les prochains niveaux demandent le total normal. Les bâtiments requis restent nécessaires, comme auparavant ; la destruction de l’infrastructure peut toujours réduire l’accès. Les nouveaux royaumes commencent sans exemption. Aucune remise à zéro ni migration SQL.

Les bots, qui ne réalisent pas de missions, conservent leur progression par bâtiments, conformément au choix du joueur. Leur nombre de trophées reste réel : aucune médaille artificielle n’est ajoutée au classement.

Le script de simulation économique initialise explicitement 50 trophées synthétiques dans son monde temporaire pour comparer les investissements, la production, le stockage et les PA. Ses durées excluent le temps des missions et ne représentent donc pas le temps de progression complet d’un nouveau joueur.
