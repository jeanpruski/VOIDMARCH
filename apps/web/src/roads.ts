import { roadConstructionCost } from '@voidmarch/config';
import { canAfford, roadSiteReason } from '@voidmarch/game-rules';
import type { ViewTile, WorldView } from '@voidmarch/shared';
export type RoadTool = 'build' | 'remove';
export function roadOrderReason(world: WorldView, tile: ViewTile | undefined, tool: RoadTool) {
  if (!tile || tile.visibility !== 'VISIBLE')
    return 'Choisissez une case visible de votre territoire ou un chantier neutre près d’un bâtisseur.';
  const siteReason = roadSiteReason(tile, world.player.id, world.units, tool === 'remove');
  if (siteReason) return siteReason;
  if (tool === 'build' && tile.road) return 'Une route est déjà en place.';
  if (tool === 'remove' && !tile.road) return 'Aucune route à supprimer sur cette case.';
  if (!world.player.unlimitedAP && world.player.ap < 1) return '1 PA nécessaire.';
  if (tool === 'build' && !canAfford(world.player.wallet, roadConstructionCost(tile.terrain)))
    return tile.terrain === 'RIVER'
      ? 'Le pont demande 30 bois et 10 fer.'
      : 'La route demande 10 bois.';
  return '';
}
export function roadBenefit(tile?: ViewTile) {
  return `${tile?.terrain === 'RIVER' ? 'Pont' : 'Route'} : une fois sur le réseau, distance illimitée pour 1 PA sur une liaison continue et explorée.`;
}
