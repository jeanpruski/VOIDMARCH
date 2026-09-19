import { prepareDevelopment } from './fixtures/development';
import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { EXPEDITION_SITES, UNITS, isSea, expeditionSearchCost } from '@voidmarch/config';
import {
  expeditionFootprint,
  expeditionDistance,
  createState,
  createRealm,
  distance,
  disk,
  tileAt,
  writeTile,
  key,
  storage,
} from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import {
  expeditionOffers,
  expeditionSitePosition,
  expeditionInteraction,
  reconcileExpeditions,
  expeditionCarrier,
} from '../apps/server/src/expeditions';
import { reconcileMissions, missionOffers } from '../apps/server/src/missions';
import type { GameState, ActiveMission, Unit, MissionOffer } from '@voidmarch/shared';
const now = 1900000000000;
function fixture() {
  const s = createState('adventures-test', now);
  addPlayer(s, 'a', 'Voyageurs', 'ASH', now);
  s.realms.a.wallet = { GOLD: 1e6, WOOD: 1e6, STONE: 1e6, IRON: 1e6, FOOD: 1e6 };
  return s;
}
function run(s: GameState, type: string, actorId: string, payload: unknown, id = 'a') {
  return execute(
    s,
    id,
    actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now }),
    now,
  );
}
function offer(s: GameState, mode = 'RECON'): MissionOffer {
  const o = expeditionOffers(s, 'a', now).find((o) => o.expedition!.mode === mode)!;
  return { ...o, expedition: { ...o.expedition!, siteId: 'chernobyl', route: 'LAND' as const } };
}
function active(s: GameState, mode = 'RECON') {
  const o = offer(s, mode);
  const m: ActiveMission = {
    ...o,
    id: 'exp-test',
    ownerId: 'mission:exp-test',
    realmId: 'a',
    q: 70,
    r: 0,
    distance: 70,
    objectiveId: 'expedition:test',
    startedAt: now,
    expedition: { ...o.expedition!, phase: 'VISIT' },
  };
  s.missions = { a: { generation: 0, active: m } };
  return m;
}
function unit(s: GameState, id = 'scout', ownerId = 'a', kind: Unit['kind'] = 'PEASANT'): Unit {
  return (s.units[id] = {
    id,
    ownerId,
    kind,
    q: 70,
    r: 0,
    hp: UNITS[kind].hp,
    createdAt: now,
    updatedAt: now,
  });
}
describe('expéditions et aventures', () => {
  it('25 lieux réels uniques, 15 terrestres et 10 maritimes', () => {
    expect(EXPEDITION_SITES).toHaveLength(25);
    expect(new Set(EXPEDITION_SITES.map((s) => s.id)).size).toBe(25);
    expect(EXPEDITION_SITES.filter((s) => s.environment === 'LAND')).toHaveLength(15);
    expect(EXPEDITION_SITES.every((s) => s.source.startsWith('https://') && s.realPlace)).toBe(
      true,
    );
    expect(EXPEDITION_SITES.find((s) => s.id === 'jeff')!.realPlace).toBe('Little Saint James');
  });
  it('trois variantes stables, renouvelées toutes les dix minutes, avec devis croissants', () => {
    const s = fixture();
    const offers = expeditionOffers(s, 'a', now);
    expect(offers.map((o) => o.expedition!.mode)).toEqual(['RECON', 'RECOVER', 'EXTRACT']);
    expect(expeditionOffers(s, 'a', now + 599999)).toEqual(offers);
    expect(expeditionOffers(s, 'a', now + 600000).map((o) => o.id)).not.toEqual(
      offers.map((o) => o.id),
    );
    for (const o of offers) {
      expect(o.expedition!.targetDistance).toBeGreaterThanOrEqual(60);
      expect(o.expedition!.targetDistance).toBeLessThanOrEqual(200);
      expect(o.reward!.GOLD).toBeGreaterThan(o.abandonmentCost.GOLD! * 3);
    }
    addBuilding(s, s.realms.a, { q: 1, r: 0 }, 'BARRACKS', now, 5);
    expect(expeditionOffers(s, 'a', now)[0].reward).toEqual(offers[0].reward);
    prepareDevelopment(s, 'a', 5, now);
    expect(expeditionOffers(s, 'a', now)[0].reward!.GOLD).toBeGreaterThan(
      offers[0].reward!.GOLD! * 20,
    );
  });
  it('cherche un site terrestre accessible à 60–200 cases sans mutation du terrain', () => {
    const s = fixture(),
      before = structuredClone(s.tiles);
    const p = expeditionSitePosition(s, 'a', offer(s))!;
    expect(p).toBeDefined();
    expect(distance(p, s.realms.a.capital)).toBeGreaterThanOrEqual(60);
    expect(distance(p, s.realms.a.capital)).toBeLessThanOrEqual(200);
    expect(isSea(tileAt(s, p).terrain)).toBe(false);
    expect(s.tiles).toEqual(before);
  });
  it.each([0, 1, 2, 3, 4, 5])(
    'trois cases contiguës et stables pour l’orientation %s',
    (orientation) => {
      const s = fixture(),
        m = active(s);
      m.expedition!.orientation = orientation;
      const cells = expeditionFootprint(m);
      expect(new Set(cells.map(key)).size).toBe(3);
      for (const a of cells) for (const b of cells) expect(distance(a, b)).toBeLessThanOrEqual(1);
      expect(expeditionFootprint(structuredClone(m))).toEqual(cells);
    },
  );
  it('explore depuis le bord externe, à deux cases de l’ancien centre, une seule récompense', () => {
    const s = fixture(),
      m = active(s);
    m.expedition!.orientation = 0;
    const u = unit(s);
    u.q = 72;
    expect(distance(u, m)).toBe(2);
    expect(expeditionDistance(m, u)).toBe(1);
    const result = run(s, 'INTERACT', u.id, { expeditionId: m.id });
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.missions!.a.trophies).toHaveLength(1);
    expect(run(result.state, 'INTERACT', u.id, { expeditionId: m.id }).result.accepted).toBe(false);
  });
  it('réserve les trois cases contre les bâtiments, routes et terrassements', () => {
    const s = fixture(),
      m = active(s);
    m.expedition!.orientation = 0;
    for (const cell of expeditionFootprint(m)) {
      const road = run(s, 'ROAD', 'a', cell);
      expect(road.result.reason).toContain('réservé à une expédition');
      const build = run(s, 'BUILD', 'a', { ...cell, kind: 'FARM' });
      expect(build.result.reason).toContain('réservé à une expédition');
      const terraform = run(s, 'TERRAFORM', 'a', cell);
      expect(terraform.result.reason).toContain('réservé à une expédition');
      expect(road.state.realms.a.wallet).toEqual(s.realms.a.wallet);
    }
  });
  it('évite un obstacle sur une case secondaire et conserve le terrain existant', () => {
    const s = fixture(),
      o = offer(s);
    const p = expeditionSitePosition(s, 'a', o)!;
    const cells = expeditionFootprint({
      ...p,
      expedition: { ...o.expedition!, orientation: p.orientation },
    });
    writeTile(s, cells[1], { road: true, roadOwnerId: 'a' });
    const next = expeditionSitePosition(s, 'a', o)!;
    expect(next).toBeDefined();
    expect(key(next)).not.toBe(key(p));
    expect(tileAt(s, cells[1]).road).toBe(true);
    for (const h of expeditionFootprint({
      ...next,
      expedition: { ...o.expedition!, orientation: next.orientation },
    })) {
      expect(distance(h, s.realms.a.capital)).toBeGreaterThanOrEqual(60);
      expect(distance(h, s.realms.a.capital)).toBeLessThanOrEqual(200);
      expect(isSea(tileAt(s, h).terrain)).toBe(false);
    }
  });
  it('une acceptation crée seulement l’objectif et bloque les deux catégories', () => {
    const s = fixture();
    let o = expeditionOffers(s, 'a', now).find((o) => o.expedition!.route === 'LAND');
    expect(o).toBeDefined();
    const result = run(s, 'MISSION_ACCEPT', 'a', { offerId: o!.id });
    expect(result.result.accepted, result.result.reason).toBe(true);
    const next = result.state;
    expect(next.missions!.a.active!.expedition).toBeDefined();
    expect(Object.keys(next.buildings)).toEqual(Object.keys(s.buildings));
    expect(expeditionOffers(next, 'a', now)).toEqual([]);
    expect(missionOffers(next, 'a', now)).toEqual([]);
    expect(reconcileMissions(next, now)).toEqual([]);
    expect(next.missions!.a.active).toBeDefined();
  });
  it('refuse les approches lointaines et les acteurs étrangers sans dépenser', () => {
    const s = fixture();
    active(s);
    const u = unit(s);
    u.q = 0;
    const a = run(s, 'INTERACT', u.id, { expeditionId: 'exp-test' });
    expect(a.result.accepted).toBe(false);
    expect(a.state.realms.a.ap).toBe(s.realms.a.ap);
    s.realms.b = createRealm('b', 'Autres', 'ASH', { q: 0, r: 20 }, now);
    unit(s, 'intruder', 'b');
    expect(run(s, 'INTERACT', 'intruder', { expeditionId: 'exp-test' }, 'b').result.accepted).toBe(
      false,
    );
  });
  it.each(['RECON', 'RECOVER'])(
    '%s verse le butin au-delà du stockage une seule fois, avec médaille et carnet',
    (mode) => {
      const s = fixture(),
        m = active(s, mode);
      unit(s);
      const before = s.realms.a.wallet.GOLD,
        ap = s.realms.a.ap;
      const r = run(s, 'INTERACT', 'scout', { expeditionId: m.id });
      expect(r.result.accepted, r.result.reason).toBe(true);
      expect(r.state.realms.a.ap).toBe(ap - (mode === 'RECOVER' ? 3 : 1));
      expect(r.state.realms.a.wallet.GOLD).toBeGreaterThanOrEqual(before + m.reward!.GOLD!);
      expect(r.state.missions!.a.active).toBeUndefined();
      expect(r.state.missions!.a.trophies![0].mission.expedition!.siteId).toBe('chernobyl');
      expect(run(r.state, 'INTERACT', 'scout', { expeditionId: m.id }).result.accepted).toBe(false);
    },
  );
  it('la récupération facture ses vivres, sans avancer la quête si la réserve ou les PA manquent', () => {
    const s = fixture(),
      m = active(s, 'RECOVER');
    unit(s);
    const food = expeditionSearchCost(m.level).FOOD;
    s.realms.a.wallet.FOOD = food - 1;
    expect(run(s, 'INTERACT', 'scout', { expeditionId: m.id }).state).toBe(s);
    s.realms.a.wallet.FOOD = food;
    s.realms.a.ap = 2;
    expect(run(s, 'INTERACT', 'scout', { expeditionId: m.id }).state).toBe(s);
    s.realms.a.ap = 3;
    const result = run(s, 'INTERACT', 'scout', { expeditionId: m.id });
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.a.ap).toBe(0);
    expect(result.state.realms.a.wallet.FOOD).toBe(m.reward!.FOOD);
  });
  it('l’extraction exige le retour du vrai porteur et ne paie pas à la collecte', () => {
    let s = fixture();
    const m = active(s, 'EXTRACT');
    unit(s);
    const before = s.realms.a.wallet.GOLD;
    const pickup = run(s, 'INTERACT', 'scout', { expeditionId: m.id });
    expect(pickup.result.accepted, pickup.result.reason).toBe(true);
    s = pickup.state;
    expect(s.realms.a.wallet.GOLD).toBe(before);
    expect(s.missions!.a.active!.expedition!.phase).toBe('RETURN');
    expect(run(s, 'INTERACT', 'scout', { expeditionId: m.id }).result.accepted).toBe(false);
    unit(s, 'other').q = 0;
    expect(run(s, 'INTERACT', 'other', { expeditionId: m.id }).result.accepted).toBe(false);
    Object.assign(s.units.scout, s.realms.a.capital);
    const delivered = run(s, 'INTERACT', 'scout', { expeditionId: m.id });
    expect(delivered.result.accepted, delivered.result.reason).toBe(true);
    expect(delivered.state.realms.a.wallet.GOLD).toBeGreaterThan(before);
  });
  it('l’objet suit un passager embarqué puis peut être livré depuis le transport', () => {
    let s = fixture();
    const m = active(s, 'EXTRACT');
    unit(s);
    s = run(s, 'INTERACT', 'scout', { expeditionId: m.id }).state;
    const carrier = unit(s, 'truck', 'a', 'CARGO_TRUCK');
    carrier.cargo = [s.units.scout];
    delete s.units.scout;
    Object.assign(carrier, s.realms.a.capital);
    reconcileExpeditions(s, now);
    expect(expeditionCarrier(s, s.missions!.a.active!)?.id).toBe('truck');
    expect(run(s, 'INTERACT', 'truck', { expeditionId: m.id }).result.accepted).toBe(true);
  });
  it('un porteur perdu remet l’objet sur le site sans dupliquer le butin', () => {
    let s = fixture();
    const m = active(s, 'EXTRACT');
    unit(s);
    s = run(s, 'INTERACT', 'scout', { expeditionId: m.id }).state;
    delete s.units.scout;
    reconcileExpeditions(s, now);
    expect(s.missions!.a.active!.expedition!.phase).toBe('VISIT');
    expect(s.missions!.a.trophies ?? []).toHaveLength(0);
  });
  it('les alliés peuvent explorer ; le commanditaire reçoit le butin', () => {
    const s = fixture(),
      m = active(s);
    s.realms.b = createRealm('b', 'Allié', 'ASH', { q: 50, r: 0 }, now);
    s.strategy ??= { alliances: {}, sites: {}, strikes: {} } as any;
    s.strategy!.alliances.team = {
      id: 'team',
      name: 'Amis',
      leaderId: 'a',
      members: ['a', 'b'],
      emblem: 'eye',
      createdAt: now,
      messages: [],
      operations: [],
    } as any;
    unit(s, 'ally', 'b');
    const before = s.realms.a.wallet.GOLD,
      other = s.realms.b.wallet.GOLD;
    const r = run(s, 'INTERACT', 'ally', { expeditionId: m.id }, 'b');
    expect(r.result.accepted, r.result.reason).toBe(true);
    expect(r.state.realms.a.wallet.GOLD).toBeGreaterThan(before);
    expect(r.state.realms.b.wallet.GOLD).toBe(other);
    expect(r.state.missions!.a.trophies![0].mission.expedition!.participants).toContain('b');
  });
  it('l’abandon sans ressources impose un repos, supprime le site et préserve les troupes', () => {
    const s = fixture(),
      m = active(s);
    unit(s);
    s.realms.a.wallet.GOLD = 0;
    const partial = run(s, 'MISSION_ABANDON', 'a', { missionId: m.id });
    expect(partial.result.accepted).toBe(true);
    expect(partial.state.missions!.a.availableAt).toBeGreaterThan(now);
    const restored = JSON.parse(JSON.stringify(partial.state)) as GameState;
    expect(expeditionOffers(restored, 'a', now)).toEqual([]);
    expect(missionOffers(restored, 'a', now)).toEqual([]);
    const ready = restored.missions!.a.availableAt!;
    expect(expeditionOffers(restored, 'a', ready).length).toBeGreaterThan(0);
    expect(missionOffers(restored, 'a', ready).length).toBeGreaterThan(0);

    s.realms.a.wallet.GOLD = 1e6;
    const r = run(s, 'MISSION_ABANDON', 'a', { missionId: m.id });
    expect(r.result.accepted).toBe(true);
    expect(r.state.missions!.a.active).toBeUndefined();
    expect(r.state.units.scout).toBeDefined();
  });
  it('une expédition en mer exige un navire pour la recherche du site et la visite', () => {
    const s = fixture(),
      o = offer(s);
    o.expedition!.route = 'SEA';
    expect(expeditionSitePosition(s, 'a', o)).toBeUndefined();
    const m = active(s);
    m.expedition!.route = 'SEA';
    unit(s);
    expect(run(s, 'INTERACT', 'scout', { expeditionId: m.id }).result.accepted).toBe(false);
    unit(s, 'boat', 'a', 'TROOP_FERRY');
    writeTile(s, m, { terrain: 'SEA' });
    expect(run(s, 'INTERACT', 'boat', { expeditionId: m.id }).result.accepted).toBe(true);
  });
  it('un site entièrement visible est refusé et aucun terrain ni royaume n’est modifié', () => {
    const s = fixture();
    const previousOffer = offer(s);
    for (const p of disk(s.realms.a.capital, 200))
      s.units['view:' + key(p)] = {
        id: 'view:' + key(p),
        ownerId: 'a',
        kind: 'PEASANT',
        ...p,
        hp: 1,
        createdAt: now,
        updatedAt: now,
      };
    expect(expeditionOffers(s, 'a', now)).toEqual([]);
    expect(expeditionSitePosition(s, 'a', previousOffer)).toBeUndefined();
  });
});
