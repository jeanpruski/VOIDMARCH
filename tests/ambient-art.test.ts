import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { createRealm, createState } from '@voidmarch/game-rules';
import { addBuilding, worldView } from '../apps/server/src/engine';
import { drawAmbient } from '../apps/web/src/strategy-art';
import { hexToPixel } from '../apps/web/src/map-geometry';

describe('fumées sur les coordonnées négatives de la carte', () => {
  it.each([-10000, -100, -10, -1, 0, 1, 10000])(
    'dessine des rayons valides à q=%s dès la première image',
    (q) => {
      const now = 1_800_000_000_000;
      const s = createState('ambient', now);
      const realm = createRealm('a', 'Forge', 'ASH', { q, r: -3 }, now);
      s.realms.a = realm;
      const forge = addBuilding(s, realm, realm.capital, 'FORGE', now);
      const world = worldView(s, 'a', now);
      world.tiles = [
        { ...realm.capital, visibility: 'VISIBLE', terrain: 'PLAIN', building: forge },
      ];
      const radii: number[] = [];
      const alphas: number[] = [];
      const g = new Proxy(
        { scene: { cameras: { main: { worldView: { contains: () => true } } } } },
        {
          get(target, name) {
            if (name === 'scene') return target.scene;
            return (...args: number[]) => {
              if (name === 'fillCircle') {
                radii.push(args[2]);
                if (!Number.isFinite(args[2]) || args[2] < 0)
                  throw new RangeError('Canvas arc radius is negative');
              }
              if (name === 'fillStyle') alphas.push(args[1]);
              return g;
            };
          },
        },
      ) as unknown as Phaser.GameObjects.Graphics;
      for (const reduced of [false, true]) {
        world.player.settings.reducedMotion = reduced;
        for (const time of [0, 50, 80, 550, 3599, 3600, 1_000_000]) {
          expect(() =>
            drawAmbient(g, world, hexToPixel, time, new Set(), true, true),
          ).not.toThrow();
        }
      }
      expect(radii.length).toBeGreaterThan(0);
      expect(radii.every((r) => r >= 0 && r <= 9)).toBe(true);
      expect(alphas.every((a) => a >= 0 && a <= 1)).toBe(true);
      // Damaged non-industrial buildings use the same smoke effect.
      forge.kind = 'CAMP';
      forge.hp = 1;
      expect(() => drawAmbient(g, world, hexToPixel, 50, new Set(), true, true)).not.toThrow();
    },
  );
});
