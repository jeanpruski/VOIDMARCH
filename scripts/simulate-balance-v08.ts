/** Synthetic worlds only: no database, network, saved account or production access. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { simulateDevelopment, simulateSkirmish } from './simulate-balance';
import {
  BUILDINGS,
  UNITS,
  UNIT_PROFILES,
  productionMultiplier,
  buildingUpgrade,
  trainingBonusAt,
  unitPopulation,
  unitUpkeep,
  type BuildingKind,
  type UnitKind,
} from '@voidmarch/config';
import {
  createState,
  createRealm,
  unitStats,
  disk,
  writeTile,
  estimateDamage,
  attackBlockReason,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute } from '../apps/server/src/engine';
import { expeditionOffers } from '../apps/server/src/expeditions';
import { prepareDevelopment } from '../tests/fixtures/development';
import { actionSchema } from '@voidmarch/protocol';
import type { Unit } from '@voidmarch/shared';
const now = 1900000000000;
const investment = (kind: BuildingKind) =>
  Object.values(BUILDINGS[kind].cost).reduce((a, b) => a + b, 0) +
  [1, 2, 3, 4].reduce(
    (n, l) => n + Object.values(buildingUpgrade(kind, l)!.cost).reduce((a, b) => a + b, 0),
    0,
  );
const producers = (
  [
    'LUMBER',
    'QUARRY',
    'MINE',
    'STEAM_SAWMILL',
    'MECHANIZED_QUARRY',
    'INDUSTRIAL_MINE',
    'OCCULT_SAWMILL',
    'RUNIC_QUARRY',
    'ABYSSAL_MINE',
  ] as const
).map((kind) => ({
  kind,
  investment: investment(kind),
  rate:
    Object.values(BUILDINGS[kind].production).reduce((a, b) => a + b, 0) *
    productionMultiplier(kind, 5),
}));
const expeditions = [];
const world = createState('adventures-test', now),
  realm = addPlayer(world, 'a', 'A', 'MASK', now);
addBuilding(world, realm, { q: 1, r: 0 }, 'WELL', now, 5);
for (let level = 1; level <= 5; level++) {
  prepareDevelopment(world, 'a', level, now);
  expeditions.push({
    level,
    offers: expeditionOffers(world, 'a', now).map((o) => ({
      mode: o.expedition!.mode,
      distance: o.expedition!.targetDistance,
      reward: o.reward,
    })),
  });
}
const counters = [];
for (const [kind, count, opponent] of [
  ['BAZOOKA', 6, 'MAUSOLEUM_TANK'],
  ['RIFLEMAN', 6, 'MAUSOLEUM_TANK'],
  ['FLAK_CANNON', 7, 'GLOCKE_APOCALYPSE'],
] as const) {
  const outcomes = Array.from({ length: 20 }, (_, seed) =>
    simulateSkirmish(kind, count, 3, opponent, 5, seed),
  );
  counters.push({
    kind,
    count,
    opponent,
    wins: outcomes.filter((o) => o.winner === 'a').length,
    runs: 20,
  });
}
for (const [kind, count, level] of [
  ['BLACK_SUBMARINE', 7, 3],
  ['HUNTER_SUBMARINE', 2, 4],
] as const) {
  const outcomes = Array.from({ length: 20 }, (_, seed) =>
    simulateSkirmish(kind, count, level, 'NUCLEAR_DREADNOUGHT', 5, seed),
  );
  counters.push({
    kind,
    count,
    opponent: 'NUCLEAR_DREADNOUGHT',
    wins: outcomes.filter((o) => o.winner === 'a').length,
    runs: 20,
  });
}
const sample = (kind: UnitKind, level = 5): Unit => ({
  id: kind,
  kind,
  ownerId: kind,
  q: 0,
  r: 0,
  trainingBonus: trainingBonusAt(UNIT_PROFILES[kind].recruitAt[0], level),
  hp: 1,
  createdAt: now,
  updatedAt: now,
});
const naval = (
  ['SONAR_DESTROYER', 'MISSILE_ESCORT', 'NUCLEAR_DREADNOUGHT', 'ABYSSAL_SUBMARINE'] as const
).map((kind) => ({
  kind,
  population: unitPopulation(kind),
  upkeep: unitUpkeep(kind),
  stats: unitStats(sample(kind)),
}));
const coast = (
  ['FLAK_CANNON', 'NEUTRON_MORTAR', 'GLOCKE_APOCALYPSE', 'ABYSSAL_SUBMARINE'] as const
).map((kind) => {
  const a = sample(kind),
    b = { ...sample('NUCLEAR_DREADNOUGHT'), q: 1 };
  return {
    attacker: kind,
    target: b.kind,
    blocked: attackBlockReason(a, b),
    damage: estimateDamage(a, b, { q: 1, r: 0, terrain: 'SEA' }),
  };
});
const siege = [];
for (const cadence of [0, 30000, 60000]) {
  let s = createState(`repair-${cadence}`, now);
  for (const id of ['a', 'b']) {
    s.realms[id] = createRealm(id, id, 'MASK', { q: id === 'a' ? -5 : 5, r: 0 }, now);
    s.realms[id].protectedUntil = 0;
    s.realms[id].unlimitedAP = true;
    s.realms[id].wallet = { GOLD: 1e7, WOOD: 1e7, IRON: 1e7, STONE: 1e7, FOOD: 1e7 };
  }
  for (const p of disk({ q: 0, r: 0 }, 7)) writeTile(s, p, { terrain: 'PLAIN' });
  const wall = addBuilding(s, s.realms.b, { q: 1, r: 0 }, 'ATOMIC_WALL', now);
  const mortar = { ...sample('NEUTRON_MORTAR'), id: 'siege', ownerId: 'a' };
  mortar.hp = unitStats(mortar).hp;
  s.units.siege = mortar;
  const rounds = [];
  for (let n = 0; n < 12 && s.buildings[wall.id]; n++) {
    const at = now + cadence * n;
    for (const r of Object.values(s.realms)) {
      r.economyAt = at;
      r.lastSeen = at;
    }
    const order = (type: string, actorId: string, payload = {}) =>
      actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: at });
    const hit = execute(s, 'a', order('ATTACK', 'siege', { targetId: wall.id }), at);
    if (!hit.result.accepted) throw Error(hit.result.reason);
    s = hit.state;
    const afterHit = s.buildings[wall.id]?.hp;
    const repair = execute(s, 'b', order('REPAIR', wall.id), at);
    s = repair.state;
    rounds.push({
      afterHit,
      repaired: repair.result.accepted,
      remaining: s.buildings[wall.id]?.hp ?? 0,
    });
  }
  siege.push({ cadence, rounds, destroyed: !s.buildings[wall.id] });
}
const results = {
  development: [3, 5].map((l) => ({
    producerLevel: l,
    milestones: simulateDevelopment(l as 3 | 5),
  })),
  producers,
  expeditions,
  counters,
  naval,
  coast,
  siege,
};
mkdirSync('output/balance-v08', { recursive: true });
writeFileSync('output/balance-v08/results.json', JSON.stringify(results, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      development: results.development.map((r) => ({
        producerLevel: r.producerLevel,
        end: r.milestones.at(-1),
      })),
      counters,
      siege,
    },
    null,
    2,
  ),
);
