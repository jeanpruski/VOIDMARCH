# Visibilité de la radioactivité

Le rendu utilise exclusivement les cases irradiées transmises par le serveur. L’intensité, la propagation, les dégâts et le confinement restent inchangés.

- Voile vert au sol de 23 à 33 % d’opacité selon l’intensité, contour vert fin.
- Pulsation douce sur quatre secondes, brume basse et quelques particules ascendantes.
- Calques 3300 à 3302, au-dessus du territoire mais sous les sélections, bâtiments, unités et drapeaux.
- Seules les cases actuellement visibles et dans le cadrage sont dessinées. Les cellules cachées par le brouillard ne sont jamais révélées.
- Au maximum 80 brumes et 40 particules visibles, réutilisées sans créer d’objets à chaque image ; mise à jour avec les effets ambiants, au maximum 20 fois par seconde.
- Le mode animations réduites conserve le voile et la brume fixes sans particules. La vue stratégique masque ces effets.
- Une case nettoyée perd immédiatement son effet au prochain état du monde reçu.

La brume est une texture procédurale Canvas partagée ; aucune image distante ni ressource supplémentaire à télécharger.
