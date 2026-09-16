# VOIDMARCH

## Cahier de conception --- stratégie multijoueur persistante

### Brief pour Codex --- v0.1

> Nom temporaire. Le projet doit pouvoir être renommé facilement.

## 1. Pitch

VOIDMARCH est un jeu de stratégie 2D navigateur sur une immense carte
partagée **hexagonale**, pensée comme un grand jeu de plateau vivant. Il
mélange conquête territoriale, exploration, développement de royaume,
commerce et économie. La guerre est importante, mais elle ne doit jamais
être l'unique manière de progresser.

Le jeu reprend la lisibilité d'un jeu de conquête sur grille hexagonale,
mais sans tours globaux : un humain gagne **1 point d'action (PA) toutes
les 60 secondes**, réserve maximale 5. Un joueur peut se connecter 2
minutes, agir, partir, puis revenir plus tard.

Le monde contient des humains et des IA lentes. Les bots jouent
seulement lorsque des humains sont présents et effectuent 1 à 3 actions
environ toutes les 10 minutes. Le monde n'a pas de fin.

Principe central : **le monde persiste, mais la présence physique du
royaume ne doit pas punir l'absence.** Après une vraie déconnexion, le
royaume est sauvegardé sous forme de snapshot et retiré de la carte. Au
retour, le serveur reconstruit ailleurs un royaume de valeur globalement
équivalente.

## 2. Direction artistique

Base : chevaliers, armures rouillées, châteaux, villages, cathédrales,
cryptes, forêts brumeuses, peste et cultes. Y mélanger avec parcimonie
horreur cosmique et technologie incompréhensible : lunes immenses,
ruines impossibles, monolithes, machines enterrées, métal inconnu,
artefacts extraterrestres et rares éléments futuristes.

Intention : **un royaume médiéval bâti sur les restes d'une civilisation
cosmique incompréhensible**. La technologie doit être rare : découvrir
une machine ou un portail doit rester exceptionnel.

Ambiance : sombre, monumental, humide, ancien, cosmique, mélancolique,
hostile, étrange. Palette : pierre, fer, brun, vert malade, bleu nuit,
gris lunaire ; cyan/violet/rouge surnaturel pour les anomalies.

Rendu recommandé : 2D top-down ou légère fausse perspective, sprites
stylisés/pixel-art moderne, grille lisible, brouillard, éclairages et
particules modernes. UI = métal gravé + pierre + manuscrit médiéval +
instrument occulte + terminal alien ancien. L'UX reste claire avant
tout.

## 3. Stack

### Front

-   React + TypeScript + Vite
-   Phaser 3 pour carte/sprites/caméra
-   Zustand pour état UI
-   **Socket.IO Client**

### Back

-   Node.js + TypeScript
-   Fastify (Express acceptable)
-   **Socket.IO**
-   PostgreSQL + Prisma
-   Redis
-   BullMQ si jobs différés nécessaires
-   JWT court + refresh token sécurisé

Docker Compose en local. Prévoir Socket.IO Redis Adapter pour futur
scaling horizontal.

## 4. Architecture du monde

La carte utilise **exclusivement des cases hexagonales** afin d'évoquer
un grand jeu de plateau stratégique. Chaque biome, frontière, ressource,
route et zone d'influence doit être immédiatement lisible.

Utiliser des coordonnées hexagonales axiales `q/r` (avec conversion cube
`q/r/s` lorsque nécessaire pour distances et algorithmes). Ne pas
traiter la carte comme une grille carrée déguisée.

Le monde est extensible et découpé en chunks logiques, par exemple 32×32
coordonnées axiales. Génération déterministe via
`WORLD_SEED + chunkQ + chunkR`. Ne stocker que les modifications
persistantes du terrain généré : ownership, bâtiments, routes,
destructions, anomalies, ressources.

Rooms Socket.IO : `world:main`, `chunk:X:Y`, `player:<id>`. Le client
rejoint uniquement les chunks utiles à sa caméra/vision.

