import { test, expect } from './fixtures/game-test';
import { resolve } from 'node:path';
import { createState, disk, writeTile } from '@voidmarch/game-rules';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('les renforts exigent leur époque dans le catalogue puis apparaissent après recrutement', async ({
  page,
}) => {
  test.setTimeout(180000);
  const now = Date.now();
  let state = createState('ages-browser', now);
  const realm = addPlayer(state, 'a', 'Les Cinq Âges', 'MASK', now);
  realm.wallet = { GOLD: 1000000, WOOD: 1000000, STONE: 1000000, IRON: 1000000, FOOD: 1000000 };
  for (const p of disk(realm.capital, 5)) writeTile(state, p, { terrain: 'PLAIN' });
  const b = addBuilding(state, realm, { q: 1, r: 0 }, 'ARSENAL', now);
  b.level = 2;
  addBuilding(state, realm, { q: 2, r: 1 }, 'RADIO', now);
  addBuilding(state, realm, { q: 3, r: 1 }, 'NUCLEAR_REACTOR', now);
  Object.values(state.buildings)[0].population = 500;
  addBuilding(state, realm, { q: 2, r: 2 }, 'MUNITIONS', now);
  addBuilding(state, realm, { q: 3, r: 2 }, 'REFINERY', now);
  const view = () =>
    worldView(state, 'a', Date.now(), [
      { q: 0, r: 0 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: -1, r: -1 },
    ]);
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const result = execute(state, 'a', actionSchema.parse(raw), Date.now());
    state = result.state;
    return { result: result.result, world: view() };
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
        user: { id: 'a', username: realm.name, faction: realm.faction, guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.__agesScene=this; window.__agesStore=useGame;',
      ),
    });
  });
  const errors: string[] = [],
    sheets = new Set<string>();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.url().includes('/assets/ages/')) sheets.add(r.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.board canvas')).toBeVisible();
  await page.waitForFunction(() =>
    (window as any).__agesScene?.textures.exists('building-ages-v1:ARSENAL'),
  );
  await page.evaluate((b) => {
    window.dispatchEvent(new CustomEvent('vm:camera', { detail: b }));
    (window as any).__agesStore.setState({
      selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
      panel: null,
    });
  }, b);
  await expect(page.locator('.selection-panel h2')).toHaveText('Arsenal');
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  const sapper = page
    .locator('.catalog article')
    .filter({ has: page.getByRole('heading', { name: 'Sapeur des tranchées', exact: true }) });
  await expect(sapper).toContainText('Guerre industrielle · recrutement niveau 3');
  await expect(sapper).toContainText('Arsenal niveau 3 nécessaire');
  await expect(
    page.locator('.catalog').getByRole('heading', { name: 'Éclaireur des landes', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Améliorer · 2 PA', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmer l’amélioration · 2 PA' })
    .click();
  await expect.poll(() => state.buildings[b.id].level).toBe(3);
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  await expect(sapper).toContainText('Prêt à recruter');
  await expect(sapper.locator('.miniature')).not.toHaveCSS('background-image', 'none');
  await sapper.getByRole('button', { name: 'Recruter · 1 PA' }).click();
  await expect
    .poll(() => Object.values(state.units).filter((u) => u.kind === 'ASSAULT_SAPPER').length)
    .toBe(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/reinforcements-recruited.png' });
  expect(errors).toEqual([]);
});

test('les vingt renforts ont des silhouettes distinctes et un fond transparent', async ({
  page,
}) => {
  const template = await (await page.request.get('/')).text();
  await page.route('**/reinforcements-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace(
        '/src/main.tsx',
        `/@fs/${resolve('tests/fixtures/era-reinforcements.tsx')}`,
      ),
    }),
  );
  await page.setViewportSize({ width: 1100, height: 1600 });
  await page.goto('/reinforcements-review');
  await expect(page.locator('.miniature')).toHaveCount(20);
  await expect
    .poll(() =>
      page
        .locator('.miniature')
        .evaluateAll(
          (nodes) => nodes.filter((n) => getComputedStyle(n).backgroundImage !== 'none').length,
        ),
    )
    .toBe(20);
  const report = await page.evaluate(async () => {
    const result = [];
    for (const age of ['medieval', 'empire', 'industrial', 'modern', 'atomic']) {
      const image = new Image();
      image.src = '/assets/reinforcements-' + age + '.png';
      await image.decode();
      const c = document.createElement('canvas');
      c.width = image.width;
      c.height = image.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let clear = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] === 0) clear++;
      result.push({ age, clear: clear / (data.length / 4) });
    }
    return result;
  });
  for (const r of report) expect(r.clear, r.age).toBeGreaterThan(0.3);
  await page.screenshot({ path: 'test-results/era-reinforcements.png', fullPage: true });
});
