# Validation locale — 16 septembre 2026

## Hiérarchie du catalogue de bâtiments

Compilation réussie et scénario Chrome de fondation validé après la priorité donnée à la case du paysan. Tri contrôlé sur forêt : bâtiments compatibles en premier, bases avant développements, coût croissant à étape égale. Captures ordinateur/mobile du catalogue inspectées ; prérequis et débouchés visibles sur les fiches.

## Panneau de sélection compact

Compilation et contrôle TypeScript réussis. Scénario Chrome complet validé : boutons alignés sur une seule rangée, panneau mobile inférieur à 230 px, statistiques visibles et minicarte au-dessus du panneau. Captures ordinateur/mobile inspectées. La rangée d’actions défile horizontalement lorsque nécessaire.

## Animations et unités rares

- Compilation stricte et production réussies ; **172 tests de règles réussis**. Tests du tirage 1/100, bornes inclusives 10–30, statistiques bonifiées, anciennes unités, réparation, calcul des dégâts, sauvegarde et absence de tirage sur un recrutement refusé.
- **6 tests PostgreSQL réussis**, dont un recrutement rare concurrent : un seul tirage, un seul paysan et conservation du bonus après redémarrage, dans un monde isolé.
- Scénario Chrome de fondation réussi avec recrutement d’une moto rare forcé dans la fixture uniquement. Bonus de 20 % contrôlé ; aura et fiche de statistiques inspectées sur `industrial-world.png`. Le serveur local conserve le tirage aléatoire normal.
- Les tests d’effets contrôlent dégâts/réparation/développement, snapshots inchangés, reconnexion et absence d’effets hors vision.

## Finition de l’expérience joueur

- Compilation stricte et production réussies ; 164 tests de règles réussis.
- Parcours Chrome de fondation réussi avec les nouveaux catalogues, aides dépliables, consultation du recrutement gratuit, fermeture par Échap, repli des panneaux et parcours de construction/recrutement.
- Captures ordinateur/mobile inspectées. Les statistiques d’unité disposent d’une rangée lisible sur téléphone ; leur présence dans le viewport est vérifiée. Le détail des changements est dans `experience-joueur.md`.
- L’équilibrage à long terme et le plaisir de jeu nécessitent des parties réelles ; ces validations portent sur le fonctionnement et la lisibilité de l’interface.

## Panneaux latéraux repliables

Compilation réussie. Scénario Chrome validé : repli des deux panneaux, agrandissement du plateau, taille réelle du canvas synchronisée, réouverture et poursuite du parcours de jeu jusqu’au mobile. Capture `collapsed-sidebars.png` inspectée. Un ResizeObserver actualise la taille parente de Phaser pour éviter un canvas conservant l’ancienne largeur.

## Couleurs et drapeaux des territoires

La teinte et les contours utilisent désormais la couleur de bannière. Une couche de drapeaux au-dessus des reliefs et bâtiments marque les cases possédées et les unités ; les observations anciennes restent atténuées. Compilation réussie et scénario Chrome de fondation validé. Captures du plateau ordinateur/mobile inspectées.

## Aperçu du développement

Compilation réussie et 164 tests de règles validés, dont la transformation campement → avant-poste → village. Scénario Chrome de fondation réussi avec ouverture de l’aperçu, coût du bois, progression des PV, confirmation bloquée sans ressources et fermeture sans achat. Captures ordinateur/mobile générées ; capture mobile inspectée, sans débordement horizontal. Coûts et seuils de population partagés entre interface et serveur.

## Retour à un PA par minute

À la demande du joueur, récupération rétablie à 60 secondes, réserve de 15 conservée. Règles, configuration locale, exemple et guide synchronisés. Les 164 tests passent, avec seuils à 59 999 / 60 000 ms et récupération après redémarrage ; compilation réussie. Serveurs locaux relancés. Cette cadence remplace celle de 30 secondes décrite dans les validations précédentes.

## Catalogues et ressources visibles

