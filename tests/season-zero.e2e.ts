import { test, expect } from '@playwright/test';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
const title = 'Saison 0 — L’Aube Noire';

test('accueil : visuel et présentation de la saison accessibles sans compte, sur mobile', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 401, json: { error: 'Connexion requise' } }),
  );
  await page.goto('/');
  const season = page.getByRole('region', { name: title });
  await expect(season).toBeVisible();
  await expect(season.getByText('L’Aube Noire', { exact: true })).toBeVisible();
  const image = season.locator('img');
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1536);
  await page.screenshot({ path: info.outputPath('accueil-saison-mobile.png') });
  await page.getByRole('button', { name: 'Découvrir la Saison 0' }).click();
  const modal = page.getByRole('dialog', { name: title });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Cinq époques');
  await expect(modal).toContainText('50 trophées cumulés');
  await expect(modal).toContainText('×10 en extraction');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath('presentation-saison-mobile.png') });
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Découvrir la Saison 0' })).toBeFocused();
});

test('saison : accueil des anciens comptes, carte, réouverture dans le menu et rechargement', async ({
  page,
}, info) => {
  const now = Date.now();
  const state = createState('season-zero-browser', now);
  const realm = addPlayer(state, 'season-player', 'Aube', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  realm.settings.reducedMotion = true;
  const snapshot = () => worldView(state, realm.id, now);
  await page.exposeFunction('seasonSnapshot', snapshot);
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};window.seasonPush=()=>window.seasonSnapshot().then(w=>h['world:snapshot']?.(w));const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.seasonPush();return s},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: realm.id, username: realm.name, faction: 'ASH', guest: false },
      },
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let releaseTerrain!: () => void;
  const waitForTerrain = new Promise<void>((resolve) => {
    releaseTerrain = resolve;
  });
  await page.route('**/assets/terrain.png', async (route) => {
    await waitForTerrain;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const modal = page.getByRole('dialog', { name: title });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Les ressources reviennent au royaume');
  await page.screenshot({ path: info.outputPath('presentation-saison-desktop.png') });
  await modal.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page.locator('.map-loading')).toBeVisible();
  await expect(page.locator('.map-loading')).toContainText('L’Aube Noire');
  await expect(page.locator('.map-loading')).toContainText('Génération de la carte');
  await page.screenshot({ path: info.outputPath('chargement-saison.png') });
  releaseTerrain();
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  await page.evaluate(() => (window as any).seasonPush());
  await expect(modal).toHaveCount(0);
  await page.getByRole('button', { name: 'Saison 0 · L’Aube Noire', exact: true }).click();
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Consulter l’aide & les règles' }).click();
  const help = page.getByRole('dialog', { name: 'Bienvenue dans les Marches' });
  await expect(help).toBeVisible();
  await expect(help).toBeFocused();
  await expect(help).toContainText('500 d’or');
  await expect(help).toContainText('10 secondes');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('button', { name: 'Saison 0 · L’Aube Noire', exact: true }).click();
  await expect(modal).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await modal.getByRole('button', { name: 'C’est parti' }).click();
  await expect(modal).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(modal).toBeVisible();
  expect(errors).toEqual([]);
});
