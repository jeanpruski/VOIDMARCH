import type { WorldView } from '@voidmarch/shared';
import { expect, test } from '@playwright/test';
import { createState, disk, writeTile } from '@voidmarch/game-rules';
import {
  addBuilding,
  addPlayer,
  defaultOptions,
  execute,
  worldView,
} from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('actions immédiates, confirmation sans doublon, refus et réseau interrompu', async ({
  page,
}) => {
  const now = Date.now(),
    id = 'optimistic';
  let state = createState('optimistic-browser', now);
  const realm = addPlayer(state, id, 'Les bâtisseurs', 'MASK', now);
  realm.wallet = { GOLD: 500, WOOD: 500, IRON: 500, STONE: 500, FOOD: 500 };
  for (const p of disk({ q: 0, r: 0 }, 6))
    writeTile(state, p, { terrain: 'PLAIN', ownerId: id, road: false });
  state.units.worker = {
    id: 'worker',
    ownerId: id,
    kind: 'PEASANT',
    q: 1,
    r: 0,
    hp: 5,
    createdAt: now,
    updatedAt: now,
  };
  const workshop = addBuilding(state, realm, { q: 0, r: 1 }, 'WORKSHOP', now);
  const view = () => worldView(state, id, now);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  let executed = 0;
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    executed++;
    const result = execute(state, id, actionSchema.parse(raw), now, {
      ...defaultOptions,
      recruitBonus: () => 20,
    });
    state = result.state;
    return { result: result.result, world: view() };
  });
  await page.route('**/src/Map.tsx', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.__pendingScene=this;',
      ),
    });
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `
    export function io(){const h={};const socket={
      on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return socket;},
      emit(e){if(window.__holdSync&&e==='world:sync')return socket;if(['world:join','world:sync','chunks:subscribe'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return socket;},
      timeout(){return socket;},
      emitWithAck(e,a){window.__emitted=(window.__emitted||0)+1;return new Promise((resolve,reject)=>{
        window.__complete=async(before=true)=>{const r=await window.fixtureCommand(a);if(before)h['world:snapshot']?.(r.world);else window.__snapshot=()=>h['world:snapshot']?.(r.world);resolve(r.result);};
        window.__refuse=()=>resolve({accepted:false,actionId:a.actionId,reason:'Chantier occupé par un adversaire.'});
        window.__timeout=()=>reject(new Error('timeout'));
      });},disconnect(){h.disconnect?.();}};
      window.__push=()=>window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));
      window.__disconnect=()=>h.disconnect?.();
      window.__rawSnapshot=w=>h['world:snapshot']?.(w);
      return socket;
    }`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id, username: realm.name, guest: true },
  };
  await page.route('**/api/**', (route) => route.fulfill({ json: session }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.board canvas')).toBeVisible();
  const client = () =>
    page.evaluate(async () => {
      // @ts-expect-error Vite module.
      const { useGame } = await import('/src/store.ts');
      const s = useGame.getState();
      return {
        world: s.world as WorldView,
        pending: s.pending,
        pendingAction: s.pendingAction,
        movements: s.movements,
        status: s.status,
        panel: s.panel,
        selection: s.selection,
      };
    });
  const begin = async (type: string, actorId: string, payload: unknown) =>
    page.evaluate(
      async ({ type, actorId, payload }) => {
        // @ts-expect-error Vite module.
        const { send } = await import('/src/store.ts');
        (window as any).__request = send({ type, actorId, payload });
      },
      { type, actorId, payload },
    );
  const confirm = () =>
    page.evaluate(async () => {
      await (window as any).__complete();
      await (window as any).__request;
    });

  // Work site and reserved costs appear before the request reaches the engine; no finished sprite.
  await begin('BUILD', 'worker', { q: 2, r: 0, kind: 'HOUSE' });
  let c = await client();
  expect(c.world!.tiles.find((t) => t.q === 2 && t.r === 0)?.building).toBeUndefined();
  expect(c.pendingAction).toMatchObject({ style: 'construction', position: { q: 2, r: 0 } });
  expect(c.world!.player.ap).toBe(29);
  expect(executed).toBe(0);
  expect(state.tiles['2,0'].buildingId).toBeUndefined();
  const predictedWallet = c.world!.player.wallet;
  // Double clicks cannot send a second order, even on another action.
  await begin('ROAD', id, { q: 2, r: 1 });
  expect(await page.evaluate(() => (window as any).__emitted)).toBe(1);
  await expect(page.getByRole('status').filter({ hasText: 'Construction en cours' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__pendingScene.children.getByName('pending-site')?.visible,
      ),
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/optimistic-build.png' });
  await confirm();
  c = await client();
  expect(c.pending).toBe(false);
  expect(c.pendingAction).toBeUndefined();
  expect(c.world!.tiles.find((t) => t.q === 2 && t.r === 0)?.building?.id).not.toMatch(/^preview:/);
  expect(c.world!.player.wallet).toEqual(predictedWallet);

  await begin('MOVE', 'worker', {
    path: [
      { q: 2, r: 0 },
      { q: 2, r: 1 },
    ],
  });
  c = await client();
  expect(c.world!.units.find((u) => u.id === 'worker')).toMatchObject({ q: 2, r: 1 });
  expect(state.units.worker).toMatchObject({ q: 1, r: 0 });
  const started = c.movements.worker.startedAt;
  // An unrelated snapshot cannot erase the visual movement.
  await page.evaluate(() => (window as any).__push());
  expect((await client()).world!.units.find((u) => u.id === 'worker')).toMatchObject({
    q: 2,
    r: 1,
  });
  await confirm();
  expect((await client()).movements.worker?.startedAt).toBe(started);

  // Reject after another world update: retain that update, roll back only the prediction.
  const oldSnapshot = view();
  const before = structuredClone((await client()).world!.player);
  await begin('BUILD', 'worker', { q: 3, r: 1, kind: 'HOUSE' });
  state.realms[id].wallet.GOLD += 7;
  state.revision++;
  await page.evaluate(() => (window as any).__push());
  await page.evaluate(async () => {
    (window as any).__refuse();
    await (window as any).__request;
  });
  c = await client();
  expect(c.world!.tiles.find((t) => t.q === 3 && t.r === 1)?.building).toBeUndefined();
  expect(c.world!.player.wallet.GOLD).toBe(before.wallet.GOLD + 7);
  expect(c.world!.player.ap).toBe(before.ap);
  await page.evaluate((w) => (window as any).__rawSnapshot(w), oldSnapshot);
  expect((await client()).world!.player.wallet.GOLD).toBe(before.wallet.GOLD + 7);

  await begin('RECRUIT', workshop.id, { kind: 'TERRAFORMER' });
  expect((await client()).world!.units.find((u) => u.kind === 'TERRAFORMER')).toBeUndefined();
  expect((await client()).pendingAction?.style).toBe('recruit');
  await expect(page.getByRole('status').filter({ hasText: 'Formation en cours' })).toBeVisible();
  await page.screenshot({ path: 'test-results/pending-recruit.png' });
  await confirm();
  c = await client();
  const recruits = c.world!.units.filter((u) => u.kind === 'TERRAFORMER');
  expect(recruits).toHaveLength(1);
  expect(recruits[0].rareBonus).toBe(20);
  expect(recruits[0].id).not.toMatch(/^preview:/);

  // Lost response restores the latest server view and resyncs; never retries the action.
  const count = executed;
  await begin('ROAD', id, { q: 3, r: 1 });
  expect((await client()).world!.tiles.find((t) => t.q === 3 && t.r === 1)?.road).toBe(false);
  expect((await client()).pendingAction?.label).toBe('Route en travaux');
  await page.evaluate(async () => {
    (window as any).__timeout();
    await (window as any).__request;
  });
  await expect.poll(async () => (await client()).status).toBe('online');
  expect((await client()).world!.tiles.find((t) => t.q === 3 && t.r === 1)?.road).toBe(false);
  expect(executed).toBe(count);

  await begin('MOVE', 'worker', { path: [{ q: 3, r: 1 }] });
  await page.evaluate(() => (window as any).__disconnect());
  expect((await client()).pending).toBe(false);
  expect((await client()).movements).toEqual({});
  // A late rejection must not alter state from a newer session/resync.
  await page.evaluate(async () => {
    (window as any).__refuse();
    await (window as any).__request;
  });
  expect((await client()).world!.units.find((u) => u.id === 'worker')).toMatchObject({
    q: 2,
    r: 1,
  });
  // An accepted receipt alone must not remove the site before the matching world arrives.
  await page.evaluate(() => {
    (window as any).__holdSync = true;
  });
  await begin('BUILD', 'worker', { q: 3, r: 1, kind: 'WOOD_WALL' });
  await page.evaluate(async () => {
    await (window as any).__complete(false);
    await (window as any).__request;
  });
  expect((await client()).pending).toBe(true);
  expect(
    (await client()).world!.tiles.find((t) => t.q === 3 && t.r === 1)?.building,
  ).toBeUndefined();
  await page.evaluate(() => {
    (window as any).__snapshot();
    (window as any).__holdSync = false;
  });
  await expect.poll(async () => (await client()).pending).toBe(false);
  const wall = state.tiles['3,1'].buildingId!;
  await begin('UPGRADE', wall, {});
  expect((await client()).world!.tiles.find((t) => t.q === 3 && t.r === 1)?.building?.kind).toBe(
    'WOOD_WALL',
  );
  await expect(page.getByRole('status').filter({ hasText: 'Amélioration en cours' })).toBeVisible();
  await confirm();
  expect((await client()).world!.tiles.find((t) => t.q === 3 && t.r === 1)?.building?.kind).toBe(
    'STONE_WALL',
  );
  await begin('ROAD', id, { q: 3, r: 1 });
  expect((await client()).world!.tiles.find((t) => t.q === 3 && t.r === 1)?.road).toBe(false);
  await confirm();
  await begin('REMOVE_ROAD', id, { q: 3, r: 1 });
  expect((await client()).world!.tiles.find((t) => t.q === 3 && t.r === 1)?.road).toBe(true);
  await confirm();
  expect((await client()).world!.tiles.find((t) => t.q === 3 && t.r === 1)?.road).toBe(false);
  await begin('DEMOLISH', wall, {});
  expect((await client()).world!.tiles.find((t) => t.q === 3 && t.r === 1)?.building?.id).toBe(
    wall,
  );
  await confirm();
  expect(
    (await client()).world!.tiles.find((t) => t.q === 3 && t.r === 1)?.building,
  ).toBeUndefined();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__pendingScene.children.getByName('pending-site')?.visible,
      ),
    )
    .toBe(false);
  expect(errors).toEqual([]);
});