Terrains MVP : plaine, forêt, colline, montagne, route, rivière, marais,
ruines, sol corrompu, structure alien. Générer massifs, rivières, cols,
ponts, routes anciennes, villages abandonnés, mines, forts neutres et
anomalies. POI : COMMON / UNCOMMON / RARE / MYTHIC.

## 5. Points d'action

Défaut : `+1 PA / 60 s`, `MAX_AP=5`. Ne jamais maintenir un timer par
joueur. Stocker `actionPoints` + `lastActionPointAt`, recalculer au
temps serveur et clamp au maximum.

Actions : MOVE, ATTACK, CAPTURE, BUILD, RECRUIT, REPAIR, INTERACT,
ABILITY. Coût configurable ; le moteur doit supporter plusieurs PA.

## 6. Mouvement

Une action MOVE permet de parcourir un chemin dont le coût \<= MOVE de
l'unité. Le client peut prévisualiser A\*, mais le serveur revalide
propriétaire, PA, vie, chemin, terrain, coût, collision et destination.

## 7. Territoire

Une case neutre ordinaire peut être revendiquée par occupation. Les
lieux importants ont une jauge : Village 2, Mine 3, Tour 3, Fort 4,
Ville 5, structure antique variable. Un fantassin produit 1 point de
capture/action.

Le MVP n'impose pas la continuité territoriale. Plus tard : logistique
et malus des enclaves.

## 8. Économie, population et développement

L'économie doit être **un pilier aussi important que la guerre**. Un
joueur doit pouvoir devenir puissant en développant un territoire riche,
en contrôlant des ressources, en construisant des infrastructures et en
commerçant sans rechercher constamment le combat.

L'inspiration est celle d'un jeu de civilisation/plateau : chaque
hexagone possède une valeur économique en plus de sa valeur militaire.

### Ressources

MVP :

-   GOLD : monnaie, entretien et commerce ;
-   WOOD : construction et unités légères ;
-   IRON : fortifications et unités lourdes ;
-   FOOD : croissance et entretien de la population.

Plus tard : RELIC / VOID / AETHER pour les anomalies et technologies
cosmiques.

Les hexagones ont des rendements naturels :

``` txt
Plaine fertile : Food
Forêt : Wood
Colline/minerai : Iron
Ruines : chance de Relic
Route : bonus logistique/commercial
Rivière : bonus Food/commerce pour certains bâtiments
```

Le joueur doit donc convoiter certaines régions pour leur richesse, pas
uniquement pour leur position militaire.

### Population

Villages et villes possèdent une population abstraite. Elle consomme
FOOD, fournit des travailleurs, augmente les revenus, débloque des
bâtiments et fixe une partie de la capacité de recrutement.

Militariser massivement son royaume a donc un coût : davantage
d'entretien, moins de travailleurs disponibles et croissance ralentie.

### Développement urbain

``` txt
Avant-poste → Village → Bourg → Ville → Cité
```

Chaque niveau demande population, ressources et infrastructures et
augmente les possibilités économiques.

### Production et bâtiments économiques

Exemples à équilibrer :

``` txt
Village : Gold + Food
Ferme : Food
Scierie : Wood
Mine : Iron
Marché : Gold + commerce
Entrepôt : stockage/logistique
Atelier : production spécialisée
Ville : Gold + capacité de population
```

Ajouter Ferme, Marché, Entrepôt et Route au roster économique. Port
fluvial et Guilde marchande pourront venir ensuite.

Calculer la production par timestamps. La production normale s'arrête
lorsque le joueur est réellement offline.

### Commerce

Prévoir l'architecture du commerce dès le départ, même si la version
complète vient après le MVP.

Deux royaumes pourront :

-   échanger des ressources ;
-   créer un accord commercial ;
-   vendre leurs surplus ;
-   acheter une ressource manquante ;
-   établir plus tard une route commerciale et envoyer des caravanes.

Une route commerciale viable peut générer un revenu périodique. Les
caravanes pourront ensuite être visibles sur la carte et donc protégées,
interceptées ou détournées.

### Spécialisation régionale

Les régions doivent encourager la spécialisation :

``` txt
Forêts abondantes → exportateur de bois
Montagnes → fer
Plaines fertiles → nourriture
Ruines/anomalies → reliques
```

