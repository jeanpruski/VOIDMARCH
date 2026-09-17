import { distance } from '@voidmarch/game-rules';
import type { Hex } from '@voidmarch/shared';
import { hexToPixel, pixelToHex, type CameraViewport } from './map-geometry';

export function capitalBearing(view: CameraViewport, capital: Hex) {
  const center = { x: view.x + view.width / 2, y: view.y + view.height / 2 };
  const target = hexToPixel(capital),
    dx = target.x - center.x,
    dy = target.y - center.y;
  const horizontal =
    Math.abs(dx) / Math.max(1, view.width) > Math.abs(dy) / Math.max(1, view.height);
  const edge = horizontal ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'top' : 'bottom';
  return {
    edge,
    angle: dx === 0 && dy === 0 ? -90 : (Math.atan2(dy, dx) * 180) / Math.PI,
    distance: distance(pixelToHex(center.x, center.y), capital),
    offset: horizontal ? dy / Math.max(1, Math.abs(dx)) : dx / Math.max(1, Math.abs(dy)),
  } as const;
}
