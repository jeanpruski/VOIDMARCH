import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Fuel, FlaskConical } from 'lucide-react';
import {
  MOBILITY_LEVELS,
  mobilityLevel,
  mobilityLimits,
  mobilityQuota,
  MOBILITY_NAMES,
  mobilitySources,
  mobilityCost,
  movementPayment,
  movementPaymentLabel,
  RESOURCE_NAMES,
  RESOURCES,
  type UnitKind,
  type MobilityReserve,
  type MobilityResource,
} from '@voidmarch/config';
import type { Building } from '@voidmarch/shared';
import { canAfford } from '@voidmarch/game-rules';
import { Modal, format, Duration } from './ui';
import { ActionButton } from './ActionButton';
import { send, useGame } from './store';

export const movementHint = (kind: UnitKind, reserve: MobilityReserve) =>
  movementPaymentLabel(movementPayment(kind, 1, reserve));
export function MobilityCounters() {
  const world = useGame((s) => s.world);
  if (!world) return null;
  const player = world.player;
  const sites = world.tiles.flatMap((t) => (t.building?.ownerId === player.id ? [t.building] : []));
  const fuelCap = mobilityLimits(mobilityLevel(sites, 'fuel')).capacity;
  const pervitinCap = mobilityLimits(mobilityLevel(sites, 'pervitin')).capacity;
  return (
    <div className="mobility-counters" aria-label="Réserves de déplacement">
      <span title="Carburant : véhicules et appareils motorisés. Produit à l’atelier ou à la raffinerie. Utilisé avant les PA ; routes et enceintes gratuites.">
        <Fuel size={15} /> {player.fuel ?? 0}/{fuelCap} <small>Carburant</small>
      </span>
      <span title="Pervitine : troupes terrestres, cavaliers et héros. Produite au monastère ou à l’hôpital de campagne. Utilisée avant les PA ; routes et enceintes gratuites.">
        <FlaskConical size={15} /> {player.pervitin ?? 0}/{pervitinCap} <small>Pervitine</small>
      </span>
    </div>
  );
}
export function MobilityControls({ building }: { building: Building }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<1 | 5 | 10>(5);
  const world = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  const now = useGame((s) => s.now);
  const resource: MobilityResource | undefined = mobilitySources(building.kind)[0];
  if (!resource) return null;
  const value = world.player[resource] ?? 0;
  const sites = world.tiles.flatMap((t) =>
    t.building?.ownerId === world.player.id ? [t.building] : [],
  );
  const level = mobilityLevel(sites, resource);
  const { capacity, pricePercent } = mobilityLimits(level);
  const quota = mobilityQuota(level, world.player.mobilityReceipts?.[resource], now);
  const cost = mobilityCost(
    building.kind,
    level,
    resource,
    amount,
    world.strategy?.bonuses?.fuel ?? 0,
  );
  const error =
    value + amount > capacity
      ? `Réserve limitée à ${capacity} : ${Math.max(0, capacity - value)} places libres. Choisissez un lot plus petit.`
      : amount > quota.remaining
        ? `Quota horaire insuffisant : ${quota.remaining} points disponibles.`
        : !canAfford(world.player.wallet, cost)
          ? 'Ressources insuffisantes.'
          : '';
  return (
    <>
      <ActionButton className="secondary" onClick={() => setOpen(true)}>
        {resource === 'fuel' ? <Fuel size={15} /> : <FlaskConical size={15} />} Produire{' '}
        {MOBILITY_NAMES[resource].toLowerCase()}
      </ActionButton>
      {open &&
        createPortal(
          <Modal
            title={`Produire de la ${MOBILITY_NAMES[resource].toLowerCase()}`.replace(
              'de la carburant',
              'du carburant',
            )}
            eyebrow="RÉSERVES DE DÉPLACEMENT"
            onClose={() => setOpen(false)}
          >
            <div className="logistics-panel">
              <p>
                {resource === 'fuel'
                  ? 'Pour les véhicules terrestres, aéronefs et navires motorisés.'
                  : 'Pour les fantassins, bâtisseurs, cavaliers et héros.'}{' '}
                Un point par déplacement payant, utilisé avant les PA. Les trajets gratuits ne
                consomment rien ; les passagers ne paient pas.
              </p>
              <div className="logistics-quota">
                <strong>
                  {value} / {capacity} points stockés
                </strong>
                <span role="status">
                  {quota.remaining} / {quota.limit} points encore productibles sur les 60 dernières
                  minutes.
                </span>
                {quota.nextAt && (
                  <span>
                    Prochaines places libérées dans <Duration until={quota.nextAt} />.
                  </span>
                )}
                <span>
                  Conversion immédiate de ressources, sans coût en PA. Aucune régénération
                  automatique. Stock et quota sont partagés entre tous vos producteurs de cette
                  ressource. Chaque lot libère son quota une heure après sa production.
                </span>
              </div>
              <p>
                Niveau retenu : {level}/5, celui de votre meilleur producteur en activité. Tarif de
                base {pricePercent > 100 ? `+${pricePercent - 100} %` : 'sans majoration'}, même
                dans un bâtiment de niveau inférieur. Raffineries et hôpitaux gardent leur tarif
                spécialisé.
              </p>
              {value > capacity && (
                <p>
                  Votre réserve existante est conservée. Utilisez le surplus ou améliorez vos
                  producteurs avant d’en produire davantage.
                </p>
              )}
              {resource === 'fuel' && !!world.strategy?.bonuses?.fuel && (
                <p>
                  Bonus stratégique : −{world.strategy.bonuses.fuel} % sur le prix du carburant,
                  inclus dans le devis.
                </p>
              )}
              <details className="mobility-progression">
                <summary>Progression du stockage, des quotas et des tarifs</summary>
                <table>
                  <thead>
                    <tr>
                      <th>Niveau</th>
                      <th>Stock</th>
                      <th>Points/h</th>
                      <th>Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOBILITY_LEVELS.map((tier, i) => (
                      <tr key={i} aria-current={level === i + 1 ? 'true' : undefined}>
                        <td>{i + 1}</td>
                        <td>{tier.capacity}</td>
                        <td>{tier.hourly}</td>
                        <td>
                          {tier.pricePercent === 100 ? 'Base' : `+${tier.pricePercent - 100} %`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
              <div className="logistics-amounts" role="group" aria-label="Points à produire">
                {([1, 5, 10] as const).map((n) => (
                  <button
                    key={n}
                    aria-pressed={amount === n}
                    className={amount === n ? 'primary' : 'secondary'}
                    onClick={() => setAmount(n)}
                  >
                    +{n} points
                  </button>
                ))}
              </div>
              <div className="logistics-costs">
                {RESOURCES.filter((r) => (cost[r] ?? 0) > 0).map((r) => (
                  <div key={r} className={world.player.wallet[r] < cost[r]! ? 'negative' : ''}>
                    <span>{RESOURCE_NAMES[r]}</span>
                    <strong>{format(cost[r]!)} requis</strong>
                    <small>{format(world.player.wallet[r])} en réserve</small>
                  </div>
                ))}
              </div>
              {error && (
                <p className="negative" role="status">
                  {error}
                </p>
              )}
              {pending ? (
                <p role="status">Production en cours…</p>
              ) : (
                !error && (
                  <button
                    className="primary"
                    onClick={() =>
                      void send({
                        type: 'PRODUCE_MOBILITY',
                        actorId: building.id,
                        payload: { resource, amount },
                      })
                    }
                  >
                    Confirmer · produire {amount} points
                  </button>
                )
              )}
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