Un voisin doit pouvoir être intéressant comme partenaire économique et
pas seulement comme cible.

### Plusieurs formes de puissance

Le jeu peut suivre séparément :

-   puissance militaire ;
-   richesse ;
-   population ;
-   commerce ;
-   développement urbain ;
-   exploration ;
-   reliques ;
-   influence diplomatique future.

Il n'existe toujours pas de victoire globale et aucun indicateur unique
ne doit résumer à lui seul la réussite d'un royaume.

## 9. Unités MVP

-   Éclaireur : HP5, ATK1, DEF0, MOVE5, VISION6.
-   Fantassin : HP10, ATK3, DEF2, MOVE3, VISION3, CAPTURE1.
-   Garde : HP15, ATK2, DEF5, MOVE2.
-   Archer : HP7, ATK4, DEF1, MOVE2, RANGE3.
-   Chevalier : HP10, ATK5, DEF2, MOVE5.
-   Engin de siège : HP8, ATK3, BUILDING_ATK8, DEF1, MOVE1, RANGE4.

Futur : chevalier de peste, prêtre du vide, golem stellaire, cavalier
biomécanique. Ne pas surcharger le MVP.

## 10. Combat et fog

Combat sur la carte. Formule centralisée : attaque + bonus - défense -
terrain + petite variation bornée. Montrer une estimation avant
validation ; serveur autoritaire sur le résultat.

Fog : VISIBLE / EXPLORED / UNKNOWN. **Ne jamais envoyer au client les
unités ennemies invisibles pour simplement les masquer graphiquement.**

## 11. Connexion / déconnexion

Statuts : ONLINE, AWAY, DISCONNECTED. Une coupure Socket.IO momentanée
ne doit pas despawn : délai de grâce configurable, ex. 3 minutes.

Après vraie déconnexion : figer l'état, sauvegarder
ressources/armée/bâtiments/progression/reliques, calculer `RealmValue`,
retirer la présence active et libérer le territoire ordinaire.

Snapshot versionné :

``` ts
interface RealmSnapshot {
  version: number;
  realmValue: number;
  resources: ResourceWallet;
  units: SnapshotUnit[];
  buildings: SnapshotBuilding[];
  progression: PlayerProgression;
  relics: string[];
  createdAt: Date;
}
```

Ne jamais conserver uniquement RealmValue.

## 12. Retour, spawn et protection

Au retour : auth → profil/settings → snapshot → recherche de régions →
scoring → choix aléatoire parmi les meilleures → reconstruction
équivalente → protection → chunks/rooms.

La géométrie du royaume n'est pas conservée ; sa valeur et son identité
stratégique le sont. Le spawn favorise terrain constructible,
ressources, distance aux armées hostiles et accès raisonnable.

Protection initiale : 10 min. On peut bouger, explorer, construire et
recruter, mais pas attaquer/capturer un humain ni être attaqué. Une
attaque volontaire retire le bouclier. Les bots évitent les royaumes
protégés.

Défaite : jamais de suppression du compte. Base de balance : -25 %
RealmValue, 10 min de cooldown, puis respawn ailleurs.

## 13. Anti-snowball et coût d'un empire

L'expansion crée un arbitrage économique : une nouvelle région apporte
ressources et position, mais augmente administration, routes,
ravitaillement et défense. Un petit royaume très développé doit pouvoir
être économiquement compétitif face à un immense territoire pauvre.

Entretien territorial indicatif : 1--20 cases ×1 ; 21--40 ×1,1 ; 41--80
×1,3 ; 81--150 ×1,7 ; 151+ ×2,5. Plus tard : lignes d'approvisionnement,
corruption et révoltes.

## 14. Bots

Au lancement : 3 bots minimum. Chaque bot reçoit une fenêtre environ
toutes les 10 min (+ jitter) et effectue `random(1,3)` actions. Il
explore, capture, construit, recrute, défend, attaque et peut combattre
d'autres bots. Il respecte le fog.

### Population dynamique

-   0 humain : cible préparée 5 bots, **mais IA en sommeil**.
-   1 humain : cible 4 bots.
-   2+ humains : cible 3 bots.

