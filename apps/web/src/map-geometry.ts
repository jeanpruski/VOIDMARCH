import type { Hex } from '@voidmarch/shared';
export const SIZE = 48,
  Y_SCALE = 0.82;
export function hexToPixel(p: Hex) {
  return { x: Math.sqrt(3) * SIZE * (p.q + p.r / 2), y: SIZE * 1.5 * p.r * Y_SCALE };
}
export function pixelToHex(x: number, y: number): Hex {
  const r = y / (SIZE * 1.5 * Y_SCALE),
    q = x / (Math.sqrt(3) * SIZE) - r / 2;
  let rq = Math.round(q),
    rr = Math.round(r),
    rs = Math.round(-q - r);
  const dq = Math.abs(rq - q),
    dr = Math.abs(rr - r),
    ds = Math.abs(rs + q + r);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

export interface CameraViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function cameraViewport(
  scrollX: number,
  scrollY: number,
  width: number,
  height: number,
  zoom: number,
): CameraViewport {
  return {
    x: scrollX + (width * (1 - 1 / zoom)) / 2,
    y: scrollY + (height * (1 - 1 / zoom)) / 2,
    width: width / zoom,
    height: height / zoom,
  };
}
export function minimapProjection(tiles: Hex[], capital: Hex) {
  const origin = hexToPixel(capital);
  let left = origin.x - 800,
    right = origin.x + 800,
    top = origin.y - 450,
    bottom = origin.y + 450;
  for (const tile of tiles) {
    const p = hexToPixel(tile);
    left = Math.min(left, p.x - SIZE);
    right = Math.max(right, p.x + SIZE);
    top = Math.min(top, p.y - SIZE);
    bottom = Math.max(bottom, p.y + SIZE);
  }
  const scale = Math.min(164 / (right - left), 94 / (bottom - top));
  const cx = (left + right) / 2,
    cy = (top + bottom) / 2;
  return {
    scale,
    project: (p: { x: number; y: number }) => ({
      x: 90 + (p.x - cx) * scale,
      y: 55 + (p.y - cy) * scale,
    }),
    unproject: (x: number, y: number) => pixelToHex(cx + (x - 90) / scale, cy + (y - 55) / scale),
  };
}
