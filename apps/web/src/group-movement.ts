import { ACTION_COST, UNITS, UNIT_PROFILES, MAX_GROUP_UNITS } from '@voidmarch/config';
import {
  distance,
  key,
  neighbors,
  movementCost,
  roadPaths,
  roadPathTo,
  wallBlocks,
} from '@voidmarch/game-rules';
import type { Hex, Unit, WorldView } from '@voidmarch/shared';

export { MAX_GROUP_UNITS } from '@voidmarch/config';
export type GroupMoveOrder =
  | { type: 'MOVE'; actorId: string; payload: { path: Hex[] } }
  | { type: 'MOVE_ROAD'; actorId: string; payload: Hex };
export interface GroupMovePlan {
  orders: GroupMoveOrder[];
  journeys: { unitId: string; from: Hex; path: Hex[]; network: boolean }[];
  stationary: { unitId: string; reason: string }[];
  cost: number;
}
/** Plan in execution order: front units free their origin before followers move.
 * A common advance point keeps mixed-speed troops together; every arrival is reserved. */
export function planGroupMovement(world: WorldView, ids: string[], target: Hex): GroupMovePlan {
  const result: GroupMovePlan = { orders: [], journeys: [], stationary: [], cost: 0 };
  const tiles = new Map(
    world.tiles.filter((t) => t.terrain && t.visibility !== 'UNKNOWN').map((t) => [key(t), t]),
  );
  const units = world.units.map((u) => ({ ...u }));
  const selected = units
    .filter((u) => ids.includes(u.id) && u.ownerId === world.player.id && u.hp > 0)
    .sort((a, b) => distance(a, target) - distance(b, target) || a.id.localeCompare(b.id))
    .slice(0, MAX_GROUP_UNITS);
  const selectedIds = new Set(selected.map((u) => u.id));
  const reachableBy = (unit: Unit, planningAnchor = false) => {
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
    // Keep step count in the search state to respect the 12-hex ordinary-order limit.
    for (let i = 0; i < frontier.length; i++) {
      const current = frontier[i];
      if (current.path.length >= 12) continue;
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
  const arrivals: Hex[] = [];
  for (const unit of selected) {
    const { candidates, routes, blocked } = reachableBy(unit);
    candidates.push({ p: { ...unit, visibility: 'VISIBLE' }, network: false, path: [] });
    // Pack around the shared point instead of letting fast troops race ahead.
    // Staying put wins a tie, avoiding a paid sideways shuffle with no cohesion gain.
    candidates.sort(
      (a, b) =>
        distance(a.p, anchor) - distance(b.p, anchor) ||
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
let cached: { world: WorldView; ids: string[]; target: Hex; plan: GroupMovePlan } | undefined;
export function groupMovementPreview(world: WorldView, ids: string[], target: Hex) {
  if (cached?.world === world && cached.ids === ids && cached.target === target) return cached.plan;
  const plan = planGroupMovement(world, ids, target);
  cached = { world, ids, target, plan };
  return plan;
}
