# Développement des bots

Les bots conservent leur rythme de 3 à 10 décisions par cycle d'environ dix
minutes, et restent inactifs lorsqu'aucun humain n'est connecté. Le correctif
s'applique aux royaumes existants dès leur prochain cycle après déploiement.
Aucune réinitialisation et aucune attribution gratuite de ressources.

Le planificateur privilégie désormais :

- un bâtisseur, puis jusqu'à trois selon la taille de la cité ; le paysan perdu
  est remplacé en utilisant la même règle de recrutement gratuit que les joueurs ;
- les filières bois, pierre, fer et nourriture, puis les ressources déficitaires ;
- les logements pour conserver des habitants disponibles, et les entrepôts avant
  les investissements dépassant le plafond de stockage ;
- les améliorations des producteurs et des bâtiments militaires, puis les
  prérequis des filières industrielles et occultes ;
- des recrues compatibles avec le bâtiment, son niveau et les ressources,
  privilégiant les époques récemment débloquées. Une partie du budget du prochain
  chantier est réservée au développement.

Les bâtisseurs choisissent des chantiers visibles, autorisés et compatibles avec
le terrain. Ils s'en approchent par un chemin praticable et construisent à une
case maximum. La récolte respecte les ressources naturelles ; elle sert surtout
à débloquer une filière sans production suffisante. Ils ne partent plus en
promenade avec les soldats. La capture de terres neutres est limitée aux abords
utiles des bâtiments, pour éviter les dépenses territoriales sans fin.

Les ordres passent toujours par le moteur normal : coûts, population, PA,
prérequis, occupation et obstacles. Un ordre refusé n'est plus répété dans la
même série ; le bot peut essayer une autre décision dans son budget restant.

## Vérification

`node --import tsx scripts/simulate-bots.ts` simule trois cartes, six heures de
présence continue chacune, avec la production et les dépenses réelles. Le nombre
de décisions varie entre 3 et 10 par cycle. Ce scénario mesure le développement
en paix, sans guerre extérieure ni récompenses d'événements.

Les essais ont produit environ 19–21 bâtiments contre 7 au départ, deux ou trois
bâtisseurs et une caserne niveau 3. Le scénario de douze heures vérifie également
une caserne au moins niveau 4 et des recrues d'époque plus avancée. Le résultat
exact dépend du terrain et de l'ordre des décisions.

Les tests couvrent aussi le remplacement d'un paysan avec un stock vide, un
départ avec un seul campement, le chantier neutre sur montagne, les restrictions
de recrutement, le stockage, le rythme d'action et le sommeil sans joueurs.

## Ajustement v0.8

Les bots suivent les mêmes jalons technologiques que les joueurs et réservent leur investissement pour les infrastructures manquantes. Les producteurs sont améliorés selon le revenu réellement nécessaire, pour limiter le surinvestissement alimentaire. Les mouvements militaires servent à révéler des cases, rejoindre un adversaire proche, revendiquer les abords utiles ou revenir vers la capitale. Les réparations respectent le délai sous le feu.

Trois essais défensifs sur 24 heures actives donnent 39 bâtiments, trois bâtisseurs et aucun ordre rejeté. Le surplus de nourriture final est de 30,4–34,9/min, contre environ 300/min dans l’ancien essai à douze heures. La majorité des ordres reste consacrée à la marche et à l’exploration ; les simulations ne couvrent pas une guerre prolongée entre humains.
