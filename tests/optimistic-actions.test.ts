import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createState, disk, writeTile } from '@voidmarch/game-rules';
import { actionSchema, type Action } from '@voidmarch/protocol';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { predictAction } from '../apps/web/src/optimistic-actions';

const now = 1_800_000_000_000;
function fixture() {
  const state = createState('prediction', now),
    realm = addPlayer(state, 'p', 'Test', 'MASK', now);
  realm.wallet = { GOLD: 200, WOOD: 200, STONE: 200, IRON: 200, FOOD: 200 };
  for (const p of disk({ q: 0, r: 0 }, 4))
    writeTile(state, p, { terrain: 'PLAIN', ownerId: realm.id, road: false });
  state.units.worker = {
    id: 'worker',
    ownerId: realm.id,
    q: 1,
    r: 0,
    kind: 'PEASANT',
    hp: 3,
    createdAt: now,
    updatedAt: now,
  };
  return { state, realm };
}
const order = (type: Action['type'], actorId: string, payload: unknown) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
describe('affichage anticipé', () => {
  it.each([
    'MOVE',
    'BUILD',
    'ROAD',
    'REMOVE_ROAD',
    'TERRAFORM',
    'GATHER',
    'REPAIR',
    'DEMOLISH',
    'UPGRADE',
    'CAPTURE',
    'RECRUIT',
    'INTERACT',
    'ABILITY',
  ] as const)('%s correspond au résultat du moteur sans muter le snapshot', (type) => {
    const { state, realm } = fixture();
    let actor = 'worker',
      payload: unknown = {};
    if (type === 'MOVE') payload = { path: [{ q: 2, r: 0 }] };
    if (type === 'BUILD') payload = { q: 2, r: 0, kind: 'HOUSE' };
    if (['ROAD', 'REMOVE_ROAD', 'TERRAFORM'].includes(type)) payload = { q: 2, r: 0 };
    if (type === 'REMOVE_ROAD')
      writeTile(state, { q: 2, r: 0 }, { road: true, roadOwnerId: realm.id });
    if (type === 'TERRAFORM') {
      state.units.worker.kind = 'TERRAFORMER';
      writeTile(state, { q: 2, r: 0 }, { terrain: 'MOUNTAIN' });
    }
    if (type === 'GATHER') {
      writeTile(state, state.units.worker, { terrain: 'FOREST' });
      payload = { resource: 'WOOD' };
    }
    if (type === 'INTERACT')
      writeTile(state, state.units.worker, { poi: 'MYTHIC', exhausted: false });
    if (type === 'ABILITY') payload = { ability: 'RALLY' };
    if (type === 'CAPTURE') writeTile(state, state.units.worker, { ownerId: undefined });
    if (type === 'DEMOLISH' || type === 'UPGRADE')
      actor = addBuilding(state, realm, { q: 2, r: 0 }, 'HOUSE', now).id;
    if (type === 'RECRUIT') {
      actor = addBuilding(state, realm, { q: 2, r: 0 }, 'WORKSHOP', now).id;
      payload = { kind: 'TERRAFORMER' };
    }
    const command = order(type, actor, payload),
      source = worldView(state, realm.id, now),
      backup = structuredClone(source);
    const prediction = predictAction(source, command);
    expect(prediction).toBeDefined();
    const actual = execute(state, realm.id, command, now);
    expect(actual.result.accepted).toBe(true);
    const view = worldView(actual.state, realm.id, now);
    expect(prediction!.world.player.wallet).toEqual(view.player.wallet);
    expect(prediction!.world.player.ap).toBe(view.player.ap);
    const clean = (value: unknown): unknown =>
      JSON.parse(JSON.stringify(value), (k, v) =>
        ['id', 'createdAt', 'updatedAt'].includes(k) ? undefined : v,
      );
    if (type === 'RECRUIT') {
      expect(clean(prediction!.world.units.find((u) => u.kind === 'TERRAFORMER'))).toEqual(
        clean(view.units.find((u) => u.kind === 'TERRAFORMER')),
      );
    } else {
      for (const t of prediction!.world.tiles.filter((t) => t.visibility === 'VISIBLE')) {
        const actualTile = view.tiles.find((x) => x.q === t.q && x.r === t.r);
        if (actualTile?.visibility === 'VISIBLE') expect(clean(t)).toEqual(clean(actualTile));
      }
      expect(prediction!.world.units).toEqual(view.units);
    }
    expect(source).toEqual(backup);
  });
  it('anticipe les virages sur une route, sans inventer de visibilité', () => {
    const { state, realm } = fixture();
    const path = [
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 2, r: 1 },
      { q: 1, r: 2 },
    ];
    for (const p of path) writeTile(state, p, { road: true });
    const source = worldView(state, realm.id, now);
    const prediction = predictAction(source, order('MOVE_ROAD', 'worker', path.at(-1)))!;
    expect(prediction.movement?.path).toEqual(path.slice(1));
    expect(prediction.world.tiles.map((t) => t.visibility)).toEqual(
      source.tiles.map((t) => t.visibility),
    );
  });
  it('ne simule ni hasard, ni combat, ni dépense impossible', () => {
    const { state, realm } = fixture();
    realm.ap = 0;
    const source = worldView(state, realm.id, now);
    expect(
      predictAction(source, order('BUILD', 'worker', { q: 2, r: 0, kind: 'HOUSE' })),
    ).toBeUndefined();
    expect(predictAction(source, order('ATTACK', 'worker', { targetId: 'enemy' }))).toBeUndefined();
  });
});
