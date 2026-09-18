import { useState } from 'react';
import type { AllianceOperation } from '@voidmarch/shared';
import { focusMap, send, useGame } from './store';
import { format, Duration } from './ui';
const objectiveNames = {
  CAPTURE: 'Prendre une position',
  HOLD: 'Tenir une position',
  SIEGE: 'Assiéger un bâtiment',
};
const roles = {
  ASSAULT: 'Assaut',
  ARTILLERY: 'Artillerie',
  AIR: 'Aviation',
  SUPPORT: 'Renforts & soutien',
};
const statusNames = {
  PLANNING: 'Préparation',
  ACTIVE: 'En cours',
  WON: 'Victoire',
  CANCELLED: 'Annulée',
  EXPIRED: 'Expirée',
  FAILED: 'Cible disparue',
};
function OperationCard({ op }: { op: AllianceOperation }) {
  const world = useGame((s) => s.world)!,
    pending = useGame((s) => s.pending);
  const team = world.strategy!.alliance!,
    me = op.participants.find((p) => p.realmId === world.player.id);
  const [role, setRole] = useState<AllianceOperation['participants'][number]['role']>(
    me?.role ?? 'ASSAULT',
  );
  const active = ['PLANNING', 'ACTIVE'].includes(op.status),
    coordinator = team.leaderId === world.player.id || op.authorId === world.player.id;
  const join = (ready: boolean) =>
    void send({
      type: 'OPERATION_JOIN',
      actorId: world.player.id,
      payload: { operationId: op.id, role, ready },
    });
  return (
    <article className="operation-card inset">
      <div className="operation-heading">
        <h4>{op.title}</h4>
        <span>{statusNames[op.status]}</span>
      </div>
      <p>
        {objectiveNames[op.objective]} ·{' '}
        <button
          className="text-button"
          onClick={() => {
            focusMap(op);
            useGame.setState({ panel: null });
          }}
        >
          {op.q}, {op.r} ↗
        </button>
      </p>
      <progress max={1} value={op.progress} aria-label={`Progression de ${op.title}`} />
      <span> {format(op.progress * 100)} %</span>
      {op.objective === 'HOLD' && (
        <p>
          Tenue confirmée : {format(op.heldMs / 60000)} / {op.holdDuration / 60000} min
          {op.status === 'ACTIVE'
            ? op.holding
              ? ' · Position tenue'
              : ' · En attente ou contestée'
            : ''}
          . Une interruption remet le compteur à zéro.
        </p>
      )}
      {active && (
        <p className="muted">
          Expire dans <Duration until={op.endsAt} />
        </p>
      )}
      <ul className="operation-roles">
        {op.participants.map((p) => (
          <li key={p.realmId}>
            {world.realms.find((r) => r.id === p.realmId)?.name ?? 'Allié'} · {roles[p.role]} ·{' '}
            {p.ready ? 'Prêt' : 'En préparation'}
          </li>
        ))}
      </ul>
      {active && (
        <>
          <label>
            Mon rôle
            <select
              aria-label={`Rôle pour ${op.title}`}
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              {Object.entries(roles).map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="selection-actions">
            <button disabled={pending} onClick={() => join(false)}>
              Participer / actualiser · 0 PA
            </button>
            <button disabled={pending} onClick={() => join(!me?.ready)}>
              {me?.ready ? 'Je ne suis plus prêt' : 'Je suis prêt'} · 0 PA
            </button>
            {coordinator && op.status === 'PLANNING' && (
              <button
                className="primary"
                disabled={pending}
                onClick={() =>
                  void send({
                    type: 'OPERATION_START',
                    actorId: world.player.id,
                    payload: { operationId: op.id },
                  })
                }
              >
                Lancer · 0 PA
              </button>
            )}
            {coordinator && (
              <button
                disabled={pending}
                onClick={() =>
                  void send({
                    type: 'OPERATION_CANCEL',
                    actorId: world.player.id,
                    payload: { operationId: op.id },
                  })
                }
              >
                Annuler l’opération · 0 PA
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
export function AllianceOperations() {
  const world = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection),
    pending = useGame((s) => s.pending);
  const [title, setTitle] = useState(''),
    [objective, setObjective] = useState<AllianceOperation['objective']>('CAPTURE'),
    [minutes, setMinutes] = useState<5 | 15 | 30>(15);
  const [target, setTarget] = useState({
    q: selection?.q ?? world.player.capital.q,
    r: selection?.r ?? world.player.capital.r,
  });
  const team = world.strategy?.alliance;
  if (!team) return <p>Rejoignez une alliance pour préparer une opération.</p>;
  const operations = team.operations ?? [],
    active = operations.filter((o) => ['PLANNING', 'ACTIVE'].includes(o.status));
  return (
    <section className="alliance-operations">
      <h3>Opérations de l’alliance</h3>
      <p>
        Coordonnez vos armées autour d’un objectif partagé. Chaque joueur garde le contrôle de ses
        troupes. Les trêves et protections continuent de s’appliquer.
      </p>
      <p className="muted">
        Prendre : la case doit appartenir à un allié. Tenir : gardez-la avec une unité de combat au
        sol, sans ennemi sur une case voisine. Siège : détruisez ou capturez le bâtiment désigné. La
        progression d’un siège nécessite la vision d’au moins un allié. Pas de ressources créées par
        ces objectifs.
      </p>
      {active.map((op) => (
        <OperationCard key={op.id} op={op} />
      ))}
      {active.length < 3 && (
        <details className="inset">
          <summary>Préparer une opération ({active.length}/3)</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await send({
                type: 'OPERATION_CREATE',
                actorId: world.player.id,
                payload: { ...target, title, objective, holdMinutes: minutes },
              });
              if (result?.accepted) setTitle('');
            }}
          >
            <label>
              Nom de l’opération
              <input
                required
                minLength={3}
                maxLength={64}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Prise du passage du Corbeau"
              />
            </label>
            <label>
              Objectif
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value as typeof objective)}
              >
                {Object.entries(objectiveNames).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="two-col">
              <label>
                Coordonnée Q
                <input
                  type="number"
                  required
                  min={-100000}
                  max={100000}
                  value={target.q}
                  onChange={(e) => setTarget({ ...target, q: Number(e.target.value) })}
                />
              </label>
              <label>
                Coordonnée R
                <input
                  type="number"
                  required
                  min={-100000}
                  max={100000}
                  value={target.r}
                  onChange={(e) => setTarget({ ...target, r: Number(e.target.value) })}
                />
              </label>
            </div>
            {selection && (
              <button type="button" onClick={() => setTarget({ q: selection.q, r: selection.r })}>
                Utiliser la case sélectionnée
              </button>
            )}
            {objective === 'HOLD' && (
              <label>
                Durée de tenue
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value) as typeof minutes)}
                >
                  {[5, 15, 30].map((n) => (
                    <option key={n} value={n}>
                      {n} minutes
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="primary" disabled={pending}>
              Partager le plan · 0 PA
            </button>
          </form>
        </details>
      )}
      <details>
        <summary>Historique des opérations</summary>
        {operations
          .filter((o) => !['PLANNING', 'ACTIVE'].includes(o.status))
          .slice()
          .reverse()
          .map((op) => (
            <OperationCard key={op.id} op={op} />
          ))}
      </details>
    </section>
  );
}
