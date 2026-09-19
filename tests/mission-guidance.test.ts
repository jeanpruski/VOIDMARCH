import { describe, it, expect } from 'vitest';
import { UNITS } from '@voidmarch/config';
import { createState, disk, key, neighbors } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
import { missionOffers } from '../apps/server/src/missions';
import { missionDifficulty, missionTravel } from '../apps/web/src/mission-guidance';
import type { Unit } from '@voidmarch/shared';
const now = 1_900_000_000_000;
function fixture() {
  const state = createState('mission-guidance', now);
  addPlayer(state, 'a', 'Guide', 'MASK', now);
  const unit: Unit = {
    id: 'army',
    ownerId: 'a',
    kind: 'INFANTRY',
    hp: UNITS.INFANTRY.hp,
    q: 0,
    r: 0,
    createdAt: now,
    updatedAt: now,
  };
  state.units[unit.id] = unit;
  const world = worldView(state, 'a', now);
  world.tiles = disk(unit, 12).map((p) => ({ ...p, visibility: 'VISIBLE', terrain: 'PLAIN' }));
  return { state, unit, world };
}
describe('indications des missions', () => {
  it('distingue les trois difficultés avec des conseils adaptés aux remparts', () => {
    const { state } = fixture();
    const offers = missionOffers(state, 'a', now);
    expect(offers.map((m) => missionDifficulty(m).label)).toEqual([
      'Facile',
      'Moyenne',
      'Difficile',
    ]);
    expect(missionDifficulty({ ...offers[1], wall: 'STONE_WALL' }).advice).toContain('brèche');
    expect(missionDifficulty({ ...offers[1], wall: undefined }).advice).not.toContain('brèche');
  });
  it('affiche zéro PA si l’unité est déjà voisine de l’objectif', () => {
    const { world, unit } = fixture();
    expect(missionTravel(world, { q: 1, r: 0 }, unit)).toEqual({ cases: 1, pa: 0, basis: 'near' });
  });
  it('compte les déplacements normaux et distingue un trajet inconnu', () => {
    const { world, unit } = fixture();
    const target = { q: UNITS[unit.kind].move * 2 + 1, r: 0 };
    expect(missionTravel(world, target, unit)).toEqual({ cases: target.q, pa: 2, basis: 'known' });
    world.tiles = [];
    expect(missionTravel(world, target, unit)).toEqual({
      cases: target.q,
      pa: 2,
      basis: 'unknown',
    });
  });
  it('tient compte du coût réel des terrains connus', () => {
    const { world, unit } = fixture();
    const target = { q: UNITS[unit.kind].move * 2 + 1, r: 0 };
    const plain = missionTravel(world, target, unit);
    world.tiles = world.tiles.map((t) => ({ ...t, terrain: 'MOUNTAIN' }));
    const mountain = missionTravel(world, target, unit);
    expect(mountain.basis).toBe('known');
    expect(mountain.pa!).toBeGreaterThan(plain.pa!);
  });
  it('ne facture pas les routes et enceintes connectées', () => {
    for (const network of ['road', 'land']) {
      const { world, unit } = fixture();
      world.tiles = world.tiles.map((t) => ({
        ...t,
        ...(network === 'road' ? { road: true } : { ownerId: 'a', enclosureOwnerId: 'a' }),
      }));
      expect(missionTravel(world, { q: 11, r: 0 }, unit)).toEqual({
        cases: 11,
        pa: 0,
        basis: 'road',
      });
    }
  });
  it('ne promet pas un trajet connu à travers une enceinte ennemie fermée', () => {
    const { world, unit } = fixture(),
      target = { q: 6, r: 0 };
    const walls = new Set(neighbors(target).map(key));
    world.tiles = world.tiles.map((t) =>
      walls.has(key(t))
        ? {
            ...t,
            building: {
              ...t,
              id: `wall:${key(t)}`,
              ownerId: 'enemy',
              kind: 'WOOD_WALL',
              hp: 100,
              level: 1,
              population: 0,
              name: 'Mur',
              createdAt: now,
              updatedAt: now,
            },
          }
        : t,
    );
    expect(missionTravel(world, target, unit).basis).toBe('unknown');
  });
  it('ne considère pas une case UNKNOWN comme un passage connu', () => {
    const { world, unit } = fixture();
    world.tiles = world.tiles.map((t) => ({ ...t, visibility: 'UNKNOWN', road: true }));
    expect(missionTravel(world, { q: 8, r: 0 }, unit).basis).toBe('unknown');
  });
});
