import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createState, movementCost, tileAt, writeTile, zeroWallet } from '@voidmarch/game-rules';
import { type Terrain } from '@voidmarch/config';
import { actionSchema, type Action } from '@voidmarch/protocol';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { roadBenefit, roadOrderReason } from '../apps/web/src/roads';

const now = 1_800_000_000_000;
function fixture(terrain: Terrain = 'FOREST') {
  const s = createState('roads', now);
  const r = addPlayer(s, 'p', 'Routes', 'MASK', now);
  r.wallet = { GOLD: 100, WOOD: 100, STONE: 100, IRON: 100, FOOD: 100 };
  writeTile(s, r.capital, { terrain, road: false });
  return { s, r, p: r.capital };
}
const order = (type: 'ROAD' | 'REMOVE_ROAD', p: { q: number; r: number }): Action =>
  actionSchema.parse({
    type,
    actorId: 'p',
    payload: p,
    actionId: randomUUID(),
    clientTimestamp: now,
  });

describe('routes et ponts', () => {
  it.each([
    ['FOREST', 10, 0],
    ['RIVER', 30, 10],
  ] as const)(
    'pose puis retire un tronçon sur %s sans toucher au bâtiment, aux unités ou au territoire',
    (terrain, wood, iron) => {
      const { s, r, p } = fixture(terrain);
      s.units.worker = {
        id: 'worker',
        ownerId: r.id,
        kind: 'PEASANT',
        ...p,
        hp: 5,
        createdAt: now,
        updatedAt: now,
      };
      const built = execute(s, r.id, order('ROAD', p), now);
      expect(built.result.accepted).toBe(true);
      expect(built.state.realms.p.ap).toBe(39);
      expect(built.state.realms.p.wallet.WOOD).toBe(100 - wood);
      expect(built.state.realms.p.wallet.IRON).toBe(100 - iron);
      expect(movementCost(tileAt(built.state, p))).toBe(1);
      const removed = execute(built.state, r.id, order('REMOVE_ROAD', p), now);
      expect(removed.result.accepted).toBe(true);
      expect(removed.state.realms.p.ap).toBe(38);
      expect(removed.state.realms.p.wallet).toEqual(built.state.realms.p.wallet);
      expect(tileAt(removed.state, p)).toMatchObject({
        terrain,
        road: false,
        ownerId: r.id,
        buildingId: tileAt(s, p).buildingId,
      });
      expect(removed.state.buildings).toEqual(s.buildings);
      expect(removed.state.units).toEqual(s.units);
      expect(movementCost(tileAt(removed.state, p))).toBe(movementCost(tileAt(s, p)));
      expect(removed.result.message).toContain('Matériaux non remboursés');
      const duplicate = execute(removed.state, r.id, order('REMOVE_ROAD', p), now);
      expect(duplicate.result.accepted).toBe(false);
      expect(duplicate.state).toEqual(removed.state);
    },
  );
  it('rejette une route existante, un manque de matériaux ou de PA sans rien dépenser', () => {
    const { s, p } = fixture();
    writeTile(s, p, { road: true });
    expect(execute(s, 'p', order('ROAD', p), now).state).toEqual(s);
    expect(execute(s, 'p', order('ROAD', p), now).result.accepted).toBe(false);
    s.realms.p.ap = 0;
    expect(execute(s, 'p', order('REMOVE_ROAD', p), now).result.accepted).toBe(false);
    expect(execute(s, 'p', order('REMOVE_ROAD', p), now).state).toEqual(s);
    s.realms.p.ap = 5;
    s.realms.p.wallet = zeroWallet();
    expect(execute(s, 'p', order('REMOVE_ROAD', p), now).result.accepted).toBe(true);
    writeTile(s, p, { road: false });
    expect(execute(s, 'p', order('ROAD', p), now).result.accepted).toBe(false);
    expect(execute(s, 'p', order('ROAD', p), now).state).toEqual(s);
  });
  it.each([undefined, 'enemy'])(
    'interdit la suppression sur une case qui appartient à %s',
    (ownerId) => {
      const { s, p } = fixture();
      writeTile(s, p, { ownerId, road: true });
      const result = execute(s, 'p', order('REMOVE_ROAD', p), now);
      expect(result.result.accepted).toBe(false);
      expect(result.state).toEqual(s);
    },
  );
  it('retirer une route rétablit les restrictions de terrain et conserve une revendication par enceinte', () => {
    const { s, p } = fixture('MOUNTAIN');
    writeTile(s, p, { road: true, enclosureOwnerId: 'p' });
    expect(movementCost(tileAt(s, p), 'TANK')).toBe(1);
    const result = execute(s, 'p', order('REMOVE_ROAD', p), now);
    expect(result.result.accepted).toBe(true);
    expect(movementCost(tileAt(result.state, p), 'TANK')).toBe(99);
    expect(tileAt(result.state, p)).toMatchObject({ ownerId: 'p', enclosureOwnerId: 'p' });
  });
  it('les aperçus distinguent PA, matériaux, routes existantes et terrains inconnus', () => {
    const { s, p } = fixture('RIVER');
    const w = worldView(s, 'p', now),
      t = w.tiles.find((t) => t.q === p.q && t.r === p.r)!;
    expect(roadOrderReason(w, t, 'build')).toBe('');
    expect(roadBenefit(t)).toContain('distance illimitée gratuitement');
    w.player.wallet.WOOD = 0;
    expect(roadOrderReason(w, t, 'build')).toContain('30 bois et 10 fer');
    t.road = true;
    expect(roadOrderReason(w, t, 'remove')).toBe('');
    expect(roadOrderReason(w, t, 'build')).toContain('déjà');
    w.player.ap = 0;
    expect(roadOrderReason(w, t, 'remove')).toBe('1 PA nécessaire.');
    w.player.unlimitedAP = true;
    expect(roadOrderReason(w, t, 'remove')).toBe('');
    expect(roadOrderReason(w, undefined, 'build')).toContain('territoire');
    expect(roadOrderReason(w, { ...t, visibility: 'EXPLORED' }, 'remove')).toContain('territoire');
  });
});
