import { navalMissionSite } from '../apps/server/src/naval-missions';
import { distance } from '@voidmarch/game-rules';
import { isSea, EXPEDITION_REWARD_BOOST } from '@voidmarch/config';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { EXPEDITION_SITES, EXPEDITION_GOLD, UNITS } from '@voidmarch/config';
import {
  createState,
  key,
  tileAt,
  writeTile,
  disk,
  anomalyAPReward,
  refreshAP,
  movementAPCost,
} from '@voidmarch/game-rules';
import type { ActiveMission, GameState, MissionOffer } from '@voidmarch/shared';
import { actionSchema } from '@voidmarch/protocol';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { missionOffers } from '../apps/server/src/missions';
import {
  expeditionOffers,
  expeditionSitePosition,
  reconcileExpeditions,
} from '../apps/server/src/expeditions';
import { createMissionTrophy } from '../apps/server/src/mission-trophies';
import { placementOrder } from '../apps/server/src/mission-placement';
import { predictAction } from '../apps/web/src/optimistic-actions';
const override = vi.hoisted(() => ({ visible: undefined as Set<string> | undefined }));
vi.mock('@voidmarch/game-rules', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@voidmarch/game-rules')>();
  return {
    ...actual,
    vision: (...args: Parameters<typeof actual.vision>) =>
      override.visible ?? actual.vision(...args),
  };
});
afterEach(() => {
  override.visible = undefined;
});
const now = 1_900_000_000_000;
function fixture(seed = 'adventures-test') {
  const s = createState(seed, now);
  const r = addPlayer(s, 'a', 'Voyageurs', 'ASH', now);
  s.units.worker = {
    id: 'worker',
    ownerId: 'a',
    kind: 'PEASANT',
    ...r.capital,
    hp: UNITS.PEASANT.hp,
    createdAt: now,
    updatedAt: now,
  };
  r.wallet = { GOLD: 10000, FOOD: 10000, IRON: 10000, WOOD: 10000, STONE: 10000 };
  return s;
}
function action(type: string, actorId: string, payload: unknown) {
  return actionSchema.parse({
    type,
    actorId,
    payload,
    actionId: randomUUID(),
    clientTimestamp: now,
  });
}
function trophy(offer: MissionOffer, i = 0) {
  const mission: ActiveMission = {
    ...offer,
    id: `done:${i}`,
    realmId: 'a',
    ownerId: 'mission:test',
    objectiveId: 'target',
    q: 100,
    r: 0,
    distance: 100,
    startedAt: now,
  };
  return createMissionTrophy(
    mission,
    now,
    { units: 0, buildings: 0, walls: 0 },
    offer.reward ?? {},
  );
}

