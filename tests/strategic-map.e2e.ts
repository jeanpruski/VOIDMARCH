import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { createState, createRealm, disk, key } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
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
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /\bcreate\(\)\s*\{/,
      'create() { window.__strategyScene = this;',
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
  await page.goto('/strategic-fixture');
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
