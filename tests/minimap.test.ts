import { describe, expect, it } from 'vitest';
import { biomeAt, createState, writeTile } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
import {
  cameraViewport,
  hexToPixel,
  minimapProjection,
  viewportChunks,
  pixelToHex,
  MAP_ZOOM,
} from '../apps/web/src/map-geometry';
import { chunksSchema } from '@voidmarch/protocol';
import { chunkOf, key } from '@voidmarch/game-rules';

describe('mini-carte', () => {
  it.each([
    [390, 844],
    [1440, 960],
    [1920, 1080],
  ])('charge tout le rectangle visible au dézoom maximal (%i × %i)', (width, height) => {
    const view = cameraViewport(-4700, 3200, width, height, MAP_ZOOM.min);
    const chunks = viewportChunks(view);
    expect(chunksSchema.safeParse({ chunks }).success).toBe(true);
    const keys = new Set(chunks.map(key));
    for (let x = 0; x <= 10; x++)
      for (let y = 0; y <= 10; y++)
        expect(
          keys.has(
            key(
              chunkOf(pixelToHex(view.x + (x * view.width) / 10, view.y + (y * view.height) / 10)),
            ),
          ),
        ).toBe(true);
  });
  it('retrouve la case choisie même loin de l’origine et dans les coordonnées négatives', () => {
    const capital = { q: -140, r: 85 };
    const distant = { q: -200, r: -30 };
    const projection = minimapProjection([capital, distant], capital);
    for (const tile of [capital, distant, { q: -174, r: 52 }]) {
      const p = projection.project(hexToPixel(tile));
      expect(projection.unproject(p.x, p.y)).toEqual(tile);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(180);
    }
  });
  it('le zoom réduit la zone représentée en conservant son centre', () => {
    const initial = cameraViewport(-1200, 200, 1000, 800, 1);
    const zoomed = cameraViewport(-1200, 200, 1000, 800, 2);
    expect(zoomed.width).toBe(initial.width / 2);
    expect(zoomed.height).toBe(initial.height / 2);
    expect(zoomed.x + zoomed.width / 2).toBe(initial.x + initial.width / 2);
    expect(zoomed.y + zoomed.height / 2).toBe(initial.y + initial.height / 2);
  });
  it('conserve les régions explorées hors des chunks affichés sans révéler leur état caché', () => {
    const now = Date.now(),
      state = createState('minimap-test', now);
    const realm = addPlayer(state, 'mini-test', 'Mini test', 'ASH', now);
    const p = { q: 100, r: -100 };
    realm.explored['100,-100'] = {
      ...p,
      terrain: 'PLAIN',
      ownerId: 'former-owner',
      visibility: 'EXPLORED',
    };
    writeTile(state, p, { terrain: 'FOREST', ownerId: 'secret-owner' });
    const view = worldView(state, realm.id, now, [{ q: -8, r: 7 }]);
    expect(view.tiles.some((t) => t.q === p.q && t.r === p.r)).toBe(false);
    const tile = view.overview.find((t) => t.q === p.q && t.r === p.r);
    expect(tile).toEqual({
      ...p,
      biome: biomeAt(state.seed, p),
      terrain: 'PLAIN',
      ownerId: 'former-owner',
      visibility: 'EXPLORED',
    });
    expect(JSON.stringify(view.overview)).not.toContain('secret-owner');
  });
});
