import {
  developmentStage,
  developmentMissing,
  developmentReason,
  constructionDevelopmentStage,
  upgradeDevelopmentStage,
} from '@voidmarch/config';
import {
  BUILDINGS,
  BUILDING_REQUIREMENTS,
  UNIT_PROFILES,
  UNITS,
  RULES,
  RESOURCES,
  GATHER_YIELD,
  buildingConstructionCost,
  buildingUpgrade,
  unitPopulation,
  type BuildingKind,
  type Resource,
  type Wallet,
} from '@voidmarch/config';
import {
  navalConstructionReason,
  recruitmentTileAllowed,
  allRealmUnits,
  armyPopulation,
  canAfford,
  canGather,
  disk,
  distance,
  findPath,
  income,
  key,
  movementCost,
  neighbors,
  realmBuildings,
  realmUnits,
  recruitmentRequirement,
  storage,
  tileAt,
  unitMovementBudget,
  wallBlocks,
} from '@voidmarch/game-rules';
import type { Action } from '@voidmarch/protocol';
import type { Building, GameState, Hex, Realm, Unit } from '@voidmarch/shared';

type BotCommand<T = Action> = T extends Action ? Omit<T, 'actionId' | 'clientTimestamp'> : never;
export type BotIntent = { command: BotCommand; score: number };
type Project = { kind: BuildingKind; upgrade?: Building; score: number };
const producers: Record<Resource, BuildingKind> = {
  WOOD: 'LUMBER',
  STONE: 'QUARRY',
  IRON: 'MINE',
  FOOD: 'FARM',
  GOLD: 'MARKET',
};
const development: BuildingKind[] = [
  'WORKSHOP',
  'FORGE',
  'MARKET',
  'GOLD_MINE',
  'BARRACKS',
  'HOUSE',
  'WELL',
  'ARCHERY',
  'STABLE',
  'BAKERY',
  'GARAGE',
  'REFINERY',
  'ARSENAL',
  'MUNITIONS',
  'STEAM_SAWMILL',
  'MECHANIZED_QUARRY',
  'INDUSTRIAL_MINE',
  'RADIO',
  'TANK_FACTORY',
  'AERODROME',
  'MONASTERY',
  'LIBRARY',
  'OCCULT_LAB',
  'FLAK_BATTERY',
  'CRYPT_BARRACKS',
  'BLACK_OBSERVATORY',
  'AIRSHIP_YARD',
  'DRAGON_ROOST',
  'OCCULT_SAWMILL',
  'RUNIC_QUARRY',
  'ABYSSAL_MINE',
  'ISOTOPE_LAB',
  'NUCLEAR_REACTOR',
  'ATOMIC_FOUNDRY',
  'GLOCKE_COMPLEX',
];

/** Mirror recruitment placement, including the free replacement peasant and cargo population. */
export function botRecruitmentSite(
  s: GameState,
  r: Realm,
  kind: keyof typeof UNITS,
  seen: Set<string>,
) {
  const buildings = realmBuildings(s, r.id),
    units = allRealmUnits(s, r.id);
  const free = kind === 'PEASANT' && !units.some((u) => u.kind === 'PEASANT');
  if (
    !free &&
    (!canAfford(r.wallet, UNITS[kind].cost) ||
      armyPopulation(units) + unitPopulation(kind) >
        Math.max(
          15,
          buildings.reduce((n, b) => n + b.population, 0),
        ))
  )
    return;
  return buildings.find(
    (b) =>
      !recruitmentRequirement(kind, b, buildings) &&
      [b, ...neighbors(b)].some((p) => {
        const t = tileAt(s, p);
        return (
          seen.has(key(p)) &&
          recruitmentTileAllowed(kind, t, r.id) &&
          !wallBlocks(s.buildings[t.buildingId ?? ''], r.id) &&
          movementCost(t, kind) <= UNITS[kind].move &&
          !Object.values(s.units).some((u) => key(u) === key(p))
        );
      }),
  );
}

