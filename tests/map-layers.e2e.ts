import { expect, test } from '@playwright/test';
import { createState, createRealm, disk, writeTile } from '@voidmarch/game-rules';
import {
  addBuilding,
  addPlayer,
  execute,
  worldView,
  defaultOptions,
} from '../apps/server/src/engine';
import { createNpc } from '../apps/server/src/npcs';
import { actionSchema } from '@voidmarch/protocol';

test('filtres indépendants des unités et bâtiments, sans ordre de jeu', async ({ page }) => {
  const now = Date.now();
  let state = createState('layers-browser', now),
    orders = 0;
  const id = 'pilot';
  const realm = addPlayer(state, id, 'Cartographes', 'ASH', now);
  realm.settings.reducedMotion = true;
  for (const p of disk(realm.capital, 7)) writeTile(state, p, { terrain: 'PLAIN' });
  state.realms.enemy = createRealm('enemy', 'Rivaux', 'IRON', { q: 2, r: 0 }, now);
  addBuilding(state, state.realms.enemy, { q: 2, r: 0 }, 'HOUSE', now);
  addBuilding(state, realm, { q: 0, r: 1 }, 'WOOD_WALL', now);
  state.units.worker = {
    id: 'worker',
    ownerId: id,
    kind: 'PEASANT',
    q: 0,
    r: 0,
    hp: 5,
    createdAt: now,
    updatedAt: now,
  };
  state.units.enemy = {
    id: 'enemy',
    ownerId: 'enemy',
    kind: 'RIFLEMAN',
    q: 1,
    r: 0,
    hp: 10,
    createdAt: now,
    updatedAt: now,
  };
  createNpc(state, { q: -1, r: 0 }, 'deserter', now);
  const view = () =>
    worldView(state, id, Date.now(), [
      { q: -1, r: -1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 0, r: 0 },
    ]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    orders++;
    const r = execute(state, id, actionSchema.parse(raw), Date.now(), {
      ...defaultOptions,
      recruitBonus: () => 0,
    });
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const handlers={};const socket={on(event,fn){handlers[event]=fn;if(event==='connect')queueMicrotask(fn);return socket;},emit(event){if(['world:join','chunks:subscribe','player:ping'].includes(event))window.fixtureSnapshot().then(w=>handlers['world:snapshot']?.(w));return socket;},timeout(){return socket;},async emitWithAck(event,action){const r=await window.fixtureCommand(action);handlers['world:snapshot']?.(r.world);return r.result;},disconnect(){}};return socket;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id, username: 'Escadrille noire', faction: 'ASH', guest: true },
  };
  await page.route('**/api/**', (route) => route.fulfill({ json: session }));
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /\bcreate\(\)\s*\{/,
      'create() { window.__layersScene = this;',
    );
    await route.fulfill({ response, body });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.board canvas')).toBeVisible();
  const visible = () =>
    page.evaluate(() => {
      const scene = (window as any).__layersScene;
      return {
        units: scene.unitVisuals.size,
        buildings: scene.children.list.filter(
          (o: any) => o.name?.startsWith('building-sprite:') || o.name?.startsWith('wall:'),
        ).length,
        npcTags: scene.children.list.filter((o: any) => o.name?.startsWith('npc-tag:')).length,
      };
    });
  await expect.poll(async () => (await visible()).units).toBe(3);
  const initial = await visible();
  expect(initial.buildings).toBeGreaterThanOrEqual(3);
  await page.getByRole('button', { name: 'Masquer les unités', exact: true }).click();
  expect(await visible()).toEqual({ ...initial, units: 0, npcTags: 0 });
  await expect(
    page.getByRole('button', { name: 'Afficher les unités', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Masquer les bâtiments', exact: true }).click();
  expect((await visible()).buildings).toBe(0);
  const selected = await page.evaluate(async () => {
    (window as any).__layersScene.click({ q: 0, r: 0 });
    // @ts-expect-error Vite source module.
    const { useGame } = await import('/src/store.ts');
    return useGame.getState().selection;
  });
  expect(selected?.kind).toBe('tile');
  await expect(page.locator('.selection-panel')).toContainText('Cette case reste occupée.');
  await expect(
    page.locator('.selection-panel').getByRole('button', { name: 'Construire', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: 'test-results/map-layers-hidden.png' });
  await page.getByRole('button', { name: 'Afficher les unités', exact: true }).click();
  expect((await visible()).units).toBe(3);
  expect((await visible()).buildings).toBe(0);
  await page.evaluate(() => {
    const s = (window as any).__layersScene;
    s.cameras.main.setZoom(0.2);
    s.renderMap();
    s.cameras.main.setZoom(0.92);
    s.renderMap();
  });
  expect((await visible()).buildings).toBe(0);
  await page.getByRole('button', { name: 'Afficher les bâtiments', exact: true }).click();
  expect(await visible()).toEqual(initial);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('button', { name: 'Masquer les unités', exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole('button', { name: 'Masquer les bâtiments', exact: true }),
  ).toBeInViewport();
  await page.getByRole('button', { name: 'Masquer les unités', exact: true }).click();
  await page.screenshot({ path: 'test-results/map-layers-mobile.png' });
  expect(orders).toBe(0);
  expect(errors).toEqual([]);
});
