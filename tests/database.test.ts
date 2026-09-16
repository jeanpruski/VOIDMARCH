import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { WorldRepository, prisma } from '../apps/server/src/repository';
import { addPlayer, addBuilding, defaultOptions } from '../apps/server/src/engine';
import { writeTile, observe } from '@voidmarch/game-rules';
import type { Action } from '@voidmarch/protocol';
const enabled = process.env.TEST_DATABASE === 'true';
describe.skipIf(!enabled)('transactions PostgreSQL réelles', () => {
  const worldId = `test-${randomUUID()}`,
    ids = [randomUUID(), randomUUID()],
    repoA = new WorldRepository(defaultOptions, worldId),
    repoB = new WorldRepository(defaultOptions, worldId);
  const command = (type: Action['type'], actorId: string, payload: unknown) =>
    ({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: Date.now() }) as Action;
  beforeAll(async () => {
    for (const [i, id] of ids.entries())
      await prisma.user.create({
        data: { id, username: `DB Test ${i}`, usernameNormalized: `db-${id}` },
      });
    await repoA.init();
    await repoA.mutate((s) => {
      for (const [i, id] of ids.entries()) {
        const r = addPlayer(s, id, `Test ${i}`, 'ASH', Date.now(), 'established');
        r.protectedUntil = 0;
      }
    });
    await repoB.init();
  });
  afterAll(async () => {
    await prisma.worldState.deleteMany({ where: { id: worldId } });
    await prisma.auditEvent.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });
  it('un recrutement rare concurrent ne tire le bonus qu’une fois et le conserve au redémarrage', async () => {
    const id = ids[0];
    let draws = 0,
      campId = '';
    const options = {
      ...defaultOptions,
      recruitBonus: () => {
        draws++;
        return 25;
      },
    };
    const a = new WorldRepository(options, worldId),
      b = new WorldRepository(options, worldId);
    await a.init();
    await b.init();
    await a.mutate((s) => {
      for (const unit of Object.values(s.units))
        if (unit.ownerId === id && unit.kind === 'PEASANT') delete s.units[unit.id];
      writeTile(s, { q: 10, r: 10 }, { terrain: 'PLAIN', ownerId: id, buildingId: undefined });
      campId = addBuilding(s, s.realms[id], { q: 10, r: 10 }, 'CAMP', Date.now()).id;
      s.realms[id].ap = 15;
      s.realms[id].apAt = Date.now();
    });
    const recruit = command('RECRUIT', campId, { kind: 'PEASANT' });
    const results = await Promise.all([a.action(id, recruit), b.action(id, recruit)]);
    expect(results.every((r) => r.accepted)).toBe(true);
    expect(results[0]).toEqual(results[1]);
    expect(draws).toBe(1);
    const restarted = new WorldRepository(defaultOptions, worldId);
    await restarted.init();
    const units = Object.values(restarted.state.units).filter(
      (u) => u.ownerId === id && u.kind === 'PEASANT',
    );
    expect(units).toHaveLength(1);
    expect(units[0].rareBonus).toBe(25);
    expect(units[0].hp).toBe(6.25);
  });
  it('la même commande simultanée sur deux connexions n’est exécutée qu’une fois', async () => {
    const id = ids[0];
    await repoA.mutate((s) => {
      writeTile(s, { q: 1, r: -1 }, { ownerId: id, terrain: 'PLAIN', buildingId: undefined });
      s.realms[id].ap = 5;
      s.realms[id].apAt = Date.now();
    });
    const a = command('BUILD', id, { q: 1, r: -1, kind: 'FARM' }),
      before = repoA.state.realms[id].wallet.WOOD;
    const results = await Promise.all([repoA.action(id, a), repoB.action(id, a)]);
    expect(results.every((r) => r.accepted)).toBe(true);
    expect(results[0]).toEqual(results[1]);
    await repoA.init();
    expect(repoA.state.realms[id].ap).toBe(4);
    expect(repoA.state.realms[id].wallet.WOOD).toBeCloseTo(before - 23, 0);
    expect(await prisma.actionReceipt.count({ where: { userId: id, actionId: a.actionId } })).toBe(
      1,
    );
  });
  it('deux dépenses concurrentes du dernier PA ne peuvent pas toutes deux réussir', async () => {
    const id = ids[0];
    await repoA.mutate((s) => {
      s.realms[id].ap = 1;
      s.realms[id].apAt = Date.now();
      for (const p of [
        { q: 1, r: -2 },
        { q: 2, r: -2 },
      ])
        writeTile(s, p, { ownerId: id, terrain: 'PLAIN', buildingId: undefined });
    });
    const results = await Promise.all([
      repoA.action(id, command('BUILD', id, { q: 1, r: -2, kind: 'FARM' })),
      repoB.action(id, command('BUILD', id, { q: 2, r: -2, kind: 'FARM' })),
    ]);
    expect(results.filter((r) => r.accepted)).toHaveLength(1);
    await repoA.init();
    expect(repoA.state.realms[id].ap).toBe(0);
  });
  it('deux attaques sur une cible mourante restent cohérentes', async () => {
    const id = ids[0];
    let attacker = '',
      target = '';
    await repoA.mutate((s) => {
      const a = Object.values(s.units).find((u) => u.ownerId === id && u.kind === 'KNIGHT')!,
        b = Object.values(s.units).find((u) => u.ownerId === ids[1])!;
      Object.assign(b, { q: a.q + 1, r: a.r, hp: 1 });
      writeTile(s, b, { terrain: 'PLAIN' });
      attacker = a.id;
      target = b.id;
      s.realms[id].ap = 5;
      s.realms[id].apAt = Date.now();
      observe(s, s.realms[id], Date.now());
    });
    const results = await Promise.all([
      repoA.action(id, command('ATTACK', attacker, { targetId: target })),
      repoB.action(id, command('ATTACK', attacker, { targetId: target })),
    ]);
    expect(results.filter((r) => r.accepted)).toHaveLength(1);
    await repoA.init();
    expect(repoA.state.units[target]).toBeUndefined();
    expect(repoA.state.realms[id].ap).toBe(4);
  });
  it('un redémarrage conserve PA, stocks, positions et idempotence', async () => {
    const id = ids[0],
      before = structuredClone(repoA.state.realms[id]),
      restart = new WorldRepository(defaultOptions, worldId);
    await restart.init();
    expect(restart.state.realms[id].ap).toBe(before.ap);
    expect(restart.state.realms[id].apAt).toBe(before.apAt);
    expect(restart.state.realms[id].wallet).toEqual(before.wallet);
    expect(restart.state.realms[id].capital).toEqual(before.capital);
  });
  it('deux connexions au même compte ne créent pas deux royaumes', async () => {
    const id = ids[0],
      before = Object.values(repoA.state.units).filter((u) => u.ownerId === id).length;
    await Promise.all([
      repoA.mutate((s) => addPlayer(s, id, 'Premier onglet', 'ASH', Date.now())),
      repoB.mutate((s) => addPlayer(s, id, 'Deuxième onglet', 'ASH', Date.now())),
    ]);
    await repoA.init();
    expect(Object.values(repoA.state.units).filter((u) => u.ownerId === id)).toHaveLength(before);
  });
});
