import { movementPaymentLabel } from '@voidmarch/config';
import { ArmyEditor } from './SavedArmies';
import { Supplies } from './Supplies';
import { ArrowUpRight, Users, X } from 'lucide-react';
import { key, unitStats } from '@voidmarch/game-rules';
import { ActionButton } from './ActionButton';
import { groupMovementPreview, groupMovementRange, MAX_GROUP_UNITS } from './group-movement';
import { send, toggleUnitSelection, useGame } from './store';

export function GroupMovement() {
  const world = useGame((s) => s.world)!;
  const ids = useGame((s) => s.selectedUnitIds);
  const target = useGame((s) => s.groupTarget);
  const formation = useGame((s) => s.groupFormation);
  const mode = useGame((s) => s.mode);
  const pending = useGame((s) => s.pending);
  const hover = useGame((s) => s.hover);
  const range = groupMovementRange(world, ids);
  const hoveredCount = hover ? (range.cells.get(key(hover))?.count ?? 0) : null;
  const adding = useGame((s) => s.multiSelect);
  const units = world.units.filter((u) => ids.includes(u.id) && u.ownerId === world.player.id);
  const plan =
    target && mode === 'move' ? groupMovementPreview(world, ids, target, formation) : null;
  const enough = !plan || world.player.unlimitedAP || world.player.ap >= plan.cost;
  const start = () =>
    useGame.setState({
      mode: 'move',
      multiSelect: false,
      groupTarget: null,
      constructionBuilderId: null,
      combatTarget: null,
    });
  return (
    <div className="group-movement">
      <div className="group-movement-heading">
        <h2>
          <Users size={20} /> {units.length} troupes sélectionnées
        </h2>
        <span>
          {MAX_GROUP_UNITS} unités max · Maj + clic : ajouter ou retirer · Échap : annuler
        </span>
      </div>
      <ArmyEditor />
      <Supplies units={units} />
      <div className="selection-actions">
        <button
          disabled={pending}
          aria-pressed={adding}
          onClick={() =>
            useGame.setState({ multiSelect: !adding, mode: 'inspect', groupTarget: null })
          }
        >
          {adding ? 'Terminer la sélection' : 'Ajouter / retirer des troupes'}
        </button>
        <ActionButton shortcut="D" className="primary" disabled={pending} onClick={start}>
          <ArrowUpRight size={16} /> Déplacer{' '}
          <small>Routes / enceintes gratuites · réserves avant les PA</small>
        </ActionButton>
        {plan && (
          <ActionButton
            shortcut="Espace"
            className="primary"
            disabled={pending || !enough || !plan.orders.length}
            onClick={() => {
              if (plan.orders.length && enough)
                void send({
                  type: 'MOVE_GROUP',
                  actorId: world.player.id,
                  payload: { orders: plan.orders },
                });
            }}
          >
            Confirmer ·{' '}
            {movementPaymentLabel({ ap: plan.cost, fuel: plan.fuel, pervitin: plan.pervitin })}
          </ActionButton>
        )}
        <button
          disabled={pending}
          onClick={() =>
            useGame.setState({
              selection: null,
              selectedUnitIds: [],
              groupTarget: null,
              multiSelect: false,
              mode: 'inspect',
            })
          }
        >
          <X size={15} /> Désélectionner
        </button>
      </div>
      {!pending && (
        <div className="group-range-legend">
          <span className="group-range-common">Toutes les troupes</span>
          <span className="group-range-partial">Une partie des troupes</span>
          <small>
            Portée individuelle · les arrivées se répartissent autour de la destination.
          </small>
          {mode === 'move' && hoveredCount !== null && (
            <small>
              {hoveredCount}/{range.total} troupes peuvent atteindre cette case en un déplacement.
              {hoveredCount === 0 && ' Une destination lointaine donne une direction de marche.'}
            </small>
          )}
        </div>
      )}
      {pending ? (
        <p role="status">Ordre du groupe en cours…</p>
      ) : plan ? (
        <>
          <p role="status">
            {plan.orders.length} troupe(s) avanceront · {plan.stationary.length} resteront sur place
            ·{' '}
            <strong>
              {movementPaymentLabel({ ap: plan.cost, fuel: plan.fuel, pervitin: plan.pervitin })} au
              total
            </strong>
            .
            {!enough && (
              <span className="group-movement-error">
                {' '}
                PA insuffisants : {world.player.ap} disponibles. Aucune troupe ne partira.
              </span>
            )}
          </p>
          <p className="muted">
            Destinations tracées sur la carte. Les troupes suivent la formation choisie, dans leurs
            limites de déplacement. Cliquez ailleurs pour modifier la destination.
          </p>
        </>
      ) : (
        <p role="status">
          {adding
            ? 'Cliquez sur vos troupes pour les ajouter ou les retirer, puis sur Déplacer.'
            : mode === 'move'
              ? 'Les cases accessibles sont éclairées. Cliquez sur une destination pour prévisualiser les trajets. Aucun PA dépensé avant confirmation.'
              : 'Choisissez Déplacer puis une destination. Les troupes restent proches, chacune avec sa mobilité et son coût.'}
        </p>
      )}
      <details className="group-roster" open={!!plan}>
        <summary>Troupes et destinations individuelles</summary>
        <div className="group-roster-list">
          {units.map((u) => {
            const journey = plan?.journeys.find((j) => j.unitId === u.id);
            const end = journey?.path.at(-1);
            const stopped = plan?.stationary.find((j) => j.unitId === u.id);
            return (
              <div key={u.id} className={stopped ? 'group-stationary' : ''}>
                <span>
                  <strong>{u.nickname ?? unitStats(u).name}</strong> · {u.q}, {u.r}
                </span>
                <span>
                  {end
                    ? `→ ${end.q}, ${end.r} · ${journey!.path.length} cases${journey!.network ? ' · routes / enceintes · gratuit' : ' · 1 PA'}`
                    : stopped
                      ? `${stopped.reason}`
                      : 'En sélection'}
                </span>
                <button
                  disabled={pending}
                  aria-label={`Retirer ${u.nickname ?? unitStats(u).name} du groupe`}
                  onClick={() => toggleUnitSelection(u.id)}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
