import { useState } from 'react';
import { Flag, MapPin, Shield, Swords } from 'lucide-react';
import { BUILDINGS, UNITS, formatNumber } from '@voidmarch/config';
import { canAfford } from '@voidmarch/game-rules';
import type { MissionOffer } from '@voidmarch/shared';
import { focusMap, send, useGame } from './store';
import { Cost } from './ui';

function OfferDetails({ offer }: { offer: MissionOffer }) {
  const roster = [...new Set(offer.units)];
  return (
    <>
      <p className="mission-objective">
        <Flag size={17} />{' '}
        {offer.objective === 'COMMANDER'
          ? 'Éliminer le commandant de garnison'
          : 'Détruire le bâtiment maître'}
      </p>
      <p>
        {offer.buildings.length} bâtiments · {offer.units.length} combattant
        {offer.units.length > 1 ? 's' : ''} ·{' '}
        {offer.wall ? BUILDINGS[offer.wall].name : 'Sans remparts'}
      </p>
      <p className="muted">{offer.buildings.map((k) => BUILDINGS[k].name).join(' · ')}</p>
      <p className="muted">
        {roster
          .map((k) => `${offer.units.filter((x) => x === k).length} × ${UNITS[k].name}`)
          .join(' · ')}
      </p>
    </>
  );
}
export function Missions() {
  const w = useGame((s) => s.world)!,
    pending = useGame((s) => s.pending);
  const [confirmAbandon, setConfirmAbandon] = useState<string | null>(null);
  const missions = w.missions,
    active = missions?.active;
  if (!missions)
    return <p>Les missions seront disponibles après la prochaine synchronisation du serveur.</p>;
  return (
    <div className="missions-panel">
      <div className="mission-intro">
        <Swords size={25} />
        <div>
          <h3>Une campagne, un objectif, une nouvelle place forte.</h3>
          <p>
            Choisis une mission : sa forteresse apparaît à 40–60 cases de ta capitale. Seuls toi et
            tes alliés pouvez l’attaquer.
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
          <OfferDetails offer={active} />
          <div className="mission-progress">
            <strong>Objectif : {formatNumber(active.objectiveHp)} PV</strong>
            <span>
              {active.remainingUnits} combattant(s) et {active.remainingBuildings} bâtiment(s)
              encore debout
            </span>
          </div>
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
            <Cost cost={active.abandonmentCost} wallet={w.player.wallet} />
            {confirmAbandon === active.id ? (
              <>
                <p>
                  La forteresse et ses défenseurs disparaîtront. Tes troupes et celles de tes alliés
                  resteront sur place. Les ressources seront déduites.
                </p>
                {!canAfford(w.player.wallet, active.abandonmentCost) && (
                  <p className="mission-error">Or ou vivres insuffisants pour abandonner.</p>
                )}
                <div className="mission-buttons">
                  <button onClick={() => setConfirmAbandon(null)}>Continuer la mission</button>
                  <button
                    disabled={pending || !canAfford(w.player.wallet, active.abandonmentCost)}
                    onClick={() =>
                      send({
                        type: 'MISSION_ABANDON',
                        actorId: w.player.id,
                        payload: { missionId: active.id },
                      })
                    }
                  >
                    Confirmer l’abandon · 0 PA
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => setConfirmAbandon(active.id)}>Abandonner… · 0 PA</button>
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
              {missions.lastResult.outcome === 'VICTORY' && (
                <p>
                  Ralliés : {missions.lastResult.units} unité(s), {missions.lastResult.buildings}{' '}
                  bâtiment(s), {missions.lastResult.walls} rempart(s).
                </p>
              )}
            </div>
          )}
          <div className="mission-offers">
            {missions.offers.map((offer) => (
              <article className="mission-card" key={offer.id}>
                <span className="eyebrow">
                  {offer.difficulty} · NIVEAU {offer.level}
                </span>
                <h3>{offer.title}</h3>
                <OfferDetails offer={offer} />
                <div className="mission-price">
                  <small>Si tu abandonnes ensuite :</small>
                  <Cost cost={offer.abandonmentCost} />
                </div>
                <button
                  className="primary"
                  disabled={pending}
                  onClick={() =>
                    send({
                      type: 'MISSION_ACCEPT',
                      actorId: w.player.id,
                      payload: { offerId: offer.id },
                    })
                  }
                >
                  Accepter · 0 PA
                </button>
              </article>
            ))}
          </div>
          <p className="muted">
            Une seule mission à la fois. L’acceptation est gratuite. Prépare ton armée avant le
            départ : l’abandon est payant. Les offres se renouvellent après une victoire ou un
            abandon et s’adaptent à tes bâtiments militaires.
          </p>
        </>
      )}
      {missions.allied.length > 0 && (
        <section className="mission-allied">
          <h3>
            <Shield size={18} /> Campagnes de tes alliés
          </h3>
          {missions.allied.map((m) => (
            <button key={m.id} onClick={() => focusMap(m)}>
              <MapPin size={16} /> {m.title} ·{' '}
              {w.realms.find((r) => r.id === m.realmId)?.name ?? 'Allié'}
            </button>
          ))}
          <p className="muted">
            Les survivants rallient le royaume qui a accepté la mission, même si un allié porte le
            coup décisif.
          </p>
        </section>
      )}
    </div>
  );
}
