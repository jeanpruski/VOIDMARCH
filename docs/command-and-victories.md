# Victoires, armées et opérations d’alliance

## Victoires de mission

Un rapport serveur unique accompagne chaque conquête. Il contient le butin, les unités, bâtiments et remparts ralliés, la garnison détruite, la médaille et les pertes subies face à la garnison par le commanditaire et ses alliés. Les héros mis hors combat ne comptent pas comme morts. Les pertes sont enregistrées à partir de cette mise à jour ; les anciens trophées restent compatibles.

Un bilan compact apparaît chez le commanditaire et ses alliés connectés. Il se ferme explicitement, donne accès au site et aux trophées, et ne rejoue pas l’historique à la connexion. Les bâtiments survivants visibles changent de propriétaire immédiatement ; une animation de bannière descendante puis montante accompagne le ralliement. Animations réduites : bilan conservé, animation supprimée. Aucune ressource ni troupe supplémentaire n’est créée par l’animation.

## Armées enregistrées

Une sélection peut être enregistrée dans **Armées** : 12 groupes maximum, chacun de 1 à 10 troupes personnelles actives. Le registre est stocké dans le royaume côté serveur, donc conservé après reconnexion. Il permet de rappeler le groupe en un clic, renommer, remplacer sa composition ou retirer le groupe du registre sans supprimer les unités. Les morts ou absents ne sont pas sélectionnés ; le nombre de troupes disponibles est explicite. Un groupe peut partager des unités avec un autre, sans duplication d’entités.

Trois formations sont disponibles : compacte (comportement initial), ligne de front (étalement perpendiculaire à la marche), soutien protégé (combattants devant, civils, héros et tireurs à l’arrière). Le placement est un objectif, ajusté aux obstacles, aux positions déjà occupées et à la mobilité de chaque troupe. Il ne donne aucun bonus de statistiques ni déplacement gratuit. Les PA et trajets restent vérifiés par le serveur. D prépare le déplacement et Espace confirme l’aperçu.

## Opérations d’alliance

Dans **Commerce & diplomatie → Opérations d’alliance**, tout membre peut préparer un plan sur une case connue. Limite : 3 opérations simultanées, expiration après 48 heures, historique borné à 30 entrées. Le créateur et le chef d’alliance peuvent lancer ou annuler. Chaque allié choisit son rôle (assaut, artillerie, aviation, soutien), puis peut annoncer sa disponibilité. Les rôles organisent les joueurs : ils ne délèguent pas le contrôle des troupes.

- Prendre une position : la case doit appartenir à un membre de l’alliance.
- Tenir une position : contrôle allié et présence d’une unité armée au sol sur la case, sans unité adverse armée à une case maximum. Tenue continue de 5, 15 ou 30 minutes. Une interruption remet le compteur à zéro.
- Siège : bâtiment adverse visible à la préparation, détruit ou capturé par l’alliance. La progression en dégâts n’est actualisée que si un allié voit la cible. Une forteresse de mission abandonnée n’est pas une victoire de siège.

Les plans, rôles et progrès sont privés à l’alliance. Leurs positions sont indiquées sur la carte et les bilans de réussite dans le journal partagé. Un départ d’alliance retire la participation et l’accès. Les opérations ne contournent jamais trêves, protections et règles d’attaque ; elles ne distribuent pas de butin artificiel. Préparation et coordination : 0 PA, actions militaires facturées normalement.

Tous les champs persistants sont optionnels pour les sauvegardes existantes. Aucune migration SQL nécessaire.
