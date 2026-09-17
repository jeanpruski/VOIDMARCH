# Routes et ponts

Le bouton **Routes**, près du zoom, ouvre un outil qui reste actif après chaque ordre. Choisir **Poser** ou **Retirer**, puis cliquer les cases surlignées. Les cases disponibles sont vertes pour la pose et rouges pour le retrait. Glisser déplace la caméra ; Échap ou la croix quitte l’outil. Les actions sont aussi accessibles depuis le terrain, le bâtiment ou le bâtisseur sélectionné.

## Construction et suppression

- Sur son territoire : aucun bâtisseur nécessaire.
- Sur terrain neutre : un paysan ou un ingénieur du joueur doit être sur le chantier ou à une case maximum. Pas besoin de capturer le terrain. Une route ne donne ni propriété du terrain, ni vision permanente, ni droit d’y construire des bâtiments.
- Sur territoire adverse : pose et suppression interdites.
- Sur terrain neutre : chacun peut retirer ses propres tronçons avec un bâtisseur à proximité. Les anciennes routes sans constructeur enregistré restent supprimables par le propriétaire du terrain. Si un terrain routier est capturé, son nouveau propriétaire en contrôle les routes.

| Ordre                          | PA  | Matériaux                    |
| ------------------------------ | --- | ---------------------------- |
| Poser une route                | 1   | 10 bois                      |
| Construire un pont sur rivière | 1   | 30 bois et 10 fer            |
| Retirer une route ou un pont   | 1   | Aucun ; pas de remboursement |

Ouvrir l’outil ou changer de mode ne coûte rien. Un refus ne dépense rien. Retirer une route conserve le terrain, son propriétaire, les bâtiments et les unités. Une route ne compte pas comme un bâtiment pour conserver un terrain après l’ouverture d’une enceinte.

## Déplacement pour 1 PA

Une unité **sur ses propres terres ou sur une route** peut rejoindre toute case libre du **même réseau continu et exploré**, sans limite de distance, pour **1 PA**. Chaque case du trajet doit appartenir au joueur ou porter une route. On peut enchaîner terres → routes neutres ou adverses → terres d’une autre cité dans un seul ordre. Sélectionner l’unité, cliquer **Déplacer**, puis choisir la destination sur la carte. Le chemin est calculé automatiquement, y compris à travers plusieurs chunks et hors écran.

Les terres capturées à l’intérieur des remparts font partie de ce réseau, même sans route ni bâtiment. Cela vaut aussi pour les autres terres revendiquées du joueur. Si une enceinte s’ouvre, ses cases vides qui redeviennent neutres perdent ce bonus ; une route encore présente reste utilisable. Les terres d’un adversaire sans route ne donnent aucun bonus.

Les unités terrestres sont bloquées par les autres unités et les remparts ennemis. Un détour par leurs terres ou les routes peut les contourner. Les terrains impraticables restent interdits : véhicules et cavaliers nécessitent toujours une route pour traverser une montagne ou un marais. Les unités volantes peuvent survoler les obstacles, mais doivent arriver sur une case libre. Les ennemis peuvent utiliser les routes, sans bénéficier de vos terres sans route.

Une coupure, un terrain non exploré ou une destination hors du réseau empêche le trajet illimité. Le serveur vérifie l’état réel du réseau ; un aperçu ancien sous le brouillard peut donc être refusé si la liaison a changé.

Pour **rejoindre ou quitter** ce réseau, le déplacement ordinaire conserve la portée de l’unité et coûte 1 PA. Entrer sur une case de route coûte alors 1 point de déplacement. Le bonus illimité ne permet pas de combiner une très longue portion du réseau et une sortie en terrain neutre ou adverse sans route dans le même ordre.

## Commerce

Les tronçons voisins se raccordent automatiquement, même sous les bâtiments. Un accord commercial actif et une route continue entre les marchés permettent le départ de caravanes. Les cases empruntées doivent être neutres ou appartenir aux partenaires. Retirer un tronçon peut empêcher les prochains départs ; les caravanes déjà parties conservent leur parcours.

## Sauvegarde et validation

- `ROAD` et `REMOVE_ROAD` : règles de chantier communes à l’interface et au serveur. `roadOwnerId` identifie le constructeur sans changer `ownerId`. Les routes neutres d’un invité expiré sont supprimées ; celles reprises par un autre royaume sont conservées.
- `MOVE_ROAD` : nom conservé pour compatibilité ; seul l’hexagone de destination est envoyé, le serveur calcule un parcours sur le réseau fini des terres du joueur et des routes connues. Aucun plafond arbitraire de longueur. `MOVE` garde sa portée normale.
- Les snapshots incluent les routes déjà connues hors écran, avec leur dernière observation sous le brouillard. Aucune révélation des changements invisibles.
- Aucun changement du schéma PostgreSQL : les routes et leur constructeur sont enregistrés dans l’état JSON existant.
- Tests : coûts, chantiers neutres, suppression, propriété, expiration d’invité, parcours sur 5 000 cases, obstacles, coupures, brouillard et chunks distants. Test navigateur de pose/retrait ordinateur et tactile, chantier neutre et trajet de 40 cases pour 1 PA.

Validation effectuée : compilation réussie, 336 tests unitaires réussis (7 tests DB ignorés), parcours navigateur ordinateur/mobile et trajet routier de 40 cases réussis.

## Animation des déplacements

Dès le clic, le navigateur commence à parcourir le trajet prévu. Le reçu d’un ordre `MOVE` ou `MOVE_ROAD` confirme au joueur émetteur l’origine et les étapes réellement validées, sans redémarrer une animation déjà lancée. Un refus rétablit la position serveur. La figurine parcourt cette ligne étape par étape, avec son ovale, son drapeau, sa barre de vie et son aura éventuelle. Le trajet n’est pas recalculé après l’arrivée, ce qui évite les raccourcis visuels à travers les virages.

L’animation survit au déplacement de caméra, au zoom et aux snapshots intermédiaires. Les ordres successifs conservent les étapes visuelles encore à parcourir avant d’enchaîner. Les longs voyages sont accélérés pour limiter l’animation à six secondes ; le coût et les règles du déplacement sont inchangés. Avec la réduction des animations activée, la position finale est affichée immédiatement.
