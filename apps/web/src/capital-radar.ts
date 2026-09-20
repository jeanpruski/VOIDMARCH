import { distance } from '@voidmarch/game-rules';
import type { Hex, MissionsView } from '@voidmarch/shared';
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

/** Expeditions point to their site, including while the artefact carrier is returning. */
export function missionBearing(view: CameraViewport, mission: MissionsView['active']) {
  if (!mission) return null;
  const position = mission.expedition ? { q: mission.q, r: mission.r } : mission.objectivePosition;
  const pixel = hexToPixel(position);
  if (
    pixel.x >= view.x &&
    pixel.x <= view.x + view.width &&
    pixel.y >= view.y &&
    pixel.y <= view.y + view.height
  )
    return null;
  return {
    ...capitalBearing(view, position),
    position,
    id: mission.id,
    title: mission.title,
    label: mission.expedition ? 'Expédition' : 'Mission',
  };
}
