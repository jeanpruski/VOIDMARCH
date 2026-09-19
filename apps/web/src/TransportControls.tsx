import { useState } from 'react';
import { TRANSPORTS, UNITS, TERRAINS } from '@voidmarch/config';
import {
  boardingReason,
  cargoUsed,
  passengerSize,
  distance,
  neighbors,
  key,
  transportDockReason,
  unloadingReason,
} from '@voidmarch/game-rules';
import type { Unit, WorldView } from '@voidmarch/shared';
import { focusMap, select, send, useGame } from './store';
import { Miniature, unitFrame, format } from './ui';

function PassengerRow({ unit, carrier, world }: { unit: Unit; carrier: Unit; world: WorldView }) {
  const pending = useGame((s) => s.pending);
  const [destination, setDestination] = useState('');
  const allies = world.strategy?.alliance?.members ?? [];
  const tiles = neighbors(carrier)
    .map((p) => world.tiles.find((t) => key(t) === key(p)))
    .filter((t) => !!t);
  const dock = transportDockReason(
    carrier,
    world.tiles.find((t) => key(t) === key(carrier)),
    allies,
  );
  const sites = tiles.filter((t) => !unloadingReason(carrier, unit, t, world.units, allies));
  const site = sites.find((t) => key(t) === destination) ?? sites[0];
  const noAP = !world.player.unlimitedAP && world.player.ap < 1;
  return (
    <article className="transport-passenger">
      <Miniature frame={unitFrame(unit)} heroAppearance={unit.hero?.appearance} size={44} />
      <div>
        <strong>
          {unit.nickname ?? (unit.kind === 'HERO' ? world.player.name : UNITS[unit.kind].name)}
        </strong>
        <small>
          {passengerSize(unit, carrier.kind)} place(s) · {format(unit.hp)} PV
        </small>
      </div>
      {dock ? (
        <p className="requirement-error">{dock}</p>
      ) : !site ? (
        <p className="requirement-error">Aucune case voisine libre et praticable.</p>
      ) : (
        <div className="transport-unload">
          <label>
            Case de sortie
            <select
              aria-label={`Case de sortie de ${UNITS[unit.kind].name}`}
              value={key(site)}
              disabled={pending}
              onChange={(e) => setDestination(e.target.value)}
            >
              {sites.map((t) => (
                <option key={key(t)} value={key(t)}>
                  {t.q}, {t.r} · {TERRAINS[t.terrain!].name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => focusMap(site)}>
            Voir la case
          </button>
          <button
            disabled={pending || noAP}
            onClick={() =>
              void send({
                type: 'DISEMBARK',
                actorId: carrier.id,
                payload: { unitId: unit.id, q: site.q, r: site.r },
              })
            }
          >
            Débarquer · 1 PA
          </button>
        </div>
      )}
    </article>
  );
}
export function TransportControls({ unit }: { unit: Unit }) {
  const world = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  const spec = TRANSPORTS[unit.kind];
  const allies = world.strategy?.alliance?.members ?? [];
  const tile = (u: Unit) => world.tiles.find((t) => key(t) === key(u));
  const noAP = !world.player.unlimitedAP && world.player.ap < 1;
  const embark = async (carrier: Unit, passenger: Unit) => {
    const result = await send({
      type: 'EMBARK',
      actorId: carrier.id,
      payload: { unitId: passenger.id },
    });
    if (result?.accepted) select({ kind: 'unit', id: carrier.id, q: carrier.q, r: carrier.r });
  };
  const reason = (carrier: Unit, passenger: Unit) =>
    boardingReason(carrier, passenger) ||
    transportDockReason(carrier, tile(carrier), allies) ||
    unloadingReason(
      carrier,
      passenger,
      tile(passenger),
      world.units.filter((u) => u.id !== passenger.id),
      allies,
    );
  if (!spec) {
    const nearby = world.units.filter(
      (u) => u.ownerId === world.player.id && TRANSPORTS[u.kind] && distance(u, unit) === 1,
    );
    if (!nearby.length || nearby.every((carrier) => passengerSize(unit, carrier.kind) === null))
      return null;
    return (
      <details className="transport-controls">
        <summary>Embarquer dans un transport voisin</summary>
        {nearby.map((carrier) => (
          <div className="transport-candidate" key={carrier.id}>
            <strong>
              {UNITS[carrier.kind].name} · {cargoUsed(carrier)}/{TRANSPORTS[carrier.kind]!.capacity}{' '}
              places
            </strong>
            {reason(carrier, unit) ? (
              <small className="requirement-error">{reason(carrier, unit)}</small>
            ) : (
              <button disabled={pending || noAP} onClick={() => void embark(carrier, unit)}>
                Embarquer · 1 PA
              </button>
            )}
          </div>
        ))}
      </details>
    );
  }
  const adjacent = world.units.filter(
    (u) => u.ownerId === world.player.id && u.id !== unit.id && distance(u, unit) === 1,
  );
  return (
    <details className="transport-controls" key={unit.id}>
      <summary>
        Transport · {cargoUsed(unit)}/{spec.capacity} places · {unit.cargo?.length ?? 0} passager(s)
      </summary>
      <p>
        Fantassin : 1 place{spec.vehicles ? ' · cavalerie : 2 · moto / voiture légère : 4' : ''}
        {spec.heavy ? ' · blindé lourd / siège : 8' : ''}. Embarquement et débarquement : 1 PA par
        troupe. Déplacement : 1 PA pour tout le chargement.
      </p>
      <p className="muted">
        Vision : 2 cases. Les passagers ne révèlent rien et ne peuvent pas agir à bord. Destruction
        : évacuation avec 50 % des PV restants, pertes si aucune sortie ; le héros reste immortel.
      </p>
      {spec.landing === 'AIRSTRIP' && (
        <p>Avion-cargo : chargement et déchargement sur une plaine ou un aérodrome ami.</p>
      )}
      <h4>À bord</h4>
      {!unit.cargo?.length && <p className="muted">Transport vide.</p>}
      {unit.cargo?.map((p) => (
        <PassengerRow key={p.id} unit={p} carrier={unit} world={world} />
      ))}
      <h4>Troupes voisines</h4>
      {!adjacent.length && (
        <p className="muted">Placez une troupe sur une case voisine pour l’embarquer.</p>
      )}
      {adjacent.map((p) => (
        <div className="transport-candidate" key={p.id}>
          <strong>{p.nickname ?? UNITS[p.kind].name}</strong>
          {reason(unit, p) ? (
            <small className="requirement-error">{reason(unit, p)}</small>
          ) : (
            <button disabled={pending || noAP} onClick={() => void embark(unit, p)}>
              Embarquer · 1 PA
            </button>
          )}
        </div>
      ))}
    </details>
  );
}
