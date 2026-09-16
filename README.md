# VOIDMARCH

Prototype jouable de stratégie multijoueur persistante en français. Une carte hexagonale partagée, des royaumes mêlant féodalité et industrie de guerre, une économie territoriale et de rares vestiges cosmiques.

## Démarrer

Sur ce Mac, double-cliquer **[Lancer VOIDMARCH.command](Lancer%20VOIDMARCH.command)** prépare la base si nécessaire, démarre le jeu et ouvre le navigateur. Les serveurs sont lancés en arrière-plan et restent actifs à la fermeture du terminal. Après un redémarrage du Mac, utiliser à nouveau ce fichier.

Si la base est déjà active, `npm run dev:local` suffit. Les journaux se trouvent dans `.data/dev.log`. L'erreur `ERR_CONNECTION_REFUSED` indique que le serveur local n'écoute pas à l'adresse demandée ; elle ne signifie pas que la sauvegarde a été perdue.

Node.js **22.19+** et PostgreSQL 16 sont nécessaires. Docker Compose fournit PostgreSQL et Redis ; le script de préparation reconnaît également PostgreSQL 16 installé par Homebrew sur macOS.

```sh
npm ci
npm run setup
npm run dev
```

Ouvrir **http://localhost:5173**. Choisir un nom et une faction, puis « Élever ma bannière ». Un invité peut transformer son royaume en compte depuis son profil, sans perdre sa progression. Pour deux joueurs indépendants, utiliser deux profils de navigateur ou une fenêtre privée. Deux onglets du même compte partagent ses PA.

Les données locales sont dans PostgreSQL, sous `.data/postgres` avec le mode Homebrew ou dans le volume `postgres_data` avec Docker. **Ne supprimez pas ces emplacements pour redémarrer le jeu.** Les modifications du code ne réinitialisent pas le monde. Les clés sont créées localement dans `.env`, exclu des sources.

Le lancement local dans l'environnement de développement a déjà été préparé. Pour le relancer, `npm run dev` suffit si PostgreSQL est actif ; sinon `npm run setup` le redémarre en conservant les données.

## Jouer

- Chaque nouveau royaume commence avec **un campement, aucune unité et aucun stock**. Sélectionner le campement → Recruter → **Former le paysan** : aucune ressource nécessaire, 1 PA. Sélectionner ensuite le paysan pour le déplacer sur le terrain à récolter : bois en forêt, pierre sur colline ou montagne, fer sur colline, vivres sur plaine/rivière/marais et or dans les ruines, puis construire sur la frontière. Le campement fournit or et vivres ; les matériaux demandent une récolte ou une exploitation adaptée. Si aucun paysan ne subsiste, son remplacement est gratuit en ressources.
- Les unités et bâtiments endommagés affichent une petite barre de vie sur la carte. Le catalogue propose **30 unités et 36 bâtiments**, avec leurs rôles et prérequis dans les panneaux. Le campement évolue en avant-poste, puis en village.
- Cliquer une unité, puis **Déplacer**, puis une case surlignée. Le chemin tient compte des six voisins hexagonaux, du terrain, des routes et des unités.
- **Capturer** revendique la case occupée. Les lieux importants nécessitent plusieurs actions. Les unités militaires de capture sont les fantassins, gardes et chevaliers.
- Cliquer une terre possédée pour **Construire**, ou un bâtiment pour recruter, réparer ou développer une ville.
- **Attaquer** affiche une estimation avant validation. Le serveur décide des dégâts. Les engins de siège consomment 2 PA et ont un bonus contre les bâtiments.
- **Économie** détaille stocks, capacité, production et entretien. La population consomme des vivres et permet le recrutement. Les entrepôts augmentent le stockage.
- **Commerce & diplomatie** permet des échanges, accords commerciaux, tributs, contre-propositions, refus et annulations. Le paiement du tribut et la trêve commencent simultanément à l'acceptation.
- Les trêves empêchent réciproquement attaques, captures et interceptions entre leurs signataires, y compris hors ligne. Une offre en attente ne protège pas.
- Relier deux marchés par une route continue ouvre des caravanes visibles et interceptables. Les deux partenaires reçoivent le revenu à leur arrivée.
- Approcher une unité d'une anomalie pour l'explorer. Les découvertes offrent ressources et reliques.
- Glisser pour déplacer la caméra, molette pour zoomer, flèches pour naviguer. R / A / V / E / D ouvrent les principaux panneaux. Échap annule un mode ou ferme un panneau.

