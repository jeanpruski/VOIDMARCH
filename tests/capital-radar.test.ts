import { describe, expect, it } from 'vitest';
import { addPlayer, worldView } from '../apps/server/src/engine';
import { createRealm, createState } from '@voidmarch/game-rules';
import { capitalBearing } from '../apps/web/src/capital-radar';
import { hexToPixel } from '../apps/web/src/map-geometry';

describe('code de repérage des capitales', () => {
  it('réserve les coordonnées au joueur ayant activé le code sans révéler le terrain ni les unités', () => {
    const now = Date.now(),
      s = createState('radar-test', now);
    const a = addPlayer(s, 'a', 'Observateur', 'MASK', now);
    s.realms.b = createRealm('b', 'Ennemi', 'ASH', { q: 125, r: -96 }, now);
    s.realms.c = createRealm('c', 'Vaincu', 'IRON', { q: 150, r: 0 }, now);
    s.realms.c.defeatedAt = now;
    const before = worldView(s, 'a', now);
    expect(before.enemyCapitals).toBeUndefined();
    a.capitalRadar = true;
    const after = worldView(s, 'a', now);
    expect(after.enemyCapitals).toEqual([{ realmId: 'b', position: { q: 125, r: -96 } }]);
    expect(after.tiles).toEqual(before.tiles);
    expect(after.overview).toEqual(before.overview);
    expect(after.units).toEqual(before.units);
    expect(worldView(s, 'b', now).enemyCapitals).toBeUndefined();
    s.realms.b.capital = { q: -82, r: -5 };
    expect(worldView(s, 'a', now).enemyCapitals?.[0].position).toEqual(s.realms.b.capital);
    a.capitalRadar = false;
    expect(worldView(s, 'a', now).enemyCapitals).toBeUndefined();
  });
  it('calcule la distance hexagonale depuis le centre caméra, indépendamment du zoom', () => {
    const origin = hexToPixel({ q: -20, r: 8 });
    for (const zoom of [0.5, 1, 2]) {
      const width = 800 / zoom,
        height = 600 / zoom;
      const view = { x: origin.x - width / 2, y: origin.y - height / 2, width, height };
      expect(capitalBearing(view, { q: -5, r: 8 })).toMatchObject({
        distance: 15,
        edge: 'right',
        angle: 0,
      });
      expect(capitalBearing(view, { q: -35, r: 8 })).toMatchObject({
        distance: 15,
        edge: 'left',
        angle: 180,
      });
      expect(capitalBearing(view, { q: -20, r: 8 }).distance).toBe(0);
    }
  });
  it('indique le nord et le sud, y compris les cibles dans la fenêtre', () => {
    const view = { x: -400, y: -300, width: 800, height: 600 };
    expect(capitalBearing(view, { q: 10, r: -20 })).toMatchObject({
      edge: 'top',
      angle: -90,
      distance: 20,
    });
    expect(capitalBearing(view, { q: -10, r: 20 })).toMatchObject({
      edge: 'bottom',
      angle: 90,
      distance: 20,
    });
    expect(capitalBearing(view, { q: 1, r: 0 })).toMatchObject({ edge: 'right', distance: 1 });
  });
});
