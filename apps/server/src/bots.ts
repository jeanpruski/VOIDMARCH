import { developmentProgress } from '@voidmarch/game-rules';
import { submarineVisible } from '@voidmarch/game-rules';
import { botDevelopment, botRecruitmentSite, type BotIntent } from './bot-development';
import { allRealmUnits, attackCost, income, recruitmentRequirement } from '@voidmarch/game-rules';
import { ACTION_COST, UNIT_TIERS, RESOURCES } from '@voidmarch/config';
import { repairPlan } from '@voidmarch/game-rules';
import { unitMovementBudget } from '@voidmarch/game-rules';
import { unitStats } from '@voidmarch/game-rules';
import { randomInt, randomUUID } from 'node:crypto';
import {
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
  disk,
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
import type { GameState, Realm } from '@voidmarch/shared';
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
type Intent = BotIntent;
export class BotDirector {
  constructor(private options: EngineOptions = defaultOptions) {}
  reconcile(s: GameState, now: number, humans: number) {
    const target = RULES.botCount;
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
          spawnPosition(s, id),
          now,
          true,
        );
      r.landSpawnVersion = 1;
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
      const count = randomInt(3, 11);
      const rejected = new Set<string>();
      for (let i = 0; i < count; i++) {
        bot = s.realms[id];
        const choice = this.intent(s, bot, now, rejected);
        if (!choice) break;
        const result = execute(
          s,
          id,
          { ...choice.command, actionId: randomUUID(), clientTimestamp: now } as Action,
          now,
          this.options,
        );
        if (result.result.accepted) Object.assign(s, result.state);
        else rejected.add(JSON.stringify(choice.command));
      }
      s.realms[id].nextBotAt = now + this.options.botInterval * (0.85 + hash(`${id}:${now}`) * 0.3);
    }
  }
  intent(s: GameState, r: Realm, now: number, rejected = new Set<string>()): Intent | undefined {
    const intents: Intent[] = [],
      seen = vision(s, r),
      units = realmUnits(s, r.id),
      buildings = realmBuildings(s, r.id);
    const add = (command: Intent['command'], score: number) =>
      intents.push({
        command,
        score: score + hash(`${r.id}:${JSON.stringify(command)}:${Math.floor(now / 600000)}`) * 8,
      });
    const territorySize = Object.values(s.tiles).filter((t) => t.ownerId === r.id).length;
    const development = botDevelopment(s, r, seen);
    for (const intent of development.intents) add(intent.command, intent.score);
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
        !UNIT_PROFILES[u.kind].builder &&
        buildings.some((b) => distance(b, u) <= RULES.constructionRadius) &&
        Object.values(s.tiles).filter((t) => t.ownerId === r.id).length <
          buildings.length * 4 + 8 &&
        UNITS[u.kind].capture &&
        !wallBlocks(s.buildings[tile.buildingId ?? ''], r.id) &&
        tile.ownerId !== r.id &&
        (!tile.ownerId ||
          (s.realms[tile.ownerId] &&
            !hostileReason(s, r, s.realms[tile.ownerId], now, this.options.offlineProtection)))
      )
        add(
          { type: 'CAPTURE', actorId: u.id, payload: {} },
          25 + (r.personality === 'EXPANSIONIST' ? 10 : 0),
        );
      if (
        u.hp < unitStats(u).hp * 0.5 &&
        !repairPlan(u, now).reason &&
        canAfford(r.wallet, repairPlan(u, now).cost)
      )
        add({ type: 'REPAIR', actorId: u.id, payload: {} }, 85);
      for (const enemy of [...Object.values(s.units), ...Object.values(s.buildings)]) {
        if (
          unitStats(u).attack <= 0 ||
          UNIT_PROFILES[u.kind].builder ||
          r.ap < attackCost(u) ||
          enemy.ownerId === r.id ||
          !s.realms[enemy.ownerId] ||
          !seen.has(key(enemy)) ||
          (!('population' in enemy) && !submarineVisible(s, r.id, enemy, now)) ||
          distance(u, enemy) > UNITS[u.kind].range ||
          hostileReason(s, r, s.realms[enemy.ownerId], now, this.options.offlineProtection)
        )
          continue;
        const resolved = resolveAttack(u, enemy, Object.values(s.buildings), (p) => tileAt(s, p));
        if (
          resolved.reason ||
          !s.realms[resolved.target.ownerId] ||
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
      if (UNIT_PROFILES[u.kind].builder) continue;
      for (const p of neighbors(u)) {
        const t = tileAt(s, p);
        if (
          (distance(p, r.capital) > 18 && distance(p, r.capital) >= distance(u, r.capital)) ||
          !seen.has(key(p)) ||
          wallBlocks(s.buildings[t.buildingId ?? ''], r.id, u.kind) ||
          movementCost(t, u.kind) > unitMovementBudget(u, tileAt(s, u).biome, r.faction) ||
          Object.values(s.units).some((x) => distance(x, p) === 0)
        )
          continue;
        const reveals = disk(p, unitStats(u).vision).some((h) => !r.explored[key(h)]);
        const claimable =
          !!UNITS[u.kind].capture &&
          !t.ownerId &&
          buildings.some((b) => distance(b, p) <= RULES.constructionRadius);
        const approaching = Object.values(s.units).some(
          (enemy) =>
            enemy.ownerId !== r.id &&
            seen.has(key(enemy)) &&
            distance(p, enemy) < distance(u, enemy) &&
            distance(enemy, r.capital) <= 18,
        );
        const returning =
          distance(u, r.capital) > 18 && distance(p, r.capital) < distance(u, r.capital);
        if (!reveals && !claimable && !approaching && !returning) continue;
        add(
          { type: 'MOVE', actorId: u.id, payload: { path: [p] } },
          t.ownerId === r.id ? 10 : 20 + (UNITS[u.kind].capture ? 5 : 0),
        );
      }
    }
    const army = allRealmUnits(s, r.id).filter(
      (u) => !UNIT_PROFILES[u.kind].builder && u.kind !== 'HERO',
    );
    const sparePopulation =
      buildings.reduce((n, b) => n + b.population, 0) - armyPopulation(allRealmUnits(s, r.id));
    if (
      army.length < Math.min(30, Math.max(6, Math.floor(buildings.length * 0.75))) &&
      sparePopulation > 15
    ) {
      const rates = income(s, r.id);
      const unlocked = (Object.keys(UNITS) as UnitKind[]).filter(
        (kind) =>
          !UNIT_PROFILES[kind].builder &&
          !UNIT_PROFILES[kind].hero &&
          !UNIT_PROFILES[kind].transport &&
          buildings.some(
            (b) => !recruitmentRequirement(kind, b, buildings, developmentProgress(s, r.id)),
          ),
      );
      const latestTier = Math.max(1, ...unlocked.map((kind) => UNIT_TIERS[kind]));
      const choices = unlocked
        .filter(
          (kind) =>
            !UNIT_PROFILES[kind].builder &&
            !UNIT_PROFILES[kind].hero &&
            !UNIT_PROFILES[kind].transport &&
            UNITS[kind].attack > 0 &&
            UNIT_TIERS[kind] >= Math.max(1, latestTier - 1) &&
            (army.length < 3 || rates.FOOD > 0) &&
            (army.length < 3 ||
              RESOURCES.every(
                (resource) =>
                  r.wallet[resource] - UNITS[kind].cost[resource] >=
                  (development.reserve[resource] ?? 0) * 0.5,
              )),
        )
        .sort(
          (a, b) =>
            UNIT_TIERS[b] * 10 -
              army.filter((u) => u.kind === b).length * 15 -
              (UNIT_TIERS[a] * 10 - army.filter((u) => u.kind === a).length * 15) ||
            a.localeCompare(b),
        );
      for (const kind of choices) {
        if (sparePopulation - unitPopulation(kind) < 12) continue;
        const source = botRecruitmentSite(s, r, kind, seen);
        if (source) {
          add(
            { type: 'RECRUIT', actorId: source.id, payload: { kind } },
            army.length < 3 ? 125 : 116,
          );
          break;
        }
      }
    }
    intents.sort((a, b) => b.score - a.score);
    return intents.find(
      (intent) =>
        !rejected.has(JSON.stringify(intent.command)) &&
        r.ap >=
          (intent.command.type === 'ATTACK'
            ? attackCost(s.units[intent.command.actorId])
            : ACTION_COST[intent.command.type]),
    );
  }
}
