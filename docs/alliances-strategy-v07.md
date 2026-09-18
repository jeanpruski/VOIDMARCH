# Alliances et opérations stratégiques — v07

## Alliances

- Création gratuite avec nom unique et blason ; cinq joueurs humains maximum. Seul le chef invite. Invitations valables 24 heures, dix invitations simultanées maximum.
- Acceptation explicite : les capitales des autres membres apparaissent dans le radar avec leur couleur et la distance hexagonale depuis le centre de la caméra. Un clic centre la carte. Pas de partage automatique du brouillard de guerre.
- Discussion privée : cent messages conservés, 400 caractères chacun, délai de trois secondes entre les envois. Aucun message ni signal privé n’est envoyé aux étrangers.
- Signaux Aide, Cible et Ressources sur une case connue : vingt maximum par alliance, expiration après 24 heures. Auteur et chef peuvent retirer un signal.
- Passage des remparts alliés, interdiction des attaques et captures entre partenaires. Les troupes restent personnelles. Les routes fonctionnent comme auparavant ; le terrain allié seul ne donne pas un déplacement illimité.
- Au départ, le chef est remplacé par le membre suivant et une trêve réciproque de 24 heures protège les anciens partenaires. Les flèches et le chat disparaissent immédiatement du joueur sortant.
- Impossible d’adhérer pendant qu’un des royaumes concernés a une frappe atomique en vol.

## Commerce réel et escortes

Les nouveaux échanges TRADE exigent un marché pour chaque royaume, une route sous chacun et un chemin continu neutre, partenaire ou allié. À l’acceptation, les deux paiements sont prélevés atomiquement ; deux cargaisons distinctes voyagent à raison de 15 secondes par case. Le destinataire est crédité une seule fois, à l’arrivée. Aucun revenu automatique n’est créé pour ces nouveaux contrats. Les anciens accords commerciaux conservent leur comportement historique.

Une unité de combat appartenant à un partenaire ou à son alliance, à une case maximum, empêche le pillage : l’assaillant doit d’abord éliminer l’escorte. Aucun participant ne peut piller son propre échange. Si la route est interrompue devant la caravane, les ressources retournent à l’expéditeur et le voyage se termine. Les ressources interceptées sont perdues pour le destinataire. Les deux trajets restent indépendants.

## Guerres, sites et expéditions

- Déclaration d’un objectif valable 24 heures : prendre un fort, contrôler une mine, obtenir un tribut en or. Les objectifs territoriaux doivent être visibles au moment de la déclaration. Cinq guerres actives maximum par initiateur. Aucune déclaration ne contourne une alliance, une trêve ou une protection initiale.
- Une prise de territoire accomplit l’objectif correspondant. Payer un tribut met fin à cet objectif et établit une trêve de 24 heures ; aucun paiement forcé automatique.
- Sites publics : relais de veille (+1 vision aux unités, non cumulable), gisement exceptionnel (+8 fer/min), sanctuaire occulte (+5 or/min). Les revenus suivent les mêmes règles de présence que les autres producteurs. Capture physique sur le site pour 1 PA ; les sites restent libres de bâtiments.
- Un nouveau site peut apparaître toutes les 30 minutes près des joueurs présents, 40 au maximum sur le monde et avec un espacement minimal. Les anciens mondes obtiennent leur première tentative une minute après initialisation.
- Une expédition majeure peut apparaître chaque heure : convoi du réacteur noir, gardien du monastère contaminé, créature de la brèche, sentinelle de la Cloche. Au maximum trois simultanément ; durée deux heures. Quatre figurines issues des PNJ existants, agrandies et marquées EXPÉDITION.
- Les adversaires ne commencent pas le combat. De 1 800 à 3 000 PV, attaque 60 à 105, défense 20 à 35. Butin total : 2 400 or, 1 600 fer, 1 200 pierre, 10 PA. Le système existant répartit exactement ce butin selon les dégâts réellement infligés, avec le plafond personnel de 20 PA.

## Vétérans

Une victoire est comptée pour une troupe de combat détruisant une autre unité armée (PNJ compris), hors héros. Trois, dix et vingt-cinq victoires donnent les grades Aguerrie, Vétéran et Élite : +5 %, +10 %, +15 % d’attaque et de défense. Aucun soin ni augmentation gratuite des PV. Les bonus de formation et de rareté restent applicables. Insignes sur la carte, grade et renommage dans la sélection.

