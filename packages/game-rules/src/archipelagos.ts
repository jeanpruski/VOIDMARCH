import type { GameState, Hex } from '@voidmarch/shared';
import type { Terrain } from '@voidmarch/config';
import { mainlandWater, oceanNoise } from './oceans';

export const ARCHIPELAGO_SPACING = 144;
export interface ArchipelagoIsland extends Hex {
  radius: number;
  kind: 'LIGHTHOUSE' | 'RUINED_PORT' | 'MINERAL_CACHE';
}
const caches = new WeakMap<GameState, Map<string, ArchipelagoIsland[]>>();
export function clearArchipelagoCache(s: GameState) {
  caches.delete(s);
}
const random = (seed: string, q: number, r: number) => oceanNoise(seed, q * 17, r * 17, 1);
const radial = (q: number, r: number) => Math.sqrt(q * q + q * r + r * r);

/** Fixed, widely separated candidates; only complete clusters in open water are accepted. */
export function archipelagoInSector(s: GameState, q: number, r: number): ArchipelagoIsland[] {
  if (!s.archipelagoVersion || !s.oceanVersion) return [];
  let cache = caches.get(s);
  if (!cache) caches.set(s, (cache = new Map()));
  const k = `${q},${r}`;
  const previous = cache.get(k);
  if (previous) return previous;
  const center = {
    q: q * ARCHIPELAGO_SPACING + 72 + Math.floor(random(s.seed + ':arch-q', q, r) * 25) - 12,
    r: r * ARCHIPELAGO_SPACING + 72 + Math.floor(random(s.seed + ':arch-r', q, r) * 25) - 12,
  };
  // 48 cells enclose the islands, their beaches and a navigable sea margin.
  // Keeping a whole cluster out of preserved geography avoids chopped-off islands.
  for (let x = Math.floor((center.q - 48) / 16); x <= Math.floor((center.q + 48) / 16); x++)
    for (let y = Math.floor((center.r - 48) / 16); y <= Math.floor((center.r + 48) / 16); y++)
      if (s.archipelagoPreserved?.[`${x},${y}`]) {
        cache.set(k, []);
        return [];
      }
  const islands: ArchipelagoIsland[] = [
    {
      ...center,
      radius: 9 + Math.floor(random(s.seed + ':arch-size', q, r) * 3),
      kind: 'LIGHTHOUSE',
    },
  ];
  const phase = random(s.seed + ':arch-angle', q, r) * Math.PI * 2;
  const count = random(s.seed + ':arch-count', q, r) < 0.6 ? 3 : 2;
  for (let i = 1; i < count; i++) {
    const angle = phase + (i - 1) * Math.PI;
    const dx = Math.cos(angle),
      dy = Math.sin(angle),
      norm = radial(dx, dy);
    islands.push({
      q: center.q + Math.round((dx / norm) * 27),
      r: center.r + Math.round((dy / norm) * 27),
      radius: 5 + Math.floor(random(s.seed + ':arch-small' + i, q, r) * 2),
      kind: i === 1 ? 'RUINED_PORT' : 'MINERAL_CACHE',
    });
  }
  // Sample all cells around each island, including a water moat. No attachment to a mainland.
  for (const island of islands) {
    const bound = island.radius + 9;
    for (let x = -bound; x <= bound; x++)
      for (let y = -bound; y <= bound; y++) {
        if (radial(x, y) > island.radius + 7) continue;
        if (!mainlandWater(s, { q: island.q + x, r: island.r + y })) {
          cache.set(k, []);
          return [];
        }
      }
  }
  if (cache.size > 4096) cache.clear();
  cache.set(k, islands);
  return islands;
}
export function archipelagoAt(s: GameState, p: Hex): ArchipelagoIsland | undefined {
  if (!s.archipelagoVersion) return;
  // Candidate centers remain at least 60 cells from sector edges; every island fits its sector.
  const islands = archipelagoInSector(
    s,
    Math.floor(p.q / ARCHIPELAGO_SPACING),
    Math.floor(p.r / ARCHIPELAGO_SPACING),
  );
  return islands.find(
    (i) =>
      radial(p.q - i.q, p.r - i.r) <=
      i.radius + (oceanNoise(s.seed + ':island-edge', p.q, p.r, 5) - 0.5) * 3,
  );
}
export function islandInterior(s: GameState, p: Hex, island: ArchipelagoIsland): Terrain {
  if (p.q === island.q && p.r === island.r)
    return island.kind === 'MINERAL_CACHE' ? 'HILL' : 'RUINS';
  const h = random(s.seed + ':island-ground', p.q, p.r);
  if (island.kind === 'MINERAL_CACHE')
    return h < 0.45 ? 'HILL' : h < 0.65 ? 'MOUNTAIN' : h < 0.82 ? 'FOREST' : 'PLAIN';
  return h < 0.45 ? 'PLAIN' : h < 0.75 ? 'FOREST' : h < 0.94 ? 'HILL' : 'MOUNTAIN';
}
/** Freeze only old geography exclusions. Later exploration never moves or erases an island. */
export function migrateArchipelagos(s: GameState) {
  if (s.archipelagoVersion || !s.oceanVersion) return false;
  const preserved: Record<string, true> = {};
  const protect = (p: Hex) => {
    preserved[`${Math.floor(p.q / 16)},${Math.floor(p.r / 16)}`] = true;
  };
  for (const t of Object.values(s.tiles)) protect(t);
  for (const r of Object.values(s.realms)) {
    protect(r.capital);
    for (const t of Object.values(r.explored)) if (t.visibility !== 'UNKNOWN') protect(t);
  }
  for (const a of Object.values(s.archives)) {
    protect(a.realm.capital);
    for (const t of [...a.tiles, ...a.units, ...a.buildings, ...Object.values(a.realm.explored)])
      protect(t);
  }
  for (const p of [
    ...Object.values(s.units),
    ...Object.values(s.buildings),
    ...Object.values(s.events),
    ...Object.values(s.strategy?.sites ?? {}),
  ])
    protect(p);
  for (const m of Object.values(s.missions ?? {})) if (m.active) protect(m.active);
  for (const c of Object.values(s.caravans)) for (const p of [c, ...c.path]) protect(p);
  for (const strike of Object.values(s.strategy?.strikes ?? {}))
    if (!strike.resolvedAt) {
      const radius = (strike.radius ?? 2) + 4;
      for (let q = -radius; q <= radius; q++)
        for (let r = -radius; r <= radius; r++) protect({ q: strike.q + q, r: strike.r + r });
    }
  s.archipelagoPreserved = preserved;
  s.archipelagoVersion = 1;
  clearArchipelagoCache(s);
  s.revision++;
  return true;
}
