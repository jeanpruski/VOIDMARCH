import {
  recruitmentLevel,
  trainingBonusAt,
  UNIT_PROFILES,
  UNITS,
  TRANSPORTS,
  type UnitKind,
} from '@voidmarch/config';
import type { ArmySupportBonus, Building, GameState, Unit } from '@voidmarch/shared';
import { unitStats } from './index';
import { allUnits } from './transports';

export const SUPPORT_CAPS: ArmySupportBonus = {
  attack: 15,
  defense: 15,
  hp: 15,
  move: 1,
  vision: 1,
  terrain: 5,
};
const empty = (): ArmySupportBonus => ({
  attack: 0,
  defense: 0,
  hp: 0,
  move: 0,
  vision: 0,
  terrain: 0,
});
function trainingSites(kind: UnitKind, buildings: readonly Building[]) {
  const p = UNIT_PROFILES[kind];
  if (p.hero || p.builder) return { facilities: [], secondary: [], supportBase: undefined };
  const facilities = [
    ...new Map(
      buildings.filter((b) => b.hp > 0 && p.recruitAt.includes(b.kind)).map((b) => [b.id, b]),
    ).values(),
  ].sort(
    (a, b) =>
      trainingBonusAt(b.kind, b.level) - trainingBonusAt(a.kind, a.level) ||
      b.level - a.level ||
      a.id.localeCompare(b.id),
  );
  const eligible = facilities.filter((b) => b.level >= Math.max(2, recruitmentLevel(kind, b.kind)));
  return { facilities, secondary: eligible.slice(1), supportBase: eligible[0] };
}
const supportWeight = (index: number) => [1, 0.6, 0.4][index] ?? 0.2;
const boundedPoints = (points: number) => Math.min(10, Math.round(points * 10) / 10);
function supportForPoints(kind: UnitKind, points: number): ArmySupportBonus {
  const p = UNIT_PROFILES[kind];
  const ranged = UNITS[kind].range > 1;
  const mobile = p.mounted || p.flying || !!TRANSPORTS[kind];
  const percent = (factor: number) => Math.min(15, Math.round(points * factor * 10) / 10);
  const supportBonus: ArmySupportBonus = {
    attack: UNITS[kind].attack > 0 ? percent(p.siege || ranged ? 3 : mobile ? 2.5 : 1.5) : 0,
    defense: percent(p.armored || (!mobile && !ranged) ? 3 : 1.5),
    hp: percent(p.mechanical ? 3 : 2),
    move: points >= (mobile ? 4 : 6) ? 1 : 0,
    // Cargo craft keep their deliberately poor exploration abilities.
    vision: !TRANSPORTS[kind] && points >= (ranged && !p.flying ? 4 : 6) ? 1 : 0,
    terrain: !p.flying && UNITS[kind].attack > 0 ? Math.min(5, Math.floor(points / 2)) : 0,
  };
  return supportBonus;
}

/** Owner-scoped buildings only; this is the authoritative training calculation. */
export function armyTraining(kind: UnitKind, buildings: readonly Building[]) {
  const { facilities, secondary } = trainingSites(kind, buildings);
  if (!facilities.length)
    return { trainingBonus: 0, supportBonus: empty(), points: 0, contributors: 0 };
  const trainingBonus = trainingBonusAt(facilities[0].kind, facilities[0].level);
  const points = boundedPoints(
    secondary.reduce((n, b, i) => n + (Math.min(5, b.level) - 1) * supportWeight(i), 0),
  );
  return {
    trainingBonus,
    supportBonus: supportForPoints(kind, points),
    points,
    contributors: secondary.length,
  };
}

/** Ordered, additive explanation of the same calculation. Contributions are marginal
 * in this order, including shared thresholds and caps, not independent multipliers. */
