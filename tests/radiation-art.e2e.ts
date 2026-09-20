import { ensureHeroes } from '../apps/server/src/heroes';
import { expect, test } from './fixtures/game-test';
import { createState, createRealm, disk, writeTile, observe, key } from '@voidmarch/game-rules';
import { strategy } from '../apps/server/src/strategy';
import { addBuilding, worldView } from '../apps/server/src/engine';

test('radioactivité : voile, animation sous les figurines, réduction des mouvements et dézoom', async ({
  page,
}) => {
  page.setDefaultTimeout(15000);
  const now = Date.now();
  const state = createState('grid-browser', now);
  const realm = createRealm('grid-player', 'Veilleurs du Réacteur', 'ASH', { q: 0, r: 0 }, now);
  state.realms[realm.id] = realm;
  realm.settings.bannerColor = '#8755cc';
  realm.settings.bannerSecondary = '#232936';
  realm.settings.grid = false;
  realm.settings.tutorialCompleted = true;
  for (const p of disk(realm.capital, 6))
    writeTile(state, p, {
      terrain: 'PLAIN',
      biome: 'TEMPERATE',
      ownerId:
        Math.max(Math.abs(p.q), Math.abs(p.r), Math.abs(p.q + p.r)) <= 2 ? realm.id : undefined,
    });
  addBuilding(state, realm, { q: 0, r: 0 }, 'NUCLEAR_REACTOR', now);
  addBuilding(state, realm, { q: -2, r: 1 }, 'FORGE', now);
  addBuilding(state, realm, { q: 1, r: 1 }, 'HOUSE', now);
  addBuilding(state, realm, { q: 2, r: -1 }, 'CAMP', now);
  ensureHeroes(state, now);
  const hero = Object.values(state.units).find((u) => u.kind === 'HERO')!;
  hero.q = -1;
  hero.r = 0;
  observe(state, realm, now);
  for (const p of disk(realm.capital, 1))
    strategy(state, now).fallout[key(p)] = { ...p, intensity: 75 };
  await page.exposeFunction('fixtureSnapshot', () => worldView(state, realm.id, Date.now()));
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /\bcreate\(\)\s*\{/,
      'create() { window.__radiationScene = this; window.__radiationStore = useGame;',
    );
    await route.fulfill({ response, body });
  });
  // Only the initial snapshot is sent: preference updates must also work via HTTP.
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};let joined=false;return {on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return this},emit(e){if(e==='world:join'&&!joined){joined=true;window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));}return this},disconnect(){}}}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id: realm.id, username: realm.name, faction: 'ASH', guest: true },
  };
  await page.route('**/api/**', async (route) => {
    if (route.request().url().endsWith('/settings')) {
      Object.assign(realm.settings, route.request().postDataJSON());
      return route.fulfill({ json: { settings: realm.settings } });
    }
    await route.fulfill({ json: session });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  const layer = () =>
    page.evaluate(() => {
      const s = (window as any).__radiationScene;
      return {
        count: s.children.getByName('radiation-ground').getData('tile-count'),
        depth: s.children.getByName('radiation-ground').depth,
        clouds: s.children.list.filter((o: any) => o.name === 'radiation-mist' && o.visible).length,
      };
    });
  await expect.poll(layer).toEqual({ count: 7, depth: 3300, clouds: 7 });
  await page.evaluate(() => {
    const s = (window as any).__radiationScene;
    s.cameras.main.setZoom(1.9).centerOn(0, 0);
    s.renderMap();
  });
  const motion = () =>
    page.evaluate(() => {
      const c = (window as any).__radiationScene.children.getByName('radiation-mist');
      return [c.x, c.y, c.alpha];
    });
  const first = await motion();
  await expect.poll(motion).not.toEqual(first);
  await page.screenshot({ path: 'test-results/radiation-live.png' });
  await page.evaluate(() => {
    const store = (window as any).__radiationStore;
    store.setState((s: any) => ({
      world: {
        ...s.world,
        player: {
          ...s.world.player,
          settings: { ...s.world.player.settings, reducedMotion: true },
        },
      },
    }));
  });
  const quiet = await motion();
  await page.waitForTimeout(150);
  expect(await motion()).toEqual(quiet);
  expect(
    await page.evaluate(() =>
      (window as any).__radiationScene.children
        .getByName('radiation-motes')
        .getData('particle-count'),
    ),
  ).toBe(0);
  await page.screenshot({ path: 'test-results/radiation-reduced.png' });
  await page.evaluate(() => {
    const s = (window as any).__radiationScene;
    s.cameras.main.setZoom(0.2);
    s.renderMap();
  });
  await expect.poll(layer).toEqual({ count: 0, depth: 3300, clouds: 0 });
  await page.evaluate(() => {
    const s = (window as any).__radiationScene;
    s.cameras.main.setZoom(1.9);
    s.renderMap();
  });
  await expect.poll(layer).toEqual({ count: 7, depth: 3300, clouds: 7 });
  await page.evaluate(() => {
    const store = (window as any).__radiationStore;
    store.setState((s: any) => ({
      world: { ...s.world, strategy: { ...s.world.strategy, fallout: [] } },
    }));
  });
  await expect.poll(layer).toEqual({ count: 0, depth: 3300, clouds: 0 });
  expect(errors).toEqual([]);
});
