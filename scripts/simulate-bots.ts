import {
  createState,
  createRealm,
  accrueEconomy,
  refreshAP,
  hash,
  realmBuildings,
  realmUnits,
  income,
} from '@voidmarch/game-rules';
import { UNIT_TIERS, UNIT_PROFILES } from '@voidmarch/config';
import { BotDirector } from '../apps/server/src/bots';
import { execute, settle, defaultOptions } from '../apps/server/src/engine';
import type { Action } from '@voidmarch/protocol';
import { pathToFileURL } from 'node:url';

/** Continuous presence, ordinary income/costs, 3–10 decisions per ten simulated minutes. */
export function simulateBot(seed: string, personality = 'TURTLE', hours = 6) {
  const started = 1900000000000;
  let state = createState(seed, started);
  const realm = createRealm('bot', 'Simulation', 'ASH', { q: 0, r: 0 }, started, true);
  realm.personality = personality;
  settle(state, realm, started);
  const director = new BotDirector();
  const counts: Record<string, number> = {};
  const failures: string[] = [];
  const history: {
    minute: number;
    buildings: number;
    builders: number;
    level: number;
    tier: number;
    food: number;
    capacity?: number;
  }[] = [];
  for (let cycle = 0; cycle < hours * 6; cycle++) {
    const now = started + (cycle + 1) * 600000;
    const r = state.realms.bot;
    r.lastSeen = now;
    accrueEconomy(state, r, now);
    refreshAP(r, now);
    const rejected = new Set<string>();
    const actions = 3 + Math.floor(hash(`${seed}:${cycle}`) * 8);
    for (let i = 0; i < actions; i++) {
      const intent = director.intent(state, state.realms.bot, now, rejected);
      if (!intent) break;
      const action = {
        ...intent.command,
        actionId: `${cycle}:${i}`,
        clientTimestamp: now,
      } as Action;
      const result = execute(state, 'bot', action, now, {
        ...defaultOptions,
        recruitBonus: () => 0,
      });
      if (result.result.accepted) {
        state = result.state;
        counts[action.type] = (counts[action.type] ?? 0) + 1;
      } else {
        failures.push(`${action.type}: ${result.result.reason}`);
        rejected.add(JSON.stringify(intent.command));
      }
    }
    if (cycle % 6 === 5) {
      const buildings = realmBuildings(state, 'bot'),
        units = realmUnits(state, 'bot');
      history.push({
        minute: (cycle + 1) * 10,
        buildings: buildings.length,
        builders: units.filter((u) => UNIT_PROFILES[u.kind].builder).length,
        level: Math.max(...buildings.filter((b) => b.kind === 'BARRACKS').map((b) => b.level)),
        tier: Math.max(...units.map((u) => UNIT_TIERS[u.kind])),
        food: Math.round(income(state, 'bot').FOOD * 10) / 10,
      });
    }
  }
  return { state, counts, failures, history };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const seed of ['bot-a', 'bot-b', 'bot-c']) {
    const result = simulateBot(seed);
    console.log(
      JSON.stringify({
        seed,
        counts: result.counts,
        failures: result.failures,
        history: result.history,
        buildings: realmBuildings(result.state, 'bot').map((b) => `${b.kind}:${b.level}`),
      }),
    );
  }
}
