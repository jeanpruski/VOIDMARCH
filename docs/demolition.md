# Démolition des bâtiments

Sélectionner un bâtiment possédé puis **Démolir · 1 PA**. Une confirmation affiche les ressources récupérées et les conséquences ; le bâtiment de la capitale est protégé côté interface et serveur.

- Remboursement intégral du paiement initial de construction, réduction de faction comprise, quels que soient les PV restants. Améliorations et réparations exclues.
- Les nouveaux bâtiments conservent leur coût réellement payé dans la sauvegarde, même après évolution ou capture. Le campement de départ gratuit possède un reçu vide.
- Pour les anciennes sauvegardes sans historique de paiement, le remboursement utilise le coût de niveau 1 du type actuel, avec la réduction de la faction propriétaire. L'historique exact des anciennes constructions et captures n'est pas disponible.
- La case, sa propriété et sa route restent en place. La production, la vision, la population, les prérequis et les possibilités de recrutement sont recalculés depuis les bâtiments restants. Les troupes existantes conservent leurs statistiques et leur entraînement.
- Le remboursement n'est pas tronqué si le stockage est plein ou si un entrepôt disparaît. Les stocks excédentaires sont conservés ; la production positive attend de repasser sous la capacité.
- Le serveur vérifie la propriété, la capitale et les PA avant toute suppression. Un bâtiment déjà supprimé ne peut pas être remboursé une deuxième fois.
- Une notification détaille le gain, le journal conserve l'action et un nuage de poussière accompagne la disparition visible du bâtiment.

Validation : tests du moteur dans `tests/demolition.test.ts`, effets dans `tests/world-effects.test.ts`, confirmation/annulation sur mobile dans `tests/founding.e2e.ts`.