Quand aucun humain n'est connecté, aucune simulation militaire coûteuse.
À l'arrivée du premier humain, le `BotDirector` réveille les IA. Si un
des trois bots principaux meurt, un nouveau bot apparaît après un délai
aléatoire, ailleurs, avec nom/personnalité/faction/puissance cohérente.

Les 4e/5e bots sont temporaires : ils peuvent partir après une durée
minimale, quand davantage d'humains arrivent, après une lourde défaite
ou selon leur personnalité. Leur départ libère proprement leur
territoire.

Personnalités : AGGRESSIVE, EXPANSIONIST, TURTLE, SCAVENGER, CULTIST,
OPPORTUNIST. L'IA génère des intentions, les score, ajoute une faible
variation puis choisit parmi les meilleures. Pas de ML nécessaire.

Créer un service `BotDirector` séparé : présence humaine, sleep/wake,
population cible, remplacement, départ, cadence. Ne pas mettre cette
logique dans les handlers Socket.IO.

## 15. Événements mondiaux

Forteresse ancienne, météorite, portail, roi monstrueux, mine
exceptionnelle, tempête cosmique, caravane, relique. Chaque événement :
type, position, visibilité, début, expiration, règles, récompenses,
état. Certains sont annoncés mondialement, d'autres doivent être
découverts.

## 16. Comptes, invités et settings

Autoriser compte enregistré + invité. Un invité joue immédiatement avec
identifiant temporaire/local et peut convertir son run en compte.

`User` : id, email?, username, usernameNormalized, passwordHash?,
createdAt, updatedAt, lastLoginAt, status. Username unique et validé ;
jamais clé primaire.

`UserSettings` persistant : locale, volumes master/music/SFX, mute
unfocused, vitesse caméra, edge scrolling, grille, coordonnées, reduced
motion, contraste, confirmation actions dangereuses, auto-center
événements, notifications combat/royaume, input préféré, UI scale.
Stocker aussi tutoriel terminé, dernière caméra/zone et préférences UI.

## 17. Modèle de données minimal

Tables/collections logiques : User, UserSettings, PlayerProgression,
PlayerRealmSnapshot, ActiveRealm, Unit, Building, ChunkModification,
TileOwnership, WorldPOI, WorldEvent, BotProfile, CombatEvent,
AuditEvent, Session/RefreshToken.

Toutes les entités ont UUID, createdAt, updatedAt. Indexer
coordonnées/chunks, ownership, userId et timestamps d'événements.

## 18. Contrat Socket.IO

Client → serveur : `world:join`, `chunks:subscribe`, `player:action`,
`player:ping`, `chat:send` (plus tard).

Serveur → client : `world:snapshot`, `chunk:snapshot`, `chunk:patch`,
`player:state`, `action:result`, `world:event`, `presence:update`.

Action :

``` ts
{ actionId, type, actorId, payload, clientTimestamp }
```

Réponse :

``` ts
{ actionId, accepted, reason?, serverTimestamp, newActionPoints, patches }
```

`actionId` sert à l'idempotence. Toute mutation importante doit être
transactionnelle.

## 19. Sécurité

Le client ne décide jamais : PA, ressources, dégâts, ownership, capture,
production, cooldown, visibilité, spawn. Rate-limit REST et Socket.IO.
Validation Zod. Requêtes Prisma paramétrées. Tokens protégés.
Journaliser actions sensibles. Ajouter un mécanisme d'idempotence/replay
protection.

## 20. UI principale

Écran de jeu : carte centrale ; barre ressources + PA + countdown ;
panneau unité/bâtiment sélectionné ; minimap ; feed d'événements ;
boutons construction/recrutement ; indicateur connexion/reconnexion ;
fog ; coordonnées optionnelles.

UX : cliquer unité → cases possibles → destination → confirmation si
dangereuse. Cliquer ennemi → estimation combat. Cliquer bâtiment →
production/actions. Les actions impossibles expliquent clairement
pourquoi.

## 21. Boucle de jeu

