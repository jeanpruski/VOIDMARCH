import { prepareDevelopment } from './fixtures/development';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { UNITS, UNIT_PROFILES, STRATEGY, isWall } from '@voidmarch/config';
import {
  missionReward,
  missionWallCount,
  movementCost,
  accrueEconomy,
  income,
  storage,
  createState,
  createRealm,
  distance,
  disk,
  key,
  neighbors,
  tileAt,
  writeTile,
  vision,
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
  retaliateMission,
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
function run(s: GameState, type: string, actorId: string, payload = {}, realm = 'a', at = now) {
  return execute(
    s,
    realm,
    actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: at }),
    at,
  );
}
function accept(s: GameState, index = 0) {
  const result = run(s, 'MISSION_ACCEPT', 'a', { offerId: missionOffers(s, 'a', now)[index].id });
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
  it.each([1, 2, 3, 4, 5])(
    'propose des effectifs et spécialités cohérents au niveau %i',
    (level) => {
      const s = fixture(`mixed-${level}`);
      addBuilding(s, s.realms.a, { q: 3, r: 0 }, 'BARRACKS', now, level);
      prepareDevelopment(s, 'a', level, now);
      const offers = missionOffers(s, 'a', now);
      const ranges = [
        [2, 5],
        [6, 10],
        [12, 20],
      ];
      offers.forEach((offer, i) => {
        expect(offer.units.length).toBeGreaterThanOrEqual(ranges[i][0]);
        expect(offer.units.length).toBeLessThanOrEqual(ranges[i][1]);
        expect(offer.units.some((k) => UNIT_PROFILES[k].hero || UNIT_PROFILES[k].builder)).toBe(
          false,
        );
        expect(offer.units.some((k) => UNIT_PROFILES[k].flying)).toBe(level >= 3 && i > 0);
        if (i > 0)
          expect(
            offer.units.some((k) => UNIT_PROFILES[k].mechanical || UNIT_PROFILES[k].mounted),
          ).toBe(true);
        if (level < 5) expect(offer.units.some((k) => UNIT_PROFILES[k].radioactive)).toBe(false);
      });
    },
  );
  it.each([3, 4, 5])(
    'installe une grande campagne de niveau %i sans collision ni terrain impraticable',
    (level) => {
      const s = fixture(`large-${level}`);
      allies(s);
      addBuilding(s, s.realms.a, { q: 3, r: 0 }, 'BARRACKS', now, level);
      prepareDevelopment(s, 'a', level, now);
      const at = now + 600000;
      const offer = missionOffers(s, 'a', at)[2];
      expect(offer.difficulty).toBe('Grande campagne');
      expect(offer.units.length).toBeGreaterThanOrEqual(20);
      expect(offer.units.length).toBeLessThanOrEqual(30);
      const accepted = run(s, 'MISSION_ACCEPT', 'a', { offerId: offer.id }, 'a', at);
      expect(accepted.result.accepted, accepted.result.reason).toBe(true);
      const m = activeMissions(accepted.state)[0];
      const units = Object.values(accepted.state.units).filter((u) => u.ownerId === m.ownerId);
      expect(units).toHaveLength(offer.units.length);
      expect(new Set(units.map(key)).size).toBe(units.length);
      expect(units.some((u) => UNIT_PROFILES[u.kind].flying)).toBe(true);
      for (const u of units) {
        expect(Number.isFinite(u.q) && Number.isFinite(u.r)).toBe(true);
        expect(tileAt(accepted.state, u).buildingId).toBeUndefined();
        expect(movementCost(tileAt(accepted.state, u), u.kind)).toBeLessThanOrEqual(
          UNITS[u.kind].move,
        );
        expect(distance(u, m)).toBeLessThan(m.wallRadius!);
      }
      const wallCount = Object.values(accepted.state.buildings).filter(
        (b) => b.ownerId === m.ownerId && isWall(b.kind),
      ).length;
      expect(wallCount).toBe(24);
      expect(missionWallCount(m)).toBe(wallCount);
      delete accepted.state.units[m.objectiveId];
      delete accepted.state.buildings[m.objectiveId];
      reconcileMissions(accepted.state, at + 1);
      const trophy = accepted.state.missions!.a.trophies!.find((t) => t.id === m.id)!;
      expect(trophy.medal.metal).toBe('gold');
      expect(trophy.mission.difficulty).toBe('Grande campagne');
      expect(trophy.mission.wallRadius).toBe(4);
      expect(trophy.destroyed.walls).toBe(0);
      expect(trophy.captured.walls).toBe(24);
      expect(trophy.reward).toEqual(offer.reward);
    },
  );
  it('peut placer une garnison complète de 30 unités dans son enceinte', () => {
    const s = fixture('full-campaign');
    allies(s);
    addBuilding(s, s.realms.a, { q: 3, r: 0 }, 'BARRACKS', now, 5);
    prepareDevelopment(s, 'a', 5, now);
    const at = now + 600000;
    for (let generation = 0; generation < 200; generation += 2) {
      (s.missions ??= {}).a = { ...s.missions?.a, generation };
      if (missionOffers(s, 'a', at)[2].units.length === 30) break;
    }
    const offer = missionOffers(s, 'a', at)[2];
    expect(offer.units).toHaveLength(30);
    const accepted = run(s, 'MISSION_ACCEPT', 'a', { offerId: offer.id }, 'a', at);
    expect(accepted.result.accepted, accepted.result.reason).toBe(true);
    const m = activeMissions(accepted.state)[0];
    const units = Object.values(accepted.state.units).filter((u) => u.ownerId === m.ownerId);
    expect(units).toHaveLength(30);
    expect(new Set(units.map(key)).size).toBe(30);
    expect(units.every((u) => distance(u, m) < m.wallRadius!)).toBe(true);
  });
  it('réserve les grandes campagnes aux royaumes avancés alliés et invalide une offre après rupture', () => {
    const s = fixture();
    allies(s);
    expect(missionOffers(s, 'a', now + 600000)[2].difficulty).toBe('Siège');
    addBuilding(s, s.realms.a, { q: 3, r: 0 }, 'BARRACKS', now, 3);
    prepareDevelopment(s, 'a', 3, now);
    expect(missionOffers(s, 'a', now)[2].difficulty).toBe('Siège');
    const offer = missionOffers(s, 'a', now + 600000)[2];
    expect(offer.difficulty).toBe('Grande campagne');
    s.strategy!.alliances.team.members = ['a'];
    expect(missionOffers(s, 'a', now + 600000)[2].difficulty).toBe('Siège');
    const result = run(s, 'MISSION_ACCEPT', 'a', { offerId: offer.id }, 'a', now + 600000);
    expect(result.result.accepted).toBe(false);
    expect(result.state).toBe(s);
  });

  it('propose trois offres déterministes, sans création de forteresse ni mutation de sauvegarde', () => {
    const s = fixture(),
      before = JSON.stringify(s);
    const first = missionsView(s, 'a', now);
    expect(first.offers).toHaveLength(3);
    expect(new Set(first.offers.map((m) => m.title)).size).toBe(3);
    expect(first.offers.filter((o) => o.objective === 'COMMANDER')).toHaveLength(1);
    expect(missionsView(s, 'a', now)).toEqual(first);
    expect(JSON.stringify(s)).toBe(before);
    for (const offer of first.offers) {
      expect(offer.units.length).toBeGreaterThanOrEqual(2);
      expect(offer.units.length).toBeLessThanOrEqual(20);
      expect(offer.buildings.length).toBeGreaterThanOrEqual(2);
      expect(offer.buildings.length).toBeLessThanOrEqual(3);
    }
  });
  it.each(['missions', 'campaign-2', 'campaign-3', 'campaign-4'])(
    'place une forteresse libre à 20–40 cases, sans ajouter de bot (%s)',
    (seed) => {
      const original = fixture(seed);
      const s = accept(original, 2),
        m = activeMissions(s)[0];
      expect(distance(m, s.realms.a.capital)).toBeGreaterThanOrEqual(20);
      expect(distance(m, s.realms.a.capital)).toBeLessThanOrEqual(40);
      expect(Object.keys(s.realms)).toEqual(['a']);
      expect(Object.values(s.units).filter((u) => u.ownerId === m.ownerId)).toHaveLength(
        m.units.length,
      );
      expect(
        Object.values(s.buildings).filter((b) => b.ownerId === m.ownerId && isWall(b.kind)),
      ).toHaveLength(24);
      for (const p of disk(m, m.wallRadius ?? 2))
        expect(tileAt(original, p).ownerId).toBeUndefined();
      expect(s.realms.a.wallet).toEqual(original.realms.a.wallet);
      expect(s.realms.a.ap).toBe(original.realms.a.ap);
      expect(missionsView(s, 'a', now).offers).toHaveLength(0);
      const duplicate = run(s, 'MISSION_ACCEPT', 'a', { offerId: 'offer:0:1:0' });
      expect(duplicate.result.accepted).toBe(false);
      expect(duplicate.state).toBe(s);
    },
  );
  it('suit le niveau militaire sans offrir des unités atomiques à un nouveau royaume', () => {
    const s = fixture();
    expect(missionOffers(s, 'a', now)[0].level).toBe(1);
    addBuilding(s, s.realms.a, { q: 3, r: 0 }, 'HOUSE', now, 5);
    expect(missionOffers(s, 'a', now)[0].level).toBe(1);
    addBuilding(s, s.realms.a, { q: 2, r: 0 }, 'BARRACKS', now, 3);
    prepareDevelopment(s, 'a', 3, now);
    expect(missionOffers(s, 'a', now).every((m) => m.level === 3)).toBe(true);
  });
  it('étend la recherche au-delà de 40 cases quand les emplacements proches sont occupés', () => {
    const s = fixture();
    expect(run(s, 'MISSION_ACCEPT', 'a', { offerId: 'invented' }).state).toBe(s);
    for (const p of disk(s.realms.a.capital, 43)) writeTile(s, p, { ownerId: 'blocked' });
    const result = accept(s);
    const mission = activeMissions(result)[0];
    expect(mission.distance).toBeGreaterThan(40);
    for (const p of disk(mission, (mission.wallRadius ?? 2) + 1))
      expect(tileAt(s, p).ownerId).toBeUndefined();
  });
  it('retombe sur des terres explorées hors de vue quand la région est connue', () => {
    const s = fixture();
    for (const p of disk(s.realms.a.capital, 95))
      s.realms.a.explored[key(p)] = { ...tileAt(s, p), visibility: 'EXPLORED' };
    const seen = vision(s, s.realms.a),
      mission = activeMissions(accept(s))[0];
    expect(mission.distance).toBeGreaterThanOrEqual(20);
    expect(mission.distance).toBeLessThanOrEqual(40);
    for (const p of disk(mission, (mission.wallRadius ?? 2) + 1)) {
      expect(s.realms.a.explored[key(p)]).toBeDefined();
      expect(seen.has(key(p))).toBe(false);
    }
  });
  it('évite toute la vision actuelle des éclaireurs même quand le terrain est neutre', () => {
    const s = fixture(),
      previous = activeMissions(accept(s))[0];
    unit(s, previous, 'a', 'SCOUT');
    const seen = vision(s, s.realms.a),
      mission = activeMissions(accept(s))[0];
    expect(key(mission)).not.toBe(key(previous));
    for (const p of disk(mission, (mission.wallRadius ?? 2) + 1))
      expect(seen.has(key(p))).toBe(false);
  });
  it('choisit le premier anneau invisible disponible même autour d’une cité de rayon 100', () => {
    const s = fixture(),
      capital = s.realms.a.capital;
    for (const p of disk(capital, 110))
      writeTile(s, p, {
        terrain: 'PLAIN',
        poi: undefined,
        ownerId: distance(p, capital) <= 100 ? 'a' : undefined,
      });
    const seen = vision(s, s.realms.a),
      mission = activeMissions(accept(s))[0];
    expect(mission.distance).toBe(104); // radius 2 + one free buffer cell, all outside radius 100.
    for (const p of disk(mission, (mission.wallRadius ?? 2) + 1))
      expect(seen.has(key(p))).toBe(false);
    expect(Object.keys(s.missions ?? {})).toHaveLength(0);
  });
  it('refuse sans frais ni mutation quand des remparts ennemis empêchent toute sortie', () => {
    const s = fixture();
    s.realms.enemy = createRealm('enemy', 'Ennemi', 'MASK', { q: 200, r: 0 }, now);
    for (const p of neighbors(s.realms.a.capital))
      addBuilding(s, s.realms.enemy, p, 'WOOD_WALL', now);
    const result = run(s, 'MISSION_ACCEPT', 'a', { offerId: missionOffers(s, 'a', now)[0].id });
    expect(result.result.accepted).toBe(false);
    expect(result.result.reason).toContain('accessible à pied');
    expect(result.state).toBe(s);
    expect(Object.keys(s.missions ?? {})).toHaveLength(0);
  });
  it('abandonne contre le prix annoncé, garde les troupes alliées sur place et nettoie les souvenirs', () => {
    let s = accept(fixture());
    const m = activeMissions(s)[0];
    const own = unit(s, m),
      oldOffers = missionOffers(fixture(), 'a', now).map((o) => o.id);
    const b = Object.values(s.buildings).find((b) => b.ownerId === m.ownerId)!;
    s.realms.a.explored[key(b)] = { ...tileAt(s, b), visibility: 'EXPLORED', building: b };
    const before = structuredClone(s.realms.a.wallet);
    s = run(s, 'MISSION_ABANDON', 'a', { missionId: m.id }).state;
    expect(activeMissions(s)).toHaveLength(0);
    expect(s.missions!.a.lastResult?.reward).toBeUndefined();
    expect(s.missions!.a.trophies ?? []).toHaveLength(0);
    expect(s.units[own.id]).toBeDefined();
    expect(Object.values(s.buildings).some((b) => b.ownerId === m.ownerId)).toBe(false);
    expect(Object.values(s.tiles).some((t) => t.ownerId === m.ownerId)).toBe(false);
    expect(s.realms.a.explored[key(b)].building).toBeUndefined();
    expect(s.realms.a.wallet.GOLD).toBe(before.GOLD - m.abandonmentCost.GOLD!);
    expect(s.realms.a.wallet.FOOD).toBe(before.FOOD - m.abandonmentCost.FOOD!);
    expect(missionOffers(s, 'a', now).some((o) => oldOffers.includes(o.id))).toBe(false);
    expect(run(s, 'MISSION_ABANDON', 'a', { missionId: m.id }).result.accepted).toBe(false);
  });
  it('autorise un abandon sans ressources avec repos mais refuse un autre identifiant', () => {
    const s = accept(fixture());
    const m = activeMissions(s)[0];
    s.realms.a.wallet.GOLD = 0;
    const abandoned = run(s, 'MISSION_ABANDON', 'a', { missionId: m.id });
    expect(abandoned.result.accepted).toBe(true);
    expect(abandoned.state.missions!.a.availableAt).toBeGreaterThan(now);
    expect(abandoned.state.missions!.a.active).toBeUndefined();
    expect(run(s, 'MISSION_ABANDON', 'a', { missionId: 'wrong' }).state).toBe(s);
  });
  it.each(['BUILDING', 'COMMANDER'] as const)(
    'rallie les survivants avec leur santé après destruction de l’objectif %s',
    (type) => {
      const initial = fixture();
      const index = missionOffers(initial, 'a', now).findIndex((o) => o.objective === type);
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
      const walletBefore = structuredClone(s.realms.a.wallet);
      const quotedReward = missionReward(m);
      const shooter = unit(s, neighbors(objective)[0]);
      const result = run(s, 'ATTACK', shooter.id, { targetId: objective.id });
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.result.message).toContain('Victoire');
      expect(result.result.message).toContain('Butin reçu');
      s = result.state;
      expect(s.realms.a.wallet.GOLD).toBe(walletBefore.GOLD + quotedReward.GOLD!);
      expect(s.realms.a.wallet.FOOD).toBe(walletBefore.FOOD + quotedReward.FOOD!);
      expect(s.missions!.a.lastResult?.reward).toEqual(quotedReward);
      expect(s.missions!.a.trophies).toHaveLength(1);
      const trophy = s.missions!.a.trophies![0];
      expect(trophy.id).toBe(m.id);
      expect(trophy.captured.units).toBe(survivors.length);
      expect(trophy.captured.buildings).toBe(buildings.length);
      expect(trophy.reward).toEqual(quotedReward);
      expect(s.missions!.a.lastResult?.trophyId).toBe(trophy.id);
      expect(result.result.message).toContain('Médaille');
      const paidWallet = structuredClone(s.realms.a.wallet);
      reconcileMissions(s, now + 1);
      expect(s.realms.a.wallet).toEqual(paidWallet);
      expect(s.missions!.a.trophies).toHaveLength(1);
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
    expect(missionsView(s, 'outsider', now).allied).toHaveLength(0);
    expect(missionsView(s, 'ally', now).allied).toHaveLength(1);
    const allyWallet = structuredClone(s.realms.ally.wallet);
    const ownerGold = s.realms.a.wallet.GOLD;
    const ally = unit(s, neighbors(objective)[1], 'ally');
    const result = run(s, 'ATTACK', ally.id, { targetId: objective.id }, 'ally');
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.missions!.a.lastResult?.outcome).toBe('VICTORY');
    expect(result.state.realms.a.wallet.GOLD).toBe(ownerGold + missionReward(m).GOLD!);
    expect(result.state.realms.ally.wallet).toEqual(allyWallet);
    expect(missionsView(result.state, 'a', now).trophies).toHaveLength(1);
    expect(missionsView(result.state, 'ally', now).trophies).toHaveLength(0);
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
    expect(
      [...result.state.journal].reverse().find((j) => j.damage?.retaliation)?.damage,
    ).toMatchObject({
      amount: attacker.hp - result.state.units[attacker.id].hp,
      targetOwnerId: 'a',
      targetKind: 'unit',
    });
    expect(result.state.units[attacker.id].hp).toBeLessThan(attacker.hp);
    expect(key(result.state.units[guard.id])).toBe(key(guard));
    expect(activeMissions(result.state)).toHaveLength(1);
  });
  it('rapproche un seul défenseur face aux tirs lointains sans traverser un mur adverse', () => {
    const s = accept(fixture()),
      m = activeMissions(s)[0];
    for (const u of Object.values(s.units)) if (u.ownerId === m.ownerId) delete s.units[u.id];
    for (const p of disk(m, 8)) writeTile(s, p, { terrain: 'PLAIN' });
    const guard = unit(s, { q: m.q, r: m.r }, m.ownerId, 'INFANTRY');
    const second = unit(s, { q: m.q, r: m.r - 1 }, m.ownerId, 'INFANTRY');
    const attacker = unit(s, { q: m.q + 5, r: m.r }, 'a', 'SIEGE');
    const start = key(second),
      before = distance(guard, attacker),
      hp = attacker.hp;
    expect(retaliateMission(s, m, attacker, now, 'distant')).toContain('se rapproche');
    expect(distance(guard, attacker)).toBeLessThan(before);
    expect(distance(guard, m)).toBeLessThanOrEqual(2);
    expect(key(second)).toBe(start);
    expect(attacker.hp).toBe(hp);
    expect(key(guard)).not.toBe(key(second));
    delete s.units[second.id];
    guard.q = m.q;
    guard.r = m.r;
    for (const p of neighbors(guard)) addBuilding(s, s.realms.a, p, 'STEEL_WALL', now);
    expect(retaliateMission(s, m, attacker, now, 'blocked')).toBe('');
    expect(key(guard)).toBe(key(m));
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
    expect(missionsView(loaded, 'a', now)).toEqual(missionsView(s, 'a', now));
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
  it.each([
    [0, 2],
    [1, 2.5],
    [2, 3],
  ])('annonce et verse le multiplicateur de la mission %i', (index, multiplier) => {
    let s = fixture();
    addBuilding(s, s.realms.a, { q: 3, r: 0 }, 'BARRACKS', now, 5);
    prepareDevelopment(s, 'a', 5, now);
    const offer = missionOffers(s, 'a', now)[index];
    expect(offer.reward).toEqual({
      GOLD: Math.round(offer.abandonmentCost.GOLD! * multiplier * 1.3 * 10) / 10,
      FOOD: Math.round(offer.abandonmentCost.FOOD! * multiplier * 1.3 * 10) / 10,
    });
    s = accept(s, index);
    const m = activeMissions(s)[0];
    s.realms.a.wallet.GOLD = 1_000_000;
    const before = structuredClone(s.realms.a.wallet);
    delete s.units[m.objectiveId];
    delete s.buildings[m.objectiveId];
    reconcileMissions(s, now);
    expect(s.realms.a.wallet.GOLD).toBe(before.GOLD + offer.reward!.GOLD!);
    expect(s.realms.a.wallet.FOOD).toBe(before.FOOD + offer.reward!.FOOD!);
    // Above-cap loot persists; normal upkeep for the inherited army still applies.
    expect(s.realms.a.wallet.GOLD).toBeGreaterThan(storage(s, 'a'));
    const goldIncome = income(s, 'a').GOLD;
    accrueEconomy(s, s.realms.a, now + 1000);
    expect(s.realms.a.wallet.GOLD).toBeCloseTo(
      before.GOLD + offer.reward!.GOLD! + Math.min(0, goldIncome) / 60,
      8,
    );
  });
  it('rémunère une ancienne mission en cours sans changer son devis après amélioration', () => {
    let s = accept(fixture(), 1);
    const m = activeMissions(s)[0];
    delete m.reward; // Save from before mission loot existed.
    m.abandonmentCost = { GOLD: 100, FOOD: 60 };
    const quote = missionsView(s, 'a', now).active!.reward!;
    expect(quote).toEqual({ GOLD: 250, FOOD: 150 });
    addBuilding(s, s.realms.a, { q: 3, r: 0 }, 'BARRACKS', now, 5);
    prepareDevelopment(s, 'a', 5, now);
    expect(missionsView(s, 'a', now).active!.reward).toEqual(quote);
    const before = structuredClone(s.realms.a.wallet);
    delete s.units[m.objectiveId];
    delete s.buildings[m.objectiveId];
    reconcileMissions(s, now);
    expect(s.realms.a.wallet.GOLD).toBe(before.GOLD + 250);
    expect(s.realms.a.wallet.FOOD).toBe(before.FOOD + 150);
  });
  it('renouvelle les offres à dix minutes exactement sans créer de forteresse', () => {
    const s = fixture(),
      before = JSON.stringify(s);
    const first = missionsView(s, 'a', now);
    expect(first.offersRefreshAt).toBe(now + 600_000);
    expect(missionsView(s, 'a', now + 599_999).offers).toEqual(first.offers);
    const next = missionsView(s, 'a', now + 600_000);
    expect(next.offersRefreshAt).toBe(now + 1_200_000);
    expect(next.offers).toHaveLength(3);
    next.offers.forEach((offer, i) => {
      expect(offer.id).not.toBe(first.offers[i].id);
      expect(offer.title).not.toBe(first.offers[i].title);
    });
    expect(JSON.stringify(s)).toBe(before);
    const loaded: GameState = JSON.parse(before);
    expect(missionsView(loaded, 'a', now + 600_500)).toEqual(next);
    expect(missionsView(loaded, 'a', now + 3_600_000).offersRefreshAt).toBe(now + 4_200_000);
  });
  it('refuse une ancienne offre après échéance, mais accepte celle du nouveau lot', () => {
    const s = fixture(),
      offer = missionOffers(s, 'a', now)[0];
    const expired = run(s, 'MISSION_ACCEPT', 'a', { offerId: offer.id }, 'a', now + 600_000);
    expect(expired.result.accepted).toBe(false);
    expect(expired.state).toBe(s);
    expect(expired.result.reason).toContain('offre a changé');
    const current = missionOffers(s, 'a', now + 600_000)[0];
    const result = run(s, 'MISSION_ACCEPT', 'a', { offerId: current.id }, 'a', now + 600_000);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.missions!.a.active?.title).toBe(current.title);
  });
  it('préserve une mission acceptée au-delà de plusieurs renouvellements et masque son compteur', () => {
    const s = accept(fixture(), 1);
    const initial = missionsView(s, 'a', now);
    expect(initial.offersRefreshAt).toBeUndefined();
    expect(missionsView(s, 'a', now + 3_600_000)).toEqual(initial);
    const at = now + 1_234_000;
    const abandoned = run(s, 'MISSION_ABANDON', 'a', { missionId: initial.active!.id }, 'a', at);
    expect(abandoned.result.accepted).toBe(true);
    expect(missionsView(abandoned.state, 'a', at).offersRefreshAt).toBe(at + 600_000);
  });
  it('accorde dix minutes complètes aux offres qui suivent une victoire', () => {
    const s = accept(fixture()),
      m = activeMissions(s)[0];
    delete s.units[m.objectiveId];
    delete s.buildings[m.objectiveId];
    reconcileMissions(s, now + 987_000);
    expect(missionsView(s, 'a', now + 987_000).offersRefreshAt).toBe(now + 1_587_000);
  });
  it('conserve toutes les victoires après une nouvelle mission, une reconnexion et un redémarrage du royaume', () => {
    let s = fixture();
    for (let i = 0; i < 2; i++) {
      s = accept(s, i);
      const m = activeMissions(s)[0];
      delete s.units[m.objectiveId];
      delete s.buildings[m.objectiveId];
      reconcileMissions(s, now);
    }
    const trophies = structuredClone(s.missions!.a.trophies!);
    expect(trophies).toHaveLength(2);
    s = JSON.parse(JSON.stringify(s));
    expect(missionsView(s, 'a', now + 900000).trophies).toEqual(trophies);
    s = accept(s);
    s = run(s, 'MISSION_ABANDON', 'a', { missionId: activeMissions(s)[0].id }).state;
    expect(s.missions!.a.trophies).toEqual(trophies);
    restartRealm(s, 'a', now);
    expect(s.missions!.a.trophies).toEqual(trophies);
    removeGuestRealm(s, 'a');
    expect(s.missions?.a).toBeUndefined();
  });
  it('publie un bilan de victoire unique et garde les pertes dans le trophée', () => {
    const s = accept(fixture());
    const m = activeMissions(s)[0];
    m.losses = { units: 2, buildings: 1 };
    delete s.units[m.objectiveId];
    delete s.buildings[m.objectiveId];
    reconcileMissions(s, now);
    const reports = s.journal.filter((j) => j.victory);
    expect(reports).toHaveLength(1);
    expect(reports[0].victory).toMatchObject({
      id: m.id,
      ownerId: 'a',
      losses: { units: 2, buildings: 1 },
    });
    expect(s.missions!.a.trophies![0].losses).toEqual({ units: 2, buildings: 1 });
    reconcileMissions(s, now + 1);
    expect(s.journal.filter((j) => j.victory)).toHaveLength(1);
    expect(worldView(s, 'a', now).journal.some((j) => j.victory)).toBe(true);
  });
  it('comptabilise une troupe tuée par une riposte de garnison', () => {
    const s = accept(fixture()),
      m = activeMissions(s)[0];
    const target = Object.values(s.buildings).find((b) => b.ownerId === m.ownerId)!;
    target.hp = 1e6;
    const guard = Object.values(s.units).find((u) => u.ownerId === m.ownerId)!;
    Object.assign(guard, { kind: 'ARCHER', q: target.q, r: target.r });
    const attacker = unit(s, neighbors(target)[0], 'a', 'INFANTRY');
    attacker.hp = 1;
    const result = run(s, 'ATTACK', attacker.id, { targetId: target.id });
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.units[attacker.id]).toBeUndefined();
    expect(activeMissions(result.state)[0].losses).toEqual({ units: 1, buildings: 0 });
  });
});
