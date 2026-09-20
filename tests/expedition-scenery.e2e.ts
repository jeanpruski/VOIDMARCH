import { test, expect } from './fixtures/game-test';
import { UNITS } from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  writeTile,
} from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import type { ActiveMission } from '@voidmarch/shared';

test('lieu d’expédition : sol dégagé, troupes au-dessus et décors restaurés', async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(25000);
  const now = Date.now();
  let state = createState('adventure-browser', now);
  const r = (state.realms.pilot = createRealm(
    'pilot',
    'Les Explorateurs',
    'ASH',
    { q: 0, r: 0 },
    now,
  ));
  r.settings.tutorialCompleted = true;
  r.unlimitedAP = true;
  r.settings.lastCameraQ = 70;
  r.settings.lastCameraR = 0;
  for (const p of disk(r.capital, 8)) writeTile(state, p, { terrain: 'PLAIN' });
  for (const p of disk({ q: 70, r: 0 }, 10))
    writeTile(state, p, { terrain: p.r % 2 ? 'MOUNTAIN' : 'FOREST', biome: 'DESERT' });
  addBuilding(state, r, r.capital, 'CAMP', now);
  state.units.boat = {
    id: 'boat',
    ownerId: 'pilot',
    kind: 'PEASANT',
    q: 72,
    r: 0,
    hp: UNITS.PEASANT.hp,
    createdAt: now,
    updatedAt: now,
  };
  const m: ActiveMission = {
    id: 'adventure-browser',
    title: 'La nécropole du soleil noir',
    difficulty: 'Siège',
    level: 3,
    objective: 'BUILDING',
    units: [],
    buildings: [],
    abandonmentCost: { GOLD: 1000, FOOD: 1000 },
    reward: { GOLD: 25000, WOOD: 15000, STONE: 12000, IRON: 18000, FOOD: 20000 },
    expedition: {
      siteId: 'giza',
      mode: 'EXTRACT',
      route: 'LAND',
      targetDistance: 70,
      phase: 'VISIT',
      orientation: 0,
    },
    q: 70,
    r: 0,
    realmId: 'pilot',
    ownerId: 'mission:browser',
    objectiveId: 'expedition:browser',
    startedAt: now,
    distance: 70,
  };
  state.missions = { pilot: { generation: 0, active: m } };
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
    const next = execute(state, 'pilot', actionSchema.parse(raw), now);
    state = next.state;
    return { result: next.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};window.expeditionPush=()=>window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'pilot', username: 'Voyageur', faction: 'ASH', guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.expeditionScene=this; window.expeditionStore=useGame;',
      ),
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  // The mocked refresh endpoint restores the fixture session automatically.
  await page.waitForFunction(() => (window as any).expeditionScene?.view, undefined, {
    timeout: 90000,
  });
  await expect(page.locator('.map-loading')).toHaveCount(0, { timeout: 90000 });
  await page.evaluate(() => {
    const s = (window as any).expeditionScene;
    s.cameras.main.setZoom(1.8).centerOn(Math.sqrt(3) * 48 * 70, 0);
    s.renderMap();
  });
  await page.waitForFunction(() =>
    (window as any).expeditionScene.children.list.some(
      (o: any) => o.name === 'expedition-site:giza',
    ),
  );
  const layers = await page.evaluate(() => {
    const objects = (window as any).expeditionScene.children.list;
    const depth = (name: string) => objects.find((o: any) => o.name === name)?.depth;
    return {
      site: depth('expedition-site:giza'),
      unit: depth('unit-sprite:boat'),
      oval: depth('unit-owner:boat'),
    };
  });
  expect(layers.unit).toBeGreaterThan(layers.site);
  expect(layers.oval).toBeGreaterThan(layers.site);
  const inspect = () =>
    page.evaluate(() => {
      const scene = (window as any).expeditionScene;
      const site = scene.children.list.find((o: any) => o.name === 'expedition-site:giza');
      const scenery = scene.children.list.filter((o: any) => o.name?.startsWith('terrain:'));
      return {
        site: !!site,
        nearby: scenery.filter(
          (o: any) => site && Math.abs(o.x - site.x) < 128 && Math.abs(o.y - site.y) < 128,
        ).length,
        total: scenery.length,
      };
    });
  expect((await inspect()).nearby).toBe(0);
  expect((await inspect()).total).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('necropolis-clean-ground.png') });
  delete state.missions!.pilot.active;
  state.revision++;
  await page.evaluate(() => (window as any).expeditionPush());
  await expect.poll(async () => (await inspect()).site).toBe(false);
  const restored = await page.evaluate(() => {
    const scene = (window as any).expeditionScene;
    return scene.children.list.some((o: any) => o.name === 'terrain:DESERT:70,0');
  });
  expect(restored).toBe(true);
  expect(state.tiles['70,0'].terrain).toBe('FOREST');
  expect(errors).toEqual([]);
});
