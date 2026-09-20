import { test, expect } from './fixtures/game-test';
import { createState, createRealm } from '@voidmarch/game-rules';
import { BUILDINGS, UNITS, WALL_KINDS } from '@voidmarch/config';
import { addPlayer, addBuilding, worldView } from '../apps/server/src/engine';

test('collections regroupées, recherche, sélection et tutoriel repliable', async ({ page }) => {
  const now = Date.now();
  const state = createState('panels-browser', now);
  const realm = addPlayer(state, 'a', 'Veilleurs', 'ASH', now);
  const at = (q: number, r = 0) => ({ q: realm.capital.q + q, r: realm.capital.r + r });
  state.realms.b = createRealm('b', 'Voisins', 'IRON', at(7), now);
  addBuilding(state, state.realms.b, at(7), 'LUMBER', now);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem('voidmarch-sidebar-layout', JSON.stringify({ left: false, right: false })),
  );
  await page.exposeFunction('panelSnapshot', () => worldView(state, 'a', Date.now()));
  // These checks exercise the real application UI without creating accounts or rendering Phaser.
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'export function GameMap(){return null;}',
    }),
  );
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const push=()=>window.panelSnapshot().then(w=>h['world:snapshot']?.(w));const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','chunks:subscribe','player:ping'].includes(e))push();return s},disconnect(){}};window.pushPanel=push;return s;}`,
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
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.selection-panel')).toHaveCount(0);
  await page.evaluate(() => (window as any).pushPanel());
  await expect(page.locator('.selection-panel')).toHaveCount(0);
  const tutorial = page.getByRole('region', { name: 'Tutoriel de démarrage' });
  await expect(tutorial).toBeHidden();
  await page.getByRole('button', { name: 'Afficher le tutoriel de démarrage' }).click();
  await expect(tutorial).toContainText('Former votre premier paysan');
  await expect(tutorial).toContainText('0/10 étapes réalisées');
  await tutorial.getByRole('button', { name: 'Ouvrir le recrutement' }).click();
  await expect(page.getByRole('dialog')).toContainText('Paysan');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  for (let i = 0; i < 5; i++) {
    const kind = i < 2 ? 'PEASANT' : 'INFANTRY';
    state.units[`unit-${i}`] = {
      id: `unit-${i}`,
      ownerId: 'a',
      kind,
      hp: UNITS[kind].hp,
      ...at(i, 1),
      createdAt: now,
      updatedAt: now,
      ...(i === 4 ? { nickname: 'Éclaireur du nord', rareBonus: 20 } : {}),
    };
  }
  const refresh = async () => {
    state.revision++;
    await page.evaluate(() => (window as any).pushPanel());
  };
  await refresh();
  await expect(tutorial).toContainText('Produire du bois'); // enemy sawmill cannot satisfy this step
  const nav = page.getByRole('navigation', { name: 'Navigation du royaume' });
  await nav.getByRole('button', { name: /^Royaume/ }).click();
  await expect(page.getByRole('dialog').locator('.hero-controls')).toHaveCount(0);
  await expect(page.getByRole('dialog')).not.toContainText('Héros');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await nav.getByRole('button', { name: /^Armées/ }).click();
  const dialog = page.getByRole('dialog');
  const infantry = dialog
    .locator('.entity-group')
    .filter({ has: page.locator('summary strong', { hasText: UNITS.INFANTRY.name }) });
  await expect(infantry.locator('summary')).toContainText('× 3');
  await expect(infantry).not.toHaveAttribute('open');
  await infantry.locator('summary').click();
  await expect(infantry.locator('.entity-list button')).toHaveCount(3);
  await dialog.getByRole('searchbox', { name: 'Rechercher une unité' }).fill('eclaireur nord');
  await expect(dialog.locator('.entity-group')).toHaveCount(1);
  await expect(dialog.locator('.entity-list button')).toBeVisible();
  await dialog.locator('.entity-list button').click();
  await expect(dialog).toHaveCount(0);
  const selection = () =>
    page.evaluate(async () => {
      // @ts-expect-error Vite source module
      const { useGame } = await import('/src/store.ts');
      return useGame.getState().selection;
    });
  expect((await selection()).id).toBe('unit-4');
  await expect(page.getByRole('region', { name: 'Sélection actuelle' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer la sélection', exact: true }).click();
  await refresh();
  await expect(page.locator('.selection-panel')).toHaveCount(0);
  expect(await selection()).toBeNull();
  expect(
    await page.locator('.board').evaluate((el) => el.style.getPropertyValue('--minimap-bottom')),
  ).toBe('');
  await page.getByRole('button', { name: 'Mode routes', exact: true }).click();
  await refresh();
  await expect(page.getByRole('button', { name: 'Mode routes', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Mode routes', exact: true }).click();
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module
    const { select, useGame } = await import('/src/store.ts');
    const u = useGame.getState().world.units.find((u: { id: string }) => u.id === 'unit-4');
    select({ kind: 'unit', id: u.id, q: u.q, r: u.r });
  });
  delete state.units['unit-4'];
  await refresh();
  await expect(page.locator('.selection-panel')).toHaveCount(0);
  expect(await selection()).toBeNull();
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module
    const { select, useGame } = await import('/src/store.ts');
    const capital = useGame.getState().world.player.capital;
    select({ kind: 'tile', q: capital.q + 1, r: capital.r });
  });
  const terrain = page.locator('.terrain-selection');
  await expect(terrain).toBeVisible();
  await expect(terrain).toContainText('Hexagone');
  await expect(terrain.getByRole('button', { name: /^Construire/ })).toBeVisible();
  await terrain.getByRole('button', { name: /^Construire/ }).click();
  await expect(dialog).toContainText('Bâtir sur vos terres');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  addBuilding(state, realm, at(1), 'LUMBER', now);
  const higher = addBuilding(state, realm, at(2), 'LUMBER', now, 3);
  WALL_KINDS.forEach((kind, i) => addBuilding(state, realm, at(i, 3), kind, now));
  await refresh();
  await expect(tutorial).toContainText('Extraire la pierre');
  await nav.getByRole('button', { name: /^Villes/ }).click();
  const lumber = dialog
    .locator('.entity-group')
    .filter({ has: page.locator('summary strong', { hasText: BUILDINGS.LUMBER.name }) });
  await expect(lumber.locator('summary')).toContainText('× 2');
  await expect(lumber).not.toHaveAttribute('open');
  for (const kind of WALL_KINDS) await expect(dialog).not.toContainText(BUILDINGS[kind].name);
  await dialog.getByRole('searchbox', { name: 'Rechercher un bâtiment' }).fill('scierie niveau 3');
  await expect(dialog.locator('.entity-list button')).toHaveCount(1);
  await dialog.locator('.entity-list button').click();
  expect((await selection()).id).toBe(higher.id);
  await nav.getByRole('button', { name: /^Économie/ }).click();
  for (const kind of WALL_KINDS)
    await expect(dialog.locator('table')).not.toContainText(BUILDINGS[kind].name);
  await expect(dialog.locator('table')).toContainText(BUILDINGS.LUMBER.name);
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  addBuilding(state, realm, at(3), 'QUARRY', now);
  await refresh();
  await expect(tutorial).toContainText('Extraire le fer');
  await expect(tutorial).toContainText('3/10 étapes réalisées');
  await page.screenshot({ path: 'test-results/kingdom-tutorial.png', animations: 'disabled' });
  await nav.getByRole('button', { name: /^Armées/ }).click();
  await page.screenshot({ path: 'test-results/kingdom-army.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(tutorial).toBeVisible();
  await page.screenshot({
    path: 'test-results/kingdom-tutorial-mobile.png',
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Replier le tutoriel de démarrage' }).click();
  await expect(tutorial).toBeHidden();
  await page.getByRole('button', { name: 'Afficher le tutoriel de démarrage' }).click();
  await expect(tutorial).toBeVisible();
  for (const [i, kind] of (
    ['MINE', 'FARM', 'HOUSE', 'WAREHOUSE', 'WORKSHOP', 'GOLD_MINE', 'BARRACKS'] as const
  ).entries()) {
    addBuilding(state, realm, at(i, -2), kind, now);
  }
  await refresh();
  await expect(tutorial).toContainText('10/10 étapes réalisées');
  await expect(tutorial).toContainText('Vos fondations sont prêtes');
  // A vanished building also clears the selection instead of choosing the capital.
  delete state.buildings[higher.id];
  await refresh();
  await expect(page.locator('.selection-panel')).toHaveCount(0);
  expect(await selection()).toBeNull();
  expect(errors).toEqual([]);
});
