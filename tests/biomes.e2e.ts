import { expect, test } from '@playwright/test';
import { BIOMES, type Biome, type Terrain } from '@voidmarch/config';
import { createState, disk, key, writeTile } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
test('biomes : illustrations transparentes, quatre ambiances et terrain universel', async ({
  page,
}) => {
  const now = Date.now(),
    state = createState('biome-browser', now);
  const realm = addPlayer(state, 'pilot', 'Paysages', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  realm.settings.lastCameraQ = 0;
  realm.settings.lastCameraR = 0;
  state.units = {};
  state.buildings = {};
  const themes = Object.keys(BIOMES) as Biome[];
  const terrain: Terrain[] = ['FOREST', 'PLAIN', 'MOUNTAIN', 'HILL', 'MARSH', 'RUINS', 'RIVER'];
  for (const p of disk({ q: 0, r: 0 }, 24)) {
    const kind = terrain[((p.r % 7) + 7) % 7];
    writeTile(state, p, {
      terrain: kind,
      biome: themes[Math.max(0, Math.min(3, Math.floor((p.q + 8) / 4)))],
      ownerId: undefined,
      buildingId: undefined,
    });
    realm.explored[key(p)] = { ...p, terrain: kind, visibility: 'EXPLORED' };
  }
  const view = () => {
    const world = worldView(state, 'pilot', now, disk({ q: 0, r: 0 }, 2));
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
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 60000,
  });
  await page.evaluate(() => {
    const scene = (window as any).biomeScene;
    scene.cameras.main.setZoom(0.8).centerOn(0, 0);
    scene.renderMap();
  });
  const atlas = await page.evaluate(async () => {
    const modulePath = '/src/sprite-atlas.ts';
    const { isolateSprites } = await import(/* @vite-ignore */ modulePath);
    const result = [];
    for (const name of ['terrain-snow', 'terrain-desert', 'terrain-autumn']) {
      const img = new Image();
      img.src = `/assets/${name}.png`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
      let clear = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 0) clear++;
      const frames = isolateSprites(pixels, img.width, img.height, 4, 3);
      result.push({
        name,
        clear,
        sizes: frames.map((f: any) => f.width * f.height),
        maxWidth: Math.max(...frames.map((f: any) => f.width)),
      });
    }
    return result;
  });
  for (const sheet of atlas) {
    expect(sheet.clear).toBeGreaterThan(10000);
    expect(sheet.sizes).toHaveLength(12);
    for (const area of sheet.sizes) expect(area, sheet.name).toBeGreaterThan(15000);
    expect(
      sheet.maxWidth,
      sheet.name + ' aucun décor ne déborde sur la cellule voisine',
    ).toBeLessThan(460);
  }
  const rendered = await page.evaluate(() =>
    (window as any).biomeScene.children.list
      .filter((c: any) => c.name?.startsWith('terrain:'))
      .map((c: any) => c.name.split(':')[1]),
  );
  expect(new Set(rendered)).toEqual(new Set(themes));
  await page.screenshot({ path: 'test-results/biomes-map.png' });
  await page.evaluate(() => (window as any).biomeScene.click({ q: 0, r: 1 }));
  await expect(page.locator('.selection-identity')).toContainText('Plaine');
  await expect(page.locator('.biome-label')).toContainText('désertique');
  expect(errors).toEqual([]);
});
