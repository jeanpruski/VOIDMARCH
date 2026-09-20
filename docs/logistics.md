# Centre logistique : convertir les ressources personnelles en PA

Construire un **marché** et un **grenier**, puis le **Centre logistique** dans « Savoir & logistique ». Il se construit sur plaine, colline ou ruines, avec les règles ordinaires de bâtisseur et de territoire.

Sélectionner le centre → **Produire des PA** → choisir la recette et **1, 5 ou 10 PA** → vérifier le devis et confirmer. Aucune consommation de PA pour effectuer l’échange, même lorsque la réserve est vide. Les ressources sont réellement débitées côté serveur et une notification confirme le gain.

| Recette | Centre / développement requis | Tarif de base pour 1 PA, avant réduction |
| --- | --- | --- |
| Ravitaillement | 1 / 1 | 100 vivres + 40 or |
| Mobilisation industrielle | 2 / 2 | 65 bois + 55 pierre + 40 fer |
| Surcharge occulte | 4 / 4 | 50 vivres + 20 or + 25 bois + 25 pierre + 65 fer |

Les recettes permettent d’utiliser des surplus différents. La surcharge consomme davantage de matériaux au total, mais préserve davantage l’or et les vivres. Les trois formats d’achat sont disponibles pour chaque recette.

Le centre possède cinq niveaux et cinq illustrations distinctes. Chaque niveau au-delà du premier réduit les tarifs de 5 points de pourcentage, jusqu’à 20 %. Le prix par PA est arrondi à l’entier supérieur avant multiplication par la quantité : fractionner les achats ne fait pas économiser de ressources. Les améliorations utilisent les coûts progressifs ordinaires et demandent le développement correspondant à leur niveau ; les déblocages et la réduction apparaissent dans leur aperçu.

## Quota partagé et progression

Le royaume peut convertir **10 / 15 / 20 / 25 / 30 PA** sur les **60 dernières minutes**, selon son développement 1 à 5. Cela représente un complément de 8 à 25 % aux 120 PA/h de régénération naturelle, lorsque celle-ci fonctionne en continu.

Chaque lot libère ses places exactement une heure après son achat. Il n’existe pas de remise à zéro à heure fixe. L’interface indique les places restantes et le prochain déblocage. Le quota n’est pas multiplié par le nombre de centres ; reconstruire, changer de centre ou se reconnecter ne l’efface pas. Une régression du développement peut réduire le quota, sans effacer les achats déjà effectués.

Les PA obtenus peuvent dépasser 20. La régénération naturelle reste suspendue à partir de 20, selon la règle existante des récompenses. Les achats, leur prix et le quota sont validés par le serveur, puis enregistrés avec l’état du royaume ; les reçus d’action existants protègent les retransmissions réseau. Un refus ne débite aucune ressource.

## Assets et validation

Illustrations produites avec le générateur intégré imagegen, prompts conservés dans `docs/logistics-art-prompts.json`. Fichiers : `apps/web/public/assets/logistics-center-1.png` à `logistics-center-5.png`. Alpha transparent conservé ; niveaux 2–5 normalisés et chargés à la demande dans l’atlas des évolutions.

Tests dédiés : paiement exact à 0 PA, surplus, verrous de développement, quota glissant partagé après sérialisation et reconstruction, refus sans mutation, accès aux bâtiments, validation des quantités, tarifs sans arbitrage entre lots. Le test navigateur couvre l’échange réel via le moteur, le panneau sur mobile et l’alpha des cinq illustrations.

Pas de migration SQL, de réinitialisation du monde ni de nouvelle variable d’environnement. L’historique optionnel `Realm.logisticsReceipts` est ajouté au JSON du royaume au premier échange.
