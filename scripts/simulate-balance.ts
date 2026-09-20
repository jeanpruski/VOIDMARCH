import {
  developmentMissing,
  constructionDevelopmentStage,
  BUILDING_REQUIREMENTS,
} from '@voidmarch/config';
import { randomUUID, createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import {
  BUILDINGS,
  UNITS,
  UNIT_PROFILES,
  RESOURCES,
  trainingBonusAt,
  productionMultiplier,
  buildingUpgrade,
  RULES,
  type BuildingKind,
  type UnitKind,
  type Wallet,
  type Terrain,
} from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  distance,
  writeTile,
  income,
  storage,
  accrueEconomy,
  refreshAP,
  unitStats,
  estimateDamage,
  attackCost,
} from '@voidmarch/game-rules';
import { addPlayer, execute } from '../apps/server/src/engine';
import { createMissionTrophy } from '../apps/server/src/mission-trophies';
import { actionSchema } from '@voidmarch/protocol';
import type { Unit } from '@voidmarch/shared';

/** Ideal uninterrupted development: no opponent, travel after the first six moves excluded.
 * Economic benchmark only: trophy acquisition time is excluded (fifty personal trophies assumed).
 * Every construction and upgrade is paid through the real server engine, with storage and PA.
 * Thirteen initial gathers + first free peasant + six moves use 20 of the starting 40 PA.
 */
