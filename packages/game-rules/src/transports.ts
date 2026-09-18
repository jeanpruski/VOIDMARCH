import { TRANSPORTS, UNIT_CATEGORY, UNIT_PROFILES, UNITS } from '@voidmarch/config';
import type { Unit, ViewTile } from '@voidmarch/shared';
import { distance, movementCost, wallBlocks } from './index';

/** Only surface units occupy cells, see, fight or act. Cargo remains owned and maintained. */
export const allUnits = (units: readonly Unit[]): Unit[] =>
  units.flatMap((u) => [u, ...(u.cargo ?? [])]);
export function passengerSize(unit: Unit): number | null {
  const profile = UNIT_PROFILES[unit.kind];
  if (unit.npc || profile.flying || profile.siege || unit.cargo?.length) return null;
  if (
    UNIT_CATEGORY[unit.kind] === 'Motos' ||
    unit.kind === 'ARMORED_CAR' ||
    unit.kind === 'RADIUM_SCOUT_CAR'
  )
    return 4;
  if (profile.mechanical) return null;
  return profile.mounted ? 2 : 1;
}
export const cargoUsed = (carrier: Unit) =>
  (carrier.cargo ?? []).reduce((n, u) => n + (passengerSize(u) ?? 0), 0);
export function boardingReason(carrier: Unit, passenger: Unit): string {
  const spec = TRANSPORTS[carrier.kind];
  if (!spec || carrier.hp <= 0 || carrier.carrierId) return 'Transport indisponible.';
  if (
    passenger.id === carrier.id ||
    passenger.ownerId !== carrier.ownerId ||
    passenger.hp <= 0 ||
    passenger.carrierId
  )
    return 'Sélectionnez une de vos troupes disponibles.';
  if (distance(carrier, passenger) !== 1) return 'La troupe doit être sur une case voisine.';
  const size = passengerSize(passenger);
  if (size === null || (!spec.vehicles && size !== 1))
    return 'Ce transport ne peut pas embarquer cette unité. Les transports chargés, blindés lourds, avions et engins de siège sont exclus.';
  if (cargoUsed(carrier) + size > spec.capacity)
    return `Capacité insuffisante : ${size} place(s) nécessaires.`;
  return '';
}
export function transportDockReason(
  carrier: Unit,
  tile: ViewTile | undefined,
  allies: readonly string[] = [],
): string {
  if (!tile?.terrain) return 'Terrain inconnu.';
  if (wallBlocks(tile.building, carrier.ownerId, 'INFANTRY', allies))
    return 'Un rempart ennemi empêche l’embarquement et le débarquement.';
  if (
    TRANSPORTS[carrier.kind]?.landing === 'AIRSTRIP' &&
    tile.terrain !== 'PLAIN' &&
    !(
      tile.building?.kind === 'AERODROME' &&
      (tile.building.ownerId === carrier.ownerId || allies.includes(tile.building.ownerId))
    )
  )
    return 'L’avion-cargo doit être sur une plaine ou un aérodrome ami.';
  return '';
}
export function unloadingReason(
  carrier: Unit,
  passenger: Unit,
  tile: ViewTile | undefined,
  surface: readonly Unit[],
  allies: readonly string[] = [],
): string {
  if (!tile?.terrain || tile.visibility !== 'VISIBLE') return 'La case doit être visible.';
  if (tile.terrain === 'RIVER' && !tile.road)
    return 'Débarquez sur une berge ou une route, pas directement dans la rivière.';
  if (distance(carrier, tile) !== 1) return 'Choisissez une case voisine du transport.';
  if (surface.some((u) => distance(u, tile) === 0)) return 'Cette case est occupée.';
  if (movementCost({ ...tile, terrain: tile.terrain }, passenger.kind) > UNITS[passenger.kind].move)
    return 'Terrain impraticable pour ce passager.';
  if (wallBlocks(tile.building, carrier.ownerId, passenger.kind, allies))
    return 'Un rempart ennemi bloque la sortie.';
  if (
    tile.building &&
    tile.building.ownerId !== carrier.ownerId &&
    !allies.includes(tile.building.ownerId)
  )
    return 'Un bâtiment ennemi bloque la sortie.';
  return '';
}
