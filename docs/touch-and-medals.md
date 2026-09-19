# Zoom tactile et variété des médailles

## Carte tactile

Pincer ou écarter deux doigts zoome et dézoome entre les limites existantes (0,2–3,2). Le point du monde placé sous le milieu du geste reste ancré sous les doigts, y compris lorsque leur centre se déplace. Le zoom concerne uniquement la carte ; les panneaux HTML conservent leur comportement.

Les événements tactiles natifs du canvas sont capturés avec des écouteurs non passifs. Un doigt reste disponible pour déplacer la carte ou sélectionner une case. Après un pincement, le doigt restant ne provoque ni déplacement imprévu ni sélection ; il faut relever tous les doigts puis commencer un nouveau geste. `touchcancel` et la destruction de la scène nettoient aussi le geste. La molette et les boutons de zoom restent utilisables.

Validation : tests du calcul d’ancrage, des bornes et du cycle tactile ; Chrome avec vrais événements tactiles CDP en formats téléphone 390 × 844 et tablette 1024 × 1366. Cela ne remplace pas un essai sur un appareil iOS physique.

## Médailles

Les nouvelles récompenses combinent 10 silhouettes, les 28 emblèmes existants, 10 couleurs et 6 motifs de ruban, 6 ornements, 6 gemmes et 3 finitions. Un symbole secondaire distingue campagne (lames), expédition terrestre (boussole) et maritime (ancre). Les épithètes du nom varient aussi selon le type d’aventure.

Le bronze, l’argent et l’or restent liés à la difficulté. Les ornements aléatoires sont esthétiques et ne donnent aucun avantage de combat. Le tirage est déterministe à partir de l’identifiant de mission puis stocké avec le trophée : aucune nouvelle apparence à la reconnexion. Les nouveaux champs sont facultatifs, les anciennes médailles conservent leur dessin. Aucune migration de base nécessaire.

Rendu SVG natif du jeu, sans images supplémentaires à charger. Aperçu : `output/mission-medals-variety.png`.
