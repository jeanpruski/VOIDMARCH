import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { UNITS, type UnitKind } from '@voidmarch/config';
import { createState, estimateDamage, storage, vision, key } from '@voidmarch/game-rules';
import { addBuilding, addPlayer, execute } from '../apps/server/src/engine';
import { actionSchema, type Action } from '@voidmarch/protocol';
import type { Unit } from '@voidmarch/shared';
const now = 1900000000000;
const order = (type: Action['type'], actorId: string, payload: unknown) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
const unit = (kind: UnitKind, id = kind): Unit => ({
  kind,
  id,
  ownerId: 'human',
  q: 0,
  r: 0,
  hp: UNITS[kind].hp,
  createdAt: now,
  updatedAt: now,
});
function fixture() {
  const s = createState('industrial', now);
  addPlayer(s, 'human', 'Fer', 'ASH', now);
  s.realms.human.wallet = { STONE: 0, GOLD: 500, WOOD: 500, IRON: 500, FOOD: 500 };
  return s;
}
describe('guerre industrielle', () => {
  it('donne au bazooka un avantage contre les blindés', () => {
    const target = unit('TANK');
    const bazooka = estimateDamage(unit('BAZOOKA'), target, { q: 0, r: 0, terrain: 'PLAIN' });
    const rifle = estimateDamage(unit('RIFLEMAN'), target, { q: 0, r: 0, terrain: 'PLAIN' });
    expect(bazooka.min).toBeGreaterThan(rifle.max);
  });
  it('répare les véhicules avec du fer sans consommer de vivres', () => {
    const s = fixture();
    s.units.TANK = { ...unit('TANK'), hp: 5 };
    const result = execute(s, 'human', order('REPAIR', 'TANK', {}), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.human.wallet).toEqual({
      STONE: 0,
      GOLD: 490,
      WOOD: 500,
      IRON: 490,
      FOOD: 500,
    });
    expect(result.state.units.TANK.hp).toBe(60);
  });
  it('les soins biologiques ne réparent pas un char', () => {
    const s = fixture();
    s.units.HEALER = unit('HEALER');
    s.units.TANK = { ...unit('TANK'), hp: 5 };
    const result = execute(s, 'human', order('ABILITY', 'HEALER', { ability: 'MEND' }), now);
    expect(result.result.accepted).toBe(false);
    expect(result.state.units.TANK.hp).toBe(5);
    expect(result.state.realms.human.ap).toBe(40);
  });
  it('la radio révèle dix cases et le dépôt augmente le stockage', () => {
    const s = fixture(),
      r = s.realms.human;
    expect(vision(s, r).has(key({ q: 10, r: 0 }))).toBe(false);
    addBuilding(s, r, { q: 0, r: 1 }, 'RADIO', now);
    expect(vision(s, r).has(key({ q: 10, r: 1 }))).toBe(true);
    const before = storage(s, r.id);
    addBuilding(s, r, { q: 1, r: 0 }, 'RAIL_DEPOT', now);
    expect(storage(s, r.id)).toBe(before + 1500);
  });
  it('les fusées exigent deux PA et un ennemi visible à portée', () => {
    const s = fixture();
    addPlayer(s, 'enemy', 'Ennemi', 'IRON', now);
    s.realms.enemy.protectedUntil = 0;
    s.units.ROCKET_LAUNCHER = unit('ROCKET_LAUNCHER');
    s.units.target = { ...unit('TANK'), id: 'target', ownerId: 'enemy', q: 7 };
    s.realms.human.ap = 1;
    expect(
      execute(s, 'human', order('ATTACK', 'ROCKET_LAUNCHER', { targetId: 'target' }), now).result
        .accepted,
    ).toBe(false);
    s.realms.human.ap = 2;
    const result = execute(
      s,
      'human',
      order('ATTACK', 'ROCKET_LAUNCHER', { targetId: 'target' }),
      now,
    );
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.human.ap).toBe(0);
    expect(result.state.units.target.hp).toBeLessThan(UNITS.TANK.hp);
  });
});
