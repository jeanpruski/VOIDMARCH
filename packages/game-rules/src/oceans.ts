import { archipelagoAt, islandInterior, clearArchipelagoCache } from './archipelagos';
import type { GameState, Hex, CoastalSea } from '@voidmarch/shared';
import { generateTile } from './index';
import type { Terrain } from '@voidmarch/config';

const cellKey = (p: Hex) => `${Math.floor(p.q / 16)},${Math.floor(p.r / 16)}`;
function random(seed: string, x: number, y: number) {
  let n = 2166136261;
  for (const c of `${seed}:sea:${x}:${y}`) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  n ^= n >>> 16;
  n = Math.imul(n, 0x85ebca6b);
  n ^= n >>> 13;
  return (n >>> 0) / 4294967296;
}
const smooth = (v: number) => v * v * (3 - 2 * v);
export function oceanNoise(seed: string, q: number, r: number, scale: number) {
  const x = q / scale,
    y = r / scale,
    ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = smooth(x - ix),
    fy = smooth(y - iy);
  const a = random(seed, ix, iy) * (1 - fx) + random(seed, ix + 1, iy) * fx;
  const b = random(seed, ix, iy + 1) * (1 - fx) + random(seed, ix + 1, iy + 1) * fx;
  return a * (1 - fy) + b * fy;
}
const distance = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
const offsets = Array.from({ length: 7 }, (_, i) => i - 3)
  .flatMap((q) =>
    Array.from({ length: 7 }, (_, i) => i - 3)
      .filter((r) => distance(q, r) <= 3)
      .map((r) => ({ q, r, d: distance(q, r) })),
  )
  .sort((a, b) => a.d - b.d);
const caches = new WeakMap<GameState, Map<string, boolean>>();
export function clearOceanCache(s: GameState) {
  caches.delete(s);
  clearArchipelagoCache(s);
}
/** Rounded, irregular coastline. Persisted centers and radii never follow the camera. */
export function coastalSeaWater(seed: string, sea: CoastalSea, p: Hex) {
  const q = p.q - sea.q,
    r = p.r - sea.r;
  const radial = Math.sqrt(q * q + q * r + r * r);
  if (radial > sea.radius + 4) return false;
  if (radial <= sea.radius - 4) return true;
  return radial <= sea.radius + (oceanNoise(seed + sea.id, p.q, p.r, 11) - 0.5) * 8;
}
/** Coast noise has no dependency on the time, camera, or order of exploration. */
export function mainlandWater(s: GameState, p: Hex): boolean {
  if (!s.oceanVersion) return false;
  let cache = caches.get(s);
  if (!cache) caches.set(s, (cache = new Map()));
  const k = `${p.q},${p.r}`;
  const cached = cache.get(k);
  if (cached !== undefined) return cached;
  if ((s.coastalSeas ?? []).some((sea) => coastalSeaWater(s.seed, sea, p))) {
    cache.set(k, true);
    return true;
  }
  // A generous inland start and a buffer around every preserved legacy region.
  let protectedLand =
    distance(p.q, p.r) < 24 + oceanNoise(s.seed + 'start-coast', p.q, p.r, 17) * 6;
  if (!protectedLand && s.protectedLand) {
    const cx = Math.floor(p.q / 16),
      cy = Math.floor(p.r / 16);
    const buffer = 8 + oceanNoise(s.seed + 'legacy-coast', p.q, p.r, 13) * 12;
    for (let x = -2; x <= 2 && !protectedLand; x++)
      for (let y = -2; y <= 2; y++)
        if (s.protectedLand[`${cx + x},${cy + y}`]) {
          const dx = Math.max((cx + x) * 16 - p.q, 0, p.q - ((cx + x) * 16 + 15));
          const dy = Math.max((cy + y) * 16 - p.r, 0, p.r - ((cy + y) * 16 + 15));
          if (dx * dx + dy * dy <= buffer * buffer) {
            protectedLand = true;
            break;
          }
        }
  }
  const warpQ = (oceanNoise(s.seed + 'warp-q', p.q, p.r, 43) - 0.5) * 24;
  const warpR = (oceanNoise(s.seed + 'warp-r', p.q, p.r, 39) - 0.5) * 24;
  const value =
    oceanNoise(s.seed, p.q + warpQ, p.r + warpR, 110) * 0.7 +
    oceanNoise(s.seed + 'bays', p.q, p.r, 31) * 0.3;
  const water = !protectedLand && value < 0.46;
  if (cache.size > 120000) cache.clear();
  cache.set(k, water);
  return water;
}
export function oceanWater(s: GameState, p: Hex): boolean {
  return mainlandWater(s, p) && !archipelagoAt(s, p);
}
export function oceanTerrain(s: GameState, p: Hex): Terrain | undefined {
  if (!s.oceanVersion) return;
  const water = oceanWater(s, p);
  let opposite = 4;
  for (const o of offsets) {
    if (!o.d || o.d >= opposite) continue;
    if (oceanWater(s, { q: p.q + o.q, r: p.r + o.r }) !== water) opposite = o.d;
  }
  if (water) return opposite <= 2 ? 'COAST' : 'SEA';
  const width = oceanNoise(s.seed + 'beach', p.q, p.r, 19) > 0.5 ? 3 : 2;
  if (opposite <= width) return 'BEACH';
  const island = archipelagoAt(s, p);
  if (island) return islandInterior(s, p, island);
}
/** Idempotent migration. Save memories verbatim before enabling the new generator. */
export function migrateOceans(s: GameState) {
  if (s.oceanVersion) return false;
  s.protectedLand = {};
  const protect = (p: Hex) => {
    s.protectedLand![cellKey(p)] = true;
  };
  for (const t of Object.values(s.tiles)) protect(t);
  for (const r of Object.values(s.realms)) {
    protect(r.capital);
    for (const [k, t] of Object.entries(r.explored)) {
      if (!t.terrain || t.visibility === 'UNKNOWN') continue;
      protect(t);
      const legacy = generateTile(s.seed, t);
      if (!s.tiles[k] && (legacy.terrain !== t.terrain || (t.biome && legacy.biome !== t.biome)))
        s.tiles[k] = {
          q: t.q,
          r: t.r,
          terrain: t.terrain,
          biome: t.biome,
          poi: t.poi,
          exhausted: t.exhausted,
        };
    }
  }
  for (const a of Object.values(s.archives)) {
    protect(a.realm.capital);
    for (const t of [...a.tiles, ...Object.values(a.realm.explored)]) protect(t);
  }
  for (const p of [
    ...Object.values(s.units),
    ...Object.values(s.buildings),
    ...Object.values(s.events),
    ...Object.values(s.strategy?.sites ?? {}),
  ])
    protect(p);
  s.oceanVersion = 1;
  s.revision++;
  return true;
}
