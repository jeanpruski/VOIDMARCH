import { describe, expect, it } from 'vitest';
import { BIOMES, TERRAINS } from '@voidmarch/config';
import { biomeAt, biomeBlend, disk, generateTile } from '@voidmarch/game-rules';
import { biomeAppearance, biomeTerrainColor, blendedTerrainColor } from '../apps/web/src/biome-art';

const seed = 'landscape';
const samples = disk({ q: 0, r: 0 }, 100).map((p) => ({ p, blend: biomeBlend(seed, p) }));
const transitions = samples.filter((s) => s.blend.weights.length > 1);

describe('transitions naturelles entre biomes', () => {
  it('limite le mélange aux frontières et garde les grandes régions en place', () => {
    expect(transitions.length).toBeGreaterThan(100);
    expect(transitions.length / samples.length).toBeLessThan(0.12);
    for (const { p, blend } of samples) {
      expect(blend.primary).toBe(biomeAt(seed, p));
      expect(blend.width).toBeGreaterThanOrEqual(3);
      expect(blend.width).toBeLessThanOrEqual(7);
      expect(blend.weights.reduce((sum, b) => sum + b.weight, 0)).toBeCloseTo(1, 12);
      expect(blend.weights.some((b) => b.biome === blend.scenery && b.weight > 0)).toBe(true);
      if (blend.weights.length === 1) {
        expect(blendedTerrainColor('PLAIN', blend)).toBe(biomeTerrainColor('PLAIN', blend.primary));
        expect(blend.scenery).toBe(blend.primary);
      }
    }
    expect(new Set(transitions.map((s) => Math.floor(s.blend.width * 10))).size).toBeGreaterThan(
      15,
    );
    expect(transitions.some((s) => s.blend.scenery !== s.blend.primary)).toBe(true);
  });
  it('adoucit les couleurs de part et d’autre des frontières au lieu de garder le saut initial', () => {
    const edges = transitions.filter(
      ({ p, blend }) => biomeAt(seed, { q: p.q + 1, r: p.r }) !== blend.primary,
    );
    expect(edges.length).toBeGreaterThan(20);
    const difference = (a: number, b: number) =>
      [0, 8, 16].reduce((n, shift) => n + Math.abs(((a >> shift) & 255) - ((b >> shift) & 255)), 0);
    let oldJump = 0,
      newJump = 0;
    for (const { p, blend } of edges) {
      const neighbor = biomeBlend(seed, { q: p.q + 1, r: p.r });
      oldJump += difference(
        biomeTerrainColor('PLAIN', blend.primary),
        biomeTerrainColor('PLAIN', neighbor.primary),
      );
      newJump += difference(
        blendedTerrainColor('PLAIN', blend),
        blendedTerrainColor('PLAIN', neighbor),
      );
    }
    expect(newJump).toBeLessThan(oldJump * 0.7);
  });
  it('garde exactement le même décor quelle que soit la visite, même après éviction du cache', () => {
    const points = transitions.filter((_, i) => i % 10 === 0);
    const original = points.map(({ p }) => biomeAppearance(seed, p));
    for (let i = 0; i < 24010; i++) biomeAppearance('another-world', { q: i - 12000, r: 400 });
    expect(
      [...points]
        .reverse()
        .map(({ p }) => biomeAppearance(seed, p))
        .reverse(),
    ).toEqual(original);
    expect(points.map(({ p }) => biomeAppearance('another-world', p))).not.toEqual(original);
  });
  it('ne modifie pas les ressources, les terres brûlées ni les thèmes explicitement fixés', () => {
    const p = transitions[0].p,
      tile = generateTile(seed, p),
      original = structuredClone(tile);
    const visual = biomeAppearance(seed, tile, tile.biome);
    expect(tile).toEqual(original);
    expect(blendedTerrainColor('SCORCHED', visual.blend)).toBe(TERRAINS.SCORCHED.color);
    expect(blendedTerrainColor('ALIEN', visual.blend)).toBe(TERRAINS.ALIEN.color);
    const override = (Object.keys(BIOMES) as (keyof typeof BIOMES)[]).find(
      (b) => b !== tile.biome,
    )!;
    expect(biomeAppearance(seed, p, override).blend.weights).toEqual([
      { biome: override, weight: 1 },
    ]);
  });
});
