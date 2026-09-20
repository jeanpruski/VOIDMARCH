# Codes clavier

Sur la carte, sans fenêtre ni champ de saisie actif, taper le code puis **Entrée** :

| Code | Effet |
| --- | --- |
| `aqw` | Active/désactive les PA, le carburant et la pervitine illimités. |
| `zsx` | Active/désactive les flèches et distances vers les capitales ennemies. |
| `edc` | Active/désactive la vigie, pour observer un autre royaume sans agir. |
| `rfv` | Active/désactive le thème local Licornes & paillettes. |

Tous reviennent à OFF au rechargement. Les anciens codes ne sont plus reconnus. Les quatre séquences partagent un seul gestionnaire : aucune activation avant Entrée ni action de jeu pendant la saisie du code. Les initiales A, E et R seules conservent leurs raccourcis d’action après 650 ms ; pour saisir un code, enchaîner ses premières lettres. Après la seconde lettre, une pause de cinq secondes annule la séquence. Un clic, une saisie dans un champ, un changement de focus, Échap ou un raccourci système annulent la séquence. Les répétitions automatiques de touche sont ignorées.

Les valeurs historiques `ADMIN_AP_CODE=ytrez`/`ytreza`, `ADMIN_RADAR_CODE=hgfds`/`hgfdsq` et `ADMIN_VIGIE_CODE=vigie` sont automatiquement converties vers les nouveaux codes lors de la validation serveur. Les anciens mots ne sont pas acceptés. Aucun changement manuel du `.env` n’est donc nécessaire pour les valeurs historiques. Une valeur personnalisée différente reste une surcharge serveur explicite ; pour les raccourcis standards, utiliser les nouvelles valeurs du `.env.example`.

Avec `aqw`, les trois compteurs affichent ∞. Les déplacements individuels et groupés ne débitent aucune réserve, même à stock nul. Désactiver le code ou recharger restitue l’affichage des stocks normaux, sans points artificiels conservés. Les portées, terrains, obstacles et autres coûts de ressources restent applicables.
