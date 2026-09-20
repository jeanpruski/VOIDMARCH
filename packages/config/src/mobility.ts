import { UNIT_PROFILES, type UnitKind, type BuildingKind, type Wallet } from './index';

export type MobilityResource = 'fuel' | 'pervitin';
export const MOBILITY_WINDOW = 60 * 60 * 1000;
export const MOBILITY_LEVELS = [
  { capacity: 10, hourly: 10, pricePercent: 100 },
  { capacity: 20, hourly: 14, pricePercent: 115 },
  { capacity: 30, hourly: 18, pricePercent: 130 },
  { capacity: 40, hourly: 22, pricePercent: 150 },
  { capacity: 50, hourly: 25, pricePercent: 175 },
] as const;
export interface MobilityReceipt {
  at: number;
  amount: number;
}
export type MobilityReceipts = Partial<Record<MobilityResource, MobilityReceipt[]>>;
type Producer = { kind: BuildingKind; level: number; hp: number };
export function mobilityLimits(level: number) {
  return MOBILITY_LEVELS[Math.max(0, Math.min(4, Math.floor(level) - 1))];
}
/** Callers pass owned buildings only. Each resource has its own best live producer. */
export function mobilityLevel(sites: readonly Producer[], resource: MobilityResource) {
  return Math.min(
    5,
    Math.max(
      1,
      ...sites
        .filter((b) => b.hp > 0 && mobilitySources(b.kind).includes(resource))
        .map((b) => b.level),
    ),
  );
}
export function mobilityQuota(
  level: number,
  receipts: readonly MobilityReceipt[] = [],
  now: number,
) {
  const recent = receipts.filter((r) => r.at > now - MOBILITY_WINDOW);
  const limit = mobilityLimits(level).hourly;
  const used = recent.reduce((n, r) => n + r.amount, 0);
  return {
    limit,
    used,
    recent,
    remaining: Math.max(0, limit - used),
    nextAt: recent.length ? Math.min(...recent.map((r) => r.at)) + MOBILITY_WINDOW : undefined,
  };
}
export const MOBILITY_NAMES = { fuel: 'Carburant', pervitin: 'Pervitine' } as const;
export interface MobilityReserve {
  fuel?: number;
  pervitin?: number;
}
export interface MovementPayment {
  ap: number;
  fuel: number;
  pervitin: number;
}

/** Machines consume fuel; living land troops (including mounts and heroes) consume pervitin.
 * Organic flyers and pre-motor naval units retain AP movement. */
export function movementResource(kind: UnitKind): MobilityResource | undefined {
  const profile = UNIT_PROFILES[kind];
  if (profile.mechanical) return 'fuel';
  if (!profile.flying && !profile.naval) return 'pervitin';
}
export function movementPayment(
  kind: UnitKind,
  baseAP: number,
  reserves: MobilityReserve,
): MovementPayment {
  const payment = { ap: baseAP, fuel: 0, pervitin: 0 };
  const resource = movementResource(kind);
  if (resource && baseAP > 0) {
    payment[resource] = Math.min(baseAP, Math.max(0, Math.floor(reserves[resource] ?? 0)));
    payment.ap -= payment[resource];
  }
  return payment;
}
export function movementPaymentLabel(p: MovementPayment) {
  return (
    [
      p.fuel ? `${p.fuel} carburant` : '',
      p.pervitin ? `${p.pervitin} pervitine` : '',
      p.ap ? `${p.ap} PA` : '',
    ]
      .filter(Boolean)
      .join(' + ') || 'Gratuit'
  );
}
export function mobilitySources(kind: BuildingKind): MobilityResource[] {
  return kind === 'WORKSHOP' || kind === 'REFINERY'
    ? ['fuel']
    : kind === 'MONASTERY' || kind === 'FIELD_HOSPITAL'
      ? ['pervitin']
      : [];
}
export function mobilityCost(
  kind: BuildingKind,
  level: number,
  resource: MobilityResource,
  amount: number,
  strategicDiscount = 0,
): Partial<Wallet> {
  const advanced = kind === 'REFINERY' || kind === 'FIELD_HOSPITAL';
  // Prices are based on the realm's best producer, not the selected building's level.
  // Integer percentages avoid floating-point ceil errors; specialization keeps its 20% discount.
  const percent = mobilityLimits(level).pricePercent;
  const base: Partial<Wallet> =
    resource === 'fuel'
      ? advanced
        ? { GOLD: 24, WOOD: 40, IRON: 16 }
        : { GOLD: 30, WOOD: 50, IRON: 20 }
      : advanced
        ? { GOLD: 20, FOOD: 60 }
        : { GOLD: 25, FOOD: 75 };
  return Object.fromEntries(
    Object.entries(base).map(([r, value]) => [
      r,
      Math.ceil(
        (value *
          percent *
          (100 - (resource === 'fuel' ? Math.max(0, Math.min(20, strategicDiscount)) : 0))) /
          10000,
      ) * amount,
    ]),
  );
}
