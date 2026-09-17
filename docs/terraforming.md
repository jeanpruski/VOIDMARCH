# Terrassement

Le terrassier arcanique se recrute à l’atelier, dans « Civils & soutien », pour 1 PA, 65 or, 35 bois, 30 fer et 20 vivres. Il occupe 5 places de population. C’est un spécialiste civil : 10 PV, attaque 0, défense 2, déplacement 3, vision 4 ; il ne construit pas et ne capture pas.

Sélectionner l’unité, choisir « Terrasser · 2 PA », puis une case surlignée et confirmer. Sa case ou une voisine visible peut être transformée, si elle est neutre ou à son propriétaire, sans bâtiment ni unité ennemie. Chaque transformation coûte 2 PA, 20 bois et 10 fer, y compris avec les PA illimités pour les matériaux. Une plaine existante est refusée sans dépense.

Tous les autres terrains deviennent des plaines, définitivement : forêt, colline, montagne, rivière, marais, ruines, corruption et structure antique. La récolte, la défense du terrain et les restrictions de construction utilisent immédiatement la plaine. Les ressources naturelles précédentes disparaissent sans remboursement. Les vestiges sont supprimés sans trésor : un avertissement apparaît avant confirmation. Les événements indépendants restent inchangés.

Le propriétaire, l’appartenance à une enceinte, les unités et les routes sont conservés. Un pont devient un chemin. Transformer ne capture pas la case et ne contourne ni la portée des bâtisseurs ni les autres conditions de construction. Le terrain est sauvegardé comme les autres modifications du monde, sans migration PostgreSQL.

Le coût, le type d’unité, la proximité, la visibilité et le propriétaire sont revérifiés côté serveur. Toute action refusée laisse le monde intact. La notification et le journal donnent le résultat ; un nuage de chantier accompagne le changement visible.
