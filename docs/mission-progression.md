# Progression des missions et offres exceptionnelles

Les deux onglets montrent leur accès normal et les conditions du niveau suivant, avec « Acquis » ou « À faire », le meilleur niveau actuel et les bâtiments à construire. Ces indications reprennent les règles partagées avec le serveur.

- Expéditions : palier de développement du royaume. Pour l’époque 2, atelier 2 et marché 2.
- Conquêtes terrestres : minimum entre ce palier et le meilleur niveau d’un recruteur admissible. La liste des bâtiments comptabilisés est consultable dans le panneau.
- Conquêtes navales : palier de développement plafonné par l’époque des navires de combat présents. Une flotte reste nécessaire.
- Les infrastructures exigées sont cumulatives et doivent être encore debout. Le détail des cinq paliers figure dans [l’équilibrage v0.8](balance-v08.md).

## Tirage exceptionnel

Chaque tableau (conquêtes ou expéditions) effectue **un seul tirage à 5 % par renouvellement**, puis choisit une seule offre admissible. Ce n’est pas 5 % pour chacune des trois offres. Les deux catégories ont leurs propres tirages.

L’offre retenue reçoit exactement **+1 niveau**, au maximum 5. Les autres restent à leur niveau normal. Si toutes les offres sont déjà au niveau 5, aucun défi supérieur n’est proposé. Une mission navale est comparée à son accès naval normal, qui peut être inférieur à celui des conquêtes terrestres.

Le tirage est déterministe pour le joueur et la fenêtre du tableau : changer d’onglet, actualiser la page ou redémarrer le serveur ne relance pas la chance. Modifier les infrastructures ou la flotte ne change pas le résultat du tirage de chance ; cela peut changer les cases admissibles à l’offre exceptionnelle. Terminer/abandonner une mission renouvelle le tableau selon les règles existantes, y compris le repos après abandon sans fonds.

Les cartes et missions en cours affichent « Défi supérieur · Niveau N » ou « Expédition exceptionnelle · Époque N ». Le niveau supérieur s’applique au contenu réel, aux récompenses et aux coûts (abandon et récupération compris). Les sites d’expédition gardent leurs contraintes de biome, d’accès et de visibilité : une offre dont le site devient indisponible peut disparaître, sans nouveau tirage pour la remplacer.

L’offre peut être acceptée sans avoir débloqué son niveau normal, mais reste facultative. L’accomplir ne donne aucun palier automatique. Les possessions ralliées d’une conquête comptent ensuite normalement parmi les infrastructures du royaume.

Le niveau et le marqueur sont enregistrés à l’acceptation. Les anciennes missions restent compatibles et les missions déjà acceptées ne sont pas transformées. Aucun changement de schéma PostgreSQL.

Validation : échantillon déterministe de 10 000 tableaux, une seule offre exceptionnelle, plafonnement au niveau 5, stabilité des offres, acceptation serveur, récompenses, maintien de l’accès normal après victoire et cas naval. Chrome vérifie les deux panneaux, les prérequis acquis/manquants, les badges et le rendu mobile.
