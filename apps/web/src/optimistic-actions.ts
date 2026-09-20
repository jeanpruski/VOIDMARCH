import { developmentProgress } from '@voidmarch/game-rules';
import { movementPayment } from '@voidmarch/config';
import { movementAPCost, anomalyAPReward } from '@voidmarch/game-rules';
import {
  developmentReason,
  constructionDevelopmentStage,
  upgradeDevelopmentStage,
} from '@voidmarch/config';
import {
  navalConstructionReason,
  recruitmentTileAllowed,
  fishingYield,
} from '@voidmarch/game-rules';
import {
  canCarrySupplies,
  supplyCharges,
  supplyCost,
  supplySource,
  repairPlan,
  consumeSupplies,
  CAMPAIGN_SUPPLIES,
} from '@voidmarch/game-rules';
import { movementBiome, unitMovementBudget } from '@voidmarch/game-rules';
import { allUnits, armyTraining, refreshArmyTraining } from '@voidmarch/game-rules';
import {
  ACTION_COST,
  BUILDINGS,
  BUILDING_POPULATION,
  BUILDING_REQUIREMENTS,
  CITY_LEVELS,
  GATHER_YIELD,
  RULES,
  TERRAFORM_COST,
  TURRETS,
  UNIT_PROFILES,
  UNITS,
  buildingConstructionCost,
  buildingUpgrade,
  isBuildable,
  unitPopulation,
  roadConstructionCost,
  type Wallet,
} from '@voidmarch/config';
import {
  armyPopulation,
  recruitmentRequirement,
  nextTurretLevel,
  turretUpgradeReason,
  canAfford,
  canGather,
  demolitionRefund,
  distance,
  key,
  movementCost,
  neighbors,
  roadPaths,
  roadPathTo,
  roadSiteReason,
  terraformSiteReason,
  unitStats,
  wallBlocks,
} from '@voidmarch/game-rules';
import type { Action } from '@voidmarch/protocol';
import type { ActionResult, WorldView } from '@voidmarch/shared';

export interface Prediction {
  world: WorldView;
  movement?: ActionResult['movement'];
  movements?: ActionResult['movements'];
}

/** Visual prediction only, using the player's visible information. Never grants vision,
 * rolls rare units, resolves combat or changes the authoritative state. */