- Compilation TypeScript et production réussie ; scénario Chrome de fondation, recrutement et construction réussi.
- Ordre du catalogue contrôlé : paysan et soutiens, combattants par attaque/défense/PV, puis moto, automitrailleuse et char.
- Capture mobile du catalogue inspectée : les cinq ressources restent dans un bandeau distinct du contenu défilant, sans débordement horizontal.

## Réserve et récupération des PA

- Plafond porté à 15 PA et intervalle à 30 secondes, dans les règles partagées, la configuration locale et son exemple. Nouveaux royaumes créés avec une réserve pleine ; les royaumes existants continuent leur récupération sans réinitialisation.
- Compteur numérique et compte à rebours utilisent les constantes partagées. Guide et documentation actualisés.
- `npm test` : **164 tests réussis**, dont les seuils à 29 999 / 30 000 ms, le plafond hors ligne et l’absence de temps gratuit accumulé à réserve pleine. Compilation de production réussie.
- Serveurs locaux relancés avec la nouvelle configuration.
- Scénario Chrome de fondation réussi ; compteur numérique inspecté sur la capture mobile.

## Visibilité des hexagones conquis

- `npm run build` réussi ; scénario Chrome `campement gratuit` réussi dans un monde isolé.
- Captures du plateau sur ordinateur et mobile inspectées : fond doré, contours des possessions renforcés et sélection ivoire distincte. Aucune modification des règles ni des sauvegardes.

## Accueil lovecraftien et interface épurée

- `npm run build` : TypeScript strict et compilation de production réussis.
- `npm run test:e2e -- tests/founding.e2e.ts` : **2 scénarios Chrome réussis**, incluant le parcours de jeu complet et le nouvel accueil sans création de compte réel.
- Image chargée et décodée ; absence du grand titre de carte et de « monde persistant » contrôlée. Formulaire utilisable à 390 × 844 sans débordement horizontal.
- Captures `cosmic-login.png`, `cosmic-login-mobile.png` et `industrial-world.png` inspectées dans `test-results/`.

## Récoltes, catégories et audit d'équilibrage

- `npm test` : **163 tests réussis**, dont 45 combinaisons terrain/ressource validées par le serveur, refus de récolte voisine ou adverse, montagne à pied et routes pour véhicules, extraction conditionnelle, migration des stocks, croissance bornée et absence de boucle de prérequis. Les tests de catalogue couvrent les 30 unités et 36 bâtiments.
- `npm run test:db` : **5 tests PostgreSQL réussis** dans un monde isolé.
- `npm run build` : TypeScript strict et compilation réussis.
- `npm run test:e2e -- tests/founding.e2e.ts` : **2 scénarios réussis**, comprenant déplacement avant récolte de bois, onglets véhicules/industrie/ressources, carrière et contrôle de débordement mobile. Captures de catalogues et plateau inspectées.
- Monde existant contrôlé en lecture : tous les portefeuilles ont un stock de pierre fini, aucune exploitation incompatible, deux royaumes humains conservés. Sauvegarde préalable : `.data/world-before-resource-balance-1789576008293.json`.
- Rapport complet et reproductible : `docs/balance-audit.md`, généré par `node --import tsx scripts/audit-balance.ts`. Les scénarios stratégiques de longue durée restent à éprouver en partie.

## Découpage des figurines

- Suppression des fragments voisins causés par des silhouettes débordant de leur cellule source ; isolation avant mise à l'échelle avec proportions conservées et marges transparentes.
- Correction des vignettes adaptatives : leurs coordonnées de découpage suivent maintenant leur taille réelle.
- `npm test` : **109 tests réussis**, dont deux régressions pour une arme traversant une cellule et une brume transparente entre deux silhouettes. Compilation de production réussie.
- Parcours Chrome du jeu et de l'accueil réussis. Contrôle dédié des **72 figurines** réussi : présence de chaque image, marges sans pixels visibles et coordonnées correctes sur mobile. Planche complète inspectée dans `test-results/sprites-desktop.png`.

