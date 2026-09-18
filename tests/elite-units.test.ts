import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ELITE_KINDS,
  ELITE_ROSTER,
  ELITE_FAMILIES,
  ELITE_SHEETS,
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

describe('Dynasties du Soleil noir et Shogunat néon', () => {
  it('ajoute 24 modèles par univers, 3 par catégorie et des illustrations distinctes', () => {
    expect(ELITE_KINDS).toHaveLength(48);
    expect(new Set(ELITE_KINDS.map((k) => UNIT_FRAMES[k])).size).toBe(48);
    for (const family of Object.keys(ELITE_FAMILIES)) {
      const kinds = ELITE_KINDS.filter((k) => ELITE_ROSTER[k].family === family);
      expect(kinds).toHaveLength(24);
      const groups = new Set(kinds.map((k) => ELITE_ROSTER[k].group));
      expect(groups.size).toBe(8);
      for (const group of groups)
        expect(kinds.filter((k) => ELITE_ROSTER[k].group === group)).toHaveLength(3);
    }
    for (const kind of ELITE_KINDS) {
      const entry = ELITE_ROSTER[kind];
      expect(miniatureTexture(UNIT_FRAMES[kind])).toBe(entry.sprite.sheet);
      expect(miniatureFrame(UNIT_FRAMES[kind])).toBe(entry.sprite.cell);
      expect(SPRITE_ATLASES[entry.sprite.sheet]).toEqual({ columns: 3, rows: 2 });
      expect(UNIT_ERAS[kind]).toBe(UNIT_PROFILES[kind].minRecruitLevel);
      expect(UNIT_ERAS[kind]).toBeGreaterThanOrEqual(4);
      expect(UNIT_TIERS[kind]).toBeGreaterThanOrEqual(5);
    }
    expect(ELITE_SHEETS).toHaveLength(8);
  });
  it.each(ELITE_KINDS)(
    '%s : verrouillage tardif, infrastructures, prix réel et entraînement',
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
      expect(UNITS[kind].cost.GOLD).toBeGreaterThanOrEqual(7000);
    },
  );
  it('respecte les trajectoires, la mobilité et les contres', () => {
    for (const kind of ELITE_KINDS) {
      const entry = ELITE_ROSTER[kind],
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
        expect(projectile?.color).toBe(entry.family === 'solar' ? 0xffc75b : 0x7aebff);
      } else expect(projectile).toBeNull();
      if (profile.flying) {
        expect(UNITS[kind].capture).toBe(0);
        expect(movementCost({ q: 0, r: 0, terrain: 'MOUNTAIN' }, kind)).toBe(1);
      }
    }
    const terrain = { q: 0, r: 0, terrain: 'PLAIN' as const };
    expect(estimateDamage(unit('SOL_HORUS_HUNTER'), unit('TANK'), terrain).min).toBeGreaterThan(
      UNITS.SOL_HORUS_HUNTER.attack,
    );
    expect(
      estimateDamage(unit('CYB_TSURU_INTERCEPTOR'), unit('BOMBER'), terrain).min,
    ).toBeGreaterThan(UNITS.CYB_TSURU_INTERCEPTOR.attack);
    expect(projectileProfile('SOL_SARCOPHAGUS_MORTAR')?.arc).toBeGreaterThan(0);
    expect(projectileProfile('CYB_YUMI_RAILGUN')?.arc).toBe(0);
  });
  it('distingue les univers et maintient une progression coûteuse', () => {
    expect(UNITS.SOL_PYRAMID_BEHEMOTH.hp).toBeGreaterThan(UNITS.CYB_ONI_FORTRESS.hp);
    expect(UNITS.CYB_ONI_FORTRESS.move).toBeGreaterThan(UNITS.SOL_PYRAMID_BEHEMOTH.move);
    for (const family of ['solar', 'neon'])
      for (const group of new Set(ELITE_KINDS.map((k) => ELITE_ROSTER[k].group))) {
        const models = ELITE_KINDS.filter(
          (k) => ELITE_ROSTER[k].family === family && ELITE_ROSTER[k].group === group,
        );
        const costs = models.map((k) => Object.values(UNITS[k].cost).reduce((a, b) => a + b, 0));
        expect(costs[1]).toBeGreaterThan(costs[0]);
        expect(costs[2]).toBeGreaterThan(costs[1]);
      }
  });
});
