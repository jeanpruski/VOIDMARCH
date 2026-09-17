# Projectiles de combat

Les tirs partent de la case du tireur et atteignent la cible avant de produire leur impact. Chaque unité à distance possède un type d’arme explicite dans `apps/web/src/projectile-profile.ts`.

| Armes | Animation |
| --- | --- |
| Arcs | Flèche avec une légère courbe |
| Arbalètes | Carreau |
| Pistolets, fusils, mitrailleuses | Balle traçante, rafale pour les armes automatiques |
| Canons, chars, Flak, mortiers | Obus ; trajectoire plus haute pour les mortiers |
| Bazookas, batteries de fusées, hélicoptères lance-roquettes | Roquette avec propulsion et fumée |
| Bombardiers et dirigeables | Bombe vers le sol, mitrailleuse contre les aéronefs |
| Siège médiéval | Pierre lancée en cloche |
| Acolytes du Vide et cavaliers spectraux à distance | Orbe occulte |
| Fusils Tesla et templiers gamma | Décharge électrique |
| Dragon occulte | Souffle vert |

Les unités atomiques conservent leur munition et utilisent des lueurs radioactives vertes. Les balles et flèches produisent de petites étincelles ; les munitions explosives produisent un impact plus large. Les effets sont dessinés dans Phaser, sans nouveaux fichiers d’image ni sons.

Le tir local démarre dès l’ordre, sans attendre le réseau. La confirmation serveur ne le rejoue pas. Un refus reçu pendant le trajet l’annule. Les dégâts, la portée, les coûts en PA et les statistiques restent calculés par le serveur ; les projectiles sont visuels.

Le défenseur voit aussi les tirs des nouveaux rapports de combat lorsque les deux extrémités sont visibles. Les positions de tireurs cachés sont retirées des rapports envoyés au navigateur. Aucune animation n’est rejouée à la connexion ou lors d’une révélation du brouillard. Les sauvegardes et anciens rapports sans informations de tir restent compatibles.

L’option de réduction des animations désactive les projectiles et annule ceux en cours. Le nombre d’effets simultanés est plafonné et les objets sont détruits à la fin de leur animation.
