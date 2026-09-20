import { prepareDevelopment } from './fixtures/development';
import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { BUILDINGS, UNITS, UNIT_PROFILES, type BuildingKind } from '@voidmarch/config';
import {
  createState,
  createRealm,
  realmBuildings,
  realmUnits,
  unitStats,
  vision,
  writeTile,
  disk,
  key,
  armyPopulation,
  accrueEconomy,
} from '@voidmarch/game-rules';
import { BotDirector } from '../apps/server/src/bots';
import { botDevelopment, botRecruitmentSite } from '../apps/server/src/bot-development';
import {
  addBuilding,
  execute,
  settle,
  settleFounding,
  defaultOptions,
} from '../apps/server/src/engine';
import { simulateBot } from '../scripts/simulate-bots';
import type { Action } from '@voidmarch/protocol';

const now = 1900000000000;
function fixture() {
  const s = createState('bot-recovery', now);
  const r = createRealm('bot', 'Bot', 'ASH', { q: 0, r: 0 }, now, true);
  settle(s, r, now);
  return { s, r, director: new BotDirector() };
}
const action = (command: NonNullable<ReturnType<BotDirector['intent']>>['command']): Action =>
  ({ ...command, actionId: randomUUID(), clientTimestamp: now }) as Action;
function peasant(s: ReturnType<typeof createState>, q = 0, r = 0) {
  return (s.units.worker = {
    id: 'worker',
    ownerId: 'bot',
    kind: 'PEASANT',
    q,
    r,
    hp: UNITS.PEASANT.hp,
    createdAt: now,
    updatedAt: now,
  });
}

