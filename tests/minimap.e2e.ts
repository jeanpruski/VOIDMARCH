import { test, expect } from './fixtures/game-test';
import { resolve } from 'node:path';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';

test('la mini-carte suit la caméra, le zoom et le mobile, et navigue par clic et glissement', async ({
  page,
}) => {
  const state = createState('mini-browser', Date.now());
  addPlayer(state, 'mini-browser', 'Mini navigateur', 'ASH', Date.now());
  const world = worldView(state, 'mini-browser', Date.now());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  const template = await (await page.request.get('/')).text();
  const html = template
    .replace(
      '<div id="root"></div>',
      `<div id="root"></div><script id="fixture-world" type="application/json">${JSON.stringify(world)}</script>`,
    )
    .replace('/src/main.tsx', `/@fs/${resolve('tests/fixtures/minimap.ts')}`);
  await page.route('**/minimap-fixture', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
  await page.goto('/minimap-fixture');
  const rect = page.locator('rect[aria-label="Zone affichée"]');
  await expect(rect).toBeAttached();
  const bounds = () =>
    rect.evaluate((e) => {
      const r = e as SVGRectElement;
      return {
        x: r.x.baseVal.value,
        y: r.y.baseVal.value,
        width: r.width.baseVal.value,
        height: r.height.baseVal.value,
      };
    });
  const initial = await bounds();
  await page.keyboard.down('ArrowRight');
  try {
    await expect.poll(async () => (await bounds()).x).toBeGreaterThan(initial.x + 3);
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await page.mouse.move(600, 200);
  await page.mouse.wheel(0, -300);
  await expect.poll(async () => (await bounds()).width).toBeLessThan(initial.width - 5);
  const zoomed = await bounds();
  const minimap = page.getByRole('img', { name: 'Minicarte du royaume' });
  const screenPoint = (x: number, y: number) =>
    minimap.evaluate(
      (svg, p) => {
        const q = new DOMPoint(p.x, p.y).matrixTransform((svg as SVGSVGElement).getScreenCTM()!);
        return { x: q.x, y: q.y };
      },
      { x, y },
    );
  const blank = await screenPoint(150, 25);
  await page.mouse.click(blank.x, blank.y);
  await expect
    .poll(async () => {
      const r = await bounds();
      return Math.abs(r.x + r.width / 2 - 150);
    })
    .toBeLessThan(5);
  const target = await screenPoint(65, 70);
  await page.mouse.move(blank.x, blank.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const r = await bounds();
      return Math.abs(r.x + r.width / 2 - 65);
    })
    .toBeLessThan(5);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await bounds()).width).toBeCloseTo((zoomed.width * 390) / 1440, 0);
  await page.screenshot({ path: 'test-results/minimap-mobile.png' });
  const camera = () =>
    page.evaluate(async () => {
      // @ts-expect-error Vite source module.
      const { useGame } = await import('/src/store.ts');
      return useGame.getState().cameraViewport;
    });
  const centerBefore = await camera();
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module.
    const { mapCommand } = await import('/src/store.ts');
    for (let i = 0; i < 25; i++) mapCommand('out');
  });
  await expect.poll(async () => (await camera()).width).toBeCloseTo(390 / 0.2, 1);
  const far = await camera();
  expect(far.x + far.width / 2).toBeCloseTo(centerBefore.x + centerBefore.width / 2, 1);
  await page.mouse.move(160, 250);
  await page.mouse.wheel(0, -10000);
  await expect.poll(async () => (await camera()).width).toBeCloseTo(390 / 3.2, 1);
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module.
    const { mapCommand } = await import('/src/store.ts');
    mapCommand('in');
  });
  await expect.poll(async () => (await camera()).width).toBeCloseTo(390 / 3.2, 1);
  await page.mouse.wheel(0, 10000);
  await expect.poll(async () => (await camera()).width).toBeCloseTo(390 / 0.2, 1);
  expect(errors).toEqual([]);
});
