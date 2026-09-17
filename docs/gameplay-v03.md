# Gameplay v0.3 — 17 septembre 2026

## Choix validés

- Nouveau royaume humain : 30 PA au premier départ. Le surplus au-dessus de 15 reste disponible sans régénérer ; après sa consommation, récupération de 1 PA/minute jusqu’à 15. Les royaumes existants et les bots ne reçoivent pas un nouveau bonus.
- Construction sur terre neutre : rayon de 3 hexagones autour de tout bâtiment du royaume, bâtisseur sur le chantier ou à une case. Les contraintes de terrain, prérequis et occupation adverse restent applicables. Les terres déjà possédées restent constructibles. Le bâtisseur voit les chantiers accessibles en vert.
- Campement → avant-poste → village conservé. Chaque autre bâtiment peut atteindre le niveau 3 ; les anciennes cités de niveau 4 restent lisibles. Amélioration : 2 PA et coût indiqué dans l’aperçu. PV maximum = PV de base × niveau, réparation complète lors du développement. Production hors villages : +25 % de la base par niveau ; les villages conservent leur production × niveau. Stockages et capacités de croissance suivent les améliorations. Vision : +1 case par niveau.
- Les bâtiments formateurs donnent +10 % par niveau au-dessus de 1 aux PV, attaque et défense des types de troupes formés. Le bonus touche aussi les troupes déjà présentes ; leur proportion de vie restante est conservée. Meilleur bonus uniquement, sans addition entre bâtiments. L’entraînement acquis reste acquis ; les nouvelles recrues utilisent le meilleur bâtiment de formation actuellement détenu. Le bonus rare est additionné au bonus d’entraînement. Les bâtisseurs sont exclus du bonus militaire.
- Les paysans sont formés au campement, à l’avant-poste ou au village. Les soldats passent par les casernes, stands de tir, écuries, ateliers, arsenaux et infrastructures spécialisées. Les anciennes unités sont conservées.
- Compte invité : suppression complète après 24 h sans connexion/présence. Vérification au démarrage et chaque minute lorsque le serveur tourne. Les comptes enregistrés et invités présents sont exclus. Suppression transactionnelle du compte, sessions, snapshots et reçus ; retrait du royaume, bâtiments, unités, routes possédées, accords et anciennes observations. Les événements déjà consommés ne redonnent jamais leur butin. La conversion en compte enregistré est protégée par verrouillage des candidats. Un serveur Passenger arrêté exécute le rattrapage au prochain démarrage.
- Code caché validé par l’utilisateur pour tous ceux qui le connaissent : sur la carte, hors champ texte et fenêtre, taper `ytreza` puis Entrée. Répéter pour désactiver. Le serveur vérifie le code ; la session doit être authentifiée. PA illimités affichés par ∞ ; ressources, population, terrains, trêves et autres règles restent exigés.

## Interface

Notifications en haut, gains de ressources détaillés (récoltes, événements, ruines, interceptions et accords), événements consommés retirés du panneau et de la vue serveur. Les catalogues se ferment uniquement après une construction ou un recrutement accepté. Boutons indisponibles masqués ; les fiches, prérequis et coûts manquants en rouge restent consultables. Les commandes indiquent leurs PA. Les fenêtres affichent les nombres de types et les bénéfices de chaque bâtiment.

Recrutement : disponibles immédiatement, puis autres unités avec priorité aux coûts abordables ; à égalité civils et soutien, combattants par force croissante, véhicules en dernier. Les statistiques de base et le bonus d’entraînement sont explicités.

« Capturer » devient « Revendiquer la case · 1 PA », avec explication de la propriété et progression des captures longues. Une case possédée ne produit pas automatiquement de ressources et entraîne de l’entretien territorial.

Routes et ponts : bouton direct depuis la case, le bâtiment ou le bâtisseur. Route 10 bois + 1 PA ; pont 30 bois + 10 fer + 1 PA. Entrer sur une case aménagée coûte 1 point de déplacement ; le trajet complet reste une action à 1 PA. Sur plaine le coût était déjà de 1. Les tronçons sont visibles même isolés et se relient visuellement aux voisins. Aucun mode d’activation n’est nécessaire.

Tous les sons et contrôles audio ont été retirés ; les anciens champs de préférences restent compatibles avec les sauvegardes.

## Contenu

38 unités et 43 types de bâtiments (dont deux évolutions de remparts ; voir `remparts.md`). Nouveautés : voltigeur Tesla, chasseur de maléfices, médecin de la peste, grenadier revenant, cavalier spectral, marcheur de siège, char possédé, section de mortier ; tour Tesla, caserne des revenants, fonderie alchimique, observatoire noir. Coûts, population, entretien, terrains, prérequis et recrutements sont intégrés aux règles autoritaires. Art : `assets/occult.png`, 12 figurines isolées et normalisées, détails dans `assets-occult.md`.

## Mise en ligne

Cette modification ne requiert aucune migration SQL supplémentaire. Installer/mettre à jour le code, exécuter `npm run build`, puis redémarrer N0C en Production. Les anciens comptes invités inactifs deviennent éligibles au nettoyage dès ce redémarrage. Aucun déploiement n’est réalisé par la modification locale seule.
