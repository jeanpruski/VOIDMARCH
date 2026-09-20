# Expéditions & aventures

Les conquêtes gardent leurs trois offres. Un nouvel onglet propose jusqu’à trois aventures adaptées aux environs, une par objectif : reconnaissance sur place, récupération immédiate, ou extraction avec retour. Les deux catégories partagent la même limite d’une mission active, le renouvellement de dix minutes et l’abandon payant. Les alliés peuvent intervenir ; le commanditaire reçoit le butin et la médaille.

## Les lieux

45 illustrations indépendantes : 25 lieux terrestres et 20 destinations maritimes. Chaque fiche nomme son inspiration et fournit un lien vers sa description ; les récits incertains sont explicitement signalés. Les histoires, coffres et récompenses sont de la fiction. La liste complète et ses références sont dans [expedition-sites.json](expedition-sites.json).

L’île de Jeff reprend Little Saint James avec le pavillon rayé bleu et blanc et une coupole dorée. Les destinations maritimes sont des points d’intérêt illustrés sur l’eau : le bateau approche leur débarcadère et son équipe effectue l’exploration. Le décor de petite île ne transforme pas les cases marines en nouvelles terres constructibles.

## Placement et voyage

Le lieu n’existe qu’après acceptation. Sa distance directe depuis la capitale est strictement comprise entre 60 et 200 hexagones. Le serveur prospecte d’abord des emplacements libres et accessibles, puis choisit les lieux compatibles avec leur milieu. Les offres affichent la distance directe du site repéré ; seules les coordonnées attendent l’acceptation. Le trajet peut être plus long à cause des détours.

Le serveur refuse une zone visible, occupée, revendiquée, brûlée, proche d’une capitale ou d’une autre mission, ou menacée par une frappe nucléaire. Une recherche de chemin bornée vérifie un accès terrestre depuis la capitale, ou maritime depuis un navire du joueur. Une aventure maritime nécessite donc une flotte existante. Une recherche sans résultat refuse l’acceptation sans frais ni modifications du monde. Les lieux n’écrasent aucun terrain ni bâtiment existant et n’emploient pas de nouvelle génération de carte.

Les aventures terrestres se visitent avec une unité au sol ; les maritimes avec un navire. Être à une case du lieu et le voir est nécessaire. Examiner ou livrer coûte 1 PA. Une récupération coûte 3 PA et 40 / 120 / 400 / 1 000 / 2 500 vivres selon son palier, payés par le joueur qui interagit. Aucun combat n’est imposé par la garnison de ces premières aventures, mais les déplacements suivent toutes les règles normales du monde.

## Extraction et coopération

La récupération d’un objet d’extraction ne verse aucun butin. L’objet reste attaché à son porteur : s’il embarque, le véhicule transporte aussi l’objet. La livraison se fait à une case d’un camp de départ, village ou port du commanditaire, par le porteur ou son transport. Une unité étrangère ne peut pas revendiquer la quête. Un allié peut explorer et livrer ; une rupture d’alliance retire son droit à terminer.

La perte du porteur remet la quête en phase de récupération au prochain rapprochement de l’état des missions. Il est possible de revenir sur le site ; le butin ne peut être attribué deux fois. L’abandon supprime la quête et son objet, conserve les troupes et débite les ressources affichées. Si le stock est insuffisant, seuls les fonds disponibles sont payés et les nouvelles missions sont suspendues pendant 5 à 30 minutes, proportionnellement au manque. Aucune dette ; le délai persiste après reconnexion. La défaite du commanditaire applique le nettoyage normal des missions.

## Récompenses

Le devis dépend du palier de développement réel ([règles v0.8](balance-v08.md)), de la distance réelle, de l’objectif et du milieu. Base or par palier : 300 / 900 / 3 000 / 9 000 / 24 000, multipliée par `0,65 + distance/150`, puis ×1,4 pour récupération ou ×2,2 pour extraction, puis ×1,25 en mer. Les ratios bois/pierre/fer/vivres sont 0,8 / 0,65 / 0,5 / 0,9 de l’or. Les quantités promises restent enregistrées à l’acceptation, y compris pour les missions anciennes. L’abandon demande un cinquième de l’or et des vivres garantis.

Le butin porte sur les cinq ressources, est payé intégralement au-delà du plafond de production passive, et a 20 % de chances d’être augmenté de 25 %. Ce tirage dépend de l’identifiant unique de la quête : il ne change pas au rechargement. Une médaille conserve le lieu, l’objectif, la distance, les participants et le butin réellement reçu. Le carnet montre les 45 destinations et l’historique des réussites ; les médailles rejoignent également la salle des trophées existante.

## Images et vérifications

Outil : **imagegen intégré**, une génération indépendante par lieu, transparence conservée. Les 45 fichiers sont dans `apps/web/public/assets/expeditions/`. Prompts complets : [expedition-art-prompts.json](expedition-art-prompts.json). Les sources sont conservées dans le répertoire de génération Codex ; le jeu utilise uniquement les copies du dépôt. Les illustrations du plateau se chargent à la demande, après découverte du site, sans ralentir son chargement initial.

`tests/expeditions.test.ts` contrôle le catalogue, les offres, le placement, les PA, les restrictions, les récompenses uniques, le transport, les alliances, la perte du porteur et l’abandon. `tests/expeditions.e2e.ts` vérifie une extraction de l’île de Jeff dans Chrome, le carnet et la transparence des 45 images. Les données s’enregistrent dans l’état JSON existant : aucune migration SQL ni remise à zéro des joueurs.

## Lieux sur trois hexagones

