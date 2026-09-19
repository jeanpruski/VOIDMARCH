import { BUILDINGS, DEVELOPMENT_REQUIREMENTS } from '@voidmarch/config';
import type { GameState } from '@voidmarch/shared';
import { addBuilding } from '../../apps/server/src/engine';
/** Synthetic technology infrastructure for tests of a different, local recruitment rule.
 * Does not fund the kingdom, bypass the server, or add any combat recruiter beyond
 * the milestones actually required by the requested stage. */
export function prepareDevelopment(s: GameState, id: string, stage: number, now: number) {
  const realm = s.realms[id];
  for (let level = 2; level <= stage; level++) {
    for (const req of DEVELOPMENT_REQUIREMENTS[level]) {
      let b = Object.values(s.buildings).find(
        (b) => b.ownerId === id && req.kinds.includes(b.kind),
      );
      if (!b)
        b = addBuilding(
          s,
          realm,
          { q: realm.capital.q + 20 + Object.keys(s.buildings).length, r: realm.capital.r + 10 },
          req.kinds[0],
          now,
        );
      b.level = Math.max(b.level, req.level);
      b.hp = BUILDINGS[b.kind].hp * b.level;
    }
  }
}
