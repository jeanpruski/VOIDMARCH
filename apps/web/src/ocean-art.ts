import type Phaser from 'phaser';
import type { ViewTile } from '@voidmarch/shared';
import { isSea } from '@voidmarch/config';
import { key, hash, neighbors } from '@voidmarch/game-rules';
import { biomeAppearance, blendedTerrainColor } from './biome-art';
import { SIZE, Y_SCALE } from './map-geometry';

export const mixCoastColor = (a: number, b: number, weight: number) => {
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 255) * (1 - weight) + ((b >> shift) & 255) * weight);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};
export interface CoastalPaint {
  color: number;
  depth?: number;
}
export type CoastalField = Map<string, CoastalPaint>;
const known = (t?: ViewTile) => !!t?.terrain && t.visibility !== 'UNKNOWN';
/** Bounded flood fills on disclosed terrain only. Shared by every visible hex, not camera-relative. */
export function coastalField(seed: string, tiles: ReadonlyMap<string, ViewTile>): CoastalField {
  const water = new Map<string, number>(),
    inland = new Map<string, number>();
  const fill = (
    distances: Map<string, number>,
    queue: ViewTile[],
    limit: number,
    accepts: (t: ViewTile) => boolean,
  ) => {
    for (let i = 0; i < queue.length; i++) {
      const tile = queue[i],
        d = distances.get(key(tile))!;
      if (d >= limit) continue;
      for (const n of neighbors(tile)) {
        const k = key(n),
          next = tiles.get(k);
        if (!known(next) || distances.has(k) || !accepts(next!)) continue;
        distances.set(k, d + 1);
        queue.push(next!);
      }
    }
  };
  const shore: ViewTile[] = [],
    beaches: ViewTile[] = [];
  for (const tile of tiles.values()) {
    if (!known(tile)) continue;
    if (
      isSea(tile.terrain) &&
      neighbors(tile).some((n) => {
        const t = tiles.get(key(n));
        return known(t) && !isSea(t!.terrain);
      })
    ) {
      water.set(key(tile), 1);
      shore.push(tile);
    }
    if (tile.terrain === 'BEACH') {
      inland.set(key(tile), 0);
      beaches.push(tile);
    }
  }
  fill(water, shore, 6, (t) => isSea(t.terrain));
  fill(
    inland,
    beaches,
    3,
    (t) => !isSea(t.terrain) && !['RIVER', 'SCORCHED', 'ALIEN'].includes(t.terrain!),
  );
  const palette = [0, 0x86b5a3, 0x57978f, 0x377783, 0x265969, 0x1e4054, 0x193346];
  const result: CoastalField = new Map();
  for (const tile of tiles.values()) {
    if (!known(tile)) continue;
    const k = key(tile);
    if (isSea(tile.terrain)) {
      const depth = water.get(k) ?? 7;
      result.set(k, { color: palette[depth] ?? 0x162d3e, depth });
    } else if (inland.has(k)) {
      const blend = biomeAppearance(seed, tile, tile.biome).blend;
      const base = blendedTerrainColor(tile.terrain!, blend),
        sand = blendedTerrainColor('BEACH', blend);
      const d = inland.get(k)!;
      result.set(k, { color: mixCoastColor(base, sand, [0, 0.48, 0.25, 0.09][d]) });
    }
  }
  return result;
}
const vertices = Array.from({ length: 6 }, (_, i) => ({
  x: Math.cos(((30 + 60 * i) * Math.PI) / 180) * (SIZE - 1),
  y: Math.sin(((30 + 60 * i) * Math.PI) / 180) * (SIZE - 1) * Y_SCALE,
}));
const edges = [
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: 1, r: 0 },
];
/** Small opaque strips feather the edges before the territory tint is applied. Canvas-compatible. */
export function drawCoastalBlend(
  g: Phaser.GameObjects.Graphics,
  tile: ViewTile,
  p: { x: number; y: number },
  field: CoastalField,
  tiles: ReadonlyMap<string, ViewTile>,
  seed: string,
  shade: (color: number) => number,
) {
  const own = field.get(key(tile));
  if (!own) return;
  for (let edge = 0; edge < 6; edge++) {
    const direction = edges[edge],
      other = tiles.get(key({ q: tile.q + direction.q, r: tile.r + direction.r }));
    if (!known(other) || isSea(tile.terrain) !== isSea(other!.terrain)) continue;
    if (['RIVER', 'SCORCHED', 'ALIEN'].includes(other!.terrain!)) continue;
    const adjacent =
      field.get(key(other!))?.color ??
      blendedTerrainColor(other!.terrain!, biomeAppearance(seed, other!, other!.biome).blend);
    if (adjacent === own.color) continue;
    const a = vertices[edge],
      b = vertices[(edge + 1) % 6];
    for (let i = 0; i < 7; i++) {
      const inner = 0.45 + (i * 0.55) / 7,
        outer = 0.45 + ((i + 1) * 0.55) / 7;
      g.fillStyle(shade(mixCoastColor(own.color, adjacent, (i + 0.5) / 14)), 1);
      g.fillPoints(
        [
          { x: p.x + a.x * inner, y: p.y + a.y * inner },
          { x: p.x + b.x * inner, y: p.y + b.y * inner },
          { x: p.x + b.x * outer, y: p.y + b.y * outer },
          { x: p.x + a.x * outer, y: p.y + a.y * outer },
        ],
        true,
      );
    }
  }
}
/** Sparse ornaments are deterministic and contained in the hex; never a gameplay obstacle. */
export function drawCoastalTerrain(
  g: Phaser.GameObjects.Graphics,
  tile: ViewTile,
  p: { x: number; y: number },
  tiles: ReadonlyMap<string, ViewTile>,
) {
  if (!tile.terrain) return;
  const seed = `${tile.q},${tile.r}`,
    dim = tile.visibility === 'EXPLORED' ? 0.4 : 1;
  if (isSea(tile.terrain)) {
    g.lineStyle(0.9, 0xb7d9d0, 0.25 * dim);
    for (let i = 0; i < 4; i++) {
      const x = p.x + (hash(seed + ':x' + i) - 0.5) * 44,
        y = p.y + (hash(seed + ':y' + i) - 0.5) * 26;
      g.lineBetween(x, y, x + 5 + hash(seed + i) * 9, y - 1.5);
    }
    // Two broken foam lines on the water side of the actual shoreline.
    edges.forEach((dir, i) => {
      const land = tiles.get(key({ q: tile.q + dir.q, r: tile.r + dir.r }));
      if (!known(land) || isSea(land!.terrain)) return;
      const a = vertices[i],
        b = vertices[(i + 1) % 6];
      for (const inset of [0.88, 0.96]) {
        g.lineStyle(inset === 0.96 ? 1.6 : 0.8, 0xe0e7c8, (inset === 0.96 ? 0.6 : 0.25) * dim);
        for (const [from, to] of [
          [0.08, 0.43],
          [0.53, 0.87],
        ])
          g.lineBetween(
            p.x + (a.x + (b.x - a.x) * from) * inset,
            p.y + (a.y + (b.y - a.y) * from) * inset,
            p.x + (a.x + (b.x - a.x) * to) * inset,
            p.y + (a.y + (b.y - a.y) * to) * inset,
          );
      }
    });
  } else if (tile.terrain === 'BEACH') {
    const snowy = tile.biome === 'SNOW',
      light = snowy ? 0xdce0d1 : 0xd5c49c,
      dark = snowy ? 0x7e9290 : 0x7e7053;
    g.lineStyle(0.8, light, 0.2 * dim);
    for (let i = 0; i < 3; i++) {
      const y = p.y - 8 + i * 6;
      g.lineBetween(p.x - 13 + i * 3, y, p.x + 10 + i, y - 2);
    }
    if (tile.building || tile.road) return;
    const variant = hash(seed + ':beach-decor');
    if (variant < 0.36) {
      // Low wind-sculpted dunes, with a shaded leeward face and a lit ridge.
      for (let i = 0; i < 2; i++) {
        const x = p.x - 7 + i * 15,
          y = p.y + 5 - i * 9,
          w = 16 + i * 3;
        g.fillStyle(dark, 0.22 * dim);
        g.fillEllipse(x, y + 4, w * 1.8, 8);
        g.fillStyle(snowy ? 0xb7c3bd : 0xb9a77c, 0.8 * dim);
        g.fillPoints(
          [
            { x: x - w, y: y + 2 },
            { x: x - 3, y: y - 7 },
            { x: x + 4, y: y - 5 },
            { x: x + w, y: y + 2 },
          ],
          true,
        );
        g.fillStyle(light, 0.65 * dim);
        g.fillPoints(
          [
            { x: x - w, y: y + 2 },
            { x: x - 3, y: y - 7 },
            { x: x + 3, y: y - 5 },
            { x: x + 6, y: y + 1 },
          ],
          true,
        );
        g.lineStyle(0.8, light, 0.8 * dim);
        g.lineBetween(x - w, y + 2, x - 3, y - 7);
      }
    } else if (variant < 0.49) {
      for (let i = 0; i < 3; i++) {
        const x = p.x - 9 + i * 8,
          y = p.y + 3 - (i % 2) * 5;
        g.fillStyle(0x393f37, 0.25 * dim);
        g.fillEllipse(x + 2, y + 3, 12, 5);
        g.fillStyle(snowy ? 0xadb6af : 0x858473, 0.85 * dim);
        g.fillPoints(
          [
            { x: x - 5, y: y + 1 },
            { x: x - 3, y: y - 5 },
            { x: x + 2, y: y - 6 },
            { x: x + 5, y: y },
            { x: x + 2, y: y + 3 },
          ],
          true,
        );
        g.lineStyle(1, light, 0.6 * dim);
        g.lineBetween(x - 3, y - 5, x + 2, y - 6);
      }
    } else if (variant < 0.62 && !snowy) {
      for (let i = 0; i < 3; i++) {
        const x = p.x - 11 + i * 10,
          y = p.y + 3 - (i % 2) * 6;
        g.lineStyle(1, 0x777c51, 0.8 * dim);
        g.lineBetween(x, y, x - 4, y - 6);
        g.lineBetween(x, y, x + 1, y - 9);
        g.lineBetween(x, y, x + 5, y - 4);
        g.lineStyle(0.8, light, 0.6 * dim);
        g.lineBetween(x + 1, y - 9, x + 2, y - 5);
      }
    }
  }
}
