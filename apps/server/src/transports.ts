import { TRANSPORTS, UNITS } from '@voidmarch/config';
import {
  boardingReason,
  transportDockReason,
  unloadingReason,
  neighbors,
  tileAt,
  alliedRealmIds,
  distance,
  observe,
} from '@voidmarch/game-rules';
import type { GameState, Unit, ViewTile } from '@voidmarch/shared';
import type { Action } from '@voidmarch/protocol';
import { requireRule, log } from './engine';
import { incapacitateHero } from './heroes';
const viewTile = (s: GameState, p: { q: number; r: number }): ViewTile => {
  const t = tileAt(s, p);
  return { ...t, visibility: 'VISIBLE', building: s.buildings[t.buildingId ?? ''] };
};
export function syncCargo(carrier: Unit, now: number) {
  for (const u of carrier.cargo ?? [])
    Object.assign(u, { q: carrier.q, r: carrier.r, updatedAt: now });
}
export function transportAction(
  s: GameState,
  id: string,
  a: Action,
  now: number,
): string | undefined {
  if (a.type !== 'EMBARK' && a.type !== 'DISEMBARK') return;
  const carrier = s.units[a.actorId],
    r = s.realms[id];
  requireRule(
    carrier?.ownerId === id && !!TRANSPORTS[carrier.kind] && carrier.hp > 0,
    'Sélectionnez votre transport.',
  );
  requireRule(r.unlimitedAP || r.ap >= 1, 'Cette action demande 1 PA.');
  const allies = alliedRealmIds(s, id);
  const dock = transportDockReason(carrier, viewTile(s, carrier), allies);
  requireRule(!dock, dock);
  if (a.type === 'EMBARK') {
    const passenger = s.units[a.payload.unitId];
    requireRule(passenger, 'Troupe indisponible.');
    const reason =
      boardingReason(carrier, passenger) ||
      unloadingReason(
        carrier,
        passenger,
        viewTile(s, passenger),
        Object.values(s.units).filter((u) => u.id !== passenger.id),
        allies,
      );
    requireRule(!reason, reason);
    (carrier.cargo ??= []).push(passenger);
    passenger.carrierId = carrier.id;
    delete s.units[passenger.id];
    syncCargo(carrier, now);
    if (!r.unlimitedAP) r.ap--;
    carrier.updatedAt = now;
    observe(s, r, now);
    return `${UNITS[passenger.kind].name} embarqué dans ${UNITS[carrier.kind].name} · 1 PA.`;
  }
  const passenger = carrier.cargo?.find((u) => u.id === a.payload.unitId);
  requireRule(passenger && passenger.ownerId === id, 'Ce passager n’est pas à bord.');
  const reason = unloadingReason(
    carrier,
    passenger,
    viewTile(s, a.payload),
    Object.values(s.units),
    allies,
  );
  requireRule(!reason, reason);
  carrier.cargo = carrier.cargo!.filter((u) => u.id !== passenger.id);
  delete passenger.carrierId;
  Object.assign(passenger, { q: a.payload.q, r: a.payload.r, updatedAt: now });
  s.units[passenger.id] = passenger;
  carrier.updatedAt = now;
  if (!r.unlimitedAP) r.ap--;
  observe(s, r, now);
  return `${UNITS[passenger.kind].name} débarqué en ${a.payload.q}, ${a.payload.r} · 1 PA.`;
}
/** Used by every lethal combat path. Nuclear impacts destroy cargo too; heroes recover. */
export function destroyUnit(s: GameState, unit: Unit, now: number, nuclear = false): number {
  if (incapacitateHero(s, unit, now)) return 0;
  delete s.units[unit.id];
  let rescued = 0,
    lost = 0;
  const passengers = unit.cargo ?? [];
  unit.cargo = [];
  const allies = alliedRealmIds(s, unit.ownerId);
  for (const passenger of passengers) {
    delete passenger.carrierId;
    const site =
      !nuclear &&
      neighbors(unit).find(
        (p) => !unloadingReason(unit, passenger, viewTile(s, p), Object.values(s.units), allies),
      );
    if (site) {
      Object.assign(passenger, {
        q: site.q,
        r: site.r,
        hp: Math.max(1, Math.round(passenger.hp * 5) / 10),
        updatedAt: now,
      });
      s.units[passenger.id] = passenger;
      rescued++;
    } else if (!incapacitateHero(s, passenger, now)) lost++;
  }
  if (passengers.length)
    log(
      s,
      `Transport détruit : ${rescued} passager(s) évacué(s) avec 50 % de leurs PV restants ; ${lost} perdu(s). Les héros sans issue rejoignent leur récupération.`,
      'COMBAT',
      now,
      [unit.ownerId],
      unit,
    );
  return 1 + lost;
}
