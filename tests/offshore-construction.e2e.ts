import { test, expect } from '@playwright/test';
import { createState, createRealm, disk, writeTile, key } from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('choisir l’eau éclairée depuis un paysan sur la plage et construire un port', async ({
  page,
}, testInfo) => {
  const now = Date.now();
  let s = createState('offshore-ui', now);
  const r = (s.realms.a = createRealm('a', 'Rivage', 'ASH', { q: 0, r: 0 }, now));
  r.settings.tutorialCompleted = true;
  r.wallet = { GOLD: 10000, WOOD: 10000, IRON: 10000, STONE: 10000, FOOD: 10000 };
  for (const p of disk(r.capital, 7))
    writeTile(s, p, {
      terrain: p.q >= 3 ? 'COAST' : p.q >= 1 ? 'BEACH' : 'PLAIN',
      ownerId: undefined,
    });
  addBuilding(s, r, r.capital, 'CAMP', now);
  s.units.worker = {
    id: 'worker',
    ownerId: 'a',
    kind: 'PEASANT',
    q: 2,
    r: 0,
    hp: 12,
    createdAt: now,
    updatedAt: now,
  };
  const target = { q: 3, r: 0 };
  const view = () =>
    worldView(s, 'a', now, [
      { q: 0, r: 0 },
      { q: 0, r: -1 },
    ]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('shoreSnapshot', view);
  await page.exposeFunction('shoreCommand', (raw: unknown) => {
    const result = execute(s, 'a', actionSchema.parse(raw), now);
    s = result.state;
    return { result: result.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(){window.shoreSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.shoreCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'a', username: r.name, faction: 'ASH', guest: false },
      },
    }),
  );
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  await page.evaluate(async (target) => {
    // @ts-expect-error Vite browser module.
    const { select, useGame, focusMap } = await import('/src/store.ts');
    select({ kind: 'unit', id: 'worker', q: 2, r: 0 });
    select({ kind: 'tile', ...target });
    focusMap(target);
    if (useGame.getState().constructionBuilderId !== 'worker')
      throw Error('Bâtisseur perdu sur sélection maritime');
  }, target);
  await page.getByRole('button', { name: /^Construire/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Chantier sur l’eau');
  await dialog.getByRole('searchbox').fill('Port des marches');
  const article = dialog
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Port des marches', exact: true }) });
  await expect(
    article.getByRole('button', { name: 'Construire · 1 PA', exact: true }),
  ).toBeEnabled();
  await article.getByRole('button', { name: 'Construire · 1 PA', exact: true }).click();
  await expect.poll(() => s.tiles[key(target)].buildingId).toBeTruthy();
  expect(s.buildings[s.tiles[key(target)].buildingId!].kind).toBe('PORT');
  expect(s.tiles[key(target)].terrain).toBe('COAST');
  expect(s.units.worker).toMatchObject({ q: 2, r: 0 });
  await expect(dialog).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('port-sur-eau.png') });
  expect(errors).toEqual([]);
});
