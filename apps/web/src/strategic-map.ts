import { key, neighbors } from '@voidmarch/game-rules';
import type { OverviewTile, WorldView } from '@voidmarch/shared';
import { MAP_ZOOM } from './map-geometry';

// Wheel and buttons change zoom multiplicatively: reserve the last 10% of
// that travel for strategy, with a small hysteresis to avoid flickering.
export const STRATEGIC_ZOOM = {
  enter: MAP_ZOOM.min * (MAP_ZOOM.max / MAP_ZOOM.min) ** 0.1,
  exit: MAP_ZOOM.min * (MAP_ZOOM.max / MAP_ZOOM.min) ** 0.14,
  detail: 0.6,
};
export const strategicAtZoom = (zoom: number, active: boolean) =>
  active ? zoom < STRATEGIC_ZOOM.exit : zoom <= STRATEGIC_ZOOM.enter;

export type StrategicTile = OverviewTile & { borders: number[] };
/** Only the player's known map; current tiles take precedence over remembered ones. */
export function strategicTiles(world: Pick<WorldView, 'tiles' | 'overview'>): StrategicTile[] {
  const tiles = new Map<string, OverviewTile>();
  for (const t of [...(world.overview ?? []), ...world.tiles])
    if (t.visibility !== 'UNKNOWN') tiles.set(key(t), t);
  return [...tiles.values()].map((t) => ({
    q: t.q,
    r: t.r,
    ownerId: t.ownerId,
    visibility: t.visibility,
    borders: t.ownerId
      ? neighbors(t).flatMap((n, i) =>
          tiles.get(key(n))?.ownerId === t.ownerId ? [] : [(5 - i + 6) % 6],
        )
      : [],
  }));
}
