import { expect, test } from '@playwright/test';
import { createState, disk, key, writeTile } from '@voidmarch/game-rules';
import { UNITS } from '@voidmarch/config';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('sélection mixte, aperçu, confirmation atomique, PA, animations et mobile', async ({
  page,
}) => {
  page.setDefaultTimeout(15000);
  const now = Date.now(),
    id = 'pilot';
  let state = createState('group-browser', now),
    orders = 0;
  const realm = addPlayer(state, id, 'Armée', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  realm.settings.reducedMotion = false;
  realm.settings.lastCameraQ = 0;
  realm.settings.lastCameraR = 0;
  state.units = {};
  for (const p of disk({ q: 0, r: 0 }, 12)) {
    writeTile(state, p, { terrain: 'PLAIN', ownerId: undefined, road: false });
    realm.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
  }
  for (const [index, kind] of (['PEASANT', 'HERO', 'RIFLEMAN'] as const).entries()) {
    state.units[`u${index}`] = {
      id: `u${index}`,
      ownerId: id,
      kind,
      q: 0,
      r: index * 2,
      hp: UNITS[kind].hp,
      createdAt: now,
      updatedAt: now,
    };
  }
  const view = () => worldView(state, id, now, disk({ q: 0, r: 0 }, 1));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureAP', (ap: number) => {
    state.realms[id].ap = ap;
    state.realms[id].apAt = now;
    state.revision++;
    return view();
  });
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    orders++;
    const r = execute(state, id, actionSchema.parse(raw), now);
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};window.__groupSocketSnapshot=(w)=>h['world:snapshot']?.(w);let delayed=false;const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s;},emit(e){if(e==='world:sync'&&delayed)return s;if(['world:join','chunks:subscribe','player:ping','world:sync'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s;},timeout(){return s;},async emitWithAck(e,a){await new Promise(r=>setTimeout(r,500));const result=await window.fixtureCommand(a);if(a.type==='ARMY_SAVE'){delayed=true;setTimeout(()=>{delayed=false;h['world:snapshot']?.(result.world);},350);return result.result;}h['world:snapshot']?.(result.world);return result.result;},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id, username: 'Armée', faction: 'ASH', guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.__groupScene = this; window.__groupStore = useGame;',
      ),
    });
  });
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(async () => {
    const scene = (window as any).__groupScene;
    scene.cameras.main.setZoom(0.8).centerOn(0, 100);
    scene.renderMap();
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  // Actual canvas events check the Shift key wiring; projection derived below from the source module.
  const canvasClick = async (q: number, r: number, shift = false) => {
    const p = await page.evaluate(
      async ({ q, r }) => {
        // @ts-expect-error Vite source module.
        const { hexToPixel } = await import('/src/map-geometry.ts');
        const px = hexToPixel({ q, r }),
          c = (window as any).__groupScene.cameras.main;
        const origin = c.getWorldPoint(0, 0),
          step = c.getWorldPoint(1, 1);
        return {
          x: (px.x - origin.x) / (step.x - origin.x),
          y: (px.y - origin.y) / (step.y - origin.y),
        };
      },
      { q, r },
    );
    await page.locator('.board canvas').click({ position: p, modifiers: shift ? ['Shift'] : [] });
  };
  await canvasClick(0, 0);
  await expect(page.getByRole('button', { name: 'Sélection multiple', exact: true })).toBeVisible();
  await canvasClick(0, 2, true);
  await expect(page.locator('.group-movement h2')).toContainText('2 troupes');
  // The range appears immediately, without choosing a target or spending PA.
  await expect(page.locator('.group-range-legend')).toContainText('Toutes les troupes');
  const rangeSize = () =>
    page.evaluate(() => (window as any).__groupScene.highlights.getData('groupRangeCount'));
  await expect.poll(rangeSize).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__groupStore.getState().groupTarget)).toBeNull();
  expect(orders).toBe(0);
  await page.keyboard.press('d');
  await page.keyboard.press('Space');
  expect(orders).toBe(0);
  await expect.poll(rangeSize).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/group-movement-range.png' });

  await page.evaluate(() => (window as any).__groupScene.click({ q: 8, r: 0 }));
  await expect(page.getByRole('button', { name: 'Confirmer · 2 PA', exact: true })).toBeEnabled();
  expect(orders).toBe(0);
  await expect(page.locator('.group-roster-list')).toContainText('Paysan');
  await page.evaluate(async () =>
    (window as any).__groupSocketSnapshot(await (window as any).fixtureAP(1)),
  );
  await expect
    .poll(() => page.evaluate(() => (window as any).__groupStore.getState().world.player.ap))
    .toBe(1);
  await expect(
    page.locator('.group-movement button').filter({ hasText: 'Confirmer · 2 PA' }),
  ).toBeDisabled();
  await expect(page.locator('.group-movement')).toContainText('PA insuffisants');
  await page.keyboard.press('Space');
  expect(orders).toBe(0);
  await page.evaluate(async () =>
    (window as any).__groupSocketSnapshot(await (window as any).fixtureAP(40)),
  );
  await page.screenshot({ path: 'test-results/group-movement-preview.png' });
  await expect(page.getByRole('button', { name: 'Confirmer · 2 PA', exact: true })).toHaveAttribute(
    'aria-keyshortcuts',
    'Space',
  );
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'group-shortcut-input';
    document.body.append(input);
    input.focus();
  });
  await page.keyboard.press('Space');
  expect(orders).toBe(0);
  await page.locator('#group-shortcut-input').evaluate((el) => el.remove());
  await page.keyboard.press('Space');
  await expect(page.locator('.group-movement')).toContainText('Ordre du groupe en cours');
  await page.keyboard.press('Space'); // A pending action cannot be submitted twice.
  await expect
    .poll(() =>
      page.evaluate(() => Object.keys((window as any).__groupStore.getState().movements).length),
    )
    .toBe(2);
  await expect.poll(() => orders).toBe(1);
  await expect
    .poll(() => page.evaluate(() => (window as any).__groupStore.getState().pending))
    .toBe(false);
  expect(state.realms[id].ap).toBe(38);
  expect(state.units.u0.q).toBeGreaterThan(0);
  expect(state.units.u1.q).toBeGreaterThan(0);
  await page.getByLabel('Formation du groupe').selectOption('PROTECTED');
  await page.getByRole('button', { name: /^Déplacer/ }).click();
  await page.evaluate(() => (window as any).__groupScene.click({ q: 8, r: 1 }));
  await page.getByText('Enregistrer cette armée', { exact: true }).click();
  await page.getByLabel('Nom de l’armée', { exact: true }).fill('Les Corbeaux');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Mettre à jour « Les Corbeaux »', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__groupStore.getState().groupTarget)).toEqual({
    q: 8,
    r: 1,
  });
  expect(await page.evaluate(() => (window as any).__groupStore.getState().mode)).toBe('move');
  await expect.poll(() => state.realms[id].armies?.length ?? 0).toBe(1);
  await expect
    .poll(() => page.evaluate(() => (window as any).__groupStore.getState().pending))
    .toBe(false);
  await page.evaluate(() => (window as any).__groupStore.setState({ panel: 'army' }));
  await expect(page.locator('.saved-armies')).toContainText('Les Corbeaux');
  await page.getByRole('button', { name: 'Sélectionner l’armée', exact: true }).click();
  await expect(page.getByLabel('Formation du groupe')).toHaveValue('PROTECTED');
  await expect(page.locator('.group-movement h2')).toContainText('2 troupes');
  expect(state.realms[id].ap).toBe(38);
  await page.getByLabel('Formation du groupe').selectOption('COMPACT');

  await page.keyboard.press('Escape');
  await expect(page.locator('.group-movement')).toHaveCount(0);
  await expect.poll(rangeSize).toBe(0);
  await page.evaluate(() => (window as any).__groupScene.click({ q: 0, r: 4 }));
  await page.getByRole('button', { name: 'Sélection multiple', exact: true }).click();
  await page.evaluate(() => {
    const store = (window as any).__groupStore;
    const u = store.getState().world.units.find((u: any) => u.id === 'u0');
    (window as any).__groupScene.click(u);
  });
  await expect(page.locator('.group-movement h2')).toContainText('2 troupes');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /^Déplacer/ }).click();
  await page.evaluate(() => (window as any).__groupScene.click({ q: 9, r: 1 }));
  await expect(page.getByRole('button', { name: 'Confirmer · 2 PA', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmer · 2 PA', exact: true })).toBeInViewport({
    ratio: 1,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/group-movement-mobile.png' });
  expect(errors).toEqual([]);
});
