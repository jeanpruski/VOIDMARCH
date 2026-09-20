import { test, expect } from './fixtures/game-test';
import { resolve } from 'node:path';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';

for (const failure of ['illustration', 'préparation'] as const) {
  test(`chargement : erreur de ${failure} visible et nouvelle tentative fonctionnelle`, async ({
    page,
  }) => {
    const now = Date.now(),
      state = createState('load-retry', now);
    addPlayer(state, 'a', 'Chargement', 'ASH', now);
    const world = worldView(state, 'a', now);
    await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
    let missingIllustration = true;
    if (failure === 'illustration') {
      await page.route('**/assets/terrain.png', (route) =>
        missingIllustration ? route.abort('failed') : route.continue(),
      );
    } else {
      await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replace(
          'this.createWorld();',
          'this.createWorld(); if (!window.__mapRetried) { window.__mapRetried = true; throw new Error("Test initialization failure"); }',
        );
        await route.fulfill({ response, body });
      });
    }
    const html = (await (await page.request.get('/')).text())
      .replace(
        '<div id="root"></div>',
        `<div id="root"></div><script id="fixture-world" type="application/json">${JSON.stringify(world)}</script>`,
      )
      .replace('/src/main.tsx', `/@fs/${resolve('tests/fixtures/minimap.ts')}`);
    await page.route('**/loading-fixture', (route) =>
      route.fulfill({ contentType: 'text/html', body: html }),
    );
    await page.goto('/loading-fixture');
    await expect(page.getByRole('alert')).toContainText('Impossible de charger la carte');
    await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false');
    missingIllustration = false;
    await page.getByRole('button', { name: 'Réessayer le chargement' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.map-loading')).toHaveCount(0);
    await expect(page.locator('.game-canvas canvas')).toHaveCount(1);
    await expect(page.locator('.game-canvas canvas')).toHaveAttribute('data-map-view', 'detailed');
  });
}
