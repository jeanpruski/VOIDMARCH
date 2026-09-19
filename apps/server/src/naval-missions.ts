import { placementOrder } from './mission-placement';
import { UNIT_PROFILES, UNITS, isSea, type UnitKind } from '@voidmarch/config';
import {
  disk,
  distance,
  key,
  neighbors,
  tileAt,
  vision,
  hash,
  movementCost,
} from '@voidmarch/game-rules';
import type { GameState, Hex, MissionOffer } from '@voidmarch/shared';

/** Prefer the existing fleet’s sea, then search distant coasts even before a fleet exists. */
export function navalMissionSite(s: GameState, realmId: string, offer: MissionOffer) {
  const ships = Object.values(s.units).filter(
    (u) => u.ownerId === realmId && UNIT_PROFILES[u.kind].naval && u.hp > 0,
  );
  if (!s.oceanVersion) return;
  const terrainCache = new Map<string, ReturnType<typeof tileAt>>();
  const terrainAt = (p: Hex) => {
    const k = key(p);
    let t = terrainCache.get(k);
    if (!t) {
      t = tileAt(s, p);
      terrainCache.set(k, t);
    }
    return t;
  };
  const visible = vision(s, s.realms[realmId]);
  const occupied = new Set(
    [
      ...Object.values(s.units),
      ...Object.values(s.buildings),
      ...Object.values(s.events),
      ...Object.values(s.strategy?.sites ?? {}),
    ].map(key),
  );
  const sea = new Map<string, Hex>();
  const queue: Hex[] = [...ships];
  for (const p of queue) sea.set(key(p), p);
  const capital = s.realms[realmId].capital;
  const shoreline = new Map<string, Hex>();
  // Finite work per acceptance. Expansion follows water, never cuts across continents.
  for (let i = 0; i < queue.length && i < 30000; i++)
    for (const n of neighbors(queue[i])) {
      const t = terrainAt(n),
        k = key(n);
      if (isSea(t.terrain)) {
        if (!sea.has(k) && ships.some((ship) => distance(ship, n) <= 160)) {
          sea.set(k, n);
          queue.push(n);
        }
      } else if (['BEACH', 'PLAIN', 'HILL'].includes(t.terrain)) shoreline.set(k, n);
    }
  const connectedCoasts = new Set(shoreline.keys());
  // A fixed, bounded survey includes distant seas without tying missions to fleet ownership.
  // Search out to at least 1,200 hexes, beyond legacy explored-land protection when necessary.
  const maxRange = Object.keys(s.protectedLand ?? {}).reduce((limit, k) => {
    const [q, r] = k.split(',').map(Number);
    return Math.max(limit, distance(capital, { q: q * 16, r: r * 16 }) + 200);
  }, 1200);
  for (let i = 0; i < 6000; i++) {
    const range = 20 + ((maxRange - 20) * i) / 6000;
    const angle = (hash(`${s.seed}:${realmId}:coasts`) + i * 0.38196601125) * Math.PI * 2;
    const q = Math.cos(angle),
      r = Math.sin(angle);
    const norm = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
    const p = {
      q: capital.q + Math.round((q / norm) * range),
      r: capital.r + Math.round((r / norm) * range),
    };
    if (terrainAt(p).terrain !== 'COAST') continue;
    for (const n of disk(p, 2))
      if (
        ['BEACH', 'PLAIN', 'HILL'].includes(terrainAt(n).terrain) &&
        neighbors(n).some((h) => isSea(terrainAt(h).terrain))
      )
        shoreline.set(key(n), n);
  }
  const candidates = [...shoreline.values()]
    .filter((p) => distance(p, capital) >= 20)
    .sort((a, b) => {
      const score = (p: Hex) => {
        const d = distance(p, capital);
        return d <= 40 ? hash(`${offer.id}:${key(p)}`) * 20 : d;
      };
      return (
        Number(connectedCoasts.has(key(b))) - Number(connectedCoasts.has(key(a))) ||
        score(a) - score(b)
      );
    });
  for (const center of placementOrder(s, realmId, candidates, visible, 4)) {
    if (Object.values(s.realms).some((r) => !r.defeatedAt && distance(r.capital, center) < 12))
      continue;
    const area = disk(center, 4);
    if (
      area.some((p) => {
        const t = terrainAt(p);
        return (
          occupied.has(key(p)) ||
          t.ownerId ||
          t.buildingId ||
          t.road ||
          t.poi ||
          t.terrain === 'SCORCHED'
        );
      })
    )
      continue;
    if (
      Object.values(s.strategy?.strikes ?? {}).some(
        (strike) => !strike.resolvedAt && distance(strike, center) < 12,
      )
    )
      continue;
    const buildingSpots = [center, ...neighbors(center)]
      .filter((p) => {
        const t = terrainAt(p);
        return (
          ['BEACH', 'PLAIN', 'HILL'].includes(t.terrain) &&
          neighbors(p).some((n) => isSea(terrainAt(n).terrain))
        );
      })
      .slice(0, offer.buildings.length);
    if (buildingSpots.length !== offer.buildings.length) continue;
    const used = new Set(buildingSpots.map(key));
    const spots: Hex[] = [];
    for (const kind of offer.units) {
      const p = area.find(
        (p) =>
          !used.has(key(p)) &&
          (!UNIT_PROFILES[kind].naval || isSea(terrainAt(p).terrain)) &&
          movementCost(terrainAt(p), kind) <= UNITS[kind].move,
      );
      if (!p) break;
      spots.push(p);
      used.add(key(p));
    }
    if (spots.length === offer.units.length) return { center, spots, buildingSpots };
  }
}
export function navalMissionFleet(level: number): UnitKind[] {
  const fleet: UnitKind[][] = [
    ['WAR_GALLEY', 'SCOUT_LONGSHIP', 'TROOP_FERRY'],
    ['CANNON_FRIGATE', 'ESCORT_CORVETTE', 'TROOP_BRIG'],
    ['SONAR_DESTROYER', 'BLACK_SUBMARINE', 'LANDING_SHIP'],
    ['MISSILE_ESCORT', 'HUNTER_SUBMARINE', 'AMPHIBIOUS_TRANSPORT'],
    ['NUCLEAR_DREADNOUGHT', 'ABYSSAL_SUBMARINE', 'OCCULT_ARK'],
  ];
  return fleet[Math.max(0, Math.min(4, level - 1))];
}
