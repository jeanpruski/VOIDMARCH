# Identité des royaumes

Dans le profil, les 28 emblèmes utilisent la couleur principale. Le fond utilise la couleur secondaire. Les motifs diagonal, vertical et horizontal utilisent une troisième couleur ; le motif uni reste bicolore.

Les formes disponibles sont la queue d’hirondelle, l’écu, le carré et le fanion triangulaire. Les mini-drapeaux peuvent suivre la forme principale ou avoir une forme indépendante. Le profil montre la bannière, le socle et le badge de niveau en direct et signale un contraste inférieur à 3:1 entre le logo et son fond.

Sur la carte, les mini-drapeaux des bâtiments et unités affichent l’emblème et le motif. Les socles et halos des héros conservent le contour principal avec un fin liseré secondaire. Les badges de niveau ont le fond secondaire et le contour principal. Le remplissage du territoire reste dans la couleur principale. Les PNJ gardent leur repère distinct.

Les options sont sauvegardées avec les préférences existantes et transmises aux autres joueurs. Les profils anciens utilisent un fond uni et leur couleur secondaire déjà enregistrée. Aucune migration SQL n’est nécessaire.

Le rendu SVG du profil et le rendu Canvas de Phaser partagent géométrie, couleurs et emblèmes. Les textures sont créées de manière synchrone, une par royaume, et remplacées lorsque son dessin change. Les chemins Lucide de `emblem-art.json` se régénèrent avec `node --import tsx scripts/generate-emblem-art.ts` ; leur licence est conservée dans `emblem-art.LICENSE`.

## Création du royaume

L’inscription propose trois étapes : héros et identifiants, royaume et bannière, puis mini-drapeaux. L’aperçu réutilise les illustrations du jeu et montre les hexagones dans la couleur principale, un socle bicolore, le héros, le bâtiment de départ et son drapeau. Les retours entre étapes conservent les choix. La création du compte intervient uniquement à la validation finale.

Six palettes prêtes à l’emploi sont disponibles. « Tout assortir » conserve les modèles du héros et applique la principale à la tête, la couleur de motif à la tenue et la secondaire aux bottes. « Identité aléatoire » renouvelle les modèles et les éléments de la bannière avec une palette cohérente, en conservant le nom saisi. Les invités reçoivent cette identité aléatoire côté serveur.

Le nom du royaume est enregistré séparément du pseudo : le héros et les connexions gardent le pseudo, tandis que le panneau du royaume et le classement affichent le nom choisi. Les anciens comptes sans nom de royaume conservent leur affichage habituel. Le profil permet de changer le nom, la bannière et les drapeaux, mais ne modifie jamais l’apparence du héros. La conversion d’un invité en compte enregistré conserve toute son identité.

Les champs de personnalisation sont validés et limités aux options cosmétiques, sans accès aux réglages de gameplay. Aucune migration de base de données n’est requise.
