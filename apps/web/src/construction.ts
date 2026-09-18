import { RULES, UNIT_PROFILES } from '@voidmarch/config';
import { distance, key } from '@voidmarch/game-rules';
import type { Unit, ViewTile, WorldView } from '@voidmarch/shared';

/** Site eligibility shared by the map overlay, terrain actions and building catalogue. */
export function constructionSiteReason(world: WorldView, tile?: ViewTile) {
  if (!tile?.terrain || tile.visibility === 'UNKNOWN')
    return 'Explorez ce terrain avant de construire.';
  if (tile.building) return 'Un bâtiment occupe déjà cette case.';
  if (world.strategy?.sites.some((site) => key(site) === key(tile)))
    return 'Ce site stratégique doit rester libre de construction.';
  if (tile.terrain === 'SCORCHED')
    return 'Restaurez ce terrain avec un terrassier avant de construire.';
  const own = tile.ownerId === world.player.id;
  if (tile.ownerId && !own)
    return 'Vous ne pouvez pas construire sur les terres d’un autre royaume.';
  if (world.units.some((u) => u.ownerId !== world.player.id && distance(u, tile) === 0))
    return 'Une unité adverse occupe ce terrain.';
  if (
    !own &&
    !world.tiles.some(
      (t) =>
        t.building?.ownerId === world.player.id && distance(t, tile) <= RULES.constructionRadius,
    )
  )
    return 'Le chantier doit être à 3 cases maximum de l’un de vos bâtiments.';
  if (
    (!own || tile.enclosureOwnerId) &&
    !world.units.some(
      (u) =>
        u.ownerId === world.player.id && UNIT_PROFILES[u.kind].builder && distance(u, tile) <= 1,
    )
  )
    return 'Approchez un paysan ou un ingénieur à une case maximum pour construire.';
  return '';
}

export function isBuilderSite(world: WorldView, unit: Unit, tile?: ViewTile) {
  return (
    unit.ownerId === world.player.id &&
    UNIT_PROFILES[unit.kind].builder &&
    !!tile &&
    tile.visibility === 'VISIBLE' &&
    distance(unit, tile) <= 1 &&
    !constructionSiteReason(world, tile)
  );
}
