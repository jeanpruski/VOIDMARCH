import { heroAura } from '@voidmarch/config';
import { describe, expect, it } from 'vitest';
import {
  UNITS,
  UNIT_PROFILES,
  UNIT_TERRAIN_AFFINITIES,
  TERRAINS,
  type UnitKind,
  type Terrain,
} from '@voidmarch/config';
import {
  unitStats,
  unitCombatStats,
  terrainCombatBonus,
  estimateDamage,
  movementCost,
  createState,
  createRealm,
  disk,
  writeTile,
  tileAt,
  resolveAttack,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute } from '../apps/server/src/engine';
import { createNpc } from '../apps/server/src/npcs';
import { actionSchema } from '@voidmarch/protocol';
import type { Unit } from '@voidmarch/shared';
const now = 1_900_000_000_000;
const unit = (kind: UnitKind, extras: Partial<Unit> = {}): Unit => ({
  id: kind,
  kind,
  ownerId: 'a',
  q: 0,
  r: 0,
  hp: UNITS[kind].hp,
  createdAt: now,
  updatedAt: now,
  ...extras,
});
const ground = (terrain: Terrain) => ({ q: 1, r: 0, terrain });

describe('affinités de terrain', () => {
  it('garde des bonus bornés, des terrains accessibles et aucune affinité terrestre pour les avions/civils non combattants', () => {
    for (const kind of Object.keys(UNITS) as UnitKind[]) {
      const entries = UNIT_TERRAIN_AFFINITIES[kind];
      expect(new Set(entries.map((a) => a.terrain)).size).toBe(entries.length);
      if (
        UNIT_PROFILES[kind].flying ||
        UNITS[kind].attack === 0 ||
        UNIT_PROFILES[kind].hero ||
        UNIT_PROFILES[kind].builder
      )
        expect(entries).toEqual([]);
      else expect(entries.length, kind).toBeGreaterThan(0);
      for (const a of entries) {
        expect(a.attack).toBeGreaterThanOrEqual(0);
        expect(a.attack).toBeLessThanOrEqual(30);
        expect(a.defense).toBeGreaterThanOrEqual(0);
        expect(a.defense).toBeLessThanOrEqual(30);
        expect(movementCost(ground(a.terrain), kind), kind).toBeLessThan(99);
      }
    }
  });
  it('inverse l’intérêt de deux mousquetaires proches selon leur position', () => {
    const target = unit('GUARD', { ownerId: 'b' });
    const damage = (k: UnitKind, t: Terrain) =>
      estimateDamage(unit(k), target, ground('SCORCHED'), [], t).min;
    expect(damage('RONC_MUSKET', 'FOREST')).toBeGreaterThan(damage('SANG_MUSKET', 'FOREST'));
    expect(damage('SANG_MUSKET', 'PLAIN')).toBeGreaterThan(damage('RONC_MUSKET', 'PLAIN'));
    expect(terrainCombatBonus(unit('GIVR_RIFLE'), 'MOUNTAIN').attack).toBe(25);
    expect(terrainCombatBonus(unit('ABYS_RIFLE'), 'RIVER').attack).toBe(25);
    expect(terrainCombatBonus(unit('SOL_KHOPESH'), 'RUINS').defense).toBe(30);
    expect(terrainCombatBonus(unit('CYB_RONIN'), 'RUINS').attack).toBe(30);
  });
  it('applique l’affinité après entraînement, rareté et expérience sans modifier les PV ni sauvegarder le bonus', () => {
    const u = unit('RANGER', { trainingBonus: 60, rareBonus: 20, victories: 20 });
    const before = structuredClone(u),
      base = unitStats(u),
      boosted = unitCombatStats(u, 'FOREST');
    expect(boosted.attack).toBe(Math.round(base.attack * 1.3 * 100) / 100);
    expect(boosted.defense).toBe(Math.round(base.defense * 1.25 * 100) / 100);
    expect(boosted.hp).toBe(base.hp);
    expect(unitCombatStats(u, 'PLAIN')).toEqual(base);
    expect(u).toEqual(before);
  });
  it('sépare case de départ, case d’arrivée et couverture naturelle', () => {
    const a = unit('RANGER'),
      b = unit('GUARD', { ownerId: 'b' });
    const expected = Math.round(
      unitCombatStats(a, 'FOREST').attack -
        unitCombatStats(b, 'RUINS').defense -
        TERRAINS.RUINS.defense,
    );
    expect(estimateDamage(a, b, ground('RUINS'), [], 'FOREST').min).toBe(Math.max(1, expected - 1));
    expect(estimateDamage(a, b, ground('FOREST'), [], 'SCORCHED')).toEqual(
      estimateDamage(a, b, ground('FOREST'), [], 'PLAIN'),
    );
    expect(estimateDamage(a, b, ground('SCORCHED'), [], 'FOREST').min).toBeGreaterThan(
      estimateDamage(a, b, ground('FOREST'), [], 'SCORCHED').min,
    );
  });
  it('garde les contres additifs et la pénétration du blindage, même avec l’aura du héros', () => {
    const a = unit('BAZOOKA', { trainingBonus: 100 }),
      b = unit('TANK', { ownerId: 'b' }),
      hero = unit('HERO', { id: 'hero', q: 1 });
    const attack = unitCombatStats(a, 'HILL').attack * (1 + heroAura(undefined));
    const expected = Math.round(
      attack + UNIT_PROFILES.BAZOOKA.antiArmor! * 2 - unitCombatStats(b, 'PLAIN').defense * 0.25,
    );
    expect(estimateDamage(a, b, ground('PLAIN'), [hero], 'HILL').min).toBe(
      Math.max(1, expected - 1),
    );
  });
  function fixture(kind: UnitKind = 'RONC_RIFLE') {
    const s = createState('terrain-combat', now),
      r = addPlayer(s, 'a', 'Ronces', 'MASK', now);
    r.protectedUntil = 0;
    s.realms.b = createRealm('b', 'Cible', 'ASH', { q: 10, r: 0 }, now);
    s.realms.b.protectedUntil = 0;
    for (const p of disk({ q: 0, r: 0 }, 6)) writeTile(s, p, { terrain: 'PLAIN' });
    s.units.shooter = unit(kind, { id: 'shooter', q: 0, r: 0 });
    s.units.target = unit('GUARD', { id: 'target', ownerId: 'b', q: 2, r: 0, hp: 500 });
    writeTile(s, s.units.shooter, { terrain: 'FOREST' });
    writeTile(s, s.units.target, { terrain: 'RUINS' });
    return s;
  }
  const order = (targetId = 'target') =>
    actionSchema.parse({
      type: 'ATTACK',
      actorId: 'shooter',
      payload: { targetId },
      actionId: '00000000-0000-4000-8000-000000000001',
      clientTimestamp: now,
    });
  it.each([false, true])(
    'le serveur respecte l’aperçu avec interception par un mur = %s',
    (withWall) => {
      const s = fixture();
      if (withWall) addBuilding(s, s.realms.b, { q: 1, r: 0 }, 'WOOD_WALL', now);
      const shooter = s.units.shooter,
        intended = s.units.target;
      const target = resolveAttack(shooter, intended, Object.values(s.buildings)).target;
      const estimate = estimateDamage(
        shooter,
        target,
        tileAt(s, target),
        Object.values(s.units),
        tileAt(s, shooter).terrain,
      );
      const result = execute(s, 'a', order(), now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      const after =
        'population' in target ? result.state.buildings[target.id] : result.state.units[target.id];
      const damage = target.hp - after.hp;
      expect(damage).toBeGreaterThanOrEqual(estimate.min);
      expect(damage).toBeLessThanOrEqual(estimate.max);
      if (withWall) expect(result.state.units.target.hp).toBe(intended.hp);
      expect(result.state.realms.a.ap).toBe(s.realms.a.ap - 1);
    },
  );
  it('la riposte d’un PNJ prend la défense de la case du joueur sans hériter de sa figurine', () => {
    const s = fixture();
    delete s.units.target;
    const npc = createNpc(s, { q: 1, r: 0 }, 'deserter', now);
    npc.hp = 500;
    npc.npc!.maxHp = 500;
    const shooter = s.units.shooter;
    expect(terrainCombatBonus(npc, 'HILL')).toEqual({ attack: 0, defense: 0 });
    const reply = estimateDamage(
      npc,
      shooter,
      tileAt(s, shooter),
      Object.values(s.units),
      tileAt(s, npc).terrain,
    );
    const result = execute(s, 'a', order(npc.id), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    const damage = shooter.hp - result.state.units.shooter.hp;
    expect(damage).toBeGreaterThanOrEqual(reply.min);
    expect(damage).toBeLessThanOrEqual(reply.max);
  });
  it('les aéronefs et les tourelles n’héritent pas d’un bonus offensif du sol', () => {
    const s = fixture(),
      b = addBuilding(s, s.realms.a, { q: 0, r: 1 }, 'WOOD_WALL', now);
    b.turretLevel = 1;
    const target = unit('FIGHTER', { ownerId: 'b' });
    expect(unitCombatStats(target, 'FOREST')).toEqual(unitStats(target));
    expect(estimateDamage(b, target, ground('FOREST'), [], 'HILL')).toEqual(
      estimateDamage(b, target, ground('PLAIN'), [], 'PLAIN'),
    );
  });
});
