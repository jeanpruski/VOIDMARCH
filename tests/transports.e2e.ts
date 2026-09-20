import { expect, test } from './fixtures/game-test';
import { UNITS, type UnitKind } from '@voidmarch/config';
import { createState, disk, key, writeTile } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
test('transport : sprites, embarquement, voyage, débarquement et mobile', async ({ page }) => {
  const now = Date.now();
  let state = createState('cargo-browser', now);
  const r = addPlayer(state, 'pilot', 'Convoi', 'ASH', now);
  r.settings.tutorialCompleted = true;
  r.settings.reducedMotion = true;
  r.settings.lastCameraQ = 0;
  r.settings.lastCameraR = 0;
  state.units = {};
  for (const p of disk({ q: 0, r: 0 }, 22)) {
    writeTile(state, p, { terrain: 'PLAIN', ownerId: undefined, road: false });
    r.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
  }
  for (const [id, kind, q, row] of [
    ['truck', 'CARGO_TRUCK', 0, 0],
    ['scout', 'SCOUT', 1, 0],
    ['bike', 'TRANSPORT_SIDECAR', 0, 3],
    ['carrier', 'TROOP_CARRIER', 3, 3],
    ['plane', 'CARGO_PLANE', 6, 0],
    ['heli', 'TRANSPORT_HELICOPTER', 6, 3],
    ['airship', 'CARGO_AIRSHIP', 3, 5],
  ] as [string, UnitKind, number, number][]) {
    state.units[id] = {
      id,
      ownerId: 'pilot',
      kind,
      q,
      r: row,
      hp: UNITS[kind].hp,
      createdAt: now,
      updatedAt: now,
    };
  }
  const view = () => worldView(state, 'pilot', now, disk({ q: 0, r: 0 }, 2));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const result = execute(state, 'pilot', actionSchema.parse(raw), now);
    state = result.state;
    return { result: result.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){await new Promise(r=>setTimeout(r,250));const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'pilot', username: 'Convoi', faction: 'ASH', guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.cargoScene=this; window.cargoStore=useGame;',
      ),
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 60000,
  });
  await page.evaluate(() => {
    const scene = (window as any).cargoScene;
    scene.cameras.main.setZoom(0.9).centerOn(260, 180);
    scene.renderMap();
  });
  for (const texture of [
    'transport-sidecar',
    'transport-carrier',
    'transport-truck',
    'transport-plane',
    'transport-helicopter',
    'transport-airship',
  ]) {
    const good = await page.evaluate(async (name) => {
      const img = new Image();
      img.src = `/assets/${name}.png`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
      let clear = 0,
        solid = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) clear++;
        if (pixels[i] > 200) solid++;
      }
      return clear > 1000 && solid > 1000;
    }, texture);
    expect(good, texture + ' possède une vraie transparence').toBe(true);
  }
  const cargoBadge = () =>
    page.evaluate(() => {
      const scene = (window as any).cargoScene;
      const label = scene.children.list.find((x: any) => x.name === 'cargo-count:truck');
      const badge = scene.children.list.find((x: any) => x.name === 'cargo-badge:truck');
      return {
        text: label?.text,
        used: label?.getData('used'),
        capacity: label?.getData('capacity'),
        hasBadge: !!badge,
        follows: label?.x === badge?.x && label?.y === badge?.y,
      };
    });
  await expect
    .poll(cargoBadge)
    .toEqual({ text: '0/8', used: 0, capacity: 8, hasBadge: true, follows: true });
  await page.screenshot({ path: 'test-results/transports-map.png' });
  await page.evaluate(() => (window as any).cargoScene.click({ q: 0, r: 0 }));
  await page.locator('.transport-controls > summary').click();
  await expect(page.locator('.transport-controls')).toContainText('0/8 places');
  await page.getByRole('button', { name: 'Embarquer · 1 PA', exact: true }).click();
  await expect(page.locator('.transport-controls > summary')).toContainText('1/8 places');
  expect(state.units.scout).toBeUndefined();
  expect(state.units.truck.cargo).toHaveLength(1);
  await expect.poll(cargoBadge).toMatchObject({ text: '1/8', used: 1, follows: true });
  await page.getByRole('button', { name: /^Déplacer/ }).click();
  await page.evaluate(() => (window as any).cargoScene.click({ q: 3, r: 0 }));
  await expect.poll(() => state.units.truck.q).toBe(3);
  await expect
    .poll(() => page.evaluate(() => (window as any).cargoStore.getState().pending))
    .toBe(false);
  expect(state.units.truck.cargo?.[0].q).toBe(3);
  await expect.poll(cargoBadge).toMatchObject({ text: '1/8', follows: true });
  await page.getByLabel(/Case de sortie de/).selectOption('4,0');
  await page.getByRole('button', { name: 'Débarquer · 1 PA', exact: true }).click();
  await expect(page.locator('.transport-controls > summary')).toContainText('0/8 places');
  expect(state.units.scout.q).toBe(4);
  await expect.poll(cargoBadge).toMatchObject({ text: '0/8', used: 0 });
  expect(state.realms.pilot.ap).toBe(37);
  await page.getByRole('button', { name: 'Embarquer · 1 PA', exact: true }).click();
  await expect(page.locator('.transport-controls > summary')).toContainText('1/8 places');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Débarquer · 1 PA', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await page.locator('.transport-controls').boundingBox())!.width).toBeGreaterThan(300);
  expect((await page.locator('.selection-identity h2').boundingBox())!.height).toBeLessThan(80);
  await page
    .getByRole('button', { name: 'Débarquer · 1 PA', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('button', { name: 'Débarquer · 1 PA', exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: 'test-results/transports-mobile.png' });
  await page.getByRole('button', { name: 'Débarquer · 1 PA', exact: true }).click();
  await expect(page.locator('.transport-controls > summary')).toContainText('0/8 places');
  expect(errors).toEqual([]);
});