export function botDevelopment(
  s: GameState,
  r: Realm,
  seen: Set<string>,
): { intents: BotIntent[]; reserve: Partial<Wallet> } {
  const buildings = realmBuildings(s, r.id).filter((b) => b.hp > 0);
  const units = realmUnits(s, r.id),
    builders = units.filter((u) => UNIT_PROFILES[u.kind].builder && u.hp > 0);
  const allUnits = allRealmUnits(s, r.id),
    population = buildings.reduce((n, b) => n + b.population, 0);
  const rates = income(s, r.id),
    cap = storage(s, r.id);
  const intents: BotIntent[] = [];
  const desiredBuilders = Math.min(3, 1 + Math.floor(buildings.length / 10));
  if (builders.length < desiredBuilders) {
    const source = botRecruitmentSite(s, r, 'PEASANT', seen);
    if (source)
      intents.push({
        command: { type: 'RECRUIT', actorId: source.id, payload: { kind: 'PEASANT' } },
        score: builders.length ? 115 : 180,
      });
  }
  const owned = (kind: BuildingKind) => buildings.filter((b) => b.kind === kind);
  const projects: Project[] = [];
  const ensure = (kind: BuildingKind, score: number, chain: BuildingKind[] = []) => {
    if (owned(kind).length || chain.includes(kind)) return;
    const missing = (BUILDING_REQUIREMENTS[kind] ?? []).filter((req) => !owned(req).length);
    if (missing.length) for (const req of missing) ensure(req, score + 1, [...chain, kind]);
    else projects.push({ kind, score });
  };
  for (const resource of ['WOOD', 'STONE', 'IRON', 'FOOD'] as const)
    ensure(producers[resource], 145);
  if (population - armyPopulation(allUnits) < 15) projects.push({ kind: 'HOUSE', score: 140 });
  // Recover negative net production before committing to another military investment.
  for (const resource of RESOURCES)
    if (rates[resource] <= 0 && r.wallet[resource] < Math.max(100, cap * 0.2)) {
      const producer = owned(producers[resource]).sort((a, b) => a.level - b.level)[0];
      const upgrade = producer && buildingUpgrade(producer.kind, producer.level);
      if (upgrade && canAfford(r.wallet, upgrade.cost))
        projects.push({ kind: producer.kind, upgrade: producer, score: 150 });
      else projects.push({ kind: producers[resource], score: 150 });
    }
  const technology = developmentStage(buildings);
  for (const req of developmentMissing(buildings, Math.min(5, technology + 1))) {
    const existing = buildings.find((b) => req.kinds.includes(b.kind));
    if (existing) projects.push({ kind: existing.kind, upgrade: existing, score: 114 });
    else ensure(req.kinds[0], 113);
  }
  const stage = Math.min(5, technology + 2);
  for (const b of buildings) {
    if (['CAMP', 'OUTPOST'].includes(b.kind))
      projects.push({ kind: b.kind, upgrade: b, score: 100 });
    else if (b.level < stage && buildingUpgrade(b.kind, b.level)) {
      const thresholds: Record<Resource, number> = {
        GOLD: technology * 35,
        WOOD: technology * 45,
        STONE: technology * 30,
        IRON: technology * 25,
        FOOD: 10 + technology * 5,
      };
      const productive = Object.entries(BUILDINGS[b.kind].production).some(
        ([r, n]) => n > 0 && rates[r as Resource] < thresholds[r as Resource],
      );
      const military = Object.values(UNIT_PROFILES).some(
        (p) => !p.builder && !p.hero && p.recruitAt.includes(b.kind),
      );
      if (productive || military)
        projects.push({ kind: b.kind, upgrade: b, score: military ? 112 : 108 });
    }
  }
  if (
    buildings.length >= 10 &&
    buildings.some((b) => disk(b, 3).some((p) => ['COAST', 'SEA'].includes(tileAt(s, p).terrain)))
  ) {
    ensure('PORT', 102);
    ensure('SHIPYARD', 99);
    ensure('NAVAL_FISHERY', 98);
  }
  const next = development.find((kind) => !owned(kind).length);
  if (next) ensure(next, 95);
  projects.sort((a, b) => b.score - a.score || (a.upgrade?.level ?? 0) - (b.upgrade?.level ?? 0));

  const sites = new Map<string, Hex>();
  for (const b of buildings)
    for (const p of disk(b, RULES.constructionRadius)) if (seen.has(key(p))) sites.set(key(p), p);
  const occupied = new Set(Object.values(s.units).map(key));
  const enemies = new Set(
    Object.values(s.units)
      .filter((u) => u.ownerId !== r.id)
      .map(key),
  );
  const strategic = new Set(Object.values(s.strategy?.sites ?? {}).map(key));
  function moveToward(u: Unit, target: Hex): BotIntent['command'] | undefined {
    const get = (p: Hex) => {
      if (!seen.has(key(p))) return;
      const t = tileAt(s, p);
      if (
        (t.ownerId && t.ownerId !== r.id) ||
        wallBlocks(s.buildings[t.buildingId ?? ''], r.id, u.kind)
      )
        return;
      return t;
    };
    const blocked = new Set(occupied);
    blocked.delete(key(u));
    const path = findPath(u, target, get, 32, blocked, u.kind);
    if (!path?.length) return;
    let remaining = unitMovementBudget(u, tileAt(s, u).biome, r.faction);
    const step: Hex[] = [];
    for (const p of path) {
      remaining -= movementCost(tileAt(s, p), u.kind);
      if (remaining < 0) break;
      step.push(p);
    }
    return step.length ? { type: 'MOVE', actorId: u.id, payload: { path: step } } : undefined;
  }
  function construction(kind: BuildingKind): BotIntent['command'] | undefined {
    const possible = [...sites.values()]
      .filter((p) => {
        const t = tileAt(s, p);
        return (
          !t.buildingId &&
          !strategic.has(key(p)) &&
          !enemies.has(key(p)) &&
          (!t.ownerId || t.ownerId === r.id) &&
          BUILDINGS[kind].terrains.includes(t.terrain) &&
          !navalConstructionReason(kind, p, (x) => tileAt(s, x))
        );
      })
      .sort((a, b) => {
        const cost = (p: Hex) =>
          Math.min(...builders.map((u) => distance(u, p))) + distance(r.capital, p) * 0.05;
        return cost(a) - cost(b) || key(a).localeCompare(key(b));
      });
    for (const p of possible) {
      const builder = builders.find((u) => distance(u, p) <= 1);
      if (builder) return { type: 'BUILD', actorId: builder.id, payload: { ...p, kind } };
    }
    // Route to a work position, not necessarily onto an impassable mountain quarry.
    for (const p of possible.slice(0, 12))
      for (const u of builders.slice().sort((a, b) => distance(a, p) - distance(b, p)))
        for (const work of [p, ...neighbors(p)].sort((a, b) => distance(u, a) - distance(u, b))) {
          const move = moveToward(u, work);
          if (move) return move;
        }
  }
  function gather(cost: Partial<Wallet>): BotIntent['command'] | undefined {
    const missing = RESOURCES.filter(
      (k) => r.wallet[k] < (cost[k] ?? 0) && rates[k] < GATHER_YIELD[k] / 10,
    ).sort((a, b) => rates[a] - rates[b]);
    for (const resource of missing)
      for (const u of builders.filter((u) => u.kind === 'PEASANT')) {
        if (canGather(tileAt(s, u), r.id, resource))
          return { type: 'GATHER', actorId: u.id, payload: { resource } };
        const places = disk(u, 6)
          .filter((p) => seen.has(key(p)) && canGather(tileAt(s, p), r.id, resource))
          .sort((a, b) => distance(u, a) - distance(u, b));
        for (const p of places.slice(0, 8)) {
          const move = moveToward(u, p);
          if (move) return move;
        }
      }
  }
  let reserve: Partial<Wallet> = {};
  for (const project of projects) {
    const upgrade = project.upgrade && buildingUpgrade(project.kind, project.upgrade.level);
    if (project.upgrade && (!upgrade || project.upgrade.population < upgrade.population)) continue;
    if (
      developmentReason(
        buildings,
        upgrade
          ? upgradeDevelopmentStage(project.kind, upgrade.level)
          : constructionDevelopmentStage(project.kind),
      )
    )
      continue;
    if (
      project.upgrade?.lastDamagedAt !== undefined &&
      project.upgrade.lastDamagedAt > r.lastSeen - 90000
    )
      continue;
    let cost = upgrade?.cost ?? buildingConstructionCost(project.kind, r.faction);
    let command: BotIntent['command'] | undefined;
    if (Math.max(...Object.values(cost)) > cap) {
      // Grow storage before saving for an investment above the current ceiling.
      const warehouse = owned('WAREHOUSE').find((b) => {
        const u = buildingUpgrade(b.kind, b.level);
        return u && Math.max(...Object.values(u.cost)) <= cap;
      });
      if (warehouse) {
        cost = buildingUpgrade(warehouse.kind, warehouse.level)!.cost;
        command = { type: 'UPGRADE', actorId: warehouse.id, payload: {} };
      } else {
        cost = buildingConstructionCost('WAREHOUSE', r.faction);
        command = construction('WAREHOUSE');
      }
    } else
      command = project.upgrade
        ? { type: 'UPGRADE', actorId: project.upgrade.id, payload: {} }
        : construction(project.kind);
    if (!command) continue;
    if (!Object.keys(reserve).length) reserve = cost;
    if (canAfford(r.wallet, cost)) {
      intents.push({ command, score: project.score });
      break;
    } else {
      const harvest = gather(cost);
      if (harvest) intents.push({ command: harvest, score: rates.FOOD < 0 ? 130 : 60 });
      // Keep the intended investment reserved instead of spending it on spare soldiers.
    }
  }
  return { intents, reserve };
}
