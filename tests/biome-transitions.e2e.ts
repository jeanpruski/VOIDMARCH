import { expect, test } from '@playwright/test';
import { BIOMES, type Biome, type Terrain } from '@voidmarch/config';
import { biomeAt, biomeBlend, createState, disk, key, writeTile } from '@voidmarch/game-rules';
import { hexToPixel } from '../apps/web/src/map-geometry';
import { addPlayer, worldView } from '../apps/server/src/engine';
test('biomes : frontière progressive, décors stables après rechargement', async ({ page }) => {
  const now = Date.now(),
    state = createState('landscape', now);
  const realm = addPlayer(state, 'pilot', 'Paysages', 'ASH', now);
  const boundary = disk({ q: 0, r: 0 }, 250).find((p) => {
    const blend = biomeBlend(state.seed, p);
    return (
      blend.width > 3.5 &&
      blend.weights.length === 2 &&
      blend.weights.every((b) => b.weight > 0.3) &&
      blend.weights.some((b) => b.biome === 'SNOW') &&
      blend.weights.some((b) => b.biome === 'TEMPERATE')
    );
  })!;
  expect(boundary).toBeTruthy();
  realm.settings.tutorialCompleted = true;
  realm.settings.lastCameraQ = boundary.q;
  realm.settings.lastCameraR = boundary.r;
  state.units = {};
  state.buildings = {};
  for (const p of disk(boundary, 18)) {
    const offset = Math.abs(p.r - boundary.r) % 7;
    const kind: Terrain = offset === 0 ? 'MOUNTAIN' : offset <= 2 ? 'FOREST' : 'PLAIN';
    writeTile(state, p, {
      terrain: kind,
      biome: biomeAt(state.seed, p),
      ownerId: undefined,
      buildingId: undefined,
    });
    realm.explored[key(p)] = { ...p, terrain: kind, visibility: 'EXPLORED' };
  }
  const view = () => {
    const world = worldView(state, 'pilot', now, disk(boundary, 2));
    world.tiles = Object.values(state.tiles).map((t) => ({ ...t, visibility: 'VISIBLE' as const }));
    world.units = [];
    return world;
  };
  await page.exposeFunction('fixtureSnapshot', view);
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){await new Promise(r=>setTimeout(r,250));const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'pilot', username: 'Convoi', faction: 'ASH', guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.biomeScene=this; window.biomeStore=useGame;',
      ),
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const center = hexToPixel(boundary);
  const show = async () => {
    await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
      timeout: 90000,
    });
    await page.evaluate((p) => {
      const scene = (window as any).biomeScene;
      scene.cameras.main.setZoom(0.8).centerOn(p.x, p.y);
      scene.cameras.main.preRender();
      scene.renderMap();
    }, center);
    return page.evaluate(() =>
      (window as any).biomeScene.children.list
        .filter((c: any) => c.name?.startsWith('terrain:'))
        .map((c: any) => ({
          name: c.name,
          texture: c.texture.key,
          biome: c.getData('biome'),
          scenery: c.getData('sceneryBiome'),
          weights: c.getData('biomeWeights'),
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
    );
  };
  await page.goto('/');
  const initial = await show();
  expect(initial.some((c: any) => c.weights.length > 1)).toBe(true);
  expect(initial.some((c: any) => c.scenery !== c.biome)).toBe(true);
  for (const c of initial) expect(c.texture).toBe(BIOMES[c.scenery as Biome].texture);
  await page.screenshot({ path: 'test-results/biome-transitions.png' });
  await page.reload();
  expect(await show()).toEqual(initial);
  expect(errors).toEqual([]);
});
