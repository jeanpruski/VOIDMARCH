import { BUILDING_MIN_ERA } from './epochs';
import { isNavalBuilding } from './naval';
import type { BuildingKind } from './index';

export const BUILDING_AGES = [
  'Fondations médiévales',
  'Empire',
  'Guerre industrielle',
  'Complexe avancé',
  'Âge atomique',
] as const;
export const MAX_BUILDING_LEVEL = 5;
/** Advanced facilities refine their own technology instead of regressing into the past. */
export function buildingEra(kind: BuildingKind, level: number): string {
  const wallTier = [
    'WOOD_WALL',
    'STONE_WALL',
    'STEEL_WALL',
    'CONCRETE_WALL',
    'ATOMIC_WALL',
  ].indexOf(kind);
  if (wallTier >= 0) return BUILDING_AGES[wallTier];
  return BUILDING_AGES[Math.min(4, Math.max(BUILDING_MIN_ERA[kind], level) - 1)];
}
export function hasBuildingEvolutionArt(kind: BuildingKind): boolean {
  return !kind.endsWith('_WALL') && kind !== 'CAMP' && kind !== 'OUTPOST';
}

/** Naval sheets depict world eras; a submarine base must never use the medieval port art. */
export function buildingVisualLevel(kind: BuildingKind, level: number) {
  return isNavalBuilding(kind) ? Math.max(BUILDING_MIN_ERA[kind], level) : level;
}
