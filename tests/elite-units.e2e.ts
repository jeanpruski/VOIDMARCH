import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { createState, disk, writeTile } from '@voidmarch/game-rules';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { ELITE_SHEETS } from '@voidmarch/config';
import { actionSchema } from '@voidmarch/protocol';

test('les élites filtrées par univers exigent le niveau 5 puis se recrutent', async ({ page }) => {
  test.setTimeout(180000);
  const now = Date.now();
  let state = createState('ages-browser', now);
  const realm = addPlayer(state, 'a', 'Les Cinq Âges', 'MASK', now);
  realm.wallet = { GOLD: 1000000, WOOD: 1000000, STONE: 1000000, IRON: 1000000, FOOD: 1000000 };
  for (const p of disk(realm.capital, 5)) writeTile(state, p, { terrain: 'PLAIN' });
  const b = addBuilding(state, realm, { q: 1, r: 0 }, 'ARSENAL', now);
  b.level = 4;
  addBuilding(state, realm, { q: 2, r: 1 }, 'RADIO', now);
  addBuilding(state, realm, { q: 3, r: 1 }, 'NUCLEAR_REACTOR', now);
  Object.values(state.buildings)[0].population = 500;
  addBuilding(state, realm, { q: 2, r: 2 }, 'MUNITIONS', now);
  addBuilding(state, realm, { q: 3, r: 2 }, 'REFINERY', now);
  ['OCCULT_LAB', 'BLACK_OBSERVATORY', 'TESLA_COIL', 'ATOMIC_FOUNDRY'].forEach((kind, i) =>
    addBuilding(state, realm, { q: i - 2, r: 3 }, kind as any, now),
  );
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
  await page.getByLabel('Univers', { exact: true }).selectOption('solar');
  await expect(page.locator('.catalog article')).toHaveCount(3);
  await expect(page.locator('.catalog')).not.toContainText('Rônin chromé');
  const sapper = page
    .locator('.catalog article')
    .filter({ has: page.getByRole('heading', { name: 'Fusilier d’Anubis', exact: true }) });
  await expect(sapper).toContainText('Âge atomique · recrutement niveau 5');
  await expect(sapper).toContainText('Arsenal niveau 5 nécessaire');
  await expect(
    page.locator('.catalog').getByRole('heading', { name: 'Éclaireur des landes', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Améliorer · 2 PA', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmer l’amélioration · 2 PA' })
    .click();
  await expect.poll(() => state.buildings[b.id].level).toBe(5);
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  await page.getByLabel('Univers', { exact: true }).selectOption('solar');
  await expect(sapper).toContainText('Prêt à recruter');
  await expect(sapper.locator('.miniature')).not.toHaveCSS('background-image', 'none');
  await sapper.getByRole('button', { name: 'Recruter · 1 PA' }).click();
  await expect
    .poll(() => Object.values(state.units).filter((u) => u.kind === 'SOL_ANUBIS_GUNNER').length)
    .toBe(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  await page.getByLabel('Univers', { exact: true }).selectOption('neon');
  await expect(page.locator('.catalog article')).toHaveCount(3);
  await expect(page.locator('.catalog')).toContainText('Rônin chromé');
  await page.screenshot({ path: 'test-results/elite-recruitment.png' });
  expect(errors).toEqual([]);
});

test('les 48 figurines sont transparentes, isolées et visibles', async ({ page }) => {
  const template = await (await page.request.get('/')).text();
  await page.route('**/elite-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace('/src/main.tsx', `/@fs/${resolve('tests/fixtures/elite-units.tsx')}`),
    }),
  );
  await page.setViewportSize({ width: 1300, height: 1100 });
  await page.goto('/elite-review');
  await expect(page.locator('.miniature')).toHaveCount(48);
  await expect
    .poll(() =>
      page
        .locator('.miniature')
        .evaluateAll(
          (nodes) => nodes.filter((n) => getComputedStyle(n).backgroundImage !== 'none').length,
        ),
    )
    .toBe(48);
  const report = await page.evaluate(
    async (sheets) => {
      // @ts-expect-error Browser Vite module.
      const { miniatureAtlasUrl } = await import('/src/sprite-atlas.ts');
      const results = [];
      for (const name of sheets) {
        const img = new Image();
        img.src = '/assets/' + name + '.png';
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const source = ctx.getImageData(0, 0, c.width, c.height).data;
        let clear = 0;
        for (let i = 3; i < source.length; i += 4) if (source[i] === 0) clear++;
        img.src = await miniatureAtlasUrl(name);
        await img.decode();
        c.width = img.width;
        c.height = img.height;
        ctx.drawImage(img, 0, 0);
        const frames = [];
        for (let f = 0; f < 6; f++) {
          const data = ctx.getImageData(f * 256, 0, 256, 256).data;
          let filled = 0,
            edge = 0;
          for (let y = 0; y < 256; y++)
            for (let x = 0; x < 256; x++)
              if (data[(y * 256 + x) * 4 + 3]) {
                filled++;
                if (x < 18 || x >= 238 || y < 18 || y >= 238) edge++;
              }
          frames.push({ filled, edge });
        }
        results.push({ name, clear: clear / (source.length / 4), frames });
      }
      return results;
    },
    [...ELITE_SHEETS],
  );
  for (const sheet of report) {
    expect(sheet.clear, sheet.name).toBeGreaterThan(0.3);
    for (const frame of sheet.frames) {
      expect(frame.filled, sheet.name).toBeGreaterThan(1500);
      expect(frame.edge, sheet.name).toBe(0);
    }
  }
  for (const family of ['solar', 'neon'])
    await page
      .locator(`section[data-family="${family}"]`)
      .screenshot({ path: `test-results/elite-${family}.png` });
});
