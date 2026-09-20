/** Read-only audit of synthetic worlds. No database or live account access. */
import { createState } from '@voidmarch/game-rules';
import { addPlayer, addBuilding } from '../apps/server/src/engine';
import { missionOffers } from '../apps/server/src/missions';
import { expeditionOffers } from '../apps/server/src/expeditions';
import {
  ERA_COSTS,
  DEVELOPMENT_TROPHIES,
  BUILDINGS,
  UNITS,
  buildingUpgrade,
  isWall,
  EXPEDITION_REWARD_BOOST,
  CONQUEST_REWARD_BOOST,
  type BuildingKind,
  type UnitKind,
  type Wallet,
} from '@voidmarch/config';
import { simulateDevelopment, simulateSkirmish } from './simulate-balance';
const now = 1_900_000_000_000;
const world = createState('adventures-test', now);
const realm = addPlayer(world, 'a', 'Audit', 'MASK', now);
const barracks = addBuilding(
  world,
  realm,
  { q: realm.capital.q + 1, r: realm.capital.r },
  'BARRACKS',
  now,
);
const eras = [];
for (let era = 1; era <= 5; era++) {
  realm.era!.level = era;
  barracks.level = era;
  const missions = missionOffers(world, realm.id, now).map((offer) => ({
    difficulty: offer.difficulty,
    level: offer.level,
    enemies: offer.units.length,
    enemyGold: offer.units.reduce((sum, kind) => sum + UNITS[kind].cost.GOLD, 0),
    abandonment: offer.abandonmentCost,
    reward: offer.reward,
    goldFoodBoost: CONQUEST_REWARD_BOOST[offer.difficulty],
  }));
  const expeditions = expeditionOffers(world, realm.id, now).map((offer) => ({
    mode: offer.expedition!.mode,
    level: offer.level,
    distance: offer.expedition!.targetDistance,
    route: offer.expedition!.route,
    boost: EXPEDITION_REWARD_BOOST[offer.expedition!.mode],
    reward: offer.reward,
  }));
  eras.push({
    era,
    nextTrophies: DEVELOPMENT_TROPHIES[era + 1],
    nextEraCost: ERA_COSTS[era + 1],
    missions,
    expeditions,
  });
}
const add = (target: Wallet, cost: Partial<Wallet>) => {
  for (const [key, amount] of Object.entries(cost)) target[key as keyof Wallet] += amount;
};
const catalogueBudget: Wallet = { GOLD: 0, WOOD: 0, STONE: 0, IRON: 0, FOOD: 0 };
for (const kind of Object.keys(BUILDINGS) as BuildingKind[]) {
  if (isWall(kind)) continue; // Wall materials are an alternative upgrade chain.
  add(catalogueBudget, BUILDINGS[kind].cost);
  for (let level = 1; level < 5; level++) add(catalogueBudget, buildingUpgrade(kind, level)!.cost);
}
const counters = (
  [
    ['BAZOOKA', 1, 'MAUSOLEUM_TANK'],
    ['BAZOOKA', 6, 'MAUSOLEUM_TANK'],
    ['RIFLEMAN', 6, 'MAUSOLEUM_TANK'],
    ['FLAK_CANNON', 7, 'GLOCKE_APOCALYPSE'],
  ] as [UnitKind, number, UnitKind][]
).map(([unit, count, opponent]) => ({
  unit,
  count,
  opponent,
  runs: 20,
  wins: Array.from({ length: 20 }, (_, seed) =>
    simulateSkirmish(unit, count, 3, opponent, 5, seed),
  ).filter((r) => r.winner === 'a').length,
}));
console.log(
  JSON.stringify(
    {
      assumptions: [
        'Generated offers: one deterministic map, not an empirical player average.',
        'Catalogue budget: one of every non-wall building at level 5; excludes units, upkeep and era costs.',
        'Economic benchmark: uninterrupted, no mission loot; trophy and travel time excluded, not a forecast.',
        'Counter skirmishes: stationary plain terrain, alternating initiative, no repairs or manoeuvres.',
      ],
      eras,
      catalogueBudget,
      counters,
      economyWithoutLoot: [3, 5].map((level) => ({
        producerLevel: level,
        milestones: simulateDevelopment(level as 3 | 5).filter(
          (row) => row.action.includes('Époque') || row.action.includes('Cloche'),
        ),
      })),
    },
    null,
    2,
  ),
);
