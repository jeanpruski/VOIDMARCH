# Équilibrage des aventures et de la progression

Audit du 20 septembre 2026. Mondes synthétiques uniquement, sans accès à la base des joueurs.

## Décisions

- Trophées cumulés conservés : 1 / 5 / 20 / 50 pour les époques 2 / 3 / 4 / 5. Soit 1, puis 4, puis 15, puis 30 victoires supplémentaires en solo. Ils ne sont pas consommés.
- Chaque transition reste volontaire, coûte ses ressources et 5 PA, et exige des infrastructures accessibles à l’époque précédente. Les bâtiments restent plafonnés par l’époque du royaume.
- Bots : progression économique et infrastructures conservées, sans condition de trophées puisqu’ils ne réalisent pas les missions.
- Conquêtes : ancien or et anciens vivres ×5 (escarmouche), ×6 (assaut), ×8 (siège), ×10 (grande campagne). En supplément : bois = 60 % de l’or, pierre = 40 %, fer = 30 %, arrondis à l’entier. Le total toutes ressources dépasse donc ces multiplicateurs.
- Expéditions : toutes les ressources ×5 en reconnaissance, ×7 en récupération, ×10 en extraction. Les modulations existantes par époque, distance, mer et effort restent appliquées. Le trésor occasionnel reste un supplément de 25 % avec 20 % de probabilité.
- Frais d’abandon et de fouille inchangés. Aucun gain à l’acceptation, à l’abandon ou au simple ramassage d’une extraction : son retour reste obligatoire.
- Le butin peut dépasser le stockage. La production positive attend ensuite que la réserve repasse sous le plafond ; l’entretien continue à consommer.
- La médaille est partagée avec les alliés actuels, le butin revient uniquement au commanditaire. Les victoires passées ne sont pas redistribuées à une nouvelle alliance.
- Nouveaux montants sur les nouvelles offres. Les missions déjà acceptées gardent leur devis ; aucun paiement rétroactif ni multiplication à chaque chargement.

## Pourquoi ces choix

Le premier trophée est une étape de découverte, pas un blocage militaire : le héros peut terminer une reconnaissance terrestre sans combat et sans frais de fouille. À 60 cases, cette activité rapporte désormais assez de chacune des cinq ressources pour payer le passage à l’époque 2 ; il reste à construire ses infrastructures et à lancer le passage. Un test exécute cette première victoire avec un héros médiéval et un portefeuille vide.

Les grandes récompenses rendent les activités extérieures réellement utiles, tout en laissant les trophées et les infrastructures déterminer le rythme des époques. Les conquêtes financent maintenant les matériaux aussi bien que le recrutement. L’extraction est mieux payée que la reconnaissance car elle exige le retour du porteur.

Il serait contre-productif de multiplier immédiatement tous les prix pour annuler ces gains. Les coûts de construction, d’amélioration, de recrutement et les statistiques de combat sont conservés après vérification des chaînes d’accès et des contres.

## Exemples générés

Une carte déterministe (`adventures-test`), premier tableau de chaque époque. Les nombres sont des devis garantis, hors trésor surprise et valeur des survivants capturés. Les distances varient suivant les lieux accessibles : ce ne sont pas des moyennes de parties.

| Époque | Or escarmouche | Or assaut |  Or siège | Or reconnaissance | Or récupération | Or extraction |
| ------ | -------------: | --------: | --------: | ----------------: | --------------: | ------------: |
| 1      |            676 |   3 100,5 |  13 072,8 |             3 010 |           5 901 |        13 240 |
| 2      |          2 795 |  12 421,5 |  52 353,6 |             6 145 |          12 040 |        27 030 |
| 3      |          6 344 |  28 294,5 |   118 560 |            31 005 |          49 560 |       136 420 |
| 4      |         12 363 |    50 115 | 217 214,4 |           104 715 |         205 240 |       460 750 |
| 5      |         20 956 |  86 326,5 | 356 865,6 |           286 520 |         561 582 |     1 059 340 |

## Économie et investissements

Le catalogue complet représente, à titre de repère, 2 995 405 or, 1 060 785 bois, 1 185 236 pierre et 1 838 324 fer pour un exemplaire de chaque bâtiment hors remparts, tous au niveau 5. Cela exclut armées, répétitions de bâtiments, entretien et passages d’époque. Ce n’est pas un objectif nécessaire pour chaque joueur.

Le benchmark économique sans butin, avec trophées supposés acquis et temps de voyage exclu, atteint l’époque 5 en 41,3 heures pour le parcours utilisant les producteurs avancés. Le parcours privilégiant davantage les améliorations des premiers producteurs prend 133,8 heures. Ces chiffres mesurent le coût économique, pas la durée attendue d’une partie avec missions.

Avec les nouveaux gains, les ressources seront nettement moins bloquantes pour les joueurs actifs. À haut niveau, une extraction peut financer plusieurs gros investissements ; c’est volontaire. Le principal frein devient alors la collecte des trophées, les trajets et la préparation des infrastructures. Une alliance active raccourcit beaucoup ce temps puisque les médailles sont partagées : 50 victoires de groupe suffisent, pas 50 par membre.

## Contres militaires

20 graines par scénario, initiative alternée et commandes serveur réelles. Groupe entraîné niveau 3 contre élite niveau 5, terrain plat, unités immobiles à portée, sans soin ni manœuvre. Ces scénarios vérifient les spécialisations, sans prétendre couvrir tous les combats.

| Groupe          | Adversaire        | Victoires / 20 |
| --------------- | ----------------- | -------------: |
| 1 × BAZOOKA     | MAUSOLEUM_TANK    |              0 |
| 6 × BAZOOKA     | MAUSOLEUM_TANK    |             20 |
| 6 × RIFLEMAN    | MAUSOLEUM_TANK    |              0 |
| 7 × FLAK_CANNON | GLOCKE_APOCALYPSE |             20 |

Les contres spécialisés battent les élites en nombre, alors que l’infanterie ordinaire ne remplace pas l’antichar. Aucun nouveau gonflement uniforme des statistiques.

## Reproduction et suivi

```bash
node --import tsx scripts/audit-adventure-progression.ts
```

Le script écrit son rapport JSON sur la sortie standard, sans modifier de monde. Tests dédiés : récompenses des cinq époques, devis conservés, abandon, première médaille avec héros, paiement unique, surplus de stockage, partage en alliance et transitions d’époque.

À observer après déploiement : temps médian par époque, ressources réellement dépensées après chaque victoire, fréquence des extractions, écart solo/alliance et pertes des armées. Si les ressources deviennent durablement inutiles, ajuster d’abord les activités concernées ou les dépenses avancées, pas tous les prix du jeu.
