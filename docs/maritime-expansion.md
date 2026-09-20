# Mers et expéditions maritimes

## Carte et migration

La première mutation du serveur active une géographie maritime déterministe. La graine du monde et la protection des anciennes régions sont enregistrées : aucun nouveau tirage au rechargement. Les nouveaux mondes créés par la remise à zéro activent les mers avant de placer les royaumes.

Les terrains déjà sauvegardés, les régions explorées par les royaumes actifs ou archivés, les bâtiments, les unités, les découvertes et les sites stratégiques sont préservés. Une marge terrestre irrégulière protège ces anciennes régions. Les mers apparaissent dans les zones inconnues ; une vieille partie très explorée peut donc demander une expédition plus longue pour atteindre l’océan. Aucune suppression ni réinitialisation des joueurs n’est nécessaire. La migration utilise le document JSON du monde, sans modification du schéma PostgreSQL.

Un bruit à deux échelles, déformé spatialement, produit de grandes étendues, des baies, des péninsules et des îles. Les eaux côtières occupent les deux premières cases marines. La plage mesure deux ou trois cases terrestres selon la région. Ses couleurs suivent les biomes existants. Le rendu distingue six nuances de profondeur, du turquoise clair du rivage au bleu de la haute mer, avec des bords fondus entre les cases et une écume discrète. Une teinte sableuse décroissante assure la transition sur trois cases terrestres. Des dunes basses, galets et touffes d’herbe ponctuent les plages libres ; ils sont purement décoratifs, stables au rechargement et adaptés au biome. Aucun terrain, coût de déplacement ni rendement n’est modifié par ce décor. Les couleurs de propriété sont appliquées au-dessus du dégradé, et le brouillard reste respecté. Les noms fonctionnels des autres terrains restent inchangés.

Le départ garantit huit cases de terre autour d’une capitale. La mer demeure bleue en vue stratégique et sur la minimap. Les remparts ne revendiquent pas les cases marines. Les routes et le terrassement ne peuvent pas transformer l’océan ; une frappe atomique détruit les cibles maritimes sans créer de terre sous les navires.

## Installations : cinq niveaux et cinq illustrations

Les ports, chantiers navals, pêcheries maritimes et bases des profondeurs se construisent dans l’eau directement voisine d’une plage, avec un bâtisseur sur cette plage. La batterie côtière reste sur une plage, une plaine, une colline ou des ruines directement voisines de la mer.

| Installation         | Utilité                                                    | Prérequis supplémentaires |
| -------------------- | ---------------------------------------------------------- | ------------------------- |
| Port des marches     | Transports, commerce maritime, ravitaillement à deux cases | Aucun                     |
| Chantier naval       | Reconnaissance, escorte, bombardement naval                | Port                      |
| Pêcherie maritime    | 8 vivres/min de base, bateaux de pêche                     | Aucun                     |
| Base des profondeurs | Sous-marins à partir du niveau 3, sonar                    | Chantier naval, munitions |
| Batterie côtière     | Tir manuel pour 1 PA, puis sonar                           | Port, forge               |

Les niveaux appliquent les coûts croissants, les gains de production et l’entraînement existants. Les sous-marins sont volontairement absents aux niveaux 1 et 2. Le sonar des bases et batteries apparaît au niveau 3 ; sa portée vaut le niveau moins un.

## Vingt navires

| Époque / niveau  | Pêche                     | Transport                  | Combat                  | Escorte / sous-marin       |
| ---------------- | ------------------------- | -------------------------- | ----------------------- | -------------------------- |
| 1 · Médiévale    | Cotre des brumes          | Bac des marches            | Galère des serments     | Drakkar des veilleurs      |
| 2 · Empire       | Goélette des filets noirs | Brigantin des légions      | Frégate des cendres     | Corvette du crépuscule     |
| 3 · Industrielle | Chalutier de fer          | Péniche de débarquement    | Destroyer Vigie         | Sous-marin des profondeurs |
| 4 · Avancée      | Collecteur pélagique      | Transport amphibie Bastion | Frégate lance-missiles  | Sous-marin Spectre         |
| 5 · Atomique     | Moissonneur des abysses   | Arche de la nuit liquide   | Cuirassé du soleil noyé | Léviathan submersible      |

