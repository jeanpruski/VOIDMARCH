import { migrateArchipelagos } from '@voidmarch/game-rules';
import { Prisma, type PrismaClient } from '@prisma/client';
import { createState, migrateOceans } from '@voidmarch/game-rules';
import { RULES } from '@voidmarch/config';
import { BotDirector } from './bots';
import { initialEvents } from './simulation';
import { ensureHeroes } from './heroes';

export function freshWorld(seed: string, now = Date.now()) {
  const state = createState(seed, now);
  migrateOceans(state);
  migrateArchipelagos(state);
  initialEvents(state, now);
  new BotDirector().reconcile(state, now, 0);
  ensureHeroes(state, now);
  const realms = Object.values(state.realms);
  if (realms.length !== RULES.botCount || realms.some((r) => !r.bot))
    throw new Error(`Le nouveau monde ne contient pas exactement ${RULES.botCount} bots.`);
  return state;
}

export async function resetWorld(
  db: Pick<PrismaClient, '$transaction'>,
  seed: string,
  saveBackup: (backup: unknown) => Promise<string>,
) {
  return db.$transaction(
    async (tx) => {
      // Same lock as all game mutations, followed by table locks for auth writers.
      // The application must still be stopped to disconnect clients and clear caches.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73428001)`;
      await tx.$executeRaw`LOCK TABLE "User", "Session", "PlayerRealmSnapshot", "ActionReceipt", "AuditEvent", "WorldState" IN ACCESS EXCLUSIVE MODE`;
      const [users, sessions, snapshots, actions, audit, worlds] = await Promise.all([
        tx.user.findMany(),
        tx.session.findMany(),
        tx.playerRealmSnapshot.findMany(),
        tx.actionReceipt.findMany(),
        tx.auditEvent.findMany(),
        tx.worldState.findMany(),
      ]);
      const now = Date.now();
      const state = freshWorld(seed, now);
      // A failed or incomplete backup throws before any deletion. Transaction errors
      // roll back every deletion and the new world together.
      const backupPath = await saveBackup({
        format: 'voidmarch-reset-backup',
        version: 1,
        createdAt: new Date(now).toISOString(),
        tables: { users, sessions, snapshots, actions, audit, worlds },
      });
      await tx.session.deleteMany();
      await tx.actionReceipt.deleteMany();
      await tx.playerRealmSnapshot.deleteMany();
      await tx.auditEvent.deleteMany();
      await tx.user.deleteMany();
      await tx.worldState.deleteMany();
      await tx.worldState.create({
        data: {
          id: 'main',
          revision: state.revision,
          data: JSON.parse(JSON.stringify(state)) as Prisma.InputJsonValue,
        },
      });
      return { backupPath, deletedUsers: users.length, bots: Object.values(state.realms).length };
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
}
