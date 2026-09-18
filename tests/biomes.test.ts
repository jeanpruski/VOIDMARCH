import { describe, expect, it } from 'vitest';
import { BIOMES, TERRAINS } from '@voidmarch/config';
import {
  biomeAt,
  biomeRegion,
  createState,
  generateTile,
  key,
  publicTile,
  tileAt,
  writeTile,
} from '@voidmarch/game-rules';
import { biomeTerrainColor, biomeTexture } from '../apps/web/src/biome-art';

describe('grands biomes visuels', () => {
  it('reste déterministe aux coordonnées négatives, indépendamment de l’ordre des lectures', () => {
    const points = Array.from({ length: 80 }, (_, i) => ({ q: i * 17 - 700, r: 350 - i * 23 }));
    const initial = points.map((p) => biomeAt('landscape', p));
    expect(new Set(initial).size).toBe(4);
    expect(
      [...points]
        .reverse()
        .map((p) => biomeAt('landscape', p))
        .reverse(),
    ).toEqual(initial);
    expect(points.map((p) => biomeAt('another-world', p))).not.toEqual(initial);
  });
  it('forme de grandes régions proches de 10 000 cases, avec des limites irrégulières', () => {
    const regions = new Map<string, number>();
    let neighboringChanges = 0;
    for (let q = -150; q < 250; q++)
      for (let r = -150; r < 250; r++) {
        const region = biomeRegion('landscape', { q, r }).region;
        regions.set(region, (regions.get(region) ?? 0) + 1);
        if (biomeAt('landscape', { q, r }) !== biomeAt('landscape', { q: q + 1, r }))
          neighboringChanges++;
      }
    for (const region of ['-1,-1', '-1,0', '0,-1', '0,0', '1,0', '0,1']) {
      expect(regions.get(region)).toBeGreaterThan(6000);
      expect(regions.get(region)).toBeLessThan(15000);
    }
    expect(neighboringChanges / 160000).toBeLessThan(0.035);
    const edge = Array.from({ length: 70 }, (_, r) => {
      for (let q = 55; q < 150; q++)
        if (
          biomeRegion('landscape', { q, r }).region !==
          biomeRegion('landscape', { q: q + 1, r }).region
        )
          return q;
      return null;
    }).filter((x) => x !== null);
    expect(new Set(edge).size).toBeGreaterThan(8);
  });
  it('conserve les anciennes cases et leurs aménagements sans mutation au chargement', () => {
    const state = createState('legacy', 0),
      p = { q: -12, r: 35 };
    state.tiles[key(p)] = {
      ...p,
      terrain: 'MOUNTAIN',
      ownerId: 'owner',
      buildingId: 'mine',
      road: true,
      exhausted: true,
    };
    const original = structuredClone(state.tiles[key(p)]);
    expect(tileAt(state, p)).toEqual({ ...original, biome: biomeAt(state.seed, p) });
    expect(state.tiles[key(p)]).toEqual(original);
    writeTile(state, p, { terrain: 'PLAIN' });
    expect(tileAt(state, p)).toMatchObject({
      terrain: 'PLAIN',
      biome: biomeAt(state.seed, p),
      ownerId: 'owner',
    });
  });
  it('complète les souvenirs anciens sans révéler les cases inconnues ni leur état actuel', () => {
    const state = createState('fog', 0),
      p = { q: 100, r: -50 };
    writeTile(state, p, { terrain: 'MOUNTAIN', ownerId: 'hidden-enemy' });
    expect(publicTile(state, p, new Set(), {})).toEqual({ ...p, visibility: 'UNKNOWN' });
    expect(
      publicTile(state, p, new Set(), {
        [key(p)]: { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' },
      }),
    ).toEqual({ ...p, terrain: 'PLAIN', biome: biomeAt(state.seed, p), visibility: 'EXPLORED' });
    expect(publicTile(state, p, new Set([key(p)]), {})).toMatchObject({
      terrain: 'MOUNTAIN',
      biome: biomeAt(state.seed, p),
      ownerId: 'hidden-enemy',
    });
  });
  it('garde les règles et noms de terrain universels, et distingue les terres brûlées', () => {
    const state = createState('universal', 0),
      p = { q: 0, r: 0 };
    for (const biome of Object.keys(BIOMES) as (keyof typeof BIOMES)[]) {
      writeTile(state, p, { terrain: 'FOREST', biome });
      expect(TERRAINS[tileAt(state, p).terrain]).toEqual(TERRAINS.FOREST);
      expect(biomeTerrainColor('SCORCHED', biome)).toBe(TERRAINS.SCORCHED.color);
      expect(biomeTexture(biome)).toBe(BIOMES[biome].texture);
    }
    expect(generateTile('universal', p).biome).toBe(biomeAt('universal', p));
  });
});
