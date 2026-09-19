import type { GameState, Hex } from '@voidmarch/shared';
import { isSea } from '@voidmarch/config';
import { distance, findPath, neighbors, realmBuildings, tileAt, vision, key } from './index';
/** Resource stocks are kingdom-wide; markets negotiate, ports dispatch the actual cargo. */
export function seaTradeRoute(s: GameState, from: string, to: string): Hex[] | undefined {
  const known = new Set(
    [from, to].flatMap((id) => [
      ...Object.keys(s.realms[id]?.explored ?? {}),
      ...(s.realms[id] ? vision(s, s.realms[id]) : []),
    ]),
  );
  const starts = realmBuildings(s, from).filter((b) => b.kind === 'PORT' && b.hp > 0);
  const ends = realmBuildings(s, to).filter((b) => b.kind === 'PORT' && b.hp > 0);
  const pairs = starts
    .flatMap((a) => ends.map((b) => ({ a, b })))
    .sort((x, y) => distance(x.a, x.b) - distance(y.a, y.b))
    .slice(0, 12);
  for (const { a, b } of pairs) {
    const departures = neighbors(a).filter((p) => isSea(tileAt(s, p).terrain));
    const arrivals = neighbors(b).filter((p) => isSea(tileAt(s, p).terrain));
    for (const start of departures)
      for (const end of arrivals) {
        const path = findPath(
          start,
          end,
          (p) => (known.has(key(p)) && isSea(tileAt(s, p).terrain) ? tileAt(s, p) : undefined),
          2048,
          new Set(),
          'TROOP_FERRY',
        );
        if (path) return [{ q: a.q, r: a.r }, start, ...path, { q: b.q, r: b.r }];
      }
  }
}
