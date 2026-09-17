import { buildingStage, compareBuildings, buildingsUnlockedBy } from './building-order';
import { unitStats, attackStats, attackCost } from '@voidmarch/game-rules';
import { useState, type FormEvent } from 'react';
import { RoadAction } from './RoadAction';
import { NpcInfo } from './NpcInfo';
import { unitFrame } from './ui';
import { ContextHelp } from './Experience';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Shield,
  Handshake,
  Route,
  Users,
  Compass,
  Hammer,
  Swords,
  MapPin,
  Crown,
  ScrollText,
  ArrowUp,
} from 'lucide-react';
import {
  BUILDINGS,
  isBuildable,
  isWall,
  RULES,
  BUILDING_POPULATION,
  UNIT_PROFILES,
  UNIT_TABS,
  UNIT_CATEGORY,
  type UnitTab,
  BUILDING_TABS,
  BUILDING_CATEGORY,
  type BuildingTab,
  unitPopulation,
  unitUpkeep,
  productionOnTerrain,
  productionMultiplier,
  trainingBonusAt,
  BUILDING_REQUIREMENTS,
  BUILDING_ROLES,
  CITY_LEVELS,
  FACTIONS,
  RESOURCES,
  RESOURCE_NAMES,
  TERRAINS,
  UNITS,
  type Terrain,
  type BuildingKind,
  type Resource,
  type Settings,
  type UnitKind,
  type Wallet,
} from '@voidmarch/config';
import {
  amount,
  armyPopulation,
  canAfford,
  distance,
  estimateDamage,
  attackBlockReason,
  targetTerrainDefense,
  key,
  zeroWallet,
} from '@voidmarch/game-rules';
import type { AuthUser, Building, Proposal, Unit } from '@voidmarch/shared';
import { acceptSession, api, focusMap, notify, saveSettings, select, send, useGame } from './store';
import {
  BUILDING_FRAMES,
  Cost,
  Duration,
  format,
  Miniature,
  Modal,
  resourceIcons,
  Sigil,
  symbols,
  UNIT_FRAMES,
} from './ui';

export function Panels() {
  const panel = useGame((s) => s.panel),
    world = useGame((s) => s.world),
    target = useGame((s) => s.combatTarget);
  if (!world) return null;
  if (target) return <Combat />;
  if (!panel) return null;
  const titles = {
    realm: 'Votre royaume',
    army: 'Les armées',
    cities: 'Villes & domaines',
    economy: 'Les richesses des Marches',
    trade: 'Commerce & diplomatie',
    journal: 'Chronique du royaume',
    events: 'Les murmures du monde',
    rank: 'Les puissances des Marches',
    settings: 'Paramètres',
    profile: 'Votre souverain',
    help: 'Bienvenue dans les Marches',
    build: 'Bâtir sur vos terres',
    recruit: 'Rassembler vos troupes',
  };
  return (
    <Modal
      title={titles[panel]}
      toolbar={['build', 'recruit'].includes(panel) ? <CatalogResources /> : undefined}
      wide={['trade', 'economy', 'build', 'recruit', 'rank'].includes(panel)}
    >
      {panel === 'realm' ? (
        <RealmPanel />
      ) : panel === 'army' ? (
        <ArmyPanel />
      ) : panel === 'cities' ? (
        <CitiesPanel />
      ) : panel === 'economy' ? (
        <Economy />
      ) : panel === 'trade' ? (
        <Diplomacy />
      ) : panel === 'journal' ? (
        <Journal />
      ) : panel === 'events' ? (
        <Events />
      ) : panel === 'rank' ? (
        <Rank />
      ) : panel === 'settings' ? (
        <Preferences />
      ) : panel === 'profile' ? (
        <Profile />
      ) : panel === 'build' ? (
        <Build />
      ) : panel === 'recruit' ? (
        <Recruit />
      ) : (
        <Help />
      )}
    </Modal>
  );
}
function CatalogResources() {
  const wallet = useGame((s) => s.world!.player.wallet);
  return (
    <div className="catalog-resources" role="region" aria-label="Vos ressources disponibles">
      {RESOURCES.map((resource) => {
        const Icon = resourceIcons[resource];
        return (
          <div key={resource} title={RESOURCE_NAMES[resource]}>
            <Icon size={17} aria-hidden="true" />
            <span>
              <small>{RESOURCE_NAMES[resource]}</small>
              <strong>{format(wallet[resource])}</strong>
            </span>
          </div>
        );
      })}
    </div>
  );
}
// Civil support first; combatants by attack, defense, then health; vehicles last.
const recruitmentGroup = (kind: UnitKind) =>
  UNIT_CATEGORY[kind] === 'Civils & soutien'
    ? 0
    : ['Motos', 'Véhicules', 'Aviation', 'Hélicoptères'].includes(UNIT_CATEGORY[kind])
      ? 2
      : 1;
const compareRecruits = ([a]: [UnitKind, unknown], [b]: [UnitKind, unknown]) =>
  recruitmentGroup(a) - recruitmentGroup(b) ||
  (a === 'PEASANT' ? -1 : b === 'PEASANT' ? 1 : 0) ||
  UNITS[a].attack - UNITS[b].attack ||
  UNITS[a].defense - UNITS[b].defense ||
  UNITS[a].hp - UNITS[b].hp ||
  UNITS[a].name.localeCompare(UNITS[b].name, 'fr');

