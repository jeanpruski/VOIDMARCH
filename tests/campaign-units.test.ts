import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_KINDS,
  CAMPAIGN_ROSTER,
  CAMPAIGN_FAMILIES,
  CAMPAIGN_SHEETS,
  CAMPAIGN_COLORS,
  UNIT_PROFILES,
  UNIT_ERAS,
  UNIT_TIERS,
  UNITS,
  RESOURCES,
  trainingBonusAt,
  type UnitKind,
} from '@voidmarch/config';
import {
  createState,
  writeTile,
  unitStats,
  movementCost,
  attackCost,
  attackTrajectory,
  estimateDamage,
} from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { addBuilding, addPlayer, execute, defaultOptions } from '../apps/server/src/engine';
import { UNIT_FRAMES, miniatureFrame, miniatureTexture } from '../apps/web/src/ui';
import { SPRITE_ATLASES } from '../apps/web/src/sprite-atlas';
import { projectileProfile } from '../apps/web/src/projectile-profile';
import type { Unit } from '@voidmarch/shared';
const now = 1_900_000_000_000;
const unit = (kind: UnitKind): Unit => ({
  id: kind,
  ownerId: 'p',
  kind,
  hp: UNITS[kind].hp,
  q: 0,
  r: 0,
  createdAt: now,
  updatedAt: now,
});
const order = (actorId: string, kind: UnitKind) =>
  actionSchema.parse({
    type: 'RECRUIT',
    actorId,
    payload: { kind },
    actionId: randomUUID(),
    clientTimestamp: now,
  });

