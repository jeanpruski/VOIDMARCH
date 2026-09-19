import { Development } from './Development';
import { developmentReason, constructionDevelopmentStage } from '@voidmarch/config';
import { IdentityEditor, RealmPreview } from './RealmIdentity';
import type { RealmIdentity } from '@voidmarch/config';
import { navalConstructionReason } from '@voidmarch/game-rules';
import { eventAvailable } from './world-events';
import { Banner } from './Banner';
import { BiomeAdaptation } from './BiomeAdaptation';
import { BIOMES, BIOME_ADAPTATION_NAMES, UNIT_BIOME_ADAPTATIONS } from '@voidmarch/config';
import { ArmySupport } from './ArmySupport';
import { armyTraining } from '@voidmarch/game-rules';
import { allUnits } from '@voidmarch/game-rules';
import { SavedArmies } from './SavedArmies';
import { TrophyRoom } from './TrophyRoom';
import { OnlinePlayers } from './OnlinePlayers';
import { Missions } from './Missions';
import { TerrainAffinities } from './TerrainAffinities';
import { terrainCombatBonus } from '@voidmarch/game-rules';
import { recruitmentLevel, UNIT_TERRAIN_AFFINITIES } from '@voidmarch/config';
import { CatalogToolbar, CatalogDetails, useCatalogPage } from './CatalogBrowser';
import { UNIT_FAMILIES, unitUniverse } from '@voidmarch/config';
import { constructionSiteReason } from './construction';
import { DiplomacyHub } from './Strategy';
import { buildingEra, BUILDING_AGES, UNIT_ERAS } from '@voidmarch/config';
import { groupByKind, matchesCollectionSearch } from './collection-search';
import { buildingStage, compareBuildings, buildingsUnlockedBy } from './building-order';
import { unitStats, attackStats, attackCost, recruitmentRequirement } from '@voidmarch/game-rules';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { RoadAction } from './RoadAction';
import { NpcInfo } from './NpcInfo';
import { unitFrame } from './ui';
import { ContextHelp } from './Experience';
import {
  ArrowRight,
  Award,
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
  UNIT_TIERS,
  TIER_NAMES,
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
  resolveAttack,
  attackTrajectory,
  targetTerrainDefense,
  key,
  zeroWallet,
} from '@voidmarch/game-rules';
import type { AuthUser, Building, Proposal, Unit } from '@voidmarch/shared';
import { acceptSession, api, focusMap, notify, saveSettings, select, send, useGame } from './store';
import {
  BUILDING_FRAMES,
  Cost,
  StorageHint,
  Duration,
  format,
  Miniature,
  Modal,
  resourceIcons,
  symbols,
  UNIT_FRAMES,
} from './ui';

