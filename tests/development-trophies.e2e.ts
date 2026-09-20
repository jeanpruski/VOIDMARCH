import { test, expect } from '@playwright/test';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, worldView } from '../apps/server/src/engine';
import { prepareDevelopment } from './fixtures/development';

test('compteurs de trophées dans Royaume, conquêtes et expéditions', async ({ page }, testInfo) => {
  const now = Date.now(),
    s = createState('adventures-test', now),
    r = addPlayer(s, 'a', 'Chroniqueur', 'ASH', now);
  r.settings.tutorialCompleted = true;
  prepareDevelopment(s, 'a', 5, now);
  addBuilding(s, r, { q: 1, r: 0 }, 'BARRACKS', now, 5);
  const trophies = s.missions!.a.trophies!;
  s.missions!.a.trophies = [];
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('trophySnapshot', () => worldView(s, 'a', now));
  await page.exposeFunction('awardFixtureTrophies', (count: number) => {
    s.missions!.a.trophies = trophies.slice(0, count);
    s.revision++;
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const push=()=>window.trophySnapshot().then(w=>h['world:snapshot']?.(w));window.trophyPush=push;const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(){push();return s},disconnect(){}};return s;}`,
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
  await page.getByRole('button', { name: 'Royaume', exact: true }).click();
  const kingdom = page.getByRole('region', { name: 'Progression du royaume' });
  await expect(kingdom).toContainText('(1/5)');
  await expect(kingdom.locator('.development-trophies .negative')).toContainText('Trophées : 0/1');
  await page.screenshot({ path: testInfo.outputPath('royaume-trophees.png') });
  for (const [count, level, needed] of [
    [1, 2, 5],
    [5, 3, 20],
    [20, 4, 50],
  ]) {
    await page.evaluate(async (count) => {
      await (window as any).awardFixtureTrophies(count);
      await (window as any).trophyPush();
    }, count);
    await expect(kingdom).toContainText(`(${level}/5)`);
    await expect(kingdom).toContainText(`Trophées : ${count}/${needed}`);
  }
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Fermer/ })
    .click();
  await page.getByRole('button', { name: 'Missions', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Progression des missions' })).toContainText(
    'Trophées : 20/50',
  );
  await page.getByRole('tab', { name: 'Expéditions & aventures' }).click();
  await expect(page.getByRole('region', { name: 'Progression des expéditions' })).toContainText(
    'Trophées : 20/50',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('expeditions-trophees-mobile.png') });
  await page.evaluate(async () => {
    await (window as any).awardFixtureTrophies(50);
    await (window as any).trophyPush();
  });
  await expect(page.getByRole('region', { name: 'Progression des expéditions' })).toContainText(
    '5/5',
  );
  await expect(
    page
      .getByRole('region', { name: 'Progression des expéditions' })
      .locator('.development-trophies'),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
