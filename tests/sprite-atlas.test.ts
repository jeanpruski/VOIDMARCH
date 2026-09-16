import { expect, it } from 'vitest';
import { isolateSprites } from '../apps/web/src/sprite-atlas';

it('conserve une silhouette qui traverse une cellule sans la copier chez sa voisine', () => {
  const width = 40,
    height = 20;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const paint = (x0: number, y0: number, x1: number, y1: number, color: number) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) pixels.set([color, 0, 0, 255], (y * width + x) * 4);
  };
  paint(6, 4, 16, 15, 100); // left body
  paint(16, 5, 24, 6, 100); // its weapon overflows to the right
  paint(29, 5, 36, 15, 200); // distinct right body
  const [left, right] = isolateSprites(pixels, width, height, 2, 1);
  expect(left.x + left.width - 1).toBe(24);
  expect(right.x).toBe(29);
  for (let i = 0; i < left.pixels.length; i += 4)
    if (left.pixels[i + 3]) expect(left.pixels[i]).toBe(100);
  for (let i = 0; i < right.pixels.length; i += 4)
    if (right.pixels[i + 3]) expect(right.pixels[i]).toBe(200);
});

it('ne relie pas deux silhouettes par une brume presque transparente', () => {
  const pixels = new Uint8ClampedArray(40 * 20 * 4);
  for (let y = 4; y < 15; y++)
    for (let x = 4; x < 36; x++)
      pixels.set([100, 100, 100, x > 14 && x < 25 ? 5 : 255], (y * 40 + x) * 4);
  const frames = isolateSprites(pixels, 40, 20, 2, 1);
  expect(frames[0].width).toBe(11);
  expect(frames[1].width).toBe(11);
});
