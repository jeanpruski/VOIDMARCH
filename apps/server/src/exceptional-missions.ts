import { hash } from '@voidmarch/game-rules';

/** One 5% roll for the board, then one eligible slot. Seed excludes buildings/fleet. */
export function exceptionalOfferIndex(windowSeed: string, levels: readonly number[]): number {
  if (hash(`${windowSeed}:exceptional-chance`) >= 0.05) return -1;
  const eligible = levels.flatMap((level, index) => (level < 5 ? [index] : []));
  if (!eligible.length) return -1;
  return eligible[Math.floor(hash(`${windowSeed}:exceptional-slot`) * eligible.length)];
}
