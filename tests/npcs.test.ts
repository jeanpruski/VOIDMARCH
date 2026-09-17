import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { NPCS, NPC_RULES, RESOURCES, type NpcKind } from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  distance,
  key,
  writeTile,
  unitStats,
  tileAt,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { createNpc, npcRewards, tickNpcs } from '../apps/server/src/npcs';
import { actionSchema } from '@voidmarch/protocol';
const now = 1_900_000_000_000;
function fixture(kind: NpcKind = 'deserter') {
  const s = createState('npc-tests', now),
    r = addPlayer(s, 'a', 'Chasseurs', 'MASK', now);
  r.wallet = { GOLD: 100, WOOD: 100, STONE: 100, IRON: 100, FOOD: 100 };
  r.ap = 10;
  for (const p of disk({ q: 0, r: 0 }, 20))
    writeTile(s, p, { terrain: 'PLAIN', ownerId: undefined, road: false, poi: undefined });
  s.units.soldier = {
    id: 'soldier',
    kind: 'RIFLEMAN',
    ownerId: r.id,
    q: 1,
    r: 0,
    hp: 100,
    createdAt: now,
    updatedAt: now,
  };
  const npc = createNpc(s, { q: 2, r: 0 }, kind, now);
  return { s, r, npc };
}
const attack = (targetId: string, actorId = 'soldier') =>
  actionSchema.parse({
    type: 'ATTACK',
    actorId,
    payload: { targetId },
    actionId: randomUUID(),
    clientTimestamp: now,
  });
