import { movementBiome, unitMovementBudget } from '@voidmarch/game-rules';
import { UNIT_BIOME_ADAPTATIONS, MAX_MOVE_STEPS } from '@voidmarch/config';
import {
  distance,
  findPath,
  key,
  movementCost,
  neighbors,
  roadPaths,
  roadPathTo,
  travelNetworkTile,
  wallBlocks,
} from '@voidmarch/game-rules';
import type { Hex, MissionOffer, Unit, WorldView } from '@voidmarch/shared';

export function missionDifficulty(offer: Pick<MissionOffer, 'difficulty' | 'wall'>) {
  if (offer.difficulty === 'Grande campagne')
    return {
      label: 'Extrême',
      tone: 'hard',
      advice: 'Campagne alliée : coordonnez plusieurs armées, le siège et la défense antiaérienne.',
    };
  if (offer.difficulty === 'Siège')
    return {
      label: 'Difficile',
      tone: 'hard',
      advice: 'Une troupe de siège et une armée variée sont conseillées.',
    };
  if (offer.difficulty === 'Assaut')
    return {
      label: 'Moyenne',
      tone: 'medium',
      advice: offer.wall
        ? 'Plusieurs défenseurs et une enceinte : prévois de quoi ouvrir une brèche.'
        : 'Plusieurs défenseurs : prévois plusieurs unités de combat.',
    };
  return {
    label: 'Facile',
    tone: 'easy',
    advice: 'Petite garnison sans remparts ; envoie des troupes de combat.',
  };
}
/** Planning estimate only: known terrain/occupants may change before the army arrives. */
export function missionTravel(world: WorldView, target: Hex, unit: Unit) {
  const cases = distance(unit, target);
  const budget = unitMovementBudget(
    unit,
    movementBiome(
      world.seed,
      world.tiles.find((t) => key(t) === key(unit)),
    ),
    world.player.faction,
  );
  if (cases <= 1) return { cases, pa: 0, basis: 'near' as const };
  const rough = {
    cases,
    pa: budget > 0 ? Math.ceil((cases - 1) / Math.min(MAX_MOVE_STEPS, budget)) : null,
    basis: 'unknown' as const,
  };
  if (budget <= 0) return rough;
  const tiles = new Map(
    world.tiles.filter((t) => t.visibility !== 'UNKNOWN' && t.terrain).map((t) => [key(t), t]),
  );
  const blocked = new Set(world.units.filter((u) => u.id !== unit.id).map(key));
  for (const t of tiles.values())
    if (wallBlocks(t.building, unit.ownerId, unit.kind, world.strategy?.alliance?.members ?? []))
      blocked.add(key(t));
  const goals = neighbors(target).filter((p) => tiles.has(key(p)) && !blocked.has(key(p)));
  if (!goals.length) return rough;
  const roads = roadPaths(unit, tiles, blocked, unit.kind, unit.ownerId);
  if (goals.some((p) => roadPathTo(p, roads, blocked)?.length))
    return { cases, pa: 1, basis: 'road' as const };
  const maxBudget = unitMovementBudget(
    unit,
    UNIT_BIOME_ADAPTATIONS[unit.kind],
    world.player.faction,
  );
  let best = Infinity;
  for (const goal of goals) {
    const path = findPath(
      unit,
      goal,
      (p) => {
        const t = tiles.get(key(p));
        if (
          !t?.terrain ||
          movementCost({ ...p, terrain: t.terrain, road: t.road }, unit.kind) > maxBudget
        )
          return undefined;
        return { ...p, terrain: t.terrain, road: t.road };
      },
      Math.max(100, cases * 4),
      blocked,
      unit.kind,
    );
    if (!path) continue;
    const points = [unit, ...path];
    const costs = Array(points.length).fill(Infinity);
    costs[0] = 0;
    // Count valid MOVE commands and unlimited network runs along the proposed path.
    for (let i = 0; i < points.length - 1; i++) {
      const stepBudget = unitMovementBudget(
        unit,
        movementBiome(world.seed, tiles.get(key(points[i]))),
        world.player.faction,
      );
      let spent = 0;
      let network = travelNetworkTile(tiles.get(key(points[i])), unit.ownerId, unit.kind);
      for (let j = i + 1; j < points.length; j++) {
        const t = tiles.get(key(points[j]))!;
        spent += movementCost({ ...points[j], terrain: t.terrain!, road: t.road }, unit.kind);
        network = network && travelNetworkTile(t, unit.ownerId, unit.kind);
        const canStop = !blocked.has(key(points[j]));
        if (canStop && (network || (spent <= stepBudget && j - i <= MAX_MOVE_STEPS)))
          costs[j] = Math.min(costs[j], costs[i] + 1);
        if (!network && (spent > stepBudget || j - i >= MAX_MOVE_STEPS)) break;
      }
    }
    best = Math.min(best, costs.at(-1)!);
  }
  return Number.isFinite(best) ? { cases, pa: best, basis: 'known' as const } : rough;
}
