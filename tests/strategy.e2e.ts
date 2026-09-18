import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createState,
  createRealm,
  disk,
  writeTile,
  key,
  observe,
  tileAt,
  distance,
} from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { strategy, tickStrategy } from '../apps/server/src/strategy';
import { commandSchema } from '@voidmarch/protocol';
test('alliance, radar, chat, frappe et vue stratégique sans compte réel', async ({ page }) => {
  const now = Date.now();
  let state = createState('operations-browser', now);
  for (const [id, name, q] of [
    ['a', 'Veilleurs', 0],
    ['b', 'Les Astres', 8],
    ['c', 'Citadelle', 20],
  ] as const) {
    const r = createRealm(id, name, 'ASH', { q, r: 0 }, now);
    r.protectedUntil = 0;
    r.unlimitedAP = true;
    r.settings.bannerColor = id === 'a' ? '#8ba36a' : id === 'b' ? '#a884ce' : '#bf675b';
    r.wallet = {
      GOLD: 1_100_000,
      IRON: 1_100_000,
      STONE: 1_100_000,
      WOOD: 1_100_000,
      FOOD: 1_100_000,
    };
    state.realms[id] = r;
    addBuilding(state, r, r.capital, 'VILLAGE', now, 3);
  }
  for (const p of disk({ q: 6, r: 0 }, 27)) {
    writeTile(state, p, { terrain: p.q % 4 === 0 ? 'FOREST' : 'PLAIN' });
    state.realms.a.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
  }
  addBuilding(state, state.realms.a, { q: 1, r: 0 }, 'ROCKET_SILO', now, 5);
  addBuilding(state, state.realms.a, { q: 2, r: 0 }, 'NUCLEAR_REACTOR', now, 5);
  addBuilding(state, state.realms.a, { q: 2, r: 1 }, 'FORGE', now, 3);
  for (const q of [-2, -1, 0]) {
    addBuilding(state, state.realms.a, { q, r: 2 }, 'WOOD_WALL', now);
    writeTile(state, { q, r: 2 }, { road: true });
  }
  state.units.guard = {
    id: 'guard',
    kind: 'INFANTRY',
    ownerId: 'a',
    q: -1,
    r: 2,
    hp: 18,
    victories: 12,
    createdAt: now,
    updatedAt: now,
  };
  strategy(state, now).sites.relay = { id: 'relay', q: -4, r: 2, kind: 'RADIO' };
  observe(state, state.realms.a, now);
  const world = () =>
    worldView(state, 'a', now, [
      { q: 0, r: 0 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: -1, r: -1 },
    ]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.__operationsScene=this;',
      ),
    });
  });
  await page.route(/\/src\/store\.ts(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /async function send\(command\)\s*\{/,
        'async function send(command) { if(window.__strategySend) return window.__strategySend(command);',
      ),
    });
  });
  await page.route('**/strategy-order', async (route) => {
    const command = commandSchema.parse(JSON.parse(route.request().postData()!));
    const executed = execute(
      state,
      'a',
      { ...command, actionId: randomUUID(), clientTimestamp: now },
      now,
    );
    state = executed.state;
    await route.fulfill({ json: { result: executed.result, world: world() } });
  });
  const template = await (await page.request.get('/')).text();
  const html = template
    .replace(
      '<div id="root"></div>',
      `<div id="root"></div><script id="fixture-world" type="application/json">${JSON.stringify(world())}</script>`,
    )
    .replace('/src/main.tsx', `/@fs/${resolve('tests/fixtures/strategy.tsx')}`);
  await page.route('**/operations-fixture', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
  await page.goto('/operations-fixture');
  await expect(page.locator('.board canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Diplomatie', exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Les Veilleurs du seuil');
  await page.getByRole('button', { name: 'Fonder · 0 PA' }).click();
  await expect(page.getByRole('dialog')).toContainText('Les Veilleurs du seuil');
  await page.getByLabel('Inviter un joueur').selectOption('b');
  await page.getByRole('button', { name: 'Envoyer l’invitation · 0 PA' }).click();
  await expect.poll(() => Object.keys(state.strategy!.invitations).length).toBe(1);
  const invitation = Object.values(state.strategy!.invitations)[0];
  state = execute(
    state,
    'b',
    {
      type: 'ALLIANCE_RESPOND',
      actorId: 'b',
      payload: { invitationId: invitation.id, accept: true },
      actionId: randomUUID(),
      clientTimestamp: now,
    },
    now,
  ).state;
  await page.evaluate((w) => (window as any).__strategyStore.setState({ world: w }), world());
  await expect(page.locator('.radar-target')).toContainText('Allié · Les Astres');
  await page.getByLabel('Message', { exact: true }).fill('Protégez le relais.');
  await page.getByRole('button', { name: 'Envoyer · 0 PA', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Protégez le relais.');
  await page.screenshot({ path: 'test-results/strategy-alliance.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/strategy-mobile.png' });
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByText('Silo de test', { exact: true }).click();
  await page.getByText('☢ Arsenal atomique · niveau 5', { exact: true }).click();
  await page.getByLabel('Coordonnée Q', { exact: true }).fill('20');
  await page.getByLabel('Coordonnée R', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Préparer la frappe · 10 PA' }).click();
  await expect(page.getByRole('alert')).toContainText('Confirmer la destruction');
  await page.getByRole('button', { name: 'Lancer · 10 PA', exact: true }).click();
  await expect(page.locator('.nuclear-alerts')).toContainText('217 cases');
  await page.getByText('Silo de test', { exact: true }).click();
  await page.locator('.nuclear-alerts button').click();
  await page.evaluate(() => {
    const scene = (window as any).__operationsScene;
    scene.cameras.main.setZoom(0.6);
    scene.renderMap();
  });
  await page.waitForTimeout(300);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__operationsScene.children
          .getByName('strategic-operations')
          ?.getData('strike-hexes'),
      ),
    )
    .toBe(217);
  await page.screenshot({ path: 'test-results/strategy-nuclear.png' });
  await page.evaluate(() => {
    const scene = (window as any).__operationsScene;
    scene.cameras.main.setZoom(0.2);
    scene.renderMap();
  });
  await expect(page.locator('.board canvas')).toHaveAttribute('data-map-view', 'strategic');
  tickStrategy(state, now + 300000, new Set());
  const burnedView = world();
  // Make the affected terrain visible in this isolated visual fixture.
  burnedView.tiles = burnedView.tiles.map((t) =>
    distance(t, { q: 20, r: 0 }) <= 10
      ? {
          ...t,
          ...tileAt(state, t),
          visibility: 'VISIBLE' as const,
          building: state.buildings[tileAt(state, t).buildingId ?? ''],
        }
      : t,
  );
  expect(burnedView.tiles.filter((t) => t.terrain === 'SCORCHED')).toHaveLength(217);
  await page.evaluate((w) => {
    (window as any).__strategyStore.setState({ world: w, now: w.serverTimestamp + 300000 });
  }, burnedView);
  await expect(page.locator('.nuclear-alerts')).toHaveCount(0);
  await page.evaluate(() => {
    const scene = (window as any).__operationsScene;
    scene.cameras.main.setZoom(0.85);
    scene.renderMap();
  });
  await expect(page.locator('.board canvas')).toHaveAttribute('data-map-view', 'detailed');
  await page.screenshot({ path: 'test-results/strategy-scorched.png' });
  expect(errors).toEqual([]);
});
