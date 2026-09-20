# Mers et départs des bots

La génération n’impose pas un pourcentage de mer exact. Deux bruits spatiaux pondérés (70 % à l’échelle 110, 30 % à l’échelle 31), avec déformation des côtes, définissent la mer sous le seuil 0,46. Ce seuil ne signifie pas 46 % de mer. Le voisinage initial et les anciennes zones explorées sont protégés ; les cases explicitement enregistrées restent prioritaires. La génération ne dépend pas de la caméra ou du rechargement.

Échantillonnage synthétique du 20 septembre 2026 : 160 801 points par graine, grille de −1600 à +1600 en Q/R, pas de 8, migration océanique activée sur un monde vierge. `voidmarch-vhal-01` : 41,3 % de mer, 58,7 % de terre ; `sea-audit-2` : 42,9 % ; `sea-audit-3` : 44,4 %. Il ne s’agit pas d’une mesure de la sauvegarde de production. Une carte ancienne peut être beaucoup plus terrestre à proximité des royaumes du fait des régions préservées. Aucun changement de seuil dans cette mise à jour.

## Correction des départs

Les premiers bots utilisaient des positions prédéfinies sans vérifier la mer. Avec la graine par défaut, les positions (−35,−45) et (60,−45), et tout leur voisinage de rayon 8, sont dans l’océan. L’installation des bâtiments remplaçait quelques cases par de la terre, créant un îlot artificiel.

Tous les nouveaux bots passent désormais par le choix de position terrestre utilisé pour les joueurs : pas de mer ni de terre brûlée dans un rayon de 8 (217 hexagones), espacement de 70 cases et absence de territoire occupé à proximité. Ce n’est pas une taille minimale universelle pour les îles naturelles : cela garantit un départ spacieux.

## Bots déjà isolés

Au chargement transactionnel du monde, la migration vérifie une fois les bots non corrigés. Une composante terrestre de moins de 217 cases est considérée comme trop petite. Seuls les bots isolés sont déplacés. Bâtiments, identifiants, niveaux, PV, troupes et passagers, ressources, PA, stocks de mobilité et historique sont conservés. Le territoire local et les routes sont translatés ; la capitale et la caméra suivent. La mémoire d’exploration du bot est reconstruite autour de son nouveau royaume.

La destination ne remplace aucun bien, événement, site ni case déjà explorée par un humain. L’ancien îlot reste en place, neutralisé : pas d’effacement du paysage déjà observé. La migration est idempotente et n’agit jamais sur un royaume humain.

Déplacement différé si armée éloignée, unité étrangère à proximité, flotte en mer, combat récent, campagne en cours, convoi commercial, site contrôlé ou frappe atomique menaçante. Une absence de destination sûre laisse le bot intact. La migration s’exécute après déploiement, dans la transaction existante ; pas de remise à zéro du monde ni de migration SQL.

## Mer à proximité de chaque capitale

Chaque royaume actif dispose d’un repère maritime à 99 hexagones maximum de sa capitale, en distance directe. La composante d’eau doit comporter au moins 600 cases connectées : rivières et petites mares ne suffisent pas. Le panneau Royaume indique la distance et permet de centrer la caméra sur la côte ; cela ne révèle pas le brouillard et ne garantit pas un trajet terrestre direct.

Les mers existantes sont réutilisées. Si aucune ne convient, une mer aux contours irréguliers est ajoutée, avec eau profonde, hauts-fonds et plages de deux à trois cases selon les règles côtières habituelles. Le placement privilégie un raccordement à de l’eau existante et les régions inconnues, mais peut créer une mer intérieure. Les formes supplémentaires sont enregistrées dans le monde et restent identiques après rechargement.

Cette règle s’applique aussi aux anciennes cartes : exceptionnellement, des terres neutres déjà explorées peuvent être transformées. Le souvenir des cases déjà connues est actualisé sans dévoiler de nouvelles cases. Les capitales et leurs environs, territoires possédés, bâtiments, troupes, routes, sites, événements, missions, convois et autres emplacements sensibles sont protégés. Si aucune grande zone sûre n’est disponible, le royaume affiche un accès différé et la recherche est retentée après une heure ; aucun bien n’est supprimé pour forcer la création.

Le contrôle s’exécute dans la transaction de chargement, après les migrations océaniques et les déplacements des bots, ainsi qu’à chaque nouvelle installation de royaume. Les accès déjà validés sont réutilisés. Aucun effacement de base, changement de graine ni migration SQL ne sont nécessaires.
