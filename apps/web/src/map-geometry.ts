import type { Hex } from '@voidmarch/shared';
import { RULES } from '@voidmarch/config';
export const MAP_ZOOM = { min: 0.2, max: 3.2, step: 1.2 } as const;
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

/** Subscribe to the visible rectangle, not a fixed-radius disk that clips at distant zooms. */
export function viewportChunks(view: CameraViewport): Hex[] {
  const left = view.x - 160,
    right = view.x + view.width + 160;
  const top = view.y - 160,
    bottom = view.y + view.height + 160;
  const corners = [
    pixelToHex(left, top),
    pixelToHex(right, top),
    pixelToHex(left, bottom),
    pixelToHex(right, bottom),
  ];
  const size = RULES.chunkSize;
  const qMin = Math.max(-3125, Math.floor((Math.min(...corners.map((p) => p.q)) - 1) / size));
  const qMax = Math.min(3125, Math.floor((Math.max(...corners.map((p) => p.q)) + 1) / size));
  const rMin = Math.max(-3125, Math.floor((Math.min(...corners.map((p) => p.r)) - 1) / size));
  const rMax = Math.min(3125, Math.floor((Math.max(...corners.map((p) => p.r)) + 1) / size));
  const chunks: Hex[] = [];
  for (let r = rMin; r <= rMax; r++)
    for (let q = qMin; q <= qMax; q++) {
      const a = hexToPixel({ q: q * size, r: r * size });
      const b = hexToPixel({ q: (q + 1) * size - 1, r: (r + 1) * size - 1 });
      if (a.x - SIZE <= right && b.x + SIZE >= left && a.y - SIZE <= bottom && b.y + SIZE >= top)
        chunks.push({ q, r });
    }
  const center = { x: view.x + view.width / 2, y: view.y + view.height / 2 };
  const proximity = (c: Hex) => {
    const p = hexToPixel({ q: (c.q + 0.5) * size, r: (c.r + 0.5) * size });
    return (p.x - center.x) ** 2 + (p.y - center.y) ** 2;
  };
  return chunks.sort((a, b) => proximity(a) - proximity(b)).slice(0, RULES.maxViewChunks);
}
