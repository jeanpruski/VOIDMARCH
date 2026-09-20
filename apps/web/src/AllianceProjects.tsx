import { useState } from 'react';
import {
  ALLIANCE_PROJECTS,
  BUILDINGS,
  RESOURCES,
  RESOURCE_NAMES,
  type AllianceProjectKind,
  type Wallet,
} from '@voidmarch/config';
import { useGame, send, focusMap } from './store';
import { Cost, Duration, format } from './ui';

export function AllianceProjects() {
  const world = useGame((s) => s.world)!,
    pending = useGame((s) => s.pending);
  const team = world.strategy?.alliance;
  const [kind, setKind] = useState<AllianceProjectKind>('SUPPLY'),
    [hostId, setHost] = useState('');
  const [percent, setPercent] = useState<25 | 50 | 100>(25),
    [cancel, setCancel] = useState('');
  if (!team) return <p>Rejoignez une alliance pour financer des projets communs.</p>;
  const id = world.player.id,
    leader = team.leaderId === id,
    spec = ALLIANCE_PROJECTS[kind];
  const hosts = world.tiles
    .flatMap((t) => (t.building ? [t.building] : []))
    .filter(
      (b) =>
        team.members.includes(b.ownerId) && b.hp > 0 && b.level >= 3 && spec.hosts.includes(b.kind),
    );
  const selected = hosts.find((b) => b.id === hostId) ?? hosts[0];
  const projects = team.projects ?? [];
  const duplicate = projects.some(
    (p) => p.kind === kind && ['FUNDING', 'BUILDING', 'COMPLETE'].includes(p.status),
  );
  return (
    <section className="strategy-panel alliance-projects">
      <h3>Grands projets d’alliance</h3>
      <p>
        Le chef choisit un bâtiment hôte de niveau 3 minimum. Chaque membre contribue volontairement
        avec ses ressources. Une fois financé, le chantier dure 2 heures, même hors ligne.
      </p>
      <p>
        Les bonus profitent à tous les membres tant que le bâtiment reste dans l’alliance et en
        activité. Un seul projet de chaque type. Avant achèvement, une annulation ou la perte de
        l’hôte rembourse les contributions ; après achèvement, la perte de l’hôte supprime le bonus.
      </p>
      {leader && (
        <form
          className="inset"
          onSubmit={async (e) => {
            e.preventDefault();
            if (selected)
              await send({
                type: 'PROJECT_CREATE',
                actorId: id,
                payload: { kind, hostId: selected.id },
              });
          }}
        >
          <label>
            Projet
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as AllianceProjectKind);
                setHost('');
              }}
            >
              {Object.entries(ALLIANCE_PROJECTS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <p>{spec.benefit}</p>
          <Cost cost={spec.cost} />
          <p>
            Hôte : {spec.hosts.map((k) => BUILDINGS[k].name).join(' ou ')} · niveau 3 minimum. Les
            hôtes alliés doivent être visibles sur votre carte.
          </p>
          {hosts.length > 0 && (
            <label>
              Bâtiment hôte
              <select value={selected?.id ?? ''} onChange={(e) => setHost(e.target.value)}>
                {hosts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {BUILDINGS[b.kind].name} N{b.level} · {b.q}, {b.r}
                  </option>
                ))}
              </select>
            </label>
          )}
          {duplicate ? (
            <p>Ce projet est déjà actif dans votre alliance.</p>
          ) : !selected ? (
            <p>Aucun hôte compatible visible.</p>
          ) : (
            <button className="secondary" disabled={pending}>
              Ouvrir le financement
            </button>
          )}
        </form>
      )}
      {projects.length === 0 && (
        <p>Aucun chantier ouvert. Chaque projet peut être financé en plusieurs contributions.</p>
      )}
      {[...projects].reverse().map((p) => {
        const spec = ALLIANCE_PROJECTS[p.kind];
        const paid = Object.fromEntries(
          RESOURCES.map((r) => [
            r,
            Object.values(p.contributions).reduce((n, c) => n + (c[r] ?? 0), 0),
          ]),
        ) as Wallet;
        const contribution = Object.fromEntries(
          RESOURCES.map((r) => [
            r,
            Math.min(
              Math.floor(world.player.wallet[r]),
              Math.ceil((Math.max(0, p.cost[r] - paid[r]) * percent) / 100),
            ),
          ]),
        ) as Wallet;
        const host = world.tiles.find((t) => t.building?.id === p.hostId)?.building;
        const progress =
          RESOURCES.reduce((n, r) => n + Math.min(p.cost[r], paid[r]), 0) /
          RESOURCES.reduce((n, r) => n + p.cost[r], 0);
        return (
          <article className="inset" key={p.id}>
            <h4>{spec.name}</h4>
            <p>{spec.benefit}</p>
            <strong>
              {
                {
                  FUNDING: 'Financement ouvert',
                  BUILDING: 'Chantier en cours',
                  COMPLETE: 'Projet achevé',
                  CANCELLED: 'Annulé · contributions remboursées',
                  LOST: 'Bâtiment hôte perdu · bonus désactivé',
                }[p.status]
              }
            </strong>
            {host && (
              <button className="text-button" onClick={() => focusMap(host)}>
                Voir le bâtiment hôte ↗
              </button>
            )}
            {p.status === 'BUILDING' && p.readyAt && (
              <p>
                Achèvement dans <Duration until={p.readyAt} />
              </p>
            )}
            {p.status === 'FUNDING' && (
              <>
                <progress aria-label={`Financement de ${spec.name}`} value={progress} max={1} />
                <div className="project-resources">
                  {RESOURCES.map((r) => (
                    <div key={r}>
                      <span>{RESOURCE_NAMES[r]}</span>
                      <strong>
                        {format(paid[r])} / {format(p.cost[r])}
                      </strong>
                    </div>
                  ))}
                </div>
                <label>
                  Contribution aux ressources restantes
                  <select
                    value={percent}
                    onChange={(e) => setPercent(Number(e.target.value) as 25 | 50 | 100)}
                  >
                    <option value={25}>25 %</option>
                    <option value={50}>50 %</option>
                    <option value={100}>100 %</option>
                  </select>
                </label>
                <p>
                  Dans la limite de vos stocks. Vous verserez :{' '}
                  <Cost cost={contribution} wallet={world.player.wallet} />
                </p>
                {Object.values(contribution).some((n) => n > 0) && (
                  <button
                    className="secondary"
                    disabled={pending}
                    onClick={() =>
                      void send({
                        type: 'PROJECT_CONTRIBUTE',
                        actorId: id,
                        payload: { projectId: p.id, percent },
                      })
                    }
                  >
                    Verser ma contribution
                  </button>
                )}
              </>
            )}
            {Object.entries(p.contributions).map(([contributor, cost]) => (
              <p key={contributor}>
                {world.realms.find((r) => r.id === contributor)?.name ?? 'Ancien membre'} :{' '}
                <Cost cost={cost} />
              </p>
            ))}
            {leader &&
              ['FUNDING', 'BUILDING'].includes(p.status) &&
              (cancel === p.id ? (
                <div>
                  <p>Annuler et rembourser chaque contributeur ?</p>
                  <button
                    className="secondary danger"
                    disabled={pending}
                    onClick={async () => {
                      await send({
                        type: 'PROJECT_CANCEL',
                        actorId: id,
                        payload: { projectId: p.id },
                      });
                      setCancel('');
                    }}
                  >
                    Confirmer le remboursement
                  </button>
                  <button onClick={() => setCancel('')}>Continuer le projet</button>
                </div>
              ) : (
                <button className="text-button" onClick={() => setCancel(p.id)}>
                  Annuler le projet…
                </button>
              ))}
          </article>
        );
      })}
    </section>
  );
}