export function predictAction(source: WorldView, action: Action): Prediction | undefined {
  if (source.player.defeatedAt || source.player.vigieTargetId) return;
  if (action.type === 'MOVE_GROUP') {
    if (
      action.actorId !== source.player.id ||
      new Set(action.payload.orders.map((o) => o.actorId)).size !== action.payload.orders.length
    )
      return;
    let current = source;
    const movements: NonNullable<ActionResult['movements']> = [];
    for (const order of action.payload.orders) {
      const next = predictAction(current, {
        ...order,
        actionId: action.actionId,
        clientTimestamp: action.clientTimestamp,
      });
      if (!next?.movement) return;
      current = next.world;
      movements.push(next.movement);
    }
    return { world: current, movements };
  }
  const world = structuredClone(source),
    player = world.player,
    id = player.id;
  const tiles = new Map(world.tiles.map((t) => [key(t), t]));
  const unit = world.units.find((u) => u.id === action.actorId && u.ownerId === id);
  const buildings = world.tiles.flatMap((t) => (t.building?.ownerId === id ? [t.building] : []));
  const building = buildings.find((b) => b.id === action.actorId);
  const pay = (cost: Partial<Wallet> = {}, ap: number = ACTION_COST[action.type]) => {
    if ((!player.unlimitedAP && player.ap < ap) || !canAfford(player.wallet, cost)) return false;
    if (!player.unlimitedAP) player.ap -= ap;
    for (const [resource, value] of Object.entries(cost))
      player.wallet[resource as keyof Wallet] -= value;
    return true;
  };
  const now = action.clientTimestamp;
  let movement: ActionResult['movement'];
  switch (action.type) {
    case 'MOVE':
    case 'MOVE_ROAD': {
      if (!unit) return;
      const blocked = new Set(world.units.filter((u) => u.id !== unit.id).map(key));
      for (const t of world.tiles)
        if (wallBlocks(t.building, id, unit.kind, world.strategy?.alliance?.members ?? []))
          blocked.add(key(t));
      const path =
        action.type === 'MOVE'
          ? action.payload.path
          : roadPathTo(action.payload, roadPaths(unit, tiles, blocked, unit.kind, id), blocked);
      if (!path?.length) return;
      let cursor = unit,
        cost = 0;
      for (const p of path) {
        const tile = tiles.get(key(p));
        if (
          !tile?.terrain ||
          tile.visibility === 'UNKNOWN' ||
          distance(cursor, p) !== 1 ||
          (!UNIT_PROFILES[unit.kind].flying && blocked.has(key(p)))
        )
          return;
        cost += movementCost({ ...p, terrain: tile.terrain, road: tile.road }, unit.kind);
        cursor = { ...unit, ...p };
      }
      const payment = movementPayment(
        unit.kind,
        movementAPCost(unit, path, (p) => tiles.get(key(p)), id, unit.kind),
        player,
      );
      if (
        blocked.has(key(cursor)) ||
        (action.type === 'MOVE' &&
          cost >
            unitMovementBudget(
              unit,
              movementBiome(world.seed, tiles.get(key(unit))),
              player.faction,
            )) ||
        !pay({}, payment.ap)
      )
        return;
      player.fuel = (player.fuel ?? 0) - payment.fuel;
      player.pervitin = (player.pervitin ?? 0) - payment.pervitin;
      movement = { unitId: unit.id, from: { q: unit.q, r: unit.r }, path };
      Object.assign(unit, path.at(-1), { updatedAt: now });
      break;
    }
    case 'BUILD': {
      const p = action.payload,
        t = tiles.get(key(p));
      if (!t?.terrain || t.visibility !== 'VISIBLE' || t.building || !isBuildable(p.kind)) return;
      const nearby = unit && UNIT_PROFILES[unit.kind].builder && distance(unit, p) <= 1;
      if (
        !!developmentReason(
          buildings,
          constructionDevelopmentStage(p.kind),
          developmentProgress(world),
        ) ||
        (t.enclosureOwnerId && !nearby) ||
        (t.ownerId !== id &&
          !(
            nearby &&
            !t.ownerId &&
            buildings.some((b) => distance(b, p) <= RULES.constructionRadius)
          )) ||
        (BUILDING_REQUIREMENTS[p.kind] ?? []).some(
          (kind) => !buildings.some((b) => b.kind === kind),
        ) ||
        !BUILDINGS[p.kind].terrains.includes(t.terrain) ||
        !!navalConstructionReason(p.kind, p, (x) => tiles.get(key(x))) ||
        world.units.some((u) => u.ownerId !== id && key(u) === key(t))
      )
        return;
      const cost = buildingConstructionCost(p.kind, player.faction);
      if (!pay(cost)) return;
      t.ownerId = id;
      t.building = {
        ...p,
        id: `preview:${action.actionId}`,
        ownerId: id,
        level: 1,
        hp: BUILDINGS[p.kind].hp,
        population: BUILDING_POPULATION[p.kind] ?? 0,
        name: BUILDINGS[p.kind].name,
        constructionCost: cost,
        createdAt: now,
        updatedAt: now,
      };
      break;
    }
    case 'RECRUIT': {
      const kind = action.payload.kind;
      if (
        !building ||
        recruitmentRequirement(kind, building, buildings, developmentProgress(world))
      )
        return;
      const free =
        kind === 'PEASANT' &&
        !allUnits(world.units).some((u) => u.ownerId === id && u.kind === 'PEASANT');
      if (
        !free &&
        armyPopulation(allUnits(world.units).filter((u) => u.ownerId === id)) +
          unitPopulation(kind) >
          Math.max(15, player.population)
      )
        return;
      const p = [building, ...neighbors(building)].find((p) => {
        const t = tiles.get(key(p));
        return (
          recruitmentTileAllowed(kind, t, id) &&
          t?.terrain &&
          !wallBlocks(t.building, id) &&
          movementCost({ ...p, terrain: t.terrain, road: t.road }, kind) <= UNITS[kind].move &&
          !world.units.some((u) => key(u) === key(p))
        );
      });
      if (!p || !pay(free ? {} : UNITS[kind].cost)) return;
      const { trainingBonus, supportBonus } = armyTraining(kind, buildings);
      world.units.push({
        q: p.q,
        r: p.r,
        id: `preview:${action.actionId}`,
        ownerId: id,
        kind,
        hp: unitStats({ kind, trainingBonus, supportBonus }).hp,
        ...(trainingBonus ? { trainingBonus } : {}),
        ...(Object.values(supportBonus).some(Boolean) ? { supportBonus } : {}),
        createdAt: now,
        updatedAt: now,
      });
      break;
    }
    case 'ROAD':
    case 'REMOVE_ROAD':
    case 'TERRAFORM': {
      const t = tiles.get(key(action.payload));
      if (!t?.terrain || t.visibility !== 'VISIBLE') return;
      if (action.type === 'TERRAFORM') {
        if (
          !unit ||
          terraformSiteReason(t, id, unit, world.units, world.player.capital) ||
          !pay(TERRAFORM_COST)
        )
          return;
        if (t.terrain === 'SCORCHED' && world.strategy)
          world.strategy.fallout = world.strategy.fallout.filter((f) => key(f) !== key(t));
        t.terrain = 'PLAIN';
        if (t.poi) t.exhausted = true;
        t.poi = undefined;
      } else {
        const remove = action.type === 'REMOVE_ROAD';
        if (
          roadSiteReason(t, id, world.units, remove) ||
          Boolean(t.road) === !remove ||
          !pay(remove ? {} : roadConstructionCost(t.terrain))
        )
          return;
        t.road = !remove;
        t.roadOwnerId = remove ? undefined : id;
      }
      break;
    }
    case 'GATHER': {
      const t = unit && tiles.get(key(unit)),
        resource = action.payload.resource;
      const fish = unit && resource === 'FOOD' ? fishingYield(unit, t) : 0;
      if (
        (unit?.kind !== 'PEASANT' && !fish) ||
        !t?.terrain ||
        (!fish && !canGather({ terrain: t.terrain, ownerId: t.ownerId }, id, resource))
      )
        return;
      const received = Math.min(
        fish || GATHER_YIELD[resource],
        Math.max(0, player.capacity - player.wallet[resource]),
      );
      if (!received || !pay()) return;
      player.wallet[resource] += received;
      break;
    }
    case 'RESUPPLY': {
      if (
        action.actorId !== id ||
        new Set(action.payload.unitIds).size !== action.payload.unitIds.length
      )
        return;
      const targets = action.payload.unitIds.map((uid) =>
        world.units.find((u) => u.id === uid && u.ownerId === id),
      );
      const sites = world.tiles.flatMap((t) => (t.building ? [t.building] : []));
      if (
        targets.some(
          (u) =>
            !u ||
            !canCarrySupplies(u) ||
            supplyCharges(u) >= CAMPAIGN_SUPPLIES.capacity ||
            !supplySource(u, sites, world.units, world.strategy?.alliance?.members),
        )
      )
        return;
      if (
        !pay(
          { FOOD: targets.reduce((sum, u) => sum + (supplyCost(u!).FOOD ?? 0), 0) },
          targets.length,
        )
      )
        return;
      for (const u of targets) {
        u!.provisions = CAMPAIGN_SUPPLIES.capacity;
        u!.updatedAt = now;
      }
      break;
    }
    case 'REPAIR': {
      const target = building ?? unit;
      if (!target) return;
      const plan = repairPlan(target, now);
      if (plan.reason || plan.restored <= 0 || !pay(plan.cost)) return;
      target.hp = Math.round((target.hp + plan.restored) * 100) / 100;
      target.lastRepairedAt = now;
      if (!building && plan.supplied) consumeSupplies(unit!, now);
      target.updatedAt = now;
      break;
    }
    case 'DEMOLISH': {
      if (!building || distance(building, player.capital) === 0 || !pay()) return;
      const refund = demolitionRefund(building, player.faction);
      for (const [resource, value] of Object.entries(refund))
        player.wallet[resource as keyof Wallet] += value;
      const t = tiles.get(key(building))!;
      t.building = undefined;
      t.capture = undefined;
      if (!t.enclosureOwnerId) t.ownerId = undefined;
      break;
    }
    case 'INSTALL_TURRET':
    case 'UPGRADE_TURRET': {
      if (
        !building ||
        (action.type === 'INSTALL_TURRET' ? !!building.turretLevel : !building.turretLevel) ||
        turretUpgradeReason(building, id, world.units)
      )
        return;
      const next = nextTurretLevel(building)!;
      if (!pay(TURRETS[next].cost)) return;
      if (!building.turretLevel) building.turretConstructionCost = { ...TURRETS[1].cost };
      building.turretLevel = next;
      building.updatedAt = now;
      player.progression.development++;
      break;
    }
    case 'UPGRADE': {
      if (!building) return;
      const upgrade = buildingUpgrade(building.kind, building.level);
      if (
        !upgrade ||
        (building.lastDamagedAt !== undefined && now - building.lastDamagedAt < 90000) ||
        developmentReason(
          buildings,
          upgradeDevelopmentStage(building.kind, upgrade.level),
          developmentProgress(world),
        ) ||
        building.population < upgrade.population ||
        !pay(upgrade.cost)
      )
        return;
      const oldKind = building.kind;
      building.constructionCost ??= buildingConstructionCost(building.kind, player.faction);
      building.kind = upgrade.kind;
      building.level = upgrade.level;
      building.hp = BUILDINGS[building.kind].hp * building.level;
      building.name =
        building.kind === 'VILLAGE'
          ? `${CITY_LEVELS[building.level]} de ${player.name}`
          : BUILDINGS[building.kind].name;
      building.updatedAt = now;
      if (oldKind === 'CAMP') building.population = Math.max(10, building.population);
      if (oldKind === 'OUTPOST') building.population = Math.max(15, building.population);
      refreshArmyTraining(
        allUnits(world.units).filter((u) => u.ownerId === id),
        buildings,
        now,
      );
      break;
    }
    case 'CAPTURE': {
      const t = unit && tiles.get(key(unit));
      // Neutral land only: hostile takeovers and battle results need server validation.
      if (!unit || !t || t.ownerId || t.building || UNITS[unit.kind].capture <= 0 || !pay()) return;
      const points = (t.capture?.by === id ? t.capture.points : 0) + UNITS[unit.kind].capture;
      if (points >= (t.poi ? 3 : 1)) {
        t.ownerId = id;
        t.capture = undefined;
      } else t.capture = { by: id, points };
      break;
    }
    case 'INTERACT': {
      if (!unit || action.payload.caravanId || action.payload.expeditionId) return;
      let reward: Partial<Wallet>, relic: string | undefined;
      if (action.payload.eventId) {
        const event = world.events.find((e) => e.id === action.payload.eventId);
        if (
          !event ||
          event.claimedBy ||
          event.endsAt <= now ||
          distance(unit, event) > 1 ||
          tiles.get(key(event))?.visibility !== 'VISIBLE'
        )
          return;
        reward = event.reward;
        relic = event.relic;
        world.events = world.events.filter((e) => e.id !== event.id);
      } else {
        const t = tiles.get(key(unit));
        if (!t?.poi || t.exhausted) return;
        reward = { GOLD: t.poi === 'MYTHIC' ? 100 : 35, IRON: 15 };
        if (t.poi === 'MYTHIC' || t.poi === 'RARE') relic = `Fragment de ${key(unit)}`;
        t.exhausted = true;
      }
      if (!pay()) return;
      for (const [resource, value] of Object.entries(reward))
        player.wallet[resource as keyof Wallet] += value;
      player.ap += anomalyAPReward(world.seed, action.payload.eventId ?? key(unit));
      if (relic) player.relics.push(relic);
      break;
    }
    case 'ABILITY': {
      if (
        !unit ||
        action.payload.ability === 'SURVEY' ||
        action.payload.ability.startsWith('HERO_')
      )
        return;
      if (action.payload.ability === 'RESTORE') {
        const targets = buildings.filter(
          (b) => distance(b, unit) <= 1 && b.hp < BUILDINGS[b.kind].hp * b.level,
        );
        if (unit.kind !== 'ENGINEER' || !targets.length || !pay({ WOOD: 5 })) return;
        for (const b of targets) {
          b.hp = Math.min(BUILDINGS[b.kind].hp * b.level, b.hp + 20);
          b.updatedAt = now;
        }
      } else {
        const mend = action.payload.ability === 'MEND';
        const targets = world.units.filter(
          (u) =>
            u.ownerId === id &&
            distance(u, unit) <= 2 &&
            !UNIT_PROFILES[u.kind].mechanical &&
            (!mend || u.hp < unitStats(u).hp),
        );
        if (
          (mend && (!UNIT_PROFILES[unit.kind].healer || !targets.length)) ||
          !pay(mend ? {} : { FOOD: 15 }, mend ? 1 : 2)
        )
          return;
        for (const u of targets) {
          u.hp =
            Math.round(
              Math.min(unitStats(u).hp, u.hp + (mend && unit.kind === 'HEALER' ? 6 : 3)) * 100,
            ) / 100;
          if (mend) u.updatedAt = now;
        }
      }
      break;
    }
    default:
      return;
  }
  refreshArmyTraining(
    allUnits(world.units).filter((u) => u.ownerId === id),
    world.tiles.flatMap((t) => (t.building?.ownerId === id ? [t.building] : [])),
    now,
  );
  // Never reveal unknown land; keep the minimap consistent for already known cells.
  world.overview = world.overview.map((t) => {
    const tile = tiles.get(key(t));
    return tile && t.visibility !== 'UNKNOWN'
      ? { ...t, terrain: tile.terrain, ownerId: tile.ownerId }
      : t;
  });
  return { world, movement };
}
