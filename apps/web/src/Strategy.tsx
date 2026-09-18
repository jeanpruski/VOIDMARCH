import { useState, type ReactNode } from 'react';
import {
  STRATEGY,
  RULES,
  hexArea,
  nuclearStrikeRadius,
  SITE_NAMES,
  SITE_BENEFITS,
  UNITS,
  VETERAN_NAMES,
  veteranRank,
} from '@voidmarch/config';
import { canAfford, distance, key } from '@voidmarch/game-rules';
import type { Building, Hex, Unit } from '@voidmarch/shared';
import { useGame, send, focusMap, type Command } from './store';
import { Cost, Duration, StorageHint, format } from './ui';

export function DiplomacyHub({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState('alliance');
  return (
    <>
      <div className="tab-row">
        {[
          ['alliance', 'Alliances'],
          ['trade', 'Commerce & trêves'],
          ['strategy', 'Guerres & expéditions'],
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'alliance' ? (
        <AlliancePanel />
      ) : tab === 'strategy' ? (
        <StrategyPanel />
      ) : (
        <>
          {children}
          <CaravanPanel />
        </>
      )}
    </>
  );
}
function Order({
  command,
  children,
  danger = false,
}: {
  command: Command;
  children: ReactNode;
  danger?: boolean;
}) {
  const pending = useGame((s) => s.pending);
  return (
    <button
      className={danger ? 'secondary danger' : 'secondary small'}
      disabled={pending}
      onClick={() => void send(command)}
    >
      {children}
    </button>
  );
}
function Position({ p }: { p: Hex }) {
  return (
    <button
      className="text-button"
      onClick={() => {
        focusMap(p);
        useGame.setState({ panel: null });
      }}
    >
      {p.q}, {p.r} ↗
    </button>
  );
}
export function AlliancePanel() {
  const w = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection),
    pending = useGame((s) => s.pending);
  const a = w.strategy?.alliance,
    id = w.player.id;
  const [name, setName] = useState(''),
    [emblem, setEmblem] = useState<'shield' | 'eye' | 'crown' | 'star'>('shield'),
    [invite, setInvite] = useState(''),
    [message, setMessage] = useState(''),
    [label, setLabel] = useState(''),
    [markerKind, setMarkerKind] = useState<'HELP' | 'ATTACK' | 'RESOURCE'>('HELP'),
    [leave, setLeave] = useState(false);
  const symbols = { shield: '⛨', eye: '◉', crown: '♛', star: '✦' };
  return (
    <section className="strategy-panel">
      <p className="panel-intro">
        Cinq joueurs maximum. Une alliance acceptée partage les positions des capitales et autorise
        le passage des remparts. Vos troupes restent sous votre contrôle. Les flèches mesurent la
        distance depuis le centre de votre écran.
      </p>
      {!a ? (
        <form
          className="inset"
          onSubmit={async (e) => {
            e.preventDefault();
            await send({ type: 'ALLIANCE_CREATE', actorId: id, payload: { name, emblem } });
          }}
        >
          <h4>Fonder une alliance</h4>
          <label>
            Nom
            <input
              value={name}
              maxLength={32}
              minLength={3}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Blason
            <select value={emblem} onChange={(e) => setEmblem(e.target.value as typeof emblem)}>
              {Object.entries(symbols).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}{' '}
                  {
                    { shield: 'Bouclier', eye: 'Œil', crown: 'Couronne', star: 'Étoile' }[
                      k as keyof typeof symbols
                    ]
                  }
                </option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={pending}>
            Fonder · 0 PA
          </button>
        </form>
      ) : (
        <>
          <div className="inset">
            <h3>
              {symbols[a.emblem]} {a.name} <small>{a.members.length}/5</small>
            </h3>
            <div className="strategy-list">
              {a.members.map((member) => {
                const realm = w.realms.find((r) => r.id === member),
                  capital = w.strategy?.allies.find((x) => x.realmId === member)?.position;
                return (
                  <div key={member}>
                    <span style={{ color: realm?.color }}>⚑ {realm?.name ?? member}</span>{' '}
                    {member === a.leaderId ? '· Chef' : ''} {realm?.online ? '· En ligne' : ''}{' '}
                    {capital && <Position p={capital} />}
                  </div>
                );
              })}
            </div>
            {a.leaderId === id && a.members.length < 5 && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await send({ type: 'ALLIANCE_INVITE', actorId: id, payload: { to: invite } });
                }}
              >
                <label>
                  Inviter un joueur
                  <select value={invite} required onChange={(e) => setInvite(e.target.value)}>
                    <option value="">Choisir un royaume</option>
                    {w.realms
                      .filter((r) => !r.bot && !r.defeated && !a.members.includes(r.id))
                      .map((r) => (
                        <option value={r.id} key={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </label>
                <button className="secondary" disabled={pending}>
                  Envoyer l’invitation · 0 PA
                </button>
              </form>
            )}
            {!leave ? (
              <button className="text-button" onClick={() => setLeave(true)}>
                Quitter l’alliance
              </button>
            ) : (
              <p>
                Vous perdrez les flèches et la discussion. Trêve de 24 heures avec vos anciens
                alliés.{' '}
                <Order danger command={{ type: 'ALLIANCE_LEAVE', actorId: id, payload: {} }}>
                  Confirmer le départ · 0 PA
                </Order>{' '}
                <button className="text-button" onClick={() => setLeave(false)}>
                  Annuler
                </button>
              </p>
            )}
          </div>
          <div className="inset">
            <h4>Discussion privée</h4>
            <div className="alliance-chat" role="log" aria-label="Discussion de l’alliance">
              {a.messages.length === 0 ? (
                <p className="muted">Préparez votre première expédition ensemble.</p>
              ) : (
                a.messages.map((m) => (
                  <p key={m.id}>
                    <strong>
                      {w.realms.find((r) => r.id === m.authorId)?.name ?? 'Ancien membre'}
                    </strong>{' '}
                    <small>
                      {new Date(m.at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                    <br />
                    {m.text}
                  </p>
                ))
              )}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await send({
                  type: 'ALLIANCE_CHAT',
                  actorId: id,
                  payload: { text: message },
                });
                if (res?.accepted) setMessage('');
              }}
            >
              <label>
                Message
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={400}
                  required
                />
              </label>
              <button className="secondary" disabled={pending}>
                Envoyer · 0 PA
              </button>
            </form>
          </div>
          <div className="inset">
            <h4>Signaux sur la carte</h4>
            <p>
              Sélectionnez une case connue avant d’ouvrir ce panneau, ou signalez votre capitale.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const p = selection ?? w.player.capital;
                const res = await send({
                  type: 'ALLIANCE_MARK',
                  actorId: id,
                  payload: { q: p.q, r: p.r, label, kind: markerKind },
                });
                if (res?.accepted) setLabel('');
              }}
            >
              <div className="two-col">
                <label>
                  Signal
                  <select
                    value={markerKind}
                    onChange={(e) => setMarkerKind(e.target.value as typeof markerKind)}
                  >
                    <option value="HELP">Défendre / aide</option>
                    <option value="ATTACK">Cible</option>
                    <option value="RESOURCE">Ressources</option>
                  </select>
                </label>
                <label>
                  Description
                  <input
                    value={label}
                    maxLength={64}
                    required
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </label>
              </div>
              <button className="secondary" disabled={pending}>
                Partager ({(selection ?? w.player.capital).q}, {(selection ?? w.player.capital).r})
                · 0 PA
              </button>
            </form>
            {a.markers.map((m) => (
              <div className="strategy-row" key={m.id}>
                <span>
                  {m.kind === 'HELP' ? '⛨' : m.kind === 'ATTACK' ? '⚔' : '◇'} {m.label}
                </span>
                <Position p={m} />
                {(m.authorId === id || a.leaderId === id) && (
                  <Order
                    command={{ type: 'ALLIANCE_UNMARK', actorId: id, payload: { markerId: m.id } }}
                  >
                    Retirer · 0 PA
                  </Order>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {(w.strategy?.invitations ?? []).map((i) => (
        <div className="strategy-row" key={i.id}>
          <span>
            {i.name} ·{' '}
            {i.to === id
              ? 'Invitation reçue'
              : `Invitation à ${w.realms.find((r) => r.id === i.to)?.name}`}{' '}
            · <Duration until={i.expiresAt} />
          </span>
          {i.to === id && (
            <>
              <Order
                command={{
                  type: 'ALLIANCE_RESPOND',
                  actorId: id,
                  payload: { invitationId: i.id, accept: true },
                }}
              >
                Accepter · 0 PA
              </Order>
              <Order
                command={{
                  type: 'ALLIANCE_RESPOND',
                  actorId: id,
                  payload: { invitationId: i.id, accept: false },
                }}
              >
                Refuser · 0 PA
              </Order>
            </>
          )}
        </div>
      ))}
    </section>
  );
}
function StrategyPanel() {
  const w = useGame((s) => s.world)!,
    selected = useGame((s) => s.selection),
    pending = useGame((s) => s.pending),
    id = w.player.id;
  const [to, setTo] = useState(''),
    [objective, setObjective] = useState<'FORT' | 'MINE' | 'TRIBUTE'>('TRIBUTE'),
    [gold, setGold] = useState(500),
    [q, setQ] = useState(selected?.q ?? 0),
    [r, setR] = useState(selected?.r ?? 0);
  return (
    <section className="strategy-panel">
      <h3>Objectifs de guerre</h3>
      <p>
        Les guerres durent 24 heures et ne suppriment aucune trêve. Pour prendre un fort ou une
        mine, capturez le lieu indiqué. Un tribut accepté donne 24 heures de paix.
      </p>
      <form
        className="inset"
        onSubmit={async (e) => {
          e.preventDefault();
          await send({
            type: 'DECLARE_WAR',
            actorId: id,
            payload: { to, objective, tributeGold: gold, q, r },
          });
        }}
      >
        <div className="two-col">
          <label>
            Royaume adverse
            <select value={to} onChange={(e) => setTo(e.target.value)} required>
              <option value="">Choisir</option>
              {w.realms
                .filter(
                  (x) =>
                    x.id !== id && !x.defeated && !w.strategy?.alliance?.members.includes(x.id),
                )
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Objectif
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value as typeof objective)}
            >
              <option value="TRIBUTE">Obtenir un tribut</option>
              <option value="FORT">Prendre un fort</option>
              <option value="MINE">Contrôler une mine</option>
            </select>
          </label>
        </div>
        {objective === 'TRIBUTE' ? (
          <label>
            Or demandé
            <input
              type="number"
              min={1}
              max={100000}
              step={1}
              value={gold}
              onChange={(e) => setGold(Number(e.target.value))}
            />
          </label>
        ) : (
          <Coordinates q={q} r={r} setQ={setQ} setR={setR} />
        )}
        <button className="secondary danger" disabled={pending}>
          Déclarer · 0 PA
        </button>
      </form>
      {(w.strategy?.wars ?? []).map((war) => (
        <div className="strategy-row" key={war.id}>
          <span>
            {war.title} · {w.realms.find((x) => x.id === war.from)?.name} →{' '}
            {w.realms.find((x) => x.id === war.to)?.name}
            <br />
            {
              {
                ACTIVE: 'En cours',
                WON: 'Objectif atteint',
                SETTLED: 'Accord conclu',
                EXPIRED: 'Terminée',
              }[war.status]
            }{' '}
            {war.status === 'ACTIVE' && <Duration until={war.endsAt} />}
          </span>
          {war.objective !== 'TRIBUTE' && <Position p={war} />}{' '}
          {war.to === id && war.status === 'ACTIVE' && war.objective === 'TRIBUTE' && (
            <Order command={{ type: 'SETTLE_WAR', actorId: id, payload: { warId: war.id } }}>
              Payer {format(war.tributeGold)} or · 0 PA
            </Order>
          )}
        </div>
      ))}
      <h3>Sites stratégiques</h3>
      <p>
        Placez une unité capable de capturer sur le site, puis prenez-en le contrôle pour 1 PA. Les
        coordonnées sont publiques, le terrain reste à explorer.
      </p>
      {(w.strategy?.sites ?? []).map((site) => (
        <div key={site.id} className="strategy-row">
          <span>
            <strong>{SITE_NAMES[site.kind]}</strong>
            <br />
            {SITE_BENEFITS[site.kind]}
            <br />
            {site.ownerId ? w.realms.find((x) => x.id === site.ownerId)?.name : 'Neutre'}
          </span>
          <Position p={site} />
        </div>
      ))}
      <h3>Expéditions occultes</h3>
      <p>
        Une rencontre majeure peut apparaître chaque heure près des joueurs présents, avec trois au
        maximum sur le monde. Quatre adversaires : convoi du réacteur noir, gardien du monastère,
        créature de la brèche et sentinelle de la Cloche. Ils ripostent mais n’attaquent pas
        spontanément. Ressources et 10 PA au total sont partagés selon les dégâts infligés, dans la
        limite de {RULES.maxAP} PA par joueur.
      </p>
      {(w.strategy?.expeditions ?? []).map((u) => (
        <div className="strategy-row" key={u.id}>
          <span>
            {u.title} · <Duration until={u.expiresAt} />
          </span>
          <Position p={u} />
        </div>
      ))}
      <h3>Industrie atomique et confinement</h3>
      <p>
        Un réacteur actif contamine sa case et ses six voisines. À partir de 30 de contamination, la
        production de ressources des bâtiments touchés est divisée par deux. Un laboratoire
        isotopique à trois cases maximum réduit les émissions de 2 par niveau ; le niveau 3 les
        bloque. Ingénieurs et terrassiers nettoient jusqu’à sept cases pour 2 PA, 20 or et 50 fer.
        La contamination se dissipe aussi naturellement.
      </p>
    </section>
  );
}
function Coordinates({
  q,
  r,
  setQ,
  setR,
}: {
  q: number;
  r: number;
  setQ: (v: number) => void;
  setR: (v: number) => void;
}) {
  return (
    <div className="two-col">
      <label>
        Coordonnée Q
        <input
          type="number"
          step={1}
          min={-100000}
          max={100000}
          required
          value={q}
          onChange={(e) => setQ(Number(e.target.value))}
        />
      </label>
      <label>
        Coordonnée R
        <input
          type="number"
          step={1}
          min={-100000}
          max={100000}
          required
          value={r}
          onChange={(e) => setR(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
export function NuclearControls({ building }: { building: Building }) {
  const w = useGame((s) => s.world)!,
    pending = useGame((s) => s.pending),
    now = useGame((s) => s.now);
  const [q, setQ] = useState(building.q),
    [r, setR] = useState(building.r),
    [armed, setArmed] = useState(false);
  if (building.kind !== 'ROCKET_SILO') return null;
  const reactor = w.tiles.some(
    (t) =>
      t.building?.ownerId === w.player.id &&
      t.building.kind === 'NUCLEAR_REACTOR' &&
      t.building.level === 5,
  );
  const ready = (w.strategy?.nuclearReadyAt ?? 0) <= now,
    affordable =
      canAfford(w.player.wallet, STRATEGY.nuclearCost) &&
      (w.player.unlimitedAP || w.player.ap >= 10);
  return (
    <details className="nuclear-controls inset">
      <summary>☢ Arsenal atomique · niveau 5</summary>
      <p>
        Silo 5 + réacteur 5 requis. Impact après 5 minutes sur {hexArea(STRATEGY.nuclearRadius)}{' '}
        cases. Terres brûlées sans ressources ni construction avant restauration par un terrassier
        (2 PA + 20 bois + 10 fer par case). Destruction des troupes, bâtiments et routes ; héros et
        bâtiments de capitale préservés. Alliés, trêves et débutants protégés. Six heures entre deux
        tirs, même avec des PA illimités.
      </p>
      <Cost cost={STRATEGY.nuclearCost} wallet={w.player.wallet} />
      <StorageHint
        cost={STRATEGY.nuclearCost}
        wallet={w.player.wallet}
        capacity={w.player.capacity}
      />
      <Coordinates
        q={q}
        r={r}
        setQ={(v) => {
          setQ(v);
          setArmed(false);
        }}
        setR={(v) => {
          setR(v);
          setArmed(false);
        }}
      />
      <button className="text-button" onClick={() => focusMap({ q, r })}>
        Voir les coordonnées ↗
      </button>
      {building.level < 5 || !reactor ? (
        <p>Améliorez le silo et le réacteur au niveau 5.</p>
      ) : !ready ? (
        <p>
          Arsenal disponible dans <Duration until={w.strategy!.nuclearReadyAt} />
        </p>
      ) : !affordable ? (
        <p>Ressources indiquées et 10 PA nécessaires.</p>
      ) : !armed ? (
        <button className="secondary danger" onClick={() => setArmed(true)}>
          Préparer la frappe · 10 PA
        </button>
      ) : (
        <div role="alert">
          <p>
            <strong>
              Confirmer la destruction de la zone ({q}, {r}) ?
            </strong>{' '}
            Le tir lancé ne peut pas être rappelé. Les ressources sont dépensées immédiatement.
          </p>
          <button
            className="primary danger"
            disabled={pending}
            onClick={async () => {
              const res = await send({
                type: 'LAUNCH_NUKE',
                actorId: building.id,
                payload: { q, r },
              });
              if (res?.accepted) setArmed(false);
            }}
          >
            Lancer · 10 PA
          </button>{' '}
          <button className="text-button" onClick={() => setArmed(false)}>
            Annuler
          </button>
        </div>
      )}
    </details>
  );
}
export function StrategyUnitControls({ unit }: { unit: Unit }) {
  const w = useGame((s) => s.world)!,
    pending = useGame((s) => s.pending),
    [rename, setRename] = useState(false),
    [name, setName] = useState(unit.nickname ?? '');
  const site = w.strategy?.sites.find((x) => key(x) === key(unit) && x.ownerId !== w.player.id),
    clean =
      ['ENGINEER', 'TERRAFORMER'].includes(unit.kind) &&
      w.strategy?.fallout.some((p) => distance(p, unit) <= 1);
  return (
    <div className="strategy-unit-controls">
      {unit.kind !== 'HERO' && (
        <>
          <span className="badge">
            {VETERAN_NAMES[veteranRank(unit.victories)]} · {unit.victories ?? 0} victoire(s) · +
            {veteranRank(unit.victories) * 5} % attaque / défense
          </span>
          <button className="text-button" onClick={() => setRename(!rename)}>
            Renommer · 0 PA
          </button>
          {rename && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  (await send({ type: 'RENAME_UNIT', actorId: unit.id, payload: { name } }))
                    ?.accepted
                )
                  setRename(false);
              }}
            >
              <input
                aria-label="Nom de l’unité"
                value={name}
                required
                maxLength={32}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="secondary" disabled={pending}>
                Enregistrer · 0 PA
              </button>
            </form>
          )}
        </>
      )}
      {site && UNITS[unit.kind].capture > 0 && (
        <Order command={{ type: 'CLAIM_SITE', actorId: unit.id, payload: { siteId: site.id } }}>
          Contrôler {SITE_NAMES[site.kind]} · 1 PA
        </Order>
      )}
      {clean && (
        <Order command={{ type: 'CLEANUP', actorId: unit.id, payload: { q: unit.q, r: unit.r } }}>
          Décontaminer autour de l’unité · 2 PA · 20 or · 50 fer
        </Order>
      )}
    </div>
  );
}
export function NuclearAlerts() {
  const w = useGame((s) => s.world);
  const strikes = w?.strategy?.strikes.filter((x) => !x.resolvedAt) ?? [];
  if (!strikes.length) return null;
  return (
    <aside className="nuclear-alerts" aria-label="Alertes atomiques" role="status">
      {strikes.map((x) => (
        <button key={x.id} onClick={() => focusMap(x)}>
          ☢ Impact en <Duration until={x.impactAt} /> · ({x.q}, {x.r}) ·{' '}
          {hexArea(nuclearStrikeRadius(x))} cases · Voir la zone ↗
        </button>
      ))}
    </aside>
  );
}

function CaravanPanel() {
  const w = useGame((s) => s.world)!;
  return (
    <section className="strategy-panel">
      <h3>Caravanes en route</h3>
      <p>
        Une troupe de combat d’un partenaire ou d’un allié, à une case maximum, protège la cargaison
        du pillage. L’ennemi doit d’abord éliminer l’escorte. Une route coupée provoque le retour
        des ressources à l’expéditeur.
      </p>
      {w.caravans
        .filter((c) => c.ownerId === w.player.id || c.partnerId === w.player.id)
        .map((c) => (
          <div className="strategy-row" key={c.id}>
            <span>
              {w.realms.find((r) => r.id === c.ownerId)?.name} →{' '}
              {w.realms.find((r) => r.id === c.partnerId)?.name}
              <br />
              <Cost cost={c.cargo} />
              <br />
              Arrivée : <Duration until={c.arrivesAt} />
            </span>
            <Position p={c} />
          </div>
        ))}
    </section>
  );
}
