import { expect, test } from '@playwright/test';
import { createState, realmBuildings, realmUnits, writeTile } from '@voidmarch/game-rules';
import {
  addBuilding,
  addPlayer,
  execute,
  worldView,
  defaultOptions,
} from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
defaultOptions.recruitBonus = () => 0;

test('le campement gratuit mène aux récoltes et constructions, avec le catalogue complet et des vies visibles', async ({
  page,
}) => {
  let state = createState('founding-browser', Date.now());
  const id = 'local-fixture';
  addPlayer(state, id, 'Les Pionniers', 'ASH', Date.now());
  const view = () =>
    worldView(state, id, Date.now(), [
      { q: -1, r: -1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 0, r: 0 },
    ]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (response) => {
    if (response.url().includes('/assets/') && response.status() >= 400)
      errors.push(`Asset ${response.status()}: ${response.url()}`);
  });
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64')}.test`,
    user: { id, username: 'Les Pionniers', faction: 'ASH', guest: true },
  };
  // Replace only the browser's transport. Every order still goes through the real
  // schema, authoritative engine and filtered view, entirely in memory.
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const applied = execute(state, id, actionSchema.parse(raw), Date.now());
    state = applied.state;
    return { result: applied.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `
    export function io(){
      const handlers={};
      const socket={on(event,fn){handlers[event]=fn;if(event==='connect')queueMicrotask(fn);return socket;},
        emit(event){if(['world:join','chunks:subscribe','player:ping'].includes(event))window.fixtureSnapshot().then(w=>handlers['world:snapshot']?.(w));return socket;},
        timeout(){return socket;},async emitWithAck(event,action){const r=await window.fixtureCommand(action);handlers['world:snapshot']?.(r.world);return r.result;},disconnect(){}};
      window.fixtureSocket=socket;return socket;
    }
  `,
    }),
  );
  await page.route('**/api/**', async (route) => {
    if (route.request().url().endsWith('/settings')) {
      Object.assign(state.realms[id].settings, route.request().postDataJSON());
      await route.fulfill({ json: { ok: true } });
    } else await route.fulfill({ json: session });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  const originalBoardWidth = (await page.locator('.board').boundingBox())!.width;
  await page.getByRole('button', { name: 'Replier le panneau du royaume', exact: true }).click();
  await page
    .getByRole('button', { name: 'Replier le panneau des événements', exact: true })
    .click();
  await expect
    .poll(async () => (await page.locator('.board').boundingBox())!.width)
    .toBeGreaterThan(originalBoardWidth + 200);
  await expect
    .poll(async () =>
      page.locator('.game-canvas canvas').evaluate((canvas) => (canvas as HTMLCanvasElement).width),
    )
    .toBe(Math.round((await page.locator('.board').boundingBox())!.width));
  await page.screenshot({ path: 'test-results/collapsed-sidebars.png' });
  await page.getByRole('button', { name: 'Afficher le panneau du royaume', exact: true }).click();
  await page
    .getByRole('button', { name: 'Afficher le panneau des événements', exact: true })
    .click();
  await expect
    .poll(async () => (await page.locator('.board').boundingBox())!.width)
    .toBe(originalBoardWidth);
  await expect(page.locator('.map-heading')).toHaveCount(0);
  await expect(page.getByText(/MONDE PERSISTANT/i)).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Sélection actuelle' })).toContainText('Campement');
  await page.getByRole('button', { name: 'Développer…', exact: true }).click();
  const upgradePreview = page.getByRole('dialog', { name: 'Évoluer en avant-poste' });
  await expect(upgradePreview).toContainText('30 → 35 PV');
  await expect(upgradePreview.getByRole('row').filter({ hasText: 'Bois' })).toContainText('30');
  await expect(
    upgradePreview.getByRole('button', { name: 'Confirmer l’amélioration · 2 PA' }),
  ).toBeDisabled();
  await page.screenshot({ path: 'test-results/upgrade-preview-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/upgrade-preview-mobile.png' });
  await upgradePreview.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  await expect(page.getByRole('dialog').locator('article')).toHaveCount(30);
  await page.getByText('Comment choisir et former une unité ?', { exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('budget de déplacement');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  await expect(page.locator('.purchase-details')).toHaveCount(0);
  await expect(page.locator('.cost-insufficient').first()).toBeAttached();
  await page.getByRole('tab', { name: 'Véhicules', exact: true }).click();
  await expect(page.getByRole('dialog').locator('article')).toHaveCount(3);
  await page.getByRole('tab', { name: 'Toutes', exact: true }).click();
  await page.getByRole('button', { name: 'Former le paysan · 1 PA' }).click();
  await expect.poll(() => realmUnits(state, id).length).toBe(1);
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Armées A', exact: false }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Paysan/ })
    .click();
  await expect(page.getByRole('button', { name: 'Récolter bois +20 · 1 PA' })).toBeDisabled();
  const worker = realmUnits(state, id)[0];
  const move = execute(
    state,
    id,
    actionSchema.parse({
      type: 'MOVE',
      actorId: worker.id,
      payload: { path: [{ q: 1, r: 0 }] },
      actionId: '00000000-0000-4000-8000-000000000001',
      clientTimestamp: Date.now(),
    }),
    Date.now(),
  );
  expect(move.result.accepted).toBe(true);
  state = move.state;
  await page.evaluate('window.fixtureSocket.emit("world:join")');
  await page.getByRole('button', { name: 'Récolter bois +20 · 1 PA' }).click();
  await expect.poll(() => state.realms[id].wallet.WOOD).toBeGreaterThanOrEqual(20);
  await page.getByRole('button', { name: 'Construire', exact: true }).click();
  await expect(page.getByRole('dialog').locator('article')).toHaveCount(36);
  await page.getByRole('tab', { name: 'Industrie', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Usine de blindés', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chaumière', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/building-tabs-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Ressources', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Carrière de pierre', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/building-tabs-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('tab', { name: 'Tous', exact: true }).click();
  const house = page
    .getByRole('dialog')
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Chaumière', exact: true }) });
  await house.getByRole('button', { name: 'Construire · 1 PA' }).click();
  await expect.poll(() => realmBuildings(state, id).some((b) => b.kind === 'HOUSE')).toBe(true);
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  const peasant = realmUnits(state, id)[0],
    camp = realmBuildings(state, id).find((b) => b.kind === 'CAMP')!;
  peasant.hp = 2;
  camp.hp = 17;
  await page.evaluate('window.fixtureSocket.emit("world:join")');
  await page.getByRole('button', { name: 'Armées A', exact: false }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Paysan/ })
    .click();
  await expect(page.getByRole('region', { name: 'Sélection actuelle' })).toContainText('2/5');
  await page.screenshot({ path: 'test-results/founding-health-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => {
      const mini = await page.getByRole('img', { name: 'Minicarte du royaume' }).boundingBox();
      const panel = await page.getByRole('region', { name: 'Sélection actuelle' }).boundingBox();
      return !!mini && !!panel && mini.y + mini.height < panel.y;
    })
    .toBe(true);
  await expect(page.locator('.unit-stats strong').first()).toBeInViewport();
  const actionRows = await page
    .locator('.selection-actions button')
    .evaluateAll((buttons) =>
      buttons.map((button) =>
        Math.round(button.getBoundingClientRect().top + button.getBoundingClientRect().height / 2),
      ),
    );
  expect(Math.max(...actionRows) - Math.min(...actionRows)).toBeLessThanOrEqual(1);
  expect(
    (await page.getByRole('region', { name: 'Sélection actuelle' }).boundingBox())!.height,
  ).toBeLessThan(230);

  await page.screenshot({
    path: 'test-results/founding-health-mobile.png',
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
  expect(realmUnits(state, id)).toHaveLength(1);
  expect(realmBuildings(state, id)).toHaveLength(2);

  // Industrial assets and recruitment are exercised in the same isolated world.
  await page.setViewportSize({ width: 1440, height: 1000 });
  state.realms[id].wallet = { STONE: 0, GOLD: 1000, WOOD: 1000, IRON: 1000, FOOD: 1000 };
  state.realms[id].ap = 5;
  defaultOptions.recruitBonus = () => 20;
  const garage = addBuilding(state, state.realms[id], { q: 2, r: 0 }, 'GARAGE', Date.now());
  addBuilding(state, state.realms[id], { q: 2, r: -1 }, 'ARSENAL', Date.now());
  addBuilding(state, state.realms[id], { q: -1, r: 1 }, 'BUNKER', Date.now());
  writeTile(state, garage, { terrain: 'PLAIN' });
  await page.evaluate('window.fixtureSocket.emit("world:join")');
  await page.getByRole('button', { name: 'Villes & domaines V', exact: false }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Garage militaire/ })
    .click();
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  await page.getByRole('searchbox').fill('Moto');
  await expect(page.getByRole('dialog').locator('article')).toHaveCount(1);
  await page.getByRole('dialog').locator('article').getByRole('button').click();
  await expect.poll(() => realmUnits(state, id).some((u) => u.kind === 'MOTORCYCLE')).toBe(true);
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  expect(realmUnits(state, id).find((u) => u.kind === 'MOTORCYCLE')?.rareBonus).toBe(20);
  await page.getByRole('button', { name: 'Armées A', exact: false }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Moto de reconnaissance/ })
    .click();
  await expect(page.locator('.rare-tag').first()).toContainText('20');
  await page.screenshot({ path: 'test-results/industrial-world.png' });
  expect(errors).toEqual([]);
});

test('l’accueil cosmique reste épuré et lisible sans créer de compte', async ({ page }) => {
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { error: 'Aucune session' } }),
  );
  await page.goto('/');
  await expect(page.getByLabel('Nom de votre souverain')).toBeVisible();
  await expect(page.getByText(/MONDE PERSISTANT/i)).toHaveCount(0);
  await expect(page.locator('.login-art')).toHaveCSS('background-image', /abyssal-threshold/);
  await page.evaluate(async () => {
    const image = new Image();
    image.src = '/assets/abyssal-threshold.png';
    await image.decode();
  });
  await page.screenshot({ path: 'test-results/cosmic-login.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Élever ma bannière' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/cosmic-login-mobile.png', animations: 'disabled' });
});