describe('développement autonome des bots', () => {
  it('forme son paysan prioritairement, même sans vivres ni capacité militaire libre', () => {
    const { s, r, director } = fixture();
    r.wallet = { GOLD: 0, WOOD: 0, STONE: 0, IRON: 0, FOOD: 0 };
    for (const b of realmBuildings(s, r.id)) b.population = 0;
    const intent = director.intent(s, r, now)!;
    expect(intent.command.type).toBe('RECRUIT');
    expect(intent.command.payload).toEqual({ kind: 'PEASANT' });
    const result = execute(s, r.id, action(intent.command), now);
    expect(result.result.accepted).toBe(true);
    expect(realmUnits(result.state, r.id).filter((u) => u.kind === 'PEASANT')).toHaveLength(1);
    expect(result.state.realms.bot.wallet).toEqual(r.wallet);
    expect(result.state.realms.bot.ap).toBe(r.ap - 1);
  });

  it('remplace un bâtisseur perdu et ne remplit pas son armée de paysans', () => {
    const { s, r, director } = fixture();
    peasant(s);
    const buildings = realmBuildings(s, r.id);
    r.wallet = { GOLD: 100000, WOOD: 100000, STONE: 100000, IRON: 100000, FOOD: 100000 };
    const planned = botDevelopment(s, r, vision(s, r));
    expect(planned.intents.some((i) => i.command.type === 'RECRUIT')).toBe(false);
    delete s.units.worker;
    expect(director.intent(s, r, now)?.command.payload).toEqual({ kind: 'PEASANT' });
    expect(realmBuildings(s, r.id)).toEqual(buildings);
  });

  it('envoie le bâtisseur au chantier puis construit sur du terrain neutre compatible', () => {
    let { s, r } = fixture();
    peasant(s, 0, 0);
    r.wallet = { GOLD: 2000, WOOD: 2000, STONE: 2000, IRON: 2000, FOOD: 2000 };
    // Leave a single quarry site outside the owned ring; all other terrain is plain.
    for (const p of disk(r.capital, 9)) writeTile(s, p, { terrain: 'PLAIN' });
    const site = { q: 4, r: 0 };
    writeTile(s, site, { terrain: 'MOUNTAIN', ownerId: undefined });
    addBuilding(s, r, { q: 2, r: 0 }, 'HOUSE', now);
    const director = new BotDirector();
    let built = false,
      moved = false;
    for (let n = 0; n < 12; n++) {
      const intent = director.intent(s, s.realms.bot, now)!;
      expect(intent).toBeDefined();
      if (intent.command.type === 'MOVE' && intent.command.actorId === 'worker') moved = true;
      if (intent.command.type === 'BUILD' && intent.command.payload.kind === 'QUARRY') {
        expect(intent.command.actorId).toBe('worker');
        expect(intent.command.payload).toMatchObject(site);
        built = true;
      }
      const result = execute(s, 'bot', action(intent.command), now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      s = result.state;
      if (built) break;
    }
    expect(moved).toBe(true);
    expect(built).toBe(true);
    expect(s.tiles[key(site)].ownerId).toBe('bot');
  });

  it('respecte les niveaux, les prérequis et les places de recrutement', () => {
    const { s, r } = fixture();
    r.wallet = { GOLD: 100000, WOOD: 100000, STONE: 100000, IRON: 100000, FOOD: 100000 };
    s.units = {};
    const barracks = realmBuildings(s, r.id).find((b) => b.kind === 'BARRACKS')!;
    expect(botRecruitmentSite(s, r, 'RIFLEMAN', vision(s, r))).toBeUndefined();
    const arsenal = addBuilding(s, r, { q: 1, r: 1 }, 'ARSENAL', now);
    addBuilding(s, r, { q: 0, r: 1 }, 'MUNITIONS', now);
    prepareDevelopment(s, r.id, 3, now);
    expect(botRecruitmentSite(s, r, 'RIFLEMAN', vision(s, r))?.id).toBe(arsenal.id);
    delete s.buildings[arsenal.id];
    expect(botRecruitmentSite(s, r, 'RIFLEMAN', vision(s, r))).toBeUndefined();
    s.buildings[arsenal.id] = arsenal;
    arsenal.hp = 0;
    expect(botRecruitmentSite(s, r, 'RIFLEMAN', vision(s, r))).toBeUndefined();
    arsenal.hp = BUILDINGS.ARSENAL.hp;
    barracks.level = 3;
    expect(botRecruitmentSite(s, r, 'RIFLEMAN', vision(s, r))).toBeDefined();
  });

  it('démarre aussi avec un seul campement et aucun stock', () => {
    let s = createState('founding-bot', now);
    const r = createRealm('bot', 'Pionnier', 'ASH', { q: 0, r: 0 }, now, true);
    settleFounding(s, r, now);
    const director = new BotDirector();
    const orders: string[] = [];
    for (let n = 0; n < 15; n++) {
      const time = now + (n + 1) * 60000;
      s.realms.bot.lastSeen = time;
      accrueEconomy(s, s.realms.bot, time);
      s.realms.bot.ap = 20;
      const intent = director.intent(s, s.realms.bot, time)!;
      expect(intent).toBeDefined();
      const result = execute(s, 'bot', action(intent.command), time);
      expect(result.result.accepted, result.result.reason).toBe(true);
      s = result.state;
      orders.push(intent.command.type);
      if (realmBuildings(s, 'bot').some((b) => b.kind === 'LUMBER')) break;
    }
    expect(orders).toContain('GATHER');
    expect(realmBuildings(s, 'bot').some((b) => b.kind === 'LUMBER')).toBe(true);
  });

  it('évite de retenter la même décision rejetée dans la série', () => {
    const { s, r, director } = fixture();
    const first = director.intent(s, r, now)!;
    const next = director.intent(s, r, now, new Set([JSON.stringify(first.command)]));
    expect(next?.command).not.toEqual(first.command);
  });

  it('conserve 3 à 10 décisions par bot et son sommeil sans humain', () => {
    const s = createState('bot-budget', now),
      director = new BotDirector();
    director.reconcile(s, now, 0);
    for (const r of Object.values(s.realms)) r.nextBotAt = now;
    const spy = vi.spyOn(director, 'intent');
    director.tick(s, now, 0);
    expect(spy).not.toHaveBeenCalled();
    director.tick(s, now, 1);
    for (const r of Object.values(s.realms)) {
      const calls = spy.mock.calls.filter((args) => args[1].id === r.id).length;
      expect(calls).toBeGreaterThanOrEqual(3);
      expect(calls).toBeLessThanOrEqual(10);
      expect(realmUnits(s, r.id).some((u) => UNIT_PROFILES[u.kind].builder)).toBe(true);
    }
  });

  it('prévoit un entrepôt lorsque le prochain niveau dépasse le stockage', () => {
    const { s, r } = fixture();
    s.units = {};
    peasant(s);
    r.wallet = { GOLD: 800, WOOD: 800, STONE: 800, IRON: 800, FOOD: 800 };
    addBuilding(s, r, { q: -3, r: 0 }, 'QUARRY', now);
    const barracks = realmBuildings(s, r.id).find((b) => b.kind === 'BARRACKS')!;
    barracks.level = 4;
    prepareDevelopment(s, r.id, 5, now);
    for (const b of realmBuildings(s, r.id)) if (b.kind === 'VILLAGE') b.population = 0;
    for (const p of disk({ q: 6, r: 0 }, 3).slice(0, 22)) addBuilding(s, r, p, 'HOUSE', now);
    const planned = botDevelopment(s, r, vision(s, r));
    expect(
      planned.intents.some(
        (i) => i.command.type === 'BUILD' && i.command.payload.kind === 'WAREHOUSE',
      ),
    ).toBe(true);
  });

  it('recrute des troupes de la nouvelle époque pendant une longue partie', () => {
    const result = simulateBot('bot-a', 'AGGRESSIVE', 24);
    expect(result.failures).toEqual([]);
    expect(result.history.at(-1)!.tier).toBeGreaterThanOrEqual(3);
    expect(result.history.at(-1)!.level).toBeGreaterThanOrEqual(3);
    expect(result.counts.ADVANCE_ERA).toBeGreaterThanOrEqual(2);
  });

  it.each(['bot-a', 'bot-b', 'bot-c'])(
    'progresse sur six heures de présence sans ordre invalide (%s)',
    (seed) => {
      const result = simulateBot(
        seed,
        seed === 'bot-a' ? 'AGGRESSIVE' : seed === 'bot-b' ? 'TURTLE' : 'EXPANSIONIST',
      );
      expect(result.failures).toEqual([]);
      const final = result.history.at(-1)!;
      expect(final.buildings).toBeGreaterThanOrEqual(16);
      expect(final.builders).toBeGreaterThanOrEqual(2);
      expect(final.builders).toBeLessThanOrEqual(3);
      expect(final.level).toBeGreaterThanOrEqual(2);
      expect(result.counts.UPGRADE).toBeGreaterThanOrEqual(10);
      expect(result.counts.ADVANCE_ERA).toBeGreaterThanOrEqual(1);
      expect(realmBuildings(result.state, 'bot').some((b) => b.kind === 'STEAM_SAWMILL')).toBe(
        true,
      );
      expect(Object.values(result.state.realms.bot.wallet).every((value) => value >= 0)).toBe(true);
    },
  );
});
