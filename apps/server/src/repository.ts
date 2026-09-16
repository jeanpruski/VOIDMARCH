import { createHash } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { createState } from '@voidmarch/game-rules';
import type { Action } from '@voidmarch/protocol';
import type { ActionResult, GameState } from '@voidmarch/shared';
import { execute, type EngineOptions } from './engine.js';
import { initialEvents } from './simulation.js';
import { migrateResourceWallets } from './migrations.js';
export const prisma = new PrismaClient();
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export class WorldRepository {
  state!: GameState;
  private chain: Promise<unknown> = Promise.resolve();
  constructor(
    private options: EngineOptions,
    private worldId = 'main',
  ) {}
  async init() {
    await this.mutate(() => {});
  }
  async mutate<T>(
    fn: (state: GameState, tx: Prisma.TransactionClient) => T | Promise<T>,
  ): Promise<T> {
    const operation = this.chain
      .then(() =>
        prisma.$transaction(
          async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(73428001)`;
            const existing = await tx.worldState.findUnique({ where: { id: this.worldId } }),
              state = existing
                ? (existing.data as unknown as GameState)
                : createState(process.env.WORLD_SEED ?? 'voidmarch-vhal-01', Date.now());
            migrateResourceWallets(state);
            if (!existing) initialEvents(state, Date.now());
            const previousArchives = Object.fromEntries(
              Object.entries(state.archives).map(([id, s]) => [id, s.createdAt]),
            );
            const result = await fn(state, tx);
            await tx.worldState.upsert({
              where: { id: this.worldId },
              create: { id: this.worldId, revision: state.revision, data: json(state) },
              update: { revision: state.revision, data: json(state) },
            });
            for (const [userId, snapshot] of Object.entries(state.archives))
              if (!snapshot.realm.bot && previousArchives[userId] !== snapshot.createdAt)
                await tx.playerRealmSnapshot.create({
                  data: {
                    userId,
                    version: snapshot.version,
                    realmValue: snapshot.realmValue,
                    data: json(snapshot),
                  },
                });
            return { state, result };
          },
          { timeout: 30_000, maxWait: 30_000 },
        ),
      )
      .then(({ state, result }) => {
        this.state = state;
        return result;
      });
    this.chain = operation.catch(() => {});
    return operation;
  }
  async action(userId: string, action: Action): Promise<ActionResult> {
    return this.mutate(async (s, tx) => {
      const requestHash = createHash('sha256').update(JSON.stringify(action)).digest('hex'),
        previous = await tx.actionReceipt.findUnique({
          where: { userId_actionId: { userId, actionId: action.actionId } },
        });
      if (previous) {
        if (previous.requestHash !== requestHash)
          return {
            actionId: action.actionId,
            accepted: false,
            reason: 'Cet identifiant a déjà été utilisé pour un autre ordre.',
            serverTimestamp: Date.now(),
            newActionPoints: s.realms[userId]?.ap ?? 0,
          };
        return previous.result as unknown as ActionResult;
      }
      const { state, result } = execute(s, userId, action, Date.now(), this.options);
      Object.assign(s, state);
      await tx.actionReceipt.create({
        data: { userId, actionId: action.actionId, requestHash, result: json(result) },
      });
      await tx.auditEvent.create({
        data: {
          userId,
          type: action.type,
          data: json({
            actionId: action.actionId,
            accepted: result.accepted,
            reason: result.reason,
          }),
        },
      });
      return result;
    });
  }
}