## Arsenal atomique

- Silo de fusées niveau 5 ET réacteur nucléaire niveau 5.
- Coordonnées Q/R entières, déjà explorées. Confirmation explicite dans l’interface du silo.
- Prix : 10 PA et **1 000 000 de chaque ressource** (or, bois, pierre, fer, vivres), soit 5 000 000 de ressources au total. Prévoir au moins 1 000 000 de stockage par ressource. Six heures entre deux lancements par royaume, y compris en mode PA illimités.
- Alerte mondiale et marquage de la zone. Impact cinq minutes après le lancement, au prochain tick serveur (intervalle de cinq secondes). Impossible de rappeler un missile lancé.
- Rayon de huit hexagones : **217 cases au total**, soit environ 11 fois la zone initiale. Le rayon et la destruction du terrain sont figés au lancement ; les missiles déjà en vol avant cette mise à jour conservent leurs 19 cases et leur ancien effet.
- Destruction garantie des unités, bâtiments et routes concernés ; **héros et bâtiment situé sur chaque capitale préservés**. Pas de butin ni de victoire de vétéran attribué par une frappe.
- Un lancement touchant ses propres biens, un allié, une trêve ou un débutant protégé est refusé. Les protections diplomatiques sont aussi revérifiées à l’impact : une nouvelle trêve n’est jamais ignorée.
- Destruction des murs puis recalcul des enceintes. Les terrains vides libérés redeviennent neutres. Le relief devient une terre brûlée noire et craquelée : aucune ressource, aucune découverte, aucun événement ni site stratégique ne subsiste sur les cases touchées. Pas de construction, même de route, avant restauration. Le sol ne repousse pas quand la contamination se dissipe, et aucun événement ne le régénère automatiquement. Un terrassier à une case maximum restaure une plaine et nettoie sa contamination pour 2 PA + 20 bois + 10 fer par case, sans changer son propriétaire. La capitale survit mais sa production et ses taxes cessent jusqu’à restauration de son sol ; cette restauration est autorisée sans démolition.
- Les frappes sont stockées dans le monde : un redémarrage ne les annule ni ne les rejoue. Aucun changement de schéma SQL.

## Contamination et confinement

Un réacteur en production émet six points par minute sur sa case et ses six voisines neutres ou personnelles. Intensité plafonnée à 100 ; dissipation naturelle de deux points par minute. Un laboratoire isotopique à trois cases maximum retire deux points d’émission par niveau : un laboratoire niveau 3 suffit à bloquer les émissions. Plusieurs laboratoires peuvent coopérer.

À partir de 30, la production de ressources des bâtiments touchés est divisée par deux (pas les taxes de population). Un ingénieur ou un terrassier nettoie un disque de rayon 1 à proximité, sur terrain neutre ou personnel, pour 2 PA + 20 or + 50 fer. Le nettoyage de contamination seul ne restaure pas les terres brûlées. Pas de mort aléatoire, pas de mutation aléatoire du terrain. Une frappe produit 100 points avant la prochaine dissipation.

## Animation et compatibilité

Fumées industrielles, lueurs de forge et de réacteur, fissures et fumées des bâtiments blessés ; poussière et roues pendant les déplacements, ombres aériennes, hélices/rotors, léger pas des figurines, recul et douilles au tir. Portes visuellement ouvertes à proximité des unités autorisées, sans modifier la résistance ni la possibilité d’installer une tourelle. Explosion atomique élargie.

Les animations ambiantes utilisent une couche graphique réutilisée, des plafonds de rendu et une cadence limitée. Elles respectent le masquage des unités/bâtiments, le mode mouvement réduit et disparaissent en vue stratégique. Les alertes, signaux et sites restent lisibles à ce niveau de zoom. Aucun son ajouté.

Les nouvelles données sont facultatives dans les anciennes sauvegardes et initialisées à la demande. Aucun compte, stock ou bâtiment n’est réinitialisé. La suppression d’un invité nettoie aussi son appartenance à une alliance, ses messages, signaux et frappes.
