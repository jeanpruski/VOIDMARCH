import type { UnitKind, Wallet } from './index';
export const NPC_RULES = {
  ownerId: 'neutral-encounters',
  interval: 300_000,
  chance: 0.2,
  perZone: 2,
  globalCap: 60,
  lifetime: 45 * 60_000,
  apChance: 0.15,
} as const;
export const NPCS = {
  deserter: {
    name: 'Déserteur des brumes',
    kind: 'RIFLEMAN',
    hp: 12,
    attack: 4,
    defense: 1,
    range: 2,
    danger: 'Modéré',
    reward: { GOLD: 25, FOOD: 20 },
  },
  marauder: {
    name: 'Pillard cuirassé',
    kind: 'GUARD',
    hp: 18,
    attack: 5,
    defense: 2,
    range: 1,
    danger: 'Modéré',
    reward: { GOLD: 30, WOOD: 25, STONE: 15 },
  },
  cultist: {
    name: 'Cultiste des ondes',
    kind: 'VOID_ACOLYTE',
    hp: 16,
    attack: 6,
    defense: 1,
    range: 3,
    danger: 'Dangereux',
    reward: { GOLD: 40, IRON: 20 },
  },
  mutant: {
    name: 'Égaré irradié',
    kind: 'GUARD',
    hp: 24,
    attack: 7,
    defense: 2,
    range: 1,
    danger: 'Dangereux',
    reward: { IRON: 35, FOOD: 25 },
  },
  rider: {
    name: 'Motard des cendres',
    kind: 'MOTORCYCLE',
    hp: 20,
    attack: 6,
    defense: 2,
    range: 2,
    danger: 'Dangereux',
    reward: { GOLD: 35, IRON: 25, WOOD: 15 },
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