## Règles retenues

Les nouvelles capitales sont espacées d'au moins **70 cases**. Les zones d'implantation sont cinq fois plus éloignées qu'auparavant pour laisser davantage de place à l'exploration et au développement avant les rencontres. Le monde se génère progressivement par régions ; seuls les secteurs utiles sont chargés. Cette distance concerne les fondations : les armées et les frontières peuvent ensuite se rapprocher.

**Les royaumes restent sur la carte après déconnexion et restent attaquables.** La sauvegarde n'est plus une téléportation. La production normale s'arrête à la fin d'une grâce de trois minutes ; les PA continuent de se régénérer jusqu'au plafond de quinze, à raison d’un par minute. Les nouvelles bannières bénéficient de dix minutes de protection, retirée par un acte hostile volontaire.

La destruction ou capture de la capitale provoque la défaite. Le compte et l'histoire sont conservés. Après dix minutes, une reconstruction ailleurs restaure approximativement 75 % des actifs sauvegardés et accorde une nouvelle protection. Les snapshots contiennent les unités, bâtiments, ressources, progression, reliques et données du royaume, avec une version.

Chaque bot tire au hasard un budget de 0, 1, 2 ou 3 actions, avec une probabilité égale, environ toutes les dix minutes (intervalle de 8 min 30 à 11 min 30). Un tirage de zéro laisse passer tout le cycle ; le bot peut aussi accomplir moins d'actions si aucun ordre valide n'est disponible. Ils dorment lorsque personne n'est connecté. Leur population cible passe de cinq à quatre puis trois ; les royaumes temporaires ne partent qu'après leur séjour minimal et n'abandonnent pas un accord actif.

La [décision de conception actualisée](docs/decisions.md) prime sur le [document initial](docs/conception-originale.md), qui proposait de déplacer le royaume à chaque connexion. La [bible artistique](docs/direction-artistique.md) est conservée intégralement.

## Systèmes présents

Carte extensible déterministe par graine, chunks axiaux de 32 × 32, brouillard VISIBLE / EXPLORED / UNKNOWN, prévisualisation de chemins, 30 types d'unités, 36 types de bâtiments, récoltes et construction par les paysans, routes et ponts, progression Campement → Cité, cinq ressources, population, coûts d'empire, combat, soins, capacités, exploration, huit types d'événements, reliques, accords, caravanes, trêves, classement par huit dimensions, bots à personnalités, comptes et invités, journal, paramètres persistants et audio synthétique d'ambiance.

## Cendres et acier

La [direction artistique actualisée](docs/direction-artistique-v02.md) mêle chevaliers, fusils, motos, blindés et architectures gothiques industrielles. Le nouveau décor d’accueil et les 24 figurines supplémentaires sont intégrés au jeu. Les anciennes unités restent disponibles : l’industrie est une branche de développement, pas un remplacement automatique.

Construire atelier et forge, puis caserne et arsenal ouvre les armes à feu. Le garage ouvre les motos ; raffinerie et usine ouvrent les blindés. Le laboratoire et la rampe ouvrent les fusées. Les panneaux affichent chaque prérequis et permettent une recherche par nom. Les véhicules se réparent avec or et fer, les guérisseuses soignent les unités vivantes. Une carrière assure la production de pierre et les onglets trient les catalogues par rôle. La raffinerie utilise les ressources existantes ; il n’y a pas de jauge de carburant distincte.

