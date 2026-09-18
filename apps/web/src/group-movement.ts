import {
  ACTION_COST,
  UNITS,
  UNIT_PROFILES,
  MAX_GROUP_UNITS,
  MAX_MOVE_STEPS,
} from '@voidmarch/config';
import {
  distance,
  key,
  neighbors,
  movementCost,
  roadPaths,
  roadPathTo,
  wallBlocks,
} from '@voidmarch/game-rules';
import type { ArmyFormation, Hex, Unit, WorldView } from '@voidmarch/shared';

export { MAX_GROUP_UNITS, MAX_MOVE_STEPS } from '@voidmarch/config';
export type GroupMoveOrder =
  | { type: 'MOVE'; actorId: string; payload: { path: Hex[] } }
  | { type: 'MOVE_ROAD'; actorId: string; payload: Hex };
export interface GroupMovePlan {
  orders: GroupMoveOrder[];
  journeys: { unitId: string; from: Hex; path: Hex[]; network: boolean }[];
  stationary: { unitId: string; reason: string }[];
  cost: number;
}
/** Shared traversal for the movement plan and its pre-selection range. */
function movementSearch(world: WorldView, units: Unit[], selectedIds = new Set<string>()) {
  const tiles = new Map(
    world.tiles.filter((t) => t.terrain && t.visibility !== 'UNKNOWN').map((t) => [key(t), t]),
  );
  return (unit: Unit, planningAnchor = false) => {
    const blocked = new Set(
      units.filter((u) => u.id !== unit.id && !(planningAnchor && selectedIds.has(u.id))).map(key),
    );
    for (const tile of tiles.values())
      if (
        wallBlocks(tile.building, unit.ownerId, unit.kind, world.strategy?.alliance?.members ?? [])
      )
        blocked.add(key(tile));
    const routes = roadPaths(unit, tiles, blocked, unit.kind, unit.ownerId);
    const budget =
      UNITS[unit.kind].move +
      (UNIT_PROFILES[unit.kind].mounted && world.player.faction === 'IRON' ? 1 : 0);
    const frontier: { p: Hex; path: Hex[]; cost: number }[] = [{ p: unit, path: [], cost: 0 }];
    const costs = new Map<string, number>();
    const reachable = new Map<string, Hex[]>();
    // Keep step count in the search state to respect the ordinary-order step limit.
    for (let i = 0; i < frontier.length; i++) {
      const current = frontier[i];
      if (current.path.length >= MAX_MOVE_STEPS) continue;
      for (const p of neighbors(current.p)) {
        const tile = tiles.get(key(p));
        if (!tile?.terrain || (blocked.has(key(p)) && !UNIT_PROFILES[unit.kind].flying)) continue;
        const cost =
          current.cost + movementCost({ ...p, terrain: tile.terrain, road: tile.road }, unit.kind);
        const stateKey = `${key(p)}:${current.path.length + 1}`;
        if (cost > budget || cost >= (costs.get(stateKey) ?? Infinity)) continue;
        costs.set(stateKey, cost);
        const path = [...current.path, p];
        frontier.push({ p, path, cost });
        if (
          !blocked.has(key(p)) &&
          (!reachable.has(key(p)) || reachable.get(key(p))!.length > path.length)
        )
          reachable.set(key(p), path);
      }
    }
    const candidates = [...new Set([...reachable.keys(), ...routes.keys()])]
      .filter((k) => k !== key(unit) && !blocked.has(k))
      .map((k) => ({ p: tiles.get(k)!, network: routes.has(k), path: reachable.get(k) }))
      .filter((c) => c.p);
    return { candidates, routes, blocked };
  };
}

/** Plan in execution order: front units free their origin before followers move.
 * A common advance point keeps mixed-speed troops together; every arrival is reserved. */
export function planGroupMovement(
  world: WorldView,
  ids: string[],
  target: Hex,
  formation: ArmyFormation = 'COMPACT',
): GroupMovePlan {
  const result: GroupMovePlan = { orders: [], journeys: [], stationary: [], cost: 0 };
  const units = world.units.map((u) => ({ ...u }));
  const selected = units
    .filter((u) => ids.includes(u.id) && u.ownerId === world.player.id && u.hp > 0)
    .sort((a, b) => distance(a, target) - distance(b, target) || a.id.localeCompare(b.id))
    .slice(0, MAX_GROUP_UNITS);
  const selectedIds = new Set(selected.map((u) => u.id));
  const reachableBy = movementSearch(world, units, selectedIds);
  // Find a common advance point that the most constrained moving unit can reach.
  // Ignore selected troops for this estimate only; real paths still reserve every position.
  const advances = selected
    .flatMap((unit) => {
      const { candidates } = reachableBy(unit, true);
      const best = candidates
        .filter((c) => distance(c.p, target) < distance(unit, target))
        .sort(
          (a, b) =>
            distance(a.p, target) - distance(b.p, target) ||
            selected.reduce((n, u) => n + distance(u, a.p) - distance(u, b.p), 0) ||
            key(a.p).localeCompare(key(b.p)),
        )[0];
      return best ? [best.p] : [];
    })
    .sort((a, b) => distance(b, target) - distance(a, target) || key(a).localeCompare(key(b)));
  const anchor: Hex = advances[0] ?? target;
  const slots = formationSlots(selected, anchor, target, formation);
  const arrivals: Hex[] = [];
  for (const unit of selected) {
    const { candidates, routes, blocked } = reachableBy(unit);
    candidates.push({ p: { ...unit, visibility: 'VISIBLE' }, network: false, path: [] });
    // Pack around the shared point instead of letting fast troops race ahead.
    // Staying put wins a tie, avoiding a paid sideways shuffle with no cohesion gain.
    candidates.sort(
      (a, b) =>
        distance(a.p, slots.get(unit.id) ?? anchor) - distance(b.p, slots.get(unit.id) ?? anchor) ||
        arrivals.reduce((n, p) => n + distance(a.p, p) - distance(b.p, p), 0) ||
        Number(key(b.p) === key(unit)) - Number(key(a.p) === key(unit)) ||
        distance(a.p, target) - distance(b.p, target) ||
        Number(b.network) - Number(a.network) ||
        (a.path?.length ?? 0) - (b.path?.length ?? 0) ||
        key(a.p).localeCompare(key(b.p)),
    );
    const chosen = candidates[0];
    const path = chosen?.network
      ? roadPathTo({ q: chosen.p.q, r: chosen.p.r }, routes, blocked)
      : chosen?.path;
    if (!chosen || !path?.length) {
      arrivals.push({ q: unit.q, r: unit.r });
      result.stationary.push({
        unitId: unit.id,
        reason:
          distance(unit, target) <= 1
            ? 'Déjà en position dans le groupe'
            : 'Reste en formation ou aucun trajet praticable',
      });
      continue;
    }
    const endpoint = path[path.length - 1];
    arrivals.push(endpoint);
    const order: GroupMoveOrder = chosen.network
      ? { type: 'MOVE_ROAD', actorId: unit.id, payload: { q: endpoint.q, r: endpoint.r } }
      : { type: 'MOVE', actorId: unit.id, payload: { path } };
    result.orders.push(order);
    result.journeys.push({
      unitId: unit.id,
      from: { q: unit.q, r: unit.r },
      path,
      network: chosen.network,
    });
    result.cost += ACTION_COST[order.type];
    Object.assign(unit, endpoint);
  }
  return result;
}
let cached:
  | { world: WorldView; ids: string[]; target: Hex; formation: ArmyFormation; plan: GroupMovePlan }
  | undefined;
