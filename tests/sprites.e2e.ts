import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('les 72 figurines restent isolées et alignées sur ordinateur et mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const template = await (await page.request.get('/')).text();
  const html = template.replace('/src/main.tsx', `/@fs/${resolve('tests/fixtures/sprites.tsx')}`);
  await page.route('**/sprite-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: html,
    }),
  );
  await page.goto('/sprite-review');
  await expect(page.locator('.miniature')).toHaveCount(72);
  await expect
    .poll(() =>
      page
        .locator('.miniature')
        .evaluateAll(
          (nodes) => nodes.filter((n) => getComputedStyle(n).backgroundImage !== 'none').length,
        ),
    )
    .toBe(72);
  const bounds = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this source module directly in the browser.
    const { miniatureAtlasUrl } = await import('/src/sprite-atlas.ts');
    const results: { name: string; count: number; edge: number }[] = [];
    for (const name of ['miniatures', 'expansion', 'industrial']) {
      const image = new Image();
      image.src = await miniatureAtlasUrl(name);
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      for (let frame = 0; frame < 24; frame++) {
        const p = ctx.getImageData((frame % 6) * 256, Math.floor(frame / 6) * 256, 256, 256).data;
        let count = 0,
          edge = 0;
        for (let y = 0; y < 256; y++)
          for (let x = 0; x < 256; x++)
            if (p[(y * 256 + x) * 4 + 3] > 0) {
              count++;
              if (x < 18 || x >= 238 || y < 18 || y >= 238) edge++;
            }
        results.push({ name: `${name}:${frame}`, count, edge });
      }
    }
    return results;
  });
  for (const frame of bounds) {
    expect(frame.count, frame.name).toBeGreaterThan(500);
    expect(frame.edge, frame.name).toBe(0);
  }
  await page.screenshot({ path: 'test-results/sprites-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const mini = page.locator('.miniature').nth(11);
  await expect(mini).toHaveCSS('background-size', '600% 400%');
  await expect(mini).toHaveCSS('background-position', '100% 33.3333%');
  await page.screenshot({ path: 'test-results/sprites-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