Un [audit reproductible des coûts, productions et de la mobilisation](docs/balance-audit.md) détaille le catalogue actuel et les limites de la validation.

## Architecture

| Dossier               | Rôle                                                                                |
| --------------------- | ----------------------------------------------------------------------------------- |
| `apps/web`            | React, Phaser 3 (rendu Canvas), Zustand, Socket.IO ; interface française adaptative |
| `apps/server`         | Fastify, Socket.IO, comptes, moteur, persistance et BotDirector                     |
| `packages/game-rules` | Calculs purs : hexagones, PA, économie, visibilité, chemins, dégâts                 |
| `packages/config`     | Équilibrage, factions, ressources, unités, bâtiments et préférences                 |
| `packages/protocol`   | Schémas réseau Zod et contrat d'actions partagé                                     |
| `packages/shared`     | Types du monde et des vues filtrées                                                 |

PostgreSQL est la source de vérité. Un agrégat `WorldState` versionné contient les collections logiques du monde ; les utilisateurs, sessions, reçus d'action, snapshots et audits ont leurs propres tables et index. Chaque mutation prend un verrou transactionnel PostgreSQL, recharge l'état, applique une copie validée et conserve le reçu idempotent dans la même transaction. Les requêtes refusées n'appliquent pas de mutations partielles.

Le terrain de base est déterministe ; seules ses modifications sont conservées. Les observations du brouillard sont mémorisées séparément par royaume. Les unités cachées ne quittent jamais le serveur. La graine, les noms des royaumes et les statistiques agrégées de classement sont publics.

Un seul processus assure la simulation d'un monde. `REDIS_URL` active l'adaptateur Socket.IO Redis. **Cet adaptateur ne suffit pas à lancer plusieurs simulateurs du même monde** : une élection de responsable de simulation et une gestion distribuée des présences seraient alors nécessaires.

Voir [le protocole réseau](docs/protocol.md), [la couverture fonctionnelle](docs/coverage.md) et [les assets et prompts](docs/assets.md).

## Vérification

```sh
npm run build       # TypeScript strict puis build de production
npm test            # Règles pures et moteur
npm run test:db     # Transactions dans un monde PostgreSQL de test isolé
npm run test:e2e    # Jeu lancé : Chrome, deux navigateurs et viewport mobile
npm audit
```

Les tests de base ont leurs propres identifiants et nettoient uniquement leurs données. Les tests navigateur créent des souverains de test dans le monde local ; ils ne réinitialisent pas celui-ci. Playwright utilise Google Chrome installé sur macOS, ou son Chromium par défaut sur les autres systèmes (`npx playwright install chromium`).

## Docker complet

```sh
npm run setup
docker compose --profile full up --build
```

Ouvrir http://localhost:3001. Le conteneur applique les migrations puis sert l'interface compilée. Le profil Compose est destiné aux essais locaux en HTTP. Pour une mise en ligne, définir `NODE_ENV=production`, utiliser HTTPS, configurer `WEB_ORIGIN`, les secrets, les sauvegardes PostgreSQL et la terminaison TLS. Les cookies de session deviennent alors `Secure`.

## Limites de ce prototype

L'équilibrage des unités, du rythme et des coûts doit être éprouvé en partie. Les règles de bots et d'événements sont présentes, avec comportements et animations de prototype. Le stockage en agrégat transactionnel et les instantanés de vue conviennent à la validation d'un monde local ; la tenue à grande population doit être mesurée avant exploitation publique. La musique et les effets sont synthétiques. Docker est fourni ; sa validation exige un moteur Docker installé.

Les sources techniques utilisées pour la structure sont le [modèle Phaser + TypeScript + Vite](https://phaser.io/news/2024/01/phaser-vite-typescript-template) et l'[adaptateur Redis officiel de Socket.IO](https://github.com/socketio/socket.io-redis-adapter).
