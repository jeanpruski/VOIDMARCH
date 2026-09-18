import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  UNITS,
  UNIT_PROFILES,
  RESOURCES,
  UNIT_ERAS,
  trainingBonusAt,
  type UnitKind,
} from '@voidmarch/config';
import {
  ERA_REINFORCEMENTS,
  ERA_REINFORCEMENT_AGES,
} from '../packages/config/src/era-reinforcements';
import {
  createState,
  writeTile,
  estimateDamage,
  unitStats,
  movementCost,
  attackCost,
} from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { addBuilding, addPlayer, defaultOptions, execute } from '../apps/server/src/engine';
import { UNIT_FRAMES, miniatureFrame, miniatureTexture } from '../apps/web/src/ui';
import { SPRITE_ATLASES } from '../apps/web/src/sprite-atlas';
import { projectileProfile } from '../apps/web/src/projectile-profile';
import type { Unit } from '@voidmarch/shared';
const now = 1900000000000;
const kinds = Object.keys(ERA_REINFORCEMENTS) as (keyof typeof ERA_REINFORCEMENTS)[];
const order = (actorId: string, kind: UnitKind) =>
  actionSchema.parse({
    type: 'RECRUIT',
    actorId,
    payload: { kind },
    actionId: randomUUID(),
    clientTimestamp: now,
  });
