import {
  BUILDING_MIN_ERA,
  unitRequiredEra,
  buildingUpgradeLevel,
  developmentStage,
  type DevelopmentProgress,
} from '@voidmarch/config';
import type { GameState, WorldView } from '@voidmarch/shared';

/** Same progression context for server validation and client previews. */
export function developmentProgress(world: WorldView): DevelopmentProgress;
export function developmentProgress(state: GameState, id: string): DevelopmentProgress;
export function developmentProgress(
  source: GameState | WorldView,
  id?: string,
): DevelopmentProgress {
  const realm = 'player' in source ? source.player : source.realms[id!];
  const trophies =
    'player' in source ? source.missions?.trophies : source.missions?.[id!]?.trophies;
  return {
    trophies: trophies?.length ?? 0,
    era: realm?.era?.level,
    bot: realm?.bot === true,
    grandfatheredLevel: realm?.bot ? 5 : (realm?.trophyDevelopment?.grandfatheredLevel ?? 1),
  };
}
/** Idempotent JSON migration, without generating medals or changing resources and assets. */
export function migrateTrophyDevelopment(s: GameState) {
  let changed = false;
  const preserve = (realm: GameState['realms'][string], sites: (typeof s.buildings)[string][]) => {
    if (realm.trophyDevelopment) return;
    realm.trophyDevelopment = {
      version: 1,
      grandfatheredLevel: developmentStage(sites, { trophies: 50 }),
    };
    changed = true;
  };
  for (const r of Object.values(s.realms))
    preserve(
      r,
      Object.values(s.buildings).filter((b) => b.ownerId === r.id),
    );
  for (const archive of Object.values(s.archives)) preserve(archive.realm, archive.buildings);
  if (changed) s.revision++;
  return changed;
}

/** Preserve owned assets, archived kingdoms and previously unlocked development exactly once. */
export function migrateKingdomEras(s: GameState) {
  let changed = false;
  const preserve = (
    r: GameState['realms'][string],
    buildings: GameState['buildings'][string][],
    units: GameState['units'][string][],
  ) => {
    if (r.era) return;
    const level = Math.min(
      5,
      Math.max(
        1,
        r.trophyDevelopment?.grandfatheredLevel ?? 1,
        developmentStage(buildings, { trophies: s.missions?.[r.id]?.trophies?.length ?? 0 }),
        ...buildings.map((b) =>
          Math.max(BUILDING_MIN_ERA[b.kind], buildingUpgradeLevel(b), b.turretLevel ?? 1),
        ),
        ...units.flatMap((u) => [u, ...(u.cargo ?? [])].map((x) => unitRequiredEra(x.kind))),
      ),
    );
    r.era = { version: 1, level };
    changed = true;
  };
  for (const r of Object.values(s.realms).filter((r) => !r.era))
    preserve(
      r,
      Object.values(s.buildings).filter((b) => b.ownerId === r.id),
      Object.values(s.units).filter((u) => u.ownerId === r.id),
    );
  for (const archive of Object.values(s.archives))
    preserve(archive.realm, archive.buildings, archive.units);
  if (changed) s.revision++;
  return changed;
}
