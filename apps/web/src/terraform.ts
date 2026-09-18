import { ACTION_COST, TERRAFORM_COST } from '@voidmarch/config';
import { canAfford, terraformSiteReason } from '@voidmarch/game-rules';
import type { Unit, ViewTile, WorldView } from '@voidmarch/shared';

export function terraformOrderReason(world: WorldView, tile?: ViewTile, unit?: Unit) {
  if (!unit) return 'Sélectionnez votre terrassier arcanique.';
  if (!tile || tile.visibility !== 'VISIBLE') return 'Choisissez un terrain visible.';
  const reason = terraformSiteReason(
    tile,
    world.player.id,
    unit,
    world.units,
    world.player.capital,
  );
  if (reason) return reason;
  if (!world.player.unlimitedAP && world.player.ap < ACTION_COST.TERRAFORM)
    return '2 PA nécessaires.';
  if (!canAfford(world.player.wallet, TERRAFORM_COST)) return '20 bois et 10 fer nécessaires.';
  return '';
}
