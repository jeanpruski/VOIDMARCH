import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { type UnitKind } from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  writeTile,
  resolveAttack,
  DIRECTIONS,
  zeroWallet,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute } from '../apps/server/src/engine';
import { createNpc } from '../apps/server/src/npcs';
import { actionSchema } from '@voidmarch/protocol';
const now = 1_900_000_000_000;
function fixture(kind: UnitKind = 'RIFLEMAN') {
  const s = createState('wall-combat', now);
  const a = addPlayer(s, 'a', 'Attaquants', 'ASH', now);
  a.protectedUntil = 0;
  a.ap = 15;
  s.realms.b = createRealm('b', 'Défenseurs', 'MASK', { q: 20, r: 0 }, now);
  s.realms.b.protectedUntil = 0;
  for (const p of disk({ q: 0, r: 0 }, 8)) writeTile(s, p, { terrain: 'PLAIN' });
  s.units.shooter = {
    id: 'shooter',
    ownerId: 'a',
    kind,
    q: 0,
    r: 0,
    hp: 100,
    createdAt: now,
    updatedAt: now,
  };
  s.units.target = { ...s.units.shooter, id: 'target', ownerId: 'b', kind: 'GUARD', q: 2 };
  const wall = addBuilding(s, s.realms.b, { q: 1, r: 0 }, 'WOOD_WALL', now);
  return { s, wall };
}
function fire(s: ReturnType<typeof createState>, actorId = 'shooter', targetId = 'target') {
  return execute(
    s,
    'a',
    actionSchema.parse({
      type: 'ATTACK',
      actorId,
      payload: { targetId },
      actionId: randomUUID(),
      clientTimestamp: now,
    }),
    now,
  );
}
describe('les remparts interceptent les attaques', () => {
  it.each(['RIFLEMAN', 'BAZOOKA', 'FIELD_GUN', 'CROSSBOW', 'TESLA_TROOPER'] as UnitKind[])(
    '%s touche le mur et journalise le bon impact',
    (kind) => {
      const { s, wall } = fixture(kind);
      const result = fire(s);
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.state.units.target.hp).toBe(100);
      expect(result.state.buildings[wall.id].hp).toBeLessThan(wall.hp);
      expect(result.result.message).toContain('au rempart');
      expect(result.state.journal.filter((j) => j.kind === 'COMBAT').at(-1)).toMatchObject({
        q: 1,
        r: 0,
      });
    },
  );
  it.each([
    'ARCHER',
    'RANGER',
    'SIEGE',
    'MORTAR',
    'ATOMIC_SAPPER',
    'BOMBER',
    'OCCULT_DRAGON',
    'ISOTOPE_HELICOPTER',
  ] as UnitKind[])('%s passe au-dessus', (kind) => {
    const { s, wall } = fixture(kind);
    const result = fire(s);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.units.target.hp).toBeLessThan(100);
    expect(result.state.buildings[wall.id].hp).toBe(wall.hp);
  });
  it('ne propage pas les dégâts au-delà d’un mur détruit', () => {
    const { s, wall } = fixture('BAZOOKA');
    wall.hp = 1;
    const result = fire(s);
    expect(result.result.accepted).toBe(true);
    expect(result.state.buildings[wall.id]).toBeUndefined();
    expect(result.state.units.target.hp).toBe(100);
    expect(fire(result.state).state.units.target.hp).toBeLessThan(100);
  });
  it('bloque un tir sortant derrière son propre rempart sans coût ni dégâts', () => {
    const { s, wall } = fixture();
    wall.ownerId = 'a';
    const result = fire(s);
    expect(result.result.accepted).toBe(false);
    expect(result.result.reason).toContain('Votre rempart');
    expect(result.state.realms.a.ap).toBe(15);
    expect(result.state.buildings[wall.id].hp).toBe(wall.hp);
  });
  it('intercepte sur la case de la cible, y compris au corps à corps', () => {
    const { s, wall } = fixture('GUARD');
    s.units.target.q = 1;
    const result = fire(s);
    expect(result.result.accepted).toBe(true);
    expect(result.state.units.target.hp).toBe(100);
    expect(result.state.buildings[wall.id].hp).toBeLessThan(wall.hp);
  });
  it('la riposte d’un PNJ frappe le mur, sans blesser l’archer derrière', () => {
    const { s, wall } = fixture('ARCHER');
    wall.ownerId = 'a';
    delete s.units.target;
    const npc = createNpc(s, { q: 2, r: 0 }, 'deserter', now);
    npc.hp = 100;
    const result = fire(s, 'shooter', npc.id);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.units.shooter.hp).toBe(100);
    expect(result.state.buildings[wall.id].hp).toBeLessThan(wall.hp);
    expect(result.result.message).toContain('rempart qui intercepte');
  });
  it('une tourelle tire depuis le haut du mur et franchit le rempart suivant', () => {
    const { s, wall } = fixture();
    const turret = addBuilding(s, s.realms.a, { q: 0, r: 1 }, 'WOOD_WALL', now);
    turret.turretLevel = 1;
    const result = fire(s, turret.id);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.units.target.hp).toBeLessThan(100);
    expect(result.state.buildings[wall.id].hp).toBe(wall.hp);
  });
  it('un mur ne protège pas une cible aérienne', () => {
    const { s, wall } = fixture();
    s.units.target.kind = 'FIGHTER';
    const result = fire(s);
    expect(result.result.accepted).toBe(true);
    expect(result.state.units.target.hp).toBeLessThan(100);
    expect(result.state.buildings[wall.id].hp).toBe(wall.hp);
  });
  it('respecte la trêve d’un tiers dont le mur intercepte le tir', () => {
    const { s, wall } = fixture();
    s.realms.c = createRealm('c', 'Tiers', 'ASH', { q: 30, r: 0 }, now);
    s.realms.c.protectedUntil = 0;
    wall.ownerId = 'c';
    s.treaties.truce = {
      id: 'truce',
      a: 'a',
      b: 'c',
      kind: 'TRUCE',
      startsAt: now,
      endsAt: now + 60_000,
      payment: zeroWallet(),
      proposalId: 'p',
      nextCaravanAt: now,
    };
    const result = fire(s);
    expect(result.result.accepted).toBe(false);
    expect(result.result.reason).toContain('trêve');
    expect(result.state.realms.a.ap).toBe(15);
  });
  it('choisit le premier mur dans les six directions et ignore un mur voisin hors trajectoire', () => {
    for (const d of DIRECTIONS) {
      const { s, wall } = fixture();
      Object.assign(wall, d);
      Object.assign(s.units.target, { q: d.q * 3, r: d.r * 3 });
      const far = { ...wall, id: 'far', q: d.q * 2, r: d.r * 2 };
      expect(resolveAttack(s.units.shooter, s.units.target, [far, wall]).target.id).toBe(wall.id);
      expect(resolveAttack(s.units.target, s.units.shooter, [wall, far]).target.id).toBe(far.id);
    }
    const { s, wall } = fixture();
    wall.r = 2;
    expect(resolveAttack(s.units.shooter, s.units.target, [wall]).target.id).toBe('target');
  });
  it('ferme aussi un tir longeant exactement la bordure de deux hexagones', () => {
    const { s, wall } = fixture();
    s.units.target.q = 1;
    s.units.target.r = 1;
    for (const p of [
      { q: 1, r: 0 },
      { q: 0, r: 1 },
    ]) {
      Object.assign(wall, p);
      expect(resolveAttack(s.units.shooter, s.units.target, [wall]).target.id).toBe(wall.id);
      expect(resolveAttack(s.units.target, s.units.shooter, [wall]).target.id).toBe(wall.id);
    }
  });
});