## Cendres et acier

- `npm test` : **107 tests réussis**, incluant les 30 recrutements et 35 constructions, le bonus antiblindage, les réparations en fer, l'exclusion des véhicules des soins, la portée radio, le stockage logistique et le coût des attaques de fusées.
- `npm run test:db` : **5 tests PostgreSQL réussis** dans le monde isolé.
- `npm run build` et le contrôle TypeScript final : réussis.
- `npm run test:e2e -- tests/founding.e2e.ts` : **2 scénarios Chrome réussis**. Le parcours teste le départ gratuit, la construction, les barres de vie et le mobile, puis la recherche de moto dans le catalogue et son recrutement au garage. Le second contrôle le nouveau décor d'accueil. Aucun compte de jeu créé ; monde du parcours en mémoire.
- Captures `test-results/industrial-world.png` et `industrial-login.png` inspectées. Atlas transparent et figurines visibles dans le plateau et les panneaux. Les fichiers graphiques se chargent sans erreur HTTP.
- Aucun redémarrage des royaumes ni changement de leurs actifs : la nouvelle branche est disponible dans leur progression existante. L'équilibrage entre époques doit encore être éprouvé en partie.

## Espacement du monde

`npm test` : 78 tests réussis. Le nouveau scénario installe cinq bots avant huit joueurs et vérifie les distances entre toutes les capitales (au moins 70 cases). `npm run build` réussi. Migration locale transactionnelle des cinq bots avec sauvegarde `.data/world-before-spacing-1789574618577.json` ; vérification de conservation des stocks, territoires, bâtiments, unités et capitales des deux humains, ainsi que des distances finales des bots. Aucun convoi n'était en transit. Les anciennes observations des bots déplacés ont été retirées du brouillard mémorisé.

## Extension et départ à zéro

- `npm test` : **77 tests réussis**, incluant les 18 recrutements, 23 constructions, récoltes, progression initiale, prérequis, soins et redémarrage ciblé avec archive. Les cinq tests PostgreSQL sont ignorés par cette commande.
- `npm run test:db` : les cinq tests PostgreSQL ont également réussi après l'extension des règles.
- `npm run build` : compilation stricte et production réussies après les dernières modifications.
- `npm run test:e2e -- tests/founding.e2e.ts` : parcours réussi dans Chrome, du campement au paysan, récolte puis chaumière ; catalogues complets, dégâts et présentation mobile. Transport simulé, moteur réel en mémoire, aucun compte créé et aucune modification de la partie locale. Captures ordinateur/mobile inspectées.
- Les anciens scénarios navigateur ont été adaptés au nouveau départ, sans relance complète de cette suite dans le monde local.
- Atlas supplémentaire : fond retiré par script local autorisé, véritable canal alpha, transparence contrôlée dans le jeu.
- Redémarrage PACOSPORT exécuté : 1 campement, 0 unité, 1 territoire, stocks nuls, autres royaumes inchangés. Sauvegarde préalable : `.data/PACOSPORT-before-founding-1789574434888.json` ; compte conservé.

Les résultats ci-dessous décrivent les validations antérieures.

- `npm run build` : TypeScript strict et compilation de production réussis. Le module Phaser déclenche un avertissement de taille de bundle, sans échec.
- `npm test` : 24 tests de règles et de moteur réussis.
- `npm run test:db` : 5 tests réussis sur PostgreSQL 16 réel, dans un monde isolé : idempotence concurrente, dernier PA partagé, attaques simultanées, persistance au redémarrage et absence de royaume dupliqué.
- `npm run test:e2e` : 3 scénarios réussis dans Chrome : compte invité et sessions ; déplacement par clic sur la carte, construction, diplomatie, rechargement et mobile ; accord de trêve accepté depuis deux navigateurs indépendants.
- Le parcours navigateur de jeu a été relancé avec succès après la correction finale des couches graphiques aux coordonnées négatives.
- Captures desktop et mobile inspectées. Aucun débordement horizontal sur un écran de 390 × 844 pixels.
- `npm audit` : aucune vulnérabilité signalée lors de la vérification des dépendances installées.

