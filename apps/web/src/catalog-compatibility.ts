import { allUnits } from '@voidmarch/game-rules';
import { BUILDINGS, UNITS, UNIT_PROFILES } from '@voidmarch/config';
import type { WorldView } from '@voidmarch/shared';

/** Do not feed newer server entities into an older client's renderers and rule tables. */
export function supportsWorldCatalog(world: WorldView) {
  return (
    allUnits(world.units).every(
      (u) => Object.hasOwn(UNITS, u.kind) && Object.hasOwn(UNIT_PROFILES, u.kind),
    ) && world.tiles.every((t) => !t.building || Object.hasOwn(BUILDINGS, t.building.kind))
  );
}