Les navires apparaissent sur une case d’eau libre du bâtiment ou de ses voisines, neutre ou à leur royaume. Ils naviguent uniquement en mer et eaux côtières, pour 1 PA par déplacement dans la limite de leur mouvement. Les routes et terres possédées ne donnent aucun mouvement illimité en mer. Les aéronefs survolent l’eau ; les unités terrestres doivent embarquer.

La pêche manuelle est une action de 1 PA : 40 / 160 / 360 / 640 / 1 000 vivres selon l’époque, limitée au stockage disponible. Les bateaux de pêche ne combattent pas. Les transports gardent une vision de 2, avec 4 / 8 / 12 / 16 / 24 places. Fantassin : 1 ; cavalerie : 2 ; moto ou voiture légère : 4 ; blindé lourd ou siège : 8 dans les transports qui les acceptent. Le bac initial ne prend que les fantassins. Les navires et aéronefs ne s’embarquent pas.

Embarquement et débarquement coûtent chacun 1 PA par troupe. Le transport doit être voisin d’une case terrestre libre, visible et praticable. Le chargement suit le navire, ne donne pas de vision supplémentaire, et conserve son entretien. Un naufrage évacue les passagers à 50 % de leurs PV restants si une case terrestre voisine est disponible ; sinon ils sont perdus. Le héros utilise toujours son système de récupération immortelle.

Les navires utilisent les bonus d’entraînement, de soutien et de ravitaillement existants. Le port sert de dépôt, les transports peuvent ravitailler des unités voisines. Les réparations navales consomment or, bois et fer selon les dégâts réparés. Le niveau atomique est très cher : jusqu’à 120 000 or et 84 000 fer pour le Léviathan, avant son entretien.

## Combat et furtivité

Les galères et cuirassés bombardent en cloche ; les torpilles ne touchent que les navires et ne traversent pas la terre. Les escortes industrielles et avancées disposent d’un sonar et de moyens antiaériens. Les affinités navales concernent l’eau : les sous-marins préfèrent la haute mer, les autres bâtiments de combat les eaux côtières.

Un sous-marin ennemi n’apparaît pas dans les données envoyées au navigateur sans détection ou révélation. Connaître son identifiant ne permet pas de l’attaquer. Les sonars amis ou alliés proches le détectent, à condition que sa case soit visible. Après un tir accepté, le sous-marin est révélé pendant 60 secondes. Le panneau indique cette durée ; aucun tir refusé ne le révèle. Les torpilles, les obus et les armes atomiques ont leurs projectiles propres, et les navires ont un sillage animé respectant l’option de mouvement réduit.

## Aventure et échanges

Quatre découvertes : épave de navire, obélisque englouti, cargaison à la dérive et épave de sous-marin. Elles nécessitent un navire pour être explorées. En présence d’une flotte humaine connectée : au plus un essai toutes les dix minutes par secteur de 32 × 32 cases, 45 % de chance, maximum douze découvertes maritimes actives dans le monde, pas de nouvelle découverte à moins de vingt cases d’une autre. Durée d’une heure, pas de rattrapage hors ligne.

Dès qu’un joueur possède un navire armé, la troisième offre de mission devient une expédition contre une rade ou une forteresse insulaire. La recherche suit l’eau accessible depuis sa flotte et évite les côtes occupées ou visibles. Objectif : détruire le port maître ; la batterie et les trois navires survivants rejoignent le commanditaire. Les règles d’alliance, d’abandon, de récompenses et de trophées restent appliquées. Une offre sans emplacement valide est refusée sans créer de forteresse ni dépenser de ressources.

