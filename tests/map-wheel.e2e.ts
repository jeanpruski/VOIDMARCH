import { test, expect } from '@playwright/test';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';

test('molette sur la carte après chargement et repli des panneaux', async ({ page }) => {
  const now = Date.now(),
    state = createState('wheel-browser', now);
  const realm = addPlayer(state, 'a', 'Molette', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('wheelSnapshot', () => worldView(state, 'a', Date.now()));
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','chunks:subscribe','player:ping'].includes(e))window.wheelSnapshot().then(w=>h['world:snapshot']?.(w));return s},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'a', username: realm.name, guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.__wheelScene = this;',
      ),
    });
  });
  // The map must work without enabling eval, including its image preparation.
  await page.route('http://127.0.0.1:5173/', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy': "script-src 'self' 'unsafe-inline'; object-src 'none'",
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  const zoom = () => page.evaluate(() => (window as any).__wheelScene.cameras.main.zoom);
  const canvas = page.locator('.board canvas');
  const wheel = async (dy: number) => {
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4);
    await page.mouse.wheel(0, dy);
  };
  const initial = await zoom();
  await wheel(-200);
  await expect.poll(zoom).toBeGreaterThan(initial);
  const close = await zoom();
  await wheel(200);
  await expect.poll(zoom).toBeLessThan(close);
  await page.getByRole('button', { name: 'Afficher le tutoriel de démarrage' }).click();
  await page.getByRole('button', { name: 'Replier le panneau du royaume' }).click();
  const resized = await zoom();
  await wheel(-200);
  await expect.poll(zoom).toBeGreaterThan(resized);
  // Some mice/browsers report lines rather than pixels; a notch must remain perceptible.
  const beforeLines = await zoom();
  await canvas.dispatchEvent('wheel', {
    deltaY: -3,
    deltaMode: 1,
    bubbles: true,
    cancelable: true,
  });
  await expect.poll(zoom).toBeGreaterThan(beforeLines * 1.03);
  const beforePage = await zoom();
  await canvas.dispatchEvent('wheel', { deltaY: 1, deltaMode: 2, bubbles: true, cancelable: true });
  await expect.poll(zoom).toBeLessThan(beforePage * 0.9);
  // Small trackpad/pinch deltas in one frame must all count, with no browser zoom.
  const beforeTrackpad = await zoom();
  const prevented = await canvas.evaluate((el) =>
    Array.from({ length: 6 }, () => {
      const event = new WheelEvent('wheel', {
        deltaY: -2,
        deltaMode: 0,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  );
  expect(prevented.every(Boolean)).toBe(true);
  await expect.poll(zoom).toBeCloseTo(beforeTrackpad * Math.exp(0.012), 5);
  // Scrolling over interface panels must not zoom the map underneath.
  const beforePanel = await zoom();
  await page.locator('.beginner-tutorial').hover();
  await page.mouse.wheel(0, 200);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await zoom()).toBe(beforePanel);
  expect(errors).toEqual([]);
});
