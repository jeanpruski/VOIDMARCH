import { describe, expect, it } from 'vitest';
import { RULES, UNITS } from '@voidmarch/config';
import {
  accrueEconomy,
  chunkOf,
  createRealm,
  createState,
  disk,
  distance,
  findPath,
  generateTile,
  income,
  key,
  refreshAP,
  tileAt,
  writeTile,
  zeroWallet,
} from '@voidmarch/game-rules';
import {
  addPlayer,
  defaultOptions,
  execute,
  settle,
  worldView,
  archive,
  defeat,
} from '../apps/server/src/engine';
import { tickWorld } from '../apps/server/src/simulation';
import { BotDirector } from '../apps/server/src/bots';
import type { Action } from '@voidmarch/protocol';
import type { GameState } from '@voidmarch/shared';
import { randomUUID } from 'node:crypto';
const now = 1_800_000_000_000;
function fixture() {
  const s = createState('test-seed', now);
  const a = addPlayer(s, 'a', 'Cendre', 'ASH', now, 'established'),
    b = createRealm('b', 'Masque', 'MASK', { q: 14, r: 0 }, now);
  settle(s, b, now);
  a.protectedUntil = 0;
  b.protectedUntil = 0;
  return s;
}
function command(type: Action['type'], actorId: string, payload: unknown): Action {
  return { type, actorId, payload, actionId: randomUUID(), clientTimestamp: now } as Action;
}
describe('hexagones et PA', () => {
  it('récupère un PA à 10 secondes et plafonne à 20 même hors ligne', () => {
    const r = { ap: 0, apAt: now };
    refreshAP(r, now + 9999);
    expect(r.ap).toBe(0);
    refreshAP(r, now + 10000);
    expect(r.ap).toBe(1);
    refreshAP(r, now + 20000);
    expect(r.ap).toBe(2);
    refreshAP(r, now + 3600000);
    expect(r.ap).toBe(20);
  });
  it('coordonnées axiales, distances et chunks négatifs sont cohérents', () => {
    expect(disk({ q: 0, r: 0 }, 2)).toHaveLength(19);
    expect(distance({ q: 0, r: 0 }, { q: 2, r: -2 })).toBe(2);
    expect(chunkOf({ q: -1, r: -33 })).toEqual({ q: -1, r: -2 });
  });
  it('génère un terrain déterministe indépendamment de l’ordre de lecture', () => {
    expect(generateTile('seed', { q: 33, r: -2 })).toEqual(generateTile('seed', { q: 33, r: -2 }));
  });
  it('ne stocke pas de temps gratuit lorsque les PA sont au plafond', () => {
    const r = { ap: RULES.maxAP, apAt: now };
    refreshAP(r, now + 600000);
    r.ap--;
    refreshAP(r, now + 600001);
    expect(r.ap).toBe(RULES.maxAP - 1);
    refreshAP(r, now + 630000);
    expect(r.ap).toBe(RULES.maxAP);
  });
  it('régénère les PA après sérialisation et redémarrage', () => {
    const r = JSON.parse(JSON.stringify({ ap: 0, apAt: now }));
    refreshAP(r, now + 20000);
    expect(r.ap).toBe(2);
    expect(r.apAt).toBe(now + 20000);
  });
  it('le pathfinding contourne une montagne et respecte le coût', () => {
    const path = findPath(
      { q: 0, r: 0 },
      { q: 2, r: 0 },
      (p) => ({ ...p, terrain: p.q === 1 && p.r === 0 ? 'MOUNTAIN' : 'PLAIN' }),
      3,
    );
    expect(path).toHaveLength(3);
    expect(path?.some((p) => p.q === 1 && p.r === 0)).toBe(false);
  });
});
describe('serveur autoritaire et rollback', () => {
  it('rejette un déplacement arbitraire sans dépenser de PA', () => {
    const s = fixture(),
      u = Object.values(s.units).find((u) => u.ownerId === 'a')!;
    const result = execute(s, 'a', command('MOVE', u.id, { path: [{ q: 100, r: 100 }] }), now);
    expect(result.result.accepted).toBe(false);
    expect(result.state).toBe(s);
    expect(s.realms.a.ap).toBe(RULES.startingAP);
  });
  it('rejette un acteur appartenant à un autre joueur', () => {
    const s = fixture(),
      u = Object.values(s.units).find((u) => u.ownerId === 'b')!;
    expect(
      execute(s, 'a', command('MOVE', u.id, { path: [{ q: u.q + 1, r: u.r }] }), now).result
        .accepted,
    ).toBe(false);
  });
  it('annule la dépense de PA si le portefeuille est insuffisant', () => {
    const s = fixture();
    s.realms.a.wallet = zeroWallet();
    writeTile(s, { q: 1, r: -1 }, { terrain: 'PLAIN', ownerId: 'a', buildingId: undefined });
    const result = execute(s, 'a', command('BUILD', 'a', { q: 1, r: -1, kind: 'FORT' }), now);
    expect(result.result.accepted).toBe(false);
    expect(result.state.realms.a.ap).toBe(RULES.startingAP);
  });
  it('ne permet ni double soin ni construction empilée', () => {
    const s = fixture(),
      b = Object.values(s.buildings).find((b) => b.ownerId === 'a')!;
    expect(
      execute(s, 'a', command('BUILD', 'a', { q: b.q, r: b.r, kind: 'FARM' }), now).result.accepted,
    ).toBe(false);
    expect(execute(s, 'a', command('REPAIR', b.id, {}), now).result.accepted).toBe(false);
  });
  it('préserve le royaume à sa position lors d’une déconnexion', () => {
    const s = fixture(),
      units = Object.keys(s.units),
      capital = { ...s.realms.a.capital };
    tickWorld(s, now + RULES.grace + 1, new Set());
    expect(s.realms.a.offlineAt).toBe(now + RULES.grace);
    expect(s.realms.a.capital).toEqual(capital);
    for (const id of units) expect(s.units[id]).toBeDefined();
    expect(s.archives.a.version).toBe(1);
    expect(s.archives.a.units.length).toBe(6);
  });
  it('arrête la production après la grâce sans supprimer les ressources', () => {
    const s = fixture(),
      r = s.realms.a,
      rates = income(s, 'a'),
      before = r.wallet.GOLD;
    accrueEconomy(s, r, now + 600000);
    expect(r.wallet.GOLD).toBeCloseTo(before + rates.GOLD * 3, 5);
    const gold = r.wallet.GOLD;
    accrueEconomy(s, r, now + 3600000);
    expect(r.wallet.GOLD).toBe(gold);
  });
  it('revient au même royaume sans créer une seconde armée', () => {
    const s = fixture();
    addPlayer(s, 'a', 'Cendre', 'ASH', now + 600000);
    expect(Object.values(s.units).filter((u) => u.ownerId === 'a')).toHaveLength(6);
  });
});
describe('diplomatie et concurrence logique', () => {
  function proposal(s: GameState) {
    return execute(
      s,
      'a',
      command('PROPOSE', 'a', {
        to: 'b',
        kind: 'TRIBUTE',
        payer: 'a',
        offer: { STONE: 0, GOLD: 50, WOOD: 10, IRON: 0, FOOD: 0 },
        request: zeroWallet(),
        duration: 3600000,
      }),
      now,
    );
  }
  it('une proposition n’offre aucune protection avant acceptation', () => {
    const { state, result } = proposal(fixture());
    expect(result.accepted).toBe(true);
    expect(Object.values(state.treaties)).toHaveLength(0);
  });
  it('transfère les ressources et crée une trêve en une seule acceptation', () => {
    let s = proposal(fixture()).state;
    const p = Object.values(s.proposals)[0],
      beforeA = s.realms.a.wallet.GOLD,
      beforeB = s.realms.b.wallet.GOLD;
    const a = command('RESPOND', 'b', { proposalId: p.id, decision: 'ACCEPT' });
    const first = execute(s, 'b', a, now);
    expect(first.result.accepted).toBe(true);
    s = first.state;
    expect(s.realms.a.wallet.GOLD).toBe(beforeA - 50);
    expect(s.realms.b.wallet.GOLD).toBe(beforeB + 50);
    expect(Object.values(s.treaties)).toHaveLength(1);
    expect(execute(s, 'b', a, now).result.accepted).toBe(false);
    expect(s.realms.b.wallet.GOLD).toBe(beforeB + 50);
  });
  it('rejette une acceptation dont les fonds ont été dépensés', () => {
    const s = proposal(fixture()).state;
    s.realms.a.wallet.GOLD = 0;
    const p = Object.values(s.proposals)[0],
      result = execute(
        s,
        'b',
        command('RESPOND', 'b', { proposalId: p.id, decision: 'ACCEPT' }),
        now,
      );
    expect(result.result.accepted).toBe(false);
    expect(s.proposals[p.id].status).toBe('PENDING');
    expect(Object.values(result.state.treaties)).toHaveLength(0);
  });
  it('la trêve empêche attaque et capture dans les deux directions, même hors ligne', () => {
    let s = proposal(fixture()).state;
    const p = Object.values(s.proposals)[0];
    s = execute(
      s,
      'b',
      command('RESPOND', 'b', { proposalId: p.id, decision: 'ACCEPT' }),
      now,
    ).state;
    const a = Object.values(s.units).find((u) => u.ownerId === 'a' && u.kind === 'INFANTRY')!,
      b = Object.values(s.units).find((u) => u.ownerId === 'b' && u.kind === 'INFANTRY')!;
    Object.assign(a, { q: 0, r: 0 });
    Object.assign(b, { q: 1, r: 0 });
    s.realms.b.offlineAt = now - 1;
    writeTile(s, a, { ownerId: 'b' });
    expect(execute(s, 'a', command('ATTACK', a.id, { targetId: b.id }), now).result.reason).toMatch(
      /trêve/,
    );
    expect(execute(s, 'b', command('ATTACK', b.id, { targetId: a.id }), now).result.reason).toMatch(
      /trêve/,
    );
    expect(execute(s, 'a', command('CAPTURE', a.id, {}), now).result.reason).toMatch(/trêve/);
  });
  it('ne protège plus après échéance et autorise l’attaque hors ligne', () => {
    const s = fixture(),
      a = Object.values(s.units).find((u) => u.ownerId === 'a' && u.kind === 'KNIGHT')!,
      b = Object.values(s.units).find((u) => u.ownerId === 'b' && u.kind === 'INFANTRY')!;
    Object.assign(b, { q: a.q + 1, r: a.r });
    s.realms.b.offlineAt = now - 1;
    writeTile(s, b, { terrain: 'PLAIN' });
    s.treaties.t = {
      id: 't',
      a: 'a',
      b: 'b',
      kind: 'TRUCE',
      startsAt: now - 120000,
      endsAt: now - 1,
      payment: zeroWallet(),
      proposalId: 'p',
      nextCaravanAt: 0,
    };
    expect(execute(s, 'a', command('ATTACK', a.id, { targetId: b.id }), now).result.accepted).toBe(
      true,
    );
  });
  it('refuse toute réponse d’un tiers', () => {
    const s = proposal(fixture()).state;
    addPlayer(s, 'c', 'Fer', 'IRON', now);
    expect(
      execute(
        s,
        'c',
        command('RESPOND', 'c', { proposalId: Object.keys(s.proposals)[0], decision: 'ACCEPT' }),
        now,
      ).result.accepted,
    ).toBe(false);
  });
});
describe('visibilité, défaite et IA', () => {
  it('ne transmet jamais les unités ennemies invisibles, même après exploration', () => {
    const s = fixture(),
      enemy = Object.values(s.units).find((u) => u.ownerId === 'b')!;
    Object.assign(enemy, { q: 100, r: 100 });
    s.realms.a.explored[key(enemy)] = { q: 100, r: 100, terrain: 'PLAIN', visibility: 'EXPLORED' };
    const view = worldView(s, 'a', now, [{ q: 3, r: 3 }]);
    expect(view.units.find((u) => u.id === enemy.id)).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain(enemy.id);
    expect('explored' in view.player).toBe(false);
  });
  it('conserve la dernière observation des bâtiments explorés', () => {
    const s = fixture(),
      b = Object.values(s.buildings).find((b) => b.ownerId === 'b')!;
    const p = { q: 100, r: 100 };
    Object.assign(b, p);
    writeTile(s, p, { buildingId: b.id, ownerId: 'b' });
    s.realms.a.explored[key(p)] = {
      ...p,
      terrain: 'PLAIN',
      visibility: 'EXPLORED',
      building: { ...b, hp: 7 },
    };
    b.hp = 20;
    const view = worldView(s, 'a', now, [{ q: 3, r: 3 }]);
    expect(view.tiles.find((t) => key(t) === key(p))?.building?.hp).toBe(7);
  });
  it('ne restaure un royaume vaincu qu’après le délai', () => {
    const s = fixture();
    defeat(s, s.realms.a, now);
    s.archives.a.units = [];
    expect(execute(s, 'a', command('RESPAWN', 'a', {}), now + 1).result.accepted).toBe(false);
    const result = execute(s, 'a', command('RESPAWN', 'a', {}), now + RULES.defeatCooldown + 1);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.a.defeatedAt).toBeUndefined();
    expect(result.state.realms.a.capital).not.toEqual({ q: 0, r: 0 });
    expect(result.state.realms.a.wallet.GOLD).toBe(375);
    const survivor = Object.values(result.state.units).find((u) => u.ownerId === 'a')!;
    expect(survivor.kind).toBe('INFANTRY');
    expect(survivor.hp).toBe(UNITS.INFANTRY.hp);
  });
  it('endort les bots sans humain, puis les réveille', () => {
    const s = fixture(),
      director = new BotDirector({ ...defaultOptions, botInterval: 1 });
    director.reconcile(s, now, 0);
    const before = Object.values(s.units)
      .filter((u) => s.realms[u.ownerId].bot)
      .map((u) => JSON.stringify(u));
    director.tick(s, now + 600000, 0);
    expect(
      Object.values(s.units)
        .filter((u) => s.realms[u.ownerId].bot)
        .map((u) => JSON.stringify(u)),
    ).toEqual(before);
    director.tick(s, now + 600000, 1);
    expect(
      Object.values(s.realms)
        .filter((r) => r.bot)
        .some((r) => r.nextBotAt > now + 600000),
    ).toBe(true);
  });
  it('remplace un bot vaincu après son délai, sans apparition immédiate', () => {
    const s = fixture();
    const director = new BotDirector();
    director.reconcile(s, now, 0);
    const bot = Object.values(s.realms).find((r) => r.bot && !r.temporary)!;
    defeat(s, bot, now);
    director.reconcile(s, now + 1, 0);
    expect(Object.values(s.realms).filter((r) => r.bot && !r.defeatedAt)).toHaveLength(1);
    director.reconcile(s, now + RULES.defeatCooldown + 1, 0);
    expect(s.realms[bot.id]).toBeUndefined();
    expect(Object.values(s.realms).filter((r) => r.bot && !r.defeatedAt)).toHaveLength(2);
  });
  it('conserve deux bots quel que soit le nombre de joueurs connectés', () => {
    const s = fixture(),
      director = new BotDirector();
    for (const [i, humans] of [0, 1, 2, 10, 1, 0].entries()) {
      director.reconcile(s, now + i * 1800001, humans);
      expect(Object.values(s.realms).filter((r) => r.bot)).toHaveLength(2);
      expect(Object.values(s.realms).some((r) => r.bot && r.temporary)).toBe(false);
    }
  });
});
