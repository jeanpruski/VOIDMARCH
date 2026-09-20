import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/game-test';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
import { beginCodeSession } from '../apps/server/src/code-session';
import { adminCodeMatches } from '../apps/server/src/admin-codes';

test('aqw affiche trois réserves infinies puis retrouve les stocks à la désactivation et au rechargement', async ({
  page,
}) => {
  const now = Date.now(),
    state = createState('unlimited-mobility-ui', now),
    r = addPlayer(state, 'a', 'Mobilité', 'ASH', now);
  r.settings.tutorialCompleted = true;
  r.fuel = 2;
  r.pervitin = 4;
  r.ap = 7;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('mobilitySnapshot', (newPage = false) => {
    if (newPage) beginCodeSession(r, randomUUID());
    return worldView(state, 'a', now);
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const push=(fresh=false)=>window.mobilitySnapshot(fresh).then(w=>h['world:snapshot']?.(w));window.pushMobility=push;const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){push(e==='world:join');return s},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', async (route) => {
    if (route.request().url().endsWith('/admin/unlimited-ap')) {
      expect(adminCodeMatches('ap', route.request().postDataJSON().code, {})).toBe(true);
      r.unlimitedAP = !r.unlimitedAP;
      await route.fulfill({ json: { enabled: r.unlimitedAP } });
      await page.evaluate(() => (window as any).pushMobility());
      return;
    }
    await route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'a', username: r.name, faction: 'ASH', guest: false },
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  const counters = page.getByLabel('Réserves de déplacement');
  await expect(counters).toContainText('2/10');
  await expect(counters).toContainText('4/10');
  await page.keyboard.type('aqw');
  await page.keyboard.press('Enter');
  await expect(counters).toContainText('∞ Carburant');
  await expect(counters).toContainText('∞ Pervitine');
  await expect(page.getByLabel('Points d’action illimités')).toHaveText('∞');
  await page.keyboard.type('aqw');
  await page.keyboard.press('Enter');
  await expect(counters).toContainText('2/10');
  await expect(counters).toContainText('4/10');
  await page.keyboard.type('aqw');
  await page.keyboard.press('Enter');
  await expect(counters).toContainText('∞ Carburant');
  await page.reload();
  await expect(counters).toContainText('2/10');
  await expect(counters).toContainText('4/10');
  expect(r).toMatchObject({ fuel: 2, pervitin: 4, ap: 7, unlimitedAP: false });
  expect(errors).toEqual([]);
});
