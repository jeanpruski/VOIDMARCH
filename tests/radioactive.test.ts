import { prepareDevelopment } from './fixtures/development';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  recruitmentLevel,
  BUILDINGS,
  BUILDING_REQUIREMENTS,
  RADIOACTIVE_UNITS,
  UNITS,
  UNIT_CATEGORY,
  UNIT_PROFILES,
  unitPopulation,
  unitUpkeep,
  type BuildingKind,
  type UnitKind,
} from '@voidmarch/config';
import {
  armyTraining,
  createState,
  disk,
  estimateDamage,
  movementCost,
  unitStats,
  writeTile,
} from '@voidmarch/game-rules';
import { actionSchema, type Action } from '@voidmarch/protocol';
import { addBuilding, addPlayer, defaultOptions, execute } from '../apps/server/src/engine';
import { UNIT_FRAMES, BUILDING_FRAMES, miniatureFrame, miniatureTexture } from '../apps/web/src/ui';
import { SPRITE_ATLASES } from '../apps/web/src/sprite-atlas';
import type { Unit } from '@voidmarch/shared';
const now = 1_900_000_000_000;
const atomic = Object.keys(RADIOACTIVE_UNITS) as (keyof typeof RADIOACTIVE_UNITS)[];
const newBuildings: BuildingKind[] = [
  'ISOTOPE_LAB',
  'NUCLEAR_REACTOR',
  'HELIPAD',
  'ATOMIC_FOUNDRY',
];
const order = (type: Action['type'], actorId: string, payload = {}) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture() {
  const s = createState('atomic', now),
    r = addPlayer(s, 'p', 'Isotopes', 'MASK', now);
  r.wallet = { GOLD: 100000, IRON: 100000, WOOD: 100000, STONE: 100000, FOOD: 100000 };
  const positions = disk({ q: 0, r: 0 }, 7).filter((p) => p.q !== 0 || p.r !== 0);
  const buildings = (Object.keys(BUILDINGS) as BuildingKind[]).map((kind, i) =>
    addBuilding(s, r, positions[i], kind, now),
  );
  // Recruitment tests need traversable spawn terrain, independently of catalog order.
  for (const b of buildings) writeTile(s, b, { terrain: 'PLAIN' });
  buildings.find((b) => b.kind === 'VILLAGE')!.population = 1000;
  prepareDevelopment(s, r.id, 5, now);
  return { s, r, buildings };
}
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
describe('division atomique', () => {
  it('ajoute 36 unités distinctes, réparties en six familles, avec des accès existants', () => {
    expect(atomic).toHaveLength(36);
    expect(new Set(atomic.map((k) => UNITS[k].name)).size).toBe(36);
    expect(atomic.filter((k) => UNIT_PROFILES[k].mounted)).toHaveLength(6);
    expect(atomic.filter((k) => UNIT_CATEGORY[k] === 'Motos')).toHaveLength(6);
    expect(atomic.filter((k) => UNIT_CATEGORY[k] === 'Véhicules')).toHaveLength(6);
    expect(atomic.filter((k) => UNIT_CATEGORY[k] === 'Aviation')).toHaveLength(6);
    expect(atomic.filter((k) => UNIT_CATEGORY[k] === 'Hélicoptères')).toHaveLength(6);
    expect(
      atomic.filter((k) => !UNIT_PROFILES[k].mounted && !UNIT_PROFILES[k].mechanical),
    ).toHaveLength(6);
    expect(
      atomic.filter((k) => UNIT_PROFILES[k].recruitAt.some((b) => !newBuildings.includes(b)))
        .length,
    ).toBe(29);
    for (const kind of atomic) {
      expect(UNIT_PROFILES[kind].requires).toContain('NUCLEAR_REACTOR');
      expect(UNITS[kind].cost.GOLD).toBeGreaterThanOrEqual(300);
      expect(unitPopulation(kind)).toBeGreaterThanOrEqual(7);
      expect(unitUpkeep(kind).GOLD).toBeGreaterThan(unitUpkeep('RIFLEMAN').GOLD);
      expect(UNITS[kind].hp).toBeGreaterThan(UNITS.RIFLEMAN.hp);
    }
  });
  it.each(atomic)(
    '%s : recrutement, prix, prérequis et amélioration des troupes existantes',
    (kind) => {
      const { s, r, buildings } = fixture(),
        profile = UNIT_PROFILES[kind];
      const recruiter = buildings.find((b) => b.kind === profile.recruitAt[0])!;
      recruiter.level = recruitmentLevel(kind, recruiter.kind);
      const reactor = buildings.find((b) => b.kind === 'NUCLEAR_REACTOR')!;
      delete s.buildings[reactor.id];
      const denied = execute(s, r.id, order('RECRUIT', recruiter.id, { kind }), now);
      expect(denied.result.accepted).toBe(false);
      expect(denied.result.reason).toContain('Réacteur noir');
      expect(denied.state).toEqual(s);
      s.buildings[reactor.id] = reactor;
      const recruited = execute(s, r.id, order('RECRUIT', recruiter.id, { kind }), now, {
        ...defaultOptions,
        recruitBonus: () => 20,
      });
      expect(recruited.result.accepted, recruited.result.reason).toBe(true);
      const fresh = Object.values(recruited.state.units)[0];
      expect(fresh.kind).toBe(kind);
      expect(fresh.rareBonus).toBe(20);
      expect(fresh.hp).toBe(unitStats(fresh).hp);
      expect(recruited.state.realms.p.ap).toBe(39);
      expect(recruited.state.realms.p.wallet.GOLD).toBe(r.wallet.GOLD - UNITS[kind].cost.GOLD);
      // A legacy army may predate the new recruitment levels. Upgrading still
      // trains these existing troops and preserves their wounds.
      recruited.state.buildings[recruiter.id].level = 1;
      fresh.trainingBonus = 0;
      fresh.hp = unitStats(fresh).hp / 2;
      const upgraded = execute(recruited.state, r.id, order('UPGRADE', recruiter.id), now);
      expect(upgraded.result.accepted).toBe(true);
      const veteran = upgraded.state.units[fresh.id];
      expect(veteran.trainingBonus).toBe(
        armyTraining(kind, Object.values(upgraded.state.buildings)).trainingBonus,
      );
      expect(veteran.trainingBonus).toBeGreaterThanOrEqual(25);
      expect(Math.abs(veteran.hp - unitStats(veteran).hp / 2)).toBeLessThan(0.006);
      const camp = buildings.find((b) => b.kind === 'CAMP')!;
      expect(execute(s, r.id, order('RECRUIT', camp.id, { kind }), now).result.accepted).toBe(
        false,
      );
    },
  );
  it.each(newBuildings)('%s : construction, évolution et remboursement du coût initial', (kind) => {
    const { s, r } = fixture(),
      p = { q: 6, r: 0 };
    writeTile(s, p, { terrain: 'PLAIN', ownerId: r.id, buildingId: undefined });
    const built = execute(s, r.id, order('BUILD', r.id, { ...p, kind }), now);
    expect(built.result.accepted, built.result.reason).toBe(true);
    const b = Object.values(built.state.buildings).find((b) => b.q === p.q && b.r === p.r)!;
    expect(b.constructionCost).toEqual(BUILDINGS[kind].cost);
    const improved = execute(built.state, r.id, order('UPGRADE', b.id), now);
    expect(improved.result.accepted).toBe(true);
    expect(improved.state.buildings[b.id].level).toBe(2);
    const removed = execute(improved.state, r.id, order('DEMOLISH', b.id), now);
    expect(removed.result.accepted).toBe(true);
    expect(removed.state.realms.p.wallet.GOLD).toBe(
      improved.state.realms.p.wallet.GOLD + BUILDINGS[kind].cost.GOLD,
    );
  });
  it('conserve des contres et des contraintes de déplacement', () => {
    const terrain = { q: 0, r: 0, terrain: 'PLAIN' as const };
    for (const kind of ['GAMMA_TRIKE', 'GAMMA_FLAK_CRAWLER', 'GAMMA_HELICOPTER'] as const) {
      const damage = estimateDamage(unit(kind), unit('RADIUM_RECON'), terrain);
      expect(damage.min).toBeGreaterThanOrEqual(
        UNITS[kind].attack + UNIT_PROFILES[kind].antiAir! - UNITS.RADIUM_RECON.defense - 1,
      );
      expect(UNITS[kind].attack).toBeLessThan(UNITS.MAUSOLEUM_TANK.attack);
    }
    for (const kind of ['COBALT_CUIRASSIER', 'ISOTOPE_BIKE', 'MAUSOLEUM_TANK'] as const) {
      expect(movementCost({ ...terrain, terrain: 'MOUNTAIN' }, kind)).toBeGreaterThan(
        UNITS[kind].move,
      );
      expect(movementCost({ ...terrain, terrain: 'MOUNTAIN', road: true }, kind)).toBe(1);
    }
    for (const kind of atomic.filter((k) => UNIT_PROFILES[k].flying)) {
      expect(movementCost({ ...terrain, terrain: 'MOUNTAIN' }, kind)).toBe(1);
      expect(UNITS[kind].capture).toBe(0);
    }
  });
  it('chaînes atomiques sans cycle et sprites distincts à l’intérieur de leurs atlas', () => {
    const visit = (kind: BuildingKind, trail: BuildingKind[] = []) => {
      expect(trail).not.toContain(kind);
      for (const parent of BUILDING_REQUIREMENTS[kind] ?? []) visit(parent, [...trail, kind]);
    };
    newBuildings.forEach((k) => visit(k));
    const frames = [
      ...atomic.map((k) => UNIT_FRAMES[k]),
      ...newBuildings.map((k) => BUILDING_FRAMES[k]),
    ];
    expect(new Set(frames).size).toBe(40);
    for (const frame of frames) {
      const atlas = SPRITE_ATLASES[miniatureTexture(frame)];
      expect(atlas).toBeDefined();
      expect(miniatureFrame(frame)).toBeLessThan(atlas.columns * atlas.rows);
    }
  });
});
