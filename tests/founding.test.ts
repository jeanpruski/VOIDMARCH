import { prepareDevelopment } from './fixtures/development';
import { constructionDevelopmentStage, unitDevelopmentStage } from '@voidmarch/config';
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  isNavalBuilding,
  isOffshoreBuilding,
  BUILDINGS,
  BUILDING_REQUIREMENTS,
  UNITS,
  UNIT_PROFILES,
  type BuildingKind,
  type UnitKind,
  type Terrain,
} from '@voidmarch/config';
import {
  createState,
  realmBuildings,
  realmUnits,
  realmTiles,
  writeTile,
  neighbors,
  zeroWallet,
  estimateDamage,
} from '@voidmarch/game-rules';
import { addBuilding, addPlayer, execute, restartRealm } from '../apps/server/src/engine';
import { actionSchema, type Action } from '@voidmarch/protocol';
const now = 1_900_000_000_000;
const action = (type: Action['type'], actorId: string, payload: unknown): Action =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function founding() {
  const state = createState('founding', now);
  addPlayer(state, 'founder', 'Fondateur', 'ASH', now);
  return state;
}
function established() {
  const s = createState('catalog', now);
  const r = addPlayer(s, 'founder', 'Fondateur', 'ASH', now, 'established');
  r.wallet = { STONE: 10000, GOLD: 10000, WOOD: 10000, IRON: 10000, FOOD: 10000 };
  return s;
}

describe('fondation sans ressources', () => {
  it('recommence uniquement le royaume désigné et archive ses anciens actifs', () => {
    const s = established();
    addPlayer(s, 'neighbor', 'Voisin', 'MASK', now, 'established');
    const neighbor = JSON.stringify(s.realms.neighbor);
    const previous = realmBuildings(s, 'founder').length;
    restartRealm(s, 'founder', now + 1000);
    expect(realmBuildings(s, 'founder').map((b) => b.kind)).toEqual(['CAMP']);
    expect(realmUnits(s, 'founder')).toHaveLength(0);
    expect(s.realms.founder.wallet).toEqual(zeroWallet());
    expect(s.archives.founder.buildings).toHaveLength(previous);
    expect(JSON.stringify(s.realms.neighbor)).toBe(neighbor);
  });
  it('commence avec un campement, une terre et aucun stock ni unité', () => {
    const s = founding();
    expect(realmBuildings(s, 'founder').map((b) => b.kind)).toEqual(['CAMP']);
    expect(realmUnits(s, 'founder')).toHaveLength(0);
    expect(realmTiles(s, 'founder')).toHaveLength(1);
    expect(s.realms.founder.wallet).toEqual(zeroWallet());
  });
  it('forme gratuitement le paysan, récolte du bois et bâtit une chaumière à la frontière', () => {
    let s = founding();
    const camp = realmBuildings(s, 'founder')[0];
    let result = execute(s, 'founder', action('RECRUIT', camp.id, { kind: 'PEASANT' }), now);
    expect(result.result.accepted).toBe(true);
    s = result.state;
    expect(s.realms.founder.wallet).toEqual(zeroWallet());
    const peasant = realmUnits(s, 'founder')[0];
    result = execute(s, 'founder', action('MOVE', peasant.id, { path: [neighbors(camp)[0]] }), now);
    expect(result.result.accepted).toBe(true);
    s = result.state;
    result = execute(s, 'founder', action('GATHER', peasant.id, { resource: 'WOOD' }), now);
    expect(result.result.accepted).toBe(true);
    s = result.state;
    expect(s.realms.founder.wallet.WOOD).toBe(24);
    const p = neighbors(camp)[0];
    result = execute(s, 'founder', action('BUILD', peasant.id, { ...p, kind: 'HOUSE' }), now);
    expect(result.result.accepted).toBe(true);
    s = result.state;
    expect(realmBuildings(s, 'founder').map((b) => b.kind)).toEqual(['CAMP', 'HOUSE']);
    expect(s.realms.founder.wallet.WOOD).toBe(6);
    expect(s.realms.founder.ap).toBe(36);
    expect(realmTiles(s, 'founder')).toHaveLength(2);
  });
  it('refuse le second paysan sans ressources et permet un remplacement gratuit après perte', () => {
    let s = founding();
    const camp = realmBuildings(s, 'founder')[0];
    s = execute(s, 'founder', action('RECRUIT', camp.id, { kind: 'PEASANT' }), now).state;
    const u = realmUnits(s, 'founder')[0];
    writeTile(s, neighbors(camp)[0], { terrain: 'PLAIN', ownerId: 'founder' });
    expect(
      execute(s, 'founder', action('RECRUIT', camp.id, { kind: 'PEASANT' }), now).result.accepted,
    ).toBe(false);
    delete s.units[u.id];
    const result = execute(s, 'founder', action('RECRUIT', camp.id, { kind: 'PEASANT' }), now);
    expect(result.result.accepted).toBe(true);
    expect(realmUnits(result.state, 'founder')).toHaveLength(1);
  });
  it('ne permet pas de récolter une ressource absente ou sur des terres adverses', () => {
    let s = founding();
    const camp = realmBuildings(s, 'founder')[0];
    s = execute(s, 'founder', action('RECRUIT', camp.id, { kind: 'PEASANT' }), now).state;
    const u = realmUnits(s, 'founder')[0];
    for (const p of neighbors(u)) writeTile(s, p, { terrain: 'FOREST', ownerId: 'enemy' });
    const result = execute(s, 'founder', action('GATHER', u.id, { resource: 'WOOD' }), now);
    expect(result.result.accepted).toBe(false);
    expect(result.state.realms.founder.ap).toBe(39);
    expect(result.state.realms.founder.wallet.WOOD).toBe(0);
  });
  it('fait évoluer le campement en avant-poste puis en village sans perdre la capitale', () => {
    let s = founding();
    const camp = realmBuildings(s, 'founder')[0];
    s.realms.founder.wallet = { STONE: 200, GOLD: 200, WOOD: 200, IRON: 100, FOOD: 100 };
    s = execute(s, 'founder', action('UPGRADE', camp.id, {}), now).state;
    expect(s.buildings[camp.id].kind).toBe('OUTPOST');
    const result = execute(s, 'founder', action('UPGRADE', camp.id, {}), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.buildings[camp.id].kind).toBe('VILLAGE');
    expect(result.state.buildings[camp.id].level).toBe(1);
  });
});

