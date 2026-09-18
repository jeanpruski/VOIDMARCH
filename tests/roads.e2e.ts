import { expect, test } from '@playwright/test';
import { createState, disk, key, tileAt, writeTile } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test.use({ hasTouch: true });

test('poser plusieurs routes et un pont puis les retirer depuis la carte, sur ordinateur et mobile', async ({
  page,
}) => {
  const now = Date.now(),
    id = 'roads';
  let state = createState('roads-browser', now);
  const realm = addPlayer(state, id, 'Les voies obscures', 'MASK', now),
    capital = realm.capital;
  realm.wallet = { GOLD: 100, WOOD: 100, STONE: 100, IRON: 100, FOOD: 100 };
  for (const p of disk(capital, 3))
    writeTile(state, p, { terrain: 'FOREST', ownerId: id, road: false });
  const first = { q: capital.q + 1, r: capital.r },
    bridge = { q: capital.q + 2, r: capital.r };
  writeTile(state, bridge, { terrain: 'RIVER' });
  const view = () => worldView(state, id, Date.now());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const result = execute(state, id, actionSchema.parse(raw), Date.now());
    state = result.state;
    return { result: result.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const handlers={};const socket={on(event,fn){handlers[event]=fn;if(event==='connect')queueMicrotask(fn);return socket;},emit(event){if(['world:join','chunks:subscribe','player:ping'].includes(event))window.fixtureSnapshot().then(w=>handlers['world:snapshot']?.(w));return socket;},timeout(){return socket;},async emitWithAck(event,action){const r=await window.fixtureCommand(action);handlers['world:snapshot']?.(r.world);return r.result;},disconnect(){}};return socket;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id, username: realm.name, faction: 'MASK', guest: true },
  };
  await page.route('**/api/**', (route) => route.fulfill({ json: session }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.board canvas')).toBeVisible();
  const point = (p: { q: number; r: number }) =>
    page.evaluate(async (p) => {
      // @ts-expect-error Vite test source module.
      const { useGame } = await import('/src/store.ts');
      // @ts-expect-error Vite test source module.
      const { hexToPixel } = await import('/src/map-geometry.ts');
      const v = useGame.getState().cameraViewport,
        pixel = hexToPixel(p);
      const rect = document.querySelector('.board canvas')!.getBoundingClientRect();
      return {
        x: rect.left + ((pixel.x - v.x) * rect.width) / v.width,
        y: rect.top + ((pixel.y - v.y) * rect.height) / v.height,
      };
    }, p);
  const clickHex = async (p: { q: number; r: number }) => {
    const pos = await point(p);
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, pos)).toBe(
      'CANVAS',
    );
    await page.mouse.click(pos.x, pos.y);
  };
  await page.getByRole('button', { name: 'Mode routes', exact: true }).first().click();
  const tool = page.getByRole('region', { name: 'Aménagement des routes' });
  await expect(tool).toBeVisible();
  await clickHex(first);
  await expect.poll(() => !!tileAt(state, first).road).toBe(true);
  await clickHex(bridge);
  await expect.poll(() => !!tileAt(state, bridge).road).toBe(true);
  expect(state.realms[id].ap).toBe(38);
  expect(state.realms[id].wallet.WOOD).toBe(60);
  expect(state.realms[id].wallet.IRON).toBe(90);
  await expect(tool).toBeVisible();
  await clickHex(bridge);
  await expect(tool).toContainText('Une route est déjà en place');
  expect(state.realms[id].ap).toBe(38);
  await tool.getByText('À quoi servent les routes ?', { exact: true }).click();
  await expect(tool).toContainText('sans limite de distance');
  await expect(tool).toContainText('Pour rejoindre la route ou la quitter');
  await page.screenshot({ path: 'test-results/roads-desktop.png' });
  await tool.getByText('À quoi servent les routes ?', { exact: true }).click();
  await tool.getByRole('button', { name: 'Retirer · 1 PA/case', exact: true }).click();
  await expect(tool).toContainText('Sans remboursement');
  await clickHex(first);
  await expect.poll(() => !!tileAt(state, first).road).toBe(false);
  await clickHex(bridge);
  await expect.poll(() => !!tileAt(state, bridge).road).toBe(false);
  expect(state.realms[id].ap).toBe(36);
  expect(state.realms[id].wallet.WOOD).toBe(60);
  await page.keyboard.press('Escape');
  await expect(tool).toHaveCount(0);
  // The original action on the selected tile remains available, including beneath a building.
  await page.evaluate(async (capital) => {
    // @ts-expect-error Vite test source module.
    const { select } = await import('/src/store.ts');
    select({ kind: 'tile', ...capital });
  }, capital);
  await page.getByRole('button', { name: /Tracer une route/ }).click();
  await expect.poll(() => !!tileAt(state, capital).road).toBe(true);
  await page.getByRole('button', { name: 'Retirer la route · 1 PA', exact: true }).click();
  await expect.poll(() => !!tileAt(state, capital).road).toBe(false);
  expect(tileAt(state, capital).buildingId).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Mode routes', exact: true }).first().click();
  await expect(tool).toBeVisible();
  // Center a tile on the visible portion of the mobile map.
  await page.evaluate(async (capital) => {
    // @ts-expect-error Vite test source module.
    const { focusMap, useGame } = await import('/src/store.ts');
    useGame.setState({ selection: null });
    focusMap(capital);
  }, capital);
  await expect
    .poll(async () => {
      const pos = await point(capital);
      return page.evaluate(({ x, y }) => {
        const rect = document.querySelector('.board canvas')!.getBoundingClientRect();
        return (
          Math.abs(x - rect.left - rect.width / 2) < 1 &&
          Math.abs(y - rect.top - rect.height / 2) < 1 &&
          document.elementFromPoint(x, y)?.tagName === 'CANVAS'
        );
      }, pos);
    })
    .toBe(true);
  const mobilePoint = await point(capital);
  await page.touchscreen.tap(mobilePoint.x, mobilePoint.y);
  await expect.poll(() => !!tileAt(state, capital).road).toBe(true);
  await tool.getByRole('button', { name: 'Retirer · 1 PA/case', exact: true }).click();
  await page.touchscreen.tap(mobilePoint.x, mobilePoint.y);
  await expect.poll(() => !!tileAt(state, capital).road).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/roads-mobile.png' });
  await tool.getByRole('button', { name: 'Quitter le mode routes' }).click();
  await expect(tool).toHaveCount(0);
  // Extend the same in-memory realm with a builder and a road across chunk boundaries.
  const worker = {
    id: 'worker',
    ownerId: id,
    kind: 'PEASANT' as const,
    ...capital,
    hp: 5,
    createdAt: now,
    updatedAt: now,
  };
  state.units.worker = worker;
  const neutral = { q: capital.q, r: capital.r + 1 };
  writeTile(state, neutral, { ownerId: undefined, terrain: 'PLAIN', road: false });
  await page.setViewportSize({ width: 1440, height: 960 });
  const refresh = async (center: { q: number; r: number }, selectUnit = false) =>
    page.evaluate(
      async ({ center, selectUnit }) => {
        // @ts-expect-error Vite test source module.
        const { useGame, focusMap, select } = await import('/src/store.ts');
        // @ts-expect-error Playwright fixture transport.
        const world = await window.fixtureSnapshot();
        useGame.setState({ world });
        if (selectUnit)
          select({
            kind: 'unit',
            id: 'worker',
            ...world.units.find((u: { id: string }) => u.id === 'worker'),
          });
        focusMap(center);
      },
      { center, selectUnit },
    );
  await refresh(capital, true);
  await page.getByRole('button', { name: 'Mode routes', exact: true }).first().click();
  await expect.poll(async () => Math.abs((await point(capital)).x - 705.5)).toBeLessThan(1);
  await clickHex(neutral);
  await expect.poll(() => !!tileAt(state, neutral).road).toBe(true);
  expect(tileAt(state, neutral).ownerId).toBeUndefined();
  await tool.getByRole('button', { name: 'Retirer · 1 PA/case', exact: true }).click();
  await clickHex(neutral);
  await expect.poll(() => !!tileAt(state, neutral).road).toBe(false);
  await tool.getByRole('button', { name: 'Quitter le mode routes' }).click();
  for (let q = capital.q; q <= capital.q + 40; q++) {
    const p = { q, r: capital.r };
    writeTile(state, p, { road: true, terrain: 'PLAIN' });
    state.realms[id].explored[key(p)] = {
      ...p,
      road: true,
      terrain: 'PLAIN',
      visibility: 'EXPLORED',
    };
  }
  const destination = { q: capital.q + 40, r: capital.r };
  await refresh(destination, true);
  await expect(page.getByRole('region', { name: 'Sélection actuelle' })).toContainText(
    'distance illimitée',
  );
  await page.getByRole('button', { name: 'Déplacer 1 PA', exact: true }).click();
  await expect.poll(async () => Math.abs((await point(destination)).x - 705.5)).toBeLessThan(1);
  const beforeAP = state.realms[id].ap;
  await clickHex(destination);
  await expect.poll(() => state.units.worker.q).toBe(destination.q);
  expect(state.realms[id].ap).toBe(beforeAP - 1);
  await expect(page.getByRole('button', { name: 'Déplacer 1 PA', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/roads-long-travel.png' });
  expect(errors).toEqual([]);
});
