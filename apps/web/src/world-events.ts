import type { WorldEvent } from '@voidmarch/shared';

/** Use the synchronized game clock, including between server snapshots. */
export function eventAvailable(event: WorldEvent, now: number) {
  return !event.claimedBy && event.endsAt > now;
}
