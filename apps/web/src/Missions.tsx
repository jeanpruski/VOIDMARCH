import { MissionProgression, ExceptionalMissionBadge } from './MissionProgression';
import { useState, useEffect } from 'react';
import { Expeditions } from './Expeditions';
import { Flag, MapPin, Shield, Swords, Clock3 } from 'lucide-react';
import { BUILDINGS, UNITS, UNIT_PROFILES, UNIT_CATEGORY, formatNumber } from '@voidmarch/config';
import { canAfford, missionReward, missionWallCount, distance } from '@voidmarch/game-rules';
import type { MissionOffer } from '@voidmarch/shared';
import { focusMap, send, useGame } from './store';
import { Cost, Duration } from './ui';
import { missionDifficulty } from './mission-guidance';
import type { Hex, WorldView } from '@voidmarch/shared';

function OfferDetails({ offer }: { offer: MissionOffer }) {
  const roster = [...new Set(offer.units)];
  return (
    <>
      {offer.maritime && (
        <p className="catalog-brief">
          Expédition maritime : une rade ou une forteresse insulaire à atteindre avec des navires.
          Détruisez le port maître ; les navires et la batterie survivants vous rejoignent. Prévoyez
          un sonar dès l’ère industrielle. La côte choisie peut être très éloignée : construisez un
          port et préparez votre flotte avant de partir.
        </p>
      )}
      <p className="mission-objective">
        <Flag size={17} />{' '}
        {offer.objective === 'COMMANDER'
          ? 'Éliminer le commandant de garnison'
          : 'Détruire le bâtiment maître'}
      </p>
      <p>
        {offer.buildings.length} bâtiments · {offer.units.length} combattant
        {offer.units.length > 1 ? 's' : ''} ·{' '}
        {offer.wall
          ? `${missionWallCount(offer)} × ${BUILDINGS[offer.wall].name}`
          : 'Sans remparts'}
      </p>
      <p className="muted">{offer.buildings.map((k) => BUILDINGS[k].name).join(' · ')}</p>
      <p className="mission-army-summary">
        {offer.units.filter((k) => UNIT_PROFILES[k].flying).length} unités aériennes ·{' '}
        {offer.units.filter((k) => UNIT_PROFILES[k].armored).length} blindés ·{' '}
        {offer.units.filter((k) => UNIT_PROFILES[k].siege).length} unités de siège
      </p>
      <details className="mission-roster-details">
        <summary>Voir les {offer.units.length} unités et préparer les contres</summary>
        <ul>
          {roster.map((k) => (
            <li key={k}>
              <strong>
                {offer.units.filter((x) => x === k).length} × {UNITS[k].name}
              </strong>
              <span>
                {UNIT_CATEGORY[k]} · {UNIT_PROFILES[k].role}
              </span>
            </li>
          ))}
        </ul>
      </details>
      {offer.units.some((k) => UNIT_PROFILES[k].flying) && (
        <p className="muted">
          Aviation repérée : prévois une DCA ou des unités capables d’attaquer les airs.
        </p>
      )}
      {offer.difficulty === 'Grande campagne' && (
        <p className="muted">
          Prévue pour toi et tes alliés. Le commanditaire reçoit le butin et les survivants.
        </p>
      )}
    </>
  );
}
function MissionDifficulty({ offer }: { offer: MissionOffer }) {
  const difficulty = missionDifficulty(offer);
  return (
    <div className="mission-difficulty">
      <span className={`mission-difficulty-badge mission-difficulty-${difficulty.tone}`}>
        Difficulté : {difficulty.label}
      </span>
      <small>
        {difficulty.advice} Indication pour une armée de niveau {offer.level} ; la composition et
        les renforts alliés comptent aussi.
      </small>
    </div>
  );
}
function MissionJourney({ world, target }: { world: WorldView; target: Hex }) {
  return (
    <div className="mission-journey">
      <strong>Distance</strong>
      <span>
        Depuis ta capitale : {formatNumber(distance(world.player.capital, target))} cases.
      </span>
      <small>Distance directe en hexagones, sans les détours.</small>
    </div>
  );
}
function MissionRewards({ offer }: { offer: MissionOffer }) {
  return (
    <div className="mission-rewards">
      <strong>Récompenses de victoire</strong>
      <Cost cost={missionReward(offer)} />
      <small>
        Une médaille, le butin garanti et les unités, bâtiments et remparts survivants. Les troupes
        ralliées comptent dans ta population et ton entretien. Le butin finance aussi les
        constructions et améliorations de ta ville.
      </small>
    </div>
  );
}
export function Missions() {
  const w = useGame((s) => s.world)!,
    pending = useGame((s) => s.pending),
    now = useGame((s) => s.now);
  const [category, setCategory] = useState<'conquest' | 'expeditions'>('conquest');
  useEffect(() => {
    if (w.missions?.active?.expedition) setCategory('expeditions');
  }, [w.missions?.active?.id]);
  const [confirmAbandon, setConfirmAbandon] = useState<string | null>(null);
  const missions = w.missions,
    active = missions?.active;
  const offersExpired = !!missions?.offersRefreshAt && now >= missions.offersRefreshAt;
  if (!missions)
    return <p>Les missions seront disponibles après la prochaine synchronisation du serveur.</p>;
  const tabs = (
    <div className="mission-category-tabs" role="tablist" aria-label="Type de mission">
      <button
        role="tab"
        aria-selected={category === 'conquest'}
        onClick={() => setCategory('conquest')}
      >
        Conquêtes
      </button>
      <button
        role="tab"
        aria-selected={category === 'expeditions'}
        onClick={() => setCategory('expeditions')}
      >
        Expéditions & aventures
      </button>
    </div>
  );
  if (category === 'expeditions')
    return (
      <div className="missions-panel">
        {tabs}
        <Expeditions />
      </div>
    );
  if (active?.expedition)
    return (
      <div className="missions-panel">
        {tabs}
        <MissionProgression />
        <p>
          Une expédition est en cours. Termine-la ou abandonne-la avant d’accepter une conquête.
        </p>
      </div>
    );
  return (
    <div className="missions-panel">
      {(w.missions?.availableAt ?? 0) > now && (
        <p role="status">
          Réorganisation après abandon : nouvelles missions dans{' '}
          <Duration until={w.missions!.availableAt!} />.
        </p>
      )}
      {tabs}
      <MissionProgression />
      <div className="mission-intro">
        <Swords size={25} />
        <div>
          <h3>Une campagne, un objectif, une nouvelle place forte.</h3>
          <p>
            La forteresse apparaît de préférence à 20–40 cases de ta capitale, sinon plus loin. Les
            zones inconnues sont prioritaires, puis celles explorées hors de vue. Si nécessaire, une
            zone visible libre et peu occupée sert de repli. Seuls toi et tes alliés pouvez
            l’attaquer. Les missions maritimes peuvent être beaucoup plus éloignées.
          </p>
        </div>
      </div>
      <p className="muted">
        La garnison riposte aux attaques, sans mener de raids. L’objectif accompli, ses unités,
        bâtiments et remparts survivants rejoignent ton royaume en conservant leurs dégâts. Le
        commandant est mortel ; les héros des joueurs restent immortels.
      </p>
      {active ? (
        <article className="mission-active" key={active.id}>
          <span className="eyebrow">
            MISSION EN COURS · {active.difficulty} · NIVEAU {active.level}
          </span>
          <h3>{active.title}</h3>
          <ExceptionalMissionBadge offer={active} />
          <MissionDifficulty offer={active} />
          <OfferDetails offer={active} />
          <MissionRewards offer={active} />
          <div className="mission-progress">
            <strong>Objectif : {formatNumber(active.objectiveHp)} PV</strong>
            <span>
              {active.remainingUnits} combattant(s) et {active.remainingBuildings} bâtiment(s)
              encore debout
            </span>
          </div>
          <MissionJourney world={w} target={active.objectivePosition} />
          <button className="primary" onClick={() => focusMap(active.objectivePosition)}>
            <MapPin size={17} /> Localiser l’objectif · {active.distance} cases de la capitale
          </button>
          <p className="muted">
            Coordonnées {active.objectivePosition.q}, {active.objectivePosition.r}. Distance directe
            en hexagones ; la marche dépend du terrain. La mission reste active sans limite de
            temps.
          </p>
          <div className="mission-abandon">
            <strong>Coût de l’abandon</strong>
            <p>
              Si vos stocks sont insuffisants : paiement partiel et repos de 5 à 30 minutes, sans
              dette.
            </p>
            <Cost cost={active.abandonmentCost} wallet={w.player.wallet} />
            {confirmAbandon === active.id ? (
              <>
                <p>
                  La forteresse et ses défenseurs disparaîtront. Tes troupes et celles de tes alliés
                  resteront sur place. Les ressources seront déduites.
                </p>
                {!canAfford(w.player.wallet, active.abandonmentCost) && (
                  <p className="mission-error">
                    Paiement limité à vos stocks disponibles ; en échange, les nouvelles missions
                    seront suspendues entre 5 et 30 minutes, sans dette.
                  </p>
                )}
                <div className="mission-buttons">
                  <button onClick={() => setConfirmAbandon(null)}>Continuer la mission</button>
                  <button
                    disabled={pending}
                    onClick={() =>
                      send({
                        type: 'MISSION_ABANDON',
                        actorId: w.player.id,
                        payload: { missionId: active.id },
                      })
                    }
                  >
                    Confirmer l’abandon
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => setConfirmAbandon(active.id)}>Abandonner…</button>
            )}
          </div>
        </article>
      ) : (
        <>
          {missions.lastResult && (
            <div className="mission-result" role="status">
              <strong>
                {missions.lastResult.outcome === 'VICTORY' ? 'Victoire' : 'Mission abandonnée'} ·{' '}
                {missions.lastResult.title}
              </strong>
              {missions.lastResult.trophyId && (
                <button
                  className="mission-trophy-link"
                  onClick={() => useGame.setState({ panel: 'trophies' })}
                >
                  Médaille obtenue · Ouvrir la salle des trophées
                </button>
              )}
              {missions.lastResult.outcome === 'VICTORY' && missions.lastResult.reward && (
                <div className="mission-rewards">
                  <strong>Ressources reçues</strong>
                  <Cost cost={missions.lastResult.reward} />
                </div>
              )}
              {missions.lastResult.outcome === 'VICTORY' && (
                <p>
                  Ralliés : {missions.lastResult.units} unité(s), {missions.lastResult.buildings}{' '}
                  bâtiment(s), {missions.lastResult.walls} rempart(s).
                </p>
              )}
            </div>
          )}
          {missions.offersRefreshAt && (missions.availableAt ?? 0) <= now && (
            <div className="mission-refresh" role="timer" aria-label="Renouvellement des missions">
              <Clock3 size={18} aria-hidden="true" />
              {offersExpired ? (
                <strong>Renouvellement des offres en cours…</strong>
              ) : (
                <span>
                  Nouvelles missions dans{' '}
                  <strong>
                    <Duration until={missions.offersRefreshAt} />
                  </strong>
                </span>
              )}
              <small>Les offres non acceptées changent toutes les 10 minutes.</small>
            </div>
          )}
          <div className="mission-offers">
            {missions.offers.map((offer) => (
              <article className="mission-card" key={offer.id}>
                <span className="eyebrow">
                  {offer.difficulty} · NIVEAU {offer.level}
                </span>
                <h3>{offer.title}</h3>
                <ExceptionalMissionBadge offer={offer} />
                <p className="mission-history">
                  {offer.expedition
                    ? offer.discoveredBefore
                      ? 'Lieu déjà découvert'
                      : 'Lieu à découvrir'
                    : offer.completedBefore
                      ? 'Campagne déjà accomplie'
                      : 'Nouvelle campagne'}
                  {offer.expedition &&
                    (offer.completedBefore ? ' · Déjà accomplie' : ' · Jamais accomplie')}
                </p>
                <MissionDifficulty offer={offer} />
                <p className="mission-offer-distance">
                  {offer.maritime
                    ? 'Expédition navale : une rade même lointaine peut être choisie. Préparez un port et des navires ; distance exacte après acceptation.'
                    : '20–40 cases si possible ; sinon recherche plus loin. Priorité aux lieux inconnus, puis hors de vue ; une zone visible libre peut servir de repli.'}
                </p>
                <OfferDetails offer={offer} />
                <MissionRewards offer={offer} />
                <div className="mission-price">
                  <small>Si tu abandonnes ensuite :</small>
                  <Cost cost={offer.abandonmentCost} />
                </div>
                <button
                  className="primary"
                  disabled={pending || offersExpired}
                  onClick={() =>
                    send({
                      type: 'MISSION_ACCEPT',
                      actorId: w.player.id,
                      payload: { offerId: offer.id },
                    })
                  }
                >
                  Accepter
                </button>
              </article>
            ))}
          </div>
          <p className="muted">
            Une seule mission à la fois. L’acceptation est gratuite. Prépare ton armée avant le
            départ : l’abandon est payant. Les offres se renouvellent toutes les 10 minutes, ainsi
            qu’après une victoire ou un abandon, et s’adaptent à tes bâtiments militaires. Une
            mission acceptée reste active sans limite de temps. Avec un allié et un bâtiment
            militaire de niveau 3 minimum, la troisième offre alterne entre siège et grande campagne
            toutes les 10 minutes.
          </p>
        </>
      )}
      {missions.allied.some((m) => !m.expedition) && (
        <section className="mission-allied">
          <h3>
            <Shield size={18} /> Campagnes de tes alliés
          </h3>
          {missions.allied
            .filter((m) => !m.expedition)
            .map((m) => (
              <article key={m.id}>
                <h4>
                  {m.title} · {w.realms.find((r) => r.id === m.realmId)?.name ?? 'Allié'}
                </h4>
                <ExceptionalMissionBadge offer={m} />
                <MissionDifficulty offer={m} />
                <MissionJourney world={w} target={m} />
                <button onClick={() => focusMap(m)}>
                  <MapPin size={16} /> Localiser la mission alliée
                </button>
              </article>
            ))}
          <p className="muted">
            Le butin et les survivants reviennent au royaume qui a accepté la mission, même si un
            allié porte le coup décisif.
          </p>
        </section>
      )}
    </div>
  );
}