Tous les lieux d’expédition utilisent une empreinte compacte de trois hexagones adjacents en triangle. L’orientation est choisie pendant la prospection et enregistrée avec la mission à l’acceptation ; les anciennes missions sans orientation ont une orientation déterministe fondée sur leur lieu. L’illustration reste droite, centrée sur l’ensemble, avec un affichage de 256 px au lieu de 144 px. Un contour extérieur discret indique l’emprise, sans traits entre les trois cases. Les unités terrestres, navales et aériennes, leurs socles et les halos des héros/PNJ restent au-dessus de l’illustration, y compris pendant les déplacements.

L’interaction fonctionne sur l’une des trois cases ou à une case de n’importe quel bord. La vérification de trajet vise elle aussi l’ensemble du lieu. Les trois cases doivent respecter la distance de 60 à 200 hexagones et être compatibles avec le type terrestre/maritime. La zone est vérifiée libre avant l’acceptation : propriété, bâtiments, routes, unités, événements et sites existants. Les bâtiments, routes et terrassements ne peuvent pas être créés sur cette emprise pendant la mission.

Un seul objectif, une seule récompense et une seule médaille sont conservés. Aucune modification du terrain ou des règles de déplacement : les îles sont des lieux d’expédition explorés depuis un navire, pas de nouvelles terres constructibles. Les illustrations existantes sont réutilisées, sans nouvel atlas à charger. Six exemples du rendu réel sont enregistrés dans `output/expedition-three-hex-examples.png` et individuellement dans `output/expedition-three-hex-*.png`.

## Offres adaptées aux régions voisines

`EXPEDITION_HABITATS` définit le milieu des 45 lieux. Gizeh, Zone 51 et Baïkonour exigent le désert ; Svalbard exige la neige et un relief proche ; les complexes boisés exigent une forêt, les mines et bunkers souterrains un relief, Hoover une rivière dans une région désertique. Les destinations maritimes ont aussi des climats compatibles : les îles avec palmiers ne sont pas proposées dans la neige. Ces contraintes sont des choix du jeu pour les illustrations réinventées.

Les trois cases et le voisinage de rayon 2 doivent appartenir à un milieu compatible ; une contribution visuelle d’au moins 15 % d’un biome incompatible exclut aussi la transition. Le relief/forêt/rivière requis est recherché dans un rayon de 3. Aucune case n’est repeinte ni transformée pour faire apparaître un lieu.

Une prospection déterministe bornée examine la géographie entre 60 et 200 cases et vérifie les accès avant de proposer les missions. Les emplacements restent privés, dans un cache serveur borné à 128 tableaux. Les offres sont stables pendant leur fenêtre de dix minutes, sauf si leur emplacement devient visible, occupé ou incompatible ; elles sont alors retirées. Une prospection sans résultat est réessayée après 30 secondes. Une flotte nouvellement créée permet immédiatement de rechercher des propositions maritimes. Une mission sans choix disponible affiche une explication, sans proposer de lieu impossible.

Les emplacements et leur accès sont à nouveau vérifiés à l’acceptation. Un site devenu indisponible est refusé gratuitement, jamais déplacé arbitrairement ou remplacé par un autre lieu. Les expéditions déjà acceptées conservent leur position et leur objectif.

`tests/expedition-habitats.test.ts` couvre les quatre climats, les alentours, les besoins de relief, l’absence/présence de flotte, l’invalidation d’un site occupé, l’absence de coordonnées publiques et la réutilisation de la prospection après copie de l’état.

## Lieux mystérieux : vingt destinations supplémentaires

Dix terrestres : Houska, Hoer Verde, Hoerengracht, Leap, la Tour de Londres, Port Arthur, Waverly Hills, Édimbourg, Frochot et le cimetière de l’Isle of the Dead. Dix maritimes : mer du Diable, Baychimo, Chuuk, Skeleton Coast, Yonaguni, anomalie baltique, Joyita, Mary Celeste, Ourang Medan et Dahab.

Les nouveaux lieux utilisent les mêmes trois objectifs, les mêmes paliers, le butin annoncé, les trophées et l’historique personnel. Les destinations déjà acceptées sont conservées ; les nouvelles entrent dans les prochains tirages. Le total du carnet est calculé depuis le catalogue.

Hoer Verde est une légende non localisée avec certitude. « Hoerengracht » désigne ici un quartier fictif inspiré des canaux d’Amsterdam, pas un quartier historique maudit attesté. L’Ourang Medan est présenté comme une légende dont le navire n’est pas confirmé. Les phénomènes occultes des autres sites appartiennent au récit du jeu. L’île-cimetière reste un objectif terrestre conformément au classement demandé : son décor est adapté au littoral, avec une approche à pied vérifiée.

Le Baychimo exige une mer enneigée ; Skeleton Coast et Dahab une mer désertique voisine d’une plage. Les sites tropicaux refusent la neige. Houska et Édimbourg exigent un relief, Hoer Verde une forêt, Port Arthur et le cimetière un littoral, le quartier de canaux de l’eau à proximité. Aucun de ces tirages ne transforme le terrain pour forcer l’apparition d’un lieu.

### Sol sous les illustrations

Les lieux d’expédition masquent les décors des cases recouvertes par leur illustration, y compris lorsqu’elle déborde de ses trois cases fonctionnelles : arbres, rochers, montagnes, dunes et autres ornements. Le fond du biome, les couleurs de territoire, la grille et les routes restent visibles. Le terrain, ses ressources et ses règles de déplacement ne changent pas. Ce dégagement visuel concerne aussi les sites alliés connus et disparaît avec le lieu ; les unités restent dessinées au-dessus.
