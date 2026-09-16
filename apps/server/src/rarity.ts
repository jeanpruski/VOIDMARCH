import { randomInt } from 'node:crypto';
/** Server-only draw: one winning value out of 100, then an inclusive 10–30% bonus. */
export function rollRareBonus(draw: (max: number) => number = randomInt): number {
  return draw(100) === 0 ? 10 + draw(21) : 0;
}
