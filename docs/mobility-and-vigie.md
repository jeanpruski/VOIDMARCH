# Carburant, pervitine et vigie

## Réserves de déplacement

Deux réserves personnelles persistantes, initialement vides, avec un plafond de **10 à 50 points chacune**, selon le meilleur producteur en activité de leur filière. Elles ne se régénèrent pas automatiquement et ne sont pas des ressources échangeables. Les comptes existants n’exigent aucune migration SQL.

Un déplacement normalement payant consomme d’abord **un point de la réserve adaptée**, puis un PA si elle est vide. Les distances maximales, terrains impraticables, remparts et collisions restent inchangés.

- Carburant : unités dont le profil est mécanique, dont motos, véhicules, avions, dirigeables motorisés et navires motorisés.
- Pervitine : unités terrestres non mécaniques, dont fantassins, bâtisseurs, cavaliers et héros.
- PA : volants organiques (dont dragons) et navires à voiles ou à rames.
- Routes et enceintes fermées : toujours gratuits, aucune réserve consommée.
- Transport chargé : seul le transport paie ; les passagers ne sont pas facturés.
- Groupe : calcul dans l’ordre réel d’exécution, réserves partagées puis PA. Si le solde est insuffisant ou si un trajet est invalide, aucune unité ne part et aucun point n’est débité.

Sélectionner le bâtiment puis « Produire carburant » ou « Produire pervitine ». Choix de **1, 5 ou 10 points**, devis affiché avant paiement, quantités manquantes en rouge. Production instantanée sans coût en PA ; un lot qui dépasserait le stockage ou le quota horaire est refusé sans paiement partiel.

| Réserve   | Production accessible | Production spécialisée | Prix accessible par point au niveau 1 |
| --------- | --------------------- | ---------------------- | ------------------------------------- |
| Carburant | Atelier               | Raffinerie             | 30 or + 50 bois + 20 fer              |
| Pervitine | Monastère             | Hôpital de campagne    | 25 or + 75 vivres                     |

Les tarifs de niveau 1 sont multipliés par 2,5 par rapport à la première version. Les bâtiments spécialisés conservent leur remise de 20 % : **24 or + 40 bois + 16 fer** par carburant à la raffinerie ; **20 or + 60 vivres** par pervitine à l’hôpital de campagne.

| Niveau du meilleur producteur | Stockage | Quota par heure | Majoration du prix de base |
| ----------------------------- | -------- | --------------- | -------------------------- |
| 1                             | 10       | 10              | 0 %                        |
| 2                             | 20       | 14              | 15 %                       |
| 3                             | 30       | 18              | 30 %                       |
| 4                             | 40       | 22              | 50 %                       |
| 5                             | 50       | 25              | 75 %                       |

**Chaque filière a son propre niveau, son propre stock et son propre quota**, partagés entre tous les bâtiments concernés du royaume. Le meilleur atelier ou la meilleure raffinerie fixe le niveau du carburant ; le meilleur monastère ou hôpital fixe celui de la pervitine. Le niveau retenu détermine aussi le prix dans les petits producteurs. Les prix sont arrondis à la ressource supérieure par point avant multiplication par le lot ; fractionner ne procure aucun avantage.

Le quota porte sur les **60 dernières minutes** : chaque lot libère ses places une heure après production. Il n’est ni cumulé entre bâtiments, ni remis à zéro par une dépense, une reconnexion, une sauvegarde, une démolition ou une amélioration. Améliorer augmente la limite mais conserve les productions récentes. Un compte à rebours affiche le prochain déblocage ; il n’y a pas de production passive.

Si le meilleur producteur est détruit, le niveau est recalculé avec les producteurs encore en activité. Les points déjà stockés au-delà du nouveau plafond sont conservés et utilisables, mais on ne peut pas en produire davantage avant d’être sous le plafond. Les anciennes réserves bénéficient de la même règle, sans migration destructive. Les reçus persistants `Realm.mobilityReceipts` sont ajoutés au premier achat, séparément de ceux des PA.

Les panneaux de production et d’amélioration présentent le niveau effectif, le stockage, le quota et les coûts correspondants.

Les réserves s’affichent dans l’interface, y compris sur petit écran. Le bouton de déplacement individuel indique la ressource qui sera utilisée ; la confirmation groupée détaille carburant, pervitine et PA. Les attaques, constructions, embarquements et autres actions conservent leur coût en PA. Le code de PA illimités ne supprime pas la consommation prioritaire des réserves.

## Vigie

Sur la carte, hors champ de saisie et fenêtre modale : taper **edc**, puis **Entrée**. La barre d’observation propose les autres royaumes actifs, y compris les bots. Sélectionner un royaume centre la caméra sur sa capitale.

L’observation révèle temporairement sa visibilité actuelle, ses bâtiments et ses unités sur la carte. La barre indique le nombre de bâtiments, les unités visibles et le développement ; sélectionner une figurine ou un bâtiment affiche son nom, ses PV et son niveau s’il s’agit d’un bâtiment. Les ressources privées, passagers cachés et données de compte de l’adversaire ne sont pas transmis.

Il s’agit d’une vue en lecture seule : **tous les ordres sont suspendus pendant l’observation**, côté client et serveur. La vision réelle utilisée par les combats, l’exploration enregistrée et la caméra sauvegardée du joueur ne sont pas modifiées. « Retour à mon royaume » termine l’observation ; « Fermer vigie » désactive le mode. Un rechargement le désactive aussi ; une reconnexion réseau brève dans la même page le conserve, comme les autres codes.

Le code est accessible à tout joueur qui le connaît, comme les codes précédents. Valeur serveur par défaut `edc` ; une ancienne valeur `ADMIN_VIGIE_CODE=vigie` est automatiquement interprétée comme `edc`. Aucun changement d’environnement nécessaire pour utiliser la valeur par défaut. Activer exige le code ; fermer son propre mode ne le demande pas de nouveau. Les requêtes sont authentifiées et limitées en fréquence.

Validation : tests des paiements et prédictions, groupes mixtes, plafond, transport chargé, brouillard, droits d’observation et réinitialisation de session ; parcours navigateur de production, mouvement, observation, retour et rechargement sur écran mobile.

## Mode illimité

`aqw` + Entrée rend les PA, le carburant et la pervitine illimités ensemble. Aucun débit de réserve pour les déplacements, y compris les groupes mixtes. Les compteurs affichent ∞ et les producteurs indiquent qu’aucune conversion n’est nécessaire. Les stocks enregistrés ne sont pas remplis ni modifiés par ce mode : désactivation ou rechargement ramènent les réserves normales. La portée et les obstacles ne changent pas.
