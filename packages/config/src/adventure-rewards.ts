import type { Wallet } from './index';

/** Multipliers over the former guaranteed loot. Abandonment fees are not increased. */
export const CONQUEST_REWARD_BOOST = {
  Escarmouche: 5,
  Assaut: 6,
  Siège: 8,
  'Grande campagne': 10,
} as const;
export const EXPEDITION_REWARD_BOOST = { RECON: 5, RECOVER: 7, EXTRACT: 10 } as const;

/** Materials supplement conquest gold/food to fund the next city investments. */
export function conquestReward(
  difficulty: keyof typeof CONQUEST_REWARD_BOOST,
  abandonmentCost: Partial<Wallet>,
  bonus = 1,
): Partial<Wallet> {
  const base = { Escarmouche: 2, Assaut: 2.5, Siège: 3, 'Grande campagne': 3 }[difficulty];
  const reward = Object.fromEntries(
    Object.entries(abandonmentCost).map(([resource, cost]) => [
      resource,
      Math.round(cost * base * bonus * CONQUEST_REWARD_BOOST[difficulty] * 10) / 10,
    ]),
  ) as Partial<Wallet>;
  const gold = reward.GOLD ?? 0;
  return {
    ...reward,
    WOOD: Math.round(gold * 0.6),
    STONE: Math.round(gold * 0.4),
    IRON: Math.round(gold * 0.3),
  };
}

/** Keep the historical rounding, then boost each guaranteed resource exactly once. */
export function expeditionReward(
  factor: number,
  mode: keyof typeof EXPEDITION_REWARD_BOOST,
): Wallet {
  const boost = EXPEDITION_REWARD_BOOST[mode];
  return {
    GOLD: Math.round(factor * 1.3) * boost,
    WOOD: Math.round(0.8 * factor * 1.3) * boost,
    STONE: Math.round(0.65 * factor * 1.3) * boost,
    IRON: Math.round(0.5 * factor * 1.3) * boost,
    FOOD: Math.round(0.9 * factor * 1.3) * boost,
  };
}
