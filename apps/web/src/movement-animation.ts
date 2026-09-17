import type { ActionResult, Hex } from '@voidmarch/shared';
import { hexToPixel } from './map-geometry';
export interface MovementAnimation {
  actionId: string;
  unitId: string;
  destination: Hex;
  revision: number;
  startedAt: number;
  duration: number;
  points: { x: number; y: number }[];
  distances: number[];
}
export function movementPosition(animation: MovementAnimation, now: number) {
  const { points, distances } = animation;
  const fraction = Math.min(1, Math.max(0, (now - animation.startedAt) / animation.duration));
  const target = distances[distances.length - 1] * fraction;
  let low = 1,
    high = distances.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (distances[middle] < target) low = middle + 1;
    else high = middle;
  }
  const segment = Math.max(0, low - 1),
    from = points[segment],
    to = points[segment + 1] ?? from;
  const length = (distances[segment + 1] ?? target) - distances[segment];
  const along = length > 0 ? (target - distances[segment]) / length : 1;
  return { x: from.x + (to.x - from.x) * along, y: from.y + (to.y - from.y) * along, segment };
}
export function animateMovement(
  movement: NonNullable<ActionResult['movement']>,
  actionId: string,
  revision: number,
  now: number,
  previous?: MovementAnimation,
): MovementAnimation {
  let points = [hexToPixel(movement.from), ...movement.path.map(hexToPixel)];
  if (
    previous &&
    now < previous.startedAt + previous.duration &&
    previous.destination.q === movement.from.q &&
    previous.destination.r === movement.from.r
  ) {
    const position = movementPosition(previous, now);
    // Rapid successive orders retain every unplayed corner of the earlier route.
    points = [
      { x: position.x, y: position.y },
      ...previous.points.slice(position.segment + 1),
      ...points.slice(1),
    ];
  }
  const distances = [0];
  for (let i = 1; i < points.length; i++)
    distances.push(
      distances[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y),
    );
  return {
    actionId,
    unitId: movement.unitId,
    destination: movement.path.at(-1) ?? movement.from,
    revision,
    startedAt: now,
    duration: Math.min(6000, Math.max(260, (points.length - 1) * 180)),
    points,
    distances,
  };
}