describe('exploration rémunérée et déplacements gratuits', () => {
  it('donne de 1 à 6 PA stables, dépasse 20 et empêche la double collecte', () => {
    const rolls = new Set(
      Array.from({ length: 300 }, (_, i) => anomalyAPReward('test', String(i))),
    );
    expect([...rolls].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    const s = fixture();
    const id = Array.from({ length: 100 }, (_, i) => `reward:${i}`).find(
      (id) => anomalyAPReward(s.seed, id) === 6,
    )!;
    s.realms.a.ap = 20;
    s.events[id] = {
      ...s.units.worker,
      id,
      kind: 'METEOR',
      title: 'Étoile',
      description: '',
      startsAt: now,
      endsAt: now + 60000,
      global: false,
      reward: { GOLD: 25 },
    };
    const order = action('INTERACT', 'worker', { eventId: id });
    const predicted = predictAction(worldView(s, 'a', now), order)!;
    const result = execute(s, 'a', order, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.realms.a.ap).toBe(25); // 20 - 1 + 6
    expect(predicted.world.player.ap).toBe(25);
    expect(result.result.message).toContain('+6 PA');
    expect(result.state.realms.a.wallet.GOLD).toBe(s.realms.a.wallet.GOLD + 25);
    const duplicate = execute(
      result.state,
      'a',
      action('INTERACT', 'worker', { eventId: id }),
      now,
    );
    expect(duplicate.result.accepted).toBe(false);
    refreshAP(result.state.realms.a, now + 120000, 30000);
    expect(result.state.realms.a.ap).toBe(25);
  });
  it('accorde aussi les PA aux ruines, une seule fois', () => {
    const s = fixture();
    writeTile(s, s.units.worker, { poi: 'RARE', exhausted: false });
    const result = execute(s, 'a', action('INTERACT', 'worker', {}), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.a.ap).toBe(39 + anomalyAPReward(s.seed, key(s.units.worker)));
    expect(execute(result.state, 'a', action('INTERACT', 'worker', {}), now).result.accepted).toBe(
      false,
    );
  });
  it('autorise un MOVE ordinaire et un MOVE_ROAD gratuits avec zéro PA, mais pas une sortie du réseau', () => {
    const s = fixture();
    s.realms.a.ap = 0;
    for (const p of disk(s.units.worker, 2))
      writeTile(s, p, { terrain: 'PLAIN', road: true, poi: undefined });
    const start = s.units.worker,
      target = { q: start.q + 1, r: start.r };
    // Keep targets free even if hero generation picked this location.
    for (const u of Object.values(s.units)) if (u.id !== 'worker') delete s.units[u.id];
    for (const order of [
      action('MOVE', 'worker', { path: [target] }),
      action('MOVE_ROAD', 'worker', target),
    ]) {
      const result = execute(s, 'a', order, now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.state.realms.a.ap).toBe(0);
      expect(predictAction(worldView(s, 'a', now), order)!.world.player.ap).toBe(0);
    }
    writeTile(s, target, { road: false, ownerId: 'a', enclosureOwnerId: undefined });
    expect(execute(s, 'a', action('MOVE', 'worker', { path: [target] }), now).result.accepted).toBe(
      false,
    );
    expect(movementAPCost(start, [target], (p) => tileAt(s, p), 'a', 'PEASANT')).toBe(1);
    writeTile(s, target, { enclosureOwnerId: 'a' });
    expect(execute(s, 'a', action('MOVE', 'worker', { path: [target] }), now).result.accepted).toBe(
      true,
    );
  });
  it('facture seulement la troupe sortant du réseau dans un groupe mixte, et reste atomique si insuffisant', () => {
    const s = fixture();
    s.units = {
      worker: s.units.worker,
      other: { ...s.units.worker, id: 'other', q: s.units.worker.q, r: s.units.worker.r + 3 },
    };
    for (const p of disk(s.units.worker, 5)) writeTile(s, p, { terrain: 'PLAIN', poi: undefined });
    const target = { q: s.units.worker.q + 1, r: s.units.worker.r };
    writeTile(s, s.units.worker, { road: true });
    writeTile(s, target, { road: true });
    const group = action('MOVE_GROUP', 'a', {
      orders: [
        { type: 'MOVE', actorId: 'worker', payload: { path: [target] } },
        {
          type: 'MOVE',
          actorId: 'other',
          payload: { path: [{ q: s.units.other.q + 1, r: s.units.other.r }] },
        },
      ],
    });
    s.realms.a.ap = 0;
    const rejected = execute(s, 'a', group, now);
    expect(rejected.result.accepted).toBe(false);
    expect(rejected.state).toBe(s);
    s.realms.a.ap = 1;
    const result = execute(s, 'a', { ...group, actionId: randomUUID() }, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.realms.a.ap).toBe(0);
    expect(result.result.movements).toHaveLength(2);
  });
});

describe('offres, historique personnel et repli de placement', () => {
  it('garde les frais d’abandon et applique les primes d’aventure aux nouveaux butins', () => {
    const s = fixture();
    for (const offer of expeditionOffers(s, 'a', now)) {
      const e = offer.expedition!;
      const base =
        EXPEDITION_GOLD[offer.level] *
        (0.65 + e.targetDistance / 150) *
        { RECON: 1, RECOVER: 1.4, EXTRACT: 2.2 }[e.mode] *
        (e.route === 'SEA' ? 1.25 : 1);
      expect(offer.reward!.GOLD).toBe(Math.round(base * 1.3) * EXPEDITION_REWARD_BOOST[e.mode]);
      expect(offer.abandonmentCost.GOLD).toBe(Math.round(Math.round(base) / 5));
    }
  });
  it('exclut les campagnes accomplies tant qu’un autre titre existe, puis accepte les répétitions', () => {
    const s = fixture();
    const first = missionOffers(s, 'a', now);
    s.missions = { a: { generation: 0, trophies: first.map((o, i) => trophy(o, i)) } };
    const second = missionOffers(s, 'a', now);
    expect(second.every((o) => !first.some((old) => old.title === o.title))).toBe(true);
    s.missions.a.trophies!.push(...second.map((o, i) => trophy(o, i + 3)));
    expect(missionOffers(s, 'a', now)).toHaveLength(3);
    expect(missionOffers(s, 'a', now).every((o) => o.completedBefore)).toBe(true);
  });
  it('ne repropose pas un lieu accompli sous un autre objectif, et se souvient des découvertes', () => {
    const s = fixture();
    const first = expeditionOffers(s, 'a', now);
    const done = first[0];
    s.missions = {
      a: {
        generation: 0,
        trophies: [trophy(done)],
        discoveredSites: first.map((o) => o.expedition!.siteId),
      },
    };
    const next = expeditionOffers(s, 'a', now);
    expect(next.length).toBeGreaterThan(0);
    expect(next.every((o) => o.expedition!.siteId !== done.expedition!.siteId)).toBe(true);
    for (const o of next)
      if (s.missions.a.discoveredSites!.includes(o.expedition!.siteId))
        expect(o.discoveredBefore).toBe(true);
    s.missions.a.trophies = EXPEDITION_SITES.map((site, i) =>
      trophy({ ...done, expedition: { ...done.expedition!, siteId: site.id } }, i),
    );
    const repeats = expeditionOffers(s, 'a', now);
    expect(repeats.length).toBeGreaterThan(0);
    expect(repeats.every((o) => o.completedBefore && o.discoveredBefore)).toBe(true);
  });
  it('conserve la découverte d’un site vu avant la réussite ou l’abandon', () => {
    const s = fixture();
    const offer = expeditionOffers(s, 'a', now)[0];
    const m: ActiveMission = {
      ...offer,
      id: 'active',
      ownerId: 'mission:test',
      realmId: 'a',
      objectiveId: 'test',
      ...s.realms.a.capital,
      startedAt: now,
      distance: 80,
    };
    s.missions = { a: { generation: 0, active: m } };
    reconcileExpeditions(s, now);
    expect(s.missions.a.discoveredSites).toContain(offer.expedition!.siteId);
    expect(s.missions.a.trophies).toBeUndefined();
  });
  it('choisit une zone visible libre quand tout est visible, sans modifier les terrains à la proposition', () => {
    const s = fixture('fully-visible-fallback');
    class Omniscient extends Set<string> {
      override has() {
        return true;
      }
    }
    override.visible = new Omniscient();
    const before = JSON.stringify(s.tiles);
    const offers = expeditionOffers(s, 'a', now);
    expect(offers.length).toBeGreaterThan(0);
    const p = expeditionSitePosition(s, 'a', offers[0]);
    expect(p).toBeDefined();
    expect(JSON.stringify(s.tiles)).toBe(before);
    const result = execute(s, 'a', action('MISSION_ACCEPT', 'a', { offerId: offers[0].id }), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    const conquest = execute(
      s,
      'a',
      action('MISSION_ACCEPT', 'a', { offerId: missionOffers(s, 'a', now)[0].id }),
      now,
    );
    expect(conquest.result.accepted, conquest.result.reason).toBe(true);
  });
  it('préfère inconnu, puis souvenir hors de vue, puis la zone visible la moins occupée', () => {
    const s = fixture(),
      points = [
        { q: 30, r: 0 },
        { q: 60, r: 0 },
        { q: 90, r: 0 },
        { q: 120, r: 0 },
      ];
    s.realms.a.explored[key(points[1])] = { ...tileAt(s, points[1]), visibility: 'EXPLORED' };
    s.units.near = { ...s.units.worker, id: 'near', ...points[3] };
    const seen = new Set([key(points[2]), key(points[3])]);
    expect(placementOrder(s, 'a', [...points].reverse(), seen, 2)).toEqual(points);
  });
  it('propose une offre maritime environ une fois sur deux sans flotte, de façon stable au rechargement', () => {
    const s = fixture();
    s.oceanVersion = 1;
    let naval = 0;
    for (let i = 0; i < 1000; i++)
      naval += Number(missionOffers(s, 'a', now + i * 600000).some((o) => o.maritime));
    expect(naval).toBeGreaterThan(450);
    expect(naval).toBeLessThan(550);
    expect(missionOffers(JSON.parse(JSON.stringify(s)), 'a', now + 1)).toEqual(
      missionOffers(s, 'a', now),
    );
  });
});

it('trouve une rade au-delà de 200 cases même sans aucun bateau', () => {
  const s = fixture('far-maritime-coast');
  s.oceanVersion = 1;
  s.protectedLand = Object.fromEntries(disk({ q: 0, r: 0 }, 20).map((p) => [key(p), true]));
  let offer: MissionOffer | undefined;
  for (let i = 0; i < 30 && !offer; i++)
    offer = missionOffers(s, 'a', now + i * 600000).find((o) => o.maritime);
  expect(offer).toBeDefined();
  const site = navalMissionSite(s, 'a', offer!);
  expect(site).toBeDefined();
  expect(distance(s.realms.a.capital, site!.center)).toBeGreaterThan(200);
  expect(site!.buildingSpots).toHaveLength(2);
  expect(site!.spots.every((p) => isSea(tileAt(s, p).terrain))).toBe(true);
}, 20000);
