import { test, expect } from '@playwright/test';
import { createState, writeTile, key } from '@voidmarch/game-rules';
import { UNITS } from '@voidmarch/config';
import { actionSchema } from '@voidmarch/protocol';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { hexToPixel } from '../apps/web/src/map-geometry';

test('cliquer une terre près du paysan permet de la consulter puis de construire', async ({
  page,
}) => {
  const now = Date.now();
  let state = createState('terrain-click-browser', now);
  const realm = addPlayer(state, 'a', 'Bâtisseurs', 'ASH', now);
  realm.wallet.WOOD = 1000;
  realm.wallet.GOLD = 1000;
  const worker = { q: realm.capital.q + 1, r: realm.capital.r };
  const target = { q: realm.capital.q + 2, r: realm.capital.r };
  writeTile(state, target, { terrain: 'FOREST', ownerId: undefined });
  writeTile(state, worker, { terrain: 'FOREST', ownerId: undefined });
  state.units.worker = {
    ...worker,
    id: 'worker',
    ownerId: 'a',
    kind: 'PEASANT',
    hp: UNITS.PEASANT.hp,
    createdAt: now,
    updatedAt: now,
  };
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const view = () => worldView(state, 'a', Date.now());
  await page.exposeFunction('terrainSnapshot', view);
  await page.exposeFunction('terrainCommand', (raw: unknown) => {
    const applied = execute(state, 'a', actionSchema.parse(raw), Date.now());
    state = applied.state;
    return { result: applied.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const push=()=>window.terrainSnapshot().then(w=>h['world:snapshot']?.(w));window.pushTerrain=push;const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','chunks:subscribe','player:ping'].includes(e))push();return s},timeout(){return s},async emitWithAck(e,a){const r=await window.terrainCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'a', username: realm.name, guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.__terrainScene = this;',
      ),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.selection-panel')).toHaveCount(0);
  const clickHex = async (hex: { q: number; r: number }) => {
    const point = await page.evaluate((p) => {
      const scene = (window as any).__terrainScene;
      const out = scene.cameras.main.matrix.transformPoint(
        p.x - scene.cameras.main.scrollX,
        p.y - scene.cameras.main.scrollY,
      );
      const box = scene.game.canvas.getBoundingClientRect();
      return { x: box.left + out.x, y: box.top + out.y };
    }, hexToPixel(hex));
    await page.mouse.click(point.x, point.y);
  };
  await clickHex(worker);
  await expect(page.locator('.selection-panel h2')).toHaveText('Paysan');
  await clickHex(target);
  const terrain = page.locator('.terrain-selection');
  await expect(terrain).toContainText('Forêt ancienne');
  await expect(terrain).toContainText('Bois');
  await expect(terrain.getByRole('button', { name: /^Construire/ })).toBeVisible();
  await terrain.getByRole('button', { name: 'Fermer la sélection' }).click();
  await page.evaluate(() => (window as any).pushTerrain());
  await expect(page.locator('.selection-panel')).toHaveCount(0);
  await clickHex(target);
  await terrain.getByRole('button', { name: /^Construire/ }).click();
  const lumber = page
    .getByRole('dialog')
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Scierie', exact: true }) });
  await lumber.getByRole('button', { name: /Construire/ }).click();
  await expect
    .poll(() => view().tiles.find((t) => key(t) === key(target))?.building?.kind)
    .toBe('LUMBER');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Without choosing a neighboring tile, construction must stay under the worker.
  await clickHex(worker);
  await page
    .locator('.selection-panel')
    .getByRole('button', { name: /^Construire/ })
    .click();
  await expect(page.getByRole('dialog')).toContainText(`Hexagone ${worker.q}, ${worker.r}`);
  await lumber.getByRole('button', { name: /Construire/ }).click();
  await expect
    .poll(() => view().tiles.find((t) => key(t) === key(worker))?.building?.kind)
    .toBe('LUMBER');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // An occupied tile must not silently send the next construction to another hexagon.
  await clickHex(worker);
  await page
    .locator('.selection-panel')
    .getByRole('button', { name: /^Construire/ })
    .click();
  await expect(
    page.getByText(
      'Cette case contient déjà un bâtiment. Sélectionnez une case libre autour du bâtisseur.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});
