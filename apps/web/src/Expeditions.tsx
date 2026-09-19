import { expeditionSearchCost } from '@voidmarch/config';
import { useState } from 'react';
import { Compass, MapPin, BookOpen, Anchor } from 'lucide-react';
import {
  EXPEDITION_SITES,
  EXPEDITION_HABITATS,
  EXPEDITION_MODES,
  expeditionSite,
  expeditionImage,
  UNIT_PROFILES,
  UNITS,
} from '@voidmarch/config';
import { canAfford, distance, expeditionDistance } from '@voidmarch/game-rules';
import type { ActiveMission, MissionOffer, Unit } from '@voidmarch/shared';
import { useGame, send, focusMap } from './store';
import { Cost, Duration } from './ui';

export function ExpeditionDescription({
  offer,
}: {
  offer: Pick<MissionOffer, 'expedition' | 'level'>;
}) {
  const exp = offer.expedition,
    site = exp && expeditionSite(exp.siteId);
  if (!exp || !site) return null;
  return (
    <div className="expedition-description">
      <img src={expeditionImage(site.id)} alt={site.name} loading="lazy" />
      <p>{site.story}</p>
      {exp.mode === 'RECOVER' && (
        <p>
          Fouille sur place : 3 PA et <Cost cost={expeditionSearchCost(offer.level)} />. Les vivres
          financent les travaux de récupération.
        </p>
      )}
      <small>Milieu : {EXPEDITION_HABITATS[site.id].description}.</small>
      <a href={site.source} target="_blank" rel="noreferrer">
        Inspiré de {site.realPlace}
      </a>
      <small>
        Lieu réel réinventé dans VOIDMARCH · 3 hexagones · approche possible par chaque bord.
      </small>
    </div>
  );
}
function eligible(
  m: ActiveMission,
  u: Unit,
  buildings: { q: number; r: number; kind: string; ownerId: string }[],
) {
  const exp = m.expedition!;
  if (exp.phase === 'RETURN')
    return (
      (u.id === exp.carrierId || u.cargo?.some((c) => c.id === exp.carrierId)) &&
      buildings.some(
        (b) =>
          b.ownerId === m.realmId &&
          ['CAMP', 'VILLAGE', 'PORT'].includes(b.kind) &&
          distance(b, u) <= 1,
      )
    );
  return (
    expeditionDistance(m, u) <= 1 &&
    (exp.route === 'SEA'
      ? !!UNIT_PROFILES[u.kind].naval
      : !UNIT_PROFILES[u.kind].naval && !UNIT_PROFILES[u.kind].flying)
  );
}
export function ExpeditionInteraction({ mission, unit }: { mission: ActiveMission; unit?: Unit }) {
  const w = useGame((s) => s.world)!,
    pending = useGame((s) => s.pending);
  const [chosen, setChosen] = useState('');
  const buildings = w.tiles.flatMap((t) => (t.building ? [t.building] : []));
  const candidates = w.units.filter(
    (u) => u.ownerId === w.player.id && u.hp > 0 && eligible(mission, u, buildings),
  );
  const actor = unit
    ? candidates.find((u) => u.id === unit.id)
    : (candidates.find((u) => u.id === chosen) ?? candidates[0]);
  if (unit && !actor) return null;
  const returning = mission.expedition?.phase === 'RETURN';
  const ap = mission.expedition?.mode === 'RECOVER' ? 3 : 1;
  const searchCost =
    mission.expedition?.mode === 'RECOVER' ? expeditionSearchCost(mission.level) : {};
  return (
    <div className="expedition-interaction">
      {!unit && candidates.length > 1 && (
        <select
          aria-label="Unité de l’expédition"
          value={actor?.id ?? ''}
          onChange={(e) => setChosen(e.target.value)}
        >
          {candidates.map((u) => (
            <option value={u.id} key={u.id}>
              {u.nickname ?? u.hero?.name ?? UNITS[u.kind].name} · {u.q}, {u.r}
            </option>
          ))}
        </select>
      )}
      {actor ? (
        <button
          className="primary"
          disabled={
            pending ||
            (!w.player.unlimitedAP && w.player.ap < ap) ||
            !canAfford(w.player.wallet, searchCost)
          }
          onClick={() =>
            void send({
              type: 'INTERACT',
              actorId: actor.id,
              payload: { expeditionId: mission.id },
            })
          }
        >
          {returning
            ? 'Livrer l’objet'
            : mission.expedition?.mode === 'RECON'
              ? 'Examiner le lieu'
              : mission.expedition?.mode === 'RECOVER'
                ? 'Récupérer le trésor'
                : 'Emporter l’objet'}{' '}
          · {ap} PA <Cost cost={searchCost} wallet={w.player.wallet} />
        </button>
      ) : (
        <p className="muted">
          {returning
            ? 'Ramène le porteur dans une ville ou un port du commanditaire.'
            : 'Approche une unité ' +
              (mission.expedition?.route === 'SEA' ? 'navale' : 'terrestre') +
              ' à une case maximum du bord du lieu, puis examine-le.'}
        </p>
      )}
    </div>
  );
}
export function Expeditions() {
  const w = useGame((s) => s.world)!,
    now = useGame((s) => s.now),
    pending = useGame((s) => s.pending);
  const [album, setAlbum] = useState(false),
    [confirm, setConfirm] = useState(false);
  const board = w.missions!,
    active = board.active?.expedition ? board.active : undefined;
  const trophies = (board.trophies ?? []).filter((t) => t.mission.expedition);
  const completed = new Set(trophies.map((t) => t.mission.expedition!.siteId));
  const expired = !!board.offersRefreshAt && now >= board.offersRefreshAt;
  const missions = [...(active ? [active] : []), ...board.allied.filter((m) => m.expedition)];
  return (
    <div className="expeditions-panel">
      <div className="mission-intro">
        <Compass />
        <div>
          <h3>Expéditions & aventures</h3>
          <p>
            25 lieux à découvrir, à 60–200 cases de ta capitale. Les offres correspondent aux
            biomes, aux reliefs et aux accès disponibles autour de ton royaume. Pars seul ou avec
            tes alliés ; le lieu apparaît seulement après acceptation, hors de ta vision actuelle.
          </p>
        </div>
      </div>
      {(w.missions?.availableAt ?? 0) > now && (
        <p role="status">
          Réorganisation après abandon : nouvelles missions dans{' '}
          <Duration until={w.missions!.availableAt!} />.
        </p>
      )}
      <button className="secondary" onClick={() => setAlbum(!album)}>
        <BookOpen size={16} />{' '}
        {album ? 'Revenir aux expéditions' : `Carnet des découvertes · ${completed.size}/25`}
      </button>
      {album ? (
        <div className="expedition-album">
          {EXPEDITION_SITES.map((site) => {
            const visits = trophies.filter((t) => t.mission.expedition!.siteId === site.id);
            return (
              <article key={site.id} className={visits.length ? 'discovered' : 'undiscovered'}>
                <img src={expeditionImage(site.id)} alt={site.name} loading="lazy" />
                <h4>{site.name}</h4>
                <small>{site.realPlace}</small>
                <p>
                  {visits.length ? `${visits.length} expédition(s) accomplie(s)` : 'À découvrir'}
                </p>
                {visits.map((t) => (
                  <div key={t.id}>
                    <span>
                      {EXPEDITION_MODES[t.mission.expedition!.mode]} ·{' '}
                      {new Date(t.completedAt).toLocaleDateString('fr-FR')}
                    </span>
                    <button onClick={() => useGame.setState({ panel: 'trophies' })}>
                      Voir la médaille
                    </button>
                    <Cost cost={t.reward} />
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      ) : (
        <>
          {missions.map((m) => (
            <article className="mission-active" key={m.id}>
              <span className="eyebrow">
                {m.realmId === w.player.id ? 'TON EXPÉDITION' : 'EXPÉDITION ALLIÉE'} ·{' '}
                {EXPEDITION_MODES[m.expedition!.mode]}
              </span>
              <h3>{m.title}</h3>
              <ExpeditionDescription offer={m} />
              <p>
                <strong>
                  {m.expedition!.phase === 'RETURN'
                    ? 'Objet récupéré · retour au royaume'
                    : 'En route vers le site'}
                </strong>{' '}
                · {m.distance} cases depuis la capitale au départ
              </p>
              <p className="muted">
                {m.expedition!.route === 'SEA'
                  ? 'Approche en navire : l’équipe explore le débarcadère sans devoir construire de port.'
                  : 'Exploration à pied : débarque tes troupes si elles voyagent en transport.'}
              </p>
              <button onClick={() => focusMap(m)}>
                <MapPin size={16} /> Localiser le site · {m.q}, {m.r}
              </button>
              {m.expedition!.phase === 'RETURN' && (
                <button
                  onClick={() =>
                    focusMap(
                      m.realmId === w.player.id
                        ? w.player.capital
                        : (w.units.find((u) => u.id === m.expedition!.carrierId) ?? m),
                    )
                  }
                >
                  Préparer le retour
                </button>
              )}
              <ExpeditionInteraction mission={m} />
              <div className="mission-rewards">
                <strong>Butin garanti pour le commanditaire</strong>
                <Cost cost={m.reward ?? {}} />
                <small>
                  Une médaille · 20 % de chance de trouver 25 % de butin en plus. Le surplus dépasse
                  le stockage sans perte.
                </small>
              </div>
              {m.realmId === w.player.id && (
                <div className="mission-abandon">
                  <strong>Abandonner l’expédition</strong>
                  <p>
                    Si vos stocks sont insuffisants : paiement partiel et repos de 5 à 30 minutes,
                    sans dette.
                  </p>
                  <Cost cost={m.abandonmentCost} wallet={w.player.wallet} />
                  {confirm ? (
                    <>
                      <p>
                        Le site et l’objet de quête disparaissent. Tes unités et celles de tes
                        alliés restent sur place.
                      </p>
                      <button onClick={() => setConfirm(false)}>Continuer</button>
                      <button
                        disabled={pending}
                        onClick={() =>
                          void send({
                            type: 'MISSION_ABANDON',
                            actorId: w.player.id,
                            payload: { missionId: m.id },
                          })
                        }
                      >
                        Confirmer l’abandon · 0 PA
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirm(true)}>Abandonner… · 0 PA</button>
                  )}
                </div>
              )}
            </article>
          ))}
          {!board.active && (
            <>
              {board.offersRefreshAt && (board.availableAt ?? 0) <= now && (
                <p className="mission-refresh">
                  Nouvelles offres dans <Duration until={board.offersRefreshAt} />
                </p>
              )}
              {!board.expeditionOffers?.length && (board.availableAt ?? 0) <= now && (
                <p className="inset" role="status">
                  Aucun site compatible, libre et accessible n’a été repéré hors de ta vision entre
                  60 et 200 cases. Les environs sont réexaminés régulièrement. Disposer d’un navire
                  ouvre aussi les expéditions maritimes.
                </p>
              )}
              <div className="mission-offers">
                {(board.expeditionOffers ?? []).map((offer) => {
                  const exp = offer.expedition!,
                    naval = exp.route === 'SEA';
                  return (
                    <article className="mission-card" key={offer.id}>
                      <span className="eyebrow">
                        {EXPEDITION_MODES[exp.mode]} · ÉPOQUE {offer.level}
                      </span>
                      <h3>{offer.title}</h3>
                      <ExpeditionDescription offer={offer} />
                      <p className="mission-offer-distance">
                        Site repéré à {exp.targetDistance} cases · milieu et accès vérifiés.
                        Emplacement revérifié à l’acceptation.
                      </p>
                      <p>
                        <strong>
                          {exp.mode === 'RECON'
                            ? 'Aller examiner le lieu'
                            : exp.mode === 'RECOVER'
                              ? 'Fouiller et récupérer sur place'
                              : 'Récupérer puis revenir dans une ville ou un port'}
                        </strong>
                      </p>
                      <p className="muted">
                        {naval ? <Anchor size={14} /> : <Compass size={14} />}{' '}
                        {naval
                          ? 'Navire requis · trajet maritime'
                          : 'Unité terrestre requise · trajet accessible à pied'}{' '}
                        · Pas de combat obligatoire
                      </p>
                      <div className="mission-rewards">
                        <strong>Butin garanti</strong>
                        <Cost cost={offer.reward ?? {}} />
                        <small>
                          Sans perte au-delà du stockage · médaille et entrée dans le carnet.
                        </small>
                      </div>
                      <p>Si tu abandonnes :</p>
                      <Cost cost={offer.abandonmentCost} />
                      <button
                        className="primary"
                        disabled={pending || expired}
                        onClick={() =>
                          void send({
                            type: 'MISSION_ACCEPT',
                            actorId: w.player.id,
                            payload: { offerId: offer.id },
                          })
                        }
                      >
                        Accepter l’expédition · 0 PA
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          )}
          {board.active && !active && (
            <p className="muted">
              Termine ou abandonne ta conquête en cours avant de commencer une expédition.
            </p>
          )}
          {board.lastResult?.outcome === 'VICTORY' && board.lastResult.reward && (
            <div className="mission-result">
              <strong>Dernière réussite · {board.lastResult.title}</strong>
              <Cost cost={board.lastResult.reward} />
              <button onClick={() => useGame.setState({ panel: 'trophies' })}>
                Ouvrir la salle des trophées
              </button>
            </div>
          )}
          <p className="muted">
            Une mission active à la fois, sans limite de temps. Examiner ou livrer coûte 1 PA ;
            récupérer coûte 3 PA et les vivres annoncés. Un allié peut accomplir l’objectif ; le
            butin et la médaille reviennent au commanditaire. Si le porteur disparaît, l’objet peut
            être récupéré de nouveau sur le site.
          </p>
        </>
      )}
    </div>
  );
}
