import { expect, test } from './fixtures/game-test';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';

test('la grille change réellement sans attendre un snapshot et reste mémorisée', async ({
  page,
}) => {
  const now = Date.now();
  const state = createState('grid-browser', now);
  const realm = addPlayer(state, 'grid-player', 'Cartographes', 'ASH', now);
  realm.settings.grid = false;
  realm.settings.reducedMotion = true;
  let failSave = false;
  await page.exposeFunction('fixtureSnapshot', () =>
    worldView(state, realm.id, Date.now(), [{ q: 0, r: 0 }]),
  );
  await page.route('**/src/Map.tsx', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /\bcreate\(\)\s*\{/,
      'create() { window.__gridScene = this;',
    );
    await route.fulfill({ response, body });
  });
  // Only the initial snapshot is sent: preference updates must also work via HTTP.
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};let joined=false;return {on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return this},emit(e){if(e==='world:join'&&!joined){joined=true;window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));}return this},disconnect(){}}}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id: realm.id, username: realm.name, faction: 'ASH', guest: true },
  };
  await page.route('**/api/**', async (route) => {
    if (route.request().url().endsWith('/settings')) {
      if (failSave)
        return route.fulfill({ status: 500, json: { error: 'Sauvegarde indisponible' } });
      Object.assign(realm.settings, route.request().postDataJSON());
      return route.fulfill({ json: { settings: realm.settings } });
    }
    await route.fulfill({ json: session });
  });
  const grid = () =>
    page.evaluate(() => {
      const g = (window as any).__gridScene?.children.getByName('hex-grid');
      return g ? { visible: g.visible, commands: g.commandBuffer.length, depth: g.depth } : null;
    });
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect.poll(grid).toEqual({ visible: false, commands: 0, depth: 2500 });
  await page.getByRole('button', { name: 'Afficher la grille', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Masquer la grille', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await grid())?.visible).toBe(true);
  expect((await grid())!.commands).toBeGreaterThan(100);
  await page.screenshot({ path: 'test-results/grid-enabled.png' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Masquer la grille', exact: true })).toBeVisible();
  await expect.poll(async () => (await grid())?.visible).toBe(true);
  failSave = true;
  await page.getByRole('button', { name: 'Masquer la grille', exact: true }).click();
  await expect(page.getByText('Sauvegarde indisponible', { exact: true })).toBeVisible();
  expect((await grid())!.visible).toBe(true);
  failSave = false;
  await page.getByRole('button', { name: 'Masquer la grille', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Afficher la grille', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(grid).toEqual({ visible: false, commands: 0, depth: 2500 });
  await page.screenshot({ path: 'test-results/grid-disabled.png' });
});
