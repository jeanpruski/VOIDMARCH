import { mkdir, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { RULES } from '@voidmarch/config';
import { resetWorld } from './reset-world';

const args = process.argv.slice(2);
const apply = args.length === 1 && args[0] === '--confirm-reset-all';
if (args.length && !apply) throw new Error('Usage : npm run world:reset [-- --confirm-reset-all]');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant dans .env.');
const target = new URL(process.env.DATABASE_URL);
console.log(`Base ciblée : ${target.hostname}:${target.port || '5432'}${target.pathname}`);
const db = new PrismaClient();
try {
  if (!apply) {
    const [users, sessions, worlds] = await Promise.all([
      db.user.count(),
      db.session.count(),
      db.worldState.findMany({ select: { id: true, data: true } }),
    ]);
    const realms = worlds.flatMap((w) => Object.values((w.data as any)?.realms ?? {})) as {
      bot?: boolean;
    }[];
    console.log(
      `Aperçu uniquement : ${users} comptes, ${sessions} sessions, ${realms.length} royaumes dont ${realms.filter((r) => r.bot).length} bots.`,
    );
    console.log(
      `La remise à zéro supprimera TOUS les comptes, sessions, royaumes, archives, ordres et journaux. Elle créera un monde neuf avec ${RULES.botCount} bots.`,
    );
    console.log(
      'Aucune donnée modifiée. Arrêtez VOIDMARCH dans N0C avant de lancer : npm run world:reset -- --confirm-reset-all',
    );
  } else {
    const result = await resetWorld(
      db,
      process.env.WORLD_SEED ?? 'voidmarch-vhal-01',
      async (backup) => {
        const directory = resolve('.data/backups');
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const path = resolve(directory, `before-reset-${Date.now()}-${randomUUID()}.json`);
        const file = await open(path, 'wx', 0o600);
        try {
          await file.writeFile(JSON.stringify(backup));
          await file.sync();
        } finally {
          await file.close();
        }
        return path;
      },
    );
    console.log(`Sauvegarde complète : ${result.backupPath}`);
    console.log(
      `Terminé : ${result.deletedUsers} comptes supprimés, 0 session, ${result.bots} nouveaux bots. Redémarrez VOIDMARCH dans N0C.`,
    );
  }
} finally {
  await db.$disconnect();
}
