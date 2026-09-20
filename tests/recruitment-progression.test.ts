import { prepareDevelopment } from './fixtures/development';
import { unitDevelopmentStage } from '@voidmarch/config';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  UNIT_PROFILES,
  UNIT_CATEGORY,
  UNITS,
  RECRUITMENT_TRACKS,
  SPECIALIST_UNITS,
  RESOURCES,
  recruitmentLevel,
  trainingBonusAt,
  type BuildingKind,
  type UnitKind,
} from '@voidmarch/config';
import {
  createState,
  recruitmentRequirement,
  writeTile,
  disk,
  unitStats,
} from '@voidmarch/game-rules';
import type { Building } from '@voidmarch/shared';
import { actionSchema } from '@voidmarch/protocol';
import {
  addPlayer,
  addBuilding,
  execute,
  worldView,
  defaultOptions,
} from '../apps/server/src/engine';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { projectileProfile } from '../apps/web/src/projectile-profile';
import { UNIT_FRAMES, miniatureTexture, miniatureFrame } from '../apps/web/src/ui';
import { SPRITE_ATLASES } from '../apps/web/src/sprite-atlas';
const kinds = Object.keys(UNITS) as UnitKind[];
const buildings = Object.keys(BUILDINGS) as BuildingKind[];
const now = 1_900_000_000_000;
const template = (kind: BuildingKind, level = 5): Building => ({
  name: BUILDINGS[kind].name,
  id: kind,
  kind,
  level,
  ownerId: 'p',
  q: 0,
  r: 0,
  hp: 100,
  population: 100,
  createdAt: now,
  updatedAt: now,
});
const owned = buildings.map((b) => template(b));

