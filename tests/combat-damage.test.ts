import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createState, createRealm, disk, writeTile } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { createNpc } from '../apps/server/src/npcs';
import { actionSchema } from '@voidmarch/protocol';
import { combatDamage } from '../apps/web/src/combat-damage';
const now = 1_900_000_000_000;
function fixture() {
  const s = createState('damage', now);
  const a = addPlayer(s, 'a', 'A', 'ASH', now);
  a.protectedUntil = 0;
  s.realms.b = createRealm('b', 'B', 'MASK', { q: 3, r: 0 }, now);
  s.realms.b.protectedUntil = 0;
  for (const p of disk({ q: 0, r: 0 }, 7)) writeTile(s, p, { terrain: 'PLAIN' });
  s.units.shooter = {
    id: 'shooter',
    ownerId: 'a',
    kind: 'RIFLEMAN',
    q: 0,
    r: 0,
    hp: 100,
    createdAt: now,
    updatedAt: now,
  };
  s.units.target = { ...s.units.shooter, id: 'target', ownerId: 'b', q: 2 };
  return s;
}
function fire(s: ReturnType<typeof fixture>, targetId = 'target') {
  const result = execute(
    s,
    'a',
    actionSchema.parse({
      type: 'ATTACK',
      actorId: 'shooter',
      payload: { targetId },
      actionId: randomUUID(),
      clientTimestamp: now,
    }),
    now + 1,
  );
  expect(result.result.accepted, result.result.reason).toBe(true);
  return result.state;
}
describe('dégâts confirmés affichés sur la carte', () => {
  it('affiche le même dégât exact pour l’attaquant et le défenseur', () => {
    const s = fixture();
    const beforeA = worldView(s, 'a', now),
      beforeB = worldView(s, 'b', now);
    const after = fire(s);
    for (const [id, before] of [
      ['a', beforeA],
      ['b', beforeB],
    ] as const) {
      const view = worldView(after, id, now + 1);
      const hits = combatDamage(before, view);
      expect(hits).toHaveLength(1);
      expect(hits[0]).toMatchObject({
        amount: 100 - after.units.target.hp,
        targetOwnerId: 'b',
        targetKind: 'unit',
        retaliation: false,
        q: 2,
        r: 0,
      });
      expect(combatDamage(view, view)).toEqual([]);
    }
  });
  it('conserve le coup fatal même si la cible et la vision disparaissent', () => {
    const s = fixture();
    s.units.target.hp = 1;
    const before = worldView(s, 'b', now),
      after = worldView(fire(s), 'b', now + 1);
    expect(after.units.some((u) => u.id === 'target')).toBe(false);
    after.tiles.forEach((t) => {
      t.visibility = 'EXPLORED';
    });
    expect(combatDamage(before, after)[0]).toMatchObject({ q: 2, targetOwnerId: 'b' });
    expect(combatDamage(before, after)[0].amount).toBeGreaterThan(0);
  });
  it('montre attaque et riposte PNJ séparément, sans les additionner', () => {
    const s = fixture();
    delete s.units.target;
    const npc = createNpc(s, { q: 1, r: 0 }, 'deserter', now);
    npc.hp = 100;
    const before = worldView(s, 'a', now),
      next = fire(s, npc.id);
    const hits = combatDamage(before, worldView(next, 'a', now + 1));
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ amount: 100 - next.units[npc.id].hp, retaliation: false });
    expect(hits[1]).toMatchObject({
      amount: 100 - next.units.shooter.hp,
      targetOwnerId: 'a',
      retaliation: true,
      q: 0,
    });
  });
  it('place les dégâts sur le rempart intercepteur', () => {
    const s = fixture();
    const wall = addBuilding(s, s.realms.b, { q: 1, r: 0 }, 'WOOD_WALL', now);
    const before = worldView(s, 'a', now),
      next = fire(s);
    expect(combatDamage(before, worldView(next, 'a', now + 1))[0]).toMatchObject({
      q: 1,
      targetKind: 'building',
      amount: wall.hp - next.buildings[wall.id].hp,
    });
    expect(next.units.target.hp).toBe(100);
  });
  it('garde deux coups distincts sur une même case dans le même snapshot', () => {
    const s = fixture(),
      before = worldView(s, 'a', now);
    const next = fire(fire(s));
    const hits = combatDamage(before, worldView(next, 'a', now + 1));
    expect(hits).toHaveLength(2);
    expect(new Set(hits.map((h) => h.id)).size).toBe(2);
  });
  it('ne rejoue pas l’historique, les révélations ou les snapshots anciens', () => {
    const s = fixture(),
      before = worldView(s, 'a', now),
      after = worldView(fire(s), 'a', now + 1);
    const hidden = structuredClone(before);
    hidden.tiles.forEach((t) => {
      t.visibility = 'EXPLORED';
    });
    expect(combatDamage(hidden, after)).toEqual([]);
    expect(combatDamage(after, before)).toEqual([]);
    const later = structuredClone(after);
    later.serverTimestamp += 20000;
    expect(combatDamage(before, later)).toEqual([]);
    const other = structuredClone(after);
    other.player.id = 'other';
    expect(combatDamage(before, other)).toEqual([]);
  });
  it('affiche un nouveau coup après une période calme sans snapshot', () => {
    const s = fixture(),
      before = worldView(s, 'a', now),
      after = worldView(fire(s), 'a', now + 60000);
    after.journal
      .filter((e) => e.damage)
      .forEach((e) => {
        e.at = now + 60000;
      });
    expect(combatDamage(before, after)).toHaveLength(1);
  });
  it('ignore les variations de PV sans rapport de combat et les anciens journaux', () => {
    const s = fixture(),
      before = worldView(s, 'a', now),
      after = worldView(fire(s), 'a', now + 1);
    after.journal.forEach((e) => {
      delete e.damage;
    });
    expect(combatDamage(before, after)).toEqual([]);
  });
});
