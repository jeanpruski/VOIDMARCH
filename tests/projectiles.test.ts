import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { UNITS, UNIT_PROFILES, type UnitKind } from '@voidmarch/config';
import { createState, createRealm, disk, writeTile } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import {
  projectileProfile,
  projectilePosition,
  projectileDuration,
} from '../apps/web/src/projectile-profile';
import { worldEffects } from '../apps/web/src/world-effects';
const now = 1_900_000_000_000;
function combat() {
  const state = createState('projectiles', now);
  const a = addPlayer(state, 'a', 'A', 'ASH', now);
  a.protectedUntil = 0;
  state.realms.b = createRealm('b', 'B', 'MASK', { q: 3, r: 0 }, now);
  state.realms.b.protectedUntil = 0;
  state.units.gunner = {
    id: 'gunner',
    ownerId: 'a',
    kind: 'FIELD_GUN',
    q: 0,
    r: 0,
    hp: 13,
    createdAt: now,
    updatedAt: now,
  };
  state.units.target = {
    id: 'target',
    ownerId: 'b',
    kind: 'GUARD',
    q: 3,
    r: 0,
    hp: 100,
    createdAt: now,
    updatedAt: now,
  };
  for (const h of disk({ q: 0, r: 0 }, 7)) writeTile(state, h, { terrain: 'PLAIN' });
  const action = actionSchema.parse({
    type: 'ATTACK',
    actorId: 'gunner',
    payload: { targetId: 'target' },
    actionId: randomUUID(),
    clientTimestamp: now,
  });
  return { state, action };
}
describe('projectiles adaptés aux armes', () => {
  it('couvre toutes les unités à distance et laisse la mêlée sans projectile', () => {
    for (const [kind, u] of Object.entries(UNITS) as [UnitKind, (typeof UNITS)[UnitKind]][]) {
      if (u.range > 1) expect(projectileProfile(kind), kind).not.toBeNull();
      else expect(projectileProfile(kind), kind).toBeNull();
      if (UNIT_PROFILES[kind].radioactive && u.range > 1)
        expect(projectileProfile(kind)!.radioactive).toBe(true);
    }
  });
  it.each([
    ['OFFICER', 'bullet'],
    ['ARCHER', 'arrow'],
    ['CROSSBOW', 'bolt'],
    ['FIELD_GUN', 'shell'],
    ['BAZOOKA', 'rocket'],
    ['BOMBER', 'bomb'],
    ['SIEGE', 'stone'],
    ['VOID_ACOLYTE', 'orb'],
    ['TESLA_TROOPER', 'lightning'],
    ['OCCULT_DRAGON', 'flame'],
    ['APOCALYPSE_CRAWLER', 'rocket'],
  ] as const)('%s utilise %s', (kind, weapon) =>
    expect(projectileProfile(kind)!.kind).toBe(weapon),
  );
  it('les bombardiers utilisent leurs mitrailleuses contre une cible en vol', () => {
    expect(projectileProfile('GAMMA_BOMBER', true)!.kind).toBe('bullet');
    expect(projectileProfile('GAMMA_BOMBER', false)!.kind).toBe('bomb');
    expect(projectileProfile('GAMMA_FLAK_CRAWLER', true)!.arc).toBe(0);
  });
  it('part du tireur et termine exactement sur la cible, avec une parabole pour l’artillerie', () => {
    const from = { x: 10, y: 20 },
      to = { x: 300, y: 70 };
    expect(projectilePosition(from, to, 0, 80)).toEqual(from);
    expect(projectilePosition(from, to, 1, 80)).toEqual(to);
    expect(projectilePosition(from, to, 0.5, 80)).toEqual({ x: 155, y: -35 });
    expect(projectilePosition(from, to, 0.5, 0)).toEqual({ x: 155, y: 45 });
    expect(projectileDuration('bullet', 300)).toBeLessThan(projectileDuration('shell', 300));
  });
  it('un combat confirmé donne un seul tir au défenseur sans écraser le type ou l’identifiant du journal', () => {
    const { state, action } = combat();
    const before = worldView(state, 'b', now);
    const result = execute(state, 'a', action, now + 1);
    expect(result.result.accepted, result.result.reason).toBe(true);
    const report = result.state.journal.at(-1)!;
    expect(report.kind).toBe('COMBAT');
    expect(report.id).not.toBe('target');
    expect(report).not.toHaveProperty('hp');
    expect(report.shot).toEqual({
      from: { q: 0, r: 0 },
      unitKind: 'FIELD_GUN',
      targetAirborne: false,
    });
    const after = worldView(result.state, 'b', now + 1);
    const effects = worldEffects(before, after).filter((e) => e.kind === 'combat');
    expect(effects).toHaveLength(1);
    expect(effects[0].shot?.unitKind).toBe('FIELD_GUN');
    expect(worldEffects(after, after)).toEqual([]);
    const hidden = structuredClone(after);
    hidden.tiles.find((t) => t.q === 0 && t.r === 0)!.visibility = 'EXPLORED';
    expect(worldEffects(before, hidden).find((e) => e.kind === 'combat')?.shot).toBeUndefined();
    result.state.units.gunner.q = 100;
    report.shot!.from.q = 100;
    expect(
      worldView(result.state, 'b', now + 1).journal.find((j) => j.id === report.id)?.shot,
    ).toBeUndefined();
  });
  it('conserve le point d’impact lorsque la cible est détruite et ne journalise aucun tir refusé', () => {
    const { state, action } = combat();
    state.units.target.hp = 1;
    const before = worldView(state, 'a', now);
    const result = execute(state, 'a', action, now + 1);
    expect(result.result.accepted).toBe(true);
    expect(result.state.units.target).toBeUndefined();
    const effects = worldEffects(before, worldView(result.state, 'a', now + 1));
    expect(effects.find((e) => e.shot)?.q).toBe(3);
    state.units.target.q = 100;
    const rejected = execute(state, 'a', action, now + 1);
    expect(rejected.result.accepted).toBe(false);
    expect(rejected.state.journal).toEqual(state.journal);
  });
});