describe('catalogue étendu', () => {
  it.each(Object.keys(UNITS).filter((k) => k !== 'HERO') as UnitKind[])(
    'recrute %s avec ses prérequis et son bâtiment',
    (kind) => {
      const s = established(),
        r = s.realms.founder,
        profile = UNIT_PROFILES[kind];
      r.wallet = { ...UNITS[kind].cost };
      const b = addBuilding(s, r, { q: 8, r: 0 }, profile.recruitAt[0], now);
      b.level = profile.minRecruitLevel ?? 1;
      for (const p of neighbors(b))
        writeTile(s, p, {
          terrain: profile.naval ? 'COAST' : 'PLAIN',
          ownerId: profile.naval ? undefined : r.id,
        });
      profile.requires.forEach((k, i) => addBuilding(s, r, { q: 12 + i, r: 0 }, k, now));
      prepareDevelopment(s, r.id, unitDevelopmentStage(kind), now);
      const before = realmUnits(s, r.id).length;
      const result = execute(s, r.id, action('RECRUIT', b.id, { kind }), now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(realmUnits(result.state, r.id)).toHaveLength(before + 1);
    },
  );
  it.each(
    (Object.keys(BUILDINGS) as BuildingKind[]).filter(
      (kind) => !kind.endsWith('_WALL') || kind === 'WOOD_WALL',
    ),
  )('construit %s sur un terrain compatible', (kind) => {
    const s = established(),
      r = s.realms.founder,
      p = { q: 8, r: 0 };
    r.wallet = { ...BUILDINGS[kind].cost };
    let actorId = r.id;
    if (isOffshoreBuilding(kind)) {
      const shore = neighbors(p)[0];
      writeTile(s, shore, { terrain: 'BEACH', ownerId: r.id });
      actorId = 'dock-builder';
      s.units[actorId] = {
        id: actorId,
        ownerId: r.id,
        kind: 'PEASANT',
        ...shore,
        hp: 12,
        createdAt: now,
        updatedAt: now,
      };
    } else if (isNavalBuilding(kind)) writeTile(s, neighbors(p)[0], { terrain: 'COAST' });
    writeTile(s, p, { terrain: BUILDINGS[kind].terrains[0] as Terrain, ownerId: r.id });
    (BUILDING_REQUIREMENTS[kind] ?? []).forEach((k, i) =>
      addBuilding(s, r, { q: 12 + i, r: 0 }, k, now),
    );
    prepareDevelopment(s, r.id, constructionDevelopmentStage(kind), now);
    const result = execute(s, r.id, action('BUILD', actorId, { ...p, kind }), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(
      realmBuildings(result.state, r.id).some((b) => b.kind === kind && b.q === p.q && b.r === p.r),
    ).toBe(true);
  });
  it('bloque les troupes avancées sans leurs infrastructures', () => {
    const s = established(),
      r = s.realms.founder,
      b = addBuilding(s, r, { q: 8, r: 0 }, 'ARCHERY', now);
    b.level = 2;
    const result = execute(s, r.id, action('RECRUIT', b.id, { kind: 'CROSSBOW' }), now);
    expect(result.result.accepted).toBe(false);
    expect(result.result.reason).toContain('Forge');
  });
  it('la guérisseuse soigne les alliés sans dépasser leur maximum', () => {
    const s = established(),
      r = s.realms.founder,
      allies = realmUnits(s, r.id);
    const healer = allies[0];
    healer.kind = 'HEALER';
    healer.hp = UNITS.HEALER.hp;
    const target = allies[1];
    target.q = healer.q + 1;
    target.r = healer.r;
    target.hp = UNITS[target.kind].hp - 2;
    const result = execute(s, r.id, action('ABILITY', healer.id, { ability: 'MEND' }), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.units[target.id].hp).toBe(UNITS[target.kind].hp);
    expect(result.state.realms[r.id].ap).toBe(39);
  });
  it('le lancier inflige davantage de dégâts à la cavalerie', () => {
    const s = established(),
      [a, t] = realmUnits(s, 'founder');
    a.kind = 'SPEARMAN';
    t.kind = 'LIGHT_CAVALRY';
    const mounted = estimateDamage(a, t, { q: 0, r: 0, terrain: 'PLAIN' });
    t.kind = 'CROSSBOW'; // Same defense, no mounted bonus.
    const foot = estimateDamage(a, t, { q: 0, r: 0, terrain: 'PLAIN' });
    expect(mounted.max - foot.max).toBe(12);
  });
});
