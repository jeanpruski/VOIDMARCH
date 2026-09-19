import type { Unit } from '@voidmarch/shared';
import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  UNITS,
  TRANSPORTS,
  UNIT_PROFILES,
  recruitmentLevel,
  type UnitKind,
} from '@voidmarch/config';
import {
  allUnits,
  allRealmUnits,
  armyPopulation,
  createState,
  disk,
  key,
  writeTile,
  vision,
  income,
  cargoUsed,
  passengerSize,
  neighbors,
  distance,
  realmValue,
} from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { addPlayer, execute, worldView, addBuilding } from '../apps/server/src/engine';
import { destroyUnit } from '../apps/server/src/transports';
import { ensureHeroes } from '../apps/server/src/heroes';
import { predictAction } from '../apps/web/src/optimistic-actions';
const now = 1800000000000;
function fixture(kind: UnitKind = 'CARGO_TRUCK') {
  let s = createState('transport', now);
  addPlayer(s, 'p', 'Convoi', 'ASH', now);
  s.units = {};
  for (const p of disk({ q: 25, r: 0 }, 22)) {
    writeTile(s, p, { terrain: 'PLAIN', ownerId: undefined, buildingId: undefined, road: false });
    s.realms.p.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
  }
  const unit = (id: string, k: UnitKind, q = 26, r = 0, ownerId = 'p'): Unit =>
    (s.units[id] = { id, kind: k, ownerId, q, r, hp: UNITS[k].hp, createdAt: now, updatedAt: now });
  unit('carrier', kind, 25);
  const act = (type: string, actorId: string, payload: unknown, owner = 'p') => {
    const result = execute(
      s,
      owner,
      actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now }),
      now,
    );
    s = result.state;
    return result.result;
  };
  const board = (id: string) => act('EMBARK', 'carrier', { unitId: id });
  return {
    get s() {
      return s;
    },
    unit,
    act,
    board,
  };
}
describe('transports', () => {
  it('embarque, conserve population, entretien et valeur, transporte pour 1 PA puis débarque', () => {
    const f = fixture();
    f.unit('troop', 'INFANTRY');
    const beforeIncome = income(f.s, 'p'),
      beforePopulation = armyPopulation(allRealmUnits(f.s, 'p')),
      value = realmValue(f.s, 'p');
    expect(f.board('troop').accepted).toBe(true);
    expect(f.s.units.troop).toBeUndefined();
    expect(f.s.units.carrier.cargo?.[0].carrierId).toBe('carrier');
    expect(income(f.s, 'p')).toEqual(beforeIncome);
    expect(armyPopulation(allRealmUnits(f.s, 'p'))).toBe(beforePopulation);
    expect(realmValue(f.s, 'p')).toBe(value);
    expect(
      f.act('MOVE', 'carrier', {
        path: [
          { q: 26, r: 0 },
          { q: 27, r: 0 },
          { q: 28, r: 0 },
        ],
      }).accepted,
    ).toBe(true);
    expect(f.s.realms.p.ap).toBe(38);
    expect(f.s.units.carrier.cargo?.[0].q).toBe(28);
    expect(f.act('DISEMBARK', 'carrier', { unitId: 'troop', q: 29, r: 0 }).accepted).toBe(true);
    expect(f.s.realms.p.ap).toBe(37);
    expect(f.s.units.troop.q).toBe(29);
    expect(f.s.units.troop.carrierId).toBeUndefined();
    expect(f.s.units.carrier.cargo).toEqual([]);
  });
  it('partage réellement les 8 places du camion entre 4 fantassins et une moto', () => {
    const f = fixture();
    f.unit('bike', 'MOTORCYCLE');
    expect(f.board('bike').accepted).toBe(true);
    for (let i = 0; i < 4; i++) {
      f.unit(`i${i}`, 'INFANTRY');
      expect(f.board(`i${i}`).accepted).toBe(true);
    }
    expect(cargoUsed(f.s.units.carrier)).toBe(8);
    f.unit('extra', 'INFANTRY');
    const before = structuredClone(f.s);
    expect(f.board('extra').accepted).toBe(false);
    expect(f.s).toEqual(before);
  });
  it('accepte deux petits véhicules, exclut les chars, avions, sièges et chargements imbriqués', () => {
    const f = fixture();
    for (const kind of ['TANK', 'FIGHTER', 'RAM', 'CARGO_TRUCK'] as UnitKind[]) {
      f.unit('bad', kind);
      expect(f.board('bad').accepted).toBe(false);
    }
    delete f.s.units.bad;
    f.unit('a', 'MOTORCYCLE');
    expect(f.board('a').accepted).toBe(true);
    f.unit('b', 'ARMORED_CAR');
    expect(f.board('b').accepted).toBe(true);
    expect(cargoUsed(f.s.units.carrier)).toBe(8);
    const loaded = f.unit('loaded', 'TRANSPORT_SIDECAR');
    loaded.cargo = [{ ...loaded, id: 'nested', kind: 'INFANTRY' }];
    expect(passengerSize(loaded)).toBeNull();
  });
  it('side-car : deux fantassins maximum, pas de cheval ni de véhicule', () => {
    const f = fixture('TRANSPORT_SIDECAR');
    for (const kind of ['KNIGHT', 'MOTORCYCLE'] as UnitKind[]) {
      f.unit('bad', kind);
      expect(f.board('bad').accepted).toBe(false);
    }
    delete f.s.units.bad;
    for (let i = 0; i < 3; i++) {
      f.unit(`i${i}`, 'INFANTRY');
      expect(f.board(`i${i}`).accepted).toBe(i < 2);
    }
  });
  it('interdit actions, ciblage et vision des passagers ; masque le manifeste aux ennemis', () => {
    const f = fixture();
    f.unit('scout', 'SCOUT');
    expect(vision(f.s, f.s.realms.p).has('30,0')).toBe(true);
    expect(f.board('scout').accepted).toBe(true);
    expect(vision(f.s, f.s.realms.p).has('30,0')).toBe(false);
    expect(f.act('MOVE', 'scout', { path: [{ q: 26, r: 0 }] }).accepted).toBe(false);
    expect(f.act('CAPTURE', 'scout', {}).accepted).toBe(false);
    addPlayer(f.s, 'enemy', 'Adversaire', 'ASH', now);
    f.s.realms.enemy.protectedUntil = 0;
    f.s.realms.p.protectedUntil = 0;
    f.unit('enemy', 'RIFLEMAN', 26, 0, 'enemy');
    expect(f.act('ATTACK', 'enemy', { targetId: 'scout' }, 'enemy').accepted).toBe(false);
    const enemyView = worldView(f.s, 'enemy', now);
    expect(enemyView.units.find((u) => u.id === 'carrier')?.cargo).toBeUndefined();
    expect(worldView(f.s, 'p', now).units.find((u) => u.id === 'carrier')?.cargo).toHaveLength(1);
  });
  it('refuse unités ennemies, distance, duplication et PA insuffisants sans mutation', () => {
    const f = fixture();
    f.unit('enemy', 'INFANTRY', 26, 0, 'enemy');
    expect(f.board('enemy').accepted).toBe(false);
    f.unit('far', 'INFANTRY', 29);
    expect(f.board('far').accepted).toBe(false);
    delete f.s.units.enemy;
    f.unit('troop', 'INFANTRY');
    f.s.realms.p.ap = 0;
    f.s.realms.p.apAt = now;
    expect(f.board('troop').accepted).toBe(false);
    expect(f.s.units.troop).toBeDefined();
    f.s.realms.p.ap = 20;
    expect(f.board('troop').accepted).toBe(true);
    expect(f.board('troop').accepted).toBe(false);
    expect(allUnits(Object.values(f.s.units)).filter((u) => u.id === 'troop')).toHaveLength(1);
  });
  it('interdit de débarquer sur eau, occupant, trop loin ou à travers un mur ennemi', () => {
    const f = fixture();
    f.unit('troop', 'INFANTRY');
    f.board('troop');
    writeTile(f.s, { q: 26, r: 0 }, { terrain: 'RIVER' });
    expect(f.act('DISEMBARK', 'carrier', { unitId: 'troop', q: 26, r: 0 }).accepted).toBe(false);
    writeTile(f.s, { q: 26, r: 0 }, { terrain: 'PLAIN' });
    f.unit('occupied', 'INFANTRY');
    expect(f.act('DISEMBARK', 'carrier', { unitId: 'troop', q: 26, r: 0 }).accepted).toBe(false);
    expect(f.act('DISEMBARK', 'carrier', { unitId: 'troop', q: 28, r: 0 }).accepted).toBe(false);
    delete f.s.units.occupied;
    addPlayer(f.s, 'e', 'Ennemi', 'ASH', now);
    addBuilding(f.s, f.s.realms.e, { q: 26, r: 0 }, 'WOOD_WALL', now);
    expect(f.act('DISEMBARK', 'carrier', { unitId: 'troop', q: 26, r: 0 }).accepted).toBe(false);
  });
  it('avion-cargo : aucun chargement dans la forêt, mais décollage et vol long sur terrain exploré', () => {
    const f = fixture('CARGO_PLANE');
    f.unit('troop', 'INFANTRY');
    writeTile(f.s, { q: 25, r: 0 }, { terrain: 'FOREST' });
    expect(f.board('troop').accepted).toBe(false);
    writeTile(f.s, { q: 25, r: 0 }, { terrain: 'PLAIN' });
    expect(f.board('troop').accepted).toBe(true);
    const path = Array.from({ length: 16 }, (_, i) => ({ q: 26 + i, r: 0 }));
    expect(f.act('MOVE', 'carrier', { path }).accepted).toBe(true);
    expect(f.s.units.carrier.q).toBe(41);
    expect(f.s.realms.p.ap).toBe(38);
  });
  it('garde les passagers lors d’un déplacement routier ou groupé', () => {
    const f = fixture();
    f.unit('troop', 'INFANTRY');
    f.board('troop');
    for (let q = 25; q <= 37; q++) {
      writeTile(f.s, { q, r: 0 }, { road: true });
      f.s.realms.p.explored[`${q},0`].road = true;
    }
    expect(
      f.act('MOVE_GROUP', 'p', {
        orders: [{ type: 'MOVE_ROAD', actorId: 'carrier', payload: { q: 37, r: 0 } }],
      }).accepted,
    ).toBe(true);
    expect(f.s.units.carrier.cargo?.[0].q).toBe(37);
    expect(f.s.realms.p.ap).toBe(39);
  });
  it('évacue les passagers blessés sur des cases distinctes et perd ceux sans issue', () => {
    const f = fixture();
    for (let i = 0; i < 8; i++) {
      f.unit(`i${i}`, 'INFANTRY');
      f.board(`i${i}`);
    }
    const health = UNITS.INFANTRY.hp;
    expect(destroyUnit(f.s, f.s.units.carrier, now)).toBe(3);
    const survivors = Object.values(f.s.units);
    expect(survivors).toHaveLength(6);
    expect(new Set(survivors.map(key)).size).toBe(6);
    expect(
      survivors.every((u) => u.hp === Math.max(1, Math.round(health * 5) / 10) && !u.carrierId),
    ).toBe(true);
  });
  it('héros embarqué unique après sauvegarde ; récupération immortelle si aucune sortie', () => {
    const f = fixture();
    ensureHeroes(f.s, now);
    const hero = allRealmUnits(f.s, 'p').find((u) => u.kind === 'HERO')!;
    Object.assign(hero, { q: 26, r: 0 });
    expect(f.board(hero.id).accepted).toBe(true);
    const saved = JSON.parse(JSON.stringify(f.s));
    ensureHeroes(saved, now);
    expect(allRealmUnits(saved, 'p').filter((u) => u.kind === 'HERO')).toHaveLength(1);
    for (const [i, p] of neighbors(f.s.units.carrier).entries())
      f.unit(`block${i}`, 'INFANTRY', p.q, p.r);
    destroyUnit(f.s, f.s.units.carrier, now);
    expect(f.s.realms.p.hero?.recoverAt).toBeGreaterThan(now);
    ensureHeroes(f.s, now);
    expect(allRealmUnits(f.s, 'p').some((u) => u.kind === 'HERO')).toBe(false);
  });
  it('une frappe atomique détruit le chargement, sans évacuation hors du rayon', () => {
    const f = fixture();
    f.unit('troop', 'INFANTRY');
    f.board('troop');
    destroyUnit(f.s, f.s.units.carrier, now, true);
    expect(Object.keys(f.s.units)).toHaveLength(0);
  });
  it('le premier paysan embarqué reste compté pour le recrutement gratuit', () => {
    const f = fixture();
    f.unit('worker', 'PEASANT');
    f.board('worker');
    const village = Object.values(f.s.buildings).find((b) => b.ownerId === 'p')!;
    f.s.realms.p.wallet = { GOLD: 0, WOOD: 0, STONE: 0, IRON: 0, FOOD: 0 };
    expect(f.act('RECRUIT', village.id, { kind: 'PEASANT' }).accepted).toBe(false);
    expect(
      predictAction(
        worldView(f.s, 'p', now),
        actionSchema.parse({
          type: 'RECRUIT',
          actorId: village.id,
          payload: { kind: 'PEASANT' },
          actionId: randomUUID(),
          clientTimestamp: now,
        }),
      ),
    ).toBeUndefined();
  });
  it('une vraie attaque détruit le transport et déclenche une évacuation', () => {
    const f = fixture();
    f.unit('troop', 'INFANTRY');
    f.board('troop');
    addPlayer(f.s, 'e', 'Ennemi', 'ASH', now);
    f.s.realms.e.protectedUntil = 0;
    f.s.realms.p.protectedUntil = 0;
    f.unit('attacker', 'RIFLEMAN', 27, 0, 'e');
    f.s.units.carrier.hp = 1;
    const result = f.act('ATTACK', 'attacker', { targetId: 'carrier' }, 'e');
    expect(result.accepted, result.reason).toBe(true);
    expect(f.s.units.carrier).toBeUndefined();
    expect(f.s.units.troop).toBeDefined();
    expect(f.s.units.troop.hp).toBe(UNITS.INFANTRY.hp / 2);
  });
  it('tous les transports sont non combattants à vision courte, avec recrutement accessible', () => {
    for (const kind of Object.keys(TRANSPORTS) as UnitKind[]) {
      expect(UNITS[kind].vision).toBe(2);
      expect(UNITS[kind].attack).toBe(0);
      expect(UNITS[kind].buildingAttack).toBe(0);
      expect(UNIT_PROFILES[kind].recruitAt.length).toBeGreaterThan(0);
    }
    expect(recruitmentLevel('CARGO_TRUCK', 'GARAGE')).toBe(3);
  });
});
