import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { TERRAINS, UNIT_PROFILES, UNITS, type Terrain } from '@voidmarch/config';
import { canGather, createState, key, tileAt, writeTile } from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { worldEffects } from '../apps/web/src/world-effects';
const now = 1_800_000_000_000;
const target = { q: 1, r: 0 };
function fixture(terrain: Terrain = 'MOUNTAIN') {
  const s = createState('terraform', now),
    r = addPlayer(s, 'p', 'Terrassiers', 'MASK', now);
  r.wallet = { GOLD: 200, WOOD: 200, STONE: 200, IRON: 200, FOOD: 200 };
  s.units.worker = {
    id: 'worker',
    ownerId: r.id,
    kind: 'TERRAFORMER',
    q: 0,
    r: 0,
    hp: 10,
    createdAt: now,
    updatedAt: now,
  };
  writeTile(s, target, {
    terrain,
    ownerId: undefined,
    buildingId: undefined,
    poi: undefined,
    road: true,
    roadOwnerId: 'p',
  });
  const command = actionSchema.parse({
    type: 'TERRAFORM',
    actorId: 'worker',
    payload: target,
    actionId: randomUUID(),
    clientTimestamp: now,
  });
  return { s, r, command };
}
describe('terrassement', () => {
  it.each((Object.keys(TERRAINS) as Terrain[]).filter((t) => t !== 'PLAIN'))(
    'convertit %s en plaine pour le prix exact, sans capture ni suppression de route',
    (terrain) => {
      const { s, r, command } = fixture(terrain);
      const result = execute(s, r.id, command, now);
      expect(result.result.accepted).toBe(true);
      expect(tileAt(result.state, target)).toMatchObject({
        terrain: 'PLAIN',
        road: true,
        roadOwnerId: 'p',
      });
      expect(tileAt(result.state, target).ownerId).toBeUndefined();
      expect(result.state.realms.p.ap).toBe(38);
      expect(result.state.realms.p.wallet).toEqual({ ...r.wallet, WOOD: 180, IRON: 190 });
      expect(canGather(tileAt(result.state, target), r.id, 'STONE')).toBe(false);
      expect(canGather(tileAt(result.state, target), r.id, 'WOOD')).toBe(false);
      expect(canGather(tileAt(result.state, target), r.id, 'FOOD')).toBe(true);
      expect(tileAt(JSON.parse(JSON.stringify(result.state)), target).terrain).toBe('PLAIN');
    },
  );
  it.each([
    'plain',
    'enemy',
    'building',
    'distance',
    'unitKind',
    'unitOwner',
    'enemyUnit',
    'ap',
    'wood',
    'iron',
  ] as const)('refuse %s sans aucune mutation', (condition) => {
    const { s, r, command } = fixture();
    if (condition === 'plain') writeTile(s, target, { terrain: 'PLAIN' });
    if (condition === 'enemy') writeTile(s, target, { ownerId: 'enemy' });
    if (condition === 'building') addBuilding(s, r, target, 'WOOD_WALL', now);
    if (condition === 'distance') s.units.worker.q = -2;
    if (condition === 'unitKind') s.units.worker.kind = 'ENGINEER';
    if (condition === 'unitOwner') s.units.worker.ownerId = 'enemy';
    if (condition === 'enemyUnit')
      s.units.enemy = { ...s.units.worker, ...target, ownerId: 'enemy', id: 'enemy' };
    if (condition === 'ap') r.ap = 1;
    if (condition === 'wood') r.wallet.WOOD = 19;
    if (condition === 'iron') r.wallet.IRON = 9;
    const result = execute(s, r.id, command, now);
    expect(result.result.accepted).toBe(false);
    expect(result.state).toEqual(s);
  });
  it('conserve le propriétaire et l’enceinte, met à jour la vision et déclenche la poussière', () => {
    const { s, r, command } = fixture();
    writeTile(s, target, { ownerId: r.id, enclosureOwnerId: r.id });
    const before = worldView(s, r.id, now);
    const { state } = execute(s, r.id, command, now);
    expect(tileAt(state, target)).toMatchObject({ ownerId: r.id, enclosureOwnerId: r.id });
    expect(state.realms.p.explored[key(target)].terrain).toBe('PLAIN');
    const after = worldView(state, r.id, now);
    expect(worldEffects(before, after)).toContainEqual(
      expect.objectContaining({ ...target, kind: 'build' }),
    );
  });
  it('supprime le trésor du vestige sans donner de récompense et empêche un second terrassement', () => {
    const { s, r, command } = fixture('ALIEN');
    writeTile(s, target, { poi: 'MYTHIC' });
    const { state } = execute(s, r.id, command, now);
    expect(tileAt(state, target).poi).toBeUndefined();
    expect(tileAt(state, target).exhausted).toBe(true);
    expect(state.realms.p.wallet.GOLD).toBe(r.wallet.GOLD);
    expect(execute(state, r.id, { ...command, actionId: randomUUID() }, now).result.accepted).toBe(
      false,
    );
  });
  it('autorise la case occupée par le terrassier et respecte les PA illimités', () => {
    const { s, r, command } = fixture('RIVER');
    Object.assign(s.units.worker, target);
    r.ap = 0;
    r.unlimitedAP = true;
    const { state, result } = execute(s, r.id, command, now);
    expect(result.accepted).toBe(true);
    expect(state.units.worker).toMatchObject(target);
    expect(state.realms.p.wallet.IRON).toBe(190);
  });
  it('se recrute à l’atelier avec les coûts et prérequis usuels', () => {
    const { s, r } = fixture();
    const workshop = addBuilding(s, r, { q: 2, r: 0 }, 'WORKSHOP', now);

    const command = actionSchema.parse({
      type: 'RECRUIT',
      actorId: workshop.id,
      payload: { kind: 'TERRAFORMER' },
      actionId: randomUUID(),
      clientTimestamp: now,
    });
    const { state, result } = execute(s, r.id, command, now);
    expect(result.accepted).toBe(true);
    expect(Object.values(state.units).filter((u) => u.kind === 'TERRAFORMER')).toHaveLength(2);
    expect(state.realms.p.wallet.GOLD).toBe(r.wallet.GOLD - UNITS.TERRAFORMER.cost.GOLD);
    expect(UNIT_PROFILES.TERRAFORMER.recruitAt).toEqual(['WORKSHOP']);
  });
});
