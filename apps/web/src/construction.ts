import { RULES, UNIT_PROFILES, isSea, type BuildingKind } from '@voidmarch/config';
import { distance, key, expeditionDistance, canFoundOutpost } from '@voidmarch/game-rules';
import type { Unit, ViewTile, WorldView } from '@voidmarch/shared';

/** Site eligibility shared by the map overlay, terrain actions and building catalogue. */
export function constructionSiteReason(world: WorldView, tile?: ViewTile, kind?: BuildingKind) {
  if (!tile?.terrain || tile.visibility === 'UNKNOWN')
    return 'Explorez ce terrain avant de construire.';
  if (
    [world.missions?.active, ...(world.missions?.allied ?? [])].some(
      (m) => m?.expedition && expeditionDistance(m, tile) === 0,
    )
  )
    return 'Les 3 cases de ce lieu sont réservées à une expédition en cours.';
  if (isSea(tile.terrain)) return 'Construisez les ports sur la terre, au bord de la mer.';
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
    !world.units.some((u) => canFoundOutpost(kind ?? 'OUTPOST', world.player.id, tile, u)) &&
    !world.tiles.some(
      (t) =>
        t.building?.ownerId === world.player.id && distance(t, tile) <= RULES.constructionRadius,
    )
  )
    return 'À plus de 3 cases de vos bâtiments, seul un avant-poste peut être fondé, avec un paysan sur sa case neutre.';
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
