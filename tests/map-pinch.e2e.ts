import { test, expect } from '@playwright/test';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1024, height: 1366 },
]) {
  test.describe(`pincement tactile ${viewport.width}px`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });
    test('zoome, dézoome, déplace le centre et ne déclenche pas de clic parasite', async ({
      page,
      context,
    }) => {
      test.setTimeout(180000);
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
            'create() { window.__wheelScene = this; window.__touchStore = useGame;',
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

      const collapse = page.getByRole('button', { name: 'Replier le panneau du royaume' });
      if (await collapse.isVisible()) await collapse.click();
      const canvas = page.locator('.board canvas');
      await page.evaluate(() => {
        const scene = (window as any).__wheelScene;
        (window as any).__touchClicks = 0;
        const click = scene.click.bind(scene);
        scene.click = (...args: any[]) => {
          (window as any).__touchClicks++;
          return click(...args);
        };
      });
      const box = (await canvas.boundingBox())!;
      const x = Math.round(box.x + box.width / 2),
        y = Math.round(box.y + box.height * 0.5);
      const session = await context.newCDPSession(page);
      const touch = async (
        type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
        points: { id: number; x: number; y: number }[],
      ) => {
        await session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      };
      const zoom = () => page.evaluate(() => (window as any).__wheelScene.cameras.main.zoom);
      const scroll = () =>
        page.evaluate(() => {
          const c = (window as any).__wheelScene.cameras.main;
          return { x: c.scrollX, y: c.scrollY };
        });
      const initial = await zoom();
      await touch('touchStart', [{ id: 0, x: x - 40, y }]);
      await touch('touchStart', [
        { id: 0, x: x - 40, y },
        { id: 1, x: x + 40, y },
      ]);
      await touch('touchMove', [
        { id: 0, x: x - 70, y },
        { id: 1, x: x + 70, y },
      ]);
      await expect.poll(zoom).toBeCloseTo(initial * 1.75, 3);
      const beforePan = await scroll();
      await touch('touchMove', [
        { id: 0, x: x - 60, y: y + 10 },
        { id: 1, x: x + 80, y: y + 10 },
      ]);
      await expect.poll(async () => (await scroll()).x).toBeLessThan(beforePan.x);
      await touch('touchMove', [
        { id: 0, x: x - 30, y: y + 10 },
        { id: 1, x: x + 50, y: y + 10 },
      ]);
      await expect.poll(zoom).toBeCloseTo(initial, 3);
      await touch('touchEnd', [{ id: 0, x: x - 30, y: y + 10 }]);
      const afterPinch = await scroll();
      await touch('touchMove', [{ id: 0, x, y: y + 30 }]);
      expect(await scroll()).toEqual(afterPinch);
      await touch('touchEnd', []);
      expect(await page.evaluate(() => (window as any).__touchClicks)).toBe(0);
      expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
      await touch('touchStart', [
        { id: 0, x: x - 40, y },
        { id: 1, x: x + 40, y },
      ]);
      await touch('touchCancel', []);
      await page.touchscreen.tap(x, y);
      await expect.poll(() => page.evaluate(() => (window as any).__touchClicks)).toBe(1);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `test-results/map-pinch-${viewport.width}.png` });
    });
  });
}
