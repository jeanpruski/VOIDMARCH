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

/** Search only the sea connected to an existing friendly ship; no inaccessible lake targets. */
export function navalMissionSite(s: GameState, realmId: string, offer: MissionOffer) {
  const ships = Object.values(s.units).filter(
    (u) => u.ownerId === realmId && UNIT_PROFILES[u.kind].naval && u.hp > 0,
  );
  if (!ships.length) return;
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
      const t = tileAt(s, n),
        k = key(n);
      if (isSea(t.terrain)) {
        if (!sea.has(k) && ships.some((ship) => distance(ship, n) <= 160)) {
          sea.set(k, n);
          queue.push(n);
        }
      } else if (['BEACH', 'PLAIN', 'HILL'].includes(t.terrain)) shoreline.set(k, n);
    }
  const candidates = [...shoreline.values()]
    .filter((p) => distance(p, capital) >= 20)
    .sort((a, b) => {
      const score = (p: Hex) => {
        const d = distance(p, capital);
        return d <= 40 ? hash(`${offer.id}:${key(p)}`) * 20 : d;
      };
      return score(a) - score(b);
    });
  for (const center of candidates) {
    if (Object.values(s.realms).some((r) => !r.defeatedAt && distance(r.capital, center) < 12))
      continue;
    const area = disk(center, 4);
    if (
      area.some((p) => {
        const t = tileAt(s, p);
        return (
          visible.has(key(p)) ||
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
        const t = tileAt(s, p);
        return (
          ['BEACH', 'PLAIN', 'HILL'].includes(t.terrain) &&
          neighbors(p).some((n) => sea.has(key(n)))
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
          (!UNIT_PROFILES[kind].naval || sea.has(key(p))) &&
          movementCost(tileAt(s, p), kind) <= UNITS[kind].move,
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