Les clics sur les panneaux HTML sont filtrés pour ne pas donner d'ordres au plateau. Chaque montage React du plateau possède son propre conteneur, afin que la destruction différée de Phaser ne décale pas les coordonnées du pointeur.

Les 34 comptes locaux portant les noms « Test Cendre », « Test Fer », « Test Paix », « Test Auth », « Test Wire » ou « Test Probe » ont été créés pendant ces essais. Leur inventaire est conservé dans `.data/reviewed-test-users.json`. Leur suppression a été effectuée après autorisation explicite de l'utilisateur : 34 comptes supprimés, cinq bots conservés. Une copie du monde avant nettoyage est conservée dans `.data/world-before-test-cleanup.json`. La base reste en place.

Docker n'a pas été exécuté, aucun moteur Docker n'étant installé sur cette machine. La tenue en charge et l'équilibrage sur de longues parties restent à mesurer.

## Correction de la mini-carte

Le cadre suit désormais la position réelle de la caméra, le zoom et les changements de taille d'écran. Toute la surface accepte les clics et le glissement. Le terrain utilise la même projection que le plateau ; l'aperçu des régions explorées est indépendant des chunks affichés et respecte leur dernière observation hors vision.

Validation : 27 tests de règles et de projection réussis, dont trois nouveaux contrôles de mini-carte ; scénario Chrome réussi avec déplacement au clavier, zoom, clic dans une zone vide, glissement et passage au format mobile. Ce scénario utilise un monde fictif sans compte, sans session réseau et sans modification de la partie locale.

## Gameplay v0.3 — 17 septembre 2026

- Compilation TypeScript et Vite réussie (avertissement habituel sur la taille du bundle Phaser).
- 235 tests de règles réussis ; 7 tests de base ignorés lors de cette passe puis exécutés séparément.
- 7 tests PostgreSQL réussis sur un cluster temporaire dédié, port 55439 : idempotence, persistance et expiration des invités avec conservation des comptes enregistrés et actifs. Aucune donnée réelle utilisée pour le nettoyage.
- API réelle testée sur ce cluster : 401 sans session, rejet d’un mauvais code, activation/désactivation des PA illimités, premier royaume à 30 PA, recrutement accepté sans dépense de PA lorsque le code est actif.
- Chrome : parcours de fondation desktop/mobile réussi, fermetures automatiques, coûts insuffisants, boutons masqués, notifications en haut, raccourci caché sans activation accidentelle du bouton focalisé. Accueil testé ; 84 frames de miniatures contrôlées, dont les 12 nouvelles, sans pixels dans les marges.
- Audit des catalogues régénéré : 38 unités, 40 bâtiments. Les chaînes de prérequis sont toutes réalisables. Ces tests valident les règles et la cohérence des coûts ; ils ne remplacent pas des parties longues pour régler l’équilibrage compétitif.
- Les serveurs de test sont arrêtés après vérification. Aucun déploiement sur PlanetHoster dans cette passe.

## Socles, démolition et remparts — 17 septembre 2026

- Construction TypeScript/Vite réussie ; 263 tests locaux passent, 7 tests PostgreSQL non relancés pour cette passe.
- Quatre scénarios Chrome passent : parcours réel de construction/démolition/évolution des murs sur un monde isolé en mémoire, accueil, 87 miniatures, 192 combinaisons de remparts (trois matériaux × 64 raccords) sans rognage.
- Contrôles des remparts : passage propriétaire/adversaire sur route, validation de chaque étape d’un chemin, contournement, enceinte fermée et brèche, interdiction de capture, respect des trêves, coûts en bois/pierre/fer, résistance et remboursement hors améliorations.
- Rendus texturés inspectés sur ordinateur et téléphone. Les 30 anciennes unités ont des socles assortis aux huit nouvelles. Aucun compte ni royaume réel modifié, aucun déploiement dans cette passe.