describe('rencontres neutres', () => {
  it.each(Object.keys(NPCS) as NpcKind[])(
    '%s varie ses statistiques et ne devient pas recrutable',
    (kind) => {
      const { npc } = fixture(kind),
        p = NPCS[kind],
        stats = unitStats(npc);
      expect(stats.name).toBe(p.name);
      expect(stats.move).toBe(0);
      expect(stats.range).toBe(p.range);
      expect(stats.hp).toBeGreaterThanOrEqual(p.hp - 2);
      expect(stats.hp).toBeLessThanOrEqual(p.hp + 2);
      expect(stats.attack).toBeGreaterThanOrEqual(p.attack - 1);
      expect(stats.attack).toBeLessThanOrEqual(p.attack + 1);
      expect(stats.defense).toBeGreaterThanOrEqual(p.defense - 1);
      expect(stats.defense).toBeLessThanOrEqual(p.defense + 1);
      expect(npc.ownerId).toBe(NPC_RULES.ownerId);
    },
  );
  it('riposte sans consommer de PA supplémentaire ni retirer la protection du joueur', () => {
    const { s, r, npc } = fixture();
    npc.hp = 100;
    const result = execute(s, r.id, attack(npc.id), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.units.soldier.hp).toBeLessThan(100);
    expect(result.state.realms.a.ap).toBe(9);
    expect(result.state.realms.a.protectedUntil).toBe(r.protectedUntil);
    expect(result.state.units[npc.id].npc!.contributions.a).toBeGreaterThan(0);
    expect(result.result.message).toContain('Riposte');
    expect(result.state.journal.filter((j) => j.kind === 'COMBAT')).toHaveLength(2);
  });
  it('ne riposte pas si la cible est hors portée ou aérienne inaccessible', () => {
    for (const kind of ['SNIPER', 'RECON_PLANE'] as const) {
      const { s, r, npc } = fixture('marauder');
      npc.hp = 100;
      s.units.soldier.kind = kind;
      if (kind === 'SNIPER') s.units.soldier.q = 0;
      const result = execute(s, r.id, attack(npc.id), now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.state.units.soldier.hp).toBe(100);
    }
  });
  it('un coup fatal ne déclenche pas de riposte et ne distribue le butin qu’une fois', () => {
    const { s, r, npc } = fixture();
    npc.hp = 1;
    npc.npc!.bonusAP = 2;
    const result = execute(s, r.id, attack(npc.id), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.units[npc.id]).toBeUndefined();
    expect(result.state.units.soldier.hp).toBe(100);
    expect(result.state.realms.a.ap).toBe(11);
    for (const resource of RESOURCES)
      expect(result.state.realms.a.wallet[resource]).toBe(
        r.wallet[resource] + (npc.npc!.reward[resource] ?? 0),
      );
    expect(result.result.message).toContain('Butin');
    expect(result.result.message).toContain('+2 PA');
    expect(execute(result.state, r.id, attack(npc.id), now).result.accepted).toBe(false);
  });
  it('peut détruire son attaquant sans avancer ni toucher une autre unité', () => {
    const { s, r, npc } = fixture();
    npc.hp = 100;
    npc.npc!.attack = 30;
    s.units.soldier.hp = 1;
    s.units.bystander = { ...s.units.soldier, id: 'bystander', q: 3, hp: 20 };
    const result = execute(s, r.id, attack(npc.id), now);
    expect(result.state.units.soldier).toBeUndefined();
    expect(result.state.units.bystander.hp).toBe(20);
    expect(result.state.units[npc.id]).toMatchObject({ q: 2, r: 0 });
  });
  it('les tourelles peuvent attaquer et recevoir une riposte sur leur mur', () => {
    const { s, r, npc } = fixture();
    npc.hp = 100;
    const wall = addBuilding(s, r, { q: 1, r: 1 }, 'WOOD_WALL', now);
    wall.turretLevel = 1;
    wall.hp = 1;
    npc.npc!.attack = 30;
    const result = execute(s, r.id, attack(npc.id, wall.id), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.buildings[wall.id]).toBeUndefined();
  });
  it('partage au prorata, ignore les royaumes disparus et plafonne les PA sans réduire le bonus de départ', () => {
    const { s, r, npc } = fixture();
    s.realms.b = createRealm('b', 'Allié', 'ASH', { q: 50, r: 0 }, now);
    r.ap = 14;
    s.realms.b.ap = 30;
    npc.npc!.reward = { GOLD: 101, IRON: 7 };
    npc.npc!.bonusAP = 2;
    npc.npc!.contributions = { a: 75, b: 25, deleted: 999 };
    const rewards = npcRewards(s, npc, now);
    expect(rewards.find((x) => x.realmId === 'a')!.resources).toEqual({ GOLD: 76, IRON: 5 });
    expect(rewards.find((x) => x.realmId === 'b')!.resources).toEqual({ GOLD: 25, IRON: 2 });
    expect(r.ap).toBe(15);
    expect(s.realms.b.ap).toBe(30);
  });
  it('ne révèle pas les PNJ cachés et refuse un combat expiré ou sans PA', () => {
    const { s, r, npc } = fixture();
    npc.q = 60;
    expect(worldView(s, r.id, now).units.some((u) => u.id === npc.id)).toBe(false);
    expect(execute(s, r.id, attack(npc.id), now).result.accepted).toBe(false);
    npc.q = 2;
    npc.npc!.expiresAt = now;
    expect(execute(s, r.id, attack(npc.id), now).result.accepted).toBe(false);
    npc.npc!.expiresAt = now + 10000;
    r.ap = 0;
    expect(execute(s, r.id, attack(npc.id), now).result.accepted).toBe(false);
  });
});
describe('apparition rare et bornée', () => {
  it('ne fait rien hors ligne, tente une fois par période avec un seuil de 10 %', () => {
    const { s, npc } = fixture();
    delete s.units[npc.id];
    tickNpcs(s, now, new Set(), () => 0);
    expect(Object.values(s.units).filter((u) => u.npc)).toHaveLength(0);
    tickNpcs(s, now, new Set(['a']), () => 0.1);
    expect(Object.values(s.units).filter((u) => u.npc)).toHaveLength(0);
    tickNpcs(s, now + 1000, new Set(['a']), () => 0);
    expect(Object.values(s.units).filter((u) => u.npc)).toHaveLength(0);
    tickNpcs(s, now + NPC_RULES.interval, new Set(['a']), () => 0);
    const spawned = Object.values(s.units).filter((u) => u.npc);
    expect(spawned).toHaveLength(1);
    expect(distance(spawned[0], s.realms.a.capital)).toBeGreaterThanOrEqual(6);
    expect(tileAt(s, spawned[0]).ownerId).toBeUndefined();
  });
  it('borne la densité et ne rattrape pas plusieurs heures de tentatives', () => {
    const { s, npc } = fixture();
    delete s.units[npc.id];
    for (let i = 0; i < 10; i++) tickNpcs(s, now + i * NPC_RULES.interval, new Set(['a']), () => 0);
    expect(Object.values(s.units).filter((u) => u.npc)).toHaveLength(2);
    tickNpcs(s, now + 86_400_000, new Set(['a']), () => 0);
    expect(Object.values(s.units).filter((u) => u.npc)).toHaveLength(1);
  });
  it('ne place rien sur une cité, une route ou un terrain revendiqué', () => {
    const { s, npc } = fixture();
    delete s.units[npc.id];
    for (const t of Object.values(s.tiles)) writeTile(s, t, { ownerId: 'a' });
    tickNpcs(s, now, new Set(['a']), () => 0);
    expect(Object.values(s.units).filter((u) => u.npc)).toHaveLength(0);
  });
  it('expire sans butin et reste immobile, sans attaque spontanée', () => {
    const { s, npc } = fixture();
    const before = structuredClone(s.units);
    tickNpcs(s, now + 1000, new Set(), () => 0);
    expect(s.units).toEqual(before);
    tickNpcs(s, npc.npc!.expiresAt, new Set());
    expect(s.units[npc.id]).toBeUndefined();
  });
});
