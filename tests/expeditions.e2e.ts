import { test, expect } from '@playwright/test';
import { EXPEDITION_SITES, UNITS } from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  writeTile,
  distance,
  expeditionCenter,
  expeditionFootprint,
} from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import type { ActiveMission } from '@voidmarch/shared';

test('45 illustrations, île de Jeff sur la carte, extraction et carnet de voyage', async ({
  page,
}) => {
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
  for (const p of disk({ q: 70, r: 0 }, 10)) writeTile(state, p, { terrain: 'SEA' });
  addBuilding(state, r, r.capital, 'CAMP', now);
  state.units.boat = {
    id: 'boat',
    ownerId: 'pilot',
    kind: 'TROOP_FERRY',
    q: 72,
    r: 0,
    hp: UNITS.TROOP_FERRY.hp,
    createdAt: now,
    updatedAt: now,
  };
  const m: ActiveMission = {
    id: 'adventure-browser',
    title: 'L’île de Jeff',
    difficulty: 'Siège',
    level: 3,
    objective: 'BUILDING',
    units: [],
    buildings: [],
    abandonmentCost: { GOLD: 1000, FOOD: 1000 },
    reward: { GOLD: 25000, WOOD: 15000, STONE: 12000, IRON: 18000, FOOD: 20000 },
    expedition: {
      siteId: 'jeff',
      mode: 'EXTRACT',
      route: 'SEA',
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
      (o: any) => o.name === 'expedition-site:jeff',
    ),
  );
  const layers = await page.evaluate(() => {
    const objects = (window as any).expeditionScene.children.list;
    const depth = (name: string) => objects.find((o: any) => o.name === name)?.depth;
    return {
      site: depth('expedition-site:jeff'),
      unit: depth('unit-sprite:boat'),
      oval: depth('unit-owner:boat'),
    };
  });
  expect(layers.unit).toBeGreaterThan(layers.site);
  expect(layers.oval).toBeGreaterThan(layers.site);
  // Real game renders at the same scale: no image compositing or mock illustration.
  const examples = ['houska', 'hoerengracht', 'baychimo', 'yonaguni', 'dahab', 'jeff'];
  const renders: { name: string; image: string }[] = [];
  for (const [i, siteId] of examples.entries()) {
    const site = EXPEDITION_SITES.find((s) => s.id === siteId)!;
    const mission = state.missions!.pilot.active!;
    Object.assign(mission.expedition!, {
      siteId,
      route: site.environment,
      orientation: siteId === 'jeff' ? 0 : i % 6,
    });
    mission.title = site.name;
    state.units.boat.kind = site.environment === 'SEA' ? 'TROOP_FERRY' : 'PEASANT';
    for (const p of disk(mission, 10))
      writeTile(state, p, {
        biome: siteId === 'baychimo' ? 'SNOW' : siteId === 'dahab' ? 'DESERT' : 'TEMPERATE',
        terrain:
          site.environment === 'SEA'
            ? 'SEA'
            : distance(mission, p) > 3 && Math.abs(p.q + p.r) % 3 === 0
              ? 'FOREST'
              : 'PLAIN',
      });
    await page.evaluate(() => (window as any).expeditionPush());
    const center = expeditionCenter(mission);
    await page.evaluate((center) => {
      const scene = (window as any).expeditionScene;
      scene.cameras.main
        .setZoom(2)
        .centerOn(Math.sqrt(3) * 48 * (center.q + center.r / 2), 48 * 1.5 * center.r * 0.82 - 20);
      scene.renderMap();
    }, center);
    await page.waitForFunction((id) => {
      const img = (window as any).expeditionScene.children.list.find(
        (o: any) => o.name === 'expedition-site:' + id,
      );
      return img?.displayWidth === 256;
    }, siteId);
    const screenshot = await page.screenshot({
      animations: 'disabled',
      path: 'output/expedition-three-hex-' + siteId + '.png',
      clip: { x: 330, y: 140, width: 930, height: 680 },
    });
    renders.push({
      name: site.realPlace,
      image: 'data:image/png;base64,' + screenshot.toString('base64'),
    });
  }
  await page.screenshot({ animations: 'disabled', path: 'output/expedition-jeff-map.png' });
  await page.evaluate(() => (window as any).expeditionStore.setState({ panel: 'missions' }));
  await expect(
    page.getByRole('heading', { name: 'Expéditions & aventures', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inspiré de Little Saint James' })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: 'output/expedition-mission-panel.png' });
  await page.getByRole('button', { name: 'Emporter l’objet · 1 PA', exact: true }).click();
  await expect(page.getByText('Objet récupéré · retour au royaume', { exact: true })).toBeVisible();
  expect(state.realms.pilot.wallet.GOLD).toBe(r.wallet.GOLD);
  state.units.boat.q = 1;
  state.units.boat.r = 0;
  writeTile(state, { q: 1, r: 0 }, { terrain: 'COAST' });
  await page.evaluate(() => (window as any).expeditionPush());
  await page.getByRole('button', { name: 'Livrer l’objet · 1 PA', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Carnet des découvertes · 1/45', exact: true }),
  ).toBeVisible();
  expect(state.missions!.pilot.trophies).toHaveLength(1);
  await expect(page.getByText('Expédition accomplie', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer le bilan de victoire' }).click();
  await page.getByRole('button', { name: 'Carnet des découvertes · 1/45', exact: true }).click();
  await expect(page.locator('.expedition-album .discovered')).toHaveCount(1);
  await page.screenshot({ animations: 'disabled', path: 'output/expedition-journal.png' });
  await page.getByRole('button', { name: 'Revenir aux expéditions', exact: true }).click();
  const offers = page.locator('.mission-offers .mission-card');
  await expect(offers).toHaveCount(3);
  await expect(offers.first()).toContainText('Site repéré à');
  await expect(offers.first()).toContainText('Milieu :');
  await page.screenshot({ animations: 'disabled', path: 'output/expedition-regional-offers.png' });
  expect(errors).toEqual([]);
  // A contact sheet also verifies every independent deliverable's genuine alpha.
  const art = await page.evaluate(async (sites) => {
    const main = document.createElement('main');
    main.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:#1d2723;color:#e8d9ab;overflow:auto;display:grid;grid-template-columns:repeat(5,1fr);align-content:start;padding:12px;gap:8px';
    const results = [];
    for (const site of sites) {
      const img = new Image();
      img.src = '/assets/expeditions/' + site.id + '.png';
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const bytes = ctx.getImageData(0, 0, c.width, c.height).data;
      let clear = 0,
        opaque = 0;
      for (let i = 3; i < bytes.length; i += 4) {
        if (bytes[i] === 0) clear++;
        if (bytes[i] > 200) opaque++;
      }
      results.push({
        id: site.id,
        clear: clear / (c.width * c.height),
        opaque: opaque / (c.width * c.height),
      });
      img.style.cssText = 'width:100%;height:138px;object-fit:contain';
      const card = document.createElement('article');
      card.style.cssText =
        'text-align:center;font:12px sans-serif;background:#28342c;border-radius:6px;padding:4px';
      card.append(img, document.createTextNode(site.realPlace));
      main.append(card);
    }
    document.body.append(main);
    return results;
  }, EXPEDITION_SITES);
  for (const a of art) {
    expect(a.clear, a.id + ' transparence').toBeGreaterThan(0.15);
    expect(a.opaque, a.id + ' illustration').toBeGreaterThan(0.12);
  }
  await page.setViewportSize({ width: 1440, height: 1800 });
  await page.screenshot({
    animations: 'disabled',
    path: 'output/expedition-landmarks-contact-sheet.png',
  });
  await page.evaluate(() => {
    const main = document.body.lastElementChild!;
    [...main.children].slice(0, 25).forEach((el) => el.remove());
    main.querySelectorAll('img').forEach((img) => (img.style.height = '220px'));
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    animations: 'disabled',
    path: 'output/expedition-mysteries-contact-sheet.png',
  });
  await page.setViewportSize({ width: 1440, height: 1720 });
  await page.evaluate(async (renders) => {
    const main = document.createElement('main');
    main.style.cssText =
      'position:fixed;inset:0;z-index:100000;background:#15201b;color:#e7cf98;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:12px;align-content:start';
    for (const render of renders) {
      const card = document.createElement('article');
      card.style.cssText = 'margin:0;background:#263329;text-align:center;font:18px Georgia';
      const title = document.createElement('div');
      title.textContent = render.name + ' · 3 hexagones';
      title.style.cssText = 'padding:12px';
      const img = new Image();
      img.src = render.image;
      await img.decode();
      img.style.cssText = 'display:block;width:100%;height:auto';
      card.append(title, img);
      main.append(card);
    }
    document.body.append(main);
  }, renders);
  await page.screenshot({
    animations: 'disabled',
    path: 'output/expedition-three-hex-examples.png',
  });
});
