import { isNavalBuilding } from './naval';
import type { BuildingKind } from './index';
import { BUILDING_ECONOMIC_TIERS } from './economy';

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
  if (isNavalBuilding(kind)) return BUILDING_AGES[Math.min(4, Math.max(0, level - 1))];
  const tier = BUILDING_ECONOMIC_TIERS[kind];
  const first = tier >= 5 ? 4 : tier >= 3 || kind === 'RAIL_DEPOT' ? 2 : 0;
  return BUILDING_AGES[Math.min(4, first + Math.max(0, level - 1))];
}
export function hasBuildingEvolutionArt(kind: BuildingKind): boolean {
  return !kind.endsWith('_WALL') && kind !== 'CAMP' && kind !== 'OUTPOST';
}
