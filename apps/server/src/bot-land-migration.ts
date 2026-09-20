import { isSea } from '@voidmarch/config';
import { disk, distance, key, neighbors, observe, tileAt } from '@voidmarch/game-rules';
import type { GameState, Hex, Unit } from '@voidmarch/shared';
import { log, refreshEnclosures, spawnPosition } from './engine';

/** Stop once enough connected land is found; never scan an entire continent. */
export function smallStartingIsland(s: GameState, capital: Hex) {
  const seen = new Set<string>(),
    queue = [capital];
  for (let i = 0; i < queue.length && seen.size < 217; i++) {
    const p = queue[i],
      k = key(p);
    if (seen.has(k) || isSea(tileAt(s, p).terrain)) continue;
    seen.add(k);
    for (const next of neighbors(p)) if (!seen.has(key(next))) queue.push(next);
  }
  return seen.size < 217;
}
/** Move only isolated bots, once. Interacting kingdoms are deferred, never overwritten. */
export function migrateBotLand(s: GameState, now: number) {
  if (!s.oceanVersion) return [];
  const moved: string[] = [];
  for (const realm of Object.values(s.realms)) {
    if (!realm.bot || realm.defeatedAt || realm.landSpawnVersion === 1) continue;
    if (!smallStartingIsland(s, realm.capital)) {
      realm.landSpawnVersion = 1;
      continue;
    }
    const id = realm.id,
      units = Object.values(s.units).filter((u) => u.ownerId === id),
      buildings = Object.values(s.buildings).filter((b) => b.ownerId === id);
    // Do not teleport a naval fleet inland, an army fighting away from home, or a campaign target.
    const points = [
      ...units,
      ...buildings,
      ...Object.values(s.tiles).filter((t) => t.ownerId === id || t.roadOwnerId === id),
    ];
    if (
      points.some((p) => distance(p, realm.capital) > 12) ||
      Object.values(s.strategy?.wars ?? {}).some(
        (w) => w.status === 'ACTIVE' && (w.from === id || w.to === id),
      ) ||
      [...units, ...buildings].some((p) => (p.lastDamagedAt ?? 0) > now - 90000) ||
      Object.values(s.strategy?.strikes ?? {}).some(
        (p) => !p.resolvedAt && distance(p, realm.capital) <= (p.radius ?? 2) + 12,
      ) ||
      Object.values(s.caravans).some((c) => c.ownerId === id || c.partnerId === id) ||
      Object.values(s.strategy?.sites ?? {}).some((p) => p.ownerId === id) ||
      Object.values(s.units).some((u) => u.ownerId !== id && distance(u, realm.capital) <= 14)
    )
      continue;
    const keys = new Set(points.map(key));
    for (const p of disk(realm.capital, 3)) keys.add(key(p));
    const tiles = [...keys].map((k) => {
      const [q, r] = k.split(',').map(Number);
      return tileAt(s, { q, r });
    });
    if (
      tiles.some(
        (t) =>
          (t.ownerId && t.ownerId !== id) ||
          (t.roadOwnerId && t.roadOwnerId !== id) ||
          (t.buildingId && s.buildings[t.buildingId]?.ownerId !== id),
      ) ||
      units.some((u) => isSea(tileAt(s, u).terrain))
    )
      continue;
    const old = { ...realm.capital },
      shift = (p: Hex, target: Hex) => ({ q: p.q + target.q - old.q, r: p.r + target.r - old.r });
    const blocked = new Set([
      ...Object.values(s.tiles)
        .filter((t) => t.ownerId || t.buildingId || t.road)
        .map(key),
      ...Object.values(s.units).map(key),
      ...Object.values(s.events).map(key),
      ...Object.values(s.strategy?.sites ?? {}).map(key),
      ...Object.values(s.realms)
        .filter((r) => !r.bot)
        .flatMap((r) =>
          Object.values(r.explored)
            .filter((t) => t.visibility !== 'UNKNOWN')
            .map(key),
        ),
    ]);
    let destination: Hex;
    try {
      destination = spawnPosition(s, id, (target) =>
        tiles.every((t) => {
          const p = shift(t, target),
            terrain = tileAt(s, p).terrain;
          return (
            !blocked.has(key(p)) &&
            !isSea(terrain) &&
            terrain !== 'SCORCHED' &&
            !Object.values(s.strategy?.strikes ?? {}).some(
              (strike) => !strike.resolvedAt && distance(strike, p) <= (strike.radius ?? 2),
            )
          );
        }),
      );
    } catch {
      continue;
    }
    // Materialize the moved land first. Old terrain remains as unclaimed history, not erased sea.
    for (const t of tiles) {
      const p = shift(t, destination);
      s.tiles[key(p)] = {
        ...t,
        ...p,
        terrain: isSea(t.terrain) ? tileAt(s, p).terrain : t.terrain,
        capture: undefined,
      };
      const previous = s.tiles[key(t)];
      if (previous) {
        delete previous.ownerId;
        delete previous.buildingId;
        delete previous.enclosureOwnerId;
        delete previous.capture;
        delete previous.road;
        delete previous.roadOwnerId;
      }
    }
    const moveUnit = (u: Unit) => {
      Object.assign(u, shift(u, destination));
      for (const passenger of u.cargo ?? []) moveUnit(passenger);
    };
    units.forEach(moveUnit);
    for (const b of buildings) Object.assign(b, shift(b, destination));
    realm.capital = destination;
    realm.settings.lastCameraQ = destination.q;
    realm.settings.lastCameraR = destination.r;
    realm.explored = {};
    realm.landSpawnVersion = 1;
    observe(s, realm, now);
    moved.push(id);
    log(
      s,
      `${realm.name} a quitté son îlot pour une région terrestre. Bâtiments, unités et réserves conservés.`,
      'WORLD',
      now,
      undefined,
      destination,
    );
  }
  if (moved.length) {
    refreshEnclosures(s, now);
    s.revision++;
  }
  return moved;
}
