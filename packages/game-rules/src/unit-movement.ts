import { UNIT_BIOME_ADAPTATIONS, UNIT_PROFILES, type Biome, type Faction } from '@voidmarch/config';
import type { Hex, Unit } from '@voidmarch/shared';
import { biomeAt } from './biomes';
import { unitStats } from './index';

/** Use the saved primary biome, never the visual blend or randomly selected scenery. */
export function movementBiome(
  seed: string,
  tile?: Hex & { biome?: Biome; visibility?: string },
): Biome | undefined {
  if (!tile || tile.visibility === 'UNKNOWN') return undefined;
  return tile.biome ?? biomeAt(seed, tile);
}
export function biomeMovementBonus(unit: Pick<Unit, 'kind' | 'npc'>, biome?: Biome) {
  return !unit.npc && biome !== undefined && UNIT_BIOME_ADAPTATIONS[unit.kind] === biome ? 1 : 0;
}
/** Freeze this budget once per MOVE, using its starting hex. Entering a new biome
 * cannot grant extra points during that order. Roads keep their separate rules. */
export function unitMovementBudget(
  unit: Parameters<typeof unitStats>[0],
  biome?: Biome,
  faction?: Faction,
) {
  return (
    unitStats(unit).move +
    biomeMovementBonus(unit, biome) +
    (faction === 'IRON' && UNIT_PROFILES[unit.kind].mounted ? 1 : 0)
  );
}
