import type { MissionVictory, WorldView } from '@voidmarch/shared';
/** Fresh server awards only; loading a saved game never replays the whole trophy room. */
export function newVictories(before: WorldView | undefined, after: WorldView): MissionVictory[] {
  if (
    !before ||
    before.player.id !== after.player.id ||
    after.serverTimestamp < before.serverTimestamp
  )
    return [];
  const known = new Set(before.journal.flatMap((j) => (j.victory ? [j.victory.id] : [])));
  return [...after.journal].reverse().flatMap((j) => {
    const v = j.victory;
    if (
      !v ||
      known.has(v.id) ||
      v.at < Math.max(before.serverTimestamp, after.serverTimestamp - 15000)
    )
      return [];
    known.add(v.id);
    return [v];
  });
}
