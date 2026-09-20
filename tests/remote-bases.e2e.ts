import { test, expect } from './fixtures/game-test';
import { createState, writeTile, key } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('un paysan fonde une base distante depuis son action dédiée', async ({ page }, testInfo) => {
  const now = Date.now();
  let state = createState('remote-base-browser', now);
  const realm = addPlayer(state, 'a', 'Pionniers', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  realm.wallet = { GOLD: 1000, WOOD: 1000, STONE: 1000, IRON: 1000, FOOD: 1000 };
  const target = { q: realm.capital.q + 70, r: realm.capital.r };
  state.units.worker = {
    id: 'worker',
    ownerId: 'a',
    kind: 'PEASANT',
    ...target,
    hp: 12,
    createdAt: now,
    updatedAt: now,
  };
  writeTile(state, target, { terrain: 'PLAIN', ownerId: undefined, buildingId: undefined });
  const view = () =>
    worldView(state, 'a', now, [{ q: Math.floor(target.q / 32), r: Math.floor(target.r / 32) }]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('baseSnapshot', view);
  await page.exposeFunction('baseCommand', (raw: unknown) => {
    const applied = execute(state, 'a', actionSchema.parse(raw), now);
    state = applied.state;
    return { result: applied.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `
    export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(){window.baseSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.baseCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}
  `,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'a', username: realm.name, faction: 'ASH', guest: false },
      },
    }),
  );
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  await page.evaluate(async (target) => {
    // @ts-expect-error Vite browser module.
    const { select, focusMap } = await import('/src/store.ts');
    select({ kind: 'unit', id: 'worker', ...target });
    focusMap(target);
  }, target);
  await page.getByRole('button', { name: /^Construire/ }).click();
  const catalogue = page.getByRole('dialog');
  await catalogue.getByRole('searchbox').fill('Avant-poste');
  await expect(
    catalogue.getByRole('button', { name: 'Fonder une base · 1 PA', exact: true }),
  ).toBeEnabled();
  await catalogue.getByRole('searchbox').fill('Campement');
  await expect(
    catalogue.locator('button').filter({ hasText: 'Construire · 1 PA' }),
  ).toBeDisabled();
  await catalogue.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.evaluate(async (target) => {
    // @ts-expect-error Vite browser module.
    const { select } = await import('/src/store.ts');
    select({ kind: 'unit', id: 'worker', ...target });
  }, target);
  await page.getByRole('button', { name: /Fonder une base/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Fonder une base', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('sans limite de distance');
  await expect(dialog.getByRole('button', { name: 'Fonder l’avant-poste · 1 PA' })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('fondation-mobile.png') });
  await dialog.getByRole('button', { name: 'Fonder l’avant-poste · 1 PA' }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.buildings[state.tiles[key(target)].buildingId!].kind).toBe('OUTPOST');
  expect(state.realms.a.capital).toEqual(realm.capital);
  expect(state.units.worker).toBeDefined();
  expect(errors).toEqual([]);
});
