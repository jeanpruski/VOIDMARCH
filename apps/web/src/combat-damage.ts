import type { Hex, JournalEntry, WorldView } from '@voidmarch/shared';
import { key } from '@voidmarch/game-rules';

export type CombatDamage = Hex & NonNullable<JournalEntry['damage']> & { id: string };

/** Authoritative reports only: predictions and HP snapshot deltas cannot create numbers. */
export function combatDamage(before: WorldView, after: WorldView): CombatDamage[] {
  if (before.player.id !== after.player.id || after.serverTimestamp < before.serverTimestamp)
    return [];
  const known = new Set(before.journal.map((entry) => entry.id));
  const visible = new Set(before.tiles.filter((t) => t.visibility === 'VISIBLE').map(key));
  return [...after.journal].reverse().flatMap((entry) => {
    if (
      entry.kind !== 'COMBAT' ||
      !entry.damage ||
      known.has(entry.id) ||
      entry.at < Math.max(before.serverTimestamp, after.serverTimestamp - 15000) ||
      entry.q === undefined ||
      entry.r === undefined ||
      !visible.has(key({ q: entry.q, r: entry.r })) ||
      !Number.isFinite(entry.damage.amount) ||
      entry.damage.amount < 0
    )
      return [];
    known.add(entry.id);
    // Before-visibility also preserves a lethal hit when the last scout loses vision.
    return [{ id: entry.id, q: entry.q, r: entry.r, ...entry.damage }];
  });
}
