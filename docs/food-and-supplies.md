# Vivres et provisions de campagne

Les vivres alimentent l'entretien des habitants et des armées, le recrutement,
les soins et une préparation facultative des campagnes. Les producteurs suivent la progression économique v0.8. Aucune mort, baisse de PV ou perte de provisions n'est causée par
une pénurie ou par le temps écoulé.

## Entretien

L'entretien dépend de l'effectif, de l'époque et du rôle. Les montures et les
créatures volantes mangent davantage ; les véhicules nourrissent leur équipage.
Les passagers sont comptés une seule fois, embarqués ou à pied. Héros : gratuit ;
bâtisseurs et soigneurs : 0,25 vivres/min comme auparavant. Les valeurs affichées
utilisent le formateur existant, à une décimale maximum.

La production et l'entretien suivent les règles de présence existantes : arrêt
à la déconnexion explicite ou à la fin du délai de grâce en cas de perte de
connexion. Aucun nouvel entretien permanent hors ligne.

| Unité             | Vivres/min | Recharge de 8 provisions |
| ----------------- | ---------: | -----------------------: |
| Fantassin         |        0,8 |                      120 |
| Chevalier         |          2 |                      232 |
| Fusilier          |        1,6 |                      296 |
| Char              |          2 |                      384 |
| Dragon occulte    |        5,9 |                      688 |
| Glocke Apocalypse |        6,8 |                    1 424 |

L'économie affiche production brute, habitants, troupes et équipages. En cas de
déficit, l'autonomie estimée correspond à des minutes de présence au rythme
courant, hors achats et changements d'effectifs.

## Provisions

Sélectionner une troupe de combat ou un groupe, puis ouvrir **Provisions**.
Le ravitaillement remplit une réserve de huit charges : 1 PA par unité, plus les
vivres des seules charges manquantes. Les groupes sont limités à dix unités ;
l'ordre est entièrement annulé si une des unités ne peut pas être ravitaillée.

Accès à deux cases au plus d'un campement, avant-poste, village, grenier,
entrepôt, dépôt ferroviaire ou hôpital de campagne ; à une case d'un transport.
Les dépôts et transports alliés conviennent aussi. Le demandeur paie ses propres
vivres. Les passagers doivent débarquer pour agir.

- Une attaque consomme une charge et bénéficie de **+10 % d'attaque** (unités et
  bâtiments), avant les autres règles de combat. Aucun bonus de défense ou PV.
- Une réparation / un soin consomme une charge et restaure jusqu'à **75 % des PV
  maximum** hors combat, contre 50 % sans provisions, limité aux blessures réelles. Sous le feu : 20 % contre 15 %, avec 30 secondes entre deux soins.
- Marche, attente et reconnexion ne consomment aucune charge.
- À zéro charge, les statistiques et soins ordinaires continuent de fonctionner.

Une charge coûte `ceil(entretien alimentaire × 6 + population × 1,5 + tier² × 2)`.
Les héros, PNJ et bâtisseurs n'emportent pas de provisions. Le bonus ne modifie
pas l'entraînement permanent et ne crée pas de soins gratuits lors d'une recharge.

## Soins et réparations

1 PA par action. Pour une unité, 10 or plus :

- vivant : `max(10, ceil(coût de recrutement en vivres × 0,30 × PV restaurés / PV max))` ;
- mécanique : `max(10, ceil(coût de recrutement en fer × 0,18 × PV restaurés / PV max))` ;
- bâtiment : 20 % de son investissement nominal (construction + améliorations), proportionnellement aux PV restaurés, dans ses propres matériaux ; minimum 5 or et arrondis au supérieur. Les murs évolués utilisent le coût du matériau actuel.

Pendant les 90 secondes suivant un dégât, un bâtiment ne récupère que 10 % de ses PV maximum par réparation, avec 30 secondes entre deux réparations ; hors combat, 50 %. Une amélioration est interdite pendant ces 90 secondes afin de ne pas contourner cette limite.

Après épuisement des vivres, la pénurie compte uniquement le temps où l’économie est active : −10 % d’attaque après 10 minutes, −20 % après 30 minutes. Elle touche aussi les passagers, recrues et unités ralliées. Héros, PNJ, bâtisseurs et unités sans attaque sont exemptés. Avec une réserve suffisante ou une production couvrant l’entretien, une minute active efface deux minutes de pénurie (cumul plafonné à 45 minutes). Aucun dégât, décès, perte de mouvement ou dette hors ligne.

Les sorts de soin existants gardent leurs règles. Les coûts exacts et les PV
restaurés sont affichés avant l'action ; les bots utilisent aussi le nouveau
devis de réparation pour vérifier leurs moyens.

## Vérifications d'équilibrage

Ordres de grandeur, hors habitants et autres sources de nourriture :

- 20 fantassins + 10 chevaliers : 36 vivres/min ; cinq fermes niveau 1 produisent 40.
- 20 fusiliers + 20 chars : 72 vivres/min ; trois fermes niveau 3 produisent 72.
- 10 dragons + 20 Glocke Apocalypse : 195 vivres/min ; cinq fermes niveau 5 produisent 240.

Les tests couvrent la facturation atomique, les alliés, les transports, les combats,
les soins, la sauvegarde, les pénuries, les prédictions du client et le parcours
du navigateur. Les données existantes restent compatibles : `provisions` absent
signifie zéro. Aucun changement du schéma SQL.
