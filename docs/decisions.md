# Décisions du 16 septembre 2026

Les instructions données dans la conversation priment sur les documents originaux.

- Coûts des catalogues : suppression des panneaux « Comprendre les conditions » / « Voir le détail du coût ». Les ressources dont le stock est insuffisant sont affichées directement en rouge, avec coût, stock et manque au survol. Les prérequis restent visibles.

- Hiérarchie des bâtiments : compatibilité du terrain en premier, puis profondeur réelle des prérequis (bases avant développements), puis coût croissant. Chaque fiche affiche les prérequis cliquables, ceux déjà construits et les bâtiments dont elle est un prérequis. Depuis une unité bâtisseuse, « Construire » privilégie sa case actuelle si elle est libre et autorisée, puis les cases voisines.

- Panneau de sélection compact : identité et statistiques en tête, aide dépliable compacte, puis actions sur une seule ligne pleine largeur. Défilement horizontal si nécessaire, y compris au toucher ; les actions ne s’empilent plus en bas à droite. La minicarte continue de suivre la hauteur réelle du panneau.

- Recrutement rare : chaque recrutement accepté a 1 % de chance de créer une unité rare ; bonus entier uniforme de 10 à 30 % sur PV maximum, attaque, défense et attaque des bâtiments. Le tirage est serveur, persistant et protégé par les reçus d’idempotence. Coût, entretien, portée, mouvement et capture inchangés ; aucune conversion rétroactive des unités existantes. Aura, étoile et badge « Rare +X % » rendent la variante identifiable.
- Effets de carte : impacts de combat, poussière de construction/développement/route, particules de réparation/soin et apparition au recrutement. Ils suivent les changements visibles confirmés par le serveur, sans effet sur les cases hors vision ni répétition au chargement. Durée courte, nombre simultané borné ; l’option de réduction des animations les désactive et laisse une aura rare statique.

- Finition de l’expérience : actions disponibles mises en évidence, coûts et blocages expliqués à la demande, aide contextuelle, conseils de fondation masquables et navigation clavier des fenêtres. Détail dans `experience-joueur.md`. La carte reste dégagée et la cadence des PA inchangée.

- Panneaux latéraux repliables indépendamment sur ordinateur : une flèche reste sur chaque rail pour les rouvrir. Préférence mémorisée dans le navigateur. La carte se redimensionne avec son conteneur. Sur téléphone, le menu latéral existant reste accessible via le bouton de navigation.

- Développement des agglomérations : le bouton ouvre un aperçu sans dépenser de PA. Il montre la destination, les PV, la population et sa capacité de croissance, la production de base, le recrutement et les prérequis. Tableau coût/stock/manque et confirmation désactivée si les ressources, PA ou habitants manquent. Le devis des coûts et de la population requise est partagé avec le serveur.

- Catalogue de recrutement : civils et soutiens en premier (paysan en tête), puis combattants par attaque croissante, défense et PV pour départager, véhicules en dernier. Ce tri reste appliqué dans les onglets et recherches. Les fenêtres de recrutement et construction affichent les cinq stocks actuels dans un bandeau fixe au-dessus du contenu défilant, mis à jour après les achats.

- Lisibilité des possessions : teinte de la bannière sur chaque hexagone du joueur, contours internes fins et frontière extérieure renforcée avec fond sombre. Les contours passent au-dessus des décors et bâtiments, restent visibles sans grille et s’atténuent dans les terres seulement explorées. Chaque case possédée porte un drapeau ; ces drapeaux et ceux des unités sont dessinés au-dessus du relief et des bâtiments, avec un contour contrasté. La sélection possède un contour ivoire intérieur distinct. Les possessions adverses conservent la couleur de leur royaume.

- Univers plus lovecraftien : nouvel accueil abyssal, événements cosmiques reformulés, mélange médiéval et industriel conservé. Interface allégée : suppression du grand titre de carte, des slogans « monde persistant », de la citation, de la météo décorative et des mentions répétées.

- Récoltes et équilibre : cinq ressources (or, bois, pierre, fer, vivres). Le paysan doit occuper le bon terrain, neutre ou appartenant à son royaume ; une case voisine ne suffit plus. La pierre vient des collines/montagnes et des carrières, le fer des collines/mines, le bois des forêts/scieries. Le simple territoire ne produit plus de ressources brutes. Les anciennes sauvegardes à quatre ressources reçoivent un stock de pierre nul sans réinitialisation.
- Catalogues : onglets par rôle conservant le mélange médiéval, armes à feu, véhicules, artillerie et occulte. Catalogue actuel : 30 unités et 36 bâtiments. Mobilisation, entretien et croissance ont été revus ; l'audit chiffré est dans `balance-audit.md`.

- Cadence des bots : à chaque cycle, tirage aléatoire indépendant et uniforme de 3 à 10 actions incluses (12,5 % par valeur). Le bot peut en accomplir moins si aucun ordre valide n’est disponible ou si ses PA/ressources manquent. L'intervalle de 8 min 30 à 11 min 30 et le sommeil sans humain connecté sont conservés.

- Nouvelle DA : mélange médiéval et guerre industrielle, inspirations Quake/Wolfenstein et équipements allemands des années 1940, factions fictives. Voir `direction-artistique-v02.md`. Douze unités et douze bâtiments supplémentaires portent le catalogue à 30/35. Les sauvegardes sont conservées, aucun redémarrage n'est nécessaire.

