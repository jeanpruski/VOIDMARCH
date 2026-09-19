import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { createMissionTrophy } from '../apps/server/src/mission-trophies';
import type { ActiveMission } from '@voidmarch/shared';

test('les nouvelles décorations et les anciennes médailles restent lisibles', async ({ page }) => {
  const mission: ActiveMission = {
    id: 'preview',
    title: 'La campagne des Marches',
    difficulty: 'Siège',
    level: 4,
    objective: 'BUILDING',
    units: [],
    buildings: [],
    abandonmentCost: {},
    realmId: 'a',
    ownerId: 'mission:a',
    objectiveId: 'keep',
    q: 0,
    r: 0,
    distance: 40,
    startedAt: 1,
  };
  const medals = Array.from({ length: 30 }, (_, i) => {
    const m = {
      ...mission,
      id: `preview-${i}`,
      ...(i % 3
        ? {
            expedition: {
              siteId: i % 3 === 1 ? 'houska' : 'baychimo',
              route: i % 3 === 1 ? ('LAND' as const) : ('SEA' as const),
              mode: 'RECON' as const,
              phase: 'VISIT' as const,
              targetDistance: 100,
            },
          }
        : {}),
    };
    return createMissionTrophy(m, 2, { units: 0, buildings: 0, walls: 0 }, {}).medal;
  });
  medals.push({
    name: 'Ancien insigne conservé',
    shape: 'shield',
    ribbon: 'pine',
    emblem: medals[0].emblem,
    metal: 'silver',
  });
  await page.setViewportSize({ width: 1440, height: 1330 });
  await page.exposeFunction('medalSetup', () => medals);
  await page.route('**/medal-browser', async (route) => {
    const response = await route.fetch({ url: 'http://127.0.0.1:5173/' });
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        '/src/main.tsx',
        `/@fs/${resolve('tests/fixtures/medals-browser.tsx')}`,
      ),
    });
  });
  await page.goto('/medal-browser');
  await expect(page.locator('svg.mission-medal')).toHaveCount(31);
  expect(await page.locator('body').innerHTML()).not.toMatch(/NaN|undefined/);
  const sizes = await page.locator('svg.mission-medal').evaluateAll((nodes) =>
    nodes.map((el) => {
      const box = (el as SVGGraphicsElement).getBBox();
      return { x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height };
    }),
  );
  for (const box of sizes) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(160);
    expect(box.bottom).toBeLessThanOrEqual(180);
  }
  await page.screenshot({ path: 'output/mission-medals-variety.png', fullPage: true });
});
