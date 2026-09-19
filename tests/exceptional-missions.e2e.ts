import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, worldView } from '../apps/server/src/engine';

test('missions : prérequis acquis/manquants, défis supérieurs et expéditions sur mobile', async ({
  page,
}) => {
  const now = Date.now(),
    state = createState('adventures-test', now);
  const realm = addPlayer(state, 'a', 'Voyageur', 'ASH', now);
  addBuilding(state, realm, { q: 1, r: 0 }, 'WORKSHOP', now, 2);
  addBuilding(state, realm, { q: 2, r: 0 }, 'BARRACKS', now, 2);
  const world = worldView(state, 'a', now);
  // UI fixture; authoritative rolls, prices and acceptance are tested through the engine.
  for (const offers of [world.missions!.offers, world.missions!.expeditionOffers!]) {
    offers.forEach((o, i) => {
      o.exceptional = i === 0;
      o.level = i === 0 ? 2 : 1;
      o.discoveredBefore = i === 0;
      o.completedBefore = i === 0;
    });
  }
  await page.exposeFunction('catalogSetup', () => ({
    session: {
      token: 'fixture',
      user: { id: 'a', username: 'Voyageur', faction: 'ASH', guest: false },
    },
    world,
  }));
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'export function io(){return {on(){return this},emit(){return this},disconnect(){}}}',
    }),
  );
  const template = await (await page.request.get('/')).text();
  await page.route('**/mission-progression-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace(
        '/src/main.tsx',
        `/@fs/${resolve('tests/fixtures/missions-browser.tsx')}`,
      ),
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/mission-progression-review');
  const progression = page.getByRole('region', { name: 'Progression des missions', exact: true });
  await expect(progression).toContainText('niveau de conquête : 1/5');
  await expect(progression.locator('.fulfilled').filter({ hasText: 'Atelier' })).toContainText(
    'Acquis',
  );
  await expect(progression.locator('.negative')).toContainText('Marché niveau 2');
  await expect(progression.locator('.negative')).toContainText('à construire');
  await expect(progression).toContainText('5 %');
  await expect(page.locator('.exceptional-mission-badge')).toHaveCount(1);
  await expect(page.locator('.exceptional-mission-badge')).toContainText(
    'Défi supérieur · Niveau 2',
  );
  await page.getByRole('tab', { name: 'Expéditions & aventures' }).click();
  const expeditions = page.getByRole('region', {
    name: 'Progression des expéditions',
    exact: true,
  });
  await expect(expeditions).toContainText('Votre époque : 1/5');
  await expect(expeditions).not.toContainText('Un bâtiment de recrutement');
  await expect(page.locator('.exceptional-mission-badge')).toHaveCount(1);
  await expect(page.locator('.exceptional-mission-badge')).toContainText(
    'Expédition exceptionnelle · Époque 2',
  );
  await expect(page.locator('.mission-history').first()).toContainText('Lieu déjà découvert');
  await expect(page.locator('.mission-history').nth(1)).toContainText('Lieu à découvrir');
  await expect(page.getByRole('button', { name: /(?:^|\s)0 PA(?:$|\s)/ })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mission-progression-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
