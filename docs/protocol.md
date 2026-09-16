# Protocole réseau

Le client ne fixe jamais les PA, rendements, dégâts, captures, propriétaires, positions finales, temps serveur, boucliers ou résultats de négociation.

Les portefeuilles utilisent `GOLD`, `WOOD`, `STONE`, `IRON`, `FOOD`. Les propositions anciennes sans `STONE` sont normalisées à zéro. `GATHER` reçoit `{ resource }` et le serveur vérifie le paysan, la case exacte occupée, son terrain et son propriétaire. Les déplacements utilisent le même coût selon le type d'unité dans le pathfinding client et dans la validation serveur. Les nouveaux stocks sont ajoutés aux anciennes sauvegardes, accords et archives sans supprimer leurs actifs.

## REST

| Route                     | Entrée / résultat                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| POST `/api/auth/guest`    | username, faction → access token et utilisateur invité                                              |
| POST `/api/auth/register` | username, password (10+), email facultatif, faction ; un access token d'invité conserve son royaume |
| POST `/api/auth/login`    | username, password → session                                                                        |
| POST `/api/auth/refresh`  | cookie HttpOnly → rotation du refresh et access token de 10 minutes                                 |
| POST `/api/auth/logout`   | Bearer → suppression de la session et déconnexion                                                   |
| PATCH `/api/settings`     | Bearer et préférences partielles validées → préférences sauvegardées                                |
| GET `/api/health`         | état de service, version du monde et statut de simulation                                           |

Les mots de passe sont dérivés par scrypt avec sel individuel. Les refresh tokens aléatoires sont hachés en base, expirent à 30 jours et utilisent un cookie HttpOnly / SameSite Strict, Secure en production. Le serveur limite le débit HTTP et Socket.IO. Les identités sont des UUID ; les noms normalisés sont uniques.

## Socket.IO

Authentification à la connexion : `auth: { token }`. Le JWT contient `sub`, `sid`, `exp` et la session est vérifiée en base.

| Direction        | Événement          | Objet                                                                                                                                                                                                    |
| ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| client → serveur | `world:join`       | Sans paramètres. Restaure le royaume à sa position et établit la présence.                                                                                                                               |
| client → serveur | `chunks:subscribe` | `{ chunks: [{q,r}] }`, au plus 12 chunks, coordonnées de chunks validées.                                                                                                                                |
| client → serveur | `player:ping`      | Présence réseau ; le serveur calcule les temps lui-même.                                                                                                                                                 |
| client → serveur | `player:action`    | `{ actionId, type, actorId, payload, clientTimestamp }`, callback d'accusé de réception facultatif.                                                                                                      |
| serveur → client | `world:snapshot`   | Vue personnelle : tuiles des chunks souscrits, aperçu `overview` des régions explorées, unités autorisées, état du joueur, royaumes publics, accords personnels, événements autorisés et journal filtré. |
| serveur → client | `player:state`     | État privé du joueur et rendements.                                                                                                                                                                      |
| serveur → client | `action:result`    | `{ actionId, accepted, reason?, message?, serverTimestamp, newActionPoints, revision? }`.                                                                                                                |
| serveur → client | `presence:update`  | `{ status: 'ONLINE', serverTimestamp? }`.                                                                                                                                                                |
| serveur → client | `server:error`     | `{ message }` en cas d'erreur d'enregistrement.                                                                                                                                                          |

Le prototype synchronise des vues complètes filtrées à la connexion, après chaque commande et toutes les cinq secondes. Les rooms sont `world:main`, `chunk:q:r`, `player:id`. **Les données des unités ne sont pas diffusées aveuglément dans une room de chunk** : la vue est calculée pour chaque joueur. Le serveur émet également `chunk:snapshot` (première observation), `chunk:patch` (tuiles modifiées et remplacement des unités visibles du chunk) et `world:event` (nouvelle annonce autorisée). Chaque message est filtré par joueur. Le client utilise actuellement la vue complète pour resynchroniser son état ; les patches sont disponibles pour optimiser les clients suivants. Un patch indique `unitsReplace: true` afin de retirer aussi les unités qui sortent de la vision.

`actionId` est un UUID. `(userId, actionId)` est unique en base ; le même identifiant et le même contenu retournent le reçu original. Le même identifiant associé à un autre contenu est rejeté. Les reçus ne sont pas éliminés en fonction de l'âge du client.

## Commandes

| Type     | payload                                                         | Coût PA     |
| -------- | --------------------------------------------------------------- | ----------- |
| MOVE     | `{path:[{q,r}]}`                                                | 1           |
| ATTACK   | `{targetId}`                                                    | 1 ; siège 2 |
| CAPTURE  | `{}`                                                            | 1           |
| BUILD    | `{q,r,kind}`                                                    | 1           |
| ROAD     | `{q,r}`                                                         | 1           |
| RECRUIT  | `{kind}`                                                        | 1           |
| REPAIR   | `{}`                                                            | 1           |
| UPGRADE  | `{}`                                                            | 2           |
| ABILITY  | `{ability:'RALLY'\|'SURVEY'}`                                   | 2           |
| INTERACT | `{eventId? , caravanId?}` ; sans identifiant = fouiller la case | 1           |
| PROPOSE  | `{to,kind,payer,offer,request,duration,parentId?}`              | 0           |
| RESPOND  | `{proposalId,decision:'ACCEPT'\|'REJECT'\|'CANCEL'}`            | 0           |
| RESPAWN  | `{}` après défaite et cooldown                                  | 0           |

Portefeuilles : `{GOLD,WOOD,IRON,FOOD}`, montants entiers positifs ou nuls. Durées en millisecondes, entre 60 000 et 604 800 000. Les offres expirent après 24 heures. Un tribut n'a pas de contrepartie marchande ; le payeur doit être l'un des signataires. Les échanges exigent un marché chez leur initiateur. Les ressources sont contrôlées à nouveau lors de l'acceptation.

La mini-carte utilise `overview`, une liste de positions, terrains, propriétaires observés et états de visibilité. Elle reste disponible indépendamment des chunks de la caméra. Les zones hors vision conservent leur dernière observation ; cet aperçu ne contient ni unités ni bâtiments.
