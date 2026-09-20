import { test, expect } from '@playwright/test';
import type { MissionsView } from '@voidmarch/shared';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';

test('repère de mission et aventure, caméra, clic, mobile et disparition', async ({
  page,
}, testInfo) => {
  const now = Date.now(),
    state = createState('mission-radar-browser', now);
  const realm = addPlayer(state, 'a', 'Explorateur', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  const snapshot = worldView(state, 'a', now);
  let active: MissionsView['active'];
  let revision = snapshot.revision;
  const mission: NonNullable<MissionsView['active']> = {
    id: 'mission',
    title: 'Forteresse lointaine',
    difficulty: 'Assaut',
    level: 2,
    objective: 'COMMANDER',
    buildings: ['VILLAGE'],
    units: [],
    abandonmentCost: {},
    realmId: 'a',
    ownerId: 'mission-owner',
    objectiveId: 'commander',
    startedAt: now,
    q: realm.capital.q + 40,
    r: realm.capital.r,
    distance: 40,
    remainingUnits: 1,
    remainingBuildings: 1,
    objectiveHp: 100,
    objectivePosition: { q: realm.capital.q + 35, r: realm.capital.r },
  };
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('missionSnapshot', () => ({
    ...snapshot,
    revision: ++revision,
    serverNow: Date.now(),
    missions: { ...snapshot.missions, offers: [], allied: [], active },
  }));
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const push=()=>window.missionSnapshot().then(w=>h['world:snapshot']?.(w));setInterval(push,250);const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(){push();return s},disconnect(){}};return s;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id: 'a', username: realm.name, faction: 'ASH', guest: false },
  };
  await page.route('**/api/**', (route) => route.fulfill({ json: session }));
  await page.goto('/');
  await expect(page.getByRole('application', { name: /Carte hexagonale/ })).toBeVisible();
  await expect(page.getByText('Génération de la carte…')).toBeHidden({ timeout: 90000 });
  const focus = (position: { q: number; r: number }) =>
    page.evaluate(async (p) => {
      // @ts-expect-error Vite source module
      const { focusMap } = await import('/src/store.ts');
      focusMap(p);
    }, position);
  await focus(realm.capital);
  await expect(page.locator('.radar-mission')).toHaveCount(0);
  active = mission;
  const marker = page.locator('.radar-mission');
  await expect(page.locator('.radar-right .radar-mission')).toContainText('35 cases');
  await expect(marker).toContainText('Mission');
  await page.screenshot({ path: testInfo.outputPath('mission-direction.png') });
  await focus({ q: realm.capital.q + 10, r: realm.capital.r });
  await expect(marker).toContainText('25 cases');
  await marker.click();
  await expect(marker).toHaveCount(0);
  await focus(realm.capital);
  await expect(marker).toBeVisible();
  active = {
    ...mission,
    id: 'expedition',
    title: 'Fort maritime',
    q: realm.capital.q + 30,
    r: realm.capital.r - 60,
    expedition: {
      siteId: 'boyard',
      mode: 'EXTRACT',
      route: 'SEA',
      targetDistance: 60,
      phase: 'RETURN',
    },
    objectivePosition: realm.capital,
  };
  await expect(page.locator('.radar-top .radar-mission')).toContainText('60 cases');
  await expect(marker).toContainText('Expédition');
  await page.setViewportSize({ width: 390, height: 844 });
  await focus(realm.capital);
  await expect(marker).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('expedition-direction-mobile.png') });
  await marker.click();
  await expect(marker).toHaveCount(0);
  await focus(realm.capital);
  await expect(marker).toBeVisible();
  active = undefined;
  await expect(marker).toHaveCount(0);
  expect(errors).toEqual([]);
});