const unit = (kind: UnitKind): Unit => ({
  id: kind,
  kind,
  ownerId: 'p',
  q: 0,
  r: 0,
  hp: UNITS[kind].hp,
  createdAt: now,
  updatedAt: now,
});
describe('renforts des cinq époques', () => {
  it('ajoute quatre silhouettes par époque avec une époque conservée et des niveaux de formation locaux', () => {
    expect(kinds).toHaveLength(20);
    expect(new Set(kinds.map((k) => UNIT_FRAMES[k])).size).toBe(20);
    for (const age of [1, 2, 3, 4, 5])
      expect(kinds.filter((k) => UNIT_ERAS[k] === age)).toHaveLength(4);
    for (const kind of kinds) {
      expect(UNIT_ERAS[kind]).toBe(ERA_REINFORCEMENT_AGES[kind]);
      expect(SPRITE_ATLASES[miniatureTexture(UNIT_FRAMES[kind])]).toEqual({ columns: 2, rows: 2 });
      expect(miniatureFrame(UNIT_FRAMES[kind])).toBeLessThan(4);
    }
  });
  it.each(kinds)('%s : bon bâtiment, niveau, prérequis, paiement et entraînement', (kind) => {
    const s = createState('reinforcement:' + kind, now),
      r = addPlayer(s, 'p', 'Cinq âges', 'MASK', now),
      profile = UNIT_PROFILES[kind];
    r.wallet = { GOLD: 100000, WOOD: 100000, STONE: 100000, IRON: 100000, FOOD: 100000 };
    const home = Object.values(s.buildings)[0];
    home.population = 500;
    const b = addBuilding(s, r, { q: 1, r: 0 }, profile.recruitAt[0], now);
    b.level = profile.minRecruitLevel!;
    writeTile(s, b, { terrain: 'PLAIN' });
    profile.requires.forEach((k, i) => addBuilding(s, r, { q: 3 + i, r: 0 }, k, now));
    const bad = execute(s, r.id, order(home.id, kind), now);
    expect(bad.result.accepted).toBe(false);
    expect(bad.state).toEqual(s);
    if (b.level > 1) {
      b.level--;
      const denied = execute(s, r.id, order(b.id, kind), now);
      expect(denied.result.accepted).toBe(false);
      expect(denied.result.reason).toContain('niveau');
      expect(denied.state).toEqual(s);
      b.level++;
    }
    if (profile.requires.length) {
      const req = Object.values(s.buildings).find((x) => x.kind === profile.requires[0])!;
      delete s.buildings[req.id];
      const denied = execute(s, r.id, order(b.id, kind), now);
      expect(denied.result.accepted).toBe(false);
      expect(denied.state).toEqual(s);
      s.buildings[req.id] = req;
    }
    const paid = execute(s, r.id, order(b.id, kind), now, {
      ...defaultOptions,
      recruitBonus: () => 0,
    });
    expect(paid.result.accepted, paid.result.reason).toBe(true);
    const recruited = Object.values(paid.state.units).find((u) => u.kind === kind)!;
    expect(recruited).toBeDefined();
    expect(recruited.trainingBonus ?? 0).toBe(trainingBonusAt(b.kind, b.level));
    expect(recruited.hp).toBe(unitStats(recruited).hp);
    for (const resource of RESOURCES)
      expect(paid.state.realms.p.wallet[resource]).toBe(
        r.wallet[resource] - UNITS[kind].cost[resource],
      );
    expect(paid.state.realms.p.ap).toBe(r.ap - 1);
  });
  it('maintient les contres cavalerie, blindage et aviation avec leurs bonus entraînés', () => {
    // Neutral ground isolates counter bonuses from the new positional affinities.
    const tile = { q: 0, r: 0, terrain: 'SCORCHED' as const };
    for (const kind of ['HALBERDIER', 'IMPERIAL_PIKEMAN'] as const) {
      const target = unit('LIGHT_CAVALRY');
      expect(estimateDamage(unit(kind), target, tile).min).toBe(
        Math.round(
          UNITS[kind].attack + UNIT_PROFILES[kind].antiCavalry! - UNITS.LIGHT_CAVALRY.defense,
        ) - 1,
      );
    }
    const hunter = unit('CASEMATE_HUNTER'),
      tank = unit('REACTOR_DREADNOUGHT');
    expect(estimateDamage(hunter, tank, tile).min).toBe(
      Math.round(
        UNITS.CASEMATE_HUNTER.attack +
          UNIT_PROFILES.CASEMATE_HUNTER.antiArmor! -
          UNITS.REACTOR_DREADNOUGHT.defense * 0.25,
      ) - 1,
    );
    hunter.trainingBonus = 100;
    expect(estimateDamage(hunter, tank, tile).min).toBe(
      Math.round(
        (UNITS.CASEMATE_HUNTER.attack + UNIT_PROFILES.CASEMATE_HUNTER.antiArmor!) * 2 -
          UNITS.REACTOR_DREADNOUGHT.defense * 0.25,
      ) - 1,
    );
    expect(
      estimateDamage(unit('GAMMA_INTERCEPTOR'), unit('DIVE_BOMBER'), tile).min,
    ).toBeGreaterThan(UNITS.GAMMA_INTERCEPTOR.attack * 1.5);
  });
  it('respecte mobilité, coût des sièges et trajectoires des armes', () => {
    for (const kind of kinds) {
      const p = UNIT_PROFILES[kind];
      expect(attackCost(unit(kind))).toBe(p.siege ? 2 : 1);
      if (p.flying) {
        expect(UNITS[kind].capture).toBe(0);
        expect(movementCost({ q: 0, r: 0, terrain: 'MOUNTAIN' }, kind)).toBe(1);
      }
    }
    expect(projectileProfile('IMPERIAL_CANNON')?.arc).toBe(0);
    expect(projectileProfile('NEUTRON_MORTAR')?.arc).toBeGreaterThan(0);
    expect(projectileProfile('MISSILE_TANK')?.kind).toBe('rocket');
    expect(projectileProfile('ASH_FLAMETHROWER')?.kind).toBe('flame');
    expect(projectileProfile('STEALTH_BIKE')?.burst).toBe(3);
  });
  it('réserve les grands investissements aux ères avancées', () => {
    const cost = (k: UnitKind) => Object.values(UNITS[k].cost).reduce((a, b) => a + b, 0);
    let previous = 0;
    for (const age of [1, 2, 3, 4, 5]) {
      const average =
        kinds.filter((k) => UNIT_ERAS[k] === age).reduce((sum, k) => sum + cost(k), 0) / 4;
      expect(average).toBeGreaterThan(previous * 2);
      previous = average;
    }
    expect(UNITS.REACTOR_DREADNOUGHT.attack).toBeGreaterThan(UNITS.CASEMATE_HUNTER.attack * 1.4);
  });
});
