import { test, expect } from './fixtures/game-test';
import { createState, disk, writeTile } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, worldView } from '../apps/server/src/engine';

test('thème paillettes : code local, champs protégés, contraste, mobile et retour normal', async ({
  page,
}, testInfo) => {
  const now = Date.now(),
    state = createState('sparkle-browser', now);
  const realm = addPlayer(state, 'a', 'Royaume des étoiles', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  realm.settings.bannerColor = '#945cff';
  realm.settings.bannerSecondary = '#efbcdf';
  realm.wallet = { GOLD: 160, WOOD: 95, STONE: 40, IRON: 20, FOOD: 70 };
  for (const p of disk(realm.capital, 12))
    writeTile(state, p, { terrain: p.q > 4 ? 'FOREST' : p.r > 3 ? 'HILL' : 'PLAIN' });
  addBuilding(state, realm, { q: 1, r: 0 }, 'LUMBER', now);
  const before = structuredClone(realm.settings);
  const snapshot = () => {
    const w = worldView(state, 'a', now);
    w.tiles = Object.values(state.tiles).map((t) => ({
      ...t,
      visibility: 'VISIBLE' as const,
      building: state.buildings[t.buildingId ?? ''],
    }));
    return w;
  };
  const errors: string[] = [],
    adminCalls: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (req) => {
    if (req.url().includes('/admin/')) adminCalls.push(req.url());
  });
  await page.exposeFunction('sparkleSnapshot', snapshot);
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const push=()=>window.sparkleSnapshot().then(w=>h['world:snapshot']?.(w));const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(){push();return s},disconnect(){}};return s;}`,
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
  const root = page.locator('html');
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  const normal = await page
    .locator('.topbar')
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  await page.keyboard.type('rfv');
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-theme', 'sparkle');
  await expect(page.getByRole('button', { name: 'Revenir au thème normal' })).toBeVisible();
  await expect(page.locator('.game-canvas canvas')).toHaveCSS(
    'filter',
    'brightness(1.22) saturate(0.94)',
  );
  await page.screenshot({ path: testInfo.outputPath('sparkle-theme-board.png') });
  await page.getByRole('button', { name: 'Royaume', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.modal h2')).toHaveCSS('color', 'rgb(64, 38, 67)');
  await page.screenshot({ path: testInfo.outputPath('sparkle-realm.png') });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Fermer/ })
    .click();
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module
    const { useGame } = await import('/src/store.ts');
    useGame.setState({ panel: 'build', selection: { kind: 'tile', q: 2, r: 0 } });
  });
  const search = page.getByRole('searchbox');
  await search.pressSequentially('rfv');
  await expect(search).toHaveValue('rfv');
  await expect(root).toHaveAttribute('data-theme', 'sparkle');
  await search.fill('');
  await expect(page.locator('.catalog-search-box')).toHaveCSS(
    'background-color',
    'rgb(255, 243, 249)',
  );
  await expect(page.locator('.recruitment-missing').first()).toHaveCSS('color', 'rgb(172, 36, 72)');
  await page.screenshot({ path: testInfo.outputPath('sparkle-theme-construction.png') });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Fermer/ })
    .click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.sparkle-confetti span').first()).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => document.body.classList.add('reduced-motion'));
  await expect(page.locator('.sparkle-confetti span').first()).toHaveCSS('animation-name', 'none');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('sparkle-theme-mobile.png') });
  await page.getByRole('button', { name: 'Revenir au thème normal' }).click();
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  await expect(page.locator('.topbar')).toHaveCSS('background-image', normal);
  await page.keyboard.type('RFV');
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-theme', 'sparkle');
  await page.keyboard.type('rfv');
  await page.keyboard.press('Enter');
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  await page.keyboard.type('rfv');
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-theme', 'sparkle');
  await page.reload();
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  await expect(page.locator('.sparkle-switch')).toHaveCount(0);
  expect(realm.settings).toEqual(before);
  expect(adminCalls).toEqual([]);
  expect(errors).toEqual([]);
});
