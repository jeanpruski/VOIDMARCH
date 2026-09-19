import { Wheat } from 'lucide-react';
import { BUILDINGS } from '@voidmarch/config';
import {
  CAMPAIGN_SUPPLIES,
  SUPPLY_BUILDINGS,
  canCarrySupplies,
  supplyCharges,
  supplyCost,
  supplySource,
} from '@voidmarch/game-rules';
import type { Unit } from '@voidmarch/shared';
import { Cost, format } from './ui';
import { send, useGame } from './store';

export function Supplies({ units }: { units: Unit[] }) {
  const world = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  const troops = units.filter(canCarrySupplies);
  if (!troops.length) return null;
  const targets = troops.filter((u) => supplyCharges(u) < CAMPAIGN_SUPPLIES.capacity);
  const sites = world.tiles.flatMap((t) => (t.building ? [t.building] : []));
  const missing = targets.filter(
    (u) => !supplySource(u, sites, world.units, world.strategy?.alliance?.members),
  );
  const food = targets.reduce((sum, u) => sum + (supplyCost(u).FOOD ?? 0), 0);
  const enoughAP = world.player.unlimitedAP || world.player.ap >= targets.length;
  const ready =
    !pending &&
    targets.length > 0 &&
    !missing.length &&
    enoughAP &&
    world.player.wallet.FOOD >= food;
  return (
    <details className="supply-details">
      <summary>
        <Wheat size={14} /> Provisions :{' '}
        {troops.length === 1
          ? `${supplyCharges(troops[0])}/8`
          : `${troops.filter((u) => supplyCharges(u) > 0).length}/${troops.length} troupes équipées`}
      </summary>
      {(world.player.foodShortageMinutes ?? 0) > 0 && (
        <p className="negative">
          Pénurie : {format(world.player.foodShortageMinutes ?? 0)} min de présence. Après 10 min :
          −10 % d’attaque ; après 30 min : −20 %. Rétablissez les vivres pour récupérer
          progressivement. Aucune perte de PV ni aggravation hors ligne.
        </p>
      )}
      <p>
        Une provision donne +10 % d’attaque pour un tir ou un assaut, ou porte les soins /
        réparations à 75 % des PV max au lieu de 50 %. Elle est alors consommée. Sous le feu, les
        soins sont limités à 15 % (20 % avec provisions), une fois toutes les 30 secondes. Aucun
        coût pendant la marche ou l’attente.
      </p>
      <p>
        Recharge à 2 cases d’un{' '}
        {SUPPLY_BUILDINGS.map((kind) => BUILDINGS[kind].name.toLowerCase()).join(', ')}, ou à 1 case
        d’un transport. Les dépôts alliés fonctionnent aussi ; vous payez vos propres vivres.
      </p>
      {targets.length ? (
        <>
          <p>
            Compléter {targets.length} troupe(s) à 8 provisions :{' '}
            <strong className={!enoughAP ? 'negative' : undefined}>{targets.length} PA</strong> ·{' '}
            <Cost cost={{ FOOD: food }} wallet={world.player.wallet} />. Seules les provisions
            manquantes sont facturées.
          </p>
          {missing.length > 0 && (
            <p className="negative">
              {missing.length} troupe(s) trop loin d’un point de ravitaillement.
            </p>
          )}
          {world.player.wallet.FOOD < food && (
            <p className="negative">Il manque {format(food - world.player.wallet.FOOD)} vivres.</p>
          )}
          {ready && (
            <button
              className="secondary"
              onClick={() =>
                void send({
                  type: 'RESUPPLY',
                  actorId: world.player.id,
                  payload: { unitIds: targets.map((u) => u.id) },
                })
              }
            >
              Ravitailler · {targets.length} PA · {format(food)} vivres
            </button>
          )}
        </>
      ) : (
        <p>Provisions complètes.</p>
      )}
    </details>
  );
}
