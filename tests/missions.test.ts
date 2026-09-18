import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { UNITS, STRATEGY, isWall } from '@voidmarch/config';
import {
  createState,
  createRealm,
  distance,
  disk,
  key,
  neighbors,
  tileAt,
  writeTile,
} from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import type { GameState, Hex, Unit } from '@voidmarch/shared';
import {
  addBuilding,
  addPlayer,
  execute,
  restartRealm,
  worldView,
} from '../apps/server/src/engine';
import {
  activeMissions,
  missionOffers,
  missionsView,
  reconcileMissions,
} from '../apps/server/src/missions';
import { strategy, tickStrategy } from '../apps/server/src/strategy';
import { removeGuestRealm } from '../apps/server/src/guests';
import { BotDirector } from '../apps/server/src/bots';
const now = 1_900_000_000_000;
function fixture(seed = 'missions') {
  const s = createState(seed, now);
  addPlayer(s, 'a', 'Campagne', 'ASH', now);
  s.realms.a.wallet = { GOLD: 10000, FOOD: 10000, WOOD: 10000, STONE: 10000, IRON: 10000 };
  s.realms.a.unlimitedAP = true;
  strategy(s, now);
  return s;
}
function run(s: GameState, type: string, actorId: string, payload = {}, realm = 'a') {
  return execute(
    s,
    realm,
    actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now }),
    now,
  );
}
function accept(s: GameState, index = 0) {
  const result = run(s, 'MISSION_ACCEPT', 'a', { offerId: missionOffers(s, 'a')[index].id });
  expect(result.result.accepted, result.result.reason).toBe(true);
  return result.state;
}
function unit(s: GameState, position: Hex, ownerId = 'a', kind: Unit['kind'] = 'SIEGE'): Unit {
  const u: Unit = {
    q: position.q,
    r: position.r,
    ownerId,
    kind,
    id: randomUUID(),
    hp: 10000,
    createdAt: now,
    updatedAt: now,
  };
  s.units[u.id] = u;
  return u;
}
function allies(s: GameState) {
  for (const id of ['ally', 'outsider']) {
    const r = createRealm(id, id, 'ASH', { q: -100, r: id === 'ally' ? 0 : 20 }, now);
    r.unlimitedAP = true;
    r.protectedUntil = 0;
    r.wallet = { GOLD: 1e8, FOOD: 1e8, WOOD: 1e8, STONE: 1e8, IRON: 1e8 };
    s.realms[id] = r;
  }
  s.strategy!.alliances.team = {
    id: 'team',
    name: 'Alliés',
    leaderId: 'a',
    members: ['a', 'ally'],
    emblem: 'eye',
    createdAt: now,
    messages: [],
    markers: [],
  };
}