describe('progression locale du recrutement', () => {
  it('toutes les filières de combat ont des nouveautés aux cinq niveaux, y compris les combattants soigneurs', () => {
    const combatRecruiters = buildings.filter((b) =>
      kinds.some(
        (k) =>
          UNITS[k].attack > 0 &&
          UNIT_CATEGORY[k] !== 'Civils & soutien' &&
          UNIT_PROFILES[k].recruitAt.includes(b),
      ),
    );
    expect(combatRecruiters).toHaveLength(24);
    for (const b of combatRecruiters) {
      expect(RECRUITMENT_TRACKS[b], b).toBeDefined();
      const recruits = kinds.filter((k) => UNIT_PROFILES[k].recruitAt.includes(b));
      for (const level of b === 'SUBMARINE_BASE' ? [3, 4, 5] : [1, 2, 3, 4, 5]) {
        expect(
          recruits.filter((k) => recruitmentLevel(k, b) === level).length,
          `${b} niveau ${level}`,
        ).toBeGreaterThan(0);
      }
    }
    expect(kinds.filter((k) => UNIT_PROFILES[k].recruitAt.includes('LIBRARY'))).toEqual([]);
  });
  it.each(kinds.filter((k) => k !== 'HERO'))(
    '%s : chaque voie applique ses niveaux et ses infrastructures sans faire disparaître les anciennes recrues',
    (kind) => {
      const profile = UNIT_PROFILES[kind];
      expect(profile.recruitAt.length).toBeGreaterThan(0);
      for (const b of profile.recruitAt) {
        const required = recruitmentLevel(kind, b);
        expect(required).toBeGreaterThanOrEqual(1);
        expect(required).toBeLessThanOrEqual(5);
        for (let level = 1; level <= 5; level++) {
          const message = recruitmentRequirement(kind, template(b, level), owned, { trophies: 50 });
          if (level < required) expect(message).toContain(`niveau ${required}`);
          else expect(message).toBe('');
        }
        for (const missing of profile.requires) {
          expect(
            recruitmentRequirement(
              kind,
              template(b),
              owned.filter((x) => x.kind !== missing),
              { trophies: 50 },
            ),
          ).toContain(BUILDINGS[missing].name);
        }
      }
    },
  );
  it('garde la défense antiaérienne spécialisée et les unités atomiques protégées par le réacteur', () => {
    for (const kind of kinds.filter((k) => UNIT_PROFILES[k].recruitAt.includes('FLAK_BATTERY')))
      expect(UNIT_PROFILES[kind].antiAir, kind).toBeGreaterThan(0);
    for (const kind of kinds.filter((k) => UNIT_PROFILES[k].radioactive))
      expect(UNIT_PROFILES[kind].requires, kind).toContain('NUCLEAR_REACTOR');
    for (const b of ['CAMP', 'VILLAGE', 'OUTPOST', 'HOUSE'] as const)
      expect(
        kinds.some(
          (k) =>
            UNITS[k].attack > 0 &&
            UNIT_CATEGORY[k] !== 'Civils & soutien' &&
            UNIT_PROFILES[k].recruitAt.includes(b),
        ),
      ).toBe(false);
  });
  const routes: [UnitKind, BuildingKind][] = [
    ['COMMANDO', 'BLACK_OBSERVATORY'],
    ['COMMANDO', 'BARRACKS'],
    ['SNIPER', 'ARCHERY'],
    ['SANG_FLAK', 'FLAK_BATTERY'],
    ['GAMMA_PALADIN', 'MONASTERY'],
    ...Object.keys(SPECIALIST_UNITS).map(
      (k) => [k as UnitKind, UNIT_PROFILES[k as UnitKind].recruitAt[0]] as [UnitKind, BuildingKind],
    ),
  ];
  it.each(routes)(
    '%s via %s : le serveur et l’aperçu utilisent le même niveau local et débitent le coût',
    (kind, b) => {
      const s = createState(`recruitment:${kind}:${b}`, now);
      const r = addPlayer(s, 'p', 'Progression', 'MASK', now);
      r.wallet = { GOLD: 1000000, WOOD: 1000000, STONE: 1000000, IRON: 1000000, FOOD: 1000000 };
      Object.values(s.buildings)[0].population = 1000;
      for (const p of disk(r.capital, 5)) writeTile(s, p, { terrain: 'PLAIN' });
      const recruiter = addBuilding(s, r, { q: r.capital.q + 1, r: r.capital.r }, b, now);
      UNIT_PROFILES[kind].requires
        .filter((x) => x !== b)
        .forEach((needed, i) =>
          addBuilding(s, r, { q: r.capital.q + 4 + i, r: r.capital.r + 2 }, needed, now),
        );
      const action = actionSchema.parse({
        type: 'RECRUIT',
        actorId: recruiter.id,
        payload: { kind },
        actionId: randomUUID(),
        clientTimestamp: now,
      });
      prepareDevelopment(s, r.id, unitDevelopmentStage(kind), now);
      const level = recruitmentLevel(kind, b);
      if (level > 1) {
        recruiter.level = level - 1;
        const denied = execute(s, 'p', action, now);
        expect(denied.result.accepted).toBe(false);
        expect(denied.result.reason).toContain(`niveau ${level}`);
        expect(denied.state).toEqual(s);
        expect(predictAction(worldView(s, 'p', now, [{ q: 0, r: 0 }]), action)).toBeUndefined();
      }
      recruiter.level = level;
      expect(predictAction(worldView(s, 'p', now, [{ q: 0, r: 0 }]), action)).toBeDefined();
      const paid = execute(s, 'p', action, now, { ...defaultOptions, recruitBonus: () => 0 });
      expect(paid.result.accepted, paid.result.reason).toBe(true);
      const unit = Object.values(paid.state.units).find((u) => u.kind === kind)!;
      expect(unit.hp).toBe(unitStats(unit).hp);
      expect(unit.trainingBonus ?? 0).toBe(trainingBonusAt(b, level));
      for (const resource of RESOURCES)
        expect(paid.state.realms.p.wallet[resource]).toBe(
          r.wallet[resource] - UNITS[kind].cost[resource],
        );
      expect(paid.state.realms.p.ap).toBe(r.ap - 1);
    },
  );
  it.each(Object.keys(SPECIALIST_UNITS) as (keyof typeof SPECIALIST_UNITS)[])(
    '%s possède un projectile, une miniature valide et ne capture pas',
    (kind) => {
      expect(projectileProfile(kind)).not.toBeNull();
      const atlas = SPRITE_ATLASES[miniatureTexture(UNIT_FRAMES[kind])];
      expect(miniatureFrame(UNIT_FRAMES[kind])).toBeLessThan(atlas.columns * atlas.rows);
      expect(!!UNIT_PROFILES[kind].flying).toBe(kind !== 'NEUTRON_FLAK');
      expect(UNITS[kind].capture).toBe(0);
    },
  );
});
