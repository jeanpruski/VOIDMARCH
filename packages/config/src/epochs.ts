import type { BuildingKind, UnitKind, Wallet } from './index';
import {
  UNIT_PROFILES,
  UNIT_ERAS,
  UNIT_TIERS,
  BUILDING_REQUIREMENTS,
  BUILDINGS,
  developmentTrophyRequirement,
} from './index';

export const KINGDOM_ERAS = [
  'Moyen Âge',
  'Renaissance / Empire',
  'Guerre industrielle',
  'Technologie occulte',
  'Ère atomique',
] as const;
/** First historical era, independent of the building's local upgrade level and price tier. */
export const BUILDING_MIN_ERA = {
  CAMP: 1,
  OUTPOST: 1,
  VILLAGE: 1,
  HOUSE: 1,
  WELL: 1,
  FARM: 1,
  LUMBER: 1,
  QUARRY: 1,
  MINE: 1,
  HUNTER: 1,
  FISHERY: 1,
  BARRACKS: 1,
  ARCHERY: 1,
  WOOD_WALL: 1,
  STONE_WALL: 2,
  STEEL_WALL: 3,
  CONCRETE_WALL: 4,
  ATOMIC_WALL: 5,
  GRANARY: 1,
  WAREHOUSE: 1,
  STABLE: 1,
  MONASTERY: 1,
  BAKERY: 1,
  MARKET: 1,
  TOWER: 1,
  WORKSHOP: 1,
  GOLD_MINE: 1,
  FORGE: 1,
  LIBRARY: 1,
  FORT: 1,
  LOGISTICS_CENTER: 1,
  RAIL_DEPOT: 3,
  STEAM_SAWMILL: 2,
  MECHANIZED_QUARRY: 2,
  INDUSTRIAL_MINE: 2,
  ARSENAL: 3,
  GARAGE: 3,
  REFINERY: 3,
  MUNITIONS: 3,
  RADIO: 3,
  BUNKER: 3,
  FIELD_HOSPITAL: 3,
  GUN_BATTERY: 3,
  FLAK_BATTERY: 3,
  TANK_FACTORY: 3,
  AERODROME: 3,
  AIRSHIP_YARD: 3,
  OCCULT_LAB: 4,
  TESLA_COIL: 4,
  CRYPT_BARRACKS: 4,
  ALCHEMY_FOUNDRY: 4,
  BLACK_OBSERVATORY: 4,
  ROCKET_SILO: 4,
  OCCULT_SAWMILL: 4,
  RUNIC_QUARRY: 4,
  ABYSSAL_MINE: 4,
  DRAGON_ROOST: 4,
  HELIPAD: 4,
  ISOTOPE_LAB: 5,
  NUCLEAR_REACTOR: 5,
  ATOMIC_FOUNDRY: 5,
  GLOCKE_COMPLEX: 5,
  PORT: 1,
  SHIPYARD: 1,
  NAVAL_FISHERY: 1,
  SUBMARINE_BASE: 3,
  COASTAL_BATTERY: 2,
} as const satisfies Record<BuildingKind, number>;

/** Requirements are exclusively available in the preceding era. */
export const ERA_REQUIREMENTS: Record<number, { kinds: BuildingKind[]; level: number }[]> = {
  2: [
    { kinds: ['WORKSHOP'], level: 1 },
    { kinds: ['MARKET'], level: 1 },
  ],
  3: [
    { kinds: ['WORKSHOP'], level: 2 },
    { kinds: ['FORGE'], level: 2 },
    { kinds: ['STEAM_SAWMILL', 'MECHANIZED_QUARRY', 'INDUSTRIAL_MINE'], level: 2 },
  ],
  4: [
    { kinds: ['WORKSHOP'], level: 3 },
    { kinds: ['REFINERY'], level: 3 },
    { kinds: ['RADIO'], level: 3 },
  ],
  5: [
    { kinds: ['OCCULT_LAB'], level: 4 },
    { kinds: ['REFINERY'], level: 4 },
    { kinds: ['BLACK_OBSERVATORY'], level: 4 },
  ],
};
export const ERA_COSTS: Record<number, Partial<Wallet>> = {
  2: { GOLD: 800, WOOD: 600, STONE: 400, IRON: 250, FOOD: 500 },
  3: { GOLD: 6000, WOOD: 3500, STONE: 2500, IRON: 3000, FOOD: 2500 },
  4: { GOLD: 30000, WOOD: 15000, STONE: 12000, IRON: 20000, FOOD: 12000 },
  5: { GOLD: 150000, WOOD: 60000, STONE: 60000, IRON: 100000, FOOD: 50000 },
};
export const ERA_AP_COST = 5;
const unitEraCache = new Map<UnitKind, number>();
export function unitRequiredEra(kind: UnitKind): number {
  const cached = unitEraCache.get(kind);
  if (cached !== undefined) return cached;
  const p = UNIT_PROFILES[kind];
  const historical = kind === 'TERRAFORMER' ? 3 : UNIT_ERAS[kind as keyof typeof UNIT_ERAS];
  let era = p.radioactive
    ? 5
    : (historical ?? (UNIT_TIERS[kind] <= 2 ? 1 : Math.min(5, UNIT_TIERS[kind])));
  const seen = new Set<BuildingKind>();
  const visit = (b: BuildingKind) => {
    if (seen.has(b)) return;
    seen.add(b);
    era = Math.max(era, BUILDING_MIN_ERA[b]);
    (BUILDING_REQUIREMENTS[b] ?? []).forEach(visit);
  };
  p.requires.forEach(visit);
  // A late alternate recruiter does not postpone an otherwise medieval unit.
  if (p.recruitAt.length)
    era = Math.max(era, Math.min(...p.recruitAt.map((b) => BUILDING_MIN_ERA[b])));
  era = Math.max(1, era);
  unitEraCache.set(kind, era);
  return era;
}
export const eraName = (era: number) => KINGDOM_ERAS[Math.max(0, Math.min(4, era - 1))];
export function eraMissing(
  sites: readonly { kind: BuildingKind; level: number; hp: number }[],
  target: number,
) {
  return (ERA_REQUIREMENTS[target] ?? []).filter(
    (req) => !sites.some((b) => b.hp > 0 && b.level >= req.level && req.kinds.includes(b.kind)),
  );
}
export function eraAccessReason(current: number, required: number) {
  return current >= required
    ? ''
    : `Époque ${required} — ${eraName(required)} requise. Passez à l’époque suivante dans Royaume.`;
}

export function eraAdvanceReason(
  sites: readonly { kind: BuildingKind; level: number; hp: number }[],
  progress: { era?: number; trophies: number; bot?: boolean },
  target: number,
) {
  const current = progress.era ?? 1;
  if (target !== current + 1 || target > 5)
    return 'Passez les époques dans l’ordre, une seule à la fois.';
  const missing = eraMissing(sites, target).map(
    (req) => `${req.kinds.map((k) => BUILDINGS[k].name).join(' ou ')} niveau ${req.level}`,
  );
  const trophies = developmentTrophyRequirement(target);
  if (!progress.bot && progress.trophies < trophies)
    missing.push(`trophées ${progress.trophies}/${trophies}`);
  return missing.length ? `Pour passer à l’époque ${target} : ${missing.join(' ; ')}.` : '';
}