export function groupMovementPreview(
  world: WorldView,
  ids: string[],
  target: Hex,
  formation: ArmyFormation = 'COMPACT',
) {
  if (
    cached?.world === world &&
    cached.ids === ids &&
    cached.target === target &&
    cached.formation === formation
  )
    return cached.plan;
  const plan = planGroupMovement(world, ids, target, formation);
  cached = { world, ids, target, formation, plan };
  return plan;
}

export interface GroupMovementRange {
  total: number;
  cells: Map<string, Hex & { count: number }>;
}
let rangeCache: { world: WorldView; ids: string[]; range: GroupMovementRange } | undefined;
/** Individual reach, before formation packing. Occupied destinations are never advertised. */
export function groupMovementRange(world: WorldView, ids: string[]): GroupMovementRange {
  if (rangeCache?.world === world && rangeCache.ids === ids) return rangeCache.range;
  const selected = world.units
    .filter((u) => ids.includes(u.id) && u.ownerId === world.player.id && u.hp > 0)
    .slice(0, MAX_GROUP_UNITS);
  const range: GroupMovementRange = { total: selected.length, cells: new Map() };
  const reachableBy = movementSearch(world, world.units);
  for (const unit of selected)
    for (const { p } of reachableBy(unit).candidates) {
      const k = key(p),
        previous = range.cells.get(k);
      range.cells.set(k, { q: p.q, r: p.r, count: (previous?.count ?? 0) + 1 });
    }
  rangeCache = { world, ids, range };
  return range;
}

export const FORMATION_NAMES: Record<ArmyFormation, string> = {
  COMPACT: 'Compacte',
  LINE: 'Ligne de front',
  PROTECTED: 'Soutien protégé',
};
export const FORMATION_DESCRIPTIONS: Record<ArmyFormation, string> = {
  COMPACT: 'Les troupes restent proches, au rythme des plus lentes.',
  LINE: 'Les troupes s’étalent perpendiculairement à la direction de marche.',
  PROTECTED: 'Les combattants robustes passent devant, les civils et tireurs restent derrière.',
};
/** Formation targets are ideals; reachable paths and unique arrivals remain mandatory. */
export function formationSlots(units: Unit[], anchor: Hex, target: Hex, formation: ArmyFormation) {
  const slots = new Map<string, Hex>();
  if (!units.length || formation === 'COMPACT') return slots;
  const center = units.reduce(
    (p, u) => ({ q: p.q + u.q / units.length, r: p.r + u.r / units.length }),
    { q: 0, r: 0 },
  );
  let x = target.q - center.q + (target.r - center.r) / 2,
    y = ((target.r - center.r) * Math.sqrt(3)) / 2;
  const length = Math.hypot(x, y);
  if (length < 0.01) {
    x = 1;
    y = 0;
  } else {
    x /= length;
    y /= length;
  }
  const offset = (forward: number, side: number): Hex => {
    const dx = x * forward - y * side,
      dy = y * forward + x * side;
    const r = (dy * 2) / Math.sqrt(3);
    return { q: anchor.q + dx - r / 2, r: anchor.r + r };
  };
  const rear = (u: Unit) =>
    UNIT_PROFILES[u.kind].siege ||
    UNIT_PROFILES[u.kind].hero ||
    UNITS[u.kind].attack === 0 ||
    (UNITS[u.kind].range > 1 && !UNIT_PROFILES[u.kind].mechanical);
  const rows =
    formation === 'LINE' ? [[...units]] : [units.filter((u) => !rear(u)), units.filter(rear)];
  rows.forEach((row, index) =>
    row
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((u, i) => {
        slots.set(
          u.id,
          offset(
            formation === 'LINE' ? 0 : index === 0 ? 0.8 : -1.3,
            (i - (row.length - 1) / 2) * 1.05,
          ),
        );
      }),
  );
  return slots;
}
