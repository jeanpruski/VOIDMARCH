import type { Wallet } from './index';

export const LOGISTICS_WINDOW = 60 * 60 * 1000;
export const LOGISTICS_AMOUNTS = [1, 5, 10] as const;
export const LOGISTICS_RECIPES = {
  RATIONS: {
    name: 'Ravitaillement',
    level: 1,
    stage: 1,
    cost: { FOOD: 100, GOLD: 40 },
  },
  INDUSTRY: {
    name: 'Mobilisation industrielle',
    level: 2,
    stage: 2,
    cost: { WOOD: 65, STONE: 55, IRON: 40 },
  },
  OCCULT: {
    name: 'Surcharge occulte',
    level: 4,
    stage: 4,
    cost: { FOOD: 50, GOLD: 20, WOOD: 25, STONE: 25, IRON: 65 },
  },
} as const;
export type LogisticsRecipe = keyof typeof LOGISTICS_RECIPES;
export interface LogisticsReceipt {
  at: number;
  amount: number;
}
export function logisticsDiscount(level: number) {
  return Math.max(0, Math.min(4, level - 1)) * 5;
}
export function logisticsCost(
  recipe: LogisticsRecipe,
  amount: number,
  level: number,
  strategicDiscount = 0,
): Partial<Wallet> {
  // Round the unit price first: splitting a batch never changes the price.
  return Object.fromEntries(
    Object.entries(LOGISTICS_RECIPES[recipe].cost).map(([r, n]) => [
      r,
      Math.ceil(
        (n *
          (100 - logisticsDiscount(level)) *
          (100 - Math.max(0, Math.min(15, strategicDiscount)))) /
          10000,
      ) * amount,
    ]),
  );
}
export function logisticsQuota(
  stage: number,
  receipts: readonly LogisticsReceipt[] = [],
  now: number,
) {
  const recent = receipts.filter((r) => r.at > now - LOGISTICS_WINDOW);
  const limit = 10 + 5 * (Math.max(1, Math.min(5, stage)) - 1);
  const used = recent.reduce((sum, r) => sum + r.amount, 0);
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    recent,
    nextAt: recent.length ? Math.min(...recent.map((r) => r.at)) + LOGISTICS_WINDOW : undefined,
  };
}
