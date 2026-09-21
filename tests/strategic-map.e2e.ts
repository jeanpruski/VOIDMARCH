import { test, expect } from './fixtures/game-test';
import { resolve } from 'node:path';
import { createState, createRealm, disk, key } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, worldView } from '../apps/server/src/engine';
import type { ViewTile } from '@voidmarch/shared';

test('vue stratégique : territoires, rendu léger, zoom et navigation', async ({ page }) => {
  const now = Date.now();
  const state = createState('strategic-browser', now);
  const realm = addPlayer(state, 'a', 'Les Veilleurs', 'ASH', now);
  realm.settings.grid = true;
  realm.settings.bannerColor = '#5c9f89';
  state.realms.b = createRealm('b', 'La Citadelle rouge', 'IRON', { q: 12, r: 0 }, now);
  state.realms.b.settings.bannerColor = '#b65e53';
  state.realms.c = createRealm('c', 'Les Astres pâles', 'MASK', { q: -9, r: 7 }, now);
  state.realms.c.settings.bannerColor = '#d0b15a';
  state.realms.secret = createRealm('secret', 'Royaume inconnu', 'IRON', { q: 80, r: 80 }, now);
  // Smoke at negative world coordinates used to throw Canvas IndexSizeError
  // on the first frame, leaving the loading overlay stuck indefinitely.
  addBuilding(state, realm, { q: -8, r: 0 }, 'FORGE', now);
  const damaged = addBuilding(state, realm, { q: -7, r: -1 }, 'HOUSE', now);
  damaged.hp = 1;
  const world = worldView(state, 'a', now);
  const owners = new Map<string, string>();
  for (const [id, radius] of [
    ['a', 6],
    ['b', 5],
    ['c', 4],
  ] as const)
    for (const p of disk(state.realms[id].capital, radius)) owners.set(key(p), id);
  const original = new Map(world.tiles.map((t) => [key(t), t]));
  world.tiles = disk(realm.capital, 28).map((p, i): ViewTile => ({
    ...p,
    terrain: i % 3 === 0 ? 'FOREST' : i % 5 === 0 ? 'MOUNTAIN' : 'PLAIN',
    visibility: 'VISIBLE',
    ownerId: owners.get(key(p)),
    building: original.get(key(p))?.building,
  }));
  world.overview = world.tiles;
  const soldier = {
    id: 'visible-enemy',
    ownerId: 'b',
    kind: 'INFANTRY' as const,
    q: 3,
    r: 0,
    hp: 30,
    createdAt: now,
    updatedAt: now,
  };
  world.units.push(
    soldier,
    { ...soldier, id: 'hidden-enemy', q: 4 },
    { ...soldier, id: 'passenger', q: 5, carrierId: 'transport' },
    { ...soldier, id: 'fallen', q: 6, hp: 0 },
  );
  world.tiles.find((t) => t.q === 4 && t.r === 0)!.visibility = 'EXPLORED';
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /\bcreate\(\)\s*\{/,
      'create() { window.__strategyScene = this; window.__strategyStore = useGame;',
    );
    await route.fulfill({ response, body });
  });
  const template = await (await page.request.get('/')).text();
  const html = template
    .replace(
      '<div id="root"></div>',
      `<div id="root"></div><script id="fixture-world" type="application/json">${JSON.stringify(world)}</script>`,
    )
    .replace('/src/main.tsx', `/@fs/${resolve('tests/fixtures/minimap.ts')}`);
  await page.route('**/strategic-fixture', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
  let releaseTerrain!: () => void;
  const terrainReady = new Promise<void>((resolve) => {
    releaseTerrain = resolve;
  });
  await page.route('**/assets/terrain.png', async (route) => {
    await terrainReady;
    await route.continue();
  });
  await page.goto('/strategic-fixture', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('status')).toContainText('Génération de la carte…');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'true');
  releaseTerrain();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false');
  const canvas = page.locator('.board canvas');
  await expect(canvas).toHaveAttribute('data-map-view', 'detailed');
  const objects = () =>
    page.evaluate(() => {
      const s = (window as any).__strategyScene;
      return {
        total: s.children.list.length,
        images: s.children.list.filter((o: any) => o.type === 'Image').length,
        labels: s.children.list
          .filter((o: any) => o.name?.startsWith('strategic-label:'))
          .map((o: any) => o.text),
        grid: s.children.getByName('hex-grid').visible,
        zoom: s.cameras.main.zoom,
        settled: s.ground.alpha === 1,
        units: s.children.getByName('strategic-units')?.getData('unitIds') ?? [],
      };
    });
  const detailed = await objects();
  expect(detailed.images).toBeGreaterThan(10);
  const zoom = async (value: number) =>
    page.evaluate((value) => {
      const s = (window as any).__strategyScene;
      s.cameras.main.setZoom(value);
      s.renderMap();
    }, value);
  await zoom(0.27);
  await expect(canvas).toHaveAttribute('data-map-view', 'detailed');
  await zoom(0.2);
  await expect(canvas).toHaveAttribute('data-map-view', 'strategic');
  const simple = await objects();
  expect(simple.images).toBe(0);
  expect(simple.total).toBeLessThan(detailed.total / 4);
  expect(simple.labels).toContain('Les Veilleurs');
  expect(simple.labels).toContain('La Citadelle rouge');
  expect(simple.labels).not.toContain('Royaume inconnu');
  expect(simple.grid).toBe(false);
  expect(simple.units).toContain('visible-enemy');
  expect(simple.units).not.toContain('hidden-enemy');
  expect(simple.units).not.toContain('passenger');
  expect(simple.units).not.toContain('fallen');
  await page.evaluate(() => (window as any).__strategyStore.setState({ showUnits: false }));
  await expect.poll(async () => (await objects()).units.length).toBe(0);
  await page.evaluate(() => (window as any).__strategyStore.setState({ showUnits: true }));
  await expect.poll(async () => (await objects()).units).toContain('visible-enemy');
  await expect.poll(async () => (await objects()).settled).toBe(true);
  await page.screenshot({ path: 'test-results/strategic-map-desktop.png' });
  await page.evaluate(() => {
    const s = (window as any).__strategyScene;
    s.playEffect({ kind: 'build', q: 0, r: 0 });
  });
  expect((await objects()).total).toBe(simple.total);
  await zoom(0.27);
  await expect(canvas).toHaveAttribute('data-map-view', 'strategic');
  await zoom(0.3);
  await expect(canvas).toHaveAttribute('data-map-view', 'detailed');
  expect((await objects()).images).toBeGreaterThan(10);
  expect((await objects()).grid).toBe(true);
  await zoom(0.2);
  await page.mouse.click(720, 480);
  await expect(canvas).toHaveAttribute('data-map-view', 'detailed');
  expect((await objects()).zoom).toBe(0.6);
  await page.setViewportSize({ width: 390, height: 844 });
  await zoom(0.2);
  await expect(canvas).toHaveAttribute('data-map-view', 'strategic');
  expect((await objects()).images).toBe(0);
  await expect.poll(async () => (await objects()).settled).toBe(true);
  const hint = () =>
    page.evaluate(() => {
      const s = (window as any).__strategyScene,
        c = s.cameras.main;
      const hint = s.children.getByName('strategic-hint');
      const point = c.matrix.transformPoint(hint.x - c.scrollX, hint.y - c.scrollY);
      return { x: point.x, y: point.y, width: hint.width * hint.scaleX * c.zoom };
    });
  await expect.poll(async () => (await hint()).x).toBeCloseTo(24, 0);
  await expect.poll(async () => (await hint()).y).toBeCloseTo(76, 0);
  expect((await hint()).width).toBeLessThan(300);
  await page.screenshot({ path: 'test-results/strategic-map-mobile.png' });
  expect(errors).toEqual([]);
});
