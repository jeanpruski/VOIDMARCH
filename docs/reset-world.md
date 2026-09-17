# Repartir à zéro sur PlanetHoster

Cette opération supprime tous les comptes (invités et inscrits), sessions, royaumes humains et bots, possessions, archives de joueurs, reçus d’actions et journaux. Les joueurs doivent recréer leur compte. Le schéma PostgreSQL et `.env` sont conservés. La graine `WORLD_SEED` conserve la géographie naturelle, mais toutes les constructions et modifications de terrain sont effacées.

Le monde neuf contient trois bots. La cible du directeur de bots reste maintenant à trois, même sans joueur connecté. L’IA dort sans humain ; les bots vaincus sont remplacés après le délai habituel. Les PNJ de rencontre réapparaissent selon leurs règles normales.

1. Déployer le code contenant `world:reset` (`git pull --ff-only origin master`, puis `npm run build`).
2. **Arrêter l’application VOIDMARCH dans N0C**. Ne pas simplement fermer l’onglet du jeu : les connexions, caches et écritures de l’ancien processus doivent être arrêtés. Ne pas arrêter PostgreSQL ni les autres applications.
3. Dans le terminal SSH :

```bash
source /home/ghmhtrcg/nodevenv/voidmarch-api/VOIDMARCH/24/bin/activate
cd ~/voidmarch-api/VOIDMARCH
npm run world:reset
```

Cette première commande affiche uniquement la base ciblée et les nombres de comptes, sessions et royaumes. **Elle ne supprime rien.**

4. Pour effectuer la suppression et la recréation :

```bash
npm run world:reset -- --confirm-reset-all
```

Une sauvegarde JSON complète des six tables applicatives est écrite dans `.data/backups/before-reset-….json` avant la première suppression. Le fichier est privé (mode 600) et contient des données sensibles de comptes et de sessions : ne pas le publier ni l’ajouter à Git. Il contient les lignes originales, y compris identifiants et dates, pour une restauration technique ; ce n’est pas un dump SQL à importer avec `psql`. Un échec d’écriture ou de synchronisation du fichier interrompt l’opération sans suppression. Toutes les suppressions et la création du nouveau monde font partie d’une même transaction PostgreSQL, protégée par le verrou du monde et des verrous de tables.

5. Attendre le message `Terminé` indiquant zéro session et trois nouveaux bots, puis **redémarrer l’application dans N0C**. Recharger le navigateur ; les anciennes sessions ne fonctionnent plus. Recréer son compte. Ne pas relancer la commande de suppression après la réouverture : elle supprimerait aussi les nouveaux comptes.

Ne pas utiliser `npm run db:seed` pour effacer le jeu : cette commande préserve les données existantes.