export function simulateDevelopment(producerLevel: 3 | 5 = 3) {
  const start = 1_900_000_000_000;
  let now = start,
    state = createState('balance-development', now),
    sequence = 0;
  const initial = addPlayer(state, 'sim', 'Simulation', 'MASK', now);
  // Synthetic medals only for this in-memory economic benchmark; never applied to live realms.
  const simulationBoard = ((state.missions ??= {}).sim ??= { generation: 0 });
  simulationBoard.trophies = Array.from({ length: 50 }, (_, i) =>
    createMissionTrophy(
      {
        id: `simulation:${i}`,
        title: 'Préparation économique',
        difficulty: 'Escarmouche',
        level: 1,
        objective: 'BUILDING',
        units: [],
        buildings: [],
        abandonmentCost: {},
        ...initial.capital,
        realmId: 'sim',
        ownerId: 'mission:simulation',
        objectiveId: 'simulation',
        startedAt: now - 1,
        distance: 20,
      },
      now,
      { units: 0, buildings: 0, walls: 0 },
      {},
    ),
  );
  initial.ap = RULES.startingAP - 20;
  initial.wallet = { GOLD: 48, WOOD: 96, STONE: 40, IRON: 32, FOOD: 48 };
  const ruins = { q: initial.capital.q - 1, r: initial.capital.r };
  writeTile(state, ruins, { terrain: 'RUINS' });
  state.units.peasant = {
    id: 'peasant',
    kind: 'PEASANT',
    ownerId: 'sim',
    ...ruins,
    hp: UNITS.PEASANT.hp,
    createdAt: now,
    updatedAt: now,
  };
  const rows: { action: string; minutes: number; cap: number; rates: Wallet }[] = [];
  const wait = () => {
    now += 30_000;
    const r = state.realms.sim;
    r.lastSeen = now;
    accrueEconomy(state, r, now);
    refreshAP(r, now);
    if (now - start > 7 * 24 * 60 * 60_000)
      throw new Error('Development stalled beyond seven active days');
  };
  const buy = (
    type: 'BUILD' | 'UPGRADE',
    actorId: string,
    payload: object,
    cost: Partial<Wallet>,
  ) => {
    const largest = Math.max(...Object.values(cost));
    while (largest > storage(state, 'sim')) {
      const warehouses = Object.values(state.buildings).filter((b) => b.kind === 'WAREHOUSE');
      const next = warehouses.find(
        (b) =>
          b.level < 5 &&
          Math.max(...Object.values(buildingUpgrade(b.kind, b.level)!.cost)) <=
            storage(state, 'sim'),
      );
      if (next) upgrade(next.kind, next.level + 1, next.id);
      else build('WAREHOUSE');
    }
    // Continue actively searching the nearby ruins until the first market is running.
    while (
      !Object.values(state.buildings).some((b) => b.kind === 'MARKET') &&
      state.realms.sim.wallet.GOLD < (cost.GOLD ?? 0)
    ) {
      while (state.realms.sim.ap < 1) wait();
      const gathered = execute(
        state,
        'sim',
        actionSchema.parse({
          type: 'GATHER',
          actorId: 'peasant',
          payload: { resource: 'GOLD' },
          actionId: randomUUID(),
          clientTimestamp: now,
        }),
        now,
      );
      if (!gathered.result.accepted) throw new Error(gathered.result.reason);
      state = gathered.state;
    }
    while (
      RESOURCES.some((r) => state.realms.sim.wallet[r] + 1e-6 < (cost[r] ?? 0)) ||
      state.realms.sim.ap < (type === 'BUILD' ? 1 : 2)
    )
      wait();
    const result = execute(
      state,
      'sim',
      actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now }),
      now,
    );
    if (!result.result.accepted) throw new Error(`${type}: ${result.result.reason}`);
    state = result.state;
  };
  const record = (action: string) =>
    rows.push({
      action,
      minutes: (now - start) / 60000,
      cap: storage(state, 'sim'),
      rates: income(state, 'sim'),
    });
  const ensureStage = (stage: number) => {
    for (const req of developmentMissing(Object.values(state.buildings), stage)) {
      let site = Object.values(state.buildings).find((b) => req.kinds.includes(b.kind));
      if (!site) {
        build(req.kinds[0]);
        site = Object.values(state.buildings).find((b) => b.kind === req.kinds[0])!;
      }
      upgrade(site.kind, req.level, site.id);
    }
  };
  const build = (kind: BuildingKind) => {
    if (kind !== 'WAREHOUSE' && Object.values(state.buildings).some((b) => b.kind === kind)) return;
    for (const parent of BUILDING_REQUIREMENTS[kind] ?? [])
      if (!Object.values(state.buildings).some((b) => b.kind === parent)) build(parent);
    ensureStage(constructionDevelopmentStage(kind));
    const p = { q: initial.capital.q + ++sequence, r: initial.capital.r };
    // Pre-surveyed sites isolate economy from map luck; territory still pays its upkeep.
    writeTile(state, p, { terrain: BUILDINGS[kind].terrains[0] as Terrain, ownerId: 'sim' });
    buy('BUILD', 'sim', { ...p, kind }, BUILDINGS[kind].cost);
    record(BUILDINGS[kind].name);
  };
  const upgrade = (kind: BuildingKind, target: number, id?: string) => {
    const building = Object.values(state.buildings).find((b) =>
      id ? b.id === id : b.kind === kind,
    )!;
    if (!building) throw new Error(`Missing ${kind}`);
    while (state.buildings[building.id].level < target) {
      const b = state.buildings[building.id],
        quote = buildingUpgrade(kind, b.level)!;
      buy('UPGRADE', b.id, {}, quote.cost);
      record(`${BUILDINGS[kind].name} niveau ${quote.level}`);
    }
  };
  for (const k of ['LUMBER', 'QUARRY', 'MINE', 'FARM', 'HOUSE', 'WAREHOUSE', 'MARKET'] as const)
    build(k);
  for (const k of ['LUMBER', 'QUARRY', 'MINE', 'MARKET'] as const) upgrade(k, producerLevel);
  for (const k of [
    'WORKSHOP',
    'GOLD_MINE',
    'FORGE',
    'STEAM_SAWMILL',
    'MECHANIZED_QUARRY',
    'INDUSTRIAL_MINE',
    'BARRACKS',
    'ARSENAL',
  ] as const)
    build(k);
  for (const k of ['GOLD_MINE', 'STEAM_SAWMILL', 'MECHANIZED_QUARRY', 'INDUSTRIAL_MINE'] as const)
    upgrade(k, producerLevel);
  upgrade('ARSENAL', 3);
  for (const k of [
    'MONASTERY',
    'LIBRARY',
    'OCCULT_LAB',
    'OCCULT_SAWMILL',
    'RUNIC_QUARRY',
    'ABYSSAL_MINE',
    'REFINERY',
    'ALCHEMY_FOUNDRY',
  ] as const)
    build(k);
  for (const k of ['OCCULT_SAWMILL', 'RUNIC_QUARRY', 'ABYSSAL_MINE', 'ALCHEMY_FOUNDRY'] as const)
    upgrade(k, producerLevel);
  upgrade('ARSENAL', 4);
  for (const k of ['MUNITIONS', 'ISOTOPE_LAB', 'NUCLEAR_REACTOR'] as const) build(k);
  upgrade('NUCLEAR_REACTOR', 3);
  upgrade('ARSENAL', 5);
  ensureStage(5);
  build('GLOCKE_COMPLEX');
  upgrade('GLOCKE_COMPLEX', 5);
  return rows;
}
const specimen = (kind: UnitKind, trainingBonus: number): Unit => ({
  kind,
  trainingBonus,
  id: kind,
  ownerId: kind,
  q: 0,
  r: 0,
  hp: unitStats({ kind, trainingBonus }).hp,
  createdAt: 0,
  updatedAt: 0,
});
export function simulateCombat(
  attacker: UnitKind,
  level: number,
  target: UnitKind,
  targetLevel: number,
) {
  const a = specimen(attacker, trainingBonusAt(UNIT_PROFILES[attacker].recruitAt[0], level));
  const b = specimen(target, trainingBonusAt(UNIT_PROFILES[target].recruitAt[0], targetLevel));
  const damage = estimateDamage(a, b, { q: 0, r: 0, terrain: 'PLAIN' }, [], 'PLAIN');
  return {
    damage,
    shots: Math.ceil(b.hp / damage.min),
    ap: Math.ceil(b.hp / damage.min) * attackCost(a),
    hp: b.hp,
  };
}
/** Stationary close-range exchange, one PA of tempo per camp per step.
 * Commands, targeting, random damage, kills and veteran gains use the real server.
 */
