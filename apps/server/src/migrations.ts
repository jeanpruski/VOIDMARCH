import {
  BALANCE_VERSION,
  BUILDINGS,
  UNITS,
  UNIT_PROFILES,
  trainingBonusAt,
  ECONOMY_V2_BUILDING_COSTS,
} from '@voidmarch/config';
import { unitStats } from '@voidmarch/game-rules';
import type { GameState, Unit, Building, Realm } from '@voidmarch/shared';
import { LEGACY_BALANCE } from './legacy-balance.js';

/** Add new resources to persisted wallets, including diplomacy and archives.
 * Partial costs/rewards remain partial; existing balances and assets are retained. */
export function migrateResourceWallets(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  const object = value as Record<string, unknown>;
  if (
    ['GOLD', 'WOOD', 'IRON', 'FOOD'].every((key) => typeof object[key] === 'number') &&
    object.STONE === undefined
  )
    object.STONE = 0;
  for (const child of Object.values(object)) migrateResourceWallets(child);
}

/** Preserve wounds, stockpiles and original demolition refunds when the balance changes. */
export function migrateProgression(state: GameState, now = Date.now()): boolean {
  if ((state.balanceVersion ?? 1) >= BALANCE_VERSION) return false;
  const migrate = (units: Unit[], buildings: Building[], realms: Record<string, Realm>) => {
    for (const u of units) {
      if (u.npc) continue; // Existing short-lived encounters keep their rolled statistics.
      const oldMax =
        (u.kind in LEGACY_BALANCE.units
          ? LEGACY_BALANCE.units[u.kind as keyof typeof LEGACY_BALANCE.units]
          : UNITS[u.kind].hp) *
        (1 + ((u.trainingBonus ?? 0) + (u.rareBonus ?? 0)) / 100);
      const ratio = Math.max(0, Math.min(1, u.hp / oldMax));
      const retained =
        u.trainingBonus === 10 ? 25 : u.trainingBonus === 20 ? 60 : (u.trainingBonus ?? 0);
      const training = UNIT_PROFILES[u.kind].builder
        ? 0
        : Math.max(
            retained,
            0,
            ...buildings
              .filter(
                (b) => b.ownerId === u.ownerId && UNIT_PROFILES[u.kind].recruitAt.includes(b.kind),
              )
              .map((b) => trainingBonusAt(b.kind, b.level)),
          );
      if (training) u.trainingBonus = training;
      u.hp = Math.round(unitStats(u).hp * ratio * 100) / 100;
      u.updatedAt = now;
    }
    for (const b of buildings) {
      const old =
        b.kind in LEGACY_BALANCE.buildings
          ? LEGACY_BALANCE.buildings[b.kind as keyof typeof LEGACY_BALANCE.buildings]
          : { ...BUILDINGS[b.kind], cost: ECONOMY_V2_BUILDING_COSTS[b.kind] };
      const ratio = Math.max(0, Math.min(1, b.hp / (old.hp * b.level)));
      b.constructionCost ??= Object.fromEntries(
        Object.entries(old.cost).map(([r, v]) => [
          r,
          Math.ceil(v * (realms[b.ownerId]?.faction === 'ASH' ? 0.9 : 1)),
        ]),
      );
      b.hp = Math.round(BUILDINGS[b.kind].hp * b.level * ratio * 100) / 100;
      b.updatedAt = now;
    }
  };
  if ((state.balanceVersion ?? 1) < 2) {
    migrate(Object.values(state.units), Object.values(state.buildings), state.realms);
    for (const archive of Object.values(state.archives))
      migrate(archive.units, archive.buildings, { [archive.realm.id]: archive.realm });
  }
  // v3 changes prices only. Never rerun the v1 HP/training conversion on v2 saves.
  // Snapshot missing historical costs before the new catalogue can inflate refunds.
  const retainCosts = (buildings: Building[], realms: Record<string, Realm>) => {
    for (const b of buildings)
      b.constructionCost ??= Object.fromEntries(
        Object.entries(ECONOMY_V2_BUILDING_COSTS[b.kind]).map(([r, value]) => [
          r,
          Math.ceil(value * (realms[b.ownerId]?.faction === 'ASH' ? 0.9 : 1)),
        ]),
      );
  };
  retainCosts(Object.values(state.buildings), state.realms);
  for (const archive of Object.values(state.archives))
    retainCosts(archive.buildings, { [archive.realm.id]: archive.realm });
  state.balanceVersion = BALANCE_VERSION;
  state.revision++;
  return true;
}
