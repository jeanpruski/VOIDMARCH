import { beginCodeSession } from '../apps/server/src/code-session';
import { test, expect } from '@playwright/test';
import { createState, createRealm } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';

test('code radar, directions, distance caméra, zoom, mobile et désactivation', async ({ page }) => {
  const now = Date.now(),
    state = createState('radar-browser', now);
  const realm = addPlayer(state, 'a', 'Observateur', 'MASK', now);
  realm.unlimitedAP = realm.capitalRadar = true;
  for (const [id, q, r] of [
    ['east', 80, 0],
    ['west', -90, 0],
    ['north', 30, -60],
    ['south', -25, 50],
  ] as const)
    state.realms[id] = createRealm(id, id, 'ASH', { q, r }, now);
  for (let i = 0; i < 12; i++)
    state.realms[`bot${i}`] = createRealm(
      `bot${i}`,
      `Bastion ${i}`,
      'IRON',
      { q: 100 + i, r: i },
      now,
    );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const view = () => worldView(state, 'a', Date.now());
  await page.exposeFunction('radarSnapshot', view);
  await page.exposeFunction('radarJoin', (pageId: string) => {
    beginCodeSession(realm, pageId);
    return view();
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(options){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(e==='world:join')window.radarJoin(options.auth.codeSessionId).then(w=>h['world:snapshot']?.(w));else if(['chunks:subscribe','player:ping'].includes(e))window.radarSnapshot().then(w=>h['world:snapshot']?.(w));return s},disconnect(){}};window.reconnectRadar=()=>h['connect']();window.pushRadar=()=>window.radarSnapshot().then(w=>h['world:snapshot']?.(w));return s;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id: 'a', username: realm.name, guest: true },
  };
  let codeCalls = 0;
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.endsWith('/admin/capital-radar')) {
      codeCalls++;
      expect(route.request().postDataJSON().code).toBe('zsx');
      realm.capitalRadar = !realm.capitalRadar;
      state.revision++;
      return route.fulfill({ json: { enabled: realm.capitalRadar } });
    }
    if (url.endsWith('/admin/unlimited-ap')) {
      expect(route.request().postDataJSON().code).toBe('aqw');
      realm.unlimitedAP = !realm.unlimitedAP;
      state.revision++;
      return route.fulfill({ json: { enabled: realm.unlimitedAP } });
    }
    await route.fulfill({ json: session });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.board canvas')).toBeVisible();
  await expect(page.locator('.radar-target')).toHaveCount(0);
  expect(realm.unlimitedAP).toBe(false);
  expect(realm.capitalRadar).toBe(false);
  await page.keyboard.type('hgfdsq');
  await page.keyboard.press('Enter');
  await page.keyboard.type('ytreza');
  await page.keyboard.press('Enter');
  expect(codeCalls).toBe(0);
  expect(realm.unlimitedAP).toBe(false);
  // Typing in an input must never activate a code or open a keyboard shortcut panel.
  await page.evaluate(() => {
    const i = document.createElement('input');
    i.id = 'typing-test';
    document.body.append(i);
    i.focus();
  });
  await page.keyboard.type('zsx');
  await page.keyboard.press('Enter');
  expect(codeCalls).toBe(0);
  await page.locator('#typing-test').evaluate((el) => el.remove());
  const toggle = async () => {
    const expectedCalls = codeCalls + 1;
    await page.keyboard.type('zsx');
    await page.keyboard.press('Enter');
    await expect.poll(() => codeCalls).toBe(expectedCalls);
    await page.evaluate(() => (window as any).pushRadar());
  };
  await toggle();
  await expect(page.locator('.radar-target')).toHaveCount(16);
  await expect(page.locator('.radar-right [data-realm-id="east"]')).toContainText('80 cases');
  await expect(page.locator('.radar-left [data-realm-id="west"]')).toContainText('90 cases');
  await expect(page.locator('.radar-top [data-realm-id="north"]')).toBeVisible();
  await expect(page.locator('.radar-bottom [data-realm-id="south"]')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/capital-radar.png' });
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module.
    const { focusMap } = await import('/src/store.ts');
    focusMap({ q: 10, r: 0 });
  });
  await expect(page.locator('[data-realm-id="east"]')).toContainText('70 cases');
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module.
    const { mapCommand } = await import('/src/store.ts');
    mapCommand('in');
  });
  await expect(page.locator('[data-realm-id="east"]')).toContainText('70 cases');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.radar-target')).toHaveCount(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const rail = page.locator('.radar-right');
  expect(await rail.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.screenshot({ path: 'test-results/capital-radar-mobile.png' });
  await toggle();
  await expect(page.locator('.radar-target')).toHaveCount(0);
  await page.keyboard.type('aqw');
  await page.keyboard.press('Enter');
  await expect.poll(() => realm.unlimitedAP).toBe(true);
  await toggle();
  expect(realm.capitalRadar).toBe(true);
  await page.evaluate(() => (window as any).reconnectRadar());
  await expect(page.locator('.radar-target')).toHaveCount(16);
  expect(realm.unlimitedAP).toBe(true);
  await page.reload();
  await expect.poll(() => realm.unlimitedAP).toBe(false);
  await expect.poll(() => realm.capitalRadar).toBe(false);
  await expect(page.locator('.radar-target')).toHaveCount(0);
  expect(errors).toEqual([]);
});
