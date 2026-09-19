import type { UnitKind, Wallet } from './index';
export const NPC_RULES = {
  ownerId: 'neutral-encounters',
  interval: 300_000,
  chance: 0.05,
  perZone: 1,
  globalCap: 30,
  lifetime: 45 * 60_000,
  apChance: 0.65,
} as const;
export const NPCS = {
  deserter: {
    name: 'Déserteur des brumes',
    kind: 'RIFLEMAN',
    hp: 24,
    attack: 6,
    defense: 1,
    range: 2,
    danger: 'Modéré',
    reward: { GOLD: 90, FOOD: 70 },
  },
  marauder: {
    name: 'Pillard cuirassé',
    kind: 'GUARD',
    hp: 38,
    attack: 7,
    defense: 5,
    range: 1,
    danger: 'Modéré',
    reward: { GOLD: 100, WOOD: 85, STONE: 65 },
  },
  cultist: {
    name: 'Cultiste des ondes',
    kind: 'VOID_ACOLYTE',
    hp: 28,
    attack: 10,
    defense: 1,
    range: 3,
    danger: 'Dangereux',
    reward: { GOLD: 140, IRON: 90 },
  },
  mutant: {
    name: 'Égaré irradié',
    kind: 'GUARD',
    hp: 58,
    attack: 9,
    defense: 3,
    range: 1,
    danger: 'Dangereux',
    reward: { GOLD: 100, IRON: 140, FOOD: 90 },
  },
  rider: {
    name: 'Motard des cendres',
    kind: 'MOTORCYCLE',
    hp: 36,
    attack: 8,
    defense: 3,
    range: 2,
    danger: 'Dangereux',
    reward: { GOLD: 120, IRON: 100, WOOD: 75 },
  },
} as const satisfies Record<
  string,
  {
    name: string;
    kind: UnitKind;
    hp: number;
    attack: number;
    defense: number;
    range: number;
    danger: string;
    reward: Partial<Wallet>;
  }
>;
export type NpcKind = keyof typeof NPCS;

/** Existing encounters retain their stored stats and loot; these apply at spawn only. */
export const NPC_LEVELS = [
  { name: 'Errant', stats: 1, loot: 1 },
  { name: 'Aguerri', stats: 1.4, loot: 2.5 },
  { name: 'Vétéran', stats: 2, loot: 5 },
  { name: 'Élite', stats: 3, loot: 10 },
  { name: 'Némésis', stats: 4.5, loot: 18 },
] as const;
