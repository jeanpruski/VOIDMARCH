# Saison 0 — L’Aube Noire

La présentation de lancement est regroupée dans `apps/web/src/Season.tsx`. Son illustration originale se trouve dans `apps/web/public/assets/season-0-aube-noire.jpg` (JPEG optimisé, 1536 × 1024). Elle représente une éclipse au-dessus d’une forteresse médiévale et industrielle, avec dragon et dirigeable. Le titre reste du texte HTML pour conserver sa netteté sur tous les écrans.

- Accueil : bannière de saison au-dessus du formulaire, bouton « Découvrir la Saison 0 » utilisable sans compte.
- Chargement de la session et de la carte : même visuel, avec les états existants de progression et de réessai conservés.
- Entrée dans le monde : présentation automatique, même pour les comptes ayant déjà terminé le tutoriel. Elle apparaît une seule fois par entrée ; un instantané réseau ne la rouvre pas. Un rechargement de page ou une nouvelle connexion la présente à nouveau.
- Menu de gauche : bouton « Saison 0 · L’Aube Noire » au-dessus de l’aide. La fenêtre reste consultable à volonté, sur ordinateur et mobile.
- Le récapitulatif couvre les cinq époques, les trophées, les nouveaux butins, les expéditions, les alliances et les transports. Les règles de départ et de PA dans l’aide sont mises à jour.
- Fermeture par le bouton, Échap ou le fond de la fenêtre ; focus clavier géré par le composant Modal existant. L’aide reste accessible depuis la présentation.

Ce lancement est une présentation de la bêta : aucune suppression de compte, remise à zéro du monde ou modification automatique des royaumes.

Validation navigateur : `npx playwright test tests/season-zero.e2e.ts`.
