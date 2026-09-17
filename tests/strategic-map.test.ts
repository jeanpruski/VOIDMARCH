import { describe, expect, it } from 'vitest';
import { strategicAtZoom, strategicTiles, STRATEGIC_ZOOM } from '../apps/web/src/strategic-map';
import type { OverviewTile, ViewTile } from '@voidmarch/shared';

describe('vue stratégique', () => {
  it('réserve les derniers 10 % du dézoom et évite les bascules autour du seuil', () => {
    expect(strategicAtZoom(0.2, false)).toBe(true);
    expect(strategicAtZoom(STRATEGIC_ZOOM.enter, false)).toBe(true);
    expect(strategicAtZoom(0.27, false)).toBe(false);
    expect(strategicAtZoom(0.27, true)).toBe(true);
    expect(strategicAtZoom(STRATEGIC_ZOOM.exit, true)).toBe(false);
    expect(strategicAtZoom(0.6, true)).toBe(false);
  });
  it('ne dessine que les frontières extérieures, avec les souvenirs hors des chunks', () => {
    const overview: OverviewTile[] = [
      { q: 0, r: 0, ownerId: 'a', visibility: 'EXPLORED' },
      { q: 1, r: 0, ownerId: 'a', visibility: 'EXPLORED' },
      { q: 0, r: 1, ownerId: 'b', visibility: 'EXPLORED' },
    ];
    const tiles = strategicTiles({ overview, tiles: [] });
    expect(tiles[0].borders).toHaveLength(5);
    expect(tiles[1].borders).toHaveLength(5);
    expect(tiles[2].borders).toHaveLength(6);
  });
  it('actualise les propriétaires sans révéler les cases inconnues ni les détails des bâtiments', () => {
    const old: OverviewTile = { q: 0, r: 0, ownerId: 'a', visibility: 'EXPLORED' };
    const fresh: ViewTile = { ...old, ownerId: 'b', visibility: 'VISIBLE', terrain: 'FOREST' };
    const secret: ViewTile = { q: 10, r: 10, ownerId: 'secret', visibility: 'UNKNOWN' };
    const tiles = strategicTiles({ overview: [old], tiles: [fresh, secret] });
    expect(tiles).toHaveLength(1);
    expect(tiles[0].ownerId).toBe('b');
    expect(tiles[0]).not.toHaveProperty('terrain');
    expect(JSON.stringify(tiles)).not.toContain('secret');
  });
});
