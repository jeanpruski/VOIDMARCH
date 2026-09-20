import { expect, test } from '@playwright/test';
import { createState, writeTile } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('centre logistique : échanges, quota, cinq visuels et interface mobile', async ({ page }) => {
  const now = Date.now();
  let state = createState('logistics-browser', now);
  const realm = addPlayer(state, 'a', 'Intendance', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  realm.ap = 20;
  realm.wallet = { GOLD: 10000, FOOD: 10000, WOOD: 10000, STONE: 10000, IRON: 10000 };
  const building = addBuilding(state, realm, { q: realm.capital.q + 1, r: realm.capital.r }, 'LOGISTICS_CENTER', now);
  writeTile(state, building, { terrain: 'PLAIN' });
  const view = () => worldView(state, 'a', now);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, 'a', actionSchema.parse(raw), now);
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route('**/src/Map.tsx', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /\bcreate\(\)\s*\{/,
      'create() { window.__logisticsScene=this;',
    );
    await route.fulfill({ response, body });
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id: 'a', username: realm.name, faction: 'ASH', guest: true },
  };
  await page.route('**/api/**', async (route) => {
    if (route.request().url().endsWith('/settings')) {
      Object.assign(state.realms.a.settings, route.request().postDataJSON());
      return route.fulfill({ json: { settings: state.realms.a.settings } });
    }
    await route.fulfill({ json: session });
  });
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__logisticsScene?.view, undefined, { timeout: 90000 });

  await page.evaluate(async (b) => {
    // @ts-expect-error Vite source module.
    const { useGame, focusMap } = await import('/src/store.ts');
    focusMap(b);
    useGame.setState({ panel: null, selection: { kind: 'building', id: b.id, q: b.q, r: b.r }, mode: 'inspect' });
  }, building);
  await page.getByRole('button', { name: 'Produire des PA' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('10 / 10 PA disponibles');
  await expect(dialog).toContainText('500 requis');
  await expect(dialog).toContainText('200 requis');
  await page.getByRole('button', { name: 'Confirmer l’échange · recevoir 5 PA' }).click();
  await expect(dialog).toContainText('5 / 10 PA disponibles');
  expect(state.realms.a.ap).toBe(25);
  expect(state.realms.a.wallet.FOOD).toBe(9500);
  await page.getByRole('button', { name: '+10 PA', exact: true }).click();
  await expect(dialog).toContainText('Il reste 5 PA');
  await expect(dialog.getByRole('button', { name: /Confirmer/ })).toHaveCount(0);
  await dialog.getByRole('combobox').selectOption('OCCULT');
  await expect(dialog).toContainText('Centre logistique de niveau 4 requis');
  await dialog.getByRole('combobox').selectOption('RATIONS');
  await page.getByRole('button', { name: '+5 PA', exact: true }).click();
  await page.screenshot({ path: 'output/logistics-panel.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: 'output/logistics-mobile.png' });
  const assets = await page.evaluate(async () => {
    // @ts-expect-error Vite source module.
    const { buildingAtlas } = await import('/src/building-art.ts');
    const atlas = await buildingAtlas('LOGISTICS_CENTER');
    const ctx = atlas.getContext('2d');
    return Promise.all([1,2,3,4,5].map(async (level) => {
      const img = new Image(); img.src = `/assets/logistics-center-${level}.png`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d')!; g.drawImage(img,0,0);
      const pixels = g.getImageData(0,0,c.width,c.height).data;
      let alpha = 0, opaque = 0;
      for(let i=3;i<pixels.length;i+=4) { if(pixels[i]===0) alpha++; if(pixels[i]>200) opaque++; }
      const rendered = level === 1 ? true : ctx.getImageData((level-2)*256,0,256,256).data.some((n: number,i: number) => i%4===3 && n>200);
      return { alpha: alpha/(pixels.length/4), opaque: opaque/(pixels.length/4), rendered };
    }));
  });
  for (const asset of assets) {
    expect(asset.alpha).toBeGreaterThan(0.15);
    expect(asset.opaque).toBeGreaterThan(0.15);
    expect(asset.rendered).toBe(true);
  }
  expect(errors).toEqual([]);
});