1.  Se connecter.
2.  Observer ce qui a changé.
3.  Explorer.
4.  Capturer.
5.  Produire.
6.  Construire/recruter.
7.  Choisir expansion, défense, guerre ou anomalie.
8.  Dépenser quelques PA.
9.  Quitter librement.
10. Revenir plus tard dans un monde différent.

Il n'existe pas de victoire globale. Statistiques : territoire,
puissance, exploration, combats, anomalies et histoire du royaume. Des
saisons pourront remettre certains classements à zéro sans
nécessairement reset la carte.

## 22. MVP par phases

### Phase 1 --- vertical slice solo

Carte **hexagonale** chunkée, caméra, génération, coordonnées axiales,
voisinage hexagonal, unité, déplacement, PA, serveur autoritaire.

### Phase 2 --- multi

Auth invité/compte, Socket.IO, rooms, plusieurs joueurs, sync de chunks,
ownership, fog.

### Phase 3 --- économie

Rendements des hexagones, GOLD/WOOD/IRON/FOOD, population, fermes,
marchés, développement Village→Ville, capture, bâtiments, recrutement et
combat.

### Phase 3.5 --- économie avancée

Routes, spécialisation régionale, commerce entre royaumes, accords
commerciaux et premières caravanes.

### Phase 4 --- persistance

Snapshots, déconnexion, respawn équivalent, settings, historique.

### Phase 5 --- IA

3 bots, BotDirector, personnalités, sleep/wake, remplacement, 4e/5e bot
dynamique.

### Phase 6 --- identité

DA finale, audio, anomalies, événements mondiaux, onboarding.

## 23. Tests indispensables

-   PA impossible à dupliquer avec deux onglets.
-   Deux attaques simultanées sur la même cible restent cohérentes.
-   Reconnexion Socket.IO n'entraîne pas de double royaume.
-   Snapshot/restore conserve approximativement la valeur.
-   Serveur restart sans perte de PA/production.
-   Bot sleep quand zéro humain.
-   Bot wake au premier humain.
-   Remplacement d'un bot mort.
-   Réduction 5→3 bots sans suppression brutale incohérente.
-   Fog n'expose aucune donnée secrète.
-   Action dupliquée avec même actionId n'est exécutée qu'une fois.

## 24. Structure de repository suggérée

``` txt
/apps/web
/apps/server
/packages/shared
/packages/game-rules
/packages/protocol
/packages/config
```

`shared` = types généraux ; `game-rules` = calculs purs ; `protocol` =
schémas Socket.IO/Zod ; `config` = unités/bâtiments/terrains/balance.

Backend : modules auth, users, world, chunks, realms, actions, combat,
economy, visibility, bots, events, socket, persistence.

## 25. Règles pour Codex

1.  TypeScript strict.
2.  Serveur autoritaire.
3.  Pas de logique métier importante dans React/Phaser.
4.  Pas de timer par entité si un timestamp suffit.
5.  Règles dans `game-rules/config`.
6.  Schémas réseau partagés et validés.
7.  Transactions pour mutations concurrentes.
8.  Idempotence des actions.
9.  Tests unitaires des règles avant cosmétique.
10. Commencer par un vertical slice jouable, pas par tous les systèmes.
11. Fournir `.env.example`, migrations Prisma, seed et Docker Compose.
12. Documenter chaque événement Socket.IO.

## 26. Définition de réussite du premier prototype

Deux navigateurs peuvent rejoindre le même monde, voir uniquement ce
qu'ils doivent voir, gagner des PA au temps serveur,
déplacer/capturer/construire/combattre, observer les mises à jour via
Socket.IO, se déconnecter sans perdre leur progression, revenir ailleurs
avec un royaume équivalent, et rencontrer des bots lents qui s'activent
uniquement quand un humain est présent.

La priorité absolue est de rendre **la boucle minute → décision →
changement visible du monde** agréable avant d'ajouter davantage de
contenu.

Le prototype n'est réussi que si une vraie stratégie économique est déjà
perceptible : le joueur doit hésiter entre utiliser ses PA et ressources
pour **explorer, produire, développer, commercer, fortifier ou
combattre**. La guerre ne doit pas être la réponse optimale à toutes les
situations.