export function Panels() {
  const panel = useGame((s) => s.panel),
    world = useGame((s) => s.world),
    selectionId = useGame((s) => s.selection?.id),
    target = useGame((s) => s.combatTarget);
  if (!world) return null;
  if (target) return <Combat />;
  if (!panel) return null;
  const titles = {
    online: 'Joueurs connectés',
    missions: 'Missions',
    trophies: 'Salle des trophées',
    realm: 'Votre royaume',
    army: 'Les armées',
    cities: 'Villes & domaines',
    economy: 'Les richesses des Marches',
    trade: 'Commerce & diplomatie',
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
      className={['build', 'recruit'].includes(panel) ? 'catalog-modal' : undefined}
      toolbar={['build', 'recruit'].includes(panel) ? <CatalogResources /> : undefined}
      wide={['trophies', 'missions', 'trade', 'economy', 'build', 'recruit', 'rank'].includes(
        panel,
      )}
    >
      {panel === 'online' ? (
        <OnlinePlayers />
      ) : panel === 'trophies' ? (
        <TrophyRoom />
      ) : panel === 'missions' ? (
        <Missions />
      ) : panel === 'realm' ? (
        <RealmPanel />
      ) : panel === 'army' ? (
        <ArmyPanel />
      ) : panel === 'cities' ? (
        <CitiesPanel />
      ) : panel === 'economy' ? (
        <Economy />
      ) : panel === 'trade' ? (
        <DiplomacyHub>
          <Diplomacy />
        </DiplomacyHub>
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
        <Recruit key={selectionId} />
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
        <Banner settings={p.settings} size={85} />
        <div>
          <div className="eyebrow">{FACTIONS[p.faction].name}</div>
          <h3>{p.settings.realmName || p.name}</h3>
          <p>{FACTIONS[p.faction].description}</p>
        </div>
      </div>
      <Development />
      <div className="stat-grid realm-stat-grid">
        {[
          [Crown, 'Territoire', `${me.stats.territory} hexagones`],
          [Users, 'Population', format(p.population)],
          [Swords, 'Armée', `${allUnits(w.units).filter((u) => u.ownerId === p.id).length} unités`],
          [Compass, 'Exploration', `${p.progression.exploration} hexagones`],
          [Award, 'Trophées', format(w.missions?.trophies?.length ?? me.trophyCount ?? 0)],
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
  const [query, setQuery] = useState('');
  const units = allUnits(w.units).filter(
    (u) =>
      u.ownerId === w.player.id &&
      matchesCollectionSearch(
        query,
        UNITS[u.kind].name,
        u.nickname,
        u.kind === 'HERO' ? w.player.name : '',
        u.rareBonus ? 'rare' : '',
      ),
  );
  const groups = groupByKind(units).sort((a, b) => compareRecruits([a.kind, null], [b.kind, null]));
  return (
    <>
      <SavedArmies />
      <label className="collection-search">
        Rechercher une unité
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type, nom ou unité rare…"
        />
      </label>
      <p className="panel-intro">
        {units.length} unités · {groups.length} types. Dépliez une ligne pour retrouver chaque
        troupe sur la carte.
      </p>
      <div className="entity-groups">
        {groups.map(({ kind, items }) => (
          <details className="entity-group" key={kind} open={query.trim() ? true : undefined}>
            <summary>
              <Miniature
                frame={UNIT_FRAMES[kind]}
                heroAppearance={items[0].hero?.appearance}
                size={46}
              />
              <strong>{UNITS[kind].name}</strong>
              <span className="entity-count">× {items.length}</span>
            </summary>
            <div className="entity-list">
              {items.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    const target = w.units.find((x) => x.id === (u.carrierId ?? u.id)) ?? u;
                    select({ kind: 'unit', id: target.id, q: target.q, r: target.r });
                    focusMap(target);
                  }}
                >
                  <Miniature heroAppearance={u.hero?.appearance} frame={unitFrame(u)} size={58} />
                  <div>
                    <strong>
                      {u.nickname ?? (u.kind === 'HERO' ? w.player.name : UNITS[u.kind].name)}{' '}
                      {u.rareBonus && (
                        <span className="rare-tag">✦ Rare +{format(u.rareBonus)} %</span>
                      )}
                    </strong>
                    <span>
                      {format(u.hp)}/{format(unitStats(u).hp)} PV ·{' '}
                      {u.carrierId ? 'À bord · ' : 'Position '}
                      {u.q}, {u.r}
                    </span>
                  </div>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          </details>
        ))}
      </div>
      {!groups.length && (
        <p className="muted">
          {query
            ? 'Aucune unité ne correspond à votre recherche.'
            : 'Aucune unité dans votre royaume.'}
        </p>
      )}
    </>
  );
}
function CitiesPanel() {
  const w = useGame((s) => s.world)!;
  const [query, setQuery] = useState('');
  const buildings = w.tiles
    .flatMap((t) =>
      t.building?.ownerId === w.player.id && !isWall(t.building.kind) ? [t.building] : [],
    )
    .filter((b) =>
      matchesCollectionSearch(
        query,
        BUILDINGS[b.kind].name,
        b.name,
        b.kind === 'VILLAGE' ? CITY_LEVELS[b.level] : '',
        'niveau ' + b.level,
      ),
    );
  const groups = groupByKind(buildings).sort((a, b) => compareBuildings(a.kind, b.kind));
  return (
    <>
      <label className="collection-search">
        Rechercher un bâtiment
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type, nom ou niveau…"
        />
      </label>
      <p className="panel-intro">
        {buildings.length} bâtiments · {groups.length} types. Dépliez une ligne pour voir les
        niveaux et les positions.
      </p>
      <div className="entity-groups">
        {groups.map(({ kind, items }) => (
          <details className="entity-group" key={kind} open={query.trim() ? true : undefined}>
            <summary>
              <Miniature
                frame={kind === 'VILLAGE' ? Math.min(9, items[0].level + 6) : BUILDING_FRAMES[kind]}
                building={items[0]}
                size={46}
              />
              <strong>{BUILDINGS[kind].name}</strong>
              <span className="entity-count">× {items.length}</span>
            </summary>
            <div className="entity-list">
              {items
                .slice()
                .sort((a, b) => b.level - a.level || a.q - b.q || a.r - b.r)
                .map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      select({ kind: 'building', id: b.id, q: b.q, r: b.r });
                      focusMap(b);
                    }}
                  >
                    <Miniature
                      frame={
                        b.kind === 'VILLAGE' ? Math.min(9, b.level + 6) : BUILDING_FRAMES[b.kind]
                      }
                      building={b}
                      turretLevel={b.turretLevel}
                      size={58}
                    />
                    <div>
                      <strong>{b.name || BUILDINGS[b.kind].name}</strong>
                      <span>
                        Niveau {b.level} · {format(b.hp)} PV · Position {b.q}, {b.r}
                      </span>
                    </div>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
            </div>
          </details>
        ))}
      </div>
      {!groups.length && (
        <p className="muted">
          {query
            ? 'Aucun bâtiment ne correspond à votre recherche.'
            : 'Aucun domaine dans votre royaume.'}
        </p>
      )}
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
      {p.foodBalance && (
        <section className="inset food-balance" aria-label="Bilan des vivres">
          <h4>Où vont vos vivres ?</h4>
          {(p.foodShortageMinutes ?? 0) > 0 && (
            <p className="negative">
              Pénurie accumulée : {format(p.foodShortageMinutes ?? 0)} min de présence.
            </p>
          )}
          <p>
            Par minute de présence : production <strong>+{format(p.foodBalance.production)}</strong>{' '}
            · habitants <strong>−{format(p.foodBalance.civilians)}</strong> · troupes et équipages{' '}
            <strong>−{format(p.foodBalance.army)}</strong>.
          </p>
          <p>
            Les vivres servent aussi au recrutement, aux soins et aux provisions de campagne :
            sélectionnez une troupe puis ouvrez « Provisions ». Les passagers d’un transport gardent
            leur propre entretien ; il n’est compté qu’une fois.
          </p>
          {p.foodBalance.net < 0 && (
            <p className="negative">
              {p.wallet.FOOD > 0
                ? `Réserve estimée : ${format(p.wallet.FOOD / -p.foodBalance.net)} min de présence au rythme actuel, hors achats.`
                : 'Réserve épuisée : recrutez moins ou développez votre production.'}
            </p>
          )}
          <p className="muted">
            À court de vivres, vos troupes restent en vie et peuvent agir. Après 10 minutes de
            pénurie pendant votre présence : −10 % d’attaque ; après 30 minutes : −20 %. Avec des
            vivres, chaque minute de présence efface 2 minutes de pénurie. Après la déconnexion,
            production et entretien s’arrêtent selon les mêmes règles de présence.
          </p>
        </section>
      )}
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
                {format(p.income[r])} / min
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
            {allUnits(w.units).filter((u) => u.ownerId === p.id).length} unités mobilisent{' '}
            {armyPopulation(allUnits(w.units).filter((u) => u.ownerId === p.id))} habitants. La
            nourriture permet à vos villes de grandir.
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
            .filter(
              (t) =>
                t.building?.ownerId === p.id && amount(BUILDINGS[t.building.kind].production) > 0,
            )
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
                      <span className="muted">Terrain incompatible — production arrêtée</span>
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
          : 'Reliez vos marchés par une route, ou construisez deux ports sur la même mer avant d’accepter. Les ressources sont débitées ensemble, puis livrées par deux convois terrestres ou maritimes (15 secondes par case). Une cargaison interceptée est perdue ; une route coupée renvoie la cargaison à son expéditeur.'}
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
                  {r.realmName || r.name}
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
function Events() {
  const now = useGame((s) => s.now);
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
                    selectedUnitIds: [],
                    groupTarget: null,
                    multiSelect: false,
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
      {!w.events.some((e) => eventAvailable(e, Math.max(now, w.serverTimestamp))) && (
        <p className="empty-line">Aucune découverte disponible pour le moment.</p>
      )}
      {w.events
        .filter((e) => eventAvailable(e, Math.max(now, w.serverTimestamp)))
        .map((e) => (
          <article className={`event-card ${e.claimedBy ? 'claimed' : ''}`} key={e.id}>
            <Miniature
              frame={
                ['SHIPWRECK', 'SEA_OBELISK', 'DRIFTING_CARGO', 'SUB_WRECK'].includes(e.kind)
                  ? 4320 +
                    ['SHIPWRECK', 'SEA_OBELISK', 'DRIFTING_CARGO', 'SUB_WRECK'].indexOf(e.kind)
                  : e.kind === 'MONOLITH'
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
    [metric, setMetric] = useState<keyof (typeof w.realms)[number]['stats'] | 'trophies'>(
      'territory',
    );
  const labels = {
    territory: 'Territoire',
    military: 'Puissance militaire',
    wealth: 'Richesse',
    population: 'Population',
    development: 'Développement',
    exploration: 'Exploration',
    commerce: 'Commerce',
    relics: 'Reliques',
    trophies: 'Trophées',
  };
  const score = (realm: (typeof w.realms)[number]) =>
    metric === 'trophies' ? (realm.trophyCount ?? 0) : realm.stats[metric];
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
            .sort((a, b) => score(b) - score(a))
            .map((r, i) => (
              <tr key={r.id} className={r.id === w.player.id ? 'you' : ''}>
                <td>{String(i + 1).padStart(2, '0')}</td>
                <td>
                  {r.realmName || r.name}
                  {r.id === w.player.id && <span className="badge">VOUS</span>}
                  {r.bot && <span className="badge">BOT</span>}
                </td>
                <td>{FACTIONS[r.faction].short}</td>
                <td>{format(score(r))}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}
function Build() {
  const [query, setQuery] = useState('');
  const [readyOnly, setReadyOnly] = useState(false);
  const [terrainOnly, setTerrainOnly] = useState(false);
  const [sort, setSort] = useState('progression');
  const [hideOwned, setHideOwned] = useState(false);
  const [resource, setResource] = useState<Resource | 'ALL'>('ALL');
  const [category, setCategory] = useState<BuildingTab>('Tous');
  const w = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection),
    pending = useGame((s) => s.pending),
    tile = w.tiles.find((t) => selection && key(t) === key(selection));
  const ownedCounts: Partial<Record<BuildingKind, number>> = {};
  for (const { building } of w.tiles) {
    if (building?.ownerId !== w.player.id || building.id.startsWith('preview:')) continue;
    ownedCounts[building.kind] = (ownedCounts[building.kind] ?? 0) + 1;
  }
  const builder =
    tile &&
    w.units.find(
      (u) => u.ownerId === w.player.id && UNIT_PROFILES[u.kind].builder && distance(u, tile) <= 1,
    );
  const siteReason = constructionSiteReason(w, tile);
  const buildable = (
    Object.entries(BUILDINGS) as [BuildingKind, (typeof BUILDINGS)[BuildingKind]][]
  ).filter(([kind]) => isBuildable(kind));
  const terrainCompatible = (kind: BuildingKind) =>
    !!tile?.terrain &&
    BUILDINGS[kind].terrains.includes(tile.terrain) &&
    !navalConstructionReason(kind, tile, (p) => w.tiles.find((t) => key(t) === key(p)));
  const quotes = new Map(
    buildable.map(([kind, b]) => {
      const cost = Object.fromEntries(
        Object.entries(b.cost).map(([k, v]) => [
          k,
          Math.ceil(v * (w.player.faction === 'ASH' ? 0.9 : 1)),
        ]),
      );
      const missing = (BUILDING_REQUIREMENTS[kind] ?? []).find(
        (k) => !w.tiles.some((t) => t.building?.ownerId === w.player.id && t.building.kind === k),
      );
      const reason =
        developmentReason(
          w.tiles.flatMap((t) => (t.building?.ownerId === w.player.id ? [t.building] : [])),
          constructionDevelopmentStage(kind),
        ) ||
        siteReason ||
        (tile
          ? navalConstructionReason(kind, tile, (p) => w.tiles.find((t) => key(t) === key(p)))
          : '') ||
        (!tile?.terrain || !b.terrains.includes(tile.terrain)
          ? 'Terrain incompatible'
          : missing
            ? `${BUILDINGS[missing].name} nécessaire`
            : !w.player.unlimitedAP && w.player.ap < 1
              ? '1 PA nécessaire'
              : !canAfford(w.player.wallet, cost)
                ? 'Ressources insuffisantes'
                : '');

      return [kind, { cost, reason }] as const;
    }),
  );
  const reset = () => {
    setQuery('');
    setReadyOnly(false);
    setTerrainOnly(false);
    setHideOwned(false);
    setResource('ALL');
    setCategory('Tous');
    setSort('progression');
  };
  const matching = buildable
    .filter(([kind]) => !hideOwned || !ownedCounts[kind])
    .filter(([kind]) => category === 'Tous' || BUILDING_CATEGORY[kind] === category)
    .filter(([, b]) => resource === 'ALL' || ((b.production as Partial<Wallet>)[resource] ?? 0) > 0)
    .filter(([kind, b]) =>
      matchesCollectionSearch(
        query,
        b.name,
        BUILDING_ROLES[kind],
        ...RESOURCES.filter((r) => ((b.production as Partial<Wallet>)[r] ?? 0) > 0).map(
          (r) => RESOURCE_NAMES[r],
        ),
      ),
    )
    .filter(([kind]) => !terrainOnly || terrainCompatible(kind))
    .sort(
      ([a], [b]) =>
        Number(b === 'WOOD_WALL') - Number(a === 'WOOD_WALL') ||
        Number(terrainCompatible(b)) - Number(terrainCompatible(a)) ||
        (sort === 'cost'
          ? Object.values(quotes.get(a)!.cost).reduce((x, y) => x + y, 0) -
            Object.values(quotes.get(b)!.cost).reduce((x, y) => x + y, 0)
          : sort === 'name'
            ? BUILDINGS[a].name.localeCompare(BUILDINGS[b].name, 'fr')
            : compareBuildings(a, b, tile?.terrain)),
    );
  const available = matching.filter(([kind]) => !quotes.get(kind)!.reason);
  const catalogue = readyOnly ? available : matching;
  const pagination = useCatalogPage(
    catalogue,
    JSON.stringify([
      query,
      hideOwned,
      resource,
      category,
      readyOnly,
      terrainOnly,
      sort,
      tile?.q,
      tile?.r,
    ]),
  );
  return (
    <>
      <p className="catalog-context">
        {tile?.terrain
          ? `${TERRAINS[tile.terrain].name} · ${tile.q}, ${tile.r}`
          : 'Sélectionnez un terrain'}{' '}
        · Construction : 1 PA
      </p>
      <CatalogToolbar
        query={query}
        onQuery={setQuery}
        available={available.length}
        total={buildable.length}
        count={catalogue.length}
        readyOnly={readyOnly}
        onReadyOnly={setReadyOnly}
        onReset={reset}
        pagination={pagination}
      >
        <label>
          Type
          <select
            aria-label="Type"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as BuildingTab);
              setResource('ALL');
            }}
          >
            {BUILDING_TABS.map((tab) => (
              <option key={tab}>{tab}</option>
            ))}
          </select>
        </label>
        <label>
          Production
          <select
            aria-label="Production"
            value={resource}
            onChange={(e) => {
              setResource(e.target.value as Resource | 'ALL');
              setCategory('Tous');
            }}
          >
            <option value="ALL">Toutes les ressources</option>
            {RESOURCES.map((r) => (
              <option key={r} value={r}>
                {RESOURCE_NAMES[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trier par
          <select aria-label="Trier par" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="progression">Progression</option>
            <option value="cost">Coût total croissant</option>
            <option value="name">Nom</option>
          </select>
        </label>
        <label className="catalog-check">
          <input
            type="checkbox"
            checked={terrainOnly}
            onChange={(e) => setTerrainOnly(e.target.checked)}
          />{' '}
          Terrain compatible
        </label>
        <label className="catalog-check">
          <input
            type="checkbox"
            checked={hideOwned}
            onChange={(e) => setHideOwned(e.target.checked)}
          />{' '}
          Masquer les bâtiments déjà construits
        </label>
      </CatalogToolbar>
      {tile?.terrain === 'SCORCHED' && (
        <p className="form-error">
          Terres brûlées : aucune ressource ni construction, routes comprises. Un terrassier à une
          case maximum peut restaurer une plaine pour 2 PA + 20 bois + 10 fer. La capitale peut être
          restaurée sans la démolir.
        </p>
      )}
      {siteReason && tile?.terrain !== 'SCORCHED' && <p className="form-error">{siteReason}</p>}
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
      {!catalogue.length && (
        <p className="empty-line">
          {hideOwned
            ? 'Aucun nouveau type ne correspond. Affichez aussi les bâtiments déjà construits ou modifiez vos filtres.'
            : 'Aucun bâtiment ne correspond. Essayez une autre ressource ou effacez la recherche.'}
        </p>
      )}
      <div className="catalog catalog-compact">
        {pagination.items.map(([kind, b]) => {
          const { cost, reason } = quotes.get(kind)!;
          const compatible = terrainCompatible(kind);
          const production = productionOnTerrain(
            kind,
            compatible ? tile!.terrain! : (b.terrains[0] as Terrain),
          );
          return (
            <article key={kind} className={reason ? 'catalog-locked' : 'catalog-ready'}>
              <span className={`catalog-status${reason ? ' recruitment-missing' : ''}`}>
                {reason
                  ? tile?.terrain && b.terrains.includes(tile.terrain)
                    ? 'Terrain adapté · conditions à remplir'
                    : 'Terrain incompatible'
                  : 'Prêt à construire'}
              </span>
              <Miniature frame={BUILDING_FRAMES[kind]} size={80} />
              <h4>{b.name}</h4>
              <small>
                {kind === 'CAMP' || kind === 'OUTPOST'
                  ? 'Fondation du village'
                  : `5 niveaux · ${buildingEra(kind, 1)} → ${buildingEra(kind, 5)}`}
              </small>
              <span className="building-owned-count">
                Dans votre royaume : <strong>{ownedCounts[kind] ?? 0}</strong>
              </span>
              <span className="building-stage">
                {buildingStage(kind) === 0
                  ? 'Étape 1 · Bâtiment de base'
                  : `Étape ${buildingStage(kind) + 1} · Développement`}
              </span>
              {BUILDING_ROLES[kind] && <p className="catalog-brief">{BUILDING_ROLES[kind]}</p>}
              <p className={resource !== 'ALL' ? 'production-summary' : undefined}>
                Production{!compatible ? ' sur terrain adapté' : ''} / min :{' '}
                {RESOURCES.filter((r) => (production[r] ?? 0) > 0).map((r, index) => (
                  <span key={r}>
                    {index > 0 && ' · '}
                    <strong className={resource === r ? 'production-match' : undefined}>
                      +{format(production[r] ?? 0)} {RESOURCE_NAMES[r].toLowerCase()}
                    </strong>
                  </span>
                ))}
                {!RESOURCES.some((r) => (production[r] ?? 0) > 0) && 'aucune ressource directe'}.
              </p>
              <Cost cost={cost} wallet={w.player.wallet} />
              <StorageHint cost={cost} wallet={w.player.wallet} capacity={w.player.capacity} />
              {reason && <p className="catalog-unavailable recruitment-missing">{reason}</p>}

              <CatalogDetails>
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
                              setReadyOnly(false);
                              setTerrainOnly(false);
                              setResource('ALL');
                              setQuery(BUILDINGS[required].name);
                              setHideOwned(false);
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
                <p>{BUILDING_ROLES[kind]}</p>
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
              </CatalogDetails>
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
        <p>
          Une route sous un rempart le transforme visuellement en porte, selon son matériau. Elle
          conserve sa résistance, bloque toujours les ennemis et peut recevoir une tourelle. Retirer
          la route rétablit l’apparence du mur.
        </p>
        <RoadAction tile={tile} />
      </div>
    </>
  );
}
function Recruit() {
  const [family, setFamily] = useState<'all' | keyof typeof UNIT_FAMILIES>('all');
  const [query, setQuery] = useState('');
  const [readyOnly, setReadyOnly] = useState(false);
  const [level, setLevel] = useState('all');
  const [sort, setSort] = useState('progression');
  const [category, setCategory] = useState<UnitTab>('Toutes');
  const [atomicOnly, setAtomicOnly] = useState(false);
  const w = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection),
    pending = useGame((s) => s.pending);
  const building = w.tiles.find((t) => t.building?.id === selection?.id)?.building;
  const recruits = (Object.entries(UNITS) as [UnitKind, (typeof UNITS)[UnitKind]][]).filter(
    ([kind]) =>
      kind !== 'HERO' &&
      building?.ownerId === w.player.id &&
      UNIT_PROFILES[kind].recruitAt.includes(building.kind),
  );
  const tabs = UNIT_TABS.filter(
    (tab) => tab === 'Toutes' || recruits.some(([kind]) => UNIT_CATEGORY[kind] === tab),
  );
  const atomicCount = recruits.filter(([kind]) => UNIT_PROFILES[kind].radioactive).length;
  const ownUnits = allUnits(w.units).filter((u) => u.ownerId === w.player.id);
  const ownedBuildings = w.tiles.flatMap((t) =>
    t.building?.ownerId === w.player.id && t.building.hp > 0 ? [t.building] : [],
  );
  const ownedInfrastructure = new Set(ownedBuildings.map((b) => b.kind));
  const capacity = Math.max(15, w.player.population);
  const mobilized = armyPopulation(ownUnits);
  const recruitReason = (kind: UnitKind) => {
    const free = kind === 'PEASANT' && !ownUnits.some((u) => u.kind === 'PEASANT');
    if (!building || building.ownerId !== w.player.id) return 'Sélectionnez votre bâtiment';
    const requirement = recruitmentRequirement(kind, building, ownedBuildings);
    if (requirement) return requirement;
    if (!free && mobilized + unitPopulation(kind) > capacity) return 'Population insuffisante';
    if (!free && !canAfford(w.player.wallet, UNITS[kind].cost)) return 'Ressources insuffisantes';
    if (!w.player.unlimitedAP && w.player.ap < 1) return '1 PA nécessaire';
    return '';
  };
  const reasons = new Map(recruits.map(([kind]) => [kind, recruitReason(kind)]));
  const trainingByKind = new Map(
    recruits.map(([kind]) => [kind, armyTraining(kind, ownedBuildings)]),
  );
  const reset = () => {
    setQuery('');
    setFamily('all');
    setCategory('Toutes');
    setAtomicOnly(false);
    setReadyOnly(false);
    setLevel('all');
    setSort('progression');
  };
  const matching = recruits
    .sort(
      (a, b) =>
        Number(!!reasons.get(a[0])) - Number(!!reasons.get(b[0])) ||
        Number(!canAfford(w.player.wallet, UNITS[a[0]].cost)) -
          Number(!canAfford(w.player.wallet, UNITS[b[0]].cost)) ||
        (sort === 'cost'
          ? Object.values(a[1].cost).reduce((x, y) => x + y, 0) -
            Object.values(b[1].cost).reduce((x, y) => x + y, 0)
          : sort === 'attack'
            ? unitStats({ kind: b[0], ...trainingByKind.get(b[0]) }).attack -
              unitStats({ kind: a[0], ...trainingByKind.get(a[0]) }).attack
            : (building
                ? recruitmentLevel(a[0], building.kind) - recruitmentLevel(b[0], building.kind)
                : 0) || compareRecruits(a, b)),
    )
    .filter(([kind]) => category === 'Toutes' || UNIT_CATEGORY[kind] === category)
    .filter(([kind]) => !atomicOnly || UNIT_PROFILES[kind].radioactive)
    .filter(([kind]) => family === 'all' || unitUniverse(kind)?.family === family)
    .filter(
      ([kind]) =>
        level === 'all' ||
        recruitmentLevel(kind, building?.kind ?? UNIT_PROFILES[kind].recruitAt[0]) ===
          Number(level),
    )
    .filter(([kind, u]) =>
      matchesCollectionSearch(
        query,
        u.name,
        UNIT_PROFILES[kind].role,
        unitUniverse(kind) ? UNIT_FAMILIES[unitUniverse(kind)!.family] : '',
        UNIT_CATEGORY[kind],
        UNIT_BIOME_ADAPTATIONS[kind] ? BIOMES[UNIT_BIOME_ADAPTATIONS[kind]!].name : '',
        UNIT_BIOME_ADAPTATIONS[kind] ? BIOME_ADAPTATION_NAMES[UNIT_BIOME_ADAPTATIONS[kind]!] : '',
        ...UNIT_TERRAIN_AFFINITIES[kind].map((a) => TERRAINS[a.terrain].name),
      ),
    );
  const available = matching.filter(([kind]) => !reasons.get(kind));
  const catalogue = readyOnly ? available : matching;
  const pagination = useCatalogPage(
    catalogue,
    JSON.stringify([query, category, atomicOnly, family, readyOnly, level, sort, building?.id]),
  );
  return (
    <>
      <p className="catalog-context">
        {building
          ? `${BUILDINGS[building.kind].name} · niveau ${building.level}`
          : 'Sélectionnez un bâtiment'}{' '}
        · Mobilisation : {format(mobilized)}/{format(capacity)}
      </p>
      <p className="catalog-context">
        Les filières militaires débloquent de nouvelles recrues à chaque niveau. Les niveaux
        précédents restent disponibles ; les infrastructures requises restent nécessaires.
      </p>
      <CatalogToolbar
        query={query}
        onQuery={setQuery}
        available={available.length}
        total={recruits.length}
        count={catalogue.length}
        readyOnly={readyOnly}
        onReadyOnly={setReadyOnly}
        onReset={reset}
        pagination={pagination}
      >
        <label>
          Type
          <select
            aria-label="Type"
            value={category}
            onChange={(e) => setCategory(e.target.value as UnitTab)}
          >
            {tabs.map((tab) => (
              <option key={tab}>{tab}</option>
            ))}
          </select>
        </label>
        <label>
          Univers
          <select
            aria-label="Univers"
            value={family}
            onChange={(e) => {
              setFamily(e.target.value as typeof family);
              setCategory('Toutes');
              setAtomicOnly(false);
            }}
          >
            <option value="all">Tous les univers</option>
            {(Object.keys(UNIT_FAMILIES) as (keyof typeof UNIT_FAMILIES)[])
              .filter((f) => recruits.some(([kind]) => unitUniverse(kind)?.family === f))
              .map((f) => (
                <option value={f} key={f}>
                  {UNIT_FAMILIES[f]}
                </option>
              ))}
          </select>
        </label>
        <label>
          Niveau requis
          <select
            aria-label="Niveau requis"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="all">Tous les niveaux</option>
            {[1, 2, 3, 4, 5].map((l) => (
              <option key={l} value={l}>
                Niveau {l} ·{' '}
                {
                  recruits.filter(
                    ([kind]) =>
                      recruitmentLevel(kind, building?.kind ?? UNIT_PROFILES[kind].recruitAt[0]) ===
                      l,
                  ).length
                }{' '}
                unités
              </option>
            ))}
          </select>
        </label>
        <label>
          Trier par
          <select aria-label="Trier par" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="progression">Progression</option>
            <option value="cost">Coût total croissant</option>
            <option value="attack">Attaque décroissante</option>
          </select>
        </label>
        {atomicCount > 0 && (
          <label className="catalog-check">
            <input
              type="checkbox"
              checked={atomicOnly}
              onChange={(e) => {
                setAtomicOnly(e.target.checked);
                setFamily('all');
              }}
            />{' '}
            Division atomique
          </label>
        )}
      </CatalogToolbar>
      <ContextHelp title="Comment choisir et former une unité ?">
        <p>
          Seules les unités formées dans ce bâtiment sont affichées. Le paysan est gratuit en
          ressources si vous n’en possédez plus. Chaque recrutement coûte 1 PA. Une recrue a 1 % de
          chance d’être rare, avec +10 à +30 % de PV, attaque et défense.
        </p>
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
      {!catalogue.length && (
        <p className="empty-line">Aucune unité ne correspond à ces filtres dans ce bâtiment.</p>
      )}
      <div className="catalog catalog-compact">
        {pagination.items.map(([kind, u]) => {
          const profile = UNIT_PROFILES[kind],
            free = kind === 'PEASANT' && !ownUnits.some((x) => x.kind === 'PEASANT');
          const cost = free ? { STONE: 0, GOLD: 0, WOOD: 0, IRON: 0, FOOD: 0 } : u.cost;
          const reason = reasons.get(kind)!;
          const training = trainingByKind.get(kind)!;
          const trainedStats = unitStats({ kind, ...training });
          return (
            <article key={kind} className={reason ? 'catalog-locked' : 'catalog-ready'}>
              <span className={`catalog-status${reason ? ' recruitment-missing' : ''}`}>
                {reason ? 'Conditions à remplir' : 'Prêt à recruter'}
              </span>
              <Miniature frame={UNIT_FRAMES[kind]} size={90} />
              <h4>{u.name}</h4>
              <span className="building-stage">
                {kind in UNIT_ERAS
                  ? `${BUILDING_AGES[UNIT_ERAS[kind as keyof typeof UNIT_ERAS] - 1]}`
                  : `${UNIT_TIERS[kind] ? `Palier ${UNIT_TIERS[kind]} · ` : ''}${TIER_NAMES[UNIT_TIERS[kind]]}`}
              </span>
              {unitUniverse(kind) && (
                <span className="elite-family-badge" data-family={unitUniverse(kind)!.family}>
                  {UNIT_FAMILIES[unitUniverse(kind)!.family]}
                </span>
              )}
              {profile.radioactive && <span className="atomic-badge">☢ Division atomique</span>}
              {building && (
                <span
                  className={
                    building.level < recruitmentLevel(kind, building.kind)
                      ? 'recruitment-missing'
                      : 'building-stage'
                  }
                >
                  {building.level === recruitmentLevel(kind, building.kind)
                    ? 'Nouveauté de ce niveau'
                    : `Débloqué au niveau ${recruitmentLevel(kind, building.kind)}`}
                </span>
              )}
              <p className="catalog-brief">{profile.role}</p>
              <p className="catalog-combat-stats">
                {format(trainedStats.hp)} PV · ATQ {format(trainedStats.attack)} · DÉF{' '}
                {format(trainedStats.defense)}
                <br />
                MOUV {trainedStats.move} · VISION {trainedStats.vision} · PORTÉE {u.range}
                <br />
                {unitPopulation(kind)} places
                {trainedStats.attack > 0 && ` · Attaque : ${profile.siege ? 2 : 1} PA`}
              </p>
              <TerrainAffinities kind={kind} supportBonus={training.supportBonus} />
              <BiomeAdaptation kind={kind} />
              <Cost cost={cost} wallet={w.player.wallet} />
              <StorageHint cost={cost} wallet={w.player.wallet} capacity={w.player.capacity} />
              {reason && <p className="catalog-unavailable recruitment-missing">{reason}</p>}
              {free && <p>Gratuit en ressources</p>}
              {profile.requires.some((k) => !ownedInfrastructure.has(k)) && (
                <p className="recruitment-missing catalog-required">
                  {profile.requires
                    .filter((k) => !ownedInfrastructure.has(k))
                    .map((k) => `${BUILDINGS[k].name} (manquant)`)
                    .join(' · ')}
                </p>
              )}

              <CatalogDetails>
                <p>{profile.role}</p>{' '}
                {trainedStats.attack > 0 && (
                  <p>Attaque contre les bâtiments : {format(trainedStats.buildingAttack)}.</p>
                )}
                {building && !profile.builder && (
                  <p>
                    Entraînement de votre royaume : +{format(training.trainingBonus)} % aux PV,
                    attaque et défense.
                  </p>
                )}
                <ArmySupport bonus={training.supportBonus} />
                <p>
                  {unitPopulation(kind)} places · Entretien / min :{' '}
                  {RESOURCES.filter((resource) => unitUpkeep(kind)[resource] > 0)
                    .map(
                      (resource) =>
                        `${format(unitUpkeep(kind)[resource])} ${RESOURCE_NAMES[resource].toLowerCase()}`,
                    )
                    .join(' · ')}
                </p>
                <p>
                  Formation :{' '}
                  {profile.recruitAt.map((k, index) => (
                    <span key={k}>
                      {index > 0 && ', '}
                      <span
                        className={
                          building?.kind === k && building.level < recruitmentLevel(kind, k)
                            ? 'recruitment-missing'
                            : undefined
                        }
                      >
                        {BUILDINGS[k].name} · niveau {recruitmentLevel(kind, k)}
                      </span>
                    </span>
                  ))}
                  .
                </p>
                {profile.requires.length > 0 && (
                  <p>
                    Infrastructures :{' '}
                    {profile.requires.map((k, index) => (
                      <span key={k}>
                        {index > 0 && ', '}
                        <span
                          className={
                            !ownedInfrastructure.has(k) ? 'recruitment-missing' : undefined
                          }
                        >
                          {BUILDINGS[k].name}
                          {!ownedInfrastructure.has(k) && ' (manquant)'}
                        </span>
                      </span>
                    ))}
                    .
                  </p>
                )}
                <p
                  className={
                    !free && mobilized + unitPopulation(kind) > capacity
                      ? 'recruitment-missing'
                      : undefined
                  }
                >
                  Mobilisation : {mobilized}/{capacity} places occupées, +{unitPopulation(kind)}{' '}
                  pour cette unité.
                </p>
              </CatalogDetails>

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
  const confirmAttack = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (
        event.key !== ' ' ||
        event.defaultPrevented ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const button = confirmAttack.current;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!button || !target || !button.closest('[role="dialog"]')?.contains(target)) return;
      if (target.isContentEditable || target.closest('input, textarea, select, a, summary')) return;
      if (target.closest('button') && target.closest('button') !== button) return;
      event.preventDefault();
      if (!event.repeat && !button.disabled && button.checkVisibility()) button.click();
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);
  const w = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection),
    targetId = useGame((s) => s.combatTarget),
    pending = useGame((s) => s.pending),
    now = useGame((s) => s.now);
  const attacker =
      w.units.find((u) => u.id === selection?.id) ??
      w.tiles.find((t) => t.building?.id === selection?.id)?.building,
    intended: Unit | Building | undefined =
      w.units.find((u) => u.id === targetId) ??
      w.tiles.find((t) => t.building?.id === targetId)?.building;
  const attackerTile = attacker ? w.tiles.find((t) => key(t) === key(attacker)) : undefined;
  const intendedTile = intended ? w.tiles.find((t) => key(t) === key(intended)) : undefined;
  if (!attacker || !intended || !intendedTile?.terrain || !attackerTile?.terrain)
    return (
      <Modal title="Cible indisponible">
        <p>Cette cible n’est plus visible. Revenez à la carte pour choisir votre prochain ordre.</p>
      </Modal>
    );
  const walls = w.tiles.flatMap((t) => (t.building ? [t.building] : []));
  const resolution = resolveAttack(attacker, intended, walls, (p) =>
    w.tiles.find((t) => key(t) === key(p)),
  );
  const target = resolution.target;
  const tile = w.tiles.find((t) => key(t) === key(target)) ?? intendedTile;
  const terrain = tile.terrain ?? 'PLAIN';
  const opponents = w.realms.filter((r) => r.id === intended.ownerId || r.id === target.ownerId);
  const estimate = estimateDamage(
      attacker,
      target,
      {
        q: tile.q,
        r: tile.r,
        terrain,
      },
      w.units,
      attackerTile.terrain,
    ),
    enemy = w.realms.find((r) => r.id === target.ownerId),
    truce = w.treaties.some(
      (t) =>
        t.kind === 'TRUCE' &&
        t.endsAt > now &&
        [intended.ownerId, target.ownerId].some((id) => t.a === id || t.b === id),
    ),
    ap = attackCost(attacker),
    reason =
      (intended.ownerId.startsWith('mission:') &&
      ![w.missions?.active, ...(w.missions?.allied ?? [])].some(
        (m) => m?.ownerId === intended.ownerId,
      )
        ? 'Forteresse réservée à un autre royaume et à ses alliés.'
        : undefined) ||
      resolution.reason ||
      (w.strategy?.alliance?.members.some((id) => opponents.some((r) => r.id === id))
        ? 'Votre alliance interdit cette attaque.'
        : undefined) ||
      (truce
        ? 'Une trêve interdit cette attaque.'
        : opponents.some((r) => r.protectedUntil > now)
          ? 'Ce royaume bénéficie de la protection initiale.'
          : distance(attacker, intended) > attackStats(attacker).range
            ? 'Cette cible est hors de portée.'
            : !w.player.unlimitedAP && w.player.ap < ap
              ? `${ap} PA nécessaires.`
              : '');
  return (
    <Modal title="Donner l’ordre d’attaquer" eyebrow="CONSEIL DE GUERRE">
      <div className="combat-versus">
        <div>
          <Miniature
            heroAppearance={'population' in attacker ? undefined : attacker.hero?.appearance}
            frame={'population' in attacker ? BUILDING_FRAMES[attacker.kind] : unitFrame(attacker)}
            building={'population' in attacker ? attacker : undefined}
            size={115}
            turretLevel={'population' in attacker ? attacker.turretLevel : undefined}
            gate={'population' in attacker && !!w.tiles.find((t) => key(t) === key(attacker))?.road}
          />
          <strong>{attackStats(attacker).name}</strong>
          <span>{format(attacker.hp)} PV</span>
        </div>
        <Swords size={30} />
        <div>
          <Miniature
            heroAppearance={'population' in target ? undefined : target.hero?.appearance}
            frame={'population' in target ? BUILDING_FRAMES[target.kind] : unitFrame(target)}
            building={'population' in target ? target : undefined}
            turretLevel={'population' in target ? target.turretLevel : undefined}
            gate={'population' in target && !!w.tiles.find((t) => key(t) === key(target))?.road}
            size={115}
          />
          <strong>
            {'population' in target ? BUILDINGS[target.kind].name : unitStats(target).name}
          </strong>
          <span>
            {format(target.hp)} PV ·{' '}
            {'npc' in target && target.npc
              ? 'PNJ neutre'
              : target.ownerId.startsWith('mission:')
                ? 'Garnison de mission'
                : enemy?.name}
          </span>
        </div>
      </div>
      {resolution.intercepted && (
        <p className="warning">
          Rempart sur la trajectoire : le mur recevra les dégâts. La cible derrière reste protégée,
          même si ce tir détruit le mur.
        </p>
      )}
      <p className="panel-intro">
        {
          {
            direct: 'Tir direct : le premier rempart sur la trajectoire intercepte l’attaque.',
            melee: 'Corps à corps : il faut détruire le rempart pour atteindre une unité protégée.',
            indirect: 'Tir en cloche : cette arme peut atteindre une cible derrière les remparts.',
            air: 'Attaque aérienne : cette unité frappe par-dessus les remparts.',
            elevated: 'Tir depuis une tourelle : sa hauteur permet de franchir les remparts.',
          }[attackTrajectory(attacker)]
        }
      </p>
      <div className="combat-terrain-bonuses">
        <p>
          Attaquant · {TERRAINS[attackerTile.terrain].name} :{' '}
          <strong>
            ATQ +
            {format(
              'population' in attacker
                ? 0
                : terrainCombatBonus(attacker, attackerTile.terrain).attack,
            )}{' '}
            %
          </strong>
        </p>
        <p>
          Défenseur · {TERRAINS[terrain].name} :{' '}
          <strong>
            DÉF +{format('population' in target ? 0 : terrainCombatBonus(target, terrain).defense)}{' '}
            %
          </strong>
        </p>
        <small>
          Affinités incluses dans les dégâts estimés. Le bonus offensif vient de la case de départ ;
          le bonus défensif de la case de la cible réelle.
        </small>
      </div>
      <div className="damage-estimate">
        <span>DÉGÂTS ESTIMÉS</span>
        <strong>
          {format(estimate.min)}–{format(estimate.max)}
        </strong>
        <small>
          {TERRAINS[terrain].name} · Défense du terrain : +{targetTerrainDefense(target, terrain)}
          {!('population' in target) && UNIT_PROFILES[target.kind].flying
            ? ' (cible aérienne)'
            : ''}
        </small>
      </div>
      {'npc' in target && target.npc && (
        <>
          <NpcInfo unit={target as Unit} />
          <p className="warning">
            {(() => {
              const reply = resolveAttack(target, attacker, walls);
              if (distance(target, attacker) > unitStats(target as Unit).range || reply.reason)
                return 'Ce PNJ ne peut pas riposter contre votre attaquant.';
              const recipient = reply.target;
              const ground = w.tiles.find((t) => key(t) === key(recipient))?.terrain ?? 'PLAIN';
              const retaliation = estimateDamage(
                target,
                recipient,
                {
                  q: recipient.q,
                  r: recipient.r,
                  terrain: ground,
                },
                w.units,
                terrain,
              );
              return `S’il survit : riposte estimée de ${format(retaliation.min)} à ${format(retaliation.max)} dégâts${reply.intercepted ? ' sur le rempart qui vous protège' : ''}.`;
            })()}
          </p>
        </>
      )}
      {target.ownerId.startsWith('mission:') && (
        <p className="warning">
          Un défenseur à portée peut riposter à chaque attaque, y compris contre un bâtiment.
          Détruire l’objectif met fin au combat et rallie les survivants.
        </p>
      )}
      {isWall(target.kind) && (
        <p>
          Ouvrir une brèche : détruisez ce tronçon pour rendre sa case franchissable. Les engins de
          siège utilisent leurs dégâts contre les bâtiments.
        </p>
      )}
      {w.player.protectedUntil > now &&
        !target.ownerId.startsWith('mission:') &&
        !('npc' in target && target.npc) && (
          <p className="warning">Donner cet ordre mettra fin à votre protection initiale.</p>
        )}
      {reason && <p className="form-error">{reason}</p>}
      <button
        ref={confirmAttack}
        aria-keyshortcuts="Space"
        title="Raccourci : Espace"
        className="primary danger full-width"
        disabled={pending || !!reason}
        onClick={() =>
          void send({ type: 'ATTACK', actorId: attacker.id, payload: { targetId: intended.id } })
        }
      >
        <Swords size={16} /> Confirmer l’attaque · {ap} PA
        <kbd className="action-key" aria-hidden="true">
          Espace
        </kbd>
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
    [error, setError] = useState('');
  const [banner, setBanner] = useState<RealmIdentity>(() => ({
    realmName: w.player.settings.realmName || '',
    emblem: w.player.settings.emblem,
    bannerColor: w.player.settings.bannerColor,
    bannerSecondary: w.player.settings.bannerSecondary,
    bannerAccent: w.player.settings.bannerAccent ?? '#d6c9a5',
    bannerPattern: w.player.settings.bannerPattern ?? 'plain',
    bannerShape: w.player.settings.bannerShape,
    miniFlagShape: w.player.settings.miniFlagShape ?? 'same',
  }));
  const [savingIdentity, setSavingIdentity] = useState(false);
  async function saveIdentity(e: FormEvent) {
    e.preventDefault();
    setSavingIdentity(true);
    try {
      await saveSettings(banner);
    } finally {
      setSavingIdentity(false);
    }
  }
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
        <Banner settings={banner} size={85} />
        <div>
          <div className="eyebrow">{user.guest ? 'SOUVERAIN INVITÉ' : 'COMPTE ENREGISTRÉ'}</div>
          <h3>{user.username}</h3>
          <p>{FACTIONS[w.player.faction].name}</p>
        </div>
      </div>
      <RealmPreview
        value={banner}
        appearance={w.player.hero?.appearance}
        username={user.username}
      />
      <form onSubmit={saveIdentity}>
        <IdentityEditor value={banner} onChange={setBanner} />
        <button className="secondary" disabled={savingIdentity}>
          Enregistrer la bannière
        </button>
      </form>
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
            <strong>Vos points d’action</strong>
            <p>
              Vous commencez avec {RULES.startingAP} PA. Le bonus au-dessus de {RULES.maxAP} se
              dépense sans se régénérer ; ensuite vous gagnez 1 PA toutes les{' '}
              {RULES.apInterval / 1000} secondes, jusqu’à {RULES.maxAP}. Le commerce et les
              négociations n’en consomment pas. Glissez la carte, utilisez la molette ou les boutons
              de zoom.
            </p>
          </div>
        </li>
      </ol>
      <ContextHelp title="Que signifie le niveau à gauche des drapeaux ?">
        <p>
          Le chiffre indique le niveau du bâtiment. La flèche ↑ indique qu’une évolution existe ;
          sélectionnez le bâtiment pour consulter son coût et ses prérequis. La coche dorée ✓
          indique que son niveau maximal est atteint.
        </p>
        <p>
          Pour les remparts : 1 = bois, 2 = pierre, 3 = acier. Les tourelles s’améliorent
          séparément. Les indicateurs disparaissent avec les bâtiments masqués et dans la vue
          stratégique au dézoom maximal.
        </p>
      </ContextHelp>
      <ContextHelp title="Comment les remparts protègent-ils mes troupes ?">
        <p>
          Un fusil, une mitrailleuse, une arbalète, un bazooka ou un canon à tir tendu touche le
          premier mur sur sa trajectoire. Le mur reçoit les dégâts, même lors d’une riposte de PNJ.
          Un tir qui détruit le mur ne blesse pas l’unité derrière : il faut tirer de nouveau.
        </p>
        <p>
          Archers, rôdeurs, catapultes, mortiers et sapeurs atomiques tirent en cloche. Ils passent
          au-dessus, comme les unités aériennes et les tourelles. Vos propres remparts bloquent
          aussi vos tirs directs, sans vous coûter de PA : utilisez ces armes ou ouvrez un passage.
          Vérifiez toujours l’aperçu avant de confirmer une attaque.
        </p>
      </ContextHelp>
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
          Les lettres sur les boutons déclenchent les actions de votre sélection. D : déplacer ; C :
          construire ; A : attaquer une cible ou améliorer le bâtiment sélectionné ; R : recruter
          dans un bâtiment. Sur un bâtiment, D ouvre la confirmation de démolition. Récoltes : B
          pour bois, P pour pierre, F pour fer, V pour vivres, O pour or. Les autres touches sont
          indiquées sur les actions disponibles. Échap ferme la fenêtre ou annule le mode en cours.
        </p>
        <p>
          Les raccourcis sont inactifs pendant la saisie, dans les fenêtres et pendant une action en
          attente. Les flèches déplacent la caméra ; la molette règle le zoom.
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