describe('Quatre armées de milieu de partie', () => {
  it('ajoute 24 unités par univers, 12 par époque et 96 illustrations distinctes', () => {
    expect(CAMPAIGN_KINDS).toHaveLength(96);
    expect(new Set(CAMPAIGN_KINDS.map((k) => UNIT_FRAMES[k])).size).toBe(96);
    const previousFrames = Object.entries(UNIT_FRAMES)
      .filter(([k]) => !Object.hasOwn(CAMPAIGN_ROSTER, k))
      .map(([, frame]) => frame);
    for (const k of CAMPAIGN_KINDS) expect(previousFrames).not.toContain(UNIT_FRAMES[k]);
    for (const family of Object.keys(CAMPAIGN_FAMILIES)) {
      const kinds = CAMPAIGN_KINDS.filter((k) => CAMPAIGN_ROSTER[k].family === family);
      expect(kinds).toHaveLength(24);
      for (const era of [2, 3]) expect(kinds.filter((k) => UNIT_ERAS[k] === era)).toHaveLength(12);
    }
    expect(CAMPAIGN_SHEETS).toHaveLength(16);
    for (const kind of CAMPAIGN_KINDS) {
      const entry = CAMPAIGN_ROSTER[kind];
      expect(miniatureTexture(UNIT_FRAMES[kind])).toBe(entry.sprite.sheet);
      expect(miniatureFrame(UNIT_FRAMES[kind])).toBe(entry.sprite.cell);
      expect(SPRITE_ATLASES[entry.sprite.sheet]).toEqual({ columns: 3, rows: 2 });
      expect(UNIT_ERAS[kind]).toBe(UNIT_PROFILES[kind].minRecruitLevel);
      expect([2, 3]).toContain(UNIT_ERAS[kind]);
      expect(UNIT_TIERS[kind]).toBe(UNIT_ERAS[kind]);
      expect(UNIT_PROFILES[kind].requires).not.toContain('NUCLEAR_REACTOR');
      expect(UNIT_PROFILES[kind].requires).not.toContain('OCCULT_LAB');
    }
  });
  it.each(CAMPAIGN_KINDS)(
    '%s : verrouillage par époque, infrastructures, prix réel et entraînement',
    (kind) => {
      const state = createState('elite:' + kind, now),
        realm = addPlayer(state, 'p', 'Élites', 'MASK', now);
      realm.wallet = { GOLD: 1000000, WOOD: 1000000, STONE: 1000000, IRON: 1000000, FOOD: 1000000 };
      const capital = Object.values(state.buildings)[0];
      capital.population = 500;
      const profile = UNIT_PROFILES[kind];
      const building = addBuilding(
        state,
        realm,
        { q: realm.capital.q + 1, r: realm.capital.r },
        profile.recruitAt[0],
        now,
      );
      writeTile(state, building, { terrain: 'PLAIN' });
      profile.requires.forEach((k, i) =>
        addBuilding(state, realm, { q: realm.capital.q + 4 + i, r: realm.capital.r }, k, now),
      );
      expect(execute(state, realm.id, order(capital.id, kind), now).result.accepted).toBe(false);
      for (let level = 1; level < profile.minRecruitLevel!; level++) {
        building.level = level;
        const denied = execute(state, realm.id, order(building.id, kind), now);
        expect(denied.result.accepted).toBe(false);
        expect(denied.result.reason).toContain('niveau');
        expect(denied.state).toEqual(state);
      }
      building.level = profile.minRecruitLevel!;
      for (const needed of profile.requires) {
        const prerequisite = Object.values(state.buildings).find((b) => b.kind === needed)!;
        delete state.buildings[prerequisite.id];
        const denied = execute(state, realm.id, order(building.id, kind), now);
        expect(denied.result.accepted).toBe(false);
        state.buildings[prerequisite.id] = prerequisite;
      }
      const gold = realm.wallet.GOLD;
      realm.wallet.GOLD = 0;
      expect(execute(state, realm.id, order(building.id, kind), now).result.accepted).toBe(false);
      realm.wallet.GOLD = gold;
      const paid = execute(state, realm.id, order(building.id, kind), now, {
        ...defaultOptions,
        recruitBonus: () => 0,
      });
      expect(paid.result.accepted, paid.result.reason).toBe(true);
      const recruited = Object.values(paid.state.units).find((u) => u.kind === kind)!;
      expect(recruited.trainingBonus).toBe(trainingBonusAt(building.kind, building.level));
      expect(recruited.hp).toBe(unitStats(recruited).hp);
      for (const resource of RESOURCES)
        expect(paid.state.realms.p.wallet[resource]).toBe(
          realm.wallet[resource] - UNITS[kind].cost[resource],
        );
      expect(paid.state.realms.p.ap).toBe(realm.ap - 1);
      expect(UNITS[kind].cost.GOLD).toBeGreaterThanOrEqual(200);
    },
  );
  it('respecte les trajectoires, la mobilité et les contres', () => {
    for (const kind of CAMPAIGN_KINDS) {
      const entry = CAMPAIGN_ROSTER[kind],
        profile = UNIT_PROFILES[kind];
      expect(attackCost(unit(kind))).toBe(profile.siege ? 2 : 1);
      expect(attackTrajectory(unit(kind))).toBe(
        profile.flying
          ? 'air'
          : entry.indirect
            ? 'indirect'
            : UNITS[kind].range > 1
              ? 'direct'
              : 'melee',
      );
      const projectile = projectileProfile(kind);
      if (UNITS[kind].range > 1) {
        expect(projectile?.kind).toBe(entry.weapon);
        expect(projectile?.color).toBe(CAMPAIGN_COLORS[entry.family]);
      } else expect(projectile).toBeNull();
      if (profile.flying) {
        expect(UNITS[kind].capture).toBe(0);
        expect(movementCost({ q: 0, r: 0, terrain: 'MOUNTAIN' }, kind)).toBe(1);
      }
    }
    const terrain = { q: 0, r: 0, terrain: 'PLAIN' as const };
    for (const prefix of ['SANG', 'ABYS', 'RONC', 'GIVR']) {
      const antiTank = (prefix + '_ANTITANK') as UnitKind;
      const fighter = (prefix + '_FIGHTER') as UnitKind;
      expect(estimateDamage(unit(antiTank), unit('TANK'), terrain).min).toBeGreaterThan(
        UNITS[antiTank].attack,
      );
      expect(estimateDamage(unit(fighter), unit('BOMBER'), terrain).min).toBeGreaterThan(
        UNITS[fighter].attack,
      );
    }
    expect(projectileProfile('ABYS_MORTAR')?.arc).toBeGreaterThan(0);
    expect(projectileProfile('SANG_CANNON')?.arc).toBe(0);
    expect(projectileProfile('RONC_MG')?.burst).toBe(3);
  });
  it('préserve les forces des quatre thèmes et l’écart avec les élites', () => {
    expect(UNITS.GIVR_HEAVY_TANK.defense).toBeGreaterThan(UNITS.SANG_HEAVY_TANK.defense);
    expect(UNITS.RONC_SCOUT.move).toBeGreaterThan(UNITS.SANG_SCOUT.move);
    expect(UNITS.SANG_CUIRASSIER.attack).toBeGreaterThan(UNITS.ABYS_CUIRASSIER.attack);
    expect(UNITS.ABYS_HOWITZER.buildingAttack).toBeGreaterThan(UNITS.SANG_HOWITZER.buildingAttack);
    for (const kind of CAMPAIGN_KINDS)
      expect(UNITS[kind].cost.GOLD).toBeLessThan(UNITS.SOL_KHOPESH.cost.GOLD);
    expect(
      unitStats({ ...unit('SOL_SCARAB_TANK'), trainingBonus: trainingBonusAt('TANK_FACTORY', 4) })
        .attack,
    ).toBeGreaterThan(
      unitStats({ ...unit('GIVR_HEAVY_TANK'), trainingBonus: trainingBonusAt('TANK_FACTORY', 3) })
        .attack,
    );
  });
});
