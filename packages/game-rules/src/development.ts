import { developmentStage, type DevelopmentProgress } from '@voidmarch/config';
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
