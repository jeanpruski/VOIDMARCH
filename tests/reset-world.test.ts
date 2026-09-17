import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient, Prisma } from '@prisma/client';
import { freshWorld, resetWorld } from '../apps/server/src/reset-world';
import { BotDirector } from '../apps/server/src/bots';

describe('remise à zéro complète', () => {
  it('recrée un monde sans humain ni historique, avec trois bots durables', () => {
    const s = freshWorld('reset-test', 1900000000000);
    expect(Object.values(s.realms)).toHaveLength(3);
    expect(Object.values(s.realms).every((r) => r.bot && !r.temporary)).toBe(true);
    expect(s.archives).toEqual({});
    expect(s.proposals).toEqual({});
    expect(s.treaties).toEqual({});
    expect(s.caravans).toEqual({});
    expect(Object.values(s.units).every((u) => s.realms[u.ownerId]?.bot)).toBe(true);
    expect(Object.values(s.buildings).every((b) => s.realms[b.ownerId]?.bot)).toBe(true);
    for (const humans of [0, 1, 2, 20, 0]) {
      new BotDirector().reconcile(s, 1900000000001, humans);
      expect(Object.values(s.realms)).toHaveLength(3);
    }
  });
  const fixture = () => {
    const calls: string[] = [];
    const model = (name: string) => ({
      findMany: vi.fn(async () => [{ id: name }]),
      deleteMany: vi.fn(async () => {
        calls.push(name);
        return { count: 1 };
      }),
    });
    const tx = {
      $executeRaw: vi.fn(async () => 1),
      user: model('users'),
      session: model('sessions'),
      playerRealmSnapshot: model('snapshots'),
      actionReceipt: model('actions'),
      auditEvent: model('audit'),
      worldState: { ...model('worlds'), create: vi.fn(async (data: unknown) => data) },
    };
    const db = {
      $transaction: async (fn: (tx: Prisma.TransactionClient) => unknown) =>
        fn(tx as unknown as Prisma.TransactionClient),
    } as unknown as PrismaClient;
    return { db, tx, calls };
  };
  it('ne supprime rien si la sauvegarde échoue', async () => {
    const { db, tx, calls } = fixture();
    await expect(
      resetWorld(db, 'reset-test', async () => {
        throw new Error('Disque plein');
      }),
    ).rejects.toThrow('Disque plein');
    expect(calls).toEqual([]);
    expect(tx.worldState.create).not.toHaveBeenCalled();
  });
  it('sauvegarde les six tables avant suppression et remplace le monde dans la transaction', async () => {
    const { db, tx, calls } = fixture();
    let backup: any;
    const result = await resetWorld(db, 'reset-test', async (data) => {
      expect(calls).toEqual([]);
      backup = data;
      calls.push('backup');
      return '.data/backups/test.json';
    });
    expect(Object.keys(backup.tables)).toEqual([
      'users',
      'sessions',
      'snapshots',
      'actions',
      'audit',
      'worlds',
    ]);
    expect(backup.tables.users).toEqual([{ id: 'users' }]);
    expect(calls).toEqual([
      'backup',
      'sessions',
      'actions',
      'snapshots',
      'audit',
      'users',
      'worlds',
    ]);
    expect(result).toEqual({ backupPath: '.data/backups/test.json', deletedUsers: 1, bots: 3 });
    const created = tx.worldState.create.mock.calls[0][0] as {
      data: { id: string; data: { realms: Record<string, { bot: boolean }> } };
    };
    expect(created.data.id).toBe('main');
    expect(Object.values(created.data.data.realms)).toHaveLength(3);
    expect(Object.values(created.data.data.realms).every((r) => r.bot)).toBe(true);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
  });
});
