import { expect, test } from '@playwright/test';
import { NAVAL_SHEETS, UNITS, isSea } from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  writeTile,
  tileAt,
  key,
  neighbors,
} from '@voidmarch/game-rules';
import { addBuilding, worldView, execute } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('marine : atlas transparents, cinq époques, côte lisible et recrutement en eau libre', async ({
  page,
}) => {
  const now = Date.now();
  let state = createState('naval-browser', now);
  const r = (state.realms.pilot = createRealm(
    'pilot',
    'Les Marées Noires',
    'ASH',
    { q: 0, r: 0 },
    now,
  ));
  r.settings.tutorialCompleted = true;
  r.settings.lastCameraQ = 0;
  r.settings.lastCameraR = 0;
  r.unlimitedAP = true;
  r.wallet = { WOOD: 1000000, STONE: 1000000, GOLD: 1000000, IRON: 1000000, FOOD: 0 };
  for (const p of disk(r.capital, 22))
    writeTile(state, p, {
      terrain: p.q >= 3 ? 'COAST' : p.q >= 0 ? 'BEACH' : 'FOREST',
      ownerId: p.q < 3 && p.q >= 0 ? 'pilot' : undefined,
      biome: p.r > 3 ? 'SNOW' : p.r < -3 ? 'DESERT' : 'TEMPERATE',
    });
  addBuilding(state, r, { q: 0, r: 0 }, 'CAMP', now);
  const port = addBuilding(state, r, { q: 2, r: 0 }, 'PORT', now, 1);
  port.population = 100;
  addBuilding(state, r, { q: 2, r: 3 }, 'SHIPYARD', now, 3);
  addBuilding(state, r, { q: 2, r: -3 }, 'NAVAL_FISHERY', now, 5);
  state.units.fisher = {
    id: 'fisher',
    kind: 'FISHING_CUTTER',
    q: 4,
    r: 0,
    ownerId: 'pilot',
    hp: UNITS.FISHING_CUTTER.hp,
    createdAt: now,
    updatedAt: now,
  };
  const view = () => {
    const w = worldView(state, 'pilot', now);
    w.tiles = Object.values(state.tiles).map((t) => ({
      ...t,
      visibility: 'VISIBLE' as const,
      building: state.buildings[t.buildingId ?? ''],
    }));
    return w;
  };
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, 'pilot', actionSchema.parse(raw), now);
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'pilot', username: 'Marin', faction: 'ASH', guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.navalScene=this; window.navalStore=useGame;',
      ),
    });
  });
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('/assets/')) failed.push(r.url());
  });
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 60000,
  });
  const atlas = await page.evaluate(async (sheets) => {
    const spriteModule = '/src/sprite-atlas.ts';
    const { isolateSprites } = await import(/* @vite-ignore */ spriteModule);
    const buildingModule = '/src/building-art.ts';
    const { buildingAtlas } = await import(/* @vite-ignore */ buildingModule);
    const output = [];
    for (const name of [...sheets, 'naval-events']) {
      const img = new Image();
      img.src = `/assets/${name}.png`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
      let clear = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 0) clear++;
      const n = name === 'naval-events' ? 2 : 3;
      const frames = isolateSprites(pixels, c.width, c.height, n, n);
      output.push({
        name,
        clear: clear / (c.width * c.height),
        sizes: frames.map((f: any) => f.width * f.height),
      });
    }
    for (const kind of ['PORT', 'SHIPYARD', 'NAVAL_FISHERY', 'SUBMARINE_BASE', 'COASTAL_BATTERY']) {
      const canvas = await buildingAtlas(kind);
      if (canvas.width !== 1024) throw Error('wrong evolution strip');
    }
    return output;
  }, NAVAL_SHEETS);
  for (const sheet of atlas) {
    expect(sheet.clear, sheet.name).toBeGreaterThan(0.2);
    expect(
      sheet.sizes.every((n: number) => n > 1000),
      sheet.name + JSON.stringify(sheet.sizes),
    ).toBe(true);
  }
  await page.evaluate(() => {
    const scene = (window as any).navalScene;
    scene.cameras.main.setZoom(1).centerOn(100, 0);
    scene.renderMap();
  });
  await page.screenshot({ path: 'output/naval-coast-preview.png' });
  await page.evaluate(() => {
    (window as any).navalStore.setState({
      selection: { kind: 'unit', id: 'fisher', q: 4, r: 0 },
      mode: 'inspect',
    });
  });
  await page.getByRole('button', { name: /Pêcher \+40 vivres/ }).click();
  expect(state.realms.pilot.wallet.FOOD).toBe(40);
  await page.evaluate((port) => {
    (window as any).navalStore.setState({
      selection: { kind: 'building', id: port.id, q: port.q, r: port.r },
      panel: 'recruit',
    });
  }, port);
  await expect(page.getByRole('heading', { name: 'Bac des marches', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Galère des serments', exact: true })).toHaveCount(
    0,
  );
  state = createState('ocean-geography', now);
  state.oceanVersion = 1;
  const coast = disk({ q: 100, r: 100 }, 80).find(
    (p) =>
      tileAt(state, p).terrain === 'BEACH' &&
      neighbors(p).some((n) => isSea(tileAt(state, n).terrain)),
  )!;
  expect(coast).toBeDefined();
  const nr = (state.realms.pilot = createRealm('pilot', 'Les Marées Noires', 'ASH', coast, now));
  nr.settings.tutorialCompleted = true;
  nr.settings.grid = false;
  for (const p of disk(coast, 25)) {
    const t = tileAt(state, p);
    writeTile(state, p, t);
    nr.explored[key(p)] = { ...t, visibility: 'EXPLORED' };
  }
  addBuilding(state, nr, coast, 'PORT', now, 3);
  const water = neighbors(coast).find((p) => isSea(tileAt(state, p).terrain))!;
  state.units.preview = {
    ...water,
    id: 'preview',
    kind: 'CANNON_FRIGATE',
    ownerId: 'pilot',
    hp: UNITS.CANNON_FRIGATE.hp,
    createdAt: now,
    updatedAt: now,
  };
  await page.evaluate(async (coast) => {
    const w = await (window as any).fixtureSnapshot();
    (window as any).navalStore.setState({ world: w, panel: null, selection: null });
    const path = '/src/map-geometry.ts';
    const { hexToPixel } = await import(/* @vite-ignore */ path);
    const p = hexToPixel(coast),
      scene = (window as any).navalScene;
    scene.cameras.main.setZoom(0.82).centerOn(p.x, p.y);
    scene.renderMap();
    if (!scene.unitVisuals.size) throw Error('Le navire doit être visible après le saut de caméra');
  }, coast);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'output/naval-generated-coast.png' });
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});