export function armyTrainingSources(kind: UnitKind, buildings: readonly Building[]) {
  const { facilities, secondary, supportBase } = trainingSites(kind, buildings);
  let points = 0;
  let bonus = empty();
  const sources = secondary.map((building, i) => {
    const weight = supportWeight(i);
    const rawPoints = Math.round((Math.min(5, building.level) - 1) * weight * 10) / 10;
    const nextPoints = boundedPoints(points + rawPoints);
    const nextBonus = supportForPoints(kind, nextPoints);
    const contribution = Object.fromEntries(
      (Object.keys(SUPPORT_CAPS) as (keyof ArmySupportBonus)[]).map((k) => [
        k,
        Math.round((nextBonus[k] - bonus[k]) * 10) / 10,
      ]),
    ) as unknown as ArmySupportBonus;
    const entry = {
      building,
      weight,
      rawPoints,
      points: Math.round((nextPoints - points) * 10) / 10,
      contribution,
    };
    points = nextPoints;
    bonus = nextBonus;
    return entry;
  });
  return { ...armyTraining(kind, buildings), primary: facilities[0], supportBase, sources };
}
/** Preserve the exact wound proportion. Losing infrastructure removes support,
 * not the best training already learned. Passengers must be included by callers. */
export function refreshArmyTraining(
  units: readonly Unit[],
  buildings: readonly Building[],
  now: number,
) {
  const owned = new Map<string, Building[]>();
  for (const b of buildings) {
    const list = owned.get(b.ownerId) ?? [];
    list.push(b);
    owned.set(b.ownerId, list);
  }
  const cache = new Map<string, ReturnType<typeof armyTraining>>();
  let changed = 0;
  for (const u of units) {
    if (u.npc || UNIT_PROFILES[u.kind].hero || UNIT_PROFILES[u.kind].builder || u.hp <= 0) continue;
    const key = `${u.ownerId}:${u.kind}`;
    let training = cache.get(key);
    if (!training) {
      training = armyTraining(u.kind, owned.get(u.ownerId) ?? []);
      cache.set(key, training);
    }
    const nextTraining = Math.max(u.trainingBonus ?? 0, training.trainingBonus);
    const bonus = training.supportBonus;
    if (
      nextTraining === (u.trainingBonus ?? 0) &&
      (Object.keys(bonus) as (keyof ArmySupportBonus)[]).every(
        (k) => (u.supportBonus?.[k] ?? 0) === bonus[k],
      )
    )
      continue;
    const ratio = Math.min(1, Math.max(0, u.hp / unitStats(u).hp));
    if (nextTraining) u.trainingBonus = nextTraining;
    if (Object.values(bonus).some(Boolean)) u.supportBonus = { ...bonus };
    else delete u.supportBonus;
    u.hp = Math.round(unitStats(u).hp * ratio * 100) / 100;
    u.updatedAt = now;
    changed++;
  }
  return changed;
}
/** Also refresh newly recruited, captured and transported troops without advancing time. */
export function refreshFoodPenalties(s: GameState, now: number, ownerId?: string) {
  let changed = 0;
  for (const unit of allUnits(Object.values(s.units))) {
    const realm = s.realms[unit.ownerId];
    if (!realm || (ownerId && unit.ownerId !== ownerId)) continue;
    const minutes = realm.foodShortageMinutes ?? 0;
    const penalty = minutes >= 30 ? 20 : minutes >= 10 ? 10 : 0;
    const next =
      !unit.npc &&
      !UNIT_PROFILES[unit.kind].hero &&
      !UNIT_PROFILES[unit.kind].builder &&
      UNITS[unit.kind].attack > 0
        ? penalty
        : 0;
    if ((unit.foodPenalty ?? 0) !== next) {
      unit.foodPenalty = next;
      unit.updatedAt = now;
      changed++;
    }
  }
  return changed;
}
export function refreshWorldTraining(s: GameState, now: number) {
  const food = refreshFoodPenalties(s, now);
  return (
    food +
    refreshArmyTraining(
      allUnits(Object.values(s.units)).filter((u) => !!s.realms[u.ownerId]),
      Object.values(s.buildings),
      now,
    )
  );
}
