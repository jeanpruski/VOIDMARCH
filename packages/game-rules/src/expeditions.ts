import type { ActiveMission, Hex } from '@voidmarch/shared';
import { DIRECTIONS, distance, hash } from './index';

type Site = Pick<ActiveMission, 'q' | 'r' | 'expedition'>;
/** Stable for saved missions too. The drawing stays upright; only its footprint turns. */
export function expeditionFootprint(site: Site): Hex[] {
  const orientation =
    site.expedition?.orientation ?? Math.floor(hash(`expedition:${site.expedition?.siteId}`) * 6);
  const a = DIRECTIONS[((orientation % 6) + 6) % 6];
  const b = DIRECTIONS[(((orientation + 1) % 6) + 6) % 6];
  return [
    { q: site.q, r: site.r },
    { q: site.q + a.q, r: site.r + a.r },
    { q: site.q + b.q, r: site.r + b.r },
  ];
}
export function expeditionDistance(site: Site, p: Hex): number {
  return Math.min(...expeditionFootprint(site).map((h) => distance(h, p)));
}
export function expeditionCenter(site: Site): Hex {
  const cells = expeditionFootprint(site);
  return {
    q: cells.reduce((sum, p) => sum + p.q, 0) / 3,
    r: cells.reduce((sum, p) => sum + p.r, 0) / 3,
  };
}
