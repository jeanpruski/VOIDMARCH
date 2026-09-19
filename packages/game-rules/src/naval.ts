import {
  BUILDINGS,
  UNIT_PROFILES,
  isNavalBuilding,
  isSea,
  type BuildingKind,
  type UnitKind,
  type Terrain,
} from '@voidmarch/config';
import type { GameState, Hex, Unit, ViewTile } from '@voidmarch/shared';
import { distance, neighbors, alliedRealmIds } from './index';

export function navalConstructionReason(
  kind: BuildingKind,
  p: Hex,
  getTile: (p: Hex) => { terrain?: Terrain } | undefined,
) {
  return isNavalBuilding(kind) && !neighbors(p).some((n) => isSea(getTile(n)?.terrain))
    ? 'Bâtiment côtier : choisissez une terre directement voisine de la mer.'
    : '';
}
export function recruitmentTileAllowed(
  kind: UnitKind,
  tile: { terrain?: Terrain; ownerId?: string } | undefined,
  ownerId: string,
) {
  if (!tile?.terrain) return false;
  return UNIT_PROFILES[kind].naval
    ? isSea(tile.terrain) && (!tile.ownerId || tile.ownerId === ownerId)
    : tile.ownerId === ownerId;
}
export const fishingYield = (
  unit: Unit,
  tile: { terrain?: Terrain; ownerId?: string } | undefined,
) =>
  isSea(tile?.terrain) && (!tile?.ownerId || tile.ownerId === unit.ownerId)
    ? (UNIT_PROFILES[unit.kind].fishing ?? 0)
    : 0;
/** Visibility of the hex alone never discloses a submerged enemy. */
export function submarineVisible(s: GameState, viewerId: string, unit: Unit, now: number) {
  if (!UNIT_PROFILES[unit.kind].submarine || unit.ownerId === viewerId) return true;
  const friends = new Set([viewerId, ...alliedRealmIds(s, viewerId)]);
  if (friends.has(unit.ownerId) || (unit.revealedUntil ?? 0) > now) return true;
  return (
    Object.values(s.units).some(
      (detector) =>
        detector.hp > 0 &&
        friends.has(detector.ownerId) &&
        (UNIT_PROFILES[detector.kind].sonar ?? 0) > 0 &&
        distance(detector, unit) <= UNIT_PROFILES[detector.kind].sonar!,
    ) ||
    Object.values(s.buildings).some(
      (b) =>
        b.hp > 0 &&
        friends.has(b.ownerId) &&
        (b.kind === 'SUBMARINE_BASE' || b.kind === 'COASTAL_BATTERY') &&
        b.level >= 3 &&
        distance(b, unit) <= b.level - 1,
    )
  );
}
export function coastlineHelp(tile: ViewTile) {
  if (isSea(tile.terrain))
    return 'Mer : navires et aéronefs uniquement. Transportez les troupes terrestres dans un bateau ; débarquez sur une terre voisine libre.';
  if (tile.terrain === 'BEACH')
    return 'Plage : passage terrestre et débarquement. Les installations maritimes se construisent au contact de l’eau.';
  return '';
}