Les marchés négocient les échanges ; si aucune route terrestre ne relie les marchés, deux ports peuvent expédier les cargaisons sur une mer connectée dont le trajet a été exploré par l’un des deux royaumes. Les deux convois voyagent à 15 secondes par case. Ils peuvent être escortés et pillés selon les règles existantes. Si un port est détruit ou perdu, le convoi restitue sa cargaison à l’expéditeur. Les bots côtiers peuvent construire ports, chantiers et pêcheries après leur développement de base, en conservant leur budget d’actions normal.

## Illustrations et contrôle

Images générées avec l’outil intégré **imagegen**, puis intégrées dans `apps/web/public/assets/` : `naval-medieval.png`, `naval-empire.png`, `naval-industrial.png`, `naval-modern.png`, `naval-atomic.png`, `naval-events.png`. Cinq grilles 3 × 3 contiennent vingt navires et vingt-cinq variantes de bâtiments ; une grille 2 × 2 contient les découvertes. Les niveaux 2 à 5 réutilisent les mêmes atlas en cache.

Prompts : [cinq époques](naval-art-prompts.json), [découvertes](naval-event-art-prompt.txt). La planche Empire a été corrigée pour imposer trois images par rangée ; les découvertes ont reçu une correction de transparence. Aucun drapeau ou insigne de régime réel n’est utilisé.

Tests : `tests/naval.test.ts` couvre migration, stabilité, géographie, mouvement, recrutement sur l’eau, pêche, transport, naufrage, tirs, furtivité, missions et commerce. `tests/naval.e2e.ts` vérifie les six atlas, les variantes de bâtiments, la carte et les commandes dans Chrome. Les suites existantes contrôlent également recrutement, projectiles, économie, missions et transports.

## Implantation des nouvelles installations

Le port, le chantier naval, la pêcherie maritime et la base des profondeurs se construisent désormais sur une case `COAST` ou `SEA` directement voisine d’une **plage**. Aucune case d’eau intermédiaire : le chantier touche la plage. La batterie côtière reste sur une plage, plaine, colline ou ruine directement voisine de la mer.

Un paysan ou ingénieur actif doit se tenir sur une plage voisine du chantier, neutre ou à soi. Il reste sur la rive : les troupes terrestres ne marchent pas dans l’eau. Le chantier marin doit être à trois cases d’un bâtiment du royaume, ou être accessible depuis la plage déjà revendiquée du bâtisseur (ou être sur une case déjà possédée). L’installation revendique uniquement sa case ; ni la mer alentour ni la plage ne sont capturées automatiquement.

La sélection d’une case d’eau admissible ouvre le catalogue Construire ; les cases possibles s’allument autour du bâtisseur. Les constructions terrestres restent interdites en mer. Les restrictions d’occupation, d’expédition, de développement et de ressources restent applicables. Les bots préparent le chantier depuis une plage également.

Les bâtiments côtiers existants sont conservés sur leurs cases : leur recrutement, production, amélioration et démolition continuent de fonctionner. Aucun déplacement automatique ni changement de terrain de la sauvegarde.

## Archipels et exploration libre

La génération ajoute désormais des groupes déterministes de **2 à 3 îles**, uniquement dans des zones de pleine mer assez grandes. Une grille de candidats espacés de 144 hexagones évite de transformer les mers en chapelets continus ; un candidat est rejeté si une île et sa marge navigable rencontrent un continent. Cela ne garantit pas une île dans chaque mer. L’île principale a un rayon irrégulier d’environ 9 à 11 cases ; ses voisines, de 5 à 6 cases, restent séparées par de l’eau. Les plages de 2 à 3 cases, les eaux côtières et les transitions visuelles existantes s’appliquent également aux nouvelles îles.

Les intérieurs conservent le biome régional, avec plaines, forêts, collines et montagnes. Les îles de prospecteurs privilégient les minerais. Un paysan peut débarquer, récolter, puis fonder un avant-poste selon les règles ordinaires : aucun royaume ou bâtiment producteur n’est offert automatiquement. Les nouveaux joueurs et bots ne commencent pas sur ces archipels ; ils sont réservés à la découverte et à la colonisation.

