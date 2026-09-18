import { describe, expect, it } from 'vitest';
import { DIRECTIONS } from '@voidmarch/game-rules';
import { hexToPixel, Y_SCALE } from '../apps/web/src/map-geometry';
import { gateArmStart, wallGateAxis } from '../apps/web/src/wall-art';

describe('orientation et raccords des portes', () => {
  it('suit la ligne entre les deux murs pour chaque angle et chaque route', () => {
    for (let a = 0; a < 6; a++)
      for (let b = a + 1; b < 6; b++)
        for (let roads = 0; roads < 64; roads++) {
          const angle = (-wallGateAxis((1 << a) | (1 << b), roads) * Math.PI) / 3;
          const start = hexToPixel(DIRECTIONS[a]),
            end = hexToPixel(DIRECTIONS[b]);
          const cross =
            (Math.cos(angle) * (end.y - start.y)) / Y_SCALE - Math.sin(angle) * (end.x - start.x);
          expect(cross).toBeCloseTo(0, 8);
        }
  });

  it('les bras rejoignent les montants sans traverser le passage, y compris aux jonctions', () => {
    for (let mask = 1; mask < 64; mask++)
      for (let roads = 0; roads < 64; roads++) {
        const axis = wallGateAxis(mask, roads),
          angle = (-axis * Math.PI) / 3;
        for (let side = 0; side < 6; side++) {
          if (!(mask & (1 << side))) continue;
          const p = hexToPixel(DIRECTIONS[side]);
          const end = { x: p.x / 2, y: p.y / 2 },
            start = gateArmStart(end, axis);
          for (let step = 0; step <= 100; step++) {
            const x = start.x + ((end.x - start.x) * step) / 100;
            const y = (start.y + ((end.y - start.y) * step) / 100) / Y_SCALE;
            const localX = Math.cos(angle) * x + Math.sin(angle) * y;
            const localY = -Math.sin(angle) * x + Math.cos(angle) * y;
            // Opening is 28 wide; reserve additional clearance for the wall thickness.
            expect(Math.abs(localX) >= 19.99 || Math.abs(localY) >= 5.99).toBe(true);
          }
        }
      }
  });
});