export function simulateSkirmish(
  kind: UnitKind,
  count: number,
  level: number,
  opponent: UnitKind,
  opponentLevel: number,
  seed = 0,
) {
  const now = 1_900_000_000_000;
  let state = createState(`skirmish-${seed}`, now);
  for (const id of ['a', 'b']) {
    state.realms[id] = createRealm(id, id, 'MASK', { q: id === 'a' ? -5 : 5, r: 0 }, now);
    state.realms[id].protectedUntil = 0;
    state.realms[id].ap = 0;
  }
  const terrain = UNIT_PROFILES[kind].naval && UNIT_PROFILES[opponent].naval ? 'SEA' : 'PLAIN';
  for (const p of disk({ q: 0, r: 0 }, 6)) writeTile(state, p, { terrain });
  const positions = [
    { q: 0, r: 0 },
    { q: 0, r: 1 },
    { q: 1, r: -1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: -1, r: 1 },
    { q: 1, r: 0 },
  ];
  for (let i = 0; i < count; i++)
    state.units[`a${i}`] = {
      ...specimen(kind, trainingBonusAt(UNIT_PROFILES[kind].recruitAt[0], level)),
      id: `a${i}`,
      ownerId: 'a',
      ...positions[i],
    };
  state.units.b0 = {
    ...specimen(opponent, trainingBonusAt(UNIT_PROFILES[opponent].recruitAt[0], opponentLevel)),
    id: 'b0',
    ownerId: 'b',
    q: 2,
    r: 0,
  };
  // Coast/fleet scenarios retain legal terrain for each stationary participant.
  for (const u of Object.values(state.units))
    if (UNIT_PROFILES[u.kind].naval) writeTile(state, u, { terrain: 'SEA' });
  const spent = { a: 0, b: 0 };
  for (let step = 0; step < 250; step++) {
    for (const id of (seed % 2 ? ['b', 'a'] : ['a', 'b']) as ('a' | 'b')[]) {
      state.realms[id].ap++;
      const friendly = Object.values(state.units).filter((u) => u.ownerId === id);
      const enemies = Object.values(state.units)
        .filter((u) => u.ownerId !== id)
        .sort((a, b) => a.hp - b.hp);
      if (!friendly.length || !enemies.length)
        return {
          winner: friendly.length ? id : id === 'a' ? 'b' : 'a',
          spent,
          survivors: Object.values(state.units).length,
        };
      const actor = friendly.find(
        (u) =>
          state.realms[id].ap >= attackCost(u) &&
          enemies.some((t) => distance(u, t) <= unitStats(u).range),
      );
      if (!actor) continue;
      const target = enemies.find((t) => distance(actor, t) <= unitStats(actor).range)!;
      const h = createHash('sha256').update(`${seed}:${step}:${id}`).digest('hex');
      const actionId = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
      const result = execute(
        state,
        id,
        actionSchema.parse({
          type: 'ATTACK',
          actorId: actor.id,
          payload: { targetId: target.id },
          actionId,
          clientTimestamp: now,
        }),
        now,
      );
      if (!result.result.accepted) throw new Error(result.result.reason);
      spent[id] += attackCost(actor);
      state = result.state;
    }
  }
  return { winner: 'draw', spent, survivors: Object.values(state.units).length };
}
if (process.argv[1]?.endsWith('simulate-balance.ts')) {
  const f = (n: number) => Math.round(n * 10) / 10;
  const rows = simulateDevelopment();
  const reinvested = simulateDevelopment(5);
  const lines = [
    '# Simulations d’équilibrage v0.7',
    '',
    'Reproduction : `node --import tsx scripts/simulate-balance.ts`. Le modèle emploie les commandes BUILD/UPGRADE/GATHER du serveur : dépenses, prérequis, stockage, production nette et PA réels. Départ après 13 récoltes manuelles, un paysan gratuit et six déplacements (20 PA utilisés), puis fouille active de ruines proches jusqu’au premier marché. Chantiers favorables considérés accessibles et revendiqués, déplacement et conquête ultérieurs exclus, joueur présent en continu, aucune récompense ni attaque adverse, contamination non simulée. Les durées sont des repères de ce parcours économique, pas une promesse de durée de partie ni un parcours optimal.',
    '',
    '| Investissement | Minutes actives cumulées | Capacité par ressource | Or/min net | Bois/min net | Pierre/min net | Fer/min net |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map(
      (r) =>
        `| ${r.action} | ${f(r.minutes)} | ${r.cap} | ${f(r.rates.GOLD)} | ${f(r.rates.WOOD)} | ${f(r.rates.STONE)} | ${f(r.rates.IRON)} |`,
    ),
    '',
    '## Amortissement des améliorations de producteurs',
    '',
    'Total de toutes les ressources payées divisé par le supplément de production du matériau extrait ; indicateur de rendement matériel à valeurs égales, hors chaîne d’accès et PA. Les matériaux ne sont pas interchangeables et ce ratio ne garantit pas la rentabilité stratégique.',
    '',
    '| Producteur | Niveau obtenu | Gain/min | Ressources investies / gain par minute |',
    '| --- | ---: | ---: | ---: |',
  ];
  for (const k of ['LUMBER', 'STEAM_SAWMILL', 'OCCULT_SAWMILL', 'GOLD_MINE'] as const)
    for (const l of [1, 2, 3, 4]) {
      const gain =
        Object.values(BUILDINGS[k].production).reduce((a, b) => a + b, 0) *
        (productionMultiplier(k, l + 1) - productionMultiplier(k, l));
      lines.push(
        `| ${BUILDINGS[k].name} | ${l + 1} | ${f(gain)} | ${f(Object.values(buildingUpgrade(k, l)!.cost).reduce((a, b) => a + b, 0) / gain)} min |`,
      );
    }
  lines.push(
    '',
    '## Variante : réinvestissement économique au niveau 5',
    '',
    'Même chemin, mais les producteurs passent au niveau 5 avant la phase suivante : plus de dépenses initiales, davantage de débit ensuite. Sans bonus gratuits.',
    '',
    '| Jalon | Producteurs niveau 3 | Producteurs niveau 5 |',
    '| --- | ---: | ---: |',
  );
  for (const name of ['Arsenal', 'Arsenal niveau 3', 'Arsenal niveau 4', 'Arsenal niveau 5'])
    lines.push(
      `| ${name} | ${f(rows.find((r) => r.action === name)!.minutes)} min | ${f(reinvested.find((r) => r.action === name)!.minutes)} min |`,
    );
  lines.push(
    '',
    '## Tirs sur cible immobile',
    '',
    'Sans riposte, couvert, rempart, héros ou rareté ; dégâts minimums pour compter les tirs. Ces essais mesurent le rendement des armes et ne prédisent pas seuls le vainqueur d’un duel.',
    '',
    '| Attaquant (niveau du recruteur) | Cible (niveau) | Dégâts/tir | Tirs | PA |',
    '| --- | --- | ---: | ---: | ---: |',
  );
  for (const [a, l, b, bl] of [
    ['INFANTRY', 1, 'MILITIA', 1],
    ['MAUSOLEUM_TANK', 5, 'INFANTRY', 1],
    ['RIFLEMAN', 3, 'MAUSOLEUM_TANK', 5],
    ['BAZOOKA', 3, 'MAUSOLEUM_TANK', 5],
    ['FLAK_CANNON', 3, 'GLOCKE_APOCALYPSE', 5],
    ['RIFLEMAN', 3, 'GLOCKE_APOCALYPSE', 5],
    ['GIVR_RIFLE', 3, 'RADIUM_GRENADIER', 5],
  ] as [UnitKind, number, UnitKind, number][]) {
    const s = simulateCombat(a, l, b, bl);
    lines.push(
      `| ${UNITS[a].name} (${l}) | ${UNITS[b].name} (${bl}) | ${s.damage.min}–${s.damage.max} | ${s.shots} | ${s.ap} |`,
    );
  }
  lines.push(
    '',
    '## Escarmouches avec ordres des deux camps',
    '',
    '20 graines déterministes par scénario, initiative alternée. Terrain plat, unités immobiles à portée réciproque, un PA de tempo par camp et par étape ; les attaques de siège attendent deux étapes. Vraies commandes serveur, morts et vétérans inclus. Aucune régénération, aura, mur ou manœuvre : ce modèle compare les spécialisations au contact, pas toutes les stratégies possibles.',
    '',
    '| Groupe niveau 3 | Adversaire niveau 5 | Victoires du groupe / 20 | Coût en or groupe / adversaire |',
    '| --- | --- | ---: | ---: |',
  );
  for (const [k, n, target] of [
    ['BAZOOKA', 1, 'MAUSOLEUM_TANK'],
    ['BAZOOKA', 6, 'MAUSOLEUM_TANK'],
    ['RIFLEMAN', 6, 'MAUSOLEUM_TANK'],
    ['FLAK_CANNON', 7, 'GLOCKE_APOCALYPSE'],
  ] as [UnitKind, number, UnitKind][]) {
    const wins = Array.from({ length: 20 }, (_, seed) =>
      simulateSkirmish(k, n, 3, target, 5, seed),
    ).filter((r) => r.winner === 'a').length;
    lines.push(
      `| ${n} × ${UNITS[k].name} | ${UNITS[target].name} | ${wins} | ${UNITS[k].cost.GOLD * n} / ${UNITS[target].cost.GOLD} |`,
    );
  }
  writeFileSync('docs/balance-simulations.md', lines.join('\n') + '\n');
  console.log(
    rows.filter(
      (r) => r.action.includes('Arsenal') || r.action === 'Scierie' || r.action === 'Réacteur noir',
    ),
  );
}
