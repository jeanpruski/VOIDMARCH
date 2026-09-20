import { prepareTrophies } from './fixtures/development';
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { BUILDINGS, RULES, UNITS, buildingUpgrade, type BuildingKind } from '@voidmarch/config';
import {
  createState,
  income,
  refreshAP,
  realmBuildings,
  realmUnits,
  unitStats,
  writeTile,
  movementCost,
  zeroWallet,
} from '@voidmarch/game-rules';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { removeGuestRealm } from '../apps/server/src/guests';
import type { Action } from '@voidmarch/protocol';

const now = 1800000000000;
const action = (type: Action['type'], actorId: string, payload = {}) =>
  ({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now }) as Action;
function fixture() {
  const s = createState('gameplay-v03', now);
  const r = addPlayer(s, 'player', 'Test', 'MASK', now);
  prepareTrophies(s, 'player', 3, now);
  r.wallet = { GOLD: 5000, WOOD: 5000, STONE: 5000, IRON: 5000, FOOD: 5000 };
  s.units.worker = {
    id: 'worker',
    ownerId: r.id,
    kind: 'PEASANT',
    hp: 5,
    q: 2,
    r: 0,
    createdAt: now,
    updatedAt: now,
  };
  return s;
}

describe('bonus de départ et PA illimités', () => {
  it('conserve le surplus, ne le régénère pas et ne le redonne pas à la reconnexion', () => {
    const s = fixture(),
      r = s.realms.player;
    expect(r.ap).toBe(40);
    refreshAP(r, now + 3600000);
    expect(r.ap).toBe(40);
    r.ap = 21;
    refreshAP(r, now + 7200000);
    expect(r.ap).toBe(21);
    r.ap = 19;
    refreshAP(r, now + 7200001);
    expect(r.ap).toBe(19);
    refreshAP(r, now + 7230000);
    expect(r.ap).toBe(20);
    expect(addPlayer(s, r.id, r.name, r.faction, now + 8000000).ap).toBe(20);
  });
  it('le code ne supprime que la dépense de PA, pas les restrictions ni les coûts', () => {
    const s = fixture(),
      r = s.realms.player;
    r.ap = 0;
    r.unlimitedAP = true;
    writeTile(s, r.capital, { road: false });
    const result = execute(s, r.id, action('ROAD', r.id, r.capital), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.player.ap).toBe(0);
    expect(result.state.realms.player.wallet.WOOD).toBe(4990);
    r.wallet = zeroWallet();
    expect(execute(s, r.id, action('ROAD', r.id, r.capital), now).result.accepted).toBe(false);
  });
});

describe('construction et routes', () => {
  it('autorise un chantier à trois cases sans continuité du territoire', () => {
    const s = fixture();
    writeTile(s, { q: 3, r: 0 }, { terrain: 'PLAIN', ownerId: undefined });
    const result = execute(
      s,
      'player',
      action('BUILD', 'worker', { q: 3, r: 0, kind: 'HOUSE' }),
      now,
    );
    expect(result.result.accepted).toBe(true);
    expect(result.state.tiles['3,0'].ownerId).toBe('player');
    expect(realmBuildings(result.state, 'player')).toHaveLength(2);
  });
  it('refuse au-delà du rayon et sur les terres ennemies', () => {
    const s = fixture();
    s.units.worker.q = 3;
    writeTile(s, { q: 4, r: 0 }, { terrain: 'PLAIN' });
    expect(
      execute(s, 'player', action('BUILD', 'worker', { q: 4, r: 0, kind: 'HOUSE' }), now).result
        .accepted,
    ).toBe(false);
    writeTile(s, { q: 3, r: 0 }, { terrain: 'PLAIN', ownerId: 'enemy' });
    expect(
      execute(s, 'player', action('BUILD', 'worker', { q: 3, r: 0, kind: 'HOUSE' }), now).result
        .accepted,
    ).toBe(false);
  });
  it('une route isolée réduit déjà le coût de la case rocheuse', () => {
    expect(movementCost({ q: 0, r: 0, terrain: 'MOUNTAIN' })).toBe(3);
    expect(movementCost({ q: 0, r: 0, terrain: 'MOUNTAIN', road: true })).toBe(1);
  });
  it('revendique la case du paysan et refuse une seconde capture sans dépenser', () => {
    const s = fixture();
    writeTile(s, s.units.worker, { terrain: 'PLAIN', ownerId: undefined, poi: undefined });
    const captured = execute(s, 'player', action('CAPTURE', 'worker'), now);
    expect(captured.result.accepted).toBe(true);
    expect(captured.state.tiles['2,0'].ownerId).toBe('player');
    expect(
      execute(captured.state, 'player', action('CAPTURE', 'worker'), now).result.accepted,
    ).toBe(false);
    expect(captured.state.realms.player.ap).toBe(39);
  });
});

