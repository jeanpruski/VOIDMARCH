import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { createState, disk, writeTile } from '@voidmarch/game-rules';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import type { BuildingKind } from '@voidmarch/config';

test('catalogues : pagination, filtres, détails, ressources fixes et achats sur ordinateur/mobile', async ({
  page,
}) => {
  page.setDefaultTimeout(15000);
  const now = Date.now();
  let state = createState('catalog-browser', now);
  const realm = addPlayer(state, 'a', 'Catalogue', 'MASK', now);
  realm.wallet = { GOLD: 1000000, WOOD: 1000000, STONE: 1000000, IRON: 1000000, FOOD: 1000000 };
  Object.values(state.buildings)[0].population = 500;
  const site = { q: 3, r: 0 };
  for (const p of disk(realm.capital, 5)) writeTile(state, p, { terrain: 'PLAIN' });
  writeTile(state, site, { terrain: 'FOREST', ownerId: 'a' });
  const arsenal = addBuilding(state, realm, { q: 1, r: 0 }, 'ARSENAL', now);
  arsenal.level = 3;
  const kinds: BuildingKind[] = [
    'FORGE',
    'MUNITIONS',
    'REFINERY',
    'RADIO',
    'OCCULT_LAB',
    'BLACK_OBSERVATORY',
    'TESLA_COIL',
    'WORKSHOP',
    'LIBRARY',
  ];
  kinds.forEach((kind, i) => addBuilding(state, realm, { q: i - 4, r: 2 }, kind, now));
  const observatory = Object.values(state.buildings).find((b) => b.kind === 'BLACK_OBSERVATORY')!;
  observatory.level = 2;
  const view = () =>
    worldView(state, 'a', Date.now(), [
      { q: 0, r: 0 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: -1, r: -1 },
    ]);
  const selection = { kind: 'building', id: arsenal.id, q: arsenal.q, r: arsenal.r };
  await page.exposeFunction('catalogSetup', () => ({
    session: {
      token: 'catalog-test',
      user: { id: 'a', username: 'Catalogue', faction: 'MASK', guest: true },
    },
    world: view(),
    selection,
  }));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, 'a', actionSchema.parse(raw), Date.now());
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  const template = await (await page.request.get('/')).text();
  await page.route('**/catalog-browser', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace(
        '/src/main.tsx',
        `/@fs/${resolve('tests/fixtures/catalog-browser.tsx')}`,
      ),
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/catalog-browser');
  const cards = page.locator('.catalog article');
  await expect(cards).toHaveCount(18);
  await page.getByRole('button', { name: 'Page suivante' }).click();
  await expect(page.getByRole('navigation', { name: 'Pages du catalogue' })).toContainText(
    'Page 2',
  );
  await page.getByLabel('Niveau requis', { exact: true }).selectOption('3');
  await expect(page.getByRole('navigation', { name: 'Pages du catalogue' })).toHaveCount(0);
  await page.getByLabel('Univers', { exact: true }).selectOption('blood');
  await expect(cards).toHaveCount(3);
  await page.getByRole('searchbox').fill('VEINES');
  await expect(cards).toHaveCount(1);
  await page.getByLabel('Disponibles maintenant', { exact: false }).check();
  await expect(cards.first()).toContainText('Prêt à recruter');
  await cards.first().getByText('Détails et prérequis', { exact: true }).click();
  await expect(cards.first().getByText(/Entraînement de votre royaume/)).toBeVisible();
  await expect(cards.first().locator('.miniature')).not.toHaveCSS('background-image', 'none');
  await page.screenshot({
    animations: 'disabled',
    path: 'test-results/catalog-recruitment-details.png',
  });
  await cards.first().getByRole('button', { name: 'Recruter · 1 PA', exact: true }).click();
  await expect
    .poll(() => Object.values(state.units).filter((u) => u.kind === 'SANG_RIFLE').length)
    .toBe(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(
    (site) =>
      (window as any).catalogStore.setState({
        selection: { kind: 'tile', ...site },
        panel: 'build',
      }),
    site,
  );
  await expect(cards).toHaveCount(18);
  const stock = page.locator('.catalog-resources');
  await page
    .locator('.modal')
    .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const y = (await stock.boundingBox())!.y;
  await page.locator('.modal-body').evaluate((e) => (e.scrollTop = 400));
  await expect.poll(async () => (await stock.boundingBox())!.y).toBe(y);
  await page.getByRole('button', { name: 'Page suivante' }).click();
  await page.getByRole('searchbox').fill('scierie');
  await expect(cards).toHaveCount(3);
  await page.getByLabel('Terrain compatible', { exact: true }).check();
  await expect(cards).toHaveCount(3);
  await page.getByLabel('Production', { exact: true }).selectOption('IRON');
  await expect(cards).toHaveCount(0);
  await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click();
  await expect(cards).toHaveCount(18);
  await page.getByRole('searchbox').fill('forge');
  const forge = cards.filter({ has: page.getByRole('heading', { name: 'Forge', exact: true }) });
  await page.getByLabel('Masquer les bâtiments déjà construits', { exact: true }).check();
  await expect(forge).toHaveCount(0);
  await page.getByLabel('Masquer les bâtiments déjà construits', { exact: true }).uncheck();
  await expect(forge).toHaveCount(1);
  await page.getByRole('button', { name: 'Réinitialiser les filtres' }).click();
  await page.getByLabel('Production', { exact: true }).selectOption('WOOD');
  await expect(cards).toHaveCount(3);
  await expect(page.locator('.catalog-results-bar strong')).toHaveText('1');
  await expect
    .poll(() =>
      cards
        .locator('.miniature')
        .evaluateAll(
          (nodes) => nodes.filter((n) => getComputedStyle(n).backgroundImage !== 'none').length,
        ),
    )
    .toBe(3);
  await page.screenshot({ animations: 'disabled', path: 'test-results/catalog-build-desktop.png' });
  const sawmill = cards.filter({
    has: page.getByRole('heading', { name: 'Scierie', exact: true }),
  });
  await sawmill.getByRole('button', { name: 'Construire · 1 PA', exact: true }).click();
  await expect
    .poll(() =>
      Object.values(state.buildings).some(
        (b) => b.kind === 'LUMBER' && b.q === site.q && b.r === site.r,
      ),
    )
    .toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(
    (selection) => (window as any).catalogStore.setState({ selection, panel: 'recruit' }),
    selection,
  );
  await expect(cards).toHaveCount(18);
  await page.screenshot({
    animations: 'disabled',
    path: 'test-results/catalog-recruitment-desktop.png',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('searchbox').fill('electromagnetique');
  await expect(cards).not.toHaveCount(0);
  await expect(page.locator('.catalog-results-bar strong')).toHaveText('0');
  await expect
    .poll(() => page.locator('.modal-body').evaluate((e) => e.scrollWidth <= e.clientWidth + 1))
    .toBe(true);
  await expect(page.getByLabel('Univers', { exact: true })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: 'test-results/catalog-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.evaluate(
    (selection) => (window as any).catalogStore.setState({ selection, panel: 'recruit' }),
    { kind: 'building', id: observatory.id, q: observatory.q, r: observatory.r },
  );
  await page.getByLabel('Niveau requis', { exact: true }).selectOption('3');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Observatoire noir niveau 3 nécessaire');
  await page.getByLabel('Niveau requis', { exact: true }).selectOption('2');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Commando');
  await expect(cards.first()).toContainText('Nouveauté de ce niveau');
  await expect(cards.first()).toContainText('Prêt à recruter');
  await cards.first().getByText('Détails et prérequis', { exact: true }).click();
  await expect(cards.first()).toContainText('Observatoire noir · niveau 2');
  await expect(cards.first()).toContainText('Caserne · niveau 4');
  await page.screenshot({
    animations: 'disabled',
    path: 'test-results/recruitment-local-level.png',
  });
  await cards.first().getByRole('button', { name: 'Recruter · 1 PA', exact: true }).click();
  await expect
    .poll(() => Object.values(state.units).filter((u) => u.kind === 'COMMANDO').length)
    .toBe(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});
