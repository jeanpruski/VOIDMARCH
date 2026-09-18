import type { UnitKind, UnitProfile, Wallet } from './index';

/** One scale for every theme. Role, range and mobility remain individual choices. */
export const TRAINING_BONUSES = [0, 25, 60, 80, 100] as const;
export const PRODUCTION_MULTIPLIERS = [1, 1.8, 3, 5, 8] as const;
export const UPGRADE_MULTIPLIERS = [2, 4, 8, 16] as const;
export const PRODUCER_UPGRADE_MULTIPLIERS = [0.8, 1.4, 2.4, 4] as const;

interface CombatEntry {
  name: string;
  hp: number;
  attack: number;
  defense: number;
  range: number;
  move: number;
  vision: number;
  capture: number;
  buildingAttack?: number;
  cost: Wallet;
}
const tenth = (n: number) => Math.round(n * 10) / 10;
const soften = (n: number, lo: number, hi: number) =>
  n < lo ? lo + (n - lo) * 0.2 : n > hi ? hi + (n - hi) * 0.2 : n;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function balanceProfiles(
  profiles: Record<UnitKind, UnitProfile>,
  tiers: Record<UnitKind, number>,
): Record<UnitKind, UnitProfile> {
  return Object.fromEntries(
    Object.entries(profiles).map(([id, original]) => {
      const kind = id as UnitKind;
      const p = { ...original };
      const tier = tiers[kind];
      if (kind === 'IMPERIAL_GRENADIER') p.siege = false; // Grenades, like the other infantry grenadiers: 1 PA.
      if (kind === 'BAZOOKA') p.antiArmor = 32;
      if (kind === 'FLAK_CANNON') p.antiAir = 30;
      if (tier >= 2 && tier < 7 && !p.builder && !p.healer) {
        const heavy = p.armored && p.mechanical && !p.flying;
        const base = heavy
          ? 10
          : p.flying
            ? 10
            : p.mechanical
              ? 7
              : p.mounted
                ? 6
                : p.siege
                  ? 6
                  : 5;
        p.population = base + Math.max(0, tier - 2) * (heavy ? 2 : 1);
      }
      return [kind, p];
    }),
  ) as Record<UnitKind, UnitProfile>;
}

export function balanceUnits<T extends Record<UnitKind, CombatEntry>>(
  base: T,
  tiers: Record<UnitKind, number>,
  profiles: Record<UnitKind, UnitProfile>,
  oldPrice: (kind: UnitKind) => number,
): {
  [K in keyof T]: Omit<T[K], 'hp' | 'attack' | 'defense' | 'cost' | 'buildingAttack'> &
    CombatEntry & { buildingAttack: number };
} {
  return Object.fromEntries(
    Object.entries(base).map(([id, u]) => {
      const kind = id as UnitKind;
      const tier = tiers[kind],
        p = profiles[kind];
      const originalCost = Object.fromEntries(
        Object.entries(u.cost).map(([r, v]) => [r, Math.ceil(v * oldPrice(kind))]),
      ) as Wallet;
      if (tier <= 1 || tier === 7 || p.builder || p.healer)
        return [
          kind,
          {
            ...u,
            buildingAttack: (u.buildingAttack ?? u.attack) * (tier === 7 ? 2 : 1),
            cost: originalCost,
          },
        ];
      const reference = [0, 0, 20, 28, 38, 44, 58][tier];
      const target = [0, 0, 15, 21, 26, 29, 31][tier];
      // Light scouts and anti-air guns retain their intentionally weak ground attack.
      const specialist = u.attack < reference * 0.5;
      const attack = tenth(specialist ? u.attack : target * (0.85 + (0.15 * u.attack) / reference));
      const hpReference = [0, 0, 48, 70, 100, 130, 165][tier];
      const chassis = p.mechanical && p.armored ? 1.5 : p.flying ? 1.25 : p.mounted ? 1.15 : 1;
      const fragile = u.range >= 5 && !p.armored ? 0.75 : 1;
      const hp = Math.round(
        soften(u.hp, hpReference * chassis * fragile * 0.7, hpReference * chassis * fragile * 1.2),
      );
      const defense = tenth(
        soften(u.defense, 0, [0, 0, 8, 11, 14, 17, 20][tier] * (p.armored ? 1.2 : 1)),
      );
      const siegeTarget = [0, 0, 40, 75, 130, 190, 260][tier];
      const buildingAttack = p.siege
        ? Math.round(siegeTarget * (0.8 + (0.2 * (u.buildingAttack ?? u.attack)) / siegeTarget))
        : tenth(
            attack *
              clamp(
                (u.buildingAttack ?? u.attack) / Math.max(1, u.attack),
                1,
                (p.antiArmor ?? 0) > 0 ? 1.6 : 1.8,
              ),
          );
      // Price each actual capability instead of inheriting the latest roster author's prices.
      const score =
        hp * 0.45 +
        attack * 3 +
        defense * 3 +
        u.range * 7 +
        u.move * 2 +
        Math.max(p.antiArmor ?? 0, p.antiAir ?? 0, p.antiCavalry ?? 0) * 0.7 +
        (p.flying ? 20 : 0) +
        (p.armored ? 10 : 0) +
        (p.siege ? Math.max(0, buildingAttack - attack) * 0.35 : 0);
      const counterDiscount =
        (p.antiArmor ?? 0) > 0 || (!p.flying && (p.antiAir ?? 0) > 0) ? 0.8 : 1;
      const gold =
        Math.ceil(
          ((([0, 0, 220, 650, 2000, 4500, 9000][tier] * score) /
            [1, 1, 125, 165, 220, 275, 330][tier]) *
            counterDiscount) /
            5,
        ) * 5;
      const cost: Wallet = {
        GOLD: gold,
        WOOD: Math.ceil(gold * (p.mechanical ? 0.25 : tier === 2 ? 0.3 : 0.2)),
        STONE: u.cost.STONE > 0 ? Math.ceil(gold * 0.12) : 0,
        IRON: Math.ceil(gold * (p.mechanical ? 0.8 : p.armored ? 0.6 : 0.4)),
        FOOD: Math.ceil(gold * (p.mounted ? 0.55 : p.mechanical ? 0.15 : 0.3)),
      };
      return [kind, { ...u, hp, attack, defense, buildingAttack, cost }];
    }),
  ) as ReturnType<typeof balanceUnits<T>>;
}