describe('améliorations et spécialisation', () => {
  it.each(Object.keys(BUILDINGS) as BuildingKind[])(
    '%s possède une évolution au niveau 1',
    (kind) => {
      if (kind === 'ATOMIC_WALL') expect(buildingUpgrade(kind, 1)).toBeNull();
      else expect(buildingUpgrade(kind, 1)).not.toBeNull();
    },
  );
  it('une mine de niveau 2 produit 80 % de fer supplémentaire', () => {
    const s = fixture();
    const mine = addBuilding(s, s.realms.player, { q: 1, r: 0 }, 'MINE', now);
    writeTile(s, mine, { terrain: 'HILL' });
    const before = income(s, 'player').IRON;
    const result = execute(s, 'player', action('UPGRADE', mine.id), now);
    expect(result.result.accepted).toBe(true);
    expect(income(result.state, 'player').IRON - before).toBe(4);
    expect(result.state.buildings[mine.id].level).toBe(2);
    expect(result.state.buildings[mine.id].hp).toBe(BUILDINGS.MINE.hp * 2);
    result.state.buildings[mine.id].level = 5;
    expect(execute(result.state, 'player', action('UPGRADE', mine.id), now).result.accepted).toBe(
      false,
    );
  });
  it('améliore les anciens soldats sans soigner leurs blessures ni cumuler deux casernes', () => {
    let s = fixture();
    const r = s.realms.player;
    const b = addBuilding(s, r, { q: 1, r: 0 }, 'BARRACKS', now);
    const second = addBuilding(s, r, { q: -1, r: 0 }, 'BARRACKS', now);
    s.units.soldier = {
      id: 'soldier',
      kind: 'INFANTRY',
      ownerId: r.id,
      q: 0,
      r: 1,
      hp: 5,
      createdAt: now,
      updatedAt: now,
    };
    s = execute(s, r.id, action('UPGRADE', b.id), now).state;
    expect(s.units.soldier.trainingBonus).toBe(25);
    expect(s.units.soldier.hp).toBe(6.25);
    expect(unitStats(s.units.soldier).attack).toBe(10);
    s = execute(s, r.id, action('UPGRADE', second.id), now).state;
    expect(s.units.soldier.trainingBonus).toBe(25);
    writeTile(s, b, { terrain: 'PLAIN' });
    const result = execute(s, r.id, action('RECRUIT', b.id, { kind: 'MILITIA' }), now);
    expect(result.result.accepted).toBe(true);
    expect(realmUnits(result.state, r.id).find((u) => u.kind === 'MILITIA')?.trainingBonus).toBe(
      25,
    );
  });
  it('refuse les soldats au campement et les paysans en caserne', () => {
    const s = fixture();
    const camp = realmBuildings(s, 'player')[0];
    const barracks = addBuilding(s, s.realms.player, { q: 1, r: 0 }, 'BARRACKS', now);
    expect(
      execute(s, 'player', action('RECRUIT', camp.id, { kind: 'MILITIA' }), now).result.accepted,
    ).toBe(false);
    expect(
      execute(s, 'player', action('RECRUIT', barracks.id, { kind: 'PEASANT' }), now).result
        .accepted,
    ).toBe(false);
  });
});

describe('récompenses et suppression des invités', () => {
  it('annonce le butin puis retire la découverte des événements disponibles', () => {
    const s = fixture();
    s.events.reward = {
      id: 'reward',
      kind: 'METEOR',
      q: 2,
      r: 0,
      title: 'Météore',
      description: '',
      reward: { GOLD: 25, IRON: 10 },
      startsAt: now,
      endsAt: now + 60000,
      global: true,
    };
    const result = execute(s, 'player', action('INTERACT', 'worker', { eventId: 'reward' }), now);
    expect(result.result.accepted).toBe(true);
    expect(result.result.message).toContain('+25 or');
    expect(result.result.message).toContain('+10 fer');
    expect(
      worldView(result.state, 'player', now, [{ q: 0, r: 0 }]).events.some(
        (e) => e.id === 'reward',
      ),
    ).toBe(false);
    expect(
      execute(result.state, 'player', action('INTERACT', 'worker', { eventId: 'reward' }), now)
        .result.accepted,
    ).toBe(false);
  });
  it('retire les possessions et les anciennes observations sans toucher aux autres royaumes', () => {
    const s = fixture();
    const other = addPlayer(s, 'other', 'Autre', 'ASH', now);
    other.explored['0,0'] = {
      q: 0,
      r: 0,
      visibility: 'EXPLORED',
      ownerId: 'player',
      building: realmBuildings(s, 'player')[0],
    };
    removeGuestRealm(s, 'player');
    expect(s.realms.player).toBeUndefined();
    expect(realmUnits(s, 'player')).toHaveLength(0);
    expect(realmBuildings(s, 'player')).toHaveLength(0);
    expect(other.explored['0,0'].building).toBeUndefined();
    expect(realmBuildings(s, 'other')).toHaveLength(1);
    expect(s.realms.other).toBe(other);
  });
});
