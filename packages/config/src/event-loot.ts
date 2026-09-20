import type { Wallet } from './index';

/** Maritime encounters share an explicit land counterpart: exactly twice its resources. */
export const LAND_EVENT_REWARDS = {
  MONOLITH: { GOLD: 80, IRON: 30 },
  METEOR: { IRON: 90, GOLD: 45 },
  FORTRESS: { GOLD: 120, WOOD: 70 },
  RED_MOON: { GOLD: 70 },
  MIST: { FOOD: 100, GOLD: 35 },
  PORTAL: { GOLD: 110, IRON: 35 },
  COLOSSUS: { IRON: 150 },
  ROYAL_CARAVAN: { GOLD: 100, FOOD: 65 },
} satisfies Record<string, Partial<Wallet>>;
export const MARITIME_LOOT_COUNTERPARTS = {
  SHIPWRECK: 'FORTRESS',
  SEA_OBELISK: 'MONOLITH',
  DRIFTING_CARGO: 'ROYAL_CARAVAN',
  SUB_WRECK: 'METEOR',
} as const;
export function isMaritimeEncounter(kind: string): kind is keyof typeof MARITIME_LOOT_COUNTERPARTS {
  return Object.hasOwn(MARITIME_LOOT_COUNTERPARTS, kind);
}
export function eventResourceReward(event: {
  kind: string;
  reward: Partial<Wallet>;
}): Partial<Wallet> {
  if (!isMaritimeEncounter(event.kind)) return event.reward;
  const base = LAND_EVENT_REWARDS[MARITIME_LOOT_COUNTERPARTS[event.kind]];
  return Object.fromEntries(Object.entries(base).map(([resource, value]) => [resource, value * 2]));
}
