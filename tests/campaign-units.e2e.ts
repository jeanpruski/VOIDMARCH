import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { createState, disk, writeTile } from '@voidmarch/game-rules';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { CAMPAIGN_SHEETS } from '@voidmarch/config';
import { actionSchema } from '@voidmarch/protocol';

test('les quatre armées affichent leurs conditions en rouge et se recrutent aux niveaux 2 et 3', async ({
  page,
}) => {
  test.setTimeout(180000);
  const now = Date.now();
  let state = createState('ages-browser', now);
  const realm = addPlayer(state, 'a', 'Les Cinq Âges', 'MASK', now);
  realm.wallet = { GOLD: 1000000, WOOD: 1000000, STONE: 1000000, IRON: 1000000, FOOD: 1000000 };
  for (const p of disk(realm.capital, 5)) writeTile(state, p, { terrain: 'PLAIN' });
  const b = addBuilding(state, realm, { q: 1, r: 0 }, 'BARRACKS', now);
  b.level = 1;
  const arsenal = addBuilding(state, realm, { q: -1, r: 1 }, 'ARSENAL', now);
  arsenal.level = 2;
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
      body: `export function io(){const h={};window.__campaignRefresh=()=>window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
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
  await page.waitForFunction(
    () => (window as any).__agesScene?.registry.get('map:prepared') === true,
  );
  await page.evaluate((b) => {
    window.dispatchEvent(new CustomEvent('vm:camera', { detail: b }));
    (window as any).__agesStore.setState({
      selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
      panel: null,
    });
  }, b);
  await expect(page.locator('.selection-panel h2')).toHaveText('Caserne');
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  for (const family of [
    'Principautés du Sang',
    'Corsaires des Abysses',
    'Pacte des Ronces',
    'Légions du Givre',
  ]) {
    await page.getByRole('button', { name: family, exact: true }).click();
    await expect(page.locator('.catalog article')).toHaveCount(3);
    await expect(page.locator('.catalog-status').first()).toHaveCSS('color', 'rgb(242, 155, 140)');
    await expect(page.locator('.catalog article').first()).toContainText('niveau 2 nécessaire');
    await expect(
      page.locator('.catalog article').first().getByText('Forge (manquant)', { exact: true }),
    ).toHaveCSS('color', 'rgb(242, 155, 140)');
  }
  b.level = 2;
  addBuilding(state, realm, { q: 3, r: 3 }, 'FORGE', now);
  await page.evaluate(() => (window as any).__campaignRefresh());
  const recruit = page
    .locator('.catalog article')
    .filter({ has: page.getByRole('heading', { name: 'Chasseur polaire', exact: true }) });
  await expect(recruit).toContainText('Prêt à recruter');
  await expect(recruit.locator('.recruitment-missing')).toHaveCount(0);
  await recruit.getByRole('button', { name: 'Recruter · 1 PA', exact: true }).click();
  await expect
    .poll(() => Object.values(state.units).filter((u) => u.kind === 'GIVR_MUSKET').length)
    .toBe(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate((b) => {
    (window as any).__agesStore.setState({
      selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
      panel: null,
    });
  }, arsenal);
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  await page.getByRole('button', { name: 'Corsaires des Abysses', exact: true }).click();
  await expect(page.locator('.catalog article')).toHaveCount(3);
  const diver = page
    .locator('.catalog article')
    .filter({ has: page.getByRole('heading', { name: 'Commando scaphandrier', exact: true }) });
  await expect(diver).toContainText('niveau 3 nécessaire');
  arsenal.level = 3;
  // Recruitment replaces state transactionally; update the current state, not the earlier reference.
  state.buildings[arsenal.id].level = 3;
  await page.evaluate(() => (window as any).__campaignRefresh());
  await expect(diver).toContainText('Prêt à recruter');
  await page.screenshot({ path: 'test-results/campaign-recruitment.png' });
  await diver.getByRole('button', { name: 'Recruter · 1 PA', exact: true }).click();
  await expect
    .poll(() => Object.values(state.units).filter((u) => u.kind === 'ABYS_RIFLE').length)
    .toBe(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('les 96 figurines sont transparentes, isolées et visibles', async ({ page }) => {
  const template = await (await page.request.get('/')).text();
  await page.route('**/campaign-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace(
        '/src/main.tsx',
        `/@fs/${resolve('tests/fixtures/campaign-units.tsx')}`,
      ),
    }),
  );
  await page.setViewportSize({ width: 1300, height: 1100 });
  await page.goto('/campaign-review');
  await expect(page.locator('.miniature')).toHaveCount(96);
  await expect
    .poll(() =>
      page
        .locator('.miniature')
        .evaluateAll(
          (nodes) => nodes.filter((n) => getComputedStyle(n).backgroundImage !== 'none').length,
        ),
    )
    .toBe(96);
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
    [...CAMPAIGN_SHEETS],
  );
  for (const sheet of report) {
    expect(sheet.clear, sheet.name).toBeGreaterThan(0.3);
    for (const frame of sheet.frames) {
      expect(frame.filled, sheet.name).toBeGreaterThan(1500);
      expect(frame.edge, sheet.name).toBe(0);
    }
  }
  for (const family of ['blood', 'abyss', 'briar', 'frost'])
    await page
      .locator(`section[data-family="${family}"]`)
      .screenshot({ path: `test-results/campaign-${family}.png` });
});