Chaque île accueille une découverte permanente, indépendante des missions :

| Lieu                     | Butin unique                                        |
| ------------------------ | --------------------------------------------------- |
| Phare abandonné          | 1 200 or, 600 bois, 200 fer et une lentille-relique |
| Port en ruine            | 600 or, 1 400 bois, 400 fer, 500 vivres             |
| Réserve des prospecteurs | 500 or, 1 800 pierre, 1 000 fer                     |

Une unité placée sur le lieu peut le fouiller pour **1 PA**, avec **1 à 6 PA** supplémentaires au butin, selon le même tirage déterministe que les anomalies. Les gains peuvent dépasser le stockage ; ils ne sont pas perdus. Le butin est unique pour le monde, sauvegardé comme épuisé, sans trophée de mission. Le lieu reste visible comme « fouillé » et son île reste colonisable. Une case inconnue ne révèle aucun lieu. L’interface affiche le contenu avant la fouille. Les illustrations existantes de phare, cité portuaire et mine sont réutilisées à l’échelle d’une case, sous les unités et sans décor superposé sur leur terrain.

Une migration JSON idempotente protège les régions déjà explorées, les terrains enregistrés, les constructions, unités, archives, missions, caravanes et frappes en cours. Les nouveaux archipels n’apparaissent que dans les espaces restés inconnus et libres ; les exclusions sont ensuite figées pour que l’exploration ne déplace jamais une île. Ni réinitialisation de monde ni migration SQL.

Les rencontres maritimes temporaires restent séparées : essai toutes les 10 minutes par secteur de 32 × 32 cases parcouru par un navire d’un joueur connecté, 45 % de probabilité sous réserve de place, maximum de 12 rencontres actives et aucune nouvelle rencontre à moins de 20 cases d’une autre près du navire. Durée de vie : une heure. Les quatre rencontres offrent des ressources et parfois une relique, plus 1 à 6 PA lors de leur récupération.

La pêche n’exige pas de banc de poissons : un navire doté de la capacité de pêche peut récolter des vivres sur une case de mer ou d’eaux côtières neutre ou possédée par son royaume, pour 1 PA. Le rendement dépend du navire. Les navires de guerre et transports ne pêchent pas.

## Pêche automatique et butin comparé

Chaque bateau de pêche vivant, non embarqué, sur une case `SEA` ou `COAST` neutre ou à son royaume produit automatiquement le quart de sa prise manuelle par minute : **10 / 40 / 90 / 160 / 250 vivres/min**, selon son époque. Ces montants sont bruts avant l’entretien de l’équipage. Aucun PA ni carburant n’est dépensé ; la pêche manuelle reste cumulable. La production rejoint le revenu habituel : présence et délai de grâce, stockage respecté, aucun rattrapage hors ligne. Le bandeau du navire et le bilan des vivres l’expliquent.

Les quatre événements maritimes donnent exactement **2× les ressources et les PA** d’un événement terrestre comparable (même tirage de PA, donc 2–12 en mer contre 1–6 sur terre). Les reliques restent uniques. Correspondances :

| Maritime              | Référence terrestre | Ressources maritimes |
| --------------------- | ------------------- | -------------------- |
| Épave des serments    | Forteresse sans nom | 240 or, 140 bois     |
| Obélisque englouti    | Monolithe de Veille | 160 or, 60 fer       |
| Cargaison à la dérive | Caravane royale     | 200 or, 130 vivres   |
| Secret du bathyscaphe | Chute d’une étoile  | 180 fer, 90 or       |

Les prix proviennent d’une référence partagée (`event-loot.ts`) ; les anciennes épaves non fouillées affichent et versent aussi ces montants, sans multiplier deux fois après sauvegarde. Ce choix exact réduit certains anciens lots maritimes supérieurs à 2×. Les récompenses des missions, des expéditions et des sites permanents des archipels restent distinctes.
