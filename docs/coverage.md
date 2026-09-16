# Couverture du premier prototype

État courant après audit : **30 unités, 36 bâtiments et cinq ressources**, dont la pierre et sa carrière. Récolte sur la case occupée, terrain d'extraction validé, onglets par type, mobilisation et entretien proportionnés aux unités. Détails chiffrés dans `balance-audit.md`. Les paragraphes ci-dessous conservent l'historique des extensions précédentes.

Dernière extension : **30 unités et 35 bâtiments**, avec une branche industrielle jouable (fusils, bazookas, motos, blindés, canons, fusées), réparations mécaniques, infrastructures spécialisées et nouvelle DA décrite dans `direction-artistique-v02.md`. La description de l'extension précédente ci-dessous est conservée pour l'historique.

Extension : le catalogue passe à **18 unités et 23 bâtiments**. Aux six unités initiales s'ajoutent paysan, milicien, lancier, arbalétrier, rôdeur, cavalier léger, paladin, bélier, guérisseuse, ingénieur, berserker et acolyte du vide. Aux onze bâtiments initiaux s'ajoutent campement, chaumière, grenier, cabane de chasse, pêcherie, écurie, archerie, monastère, forge, bibliothèque, boulangerie et puits. Les rôles, coûts et prérequis sont centralisés dans `packages/config/src/index.ts` et affichés dans le jeu. Le départ à zéro, la récolte, les constructions en frontière, les soins spécialisés et les barres de vie font partie du prototype.

| Domaine        | Implémentation                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monde          | Axial q/r, chunks, graine, terrain modifié uniquement, carte extensible, routes et ponts                                                                   |
| Présence       | Connexions multiples par joueur, grâce de 3 minutes, royaume fixe et attaquable hors ligne                                                                 |
| Actions        | PA à timestamps, validation serveur, transactions et reçus idempotents                                                                                     |
| Économie       | Or, bois, fer, vivres ; rendements, travailleurs, croissance, entretien territorial et militaire, stockage                                                 |
| Agglomérations | Avant-poste, village, bourg, ville, cité ; population et ressources nécessaires                                                                            |
| Bâtiments      | Village, ferme, scierie, mine, marché, entrepôt, atelier, caserne, fort, tour, avant-poste                                                                 |
| Unités         | Éclaireur, fantassin, garde, archer, chevalier, engin de siège                                                                                             |
| Combat         | Portée, défense, terrain, variation bornée, estimation, soins, capture graduelle, destruction et défaite                                                   |
| Visibilité     | VISIBLE, EXPLORED avec dernière observation, UNKNOWN ; aucune unité ennemie cachée transmise                                                               |
| Diplomatie     | Proposition, contre-proposition, acceptation, refus, annulation, expiration, paiement transactionnel, trêve réciproque                                     |
| Commerce       | Échanges de quatre ressources, accords temporaires, recherche de route entre marchés, caravanes et interceptions                                           |
| Persistance    | PostgreSQL, snapshot complet versionné, redémarrage, retour à la même position, reconstruction après défaite                                               |
| IA             | BotDirector, six personnalités, cadence lente, sommeil, réveil, remplacement et départ des royaumes temporaires                                            |
| Monde vivant   | Monolithe, météorite, forteresse, lune rouge, brume, portail, colosse, caravane royale ; récompenses et reliques                                           |
| Comptes        | Invité, inscription, connexion, conversion d'invité, session courte et refresh HttpOnly                                                                    |
| Interface      | Plateau, ressources, PA, sélection, minimap, panneaux de royaume, unités, villes, économie, diplomatie, journal, monde, profil, classements et préférences |
| DA             | Illustration d'accueil, atlas cohérent de figurines, reliefs, faction par liseré et bannière, touches cosmiques rares                                      |
| Audio          | Vent filtré, nappes graves et effets d'actions, volumes séparés et silence lorsque la fenêtre perd le focus                                                |
| Accessibilité  | Mobile, clavier, coordonnées, taille de texte, contraste, réduction des mouvements, confirmations                                                          |

Les champs et écrans de retour du document artistique ont été adaptés à la décision de conserver physiquement les royaumes. La reconstruction ailleurs concerne la défaite uniquement.

Les fonctions reportées au futur par les documents initiaux (factions additionnelles, corruption administrative, révoltes, port fluvial, guilde marchande, chat, saisons, nouveaux monstres et unités) ne sont pas nécessaires à cette version.

Les arbitrages techniques de prototype sont explicités dans le README et le protocole : persistance par agrégat JSON transactionnel, diffusion de vues filtrées complètes, audio synthétique et animations courtes des figurines. L'infrastructure du monde est extensible, mais la charge massive et les longues campagnes d'équilibrage restent à mesurer.
