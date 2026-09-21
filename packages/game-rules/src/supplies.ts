import {
  BUILDINGS,
  UNIT_PROFILES,
  UNIT_TIERS,
  UNITS,
  unitFoodUpkeep,
  buildingUpgrade,
  unitPopulation,
  type Wallet,
} from '@voidmarch/config';
import type { Building, Unit } from '@voidmarch/shared';
import { distance, unitStats } from './index';

export const CAMPAIGN_SUPPLIES = { capacity: 8, attackBonus: 10 } as const;
export const SUPPLY_BUILDINGS = [
  'PORT',
  'CAMP',
  'OUTPOST',
  'VILLAGE',
  'GRANARY',
  'WAREHOUSE',
  'RAIL_DEPOT',
  'FIELD_HOSPITAL',
] as const;
export const canCarrySupplies = (u: Pick<Unit, 'kind' | 'npc'>) =>
  !u.npc && u.kind !== 'HERO' && !UNIT_PROFILES[u.kind].builder && UNITS[u.kind].attack > 0;
export const supplyCharges = (u: Pick<Unit, 'kind' | 'npc' | 'provisions'>) =>
  canCarrySupplies(u)
    ? Math.min(CAMPAIGN_SUPPLIES.capacity, Math.max(0, Math.floor(u.provisions ?? 0)))
    : 0;
export const supplyAttackBonus = (u: Pick<Unit, 'kind' | 'npc' | 'provisions'>) =>
  supplyCharges(u) > 0 ? CAMPAIGN_SUPPLIES.attackBonus : 0;
export function supplyCost(u: Pick<Unit, 'kind' | 'npc' | 'provisions'>): Partial<Wallet> {
  if (!canCarrySupplies(u)) return {};
  const ration = Math.ceil(
    unitFoodUpkeep(u.kind) * 6 + unitPopulation(u.kind) * 1.5 + UNIT_TIERS[u.kind] ** 2 * 2,
  );
  return { FOOD: (CAMPAIGN_SUPPLIES.capacity - supplyCharges(u)) * ration };
}
/** Allied depots/convoys provide access; the requesting kingdom always pays its own food. */
export function supplySource(
  u: Unit,
  buildings: readonly Building[],
  units: readonly Unit[],
  allies: readonly string[] = [],
) {
  const friendly = (owner: string) =>
    owner === u.ownerId || (allies.includes(u.ownerId) && allies.includes(owner));
  const building = buildings.find(
    (b) =>
      b.hp > 0 &&
      friendly(b.ownerId) &&
      (SUPPLY_BUILDINGS as readonly string[]).includes(b.kind) &&
      distance(b, u) <= 2,
  );
  if (building) return { id: building.id, name: BUILDINGS[building.kind].name };
  const convoy = units.find(
    (t) =>
      t.id !== u.id &&
      !t.carrierId &&
      t.hp > 0 &&
      friendly(t.ownerId) &&
      UNIT_PROFILES[t.kind].transport &&
      distance(t, u) <= 1,
  );
  return convoy ? { id: convoy.id, name: UNITS[convoy.kind].name } : undefined;
}
export function consumeSupplies(u: Unit, now: number) {
  if (supplyCharges(u) > 0) {
    u.provisions = supplyCharges(u) - 1;
    u.updatedAt = now;
  }
}
/** Group healing follows the recipient's progression. A shared repair timer
 * prevents alternating several healers and repairs to erase incoming fire. */
export function mendAmount(healer: Unit, target: Unit, now = Date.now()): number {
  if (
    !UNIT_PROFILES[healer.kind].healer ||
    healer.ownerId !== target.ownerId ||
    healer.hp <= 0 ||
    target.hp <= 0 ||
    healer.carrierId ||
    target.carrierId ||
    UNIT_PROFILES[target.kind].mechanical ||
    distance(healer, target) > 2 ||
    repairPlan(target, now).reason
  )
    return 0;
  const max = unitStats(target).hp;
  const amount = healer.kind === 'HEALER' ? Math.max(6, max * 0.2) : Math.max(3, max * 0.1);
  return Math.max(0, Math.round(Math.min(max - target.hp, amount) * 10) / 10);
}
/** Repair price follows actual restored health; no full-price bill for a scratch. */
export function repairPlan(target: Unit | Building, now = Date.now()) {
  const building = 'population' in target;
  const max = building ? BUILDINGS[target.kind].hp * target.level : unitStats(target).hp;
  const supplied = !building && supplyCharges(target) > 0;
  const underFire = target.lastDamagedAt !== undefined && now - target.lastDamagedAt < 90000;
  const readyAt =
    underFire && target.lastRepairedAt !== undefined ? target.lastRepairedAt + 30000 : 0;
  const reason =
    readyAt > now
      ? `Réparation sous le feu : disponible dans ${Math.ceil((readyAt - now) / 1000)} s.`
      : '';
  const fraction = underFire ? (building ? 0.1 : supplied ? 0.2 : 0.15) : supplied ? 0.75 : 0.5;
  const restored = Math.max(
    0,
    Math.round(Math.min(max - target.hp, Math.ceil(max * fraction)) * 100) / 100,
  );
  const cost: Partial<Wallet> = {};
  if (restored <= 0) return { restored, cost, supplied, underFire, readyAt, reason };
  cost.GOLD = 10;
  if (building) {
    const investment: Partial<Wallet> = { ...BUILDINGS[target.kind].cost };
    for (let level = 1; level < target.level; level++) {
      const upgrade = buildingUpgrade(target.kind, level);
      if (upgrade)
        for (const [k, value] of Object.entries(upgrade.cost))
          investment[k as keyof Wallet] = (investment[k as keyof Wallet] ?? 0) + value;
    }
    for (const [k, value] of Object.entries(investment))
      if (value > 0)
        cost[k as keyof Wallet] = Math.max(
          k === 'GOLD' ? 5 : 1,
          Math.ceil((value * 0.2 * restored) / max),
        );
    cost.GOLD = Math.max(5, cost.GOLD ?? 0);
    if (!cost.WOOD && !cost.STONE && !cost.IRON) cost.WOOD = 5;
  } else if (UNIT_PROFILES[target.kind].naval) {
    cost.WOOD = Math.max(10, Math.ceil((UNITS[target.kind].cost.WOOD * 0.18 * restored) / max));
    cost.IRON = Math.max(5, Math.ceil((UNITS[target.kind].cost.IRON * 0.18 * restored) / max));
  } else if (UNIT_PROFILES[target.kind].mechanical)
    cost.IRON = Math.max(10, Math.ceil((UNITS[target.kind].cost.IRON * 0.18 * restored) / max));
  else cost.FOOD = Math.max(10, Math.ceil((UNITS[target.kind].cost.FOOD * 0.3 * restored) / max));
  return { restored, cost, supplied, underFire, readyAt, reason };
}