- Monde plus vaste : rayon des implantations multiplié par cinq ; minimum de 70 cases entre capitales pour les nouvelles implantations, bots compris. Le terrain reste généré par chunks à la demande. Les cinq royaumes bots existants ont été déplacés avec leurs actifs après sauvegarde ; les deux royaumes humains existants ont conservé leurs positions et leur progression. Leur distance mutuelle préexistante n'est donc pas modifiée. Il s'agit d'un espacement initial, pas d'une interdiction de s'approcher ensuite.

- Extension demandée : 18 unités et 23 bâtiments. Départ choisi par l'utilisateur : un campement, aucune unité, aucun stock ; premier paysan gratuit en ressources (1 PA), puis récoltes et constructions. Même gratuité de secours si tous les paysans sont perdus. Les bots déjà établis conservent leur implantation.
- PACOSPORT a été redémarré sur autorisation explicite, avec sauvegarde préalable locale et snapshot en base. Son compte et ses sessions sont conservés ; les autres royaumes ne sont pas réinitialisés.
- Les barres de vie apparaissent seulement pour les unités et bâtiments endommagés actuellement visibles.

- Le premier prototype conserve le périmètre fonctionnel demandé ; les six unités et les systèmes économiques, militaires, sociaux et de persistance sont implémentés.
- Le royaume et ses frontières restent à leur emplacement à la déconnexion. Le snapshot est une sauvegarde, pas un mécanisme de téléportation. La reconstruction ailleurs est réservée à la défaite, avec perte de 25 % de valeur et délai de dix minutes.
- La présence est récompensée : 1 PA toutes les 10 secondes, réserve de 20 et production normale en présence seulement. Une grâce de trois minutes couvre les coupures réseau. Les PA se régénèrent également hors ligne, jusqu'au plafond.
- Par défaut le royaume reste attaquable hors ligne (configurable via OFFLINE_PROTECTION). Les trêves bilatérales restent actives hors ligne.
- Tribut : proposition libre de GOLD/WOOD/IRON/FOOD et durée de 1 minute à 7 jours ; contre-proposition, acceptation, refus ou annulation. À l'acceptation, les ressources sont prélevées une seule fois et la trêve réciproque interdit attaque et capture jusqu'à son échéance. Une proposition seule ne protège pas. Les bots évaluent les propositions selon leur personnalité et leur puissance.
- Un seul processus simule un monde. PostgreSQL est la source de vérité ; verrou transactionnel du monde et idempotence des commandes. Redis peut distribuer les notifications, mais plusieurs simulateurs ne sont pas autorisés.
- La graine et les terrains de base sont publics ; le serveur ne livre jamais les unités, bâtiments actuels et propriétés adverses hors vision. Les tuiles explorées gardent leur dernière observation.

- 17 septembre 2026 : nouvelle passe gameplay validée (30 PA initiaux, zone de construction de 3 cases, améliorations de tous les bâtiments et des troupes existantes, expiration des invités à 24 h, code PA illimités connu des joueurs). Voir [gameplay-v03.md](gameplay-v03.md), qui prévaut sur les anciens choix concernés.

- 17 septembre 2026 : remparts sur hexagones entiers validés, avec progression bois → pierre → acier et matériaux correspondants. Passage réservé aux unités du propriétaire, ennemis bloqués jusqu’à destruction ou contournement, raccords automatiques. Règles dans [remparts.md](remparts.md).

- 17 septembre 2026 : ajout de cinq unités volantes (reconnaissance, chasseur, bombardier, dirigeable, dragon du Reich noir), d’un canon antiaérien et de quatre bâtiments de recrutement. Les unités volantes survolent terrains, troupes et remparts, sans capture ; elles finissent sur une case libre et peuvent être atteintes par les attaques à distance. Les règles sont détaillées dans [aviation.md](aviation.md).
- 17 septembre 2026 : à la demande du joueur, la palissade est épinglée en première position du catalogue de construction, avant le tri des autres bâtiments par terrain et progression. Les filtres de catégorie et de recherche restent actifs.

- 17 septembre 2026 : enceinte fermée = prise automatique des terres neutres intérieures. À l’ouverture, toutes ses cases sans bâtiment redeviennent neutres ; les parcelles bâties restent possédées. Construction intérieure avec paysan ou ingénieur à une case maximum, sans limite de distance aux bâtiments. Ces trois règles ont été confirmées par le joueur. Les terrains et bâtiments adverses restent exclus de la prise automatique. Voir [remparts.md](remparts.md).

- 18 septembre 2026 : réserve régénérable portée à 20 PA, un PA toutes les 30 secondes, premier départ humain à 40 PA. Le surplus initial ne régénère pas ; aucun nouveau bonus pour les royaumes existants. Sur le serveur, régler `AP_INTERVAL_MS=30000` dans `.env` puis redémarrer.

- 20 septembre 2026 : un PA toutes les 10 secondes, plafond 20 et départ à 40 conservés. Départ humain avec 500 or, bois, pierre et fer, 0 vivres ; aucun crédit rétroactif aux comptes existants. Régler `AP_INTERVAL_MS=10000` sur le serveur.
- Chaque nouvelle victoire de mission ou d’expédition remet le même trophée à tous les membres de l’alliance au moment de la victoire, y compris hors ligne. Les copies comptent pour les déblocages, restent après un départ et ne partagent ni ressources ni troupes. Aucun partage rétroactif à l’entrée dans une alliance, aucun doublon. Le carnet indique le vainqueur d’origine.
- Déplacements groupés : carburant des machines et pervitine des troupes terrestres consommés avant les PA ; routes et enceintes fermées restent entièrement gratuites.
