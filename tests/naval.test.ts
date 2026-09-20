import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  UNITS,
  NAVAL_UNITS,
  NAVAL_PROFILES,
  NAVAL_FRAMES,
  NAVAL_BUILDING_FRAMES,
  isSea,
  UNIT_PROFILES,
  type UnitKind,
  type Terrain,
} from '@voidmarch/config';
import {
  createState,
  createRealm,
  migrateOceans,
  oceanWater,
  oceanTerrain,
  tileAt,
  disk,
  key,
  neighbors,
  writeTile,
  movementCost,
  roadPaths,
  submarineVisible,
  navalConstructionReason,
  attackBlockReason,
  passengerSize,
  cargoUsed,
  recruitmentRequirement,
  terrainCombatBonus,
  seaTradeRoute,
} from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { destroyUnit } from '../apps/server/src/transports';
import { navalMissionSite } from '../apps/server/src/naval-missions';
import { missionOffers, reconcileMissions } from '../apps/server/src/missions';
import { launchTrade } from '../apps/server/src/strategy';
import { tickMaritimeEvents } from '../apps/server/src/maritime-events';
import type { GameState, Unit, Hex } from '@voidmarch/shared';
const now = 1900000000000;
function unit(s: GameState, id: string, kind: UnitKind, p: Hex, ownerId = 'p'): Unit {
  return (s.units[id] = {
    id,
    kind,
    ...p,
    ownerId,
    hp: UNITS[kind].hp,
    createdAt: now,
    updatedAt: now,
  });
}
function fixture() {
  const s = createState('naval-test', now);
  const r = (s.realms.p = createRealm('p', 'Marins', 'ASH', { q: 0, r: 0 }, now));
  r.wallet = { GOLD: 1000000, WOOD: 1000000, STONE: 1000000, IRON: 1000000, FOOD: 1000000 };
  r.unlimitedAP = true;
  r.protectedUntil = 0;
  s.realms.e = createRealm('e', 'Ennemis', 'IRON', { q: 80, r: 0 }, now);
  s.realms.e.protectedUntil = 0;
  for (const p of disk(r.capital, 12)) {
    const terrain: Terrain = p.q >= 3 ? 'COAST' : p.q >= 0 ? 'BEACH' : 'PLAIN';
    const t = writeTile(s, p, { terrain, ownerId: p.q < 3 ? 'p' : undefined });
    r.explored[key(p)] = { ...t, visibility: 'EXPLORED' };
  }
  addBuilding(s, r, { q: 0, r: 0 }, 'CAMP', now);
  return s;
}
function run(s: GameState, type: string, actorId: string, payload: unknown = {}, at = now) {
  return execute(
    s,
    'p',
    actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: at }),
    at,
  );
}
describe('mers, côtes et conservation', () => {
  it('préserve exactement les terrains explorés et occupés, sans réactiver une ancienne propriété', () => {
    const s = fixture();
    s.realms.p.explored['400,400'] = {
      q: 400,
      r: 400,
      terrain: 'FOREST',
      biome: 'SNOW',
      ownerId: 'old',
      visibility: 'EXPLORED',
    };
    const tiles = structuredClone(s.tiles),
      buildings = structuredClone(s.buildings);
    expect(migrateOceans(s)).toBe(true);
    expect(migrateOceans(s)).toBe(false);
    for (const [k, t] of Object.entries(tiles)) expect(s.tiles[k]).toEqual(t);
    expect(s.buildings).toEqual(buildings);
    expect(tileAt(s, { q: 400, r: 400 })).toMatchObject({ terrain: 'FOREST', biome: 'SNOW' });
    expect(tileAt(s, { q: 400, r: 400 }).ownerId).toBeUndefined();
    const reload = JSON.parse(JSON.stringify(s));
    for (const p of [
      { q: 400, r: 400 },
      { q: -550, r: 180 },
      { q: 270, r: 99 },
    ])
      expect(tileAt(reload, p)).toEqual(tileAt(s, p));
  });
  it('produit des mers étendues, des plages de deux à trois cases et un centre terrestre', () => {
    const s = createState('ocean-geography', now);
    migrateOceans(s);
    const samples = [];
    for (let q = -250; q <= 250; q += 3)
      for (let r = -250; r <= 250; r += 3) samples.push({ q, r });
    const water = samples.filter((p) => oceanWater(s, p));
    expect(water.length / samples.length).toBeGreaterThan(0.15);
    expect(water.length / samples.length).toBeLessThan(0.65);
    expect(water.some((p) => disk(p, 15).every((n) => oceanWater(s, n)))).toBe(true);
    expect(disk({ q: 0, r: 0 }, 20).every((p) => !oceanWater(s, p))).toBe(true);
    const beaches = samples.filter((p) => oceanTerrain(s, p) === 'BEACH').slice(0, 40);
    expect(beaches.length).toBeGreaterThan(10);
    for (const p of beaches) {
      expect(oceanWater(s, p)).toBe(false);
      expect(disk(p, 3).some((n) => oceanWater(s, n))).toBe(true);
    }
    for (const p of samples.filter((p) => !oceanWater(s, p)).slice(0, 1000))
      if (disk(p, 2).some((n) => oceanWater(s, n))) expect(oceanTerrain(s, p)).toBe('BEACH');
  });
  it('interdit la mer aux routes, aux paysans et au terrassement, mais laisse passer les avions', () => {
    const s = fixture();
    unit(s, 'worker', 'TERRAFORMER', { q: 2, r: 0 });
    for (const terrain of ['SEA', 'COAST'] as const) {
      expect(movementCost({ q: 0, r: 0, terrain, road: true }, 'PEASANT')).toBe(99);
      expect(movementCost({ q: 0, r: 0, terrain }, 'FIGHTER')).toBe(1);
      expect(movementCost({ q: 0, r: 0, terrain }, 'WAR_GALLEY')).toBe(1);
    }
    expect(movementCost({ q: 0, r: 0, terrain: 'BEACH' }, 'WAR_GALLEY')).toBe(99);
    expect(run(s, 'TERRAFORM', 'worker', { q: 3, r: 0 }).result.accepted).toBe(false);
    expect(run(s, 'ROAD', 'p', { q: 3, r: 0 }).result.accepted).toBe(false);
    expect(
      roadPaths(
        { q: 3, r: 0 },
        new Map([['3,0', { q: 3, r: 0, terrain: 'COAST', road: true, ownerId: 'p' }]]),
        new Set(),
        'WAR_GALLEY',
        'p',
      ).size,
    ).toBe(0);
  });
});
describe('flottes et côtes', () => {
  it('exige une côte pour construire, lance les navires sur une eau neutre et conserve le paiement', () => {
    const s = fixture();
    const r = s.realms.p;
    expect(run(s, 'BUILD', 'p', { q: -2, r: 0, kind: 'PORT' }).result.accepted).toBe(false);
    unit(s, 'builder', 'PEASANT', { q: 2, r: 0 });
    const build = run(s, 'BUILD', 'builder', { q: 3, r: 0, kind: 'PORT' });
    expect(build.result.accepted, build.result.reason).toBe(true);
    const b = Object.values(build.state.buildings).find((b) => b.kind === 'PORT')!;
    const recruit = run(build.state, 'RECRUIT', b.id, { kind: 'TROOP_FERRY' });
    expect(recruit.result.accepted, recruit.result.reason).toBe(true);
    const ship = Object.values(recruit.state.units).find((u) => u.kind === 'TROOP_FERRY')!;
    expect(isSea(tileAt(recruit.state, ship).terrain)).toBe(true);
    expect([undefined, 'p']).toContain(tileAt(recruit.state, ship).ownerId);
    expect(recruit.state.realms.p.wallet.GOLD).toBe(
      build.state.realms.p.wallet.GOLD - UNITS.TROOP_FERRY.cost.GOLD,
    );
  });
  it('pêche contre un PA sans dépasser le stockage et sans autoriser la récolte des autres ressources', () => {
    const s = fixture();
    s.realms.p.wallet.FOOD = 0;
    s.realms.p.unlimitedAP = false;
    unit(s, 'fish', 'FISHING_CUTTER', { q: 3, r: 0 });
    const result = run(s, 'GATHER', 'fish', { resource: 'FOOD' });
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.realms.p.wallet.FOOD).toBe(40);
    expect(result.state.realms.p.ap).toBe(39);
    expect(run(s, 'GATHER', 'fish', { resource: 'GOLD' }).result.accepted).toBe(false);
  });
  it('embarque un char, traverse en bateau puis débarque sur la plage, jamais en pleine mer', () => {
    let s = fixture();
    unit(s, 'ship', 'LANDING_SHIP', { q: 3, r: 0 });
    const tank = unit(s, 'tank', 'TANK', { q: 2, r: 0 });
    expect(passengerSize(tank, 'LANDING_SHIP')).toBe(8);
    let result = run(s, 'EMBARK', 'ship', { unitId: 'tank' });
    expect(result.result.accepted, result.result.reason).toBe(true);
    s = result.state;
    expect(cargoUsed(s.units.ship)).toBe(8);
    expect(run(s, 'DISEMBARK', 'ship', { unitId: 'tank', q: 4, r: 0 }).result.accepted).toBe(false);
    result = run(s, 'MOVE', 'ship', { path: [{ q: 3, r: 1 }] });
    expect(result.result.accepted, result.result.reason).toBe(true);
    s = result.state;
    result = run(s, 'DISEMBARK', 'ship', { unitId: 'tank', q: 2, r: 1 });
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.units.tank).toMatchObject({ q: 2, r: 1 });
    expect(result.state.units.tank.carrierId).toBeUndefined();
  });
  it('naufrage : évacue sur la côte à mi-vie ; aucun passager terrestre ne flotte en mer', () => {
    const s = fixture();
    const ship = unit(s, 'ship', 'TROOP_FERRY', { q: 3, r: 0 });
    ship.cargo = [{ ...unit(s, 'cargo', 'INFANTRY', { q: 3, r: 0 }), carrierId: 'ship' }];
    delete s.units.cargo;
    const hp = ship.cargo[0].hp;
    destroyUnit(s, ship, now);
    expect(s.units.cargo.hp).toBe(Math.ceil(hp * 0.5));
    expect(isSea(tileAt(s, s.units.cargo).terrain)).toBe(false);
    const deep = unit(s, 'deep', 'TROOP_FERRY', { q: 7, r: 0 });
    deep.cargo = [{ ...s.units.cargo, id: 'lost', carrierId: 'deep' }];
    destroyUnit(s, deep, now);
    expect(s.units.lost).toBeUndefined();
  });
  it('réserve les torpilles aux navires et les affinités navales à l’eau', () => {
    const s = fixture();
    const sub = unit(s, 'sub', 'BLACK_SUBMARINE', { q: 3, r: 0 });
    expect(attackBlockReason(sub, s.buildings[Object.keys(s.buildings)[0]])).toContain('torpilles');
    expect(attackBlockReason(sub, unit(s, 'boat', 'WAR_GALLEY', { q: 4, r: 0 }, 'e'))).toBe('');
    expect(terrainCombatBonus(sub, 'SEA').attack).toBe(20);
    expect(terrainCombatBonus(sub, 'PLAIN')).toEqual({ attack: 0, defense: 0 });
  });
  it('batterie côtière : tir manuel pour un PA et aucune dépendance à une tourelle de rempart', () => {
    const s = fixture();
    s.realms.p.unlimitedAP = false;
    const b = addBuilding(s, s.realms.p, { q: 2, r: 0 }, 'COASTAL_BATTERY', now, 3);
    unit(s, 'enemy', 'WAR_GALLEY', { q: 3, r: 0 }, 'e');
    const r = run(s, 'ATTACK', b.id, { targetId: 'enemy' });
    expect(r.result.accepted, r.result.reason).toBe(true);
    expect(r.state.realms.p.ap).toBe(39);
  });
});
describe('furtivité réelle', () => {
  it('une torpille ne traverse pas une péninsule', () => {
    const s = fixture();
    unit(s, 'sub', 'BLACK_SUBMARINE', { q: 3, r: 0 });
    unit(s, 'target', 'WAR_GALLEY', { q: 5, r: 0 }, 'e');
    writeTile(s, { q: 4, r: 0 }, { terrain: 'BEACH' });
    const result = run(s, 'ATTACK', 'sub', { targetId: 'target' });
    expect(result.result.accepted).toBe(false);
    expect(result.result.reason).toContain('torpilles');
    expect(result.state.units.sub.revealedUntil).toBeUndefined();
  });
  it('retire les sous-marins des snapshots sans détection et interdit les attaques par identifiant deviné', () => {
    const s = fixture();
    unit(s, 'scout', 'SCOUT_LONGSHIP', { q: 3, r: 0 });
    const sub = unit(s, 'hidden', 'BLACK_SUBMARINE', { q: 4, r: 0 }, 'e');
    expect(submarineVisible(s, 'p', sub, now)).toBe(false);
    expect(worldView(s, 'p', now).units.some((u) => u.id === 'hidden')).toBe(false);
    expect(run(s, 'ATTACK', 'scout', { targetId: 'hidden' }).result.accepted).toBe(false);
    unit(s, 'sonar', 'SONAR_DESTROYER', { q: 3, r: 1 });
    expect(submarineVisible(s, 'p', sub, now)).toBe(true);
    expect(worldView(s, 'p', now).units.some((u) => u.id === 'hidden')).toBe(true);
    delete s.units.sonar;
    sub.revealedUntil = now + 60000;
    expect(submarineVisible(s, 'p', sub, now + 59999)).toBe(true);
    expect(submarineVisible(s, 'p', sub, now + 60000)).toBe(false);
  });
  it('révèle un sous-marin 60 secondes après un tir accepté', () => {
    const s = fixture();
    unit(s, 'sub', 'BLACK_SUBMARINE', { q: 3, r: 0 });
    unit(s, 'target', 'WAR_GALLEY', { q: 4, r: 0 }, 'e');
    const r = run(s, 'ATTACK', 'sub', { targetId: 'target' });
    expect(r.result.accepted, r.result.reason).toBe(true);
    expect(r.state.units.sub.revealedUntil).toBe(now + 60000);
  });
});
describe('expéditions, commerce et contenu', () => {
  it('les découvertes maritimes restent rares, expirent et exigent un navire', () => {
    const s = fixture();
    s.oceanVersion = 1;
    unit(s, 'fisher', 'FISHING_CUTTER', { q: 3, r: 0 });
    for (let i = 0; i < 12; i++) tickMaritimeEvents(s, now + i * 600000, new Set(['p']));
    const discoveries = Object.values(s.events);
    expect(discoveries.length).toBeGreaterThan(0);
    expect(discoveries.length).toBeLessThanOrEqual(1);
    expect(discoveries.every((e) => isSea(tileAt(s, e).terrain))).toBe(true);
    const event = discoveries[0];
    tickMaritimeEvents(s, event.endsAt, new Set());
    expect(s.events[event.id]).toBeUndefined();
    s.events.wreck = {
      id: 'wreck',
      kind: 'SHIPWRECK',
      title: 'Épave',
      description: 'Test',
      q: 3,
      r: 0,
      startsAt: now,
      endsAt: now + 600000,
      reward: { GOLD: 300 },
      global: false,
    };
    unit(s, 'peasant', 'PEASANT', { q: 2, r: 0 });
    const rejected = run(s, 'INTERACT', 'peasant', { eventId: 'wreck' });
    expect(rejected.result.accepted).toBe(false);
    expect(rejected.result.reason).toContain('navire');
    const collected = run(s, 'INTERACT', 'fisher', { eventId: 'wreck' });
    expect(collected.result.accepted, collected.result.reason).toBe(true);
    expect(collected.state.events.wreck.claimedBy).toBe('p');
    expect(run(collected.state, 'INTERACT', 'fisher', { eventId: 'wreck' }).result.accepted).toBe(
      false,
    );
  });
  it('propose une mission maritime avant la flotte et garantit une offre après sa création', () => {
    const s = fixture();
    s.oceanVersion = 1;
    expect(missionOffers(s, 'p', now).some((m) => m.maritime)).toBe(true);
    unit(s, 'war', 'WAR_GALLEY', { q: 3, r: 0 });
    // A controlled long coastline, unseen outside the port.
    for (let q = 0; q <= 8; q++)
      for (let r = -45; r <= 45; r++)
        writeTile(
          s,
          { q, r },
          { terrain: q < 3 ? 'BEACH' : 'COAST', ownerId: undefined, poi: undefined },
        );
    const offer = missionOffers(s, 'p', now).find((m) => m.maritime)!;
    expect(offer).toBeDefined();
    const site = navalMissionSite(s, 'p', offer);
    expect(site).toBeDefined();
    site!.spots.forEach((p, i) => expect(movementCost(tileAt(s, p), offer.units[i])).toBe(1));
    const accepted = run(s, 'MISSION_ACCEPT', 'p', { offerId: offer.id });
    expect(accepted.result.accepted, accepted.result.reason).toBe(true);
    const active = accepted.state.missions!.p.active!;
    delete accepted.state.buildings[active.objectiveId];
    expect(reconcileMissions(accepted.state, now)).toHaveLength(1);
    expect(
      Object.values(accepted.state.units).filter(
        (u) => u.ownerId === 'p' && UNIT_PROFILES[u.kind].naval,
      ),
    ).toHaveLength(4);
  });
  it('expédie les accords commerciaux par deux ports sur une mer connectée', () => {
    const s = fixture();
    addBuilding(s, s.realms.p, { q: -3, r: 0 }, 'MARKET', now);
    addBuilding(s, s.realms.e, { q: -3, r: 8 }, 'MARKET', now);
    addBuilding(s, s.realms.p, { q: 2, r: 0 }, 'PORT', now);
    addBuilding(s, s.realms.e, { q: 2, r: 8 }, 'PORT', now);
    const route = seaTradeRoute(s, 'p', 'e');
    expect(route?.length).toBeGreaterThan(2);
    expect(route!.slice(1, -1).every((p) => isSea(tileAt(s, p).terrain))).toBe(true);
    const gold = { GOLD: 100, WOOD: 0, STONE: 0, IRON: 0, FOOD: 0 };
    launchTrade(s, 'p', 'e', gold, gold, 'treaty', now);
    expect(Object.values(s.caravans)).toHaveLength(2);
    expect(Object.values(s.caravans).every((c) => c.maritime)).toBe(true);
  });
  it('les nouveaux atlas utilisent des frames valides et chaque époque a pêche, transport et combat', () => {
    expect(Object.keys(NAVAL_UNITS)).toHaveLength(20);
    for (let level = 1; level <= 5; level++) {
      const kinds = Object.keys(NAVAL_UNITS) as (keyof typeof NAVAL_UNITS)[];
      const era = kinds.filter((k) => NAVAL_PROFILES[k].minRecruitLevel === level);
      expect(era).toHaveLength(4);
      expect(era.some((k) => NAVAL_PROFILES[k].fishing)).toBe(true);
      expect(era.some((k) => NAVAL_PROFILES[k].transport)).toBe(true);
      for (const k of era) expect(NAVAL_FRAMES[k] % 24).toBeLessThan(4);
    }
    for (const frame of Object.values(NAVAL_BUILDING_FRAMES))
      expect(frame % 24).toBeGreaterThanOrEqual(4);
  });
});
