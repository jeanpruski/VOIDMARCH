import {
  BUILDINGS,
  BUILDING_REQUIREMENTS,
  type BuildingKind,
  type Terrain,
} from '@voidmarch/config';

/** Depth in the existing prerequisite tree, not a new unlock or city level. */
export function buildingStage(kind: BuildingKind): number {
  const requirements = BUILDING_REQUIREMENTS[kind] ?? [];
  return requirements.length ? 1 + Math.max(...requirements.map(buildingStage)) : 0;
}
export function compareBuildings(a: BuildingKind, b: BuildingKind, terrain?: Terrain) {
  const compatible = (kind: BuildingKind) =>
    terrain ? Number(BUILDINGS[kind].terrains.includes(terrain)) : 0;
  const cost = (kind: BuildingKind) =>
    Object.values(BUILDINGS[kind].cost).reduce((sum, value) => sum + value, 0);
  return (
    compatible(b) - compatible(a) ||
    buildingStage(a) - buildingStage(b) ||
    cost(a) - cost(b) ||
    BUILDINGS[a].name.localeCompare(BUILDINGS[b].name, 'fr')
  );
}
export function buildingsUnlockedBy(kind: BuildingKind): BuildingKind[] {
  return (Object.keys(BUILDINGS) as BuildingKind[]).filter((candidate) =>
    BUILDING_REQUIREMENTS[candidate]?.includes(kind),
  );
}