## Aviation et palissades prioritaires — 17 septembre 2026

- Compilation TypeScript / Vite de production réussie. **289 tests de règles réussis**, 7 tests PostgreSQL ignorés dans cette exécution (pas de migration SQL).
- **5 tests Chrome réussis** : recrutement réel via moteur en mémoire du chasseur et du dragon, fermeture des fenêtres, blocage expliqué des attaques de mêlée contre un avion, catalogue Aviation sur mobile ; parcours de fondation avec palissade en première position ; accueil ; contrôle des 97 figurines ; contrôle des 192 configurations de remparts.
- Règles aériennes testées : survol des terrains / unités / murs, case finale libre, distance et PA, absence de capture, attaques à distance, bonus Flak / chasseur, absence de couvert terrestre en vol, trêves, recrutement spécialisé, améliorations des troupes existantes et futures, remboursement de démolition.
- `aviation-world-desktop.png` et `aviation-catalog-mobile.png` inspectées ; les ailes restent dans les figurines isolées. Atlas et prompts dans `assets-aviation.md`.
- Le contrôle des remparts a révélé un défaut de texture des faces vues de profil : une transformation de surface nulle pouvait laisser une ligne parasite au bord du canvas dans Chrome. Les faces de surface nulle ne reçoivent plus de projection de texture ; les 192 configurations passent à nouveau sans pixels de bord.
- Audit des coûts régénéré : 44 unités, 47 types de bâtiments. Modifications locales, non déployées.

## Territoires d’enceinte — 17 septembre 2026

- Compilation TypeScript et Vite de production réussie. **306 tests de règles réussis**, 7 tests PostgreSQL ignorés dans cette exécution ; aucun changement de schéma SQL.
- Détection validée sur 150 dispositions irrégulières comparées à un flood fill indépendant, une diagonale ouverte de 10 000 tronçons, des cités éloignées, plusieurs rayons et des enceintes imbriquées.
- Tests métier : dernier tronçon, coût d’un seul PA, couleurs/propriété transmises au client, absence de capture adverse, trêve, constructeur obligatoire y compris à plus de trois cases d’un bâtiment, terrain compatible, brèche par démolition ou combat, routes/unités conservées, parcelles bâties conservées, réparation de brèche, matériaux mélangés, anciennes sauvegardes, archives et expiration des invités.
- **4 tests Chrome réussis** : aviation ; cycle complet d’enceinte ; fondation/construction/recrutement/remparts ; accueil. Le scénario d’enceinte revendique 19 cases, construit une chaumière avec le paysan, puis en libère 18 après démolition du dernier tronçon. Le bouton de construction est absent tant que le bâtisseur est trop loin.
- Captures `enclosure-closed-desktop.png` et `enclosure-open-mobile.png` inspectées : couleur de bannière à l’intérieur, perte de couleur des cases vides après brèche, conservation de la parcelle bâtie et textes explicatifs lisibles. Pas de débordement horizontal.
- Modifications locales uniquement ; les enceintes existantes seront reconnues au redémarrage après déploiement.

## Contour global des territoires — 17 septembre 2026

Les cases possédées sans bâtiment gardent leur remplissage coloré mais n’affichent plus de drapeau territorial. Les traits de propriété entre hexagones du même royaume sont supprimés ; seuls les bords donnant sur un autre territoire, une case neutre ou inconnue sont dessinés. Les sommets utilisent la taille exacte des hexagones pour raccorder les segments. La grille et la sélection restent disponibles.

Compilation réussie et scénario Chrome des enceintes réussi. Captures ordinateur/mobile inspectées : zone fermée colorée sans drapeaux intérieurs ni contours colorés entre cases ; après brèche, contours conformes aux seules parcelles conservées. Modifications locales, non déployées.
