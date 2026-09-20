import { test, expect } from './fixtures/game-test';
import { resolve } from 'node:path';

test('les 54 bâtiments disposent de quatre évolutions distinctes, transparentes et sans débordement', async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const template = await (await page.request.get('/')).text();
  await page.route('**/ages-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace(
        '/src/main.tsx',
        `/@fs/${resolve('tests/fixtures/building-ages.tsx')}`,
      ),
    }),
  );
  await page.goto('/ages-review');
  await expect(page.locator('[data-building]')).toHaveCount(54);
  const report = await page.evaluate(async () => {
    // @ts-expect-error Vite fixture import.
    const { buildingAtlas } = await import('/src/building-art.ts');
    const results = [];
    for (const section of document.querySelectorAll('[data-building]')) {
      const kind = section.getAttribute('data-building')!;
      const atlas = await buildingAtlas(kind),
        ctx = atlas.getContext('2d')!;
      const signatures = [];
      for (let frame = 0; frame < 4; frame++) {
        const pixels = ctx.getImageData(frame * 256, 0, 256, 256).data;
        let count = 0,
          edge = 0;
        let signature = 2166136261;
        for (let y = 0; y < 256; y++)
          for (let x = 0; x < 256; x++) {
            const offset = (y * 256 + x) * 4;
            if (pixels[offset + 3]) {
              count++;
              if (x < 18 || x >= 238 || y < 18 || y >= 238) edge++;
            }
            signature = Math.imul(signature ^ pixels[offset], 16777619);
          }
        signatures.push(signature);
        results.push({ kind, frame, count, edge });
      }
      if (new Set(signatures).size !== 4) throw new Error('Evolutions identiques : ' + kind);
      const raw = new Image();
      raw.src = `/assets/ages/${kind.toLowerCase()}.png`;
      await raw.decode();
      const c = document.createElement('canvas');
      c.width = raw.width;
      c.height = raw.height;
      const context = c.getContext('2d')!;
      context.drawImage(raw, 0, 0);
      const alpha = context.getImageData(0, 0, c.width, c.height).data;
      let clear = 0;
      for (let i = 3; i < alpha.length; i += 4) if (alpha[i] === 0) clear++;
      if (clear / (alpha.length / 4) < 0.15) throw new Error('Fond non transparent : ' + kind);
    }
    return results;
  });
  expect(report).toHaveLength(216);
  for (const r of report) {
    expect(r.count, `${r.kind}:${r.frame}`).toBeGreaterThan(500);
    expect(r.edge, `${r.kind}:${r.frame}`).toBe(0);
  }
  await page.screenshot({ path: 'test-results/building-ages.png' });
  await page
    .locator('[data-building="BARRACKS"]')
    .screenshot({ path: 'test-results/barracks-ages.png' });
  await page.locator('[data-building="MINE"]').screenshot({ path: 'test-results/mine-ages.png' });
  await page
    .locator('[data-building="VILLAGE"]')
    .screenshot({ path: 'test-results/village-ages.png' });
  expect(errors).toEqual([]);
});

import { createState, disk, writeTile } from '@voidmarch/game-rules';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('carte et fenêtre d’amélioration : niveaux 3 → 4 → 5, chargement à la demande et recrutement débloqué', async ({
  page,
}) => {
  test.setTimeout(180000);
  const now = Date.now();
  let state = createState('ages-browser', now);
  const realm = addPlayer(state, 'a', 'Les Cinq Âges', 'MASK', now);
  realm.wallet = { GOLD: 1000000, WOOD: 1000000, STONE: 1000000, IRON: 1000000, FOOD: 1000000 };
  for (const p of disk(realm.capital, 5)) writeTile(state, p, { terrain: 'PLAIN' });
  const b = addBuilding(state, realm, { q: 1, r: 0 }, 'BARRACKS', now);
  b.level = 3;
  addBuilding(state, realm, { q: 2, r: 1 }, 'RADIO', now);
  addBuilding(state, realm, { q: 3, r: 1 }, 'NUCLEAR_REACTOR', now);
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
    (window as any).__agesScene?.textures.exists('building-ages-v1:BARRACKS'),
  );
  await page.evaluate((b) => {
    window.dispatchEvent(new CustomEvent('vm:camera', { detail: b }));
    (window as any).__agesStore.setState({
      selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
      panel: null,
    });
  }, b);
  await expect(page.locator('.selection-panel h2')).toHaveText('Caserne');
  for (const level of [4, 5]) {
    await page.getByRole('button', { name: 'Améliorer · 2 PA', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.building-age-comparison .miniature')).toHaveCount(2);
    await expect(dialog).toContainText(level === 4 ? 'Commando de l’éclipse' : 'Garde à neutrons');
    await expect(dialog.locator('.building-age-comparison .miniature').last()).toHaveCSS(
      'background-image',
      /data:image/,
    );
    await page.screenshot({ path: `test-results/upgrade-age-${level}.png` });
    await dialog.getByRole('button', { name: 'Confirmer l’amélioration · 2 PA' }).click();
    await expect.poll(() => state.buildings[b.id].level).toBe(level);
    await expect(page.locator('.selection-panel')).toContainText(`Niveau ${level}/5`);
  }
  // Unavailable actions are hidden throughout the selection toolbar.
  await expect(page.getByRole('button', { name: 'Améliorer · 2 PA', exact: true })).toHaveCount(0);
  expect(sheets.size).toBe(1);
  await page.screenshot({ path: 'test-results/atomic-barracks-map.png' });
  expect(errors).toEqual([]);
});
