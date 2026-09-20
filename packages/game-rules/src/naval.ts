import {
  BUILDINGS,
  UNIT_PROFILES,
  isNavalBuilding,
  isOffshoreBuilding,
  RULES,
  isSea,
  type BuildingKind,
  type UnitKind,
  type Terrain,
} from '@voidmarch/config';
import type { GameState, Hex, Unit, ViewTile, Building } from '@voidmarch/shared';
import { distance, neighbors, alliedRealmIds } from './index';

export function navalConstructionReason(
  kind: BuildingKind,
  p: Hex,
  getTile: (p: Hex) => { terrain?: Terrain } | undefined,
) {
  if (!isNavalBuilding(kind)) return '';
  if (isOffshoreBuilding(kind)) {
    if (!isSea(getTile(p)?.terrain))
      return 'Installation maritime : choisissez une case d’eau directement voisine d’une plage.';
    if (!neighbors(p).some((n) => getTile(n)?.terrain === 'BEACH'))
      return 'Le chantier doit toucher une plage : pas de construction en pleine mer.';
    return '';
  }
  return isSea(getTile(p)?.terrain) || !neighbors(p).some((n) => isSea(getTile(n)?.terrain))
    ? 'Batterie côtière : choisissez une terre directement voisine de la mer.'
    : '';
}
type CoastTile = { terrain?: Terrain; ownerId?: string };
export function isCoastalBuilder(
  unit: Unit,
  site: Hex,
  ownerId: string,
  getTile: (p: Hex) => CoastTile | undefined,
) {
  const shore = getTile(unit);
  return (
    unit.ownerId === ownerId &&
    unit.hp > 0 &&
    !unit.carrierId &&
    UNIT_PROFILES[unit.kind].builder &&
    distance(unit, site) === 1 &&
    shore?.terrain === 'BEACH' &&
    (!shore.ownerId || shore.ownerId === ownerId)
  );
}
/** A claimed shore supplies territorial access; neutral shores keep the usual building radius. */
export function offshoreAccessReason(
  site: Hex,
  ownerId: string,
  buildings: readonly Building[],
  builders: readonly Unit[],
  getTile: (p: Hex) => CoastTile | undefined,
) {
  const owner = getTile(site)?.ownerId;
  if (owner && owner !== ownerId) return 'Cette case d’eau appartient à un autre royaume.';
  const workers = builders.filter((u) => isCoastalBuilder(u, site, ownerId, getTile));
  if (!workers.length)
    return 'Placez un paysan ou un ingénieur sur une plage voisine du chantier, neutre ou à vous.';
  if (
    owner === ownerId ||
    workers.some((u) => getTile(u)?.ownerId === ownerId) ||
    buildings.some(
      (b) => b.ownerId === ownerId && b.hp > 0 && distance(b, site) <= RULES.constructionRadius,
    )
  )
    return '';
  return 'Revendiquez la plage de votre bâtisseur, ou rapprochez le chantier à 3 cases de vos bâtiments.';
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
  unit.hp > 0 &&
  !unit.carrierId &&
  isSea(tile?.terrain) &&
  (!tile?.ownerId || tile.ownerId === unit.ownerId)
    ? (UNIT_PROFILES[unit.kind].fishing ?? 0)
    : 0;
/** Gross food per minute, using the same water and ownership rules as manual fishing. */
export const passiveFishingYield = (unit: Unit, tile: Parameters<typeof fishingYield>[1]) =>
  fishingYield(unit, tile) / 4;
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
    return 'Mer : navires et aéronefs uniquement. Ports, chantiers navals, pêcheries maritimes et bases de sous-marins se construisent dans l’eau au contact direct d’une plage, avec un bâtisseur sur cette plage. Transportez les troupes terrestres en bateau.';
  if (tile.terrain === 'BEACH')
    return 'Plage : passage terrestre, débarquement et position du bâtisseur. Sélectionnez une case d’eau voisine pour construire une installation maritime. La batterie côtière reste à terre.';
  return '';
}
