import { disk, key } from '@voidmarch/game-rules';
import type { GameState, Hex } from '@voidmarch/shared';

/** Unknown first, remembered but unseen second, visible only as a fallback.
 * Rank existing geography without changing it; callers still validate occupation and access. */
export function placementOrder<T extends Hex>(
  s: GameState,
  id: string,
  candidates: readonly T[],
  visible: ReadonlySet<string>,
  radius: number,
): T[] {
  const owned = new Set(
    [...Object.values(s.units), ...Object.values(s.buildings)]
      .filter((x) => x.ownerId === id)
      .map(key),
  );
  return candidates
    .map((p, index) => {
      const cells = disk(p, radius);
      const exposed = cells.some((h) => visible.has(key(h)));
      const rank = exposed ? 2 : cells.some((h) => s.realms[id].explored[key(h)]) ? 1 : 0;
      const density = exposed
        ? disk(p, radius + 5).reduce((n, h) => n + Number(owned.has(key(h))), 0)
        : 0;
      return { p, index, rank, density };
    })
    .sort((a, b) => a.rank - b.rank || a.density - b.density || a.index - b.index)
    .map((x) => x.p);
}

export function completedMissionTitles(s: GameState, id: string) {
  return new Set(
    (s.missions?.[id]?.trophies ?? [])
      .filter((t) => !t.mission.expedition)
      .map((t) => t.mission.title.replace(/^Grande campagne · /, '')),
  );
}
export function completedExpeditionSites(s: GameState, id: string) {
  return new Set(
    (s.missions?.[id]?.trophies ?? []).flatMap((t) =>
      t.mission.expedition ? [t.mission.expedition.siteId] : [],
    ),
  );
}
