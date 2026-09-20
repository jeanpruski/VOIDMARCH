import { BUILDINGS, type BuildingKind, type Terrain } from '@voidmarch/config';
import type { Hex, Unit } from '@voidmarch/shared';

/** Only a disembarked peasant standing on neutral land may found a remote base. */
export function canFoundOutpost(
  kind: BuildingKind,
  ownerId: string,
  tile: Hex & { ownerId?: string; terrain?: Terrain },
  builder?: Unit,
) {
  return (
    kind === 'OUTPOST' &&
    !tile.ownerId &&
    !!tile.terrain &&
    BUILDINGS.OUTPOST.terrains.includes(tile.terrain) &&
    builder?.ownerId === ownerId &&
    builder.kind === 'PEASANT' &&
    builder.hp > 0 &&
    builder.q === tile.q &&
    builder.r === tile.r
  );
}