describe('missions de campagne', () => {
  it('propose trois offres déterministes, sans création de forteresse ni mutation de sauvegarde', () => {
    const s = fixture(),
      before = JSON.stringify(s);
    const first = missionsView(s, 'a');
    expect(first.offers).toHaveLength(3);
    expect(new Set(first.offers.map((m) => m.title)).size).toBe(3);
    expect(first.offers.filter((o) => o.objective === 'COMMANDER')).toHaveLength(1);
    expect(missionsView(s, 'a')).toEqual(first);
    expect(JSON.stringify(s)).toBe(before);
    for (const offer of first.offers) {
      expect(offer.units.length).toBeGreaterThanOrEqual(1);
      expect(offer.units.length).toBeLessThanOrEqual(5);
      expect(offer.buildings.length).toBeGreaterThanOrEqual(2);
      expect(offer.buildings.length).toBeLessThanOrEqual(3);
    }
  });
  it.each(['missions', 'campaign-2', 'campaign-3', 'campaign-4'])(
    'place une forteresse libre à 40–60 cases, sans ajouter de bot (%s)',
    (seed) => {
      const original = fixture(seed);
      const s = accept(original, 2),
        m = activeMissions(s)[0];
      expect(distance(m, s.realms.a.capital)).toBeGreaterThanOrEqual(40);
      expect(distance(m, s.realms.a.capital)).toBeLessThanOrEqual(60);
      expect(Object.keys(s.realms)).toEqual(['a']);
      expect(Object.values(s.units).filter((u) => u.ownerId === m.ownerId)).toHaveLength(
        m.units.length,
      );
      expect(
        Object.values(s.buildings).filter((b) => b.ownerId === m.ownerId && isWall(b.kind)),
      ).toHaveLength(12);
      for (const p of disk(m, 2)) expect(tileAt(original, p).ownerId).toBeUndefined();
      expect(s.realms.a.wallet).toEqual(original.realms.a.wallet);
      expect(s.realms.a.ap).toBe(original.realms.a.ap);
      expect(missionsView(s, 'a').offers).toHaveLength(0);
      const duplicate = run(s, 'MISSION_ACCEPT', 'a', { offerId: 'offer:0:1:0' });
      expect(duplicate.result.accepted).toBe(false);
      expect(duplicate.state).toBe(s);
    },
  );
  it('suit le niveau militaire sans offrir des unités atomiques à un nouveau royaume', () => {
    const s = fixture();
    expect(missionOffers(s, 'a')[0].level).toBe(1);
    addBuilding(s, s.realms.a, { q: 3, r: 0 }, 'HOUSE', now, 5);
    expect(missionOffers(s, 'a')[0].level).toBe(1);
    addBuilding(s, s.realms.a, { q: 2, r: 0 }, 'BARRACKS', now, 3);
    expect(missionOffers(s, 'a').every((m) => m.level === 3)).toBe(true);
  });
  it('refuse une offre périmée ou un site entièrement occupé sans mutation', () => {
    const s = fixture();
    expect(run(s, 'MISSION_ACCEPT', 'a', { offerId: 'invented' }).state).toBe(s);
    for (const p of disk(s.realms.a.capital, 63)) writeTile(s, p, { ownerId: 'blocked' });
    const result = run(s, 'MISSION_ACCEPT', 'a', { offerId: missionOffers(s, 'a')[0].id });
    expect(result.result.accepted).toBe(false);
    expect(result.state).toBe(s);
  });
  it('abandonne contre le prix annoncé, garde les troupes alliées sur place et nettoie les souvenirs', () => {
    let s = accept(fixture());
    const m = activeMissions(s)[0];
    const own = unit(s, m),
      oldOffers = missionOffers(fixture(), 'a').map((o) => o.id);
    const b = Object.values(s.buildings).find((b) => b.ownerId === m.ownerId)!;
    s.realms.a.explored[key(b)] = { ...tileAt(s, b), visibility: 'EXPLORED', building: b };
    const before = structuredClone(s.realms.a.wallet);
    s = run(s, 'MISSION_ABANDON', 'a', { missionId: m.id }).state;
    expect(activeMissions(s)).toHaveLength(0);
    expect(s.units[own.id]).toBeDefined();
    expect(Object.values(s.buildings).some((b) => b.ownerId === m.ownerId)).toBe(false);
    expect(Object.values(s.tiles).some((t) => t.ownerId === m.ownerId)).toBe(false);
    expect(s.realms.a.explored[key(b)].building).toBeUndefined();
    expect(s.realms.a.wallet.GOLD).toBe(before.GOLD - m.abandonmentCost.GOLD!);
    expect(s.realms.a.wallet.FOOD).toBe(before.FOOD - m.abandonmentCost.FOOD!);
    expect(missionOffers(s, 'a').some((o) => oldOffers.includes(o.id))).toBe(false);
    expect(run(s, 'MISSION_ABANDON', 'a', { missionId: m.id }).result.accepted).toBe(false);
  });
  it('refuse un abandon sans ressources ou avec un autre identifiant', () => {
    const s = accept(fixture());
    const m = activeMissions(s)[0];
    s.realms.a.wallet.GOLD = 0;
    expect(run(s, 'MISSION_ABANDON', 'a', { missionId: m.id }).state).toBe(s);
    expect(run(s, 'MISSION_ABANDON', 'a', { missionId: 'wrong' }).state).toBe(s);
  });
  it.each(['BUILDING', 'COMMANDER'] as const)(
    'rallie les survivants avec leur santé après destruction de l’objectif %s',
    (type) => {
      const initial = fixture();
      const index = missionOffers(initial, 'a').findIndex((o) => o.objective === type);
      let s = accept(initial, index);
      const m = activeMissions(s)[0];
      // Remove an unrelated wall if present to isolate objective combat from interception.
      for (const b of Object.values(s.buildings).filter(
        (b) => b.ownerId === m.ownerId && isWall(b.kind),
      )) {
        delete s.buildings[b.id];
        writeTile(s, b, { buildingId: undefined });
      }
      const objective = s.units[m.objectiveId] ?? s.buildings[m.objectiveId];
      objective.hp = 1;
      const survivors = Object.values(s.units).filter(
        (u) => u.ownerId === m.ownerId && u.id !== m.objectiveId,
      );
      survivors.forEach((u) => (u.hp = 7));
      const buildings = Object.values(s.buildings).filter(
        (b) => b.ownerId === m.ownerId && b.id !== m.objectiveId,
      );
      buildings.forEach((b) => (b.hp = 19));
      const shooter = unit(s, neighbors(objective)[0]);
      const result = run(s, 'ATTACK', shooter.id, { targetId: objective.id });
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.result.message).toContain('Victoire');
      s = result.state;
      expect(s.units[objective.id] ?? s.buildings[objective.id]).toBeUndefined();
      expect(activeMissions(s)).toHaveLength(0);
      for (const u of survivors) {
        expect(s.units[u.id].ownerId).toBe('a');
        expect(s.units[u.id].hp).toBe(7);
      }
      for (const b of buildings) {
        expect(s.buildings[b.id].ownerId).toBe('a');
        expect(s.buildings[b.id].hp).toBe(19);
      }
      expect(s.units[shooter.id].hp).toBe(shooter.hp); // No retaliating newly allied guard.
      expect(s.realms.a.defeatedAt).toBeUndefined();
      expect(Object.values(s.tiles).some((t) => t.ownerId === m.ownerId)).toBe(false);
    },
  );
  it('bloque les attaques des tiers, autorise les alliés et attribue leur victoire au commanditaire', () => {
    let s = fixture();
    allies(s);
    s = accept(s, 0);
    const m = activeMissions(s)[0];
    const objective = s.units[m.objectiveId] ?? s.buildings[m.objectiveId];
    objective.hp = 1;
    const outsider = unit(s, neighbors(objective)[0], 'outsider');
    expect(
      run(s, 'ATTACK', outsider.id, { targetId: objective.id }, 'outsider').result.reason,
    ).toContain('réservée');
    expect(missionsView(s, 'outsider').allied).toHaveLength(0);
    expect(missionsView(s, 'ally').allied).toHaveLength(1);
    const ally = unit(s, neighbors(objective)[1], 'ally');
    const result = run(s, 'ATTACK', ally.id, { targetId: objective.id }, 'ally');
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.missions!.a.lastResult?.outcome).toBe('VICTORY');
    expect(
      Object.values(result.state.buildings)
        .filter((b) => distance(b, m) <= 2)
        .every((b) => b.ownerId === 'a'),
    ).toBe(true);
  });
  it('interdit de capturer directement les bâtiments avant la victoire et réévalue les alliances', () => {
    let s = fixture();
    allies(s);
    s = accept(s);
    const m = activeMissions(s)[0];
    const b = Object.values(s.buildings).find((b) => b.ownerId === m.ownerId)!;
    const attacker = unit(s, b, 'ally', 'INFANTRY');
    expect(run(s, 'CAPTURE', attacker.id, {}, 'ally').result.reason).toContain('objectif');
    s.strategy!.alliances.team.members = ['a'];
    expect(run(s, 'ATTACK', attacker.id, { targetId: b.id }, 'ally').result.reason).toContain(
      'réservée',
    );
  });
  it('défend les bâtiments avec une riposte de proximité sans déplacer la garnison', () => {
    let s = accept(fixture());
    const m = activeMissions(s)[0];
    const b = Object.values(s.buildings).find((b) => b.ownerId === m.ownerId)!;
    b.hp = 1e6;
    const guard = Object.values(s.units).find((u) => u.ownerId === m.ownerId)!;
    guard.kind = 'ARCHER';
    guard.q = b.q;
    guard.r = b.r;
    const attacker = unit(s, neighbors(b)[0], 'a', 'INFANTRY');
    const result = run(s, 'ATTACK', attacker.id, { targetId: b.id });
    expect(result.result.accepted).toBe(true);
    expect(result.result.message).toContain('défend la garnison');
    expect(result.state.units[attacker.id].hp).toBeLessThan(attacker.hp);
    expect(key(result.state.units[guard.id])).toBe(key(guard));
    expect(activeMissions(result.state)).toHaveLength(1);
  });
  it('nettoie la mission lors d’un redémarrage ou de la suppression du compte invité', () => {
    for (const cleanup of [restartRealm, removeGuestRealm]) {
      const s = accept(fixture()),
        m = activeMissions(s)[0];
      cleanup(s, 'a', now);
      expect(activeMissions(s)).toHaveLength(0);
      expect(Object.values(s.units).some((u) => u.ownerId === m.ownerId)).toBe(false);
      expect(Object.values(s.tiles).some((t) => t.ownerId === m.ownerId)).toBe(false);
    }
  });
  it('préserve les forteresses privées lors d’une frappe nucléaire extérieure déjà en vol', () => {
    let s = fixture();
    allies(s);
    s = accept(s);
    const m = activeMissions(s)[0];
    const before = Object.values(s.buildings).filter((b) => b.ownerId === m.ownerId).length;
    s.strategy!.strikes.strike = {
      ...m,
      id: 'strike',
      ownerId: 'outsider',
      siloId: 'silo',
      launchedAt: now - 600000,
      impactAt: now,
      radius: STRATEGY.nuclearRadius,
      scorchesTerrain: true,
    };
    tickStrategy(s, now, new Set());
    reconcileMissions(s, now);
    expect(Object.values(s.buildings).filter((b) => b.ownerId === m.ownerId)).toHaveLength(before);
    expect(activeMissions(s)).toHaveLength(1);
    expect(tileAt(s, m).terrain).not.toBe('SCORCHED');
  });
  it('conserve la mission et ses identifiants après sérialisation de la sauvegarde', () => {
    const s = accept(fixture()),
      loaded: GameState = JSON.parse(JSON.stringify(s));
    expect(missionsView(loaded, 'a')).toEqual(missionsView(s, 'a'));
    expect(worldView(loaded, 'a', now).missions?.active?.id).toBe(activeMissions(s)[0].id);
  });
  it('évite les captures illégales et les erreurs des bots sur les terrains de mission', () => {
    let s = fixture();
    allies(s);
    s = accept(s, 2);
    const m = activeMissions(s)[0];
    const bot = s.realms.outsider;
    bot.bot = true;
    bot.personality = 'EXPANSIONIST';
    const scout = unit(s, m, bot.id, 'INFANTRY');
    let intent: ReturnType<BotDirector['intent']>;
    expect(() => {
      intent = new BotDirector().intent(s, bot, now);
    }).not.toThrow();
    expect(intent?.command.type).not.toBe('CAPTURE');
    expect(s.units[scout.id]).toBeDefined();
  });
  it('attribue aussi une victoire après une frappe alliée, sans recréer les victimes', () => {
    let s = fixture();
    allies(s);
    s = accept(s, 2);
    const m = activeMissions(s)[0];
    const objective = s.units[m.objectiveId] ?? s.buildings[m.objectiveId];
    s.strategy!.strikes.strike = {
      q: objective.q,
      r: objective.r,
      id: 'strike',
      ownerId: 'ally',
      siloId: 'silo',
      launchedAt: now - 600000,
      impactAt: now,
      radius: 2,
      scorchesTerrain: true,
    };
    tickStrategy(s, now, new Set());
    reconcileMissions(s, now);
    expect(s.missions!.a.lastResult?.outcome).toBe('VICTORY');
    expect(s.units[m.objectiveId] ?? s.buildings[m.objectiveId]).toBeUndefined();
    expect(activeMissions(s)).toHaveLength(0);
    expect(tileAt(s, objective).terrain).toBe('SCORCHED');
  });
});
