import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Zap } from 'lucide-react';
import {
  LOGISTICS_RECIPES,
  LOGISTICS_AMOUNTS,
  logisticsCost,
  logisticsQuota,
  logisticsDiscount,
  developmentStage,
  developmentReason,
  RESOURCE_NAMES,
  RESOURCES,
  type LogisticsRecipe,
} from '@voidmarch/config';
import type { Building } from '@voidmarch/shared';
import { canAfford } from '@voidmarch/game-rules';
import { ActionButton } from './ActionButton';
import { Modal, format, Duration } from './ui';
import { send, useGame } from './store';

export function LogisticsControls({ building }: { building: Building }) {
  const [open, setOpen] = useState(false);
  const [recipe, setRecipe] = useState<LogisticsRecipe>('RATIONS');
  const [amount, setAmount] = useState<1 | 5 | 10>(5);
  const world = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  const now = useGame((s) => s.now);
  if (building.kind !== 'LOGISTICS_CENTER') return null;
  const sites = world.tiles.flatMap((t) =>
    t.building?.ownerId === world.player.id ? [t.building] : [],
  );
  const stage = developmentStage(sites);
  const quota = logisticsQuota(stage, world.player.logisticsReceipts, now);
  const cost = logisticsCost(
    recipe,
    amount,
    building.level,
    world.strategy?.bonuses?.logistics ?? 0,
  );
  const definition = LOGISTICS_RECIPES[recipe];
  const lock =
    building.level < definition.level
      ? `Centre logistique de niveau ${definition.level} requis.`
      : developmentReason(sites, definition.stage);
  const error =
    lock ||
    (amount > quota.remaining ? `Il reste ${quota.remaining} PA dans votre quota horaire.` : '') ||
    (!canAfford(world.player.wallet, cost)
      ? 'Ressources insuffisantes : les quantités manquantes sont en rouge.'
      : '');
  return (
    <>
      <ActionButton className="secondary" onClick={() => setOpen(true)}>
        <Zap size={15} /> Produire des PA
      </ActionButton>
      {open &&
        createPortal(
          <Modal
            title="Convertir vos ressources en PA"
            eyebrow="CENTRE LOGISTIQUE"
            onClose={() => setOpen(false)}
          >
            <div className="logistics-panel">
              <p>
                Échange immédiat de vos ressources personnelles, sans dépenser de PA. Le surplus
                au-dessus de 20 est conservé ; la régénération reprend une fois sous 20.
              </p>
              <div className="logistics-quota" role="status">
                <strong>
                  {quota.remaining} / {quota.limit} PA disponibles
                </strong>
                <span>
                  Quota partagé par tous vos centres sur les 60 dernières minutes. Chaque achat
                  libère ses places une heure plus tard.
                </span>
                {quota.nextAt && (
                  <span>
                    Prochaines places libérées dans <Duration until={quota.nextAt} />
                  </span>
                )}
                <small>
                  Développement {stage}/5 · quota : 10, 15, 20, 25 puis 30 PA/h. Construire
                  plusieurs centres ne l’augmente pas.
                </small>
              </div>
              {!!world.strategy?.bonuses?.logistics && (
                <p>
                  Bonus stratégique : −{world.strategy.bonuses.logistics} % supplémentaires sur les
                  ressources, inclus dans le devis.
                </p>
              )}
              <label>
                Recette
                <select
                  value={recipe}
                  onChange={(e) => setRecipe(e.target.value as LogisticsRecipe)}
                >
                  {Object.entries(LOGISTICS_RECIPES).map(([id, r]) => (
                    <option key={id} value={id}>
                      {r.name} · centre {r.level}, développement {r.stage}
                    </option>
                  ))}
                </select>
              </label>
              <div className="logistics-amounts" role="group" aria-label="Quantité de PA">
                {LOGISTICS_AMOUNTS.map((n) => (
                  <button
                    key={n}
                    className={n === amount ? 'primary' : 'secondary'}
                    aria-pressed={n === amount}
                    onClick={() => setAmount(n)}
                  >
                    +{n} PA
                  </button>
                ))}
              </div>
              <p>
                Centre niveau {building.level} : réduction de {logisticsDiscount(building.level)} %
                sur le tarif de base (arrondi à la ressource supérieure par PA).
              </p>
              <div className="logistics-costs" aria-label="Coût total et réserves">
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
                <p role="status">Conversion en cours…</p>
              ) : (
                !error && (
                  <button
                    className="primary"
                    onClick={() =>
                      void send({
                        type: 'CONVERT_AP',
                        actorId: building.id,
                        payload: { recipe, amount },
                      })
                    }
                  >
                    Confirmer l’échange · recevoir {amount} PA
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
