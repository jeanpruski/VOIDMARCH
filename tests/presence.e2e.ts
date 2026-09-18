import { expect, test } from '@playwright/test';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
import { PlayerPresence } from '../apps/server/src/presence';

test('compteur cliquable, durées en direct, missions et liste mobile', async ({ page }) => {
  const now = Date.now(),
    state = createState('presence-browser', now),
    presence = new PlayerPresence();
  for (const [id, name] of [
    ['a', 'Alice'],
    ['b', 'Basile'],
    ['c', 'Absent'],
    ['d', 'Automate'],
  ]) {
    const realm = addPlayer(state, id, name, 'ASH', now);
    realm.settings.tutorialCompleted = true;
  }
  state.realms.d.bot = true;
  presence.join('a', 'one', now - 75000);
  presence.join('b', 'two', now - 3720000);
  const view = presence.decorate(worldView(state, 'a', now));
  view.realms.find((r) => r.id === 'b')!.onMission = true;
  await page.exposeFunction('fixtureSnapshot', () => view);
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `import {useGame} from '/src/store.ts'; window.presenceStore=useGame; export function GameMap(){return null}`,
    }),
  );
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'a', username: 'Alice', faction: 'ASH', guest: true },
      },
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Voir les joueurs connectés : 2', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Joueurs connectés' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('li')).toHaveCount(2);
  await expect(dialog.locator('li').first()).toContainText('Alice');
  await expect(dialog.locator('li').first()).toContainText('Aucune mission en cours');
  const basile = dialog.locator('li').filter({ hasText: 'Basile' });
  await expect(basile).toContainText('Depuis 1 h 2 min');
  await expect(basile).toContainText('En mission');
  const timer = dialog.locator('.online-player-duration').first();
  const initial = await timer.textContent();
  await expect(timer).not.toHaveText(initial!);
  await expect(dialog).not.toContainText('Absent');
  await expect(dialog).not.toContainText('Automate');
  await page.screenshot({ path: 'test-results/online-players.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: 'test-results/online-players-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await page.evaluate(() => {
    const store = (window as any).presenceStore;
    store.setState((s: any) => ({
      world: {
        ...s.world,
        onlineHumans: 1,
        realms: s.world.realms.map((r: any) => (r.id === 'b' ? { ...r, online: false } : r)),
      },
    }));
  });
  await expect(dialog.locator('li')).toHaveCount(1);
  expect(errors).toEqual([]);
});
