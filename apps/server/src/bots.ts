import { unitStats } from '@voidmarch/game-rules';
import { randomInt, randomUUID } from 'node:crypto';
import {
  BUILDINGS,
  BUILDING_REQUIREMENTS,
  unitPopulation,
  UNIT_PROFILES,
  RULES,
  UNITS,
  type Faction,
  type UnitKind,
} from '@voidmarch/config';
import {
  amount,
  armyPopulation,
  movementCost,
  wallBlocks,
  resolveAttack,
  canAfford,
  createRealm,
  distance,
  hash,
  hostileReason,
  key,
  neighbors,
  realmBuildings,
  realmUnits,
  refreshAP,
  tileAt,
  vision,
} from '@voidmarch/game-rules';
import type { Action } from '@voidmarch/protocol';
import type { GameState, Hex, Realm } from '@voidmarch/shared';
import {
  defaultOptions,
  execute,
  log,
  removePresence,
  refreshEnclosures,
  settle,
  spawnPosition,
  type EngineOptions,
} from './engine.js';
const names = [
  'Vardek le Pâle',
  'Dame Ysra des Fosses',
  'Ordre de Mor-Khal',
  'Enfants de l’Éclipse',
  'Veilleurs de l’Astre',
];
const personalities = [
  'AGGRESSIVE',
  'EXPANSIONIST',
  'TURTLE',
  'SCAVENGER',
  'CULTIST',
  'OPPORTUNIST',
];
const homes: Hex[] = [
  { q: -7, r: -9 },
  { q: 12, r: -9 },
  { q: -12, r: 13 },
  { q: 16, r: 9 },
  { q: 0, r: -22 },
];
type Intent = { command: Omit<Action, 'actionId' | 'clientTimestamp'>; score: number };
export class BotDirector {
  constructor(private options: EngineOptions = defaultOptions) {}
  reconcile(s: GameState, now: number, humans: number) {
    const target = humans === 0 ? 5 : humans === 1 ? 4 : 3;
    for (const bot of Object.values(s.realms).filter(
      (r) => r.bot && r.defeatedAt && now - r.defeatedAt > RULES.defeatCooldown,
    )) {
      delete s.realms[bot.id];
      refreshEnclosures(s, now);
      delete s.archives[bot.id];
    }
    let bots = Object.values(s.realms).filter((r) => r.bot && !r.defeatedAt);
    const waiting = Object.values(s.realms).filter((r) => r.bot && r.defeatedAt).length;
    while (bots.length + waiting < target) {
      const i = s.botSerial++,
        id = randomUUID(),
        r = createRealm(
          id,
          `${names[i % names.length]}${i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''}`,
          (['MASK', 'IRON', 'ASH'] as Faction[])[i % 3],
          i < 5 &&
            Object.values(s.realms).every(
              (other) =>
                other.defeatedAt ||
                distance(other.capital, {
                  q: homes[i].q * RULES.settlementScale,
                  r: homes[i].r * RULES.settlementScale,
                }) >= RULES.realmSpacing,
            )
            ? { q: homes[i].q * RULES.settlementScale, r: homes[i].r * RULES.settlementScale }
            : spawnPosition(s, id),
          now,
          true,
        );
      r.personality = personalities[i % personalities.length];
      r.temporary = bots.length >= 3;
      r.nextBotAt = now + this.options.botInterval * (0.85 + hash(id) * 0.3);
      settle(s, r, now);
      bots.push(r);
    }
    const retirees = bots
      .filter((b) => b.temporary && now - b.createdAt > 1_800_000)
      .sort((a, b) => a.createdAt - b.createdAt);
    while (bots.length > target && retirees.length) {
      const bot = retirees.shift()!;
      const pending = Object.values(s.treaties).some(
        (t) => t.endsAt > now && (t.a === bot.id || t.b === bot.id),
      );
      if (pending) continue;
      removePresence(s, bot);
      delete s.realms[bot.id];
      refreshEnclosures(s, now);
      bots = bots.filter((b) => b.id !== bot.id);
      log(s, `${bot.name} a quitté les Marches.`, 'WORLD', now);
    }
  }
  tick(s: GameState, now: number, humans: number) {
    this.reconcile(s, now, humans);
    if (humans === 0) return;
    for (const id of Object.values(s.realms)
      .filter((r) => r.bot && !r.defeatedAt)
      .map((r) => r.id)) {
      let bot = s.realms[id];
      bot.lastSeen = now;
      bot.offlineAt = undefined;
      if (bot.nextBotAt > now) continue;
      refreshAP(bot, now, this.options.apInterval);
      const count = randomInt(4);
      for (let i = 0; i < count; i++) {
        bot = s.realms[id];
        const choice = this.intent(s, bot, now);
        if (!choice) break;
        const result = execute(
          s,
          id,
          { ...choice.command, actionId: randomUUID(), clientTimestamp: now } as Action,
          now,
          this.options,
        );
        if (result.result.accepted) Object.assign(s, result.state);
      }
      s.realms[id].nextBotAt = now + this.options.botInterval * (0.85 + hash(`${id}:${now}`) * 0.3);
    }
  }
  intent(s: GameState, r: Realm, now: number): Intent | undefined {
    const intents: Intent[] = [],
      seen = vision(s, r),
      units = realmUnits(s, r.id),
      buildings = realmBuildings(s, r.id);
    const add = (command: Intent['command'], score: number) =>
      intents.push({
        command,
        score: score + hash(`${r.id}:${JSON.stringify(command)}:${Math.floor(now / 600000)}`) * 8,
      });
    for (const p of Object.values(s.proposals).filter(
      (p) => p.to === r.id && p.status === 'PENDING' && p.expiresAt > now,
    )) {
      const paying = p.payer === r.id;
      const expected = Math.max(
        10,
        (p.duration / 60_000) * (r.personality === 'AGGRESSIVE' ? 1.2 : 0.5),
      );
      const accept =
        p.kind === 'TRADE'
          ? amount(p.offer) >= amount(p.request) * 0.8
          : paying
            ? amount(p.offer) < amount(r.wallet) * 0.15
            : amount(p.offer) >= expected;
      add(
        {
          type: 'RESPOND',
          actorId: r.id,
          payload: { proposalId: p.id, decision: accept ? 'ACCEPT' : 'REJECT' },
        },
        150,
      );
    }
    for (const u of units) {
      const tile = tileAt(s, u);
      if (
        UNITS[u.kind].capture &&
        !wallBlocks(s.buildings[tile.buildingId ?? ''], r.id) &&
        tile.ownerId !== r.id &&
        (!tile.ownerId ||
          !hostileReason(s, r, s.realms[tile.ownerId], now, this.options.offlineProtection))
      )
        add(
          { type: 'CAPTURE', actorId: u.id, payload: {} },
          80 + (r.personality === 'EXPANSIONIST' ? 25 : 0),
        );
      if (
        u.hp < unitStats(u).hp * 0.5 &&
        canAfford(
          r.wallet,
          UNIT_PROFILES[u.kind].mechanical ? { GOLD: 10, IRON: 10 } : { GOLD: 10, FOOD: 10 },
        )
      )
        add({ type: 'REPAIR', actorId: u.id, payload: {} }, 85);
      for (const enemy of [...Object.values(s.units), ...Object.values(s.buildings)]) {
        if (
          enemy.ownerId === r.id ||
          !s.realms[enemy.ownerId] ||
          !seen.has(key(enemy)) ||
          distance(u, enemy) > UNITS[u.kind].range ||
          hostileReason(s, r, s.realms[enemy.ownerId], now, this.options.offlineProtection)
        )
          continue;
        const resolved = resolveAttack(u, enemy, Object.values(s.buildings));
        if (
          resolved.reason ||
          hostileReason(
            s,
            r,
            s.realms[resolved.target.ownerId],
            now,
            this.options.offlineProtection,
          )
        )
          continue;
        add(
          { type: 'ATTACK', actorId: u.id, payload: { targetId: enemy.id } },
          r.personality === 'AGGRESSIVE' ? 110 : 55,
        );
      }
      for (const e of Object.values(s.events))
        if (!e.claimedBy && e.endsAt > now && seen.has(key(e)) && distance(u, e) <= 1)
          add({ type: 'INTERACT', actorId: u.id, payload: { eventId: e.id } }, 100);
      for (const p of neighbors(u)) {
        const t = tileAt(s, p);
        if (
          !seen.has(key(p)) ||
          wallBlocks(s.buildings[t.buildingId ?? ''], r.id, u.kind) ||
          movementCost(t, u.kind) > UNITS[u.kind].move ||
          Object.values(s.units).some((x) => distance(x, p) === 0)
        )
          continue;
        add(
          { type: 'MOVE', actorId: u.id, payload: { path: [p] } },
          t.ownerId === r.id
            ? 10
            : 30 + (UNITS[u.kind].capture ? 10 : 0) + Math.min(10, distance(p, r.capital)),
        );
      }
    }
    if (
      units.length < Math.min(10, buildings.reduce((n, b) => n + b.population, 0) / 5) &&
      canAfford(r.wallet, UNITS.INFANTRY.cost)
    ) {
      const choices: UnitKind[] = [
        'TANK',
        'BAZOOKA',
        'MOTORCYCLE',
        'RIFLEMAN',
        r.personality === 'SCAVENGER' ? 'SCOUT' : 'INFANTRY',
      ];
      const kind = choices.find(
        (kind) =>
          canAfford(r.wallet, UNITS[kind].cost) &&
          armyPopulation(units) + unitPopulation(kind) <=
            Math.max(
              15,
              buildings.reduce((n, b) => n + b.population, 0),
            ) &&
          UNIT_PROFILES[kind].requires.every((req) => buildings.some((b) => b.kind === req)) &&
          buildings.some((b) => UNIT_PROFILES[kind].recruitAt.includes(b.kind)) &&
          (!units.some((u) => u.kind === kind) || kind === choices[choices.length - 1]),
      );
      const b = kind && buildings.find((b) => UNIT_PROFILES[kind].recruitAt.includes(b.kind));
      if (b)
        add(
          {
            type: 'RECRUIT',
            actorId: b.id,
            payload: { kind: kind! },
          },
          units.length < 3 ? 100 : 25,
        );
    }
    for (const t of Object.values(s.tiles).filter((t) => t.ownerId === r.id && !t.buildingId))
      for (const kind of [
        'FARM',
        'LUMBER',
        'MINE',
        'QUARRY',
        'MARKET',
        'TOWER',
        'BARRACKS',
        'WORKSHOP',
        'FORGE',
        'ARSENAL',
        'GARAGE',
        'REFINERY',
        'MUNITIONS',
        'TANK_FACTORY',
        'BUNKER',
      ] as const)
        if (
          BUILDINGS[kind].terrains.includes(t.terrain) &&
          canAfford(r.wallet, BUILDINGS[kind].cost) &&
          !buildings.some((b) => b.kind === kind) &&
          (BUILDING_REQUIREMENTS[kind] ?? []).every((req) => buildings.some((b) => b.kind === req))
        )
          add(
            { type: 'BUILD', actorId: r.id, payload: { q: t.q, r: t.r, kind } },
            r.personality === 'TURTLE' ? 70 : 45,
          );
    intents.sort((a, b) => b.score - a.score);
    return intents[0];
  }
}
