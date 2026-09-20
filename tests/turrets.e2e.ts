import { expect, test } from './fixtures/game-test';
import { createState, createRealm, disk, writeTile } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('porte : tourelle, trois évolutions, tir et retour au mur sans route', async ({ page }) => {
  const now = Date.now();
  let state = createState('turret-browser', now);
  const realm = addPlayer(state, 'a', 'Les Remparts', 'ASH', now);
  realm.protectedUntil = 0;
  realm.settings.reducedMotion = false;
  realm.wallet = { GOLD: 5000, WOOD: 5000, STONE: 5000, IRON: 5000, FOOD: 5000 };
  state.realms.b = createRealm('b', 'Assiégeants', 'MASK', { q: 4, r: 0 }, now);
  state.realms.b.protectedUntil = 0;
  for (const p of disk({ q: 0, r: 0 }, 6)) writeTile(state, p, { terrain: 'PLAIN' });
  const wall = addBuilding(state, realm, { q: 1, r: 0 }, 'WOOD_WALL', now);
  writeTile(state, wall, { road: true });
  const second = addBuilding(state, realm, { q: 1, r: 1 }, 'STONE_WALL', now);
  second.turretLevel = 2;
  const third = addBuilding(state, realm, { q: 2, r: -1 }, 'WOOD_WALL', now);
  third.turretLevel = 1;
  state.units.worker = {
    id: 'worker',
    kind: 'PEASANT',
    ownerId: 'a',
    q: 0,
    r: 1,
    hp: 5,
    createdAt: now,
    updatedAt: now,
  };
  state.units.enemy = {
    id: 'enemy',
    kind: 'GUARD',
    ownerId: 'b',
    q: 4,
    r: 0,
    hp: 500,
    createdAt: now,
    updatedAt: now,
  };
  const view = () =>
    worldView(state, 'a', Date.now(), [
      { q: 0, r: 0 },
      { q: 0, r: -1 },
    ]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, 'a', actionSchema.parse(raw), Date.now());
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /\bcreate\(\)\s*\{/,
      'create() { window.__turretScene=this;',
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
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await page.waitForFunction(() => (window as any).__turretScene?.view, undefined, {
    timeout: 20000,
  });
  await page.evaluate(async (b) => {
    // @ts-expect-error Vite source module.
    const { useGame, focusMap } = await import('/src/store.ts');
    focusMap(b);
    useGame.setState({
      selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
      mode: 'inspect',
    });
  }, wall);
  await expect(page.getByRole('heading', { name: 'Porte · Palissade en bois' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        (id) => (window as any).__turretScene.children.getByName(`wall:${id}`)?.getData('gate'),
        wall.id,
      ),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Installer une tourelle · 2 PA', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Arbalète de rempart');
  await page.getByRole('button', { name: 'Installer la tourelle · 2 PA', exact: true }).click();
  await expect.poll(() => state.buildings[wall.id].turretLevel).toBe(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Améliorer la tourelle · 2 PA', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Améliorez d’abord le mur');
  await expect(
    page.getByRole('button', { name: 'Confirmer l’évolution · 2 PA', exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  for (const level of [2, 3]) {
    await page.getByRole('button', { name: 'Améliorer le mur · 2 PA', exact: true }).click();
    await page
      .getByRole('button', { name: 'Confirmer l’amélioration · 2 PA', exact: true })
      .click();
    await expect
      .poll(() => state.buildings[wall.id].kind)
      .toBe(level === 2 ? 'STONE_WALL' : 'STEEL_WALL');
    await page.getByRole('button', { name: 'Améliorer la tourelle · 2 PA', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmer l’évolution · 2 PA', exact: true }).click();
    await expect.poll(() => state.buildings[wall.id].turretLevel).toBe(level);
  }
  await expect(
    page.getByRole('button', { name: 'Améliorer la tourelle · 2 PA', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Tirer avec la tourelle · 1 PA', exact: true }).click();
  await page.screenshot({ path: 'test-results/turrets-range.png' });
  await page.evaluate(() => {
    (window as any).__turretScene.click({ q: 4, r: 0 });
  });
  await expect(page.getByRole('dialog')).toContainText('Tourelle Tesla occulte');
  const ap = state.realms.a.ap;
  await page.evaluate(() => {
    (window as any).__turretScene.tweens.timeScale = 0.1;
  });
  await page.getByRole('button', { name: 'Confirmer l’attaque · 1 PA', exact: true }).click();
  await expect.poll(() => state.units.enemy.hp).toBeLessThan(500);
  expect(state.realms.a.ap).toBe(ap - 1);
  await expect
    .poll(() =>
      page.evaluate(
        () => !!(window as any).__turretScene.children.getByName('projectile:lightning'),
      ),
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/turrets-shot.png' });
  await page.evaluate(() => {
    (window as any).__turretScene.tweens.timeScale = 1;
  });
  // A route controls only the appearance, even after installing/upgrading/firing.
  for (const type of ['REMOVE_ROAD', 'ROAD'] as const) {
    await page.evaluate(
      async ({ type, wall }) => {
        // @ts-expect-error Vite source module.
        const { send, useGame } = await import('/src/store.ts');
        useGame.setState({
          selection: { kind: 'building', id: wall.id, q: wall.q, r: wall.r },
          mode: 'inspect',
        });
        await send({ type, actorId: 'a', payload: { q: wall.q, r: wall.r } });
      },
      { type, wall },
    );
    await expect
      .poll(() =>
        page.evaluate(
          (id) => (window as any).__turretScene.children.getByName(`wall:${id}`)?.getData('gate'),
          wall.id,
        ),
      )
      .toBe(type === 'ROAD');
    expect(state.buildings[wall.id]).toMatchObject({ kind: 'STEEL_WALL', turretLevel: 3 });
  }
  await expect(page.getByRole('heading', { name: 'Porte · Mur en acier' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/turrets-mobile.png' });
  expect(errors).toEqual([]);
});

test('les tourelles conservent tous les raccords et restent dans leur image', async ({ page }) => {
  await page.goto('/');
  const report = await page.evaluate(async () => {
    // @ts-expect-error Vite source module.
    const { wallCanvas, loadWallMaterials } = await import('/src/wall-art.ts');
    await loadWallMaterials();
    const results = [];
    const container = document.createElement('div');
    container.style.cssText =
      'display:grid;grid-template-columns:repeat(6,150px);gap:15px;padding:30px;background:#354538';
    document.body.replaceChildren(container);
    for (const [index, kind] of ['WOOD_WALL', 'STONE_WALL', 'STEEL_WALL'].entries())
      for (let level = 1; level <= index + 1; level++)
        for (let mask = 0; mask < 64; mask++) {
          const c = wallCanvas(kind, mask, level),
            d = c.getContext('2d').getImageData(0, 0, 256, 256).data;
          let edge = 0,
            pixels = 0;
          for (let y = 0; y < 256; y++)
            for (let x = 0; x < 256; x++)
              if (d[(y * 256 + x) * 4 + 3]) {
                pixels++;
                if (x < 4 || x >= 252 || y < 4 || y >= 252) edge++;
              }
          results.push({ id: `${kind}:${level}:${mask}`, edge, pixels });
          if ([0, 1, 9, 21, 42, 63].includes(mask)) {
            const img = document.createElement('img');
            img.src = c.toDataURL();
            img.width = 150;
            img.title = `${kind}:${level}:${mask}`;
            container.append(img);
          }
        }
    return results;
  });
  expect(report).toHaveLength(384);
  for (const r of report) {
    expect(r.edge, r.id).toBe(0);
    expect(r.pixels, r.id).toBeGreaterThan(500);
  }
  await page.screenshot({ path: 'test-results/turrets-orientations.png', fullPage: true });
});
