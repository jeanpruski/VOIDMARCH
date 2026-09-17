import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test('les trois matériaux couvrent les 64 raccords sans dépasser de leur image', async ({
  page,
}) => {
  const template = await (await page.request.get('/')).text();
  await page.route('**/wall-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace('/src/main.tsx', `/@fs/${resolve('tests/fixtures/walls.tsx')}`),
    }),
  );
  await page.goto('/wall-review');
  await expect(page.getByRole('img')).toHaveCount(57);
  await page.screenshot({ path: 'test-results/walls-orientations.png', fullPage: true });
  const results = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this source module directly in the browser.
    const { wallCanvas } = await import('/src/wall-art.ts');
    const results: { id: string; pixels: number; edge: number }[] = [];
    for (const kind of ['WOOD_WALL', 'STONE_WALL', 'STEEL_WALL'])
      for (let mask = 0; mask < 64; mask++) {
        const canvas = wallCanvas(kind, mask);
        const data = canvas.getContext('2d')!.getImageData(0, 0, 256, 256).data;
        let pixels = 0,
          edge = 0;
        for (let y = 0; y < 256; y++)
          for (let x = 0; x < 256; x++)
            if (data[(y * 256 + x) * 4 + 3]) {
              pixels++;
              if (x < 4 || y < 4 || x >= 252 || y >= 252) edge++;
            }
        results.push({ id: `${kind}:${mask}`, pixels, edge });
      }
    return results;
  });
  for (const result of results) {
    expect(result.pixels, result.id).toBeGreaterThan(500);
    expect(result.edge, result.id).toBe(0);
  }
  await page.screenshot({ path: 'test-results/walls-orientations.png', fullPage: true });
});