function RealmPanel() {
  const w = useGame((s) => s.world)!,
    p = w.player,
    me = w.realms.find((r) => r.id === p.id)!;
  return (
    <>
      <div className="realm-heading">
        <Sigil symbol={p.settings.emblem} color={p.settings.bannerColor} size={45} />
        <div>
          <div className="eyebrow">{FACTIONS[p.faction].name}</div>
          <h3>{p.name}</h3>
          <p>{FACTIONS[p.faction].description}</p>
        </div>
      </div>
      <div className="stat-grid">
        {[
          [Crown, 'Territoire', `${me.stats.territory} hexagones`],
          [Users, 'Population', format(p.population)],
          [Swords, 'Armée', `${w.units.filter((u) => u.ownerId === p.id).length} unités`],
          [Compass, 'Exploration', `${p.progression.exploration} hexagones`],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Crown;
          return (
            <div key={String(label)}>
              <I size={20} />
              <span>{String(label)}</span>
              <strong>{String(value)}</strong>
            </div>
          );
        })}
      </div>
      <div className="inset">
        <h4>Un royaume qui demeure</h4>
        <p>
          Vos terres, vos villes et vos routes restent à leur emplacement lorsque vous partez. La
          production s’arrête après trois minutes d’absence. Vos voisins peuvent toujours vous
          attaquer ; une trêve négociée reste valable hors ligne.
        </p>
      </div>
      <h4>Reliques conservées</h4>
      {p.relics.length ? (
        <ul className="relic-list">
          {p.relics.map((r, i) => (
            <li key={i}>◇ {r}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          Votre chronique cosmique reste à écrire. Explorez les ruines et les anomalies.
        </p>
      )}
      <button className="secondary" onClick={() => focusMap(p.capital)}>
        <MapPin size={15} /> Revenir à la capitale
      </button>
    </>
  );
}
function ArmyPanel() {
  const w = useGame((s) => s.world)!;
  return (
    <>
      <p className="panel-intro">
        Chaque troupe a un rôle. Le recrutement mobilise votre population et augmente l’entretien.
      </p>
      <div className="entity-list">
        {w.units
          .filter((u) => u.ownerId === w.player.id)
          .map((u) => (
            <button
              key={u.id}
              onClick={() => {
                select({ kind: 'unit', id: u.id, q: u.q, r: u.r });
                focusMap(u);
              }}
            >
              <Miniature frame={UNIT_FRAMES[u.kind]} size={65} />
              <div>
                <strong>
                  {UNITS[u.kind].name}{' '}
                  {u.rareBonus && <span className="rare-tag">✦ Rare +{u.rareBonus} %</span>}
                </strong>
                <span>
                  {u.hp}/{unitStats(u).hp} PV · Déplacement {UNITS[u.kind].move} · Vision{' '}
                  {UNITS[u.kind].vision}
                </span>
              </div>
              <ArrowUpRight size={16} />
            </button>
          ))}
      </div>
    </>
  );
}
function CitiesPanel() {
  const w = useGame((s) => s.world)!,
    buildings = w.tiles.flatMap((t) => (t.building?.ownerId === w.player.id ? [t.building] : []));
  return (
    <>
      <p className="panel-intro">
        Développez vos villages et spécialisez vos domaines selon les ressources du terrain.
      </p>
      <div className="entity-list">
        {buildings.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              select({ kind: 'building', id: b.id, q: b.q, r: b.r });
              focusMap(b);
            }}
          >
            <Miniature
              frame={b.kind === 'VILLAGE' ? Math.min(9, b.level + 6) : BUILDING_FRAMES[b.kind]}
              turretLevel={b.turretLevel}
              size={66}
            />
            <div>
              <strong>
                {b.kind === 'VILLAGE' ? CITY_LEVELS[b.level] : BUILDINGS[b.kind].name}
              </strong>
              <span>
                {b.population ? `${format(b.population)} habitants · ` : ''}Niveau {b.level} ·{' '}
                {b.hp} PV
              </span>
            </div>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
    </>
  );
}
function Economy() {
  const w = useGame((s) => s.world)!,
    p = w.player;
  return (
    <>
      <p className="panel-intro">
        La production de vos bâtiments, après entretien. Revendiquer une terre ne récolte pas
        automatiquement ses ressources. La production est calculée pendant votre présence et le
        délai de grâce de trois minutes.
      </p>
      <div className="economy-cards">
        {RESOURCES.map((r) => {
          const Icon = resourceIcons[r];
          return (
            <div key={r}>
              <Icon size={25} />
              <span>{RESOURCE_NAMES[r]}</span>
              <strong>{format(p.wallet[r])}</strong>
              <small className={p.income[r] >= 0 ? 'positive' : 'negative'}>
                {p.income[r] >= 0 ? '+' : ''}
                {p.income[r].toFixed(1)} / min
              </small>
              <div className="thin-progress">
                <i style={{ width: `${Math.min(100, (p.wallet[r] / p.capacity) * 100)}%` }} />
              </div>
              <small>Stockage : {format(p.capacity)}</small>
            </div>
          );
        })}
      </div>
      <div className="two-col">
        <div className="inset">
          <Users size={20} />
          <h4>La force des habitants</h4>
          <p>
            {format(p.population)} habitants soutiennent votre économie. Vos{' '}
            {w.units.filter((u) => u.ownerId === p.id).length} unités mobilisent{' '}
            {armyPopulation(w.units.filter((u) => u.ownerId === p.id))} habitants. La nourriture
            permet à vos villes de grandir.
          </p>
        </div>
        <div className="inset">
          <Route size={20} />
          <h4>Des voisins, des partenaires</h4>
          <p>
            Les marchés ouvrent les échanges. Reliez deux marchés par une route continue pour faire
            circuler des caravanes et partager leurs revenus.
          </p>
          <button className="text-button" onClick={() => useGame.setState({ panel: 'trade' })}>
            Ouvrir les échanges <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <h4>Domaines productifs</h4>
      <table>
        <thead>
          <tr>
            <th>Bâtiment</th>
            <th>Production de base / minute</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          {w.tiles
            .filter((t) => t.building?.ownerId === p.id)
            .map((t) => {
              const b = t.building!;
              const production = t.terrain
                ? Object.fromEntries(
                    Object.entries(productionOnTerrain(b.kind, t.terrain)).map(([r, v]) => [
                      r,
                      v * productionMultiplier(b.kind, b.level),
                    ]),
                  )
                : {};
              return (
                <tr key={b.id}>
                  <td>
                    {BUILDINGS[b.kind].name}
                    {b.kind === 'VILLAGE' ? ` · ${CITY_LEVELS[b.level]}` : ''}
                  </td>
                  <td>
                    <Cost cost={production} />
                    {!amount(production) && (
                      <span className="muted">
                        {amount(BUILDINGS[b.kind].production)
                          ? 'Terrain incompatible — production arrêtée'
                          : 'Infrastructure'}
                      </span>
                    )}
                  </td>
                  <td>
                    <button className="text-button" onClick={() => focusMap(b)}>
                      {b.q}, {b.r} <ArrowUpRight size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </>
  );
}
function WalletFields({
  value,
  onChange,
  label,
}: {
  value: Wallet;
  onChange: (w: Wallet) => void;
  label: string;
}) {
  return (
    <fieldset className="wallet-fields">
      <legend>{label}</legend>
      {RESOURCES.map((r) => {
        const Icon = resourceIcons[r];
        return (
          <label key={r}>
            <span>
              <Icon size={15} />
              {RESOURCE_NAMES[r]}
            </span>
            <input
              aria-label={`${label} ${RESOURCE_NAMES[r]}`}
              type="number"
              min={0}
              max={1e7}
              step={1}
              value={value[r]}
              onChange={(e) =>
                onChange({ ...value, [r]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
              }
            />
          </label>
        );
      })}
    </fieldset>
  );
}
function Diplomacy() {
  const w = useGame((s) => s.world)!,
    now = useGame((s) => s.now),
    pending = useGame((s) => s.pending),
    others = w.realms.filter((r) => r.id !== w.player.id && !r.defeated),
    [to, setTo] = useState(others[0]?.id ?? ''),
    [kind, setKind] = useState<'TRIBUTE' | 'TRADE'>('TRIBUTE'),
    [payer, setPayer] = useState('self'),
    [offer, setOffer] = useState<Wallet>({ ...zeroWallet(), GOLD: 50 }),
    [request, setRequest] = useState<Wallet>(zeroWallet()),
    [minutes, setMinutes] = useState(60),
    [parent, setParent] = useState<string>();
  const partner = w.realms.find((r) => r.id === to),
    proposals = w.proposals.filter((p) => p.status === 'PENDING' && p.expiresAt > now),
    treaties = w.treaties.filter((t) => t.endsAt > now);
  function counter(p: Proposal) {
    const other = p.from === w.player.id ? p.to : p.from;
    setTo(other);
    setKind(p.kind);
    setPayer(p.payer === w.player.id ? 'self' : 'other');
    setOffer(p.kind === 'TRADE' ? p.request : p.offer);
    setRequest(p.kind === 'TRADE' ? p.offer : zeroWallet());
    setMinutes(p.duration / 60000);
    setParent(p.id);
  }
  async function propose(e: FormEvent) {
    e.preventDefault();
    const result = await send({
      type: 'PROPOSE',
      actorId: w.player.id,
      payload: {
        to,
        kind,
        payer: kind === 'TRADE' || payer === 'self' ? w.player.id : to,
        offer,
        request: kind === 'TRADE' ? request : zeroWallet(),
        duration: minutes * 60000,
        parentId: parent,
      },
    });
    if (result?.accepted) setParent(undefined);
  }
  return (
    <>
      <div className="tab-row">
        <button className={kind === 'TRIBUTE' ? 'active' : ''} onClick={() => setKind('TRIBUTE')}>
          <Shield size={15} /> Tribut & trêve
        </button>
        <button
          className={kind === 'TRADE' ? 'active' : ''}
          onClick={() => {
            setKind('TRADE');
            setPayer('self');
          }}
        >
          <Handshake size={15} /> Échange commercial
        </button>
      </div>
      <p className="panel-intro">
        {kind === 'TRIBUTE'
          ? 'Négociez le prix de la paix. Le paiement et la protection réciproque commencent uniquement à l’acceptation.'
          : 'Échangez vos surplus contre des ressources manquantes, puis reliez vos marchés pour ouvrir une route commerciale.'}
      </p>
      <form onSubmit={propose} className="treaty-form">
        <div className="two-col">
          <label>
            Royaume partenaire
            <select
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setParent(undefined);
              }}
            >
              {others.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.bot ? ' · souverain autonome' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            {kind === 'TRIBUTE' ? 'Durée de la trêve (minutes)' : 'Durée de l’accord (minutes)'}
            <input
              type="number"
              min={1}
              max={10080}
              step={1}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              required
            />
          </label>
        </div>
        {kind === 'TRIBUTE' && (
          <label>
            Qui verse le tribut ?
            <select value={payer} onChange={(e) => setPayer(e.target.value)}>
              <option value="self">Mon royaume paie {partner?.name}</option>
              <option value="other">{partner?.name} paie mon royaume</option>
            </select>
          </label>
        )}
        <WalletFields
          label={kind === 'TRIBUTE' ? 'Tribut proposé' : 'Je propose'}
          value={offer}
          onChange={setOffer}
        />
        {kind === 'TRADE' && (
          <WalletFields label="Je demande" value={request} onChange={setRequest} />
        )}
        <div className="form-actions">
          <small>
            {partner?.bot
              ? 'Ce souverain examinera votre offre à sa prochaine fenêtre d’action (environ 10 min).'
              : 'Votre partenaire recevra la proposition dans sa diplomatie.'}
          </small>
          <button className="primary" disabled={pending || !to || amount(offer) === 0}>
            {parent ? 'Envoyer la contre-proposition' : 'Proposer l’accord'}
            <ArrowRight size={15} />
          </button>
        </div>
        {parent && (
          <button type="button" className="text-button" onClick={() => setParent(undefined)}>
            Annuler la contre-proposition
          </button>
        )}
      </form>
      <h4>
        À la table des négociations <span className="count">{proposals.length}</span>
      </h4>
      {proposals.length === 0 ? (
        <p className="empty-line">Aucune proposition en attente.</p>
      ) : (
        proposals.map((p) => (
          <div className="proposal" key={p.id}>
            <div>
              <strong>
                {p.kind === 'TRIBUTE' ? 'Tribut contre trêve' : 'Échange commercial'} ·{' '}
                {w.realms.find((r) => r.id === (p.from === w.player.id ? p.to : p.from))?.name}
              </strong>
              <small>
                {p.from === w.player.id ? 'Votre proposition' : 'Proposition reçue'} ·{' '}
                {p.duration / 60000} minutes · Payeur :{' '}
                {w.realms.find((r) => r.id === p.payer)?.name}
              </small>
              <Cost cost={p.offer} />
              {p.kind === 'TRADE' && (
                <span>
                  {' '}
                  contre <Cost cost={p.request} />
                </span>
              )}
            </div>
            <div className="proposal-actions">
              {p.to === w.player.id ? (
                <>
                  <button
                    className="primary small"
                    disabled={pending}
                    onClick={() =>
                      void send({
                        type: 'RESPOND',
                        actorId: w.player.id,
                        payload: { proposalId: p.id, decision: 'ACCEPT' },
                      })
                    }
                  >
                    <Check size={14} /> Accepter
                  </button>
                  <button className="secondary small" disabled={pending} onClick={() => counter(p)}>
                    Négocier
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Refuser la proposition"
                    disabled={pending}
                    onClick={() =>
                      void send({
                        type: 'RESPOND',
                        actorId: w.player.id,
                        payload: { proposalId: p.id, decision: 'REJECT' },
                      })
                    }
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <button
                  className="secondary small"
                  disabled={pending}
                  onClick={() =>
                    void send({
                      type: 'RESPOND',
                      actorId: w.player.id,
                      payload: { proposalId: p.id, decision: 'CANCEL' },
                    })
                  }
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
        ))
      )}
      <h4>Accords en vigueur</h4>
      {treaties.length === 0 ? (
        <p className="empty-line">
          Aucun accord actif. Vos frontières ne sont pas protégées par une trêve.
        </p>
      ) : (
        treaties.map((t) => (
          <div className="treaty" key={t.id}>
            {t.kind === 'TRUCE' ? <Shield size={22} /> : <Route size={22} />}
            <div>
              <strong>
                {t.kind === 'TRUCE' ? 'Trêve' : 'Accord commercial'} avec{' '}
                {w.realms.find((r) => r.id === (t.a === w.player.id ? t.b : t.a))?.name}
              </strong>
              <span>
                Expire dans <Duration until={t.endsAt} />
                {t.kind === 'TRADE' ? ' · Caravanes si vos marchés sont reliés par route' : ''}
              </span>
            </div>
            <span className="badge">ACTIF</span>
          </div>
        ))
      )}
    </>
  );
}
function Journal() {
  const w = useGame((s) => s.world)!;
  return (
    <div className="full-journal">
      {w.journal.map((j) => (
        <article key={j.id}>
          <span className="journal-marker" />
          <div>
            <small>
              {new Date(j.at).toLocaleString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ·{' '}
              {j.kind === 'DIPLOMACY'
                ? 'DIPLOMATIE'
                : j.kind === 'COMBAT'
                  ? 'COMBAT'
                  : j.kind === 'ECONOMY'
                    ? 'ÉCONOMIE'
                    : 'CHRONIQUE'}
            </small>
            <p>{j.text}</p>
            {j.q !== undefined && (
              <button className="text-button" onClick={() => focusMap({ q: j.q!, r: j.r! })}>
                Voir sur la carte <ArrowUpRight size={12} />
              </button>
            )}
          </div>
        </article>
      ))}
      {!w.journal.length && <p className="empty-line">Votre histoire commence ici.</p>}
    </div>
  );
}
function Events() {
  const w = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection),
    unit = w.units.find((u) => u.id === selection?.id && u.ownerId === w.player.id);
  return (
    <>
      <p className="panel-intro">
        Certaines merveilles sont annoncées dans toutes les Marches. D’autres attendent un
        éclaireur.
      </p>
      {w.units.filter((u) => u.npc).length > 0 && <h3>Rencontres neutres visibles</h3>}
      {w.units
        .filter((u) => u.npc)
        .map((npc) => (
          <article className="event-card" key={npc.id}>
            <Miniature frame={unitFrame(npc)} size={94} />
            <div>
              <h3>{unitStats(npc).name}</h3>
              <NpcInfo unit={npc} />
              <button
                className="secondary small"
                onClick={() => {
                  focusMap(npc);
                  useGame.setState({
                    selection: { kind: 'unit', id: npc.id, q: npc.q, r: npc.r },
                    mode: 'inspect',
                  });
                }}
              >
                Voir le PNJ
              </button>
            </div>
          </article>
        ))}
      {!w.events.some((e) => !e.claimedBy && e.endsAt > w.serverTimestamp) && (
        <p className="empty-line">Aucune découverte disponible pour le moment.</p>
      )}
      {w.events
        .filter((e) => !e.claimedBy && e.endsAt > w.serverTimestamp)
        .map((e) => (
          <article className={`event-card ${e.claimedBy ? 'claimed' : ''}`} key={e.id}>
            <Miniature
              frame={
                e.kind === 'MONOLITH'
                  ? 19
                  : e.kind === 'METEOR'
                    ? 20
                    : e.kind === 'COLOSSUS'
                      ? 21
                      : e.kind === 'ROYAL_CARAVAN'
                        ? 22
                        : 23
              }
              size={94}
            />
            <div>
              <div className="eyebrow">
                {e.claimedBy
                  ? 'DÉCOUVERTE ACCOMPLIE'
                  : e.global
                    ? 'ÉVÉNEMENT MONDIAL'
                    : 'DÉCOUVERTE LOCALE'}
              </div>
              <h3>{e.title}</h3>
              <p>{e.description}</p>
              <Cost cost={e.reward} />
              <small>
                Disparaît dans <Duration until={e.endsAt} />
              </small>
              <div className="button-row">
                <button className="secondary small" onClick={() => focusMap(e)}>
                  Localiser <MapPin size={13} />
                </button>
                {!e.claimedBy && (
                  <button
                    className="primary small"
                    disabled={!unit || distance(unit, e) > 1}
                    title={
                      !unit
                        ? 'Sélectionnez une de vos unités.'
                        : distance(unit, e) > 1
                          ? 'Approchez une unité à un hexagone.'
                          : undefined
                    }
                    onClick={() =>
                      unit &&
                      void send({ type: 'INTERACT', actorId: unit.id, payload: { eventId: e.id } })
                    }
                  >
                    Explorer · 1 PA
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
    </>
  );
}
function Rank() {
  const w = useGame((s) => s.world)!,
    [metric, setMetric] = useState<keyof (typeof w.realms)[number]['stats']>('territory');
  const labels = {
    territory: 'Territoire',
    military: 'Puissance militaire',
    wealth: 'Richesse',
    population: 'Population',
    development: 'Développement',
    exploration: 'Exploration',
    commerce: 'Commerce',
    relics: 'Reliques',
  };
  return (
    <>
      <p className="panel-intro">
        La grandeur prend plusieurs formes. Aucun classement ne résume à lui seul la réussite d’un
        royaume.
      </p>
      <label>
        Comparer par
        <select value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)}>
          {Object.entries(labels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <table className="rank-table">
        <thead>
          <tr>
            <th>Rang</th>
            <th>Royaume</th>
            <th>Bannière</th>
            <th>{labels[metric]}</th>
          </tr>
        </thead>
        <tbody>
          {[...w.realms]
            .sort((a, b) => b.stats[metric] - a.stats[metric])
            .map((r, i) => (
              <tr key={r.id} className={r.id === w.player.id ? 'you' : ''}>
                <td>{String(i + 1).padStart(2, '0')}</td>
                <td>
                  {r.name}
                  {r.id === w.player.id && <span className="badge">VOUS</span>}
                </td>
                <td>{FACTIONS[r.faction].short}</td>
                <td>{format(r.stats[metric])}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}
function Build() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<BuildingTab>('Tous');
  const w = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection),
    pending = useGame((s) => s.pending),
    tile = w.tiles.find((t) => selection && key(t) === key(selection));
  const builder =
    tile &&
    w.units.find(
      (u) => u.ownerId === w.player.id && UNIT_PROFILES[u.kind].builder && distance(u, tile) <= 1,
    );
  const frontier =
    tile &&
    !tile.ownerId &&
    builder &&
    w.tiles.some(
      (t) => t.building?.ownerId === w.player.id && distance(t, tile) <= RULES.constructionRadius,
    );
  return (
    <>
      <p className="panel-intro">
        {tile?.terrain ? `${TERRAINS[tile.terrain].name} · Hexagone ${tile.q}, ${tile.r}. ` : ''}Un
        bâtiment par hexagone. Extension possible à 3 cases d’un bâtiment avec un bâtisseur près du
        chantier. {Object.keys(BUILDINGS).length} types de bâtiments, dont 2 évolutions de remparts.
        Une enceinte fermée revendique les cases neutres à l’intérieur ; un bâtisseur doit rester
        près de chaque chantier. Les routes peuvent traverser un domaine déjà bâti.
      </p>
      {tile?.ownerId !== w.player.id && !frontier && (
        <p className="form-error">
          Choisissez vos terres, ou un chantier à 3 cases d’un bâtiment et à une case d’un
          bâtisseur.
        </p>
      )}
      <p className="catalog-order-hint">
        Palissade en premier · Puis terrain adapté et bâtiments de base → développements avancés
      </p>
      <ContextHelp title="Où construire et pourquoi certains bâtiments sont bloqués ?">
        <p>
          La palissade est épinglée en premier, puis les bâtiments adaptés au terrain, des bases aux
          constructions avancées. Chaque étape correspond à la profondeur des prérequis. À étape
          égale, les moins coûteux viennent d’abord. Il faut une case libre de votre royaume, ou un
          bâtisseur à une case maximum du chantier neutre, situé à trois cases maximum de l’un de
          vos bâtiments.
        </p>
        <p>
          Une enceinte fermée avec vos remparts en bois, pierre ou acier prend les cases neutres à
          l’intérieur. Vous pouvez y construire sans limite de distance aux bâtiments, avec un
          paysan ou un ingénieur à une case maximum. Si une brèche s’ouvre, seules les cases portant
          un bâtiment restent à vous. Les terrains ennemis ne sont jamais pris automatiquement.
        </p>
        <p>
          Chaque construction coûte 1 PA et les ressources affichées. Certains bâtiments demandent
          d’autres infrastructures : les prérequis sont indiqués sur leur fiche. Les coûts en rouge
          dépassent votre stock actuel.
        </p>
      </ContextHelp>
      <div className="catalog-tabs" role="tablist" aria-label="Types de bâtiments">
        {BUILDING_TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={category === tab}
            onClick={() => setCategory(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <label className="catalog-search">
        Rechercher dans le catalogue
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom d’une unité ou d’un bâtiment…"
        />
      </label>
      <div className="catalog">
        {(Object.entries(BUILDINGS) as [BuildingKind, (typeof BUILDINGS)[BuildingKind]][])
          .filter(([kind]) => isBuildable(kind))
          .filter(([kind]) => category === 'Tous' || BUILDING_CATEGORY[kind] === category)
          .filter(([, b]) => b.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
          .sort(
            ([a], [b]) =>
              Number(b === 'WOOD_WALL') - Number(a === 'WOOD_WALL') ||
              compareBuildings(a, b, tile?.terrain),
          )
          .map(([kind, b]) => {
            const cost = Object.fromEntries(
              Object.entries(b.cost).map(([k, v]) => [
                k,
                Math.ceil(v * (w.player.faction === 'ASH' ? 0.9 : 1)),
              ]),
            );
            const missing = (BUILDING_REQUIREMENTS[kind] ?? []).find(
              (k) =>
                !w.tiles.some((t) => t.building?.ownerId === w.player.id && t.building.kind === k),
            );
            const reason =
              !tile || (tile.ownerId !== w.player.id && !frontier)
                ? 'Sur votre territoire uniquement'
                : tile.enclosureOwnerId && !builder
                  ? 'Approchez un paysan ou un ingénieur à une case maximum'
                  : tile.building
                    ? 'Hexagone déjà construit'
                    : !tile.terrain || !b.terrains.includes(tile.terrain)
                      ? 'Terrain incompatible'
                      : missing
                        ? `${BUILDINGS[missing].name} nécessaire`
                        : !w.player.unlimitedAP && w.player.ap < 1
                          ? '1 PA nécessaire'
                          : !canAfford(w.player.wallet, cost)
                            ? 'Ressources insuffisantes'
                            : '';
            return (
              <article key={kind} className={reason ? 'catalog-locked' : 'catalog-ready'}>
                <span className="catalog-status">
                  {reason
                    ? tile?.terrain && b.terrains.includes(tile.terrain)
                      ? 'Terrain adapté · conditions à remplir'
                      : 'Terrain incompatible'
                    : 'Prêt à construire'}
                </span>
                <Miniature frame={BUILDING_FRAMES[kind]} size={80} />
                <h4>{b.name}</h4>
                <span className="building-stage">
                  {buildingStage(kind) === 0
                    ? 'Étape 1 · Bâtiment de base'
                    : `Étape ${buildingStage(kind) + 1} · Développement`}
                </span>
                <div className="building-prerequisites">
                  {(BUILDING_REQUIREMENTS[kind] ?? []).length === 0 ? (
                    <p>Aucun bâtiment préalable.</p>
                  ) : (
                    <>
                      <p>À construire d’abord :</p>
                      {(BUILDING_REQUIREMENTS[kind] ?? []).map((required) => {
                        const owned = w.tiles.some(
                          (t) =>
                            t.building?.ownerId === w.player.id && t.building.kind === required,
                        );
                        return (
                          <button
                            key={required}
                            className={`prerequisite-link ${owned ? 'fulfilled' : ''}`}
                            title={`Voir ${BUILDINGS[required].name}`}
                            onClick={() => {
                              setCategory('Tous');
                              setQuery(BUILDINGS[required].name);
                            }}
                          >
                            {owned ? '✓ ' : '→ '}
                            {BUILDINGS[required].name}
                            {owned ? ' · construit' : ''}
                          </button>
                        );
                      })}
                    </>
                  )}
                  {buildingsUnlockedBy(kind).length > 0 && (
                    <p className="building-unlocks">
                      Prérequis pour :{' '}
                      {buildingsUnlockedBy(kind)
                        .map((next) => BUILDINGS[next].name)
                        .join(', ')}
                      .
                    </p>
                  )}
                </div>
                {BUILDING_ROLES[kind] && <p>{BUILDING_ROLES[kind]}</p>}
                <p>
                  Production / min :{' '}
                  {RESOURCES.filter(
                    (r) =>
                      (productionOnTerrain(kind, tile?.terrain ?? (b.terrains[0] as Terrain))[r] ??
                        0) > 0,
                  )
                    .map(
                      (r) =>
                        `${productionOnTerrain(kind, tile?.terrain ?? (b.terrains[0] as Terrain))[r]} ${RESOURCE_NAMES[r].toLowerCase()}`,
                    )
                    .join(' · ') || 'aucune ressource directe'}
                  .
                </p>
                {(BUILDING_POPULATION[kind] ?? 0) > 0 && (
                  <p>Population initiale : {BUILDING_POPULATION[kind]} habitants.</p>
                )}
                {Object.entries(UNIT_PROFILES).some(([, p]) => p.recruitAt.includes(kind)) && (
                  <p>
                    Forme :{' '}
                    {Object.entries(UNIT_PROFILES)
                      .filter(([, p]) => p.recruitAt.includes(kind))
                      .map(([k]) => UNITS[k as UnitKind].name)
                      .join(', ')}
                    .
                  </p>
                )}
                <p>
                  {b.terrains.map((t) => TERRAINS[t as keyof typeof TERRAINS].name).join(' · ')}
                </p>
                <Cost cost={cost} wallet={w.player.wallet} />
                {reason && <p className="catalog-unavailable">{reason}</p>}

                <button
                  className="secondary small"
                  title={reason || 'Construire'}
                  disabled={!!reason || pending}
                  onClick={() =>
                    tile &&
                    void send({
                      type: 'BUILD',
                      actorId: builder?.id ?? w.player.id,
                      payload: { q: tile.q, r: tile.r, kind },
                    })
                  }
                >
                  Construire · 1 PA
                </button>
              </article>
            );
          })}
      </div>
      <div className="inset">
        <Route size={20} />
        <h4>Route & pont</h4>
        <p>
          Ouvrez le mode Routes pour poser ou retirer plusieurs tronçons en cliquant sur la carte.
          Pose possible sur votre territoire, même sous un bâtiment, ou sur terrain neutre avec un
          paysan ou un ingénieur à une case maximum. Depuis vos terres ou une route, une unité peut
          voyager sans limite de distance pour 1 PA, tant que chaque case du trajet est à vous ou
          porte une route explorée. Cela inclut les terres capturées à l’intérieur des remparts. Les
          obstacles et terrains impraticables restent bloquants. Ailleurs, sa portée normale
          s’applique.
        </p>
        <RoadAction tile={tile} />
      </div>
    </>
  );
}
function Recruit() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<UnitTab>('Toutes');
  const [atomicOnly, setAtomicOnly] = useState(false);
  const w = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection),
    pending = useGame((s) => s.pending);
  const building = w.tiles.find((t) => t.building?.id === selection?.id)?.building;
  const ownUnits = w.units.filter((u) => u.ownerId === w.player.id);
  const capacity = Math.max(15, w.player.population);
  const mobilized = armyPopulation(ownUnits);
  const recruitReason = (kind: UnitKind) => {
    const profile = UNIT_PROFILES[kind];
    const free = kind === 'PEASANT' && !ownUnits.some((u) => u.kind === 'PEASANT');
    const missing = profile.requires.find(
      (k) => !w.tiles.some((t) => t.building?.ownerId === w.player.id && t.building.kind === k),
    );
    if (!building || building.ownerId !== w.player.id) return 'Sélectionnez votre bâtiment';
    if (!profile.recruitAt.includes(building.kind))
      return `Formation : ${BUILDINGS[profile.recruitAt[0]].name}`;
    if (missing) return `${BUILDINGS[missing].name} nécessaire`;
    if (!free && mobilized + unitPopulation(kind) > capacity) return 'Population insuffisante';
    if (!free && !canAfford(w.player.wallet, UNITS[kind].cost)) return 'Ressources insuffisantes';
    if (!w.player.unlimitedAP && w.player.ap < 1) return '1 PA nécessaire';
    return '';
  };
  return (
    <>
      <p className="panel-intro">
        {building
          ? `${BUILDINGS[building.kind].name} · ${building.q}, ${building.r}`
          : 'Sélectionnez un bâtiment de recrutement.'}{' '}
        — {Object.keys(UNITS).length} types d’unités · Mobilisation : {mobilized}/{capacity} places.
      </p>
      <p className="rare-explanation">
        ✦ À chaque recrutement : 1 % de chance d’obtenir une unité rare, avec +10 à +30 % de PV,
        attaque et défense. Sa portée et son déplacement restent identiques.
      </p>
      <p className="muted">
        Chaque unité indique son bâtiment de formation et les prérequis. Si vous n’avez plus de
        paysan, son remplacement est gratuit.
      </p>
      <ContextHelp title="Comment choisir et former une unité ?">
        <p>
          Unités recrutables immédiatement en premier, puis les autres. Dans chaque groupe : civils,
          combattants par force croissante, puis véhicules. La portée, la défense et les capacités
          spéciales comptent aussi dans un combat.
        </p>
        <p>
          PV : résistance aux dégâts. ATQ : attaque. DÉF : défense. MOUV : budget de déplacement ;
          le terrain en consomme plus ou moins. PORTÉE et VISION sont exprimées en cases.
        </p>
        <p>
          Recrutez depuis le bâtiment de formation indiqué. La mobilisation doit tenir dans votre
          population, avec un minimum de 15 places. L’entretien est prélevé chaque minute de
          production active.
        </p>
      </ContextHelp>
      <label className="atomic-filter">
        <input
          type="checkbox"
          checked={atomicOnly}
          onChange={(e) => setAtomicOnly(e.target.checked)}
        />
        ☢ Division atomique · {Object.values(UNIT_PROFILES).filter((p) => p.radioactive).length}{' '}
        unités d’élite
      </label>
      {atomicOnly && (
        <p className="muted">
          Laboratoire des isotopes → Réacteur noir. Recrutez ensuite dans les bâtiments indiqués ;
          la fonderie atomique débloque les modèles ultimes. Coûts et mobilisation élevés.
        </p>
      )}
      <div className="catalog-tabs" role="tablist" aria-label="Types d’unités">
        {UNIT_TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={category === tab}
            onClick={() => setCategory(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <label className="catalog-search">
        Rechercher dans le catalogue
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom d’une unité ou d’un bâtiment…"
        />
      </label>
      <div className="catalog">
        {(Object.entries(UNITS) as [UnitKind, (typeof UNITS)[UnitKind]][])
          .sort(
            (a, b) =>
              Number(!!recruitReason(a[0])) - Number(!!recruitReason(b[0])) ||
              Number(!canAfford(w.player.wallet, UNITS[a[0]].cost)) -
                Number(!canAfford(w.player.wallet, UNITS[b[0]].cost)) ||
              compareRecruits(a, b),
          )
          .filter(([kind]) => category === 'Toutes' || UNIT_CATEGORY[kind] === category)
          .filter(([kind]) => !atomicOnly || UNIT_PROFILES[kind].radioactive)
          .filter(([kind, u]) =>
            `${u.name} ${UNIT_PROFILES[kind].radioactive ? 'atomique radioactif' : ''} ${UNIT_PROFILES[kind].recruitAt.map((k) => BUILDINGS[k].name).join(' ')}`
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
          )
          .map(([kind, u]) => {
            const profile = UNIT_PROFILES[kind],
              free = kind === 'PEASANT' && !ownUnits.some((x) => x.kind === 'PEASANT');
            const cost = free ? { STONE: 0, GOLD: 0, WOOD: 0, IRON: 0, FOOD: 0 } : u.cost;
            const reason = recruitReason(kind);
            return (
              <article key={kind} className={reason ? 'catalog-locked' : 'catalog-ready'}>
                <span className="catalog-status">
                  {reason ? 'Conditions à remplir' : 'Prêt à recruter'}
                </span>
                <Miniature frame={UNIT_FRAMES[kind]} size={90} />
                <h4>{u.name}</h4>
                {profile.radioactive && <span className="atomic-badge">☢ Division atomique</span>}
                <p>{profile.role}</p>
                {building && !profile.builder && (
                  <p>
                    Entraînement de votre royaume : +
                    {Math.max(
                      0,
                      ...w.tiles
                        .filter(
                          (t) =>
                            t.building?.ownerId === w.player.id &&
                            profile.recruitAt.includes(t.building.kind),
                        )
                        .map((t) => trainingBonusAt(t.building!.kind, t.building!.level)),
                    )}{' '}
                    % aux PV, attaque et défense.
                  </p>
                )}
                <p>
                  {unitPopulation(kind)} places · Entretien / min :{' '}
                  {RESOURCES.filter((resource) => unitUpkeep(kind)[resource] > 0)
                    .map(
                      (resource) =>
                        `${unitUpkeep(kind)[resource].toFixed(2)} ${RESOURCE_NAMES[resource].toLowerCase()}`,
                    )
                    .join(' · ')}
                </p>
                <p>
                  {u.hp} PV · ATQ {u.attack} · DÉF {u.defense}
                  <br />
                  MOUV {u.move} · VISION {u.vision} · PORTÉE {u.range}
                </p>
                <Cost cost={cost} wallet={w.player.wallet} />
                {reason && <p className="catalog-unavailable">{reason}</p>}
                {free && <p>Gratuit en ressources</p>}

                <p>Formation : {profile.recruitAt.map((k) => BUILDINGS[k].name).join(', ')}.</p>
                {profile.requires.length > 0 && (
                  <p>
                    Infrastructures : {profile.requires.map((k) => BUILDINGS[k].name).join(', ')}.
                  </p>
                )}
                <p>
                  Mobilisation : {mobilized}/{capacity} places occupées, +{unitPopulation(kind)}{' '}
                  pour cette unité.
                </p>

                <button
                  className="secondary small"
                  disabled={pending || !!reason}
                  title={reason || profile.role}
                  onClick={() =>
                    building &&
                    void send({ type: 'RECRUIT', actorId: building.id, payload: { kind } })
                  }
                >
                  {free ? 'Former le paysan · 1 PA' : 'Recruter · 1 PA'}
                </button>
              </article>
            );
          })}
      </div>
    </>
  );
}
function Combat() {
  const w = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection),
    targetId = useGame((s) => s.combatTarget),
    pending = useGame((s) => s.pending),
    now = useGame((s) => s.now);
  const attacker =
      w.units.find((u) => u.id === selection?.id) ??
      w.tiles.find((t) => t.building?.id === selection?.id)?.building,
    target: Unit | Building | undefined =
      w.units.find((u) => u.id === targetId) ??
      w.tiles.find((t) => t.building?.id === targetId)?.building;
  const tile = target ? w.tiles.find((t) => key(t) === key(target)) : undefined;
  if (!attacker || !target || !tile?.terrain)
    return (
      <Modal title="Cible indisponible">
        <p>Cette cible n’est plus visible. Revenez à la carte pour choisir votre prochain ordre.</p>
      </Modal>
    );
  const estimate = estimateDamage(attacker, target, {
      q: tile.q,
      r: tile.r,
      terrain: tile.terrain,
    }),
    enemy = w.realms.find((r) => r.id === target.ownerId),
    truce = w.treaties.some(
      (t) =>
        t.kind === 'TRUCE' && t.endsAt > now && (t.a === target.ownerId || t.b === target.ownerId),
    ),
    ap = attackCost(attacker),
    reason =
      attackBlockReason(attacker, target, tile.building) ||
      (truce
        ? 'Une trêve interdit cette attaque.'
        : enemy && enemy.protectedUntil > now
          ? 'Ce royaume bénéficie de la protection initiale.'
          : distance(attacker, target) > attackStats(attacker).range
            ? 'Cette cible est hors de portée.'
            : !w.player.unlimitedAP && w.player.ap < ap
              ? `${ap} PA nécessaires.`
              : '');
  return (
    <Modal title="Donner l’ordre d’attaquer" eyebrow="CONSEIL DE GUERRE">
      <div className="combat-versus">
        <div>
          <Miniature
            frame={'population' in attacker ? BUILDING_FRAMES[attacker.kind] : unitFrame(attacker)}
            size={115}
            turretLevel={'population' in attacker ? attacker.turretLevel : undefined}
          />
          <strong>{attackStats(attacker).name}</strong>
          <span>{attacker.hp} PV</span>
        </div>
        <Swords size={30} />
        <div>
          <Miniature
            frame={'population' in target ? BUILDING_FRAMES[target.kind] : unitFrame(target)}
            turretLevel={'population' in target ? target.turretLevel : undefined}
            size={115}
          />
          <strong>
            {'population' in target ? BUILDINGS[target.kind].name : unitStats(target).name}
          </strong>
          <span>
            {target.hp} PV · {'npc' in target && target.npc ? 'PNJ neutre' : enemy?.name}
          </span>
        </div>
      </div>
      <div className="damage-estimate">
        <span>DÉGÂTS ESTIMÉS</span>
        <strong>
          {estimate.min}–{estimate.max}
        </strong>
        <small>
          {TERRAINS[tile.terrain].name} · Défense du terrain : +
          {targetTerrainDefense(target, tile.terrain)}
          {!('population' in target) && UNIT_PROFILES[target.kind].flying
            ? ' (cible aérienne)'
            : ''}
        </small>
      </div>
      {'npc' in target && target.npc && (
        <>
          <NpcInfo unit={target as Unit} />
          <p className="warning">
            {distance(target, attacker) <= unitStats(target as Unit).range &&
            !attackBlockReason(
              target,
              attacker,
              w.tiles.find((t) => key(t) === key(attacker))?.building,
            )
              ? (() => {
                  const terrain = w.tiles.find((t) => key(t) === key(attacker))?.terrain ?? 'PLAIN';
                  const retaliation = estimateDamage(target, attacker, {
                    q: attacker.q,
                    r: attacker.r,
                    terrain,
                  });
                  return `S’il survit : riposte estimée de ${retaliation.min} à ${retaliation.max} dégâts.`;
                })()
              : 'Votre attaquant est hors de portée de sa riposte.'}
          </p>
        </>
      )}
      {isWall(target.kind) && (
        <p>
          Ouvrir une brèche : détruisez ce tronçon pour rendre sa case franchissable. Les engins de
          siège utilisent leurs dégâts contre les bâtiments.
        </p>
      )}
      {w.player.protectedUntil > now && !('npc' in target && target.npc) && (
        <p className="warning">Donner cet ordre mettra fin à votre protection initiale.</p>
      )}
      {reason && <p className="form-error">{reason}</p>}
      <button
        className="primary danger full-width"
        disabled={pending || !!reason}
        onClick={() =>
          void send({ type: 'ATTACK', actorId: attacker.id, payload: { targetId: target.id } })
        }
      >
        <Swords size={16} /> Confirmer l’attaque · {ap} PA
      </button>
    </Modal>
  );
}
function Preferences() {
  const current = useGame((s) => s.world)!.player.settings,
    [draft, setDraft] = useState<Settings>({ ...current }),
    [busy, setBusy] = useState(false);
  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft({ ...draft, [k]: v });
  const checks: [keyof Settings, string, string][] = [
    ['grid', 'Contours des hexagones', 'Conserver les limites du plateau visibles.'],
    ['coordinates', 'Coordonnées axiales', 'Afficher q et r sous le curseur.'],
    [
      'edgeScrolling',
      'Défilement aux bords',
      'Déplacer la carte en approchant le curseur des bords.',
    ],
    [
      'reducedMotion',
      'Réduire les animations',
      'Désactiver mouvements animés, brume et vibrations.',
    ],
    ['highContrast', 'Contraste renforcé', 'Rendre les textes et contrôles plus distincts.'],
    [
      'confirmDangerous',
      'Confirmer les actions dangereuses',
      'Afficher une confirmation pour les captures hostiles.',
    ],
    [
      'autoCenterEvents',
      'Centrer sur les événements',
      'Déplacer la caméra vers une nouvelle annonce mondiale.',
    ],
    ['combatNotifications', 'Notifications de combat', 'Afficher les alertes militaires.'],
    [
      'realmNotifications',
      'Notifications du royaume',
      'Afficher les nouvelles économiques et diplomatiques.',
    ],
  ];
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await saveSettings(draft);
        setBusy(false);
      }}
    >
      <h4>Carte & accessibilité</h4>
      {checks.map(([k, label, description]) => (
        <label className="toggle-setting" key={k}>
          <span>
            <strong>{label}</strong>
            <small>{description}</small>
          </span>
          <input
            type="checkbox"
            checked={Boolean(draft[k])}
            onChange={(e) => update(k, e.target.checked as never)}
          />
        </label>
      ))}
      <div className="two-col">
        <label>
          Vitesse de caméra
          <input
            type="range"
            min={0.3}
            max={3}
            step={0.1}
            value={draft.cameraSpeed}
            onChange={(e) => update('cameraSpeed', Number(e.target.value))}
          />
        </label>
        <label>
          Taille de l’interface
          <input
            type="range"
            min={0.8}
            max={1.3}
            step={0.05}
            value={draft.uiScale}
            onChange={(e) => update('uiScale', Number(e.target.value))}
          />
        </label>
      </div>
      <label>
        Contrôle préféré
        <select value={draft.input} onChange={(e) => update('input', e.target.value)}>
          <option value="mouse">Souris & clavier</option>
          <option value="touch">Tactile</option>
        </select>
      </label>
      <button className="primary full-width" disabled={busy}>
        <Check size={16} /> Enregistrer les préférences
      </button>
    </form>
  );
}
function Profile() {
  const w = useGame((s) => s.world)!,
    user = useGame((s) => s.user)!,
    [username, setUsername] = useState(user.username),
    [password, setPassword] = useState(''),
    [email, setEmail] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [emblem, setEmblem] = useState(w.player.settings.emblem),
    [color, setColor] = useState(w.player.settings.bannerColor),
    [secondary, setSecondary] = useState(w.player.settings.bannerSecondary),
    [shape, setShape] = useState(w.player.settings.bannerShape);
  async function register(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      acceptSession(
        await api<{ token: string; user: AuthUser }>('/auth/register', {
          username,
          password,
          ...(email ? { email } : {}),
          faction: w.player.faction,
        }),
      );
      notify('Votre compte est enregistré. Toute votre progression est conservée.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="realm-heading">
        <Sigil symbol={emblem} color={color} size={43} />
        <div>
          <div className="eyebrow">{user.guest ? 'SOUVERAIN INVITÉ' : 'COMPTE ENREGISTRÉ'}</div>
          <h3>{user.username}</h3>
          <p>{FACTIONS[w.player.faction].name}</p>
        </div>
      </div>
      <h4>Votre emblème</h4>
      <div className="emblem-picker">
        {Object.entries(symbols).map(([k, Icon]) => (
          <button
            key={k}
            className={emblem === k ? 'active' : ''}
            aria-label={`Emblème ${k}`}
            onClick={() => setEmblem(k)}
          >
            <Icon size={23} />
          </button>
        ))}
      </div>
      <div className="two-col">
        <label>
          Couleur de bannière
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label>
          Couleur secondaire
          <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} />
        </label>
      </div>
      <label>
        Forme de bannière
        <select value={shape} onChange={(e) => setShape(e.target.value)}>
          <option value="swallow">Queue d’hirondelle</option>
          <option value="shield">Écu</option>
          <option value="square">Étendard carré</option>
        </select>
      </label>
      <button
        className="secondary"
        onClick={() =>
          void saveSettings({
            emblem,
            bannerColor: color,
            bannerSecondary: secondary,
            bannerShape: shape,
          })
        }
      >
        Enregistrer la bannière
      </button>
      {user.guest && (
        <form className="register-form" onSubmit={register}>
          <h4>Inscrire votre nom dans la pierre</h4>
          <p>
            Après 24 h sans connexion, ce compte invité et tout son royaume seront supprimés.
            Enregistrez-le pour le conserver et le retrouver sur un autre appareil.
          </p>
          <label>
            Nom de souverain
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={24}
            />
          </label>
          <label>
            Adresse e-mail facultative
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={10}
              required
              autoComplete="new-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={busy}>
            Conserver mon royaume <ArrowRight size={15} />
          </button>
        </form>
      )}
    </>
  );
}
function Help() {
  const w = useGame((s) => s.world)!;
  return (
    <>
      <div className="welcome-art" />
      <p className="panel-intro">
        Votre civilisation commence avec un campement. Le monde continue lorsque vous partez.
      </p>
      <ol className="help-steps">
        <li>
          <Compass size={22} />
          <div>
            <strong>Fondez votre civilisation</strong>
            <p>
              Votre campement démarre sans stock ni armée. Sélectionnez-le, puis « Recruter » et «
              Former le paysan ». Ce premier paysan ne coûte aucune ressource.
            </p>
          </div>
        </li>
        <li>
          <Hammer size={22} />
          <div>
            <strong>Faites prospérer vos terres</strong>
            <p>
              Déplacez le paysan sur une forêt pour récolter du bois, sur une colline pour le fer ou
              la pierre, et sur une montagne pour la pierre. Une récolte de bois permet de
              construire une chaumière. Les paysans bâtissent aussi sur une case neutre adjacente à
              votre territoire et revendiquent les terres inoccupées.
            </p>
          </div>
        </li>
        <li>
          <Shield size={22} />
          <div>
            <strong>Négociez votre sécurité</strong>
            <p>
              Vous avez dix minutes de protection initiale. Votre royaume reste ensuite attaquable,
              même hors ligne. Un tribut accepté garantit une trêve réciproque.
            </p>
          </div>
        </li>
        <li>
          <ScrollText size={22} />
          <div>
            <strong>Chaque minute, une décision</strong>
            <p>
              Vous commencez avec 30 PA. Le bonus au-dessus de 15 se dépense sans se régénérer ;
              ensuite vous gagnez 1 PA par minute, jusqu’à 15. Le commerce et les négociations n’en
              consomment pas. Glissez la carte, utilisez la molette ou les boutons de zoom.
            </p>
          </div>
        </li>
      </ol>
      <ContextHelp title="Pourquoi mes ressources baissent-elles ?">
        <p>
          Les gains affichés en haut sont nets : production moins entretien des unités, coût des
          territoires et consommation des habitants. Une case vide n’extrait aucune ressource.
          Consultez Économie pour le détail.
        </p>
        <p>
          La production normale fonctionne pendant votre présence, avec trois minutes de grâce après
          votre départ. Les PA continuent à se régénérer hors ligne : 1 par minute, jusqu’à 15.
        </p>
      </ContextHelp>
      <ContextHelp title="Pourquoi ma population ne grandit-elle plus ?">
        <p>
          Il faut plus de 5 vivres en stock, des habitants disponibles après mobilisation de l’armée
          et de la place dans les logements. Une chaumière ajoute une capacité de population ;
          développer une agglomération augmente aussi son plafond.
        </p>
      </ContextHelp>
      <ContextHelp title="Que fait une capture ?">
        <p>
          Elle transfère la case et son éventuel bâtiment à votre royaume. Un paysan ne capture que
          des terres neutres sans bâtiment. Certaines positions demandent plusieurs actions de
          capture.
        </p>
        <p>
          La récolte sur une terre neutre ne nécessite pas de capture. Pour étendre vos productions,
          choisissez les terrains adaptés : scierie en forêt, mine sur colline, carrière sur colline
          ou montagne.
        </p>
      </ContextHelp>
      <ContextHelp title="Comment protéger mon royaume quand je pars ?">
        <p>
          Après la protection initiale de dix minutes, votre royaume reste attaquable hors ligne.
          Une action hostile peut mettre fin à cette protection. En diplomatie, proposez un tribut
          et une durée de trêve : la protection réciproque commence seulement après acceptation.
        </p>
      </ContextHelp>
      <ContextHelp title="Quels sont les raccourcis ?">
        <p>
          R : royaume · A : armées · V : villes · E : économie · D : diplomatie. Échap ferme la
          fenêtre. Les flèches déplacent la caméra ; la molette règle le zoom. Les panneaux latéraux
          peuvent être repliés et les conseils masqués.
        </p>
      </ContextHelp>
      <button
        className="primary full-width"
        onClick={() => {
          void saveSettings({ tutorialCompleted: true });
          useGame.setState({ panel: null });
          focusMap(w.player.capital);
        }}
      >
        Entrer dans les Marches <ArrowRight size={16} />
      </button>
    </>
  );
}
