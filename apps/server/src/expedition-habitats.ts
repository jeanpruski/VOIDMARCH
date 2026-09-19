import { EXPEDITION_HABITATS, expeditionSite, type ExpeditionSiteId } from '@voidmarch/config';
import { biomeAt, biomeBlend, disk } from '@voidmarch/game-rules';
import type { Hex, Tile } from '@voidmarch/shared';

/** Check the actual climate around the whole monument, including visual transition bands. */
export function expeditionHabitatMatches(
  seed: string,
  siteId: string,
  center: Hex,
  tile: (p: Hex) => Tile,
): boolean {
  const site = expeditionSite(siteId);
  if (!site) return false;
  const habitat = EXPEDITION_HABITATS[site.id as ExpeditionSiteId];
  for (const p of disk(center, 2)) {
    const t = tile(p),
      biome = t.biome ?? biomeAt(seed, p);
    if (!habitat.biomes.includes(biome)) return false;
    if (
      biomeBlend(seed, p, biome).weights.some(
        (w) => w.weight >= 0.15 && !habitat.biomes.includes(w.biome),
      )
    )
      return false;
  }
  return !habitat.nearby || disk(center, 3).some((p) => habitat.nearby!.includes(tile(p).terrain));
}
