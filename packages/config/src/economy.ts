import type { BuildingKind, Wallet } from './index';

/** Multipliers relative to the v0.4 catalogue. Foundations remain accessible. */
export const PRICE_MULTIPLIERS = [1, 1.5, 2.5, 4, 7, 10, 12, 15] as const;
export const BUILDING_ECONOMIC_TIERS = {
  CAMP: 0,
  OUTPOST: 0,
  VILLAGE: 1,
  HOUSE: 0,
  WELL: 0,
  FARM: 0,
  LUMBER: 0,
  QUARRY: 0,
  MINE: 0,
  HUNTER: 0,
  FISHERY: 0,
  BARRACKS: 0,
  ARCHERY: 0,
  WOOD_WALL: 0,
  STONE_WALL: 1,
  STEEL_WALL: 2,
  GRANARY: 1,
  WAREHOUSE: 1,
  STABLE: 1,
  MONASTERY: 1,
  BAKERY: 1,
  MARKET: 1,
  TOWER: 1,
  WORKSHOP: 2,
  GOLD_MINE: 2,
  FORGE: 2,
  LIBRARY: 2,
  FORT: 2,
  RAIL_DEPOT: 2,
  STEAM_SAWMILL: 3,
  MECHANIZED_QUARRY: 3,
  INDUSTRIAL_MINE: 3,
  ARSENAL: 3,
  GARAGE: 3,
  REFINERY: 3,
  MUNITIONS: 3,
  RADIO: 3,
  BUNKER: 3,
  FIELD_HOSPITAL: 3,
  GUN_BATTERY: 3,
  FLAK_BATTERY: 3,
  TANK_FACTORY: 4,
  AERODROME: 4,
  AIRSHIP_YARD: 4,
  OCCULT_LAB: 4,
  TESLA_COIL: 4,
  CRYPT_BARRACKS: 4,
  ALCHEMY_FOUNDRY: 4,
  BLACK_OBSERVATORY: 4,
  ROCKET_SILO: 4,
  OCCULT_SAWMILL: 4,
  RUNIC_QUARRY: 4,
  ABYSSAL_MINE: 4,
  DRAGON_ROOST: 5,
  ISOTOPE_LAB: 5,
  HELIPAD: 5,
  NUCLEAR_REACTOR: 6,
  ATOMIC_FOUNDRY: 6,
  GLOCKE_COMPLEX: 7,
} as const satisfies Record<BuildingKind, number>;

export function scaleCost(cost: Partial<Wallet>, multiplier: number): Partial<Wallet> {
  return Object.fromEntries(
    Object.entries(cost).map(([r, value]) => [r, Math.ceil(value * multiplier)]),
  );
}

/** Return a new catalogue; retain the old prices for upkeep and saved refunds. */
export function repriceCatalog<T extends Record<string, { cost: Wallet }>>(
  base: T,
  multiplier: (kind: keyof T) => number,
): { [K in keyof T]: Omit<T[K], 'cost'> & { cost: Wallet } } {
  return Object.fromEntries(
    Object.entries(base).map(([kind, entry]) => [
      kind,
      { ...entry, cost: scaleCost(entry.cost, multiplier(kind)) },
    ]),
  ) as { [K in keyof T]: Omit<T[K], 'cost'> & { cost: Wallet } };
}
