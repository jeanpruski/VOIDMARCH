import { createMissionTrophy } from '../../apps/server/src/mission-trophies';
import { DEVELOPMENT_TROPHIES } from '@voidmarch/config';
import { BUILDINGS, DEVELOPMENT_REQUIREMENTS } from '@voidmarch/config';
import type { GameState } from '@voidmarch/shared';
import { addBuilding } from '../../apps/server/src/engine';
/** Synthetic technology infrastructure for tests of a different, local recruitment rule.
 * Does not fund the kingdom, bypass the server, or add any combat recruiter beyond
 * the milestones actually required by the requested stage. */
export function prepareTrophies(s: GameState, id: string, stage: number, now: number) {
  const realm = s.realms[id];
  const board = ((s.missions ??= {})[id] ??= { generation: 0 });
  const trophies = (board.trophies ??= []);
  for (let i = trophies.length; i < DEVELOPMENT_TROPHIES[Math.min(5, stage)]; i++)
    trophies.push(
      createMissionTrophy(
        {
          id: `fixture:${id}:${i}`,
          title: 'Campagne de préparation',
          difficulty: 'Escarmouche',
          level: 1,
          objective: 'BUILDING',
          units: [],
          buildings: [],
          abandonmentCost: {},
          q: realm.capital.q,
          r: realm.capital.r,
          realmId: id,
          ownerId: 'mission:fixture',
          objectiveId: 'fixture',
          startedAt: now - 1,
          distance: 20,
        },
        now,
        { units: 0, buildings: 0, walls: 0 },
        {},
      ),
    );
}
export function prepareDevelopment(s: GameState, id: string, stage: number, now: number) {
  prepareTrophies(s, id, stage, now);
  s.realms[id].era = { version: 1, level: stage };
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
