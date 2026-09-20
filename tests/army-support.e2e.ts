import { expect, test } from './fixtures/game-test';
import { UNITS, formatNumber } from '@voidmarch/config';
import {
  createState,
  disk,
  writeTile,
  refreshWorldTraining,
  unitCombatStats,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('soutien : aperçu de l’amélioration, troupe existante et catalogue de recrutement', async ({
  page,
}) => {
  const now = Date.now();
  let state = createState('support-browser', now);
  const realm = addPlayer(state, 'pilot', 'La légion', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  realm.wallet = { GOLD: 1e7, WOOD: 1e7, STONE: 1e7, IRON: 1e7, FOOD: 1e7 };
  state.units = {};
  for (const p of disk({ q: 0, r: 0 }, 7)) writeTile(state, p, { terrain: 'PLAIN' });
  const first = addBuilding(state, realm, { q: 1, r: 0 }, 'BARRACKS', now, 5);
  const second = addBuilding(state, realm, { q: 2, r: 0 }, 'BARRACKS', now, 2);
  state.units.troop = {
    id: 'troop',
    kind: 'INFANTRY',
    ownerId: 'pilot',
    q: 0,
    r: 1,
    hp: UNITS.INFANTRY.hp / 2,
    createdAt: now,
    updatedAt: now,
  };
  writeTile(state, state.units.troop, { terrain: 'RUINS' });
  refreshWorldTraining(state, now);
  const view = () =>
    worldView(state, 'pilot', now, [
      { q: 0, r: 0 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
    ]);
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const result = execute(state, 'pilot', actionSchema.parse(raw), now);
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
        user: { id: 'pilot', username: 'La légion', faction: 'ASH', guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.supportStore=useGame;',
      ),
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  await page.evaluate(
    (b) =>
      (window as any).supportStore.setState({
        selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
        panel: null,
      }),
    second,
  );
  await page.getByRole('button', { name: 'Améliorer · 2 PA', exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.locator('.training-upgrade')).toContainText(
    'Gains militaires de cette amélioration',
  );
  await expect(modal.locator('.training-upgrade')).toContainText('défense : +3 → +6 %');
  await expect(modal.locator('.training-upgrade')).toContainText(
    'affinités de terrain : +0 → +1 pt',
  );
  await modal.locator('.training-upgrade').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/army-support-upgrade.png', animations: 'disabled' });
  await modal.getByRole('button', { name: 'Confirmer l’amélioration · 2 PA' }).click();
  await expect.poll(() => state.buildings[second.id].level).toBe(3);
  await page.evaluate(() =>
    (window as any).supportStore.setState({
      selection: { kind: 'unit', id: 'troop', q: 0, r: 1 },
      panel: null,
    }),
  );
  await expect(page.locator('.selection-panel .army-support')).toContainText('+6 % défense');
  await expect(page.locator('.selection-panel .terrain-affinity-details summary')).toContainText(
    'ATQ +16 %',
  );
  await page.getByRole('button', { name: `Origine des bonus de ${UNITS.INFANTRY.name}` }).click();
  const origins = page.getByRole('dialog', { name: `Origine des bonus · ${UNITS.INFANTRY.name}` });
  await expect(origins).toContainText('Caserne · niveau 5 · (1, 0)');
  await expect(origins.locator('.training-source-list')).toContainText(
    'Caserne · niveau 3 · (2, 0)',
  );
  await expect(origins.locator('.training-source-list')).toContainText('défense +6 %');
  await expect(origins.locator('.training-source-list')).toContainText('Rendement : 100 %');
  await page.screenshot({ path: 'test-results/training-origins.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await origins.locator('.training-source-list').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'test-results/training-origins-mobile.png',
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(origins).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 960 });
  // Historical training may exceed every facility that is still owned.
  await page.evaluate(() => {
    const store = (window as any).supportStore;
    const world = structuredClone(store.getState().world);
    world.units.find((u: any) => u.id === 'troop').trainingBonus = 150;
    store.setState({ world });
  });
  await page.getByRole('button', { name: `Origine des bonus de ${UNITS.INFANTRY.name}` }).click();
  await expect(origins).toContainText('Entraînement acquis conservé');
  await expect(origins).toContainText('bâtiment d’origine historique n’a pas été enregistré');
  await page.keyboard.press('Escape');
  await page.evaluate(async () =>
    (window as any).supportStore.setState({ world: await (window as any).fixtureSnapshot() }),
  );
  const defense = unitCombatStats(state.units.troop, 'RUINS').defense;
  await expect(
    page.locator('.unit-stats > div').filter({ hasText: 'DÉFENSE' }).locator('strong'),
  ).toHaveText(formatNumber(defense));
  await page.evaluate(
    (b) =>
      (window as any).supportStore.setState({
        selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
        panel: 'recruit',
      }),
    first,
  );
  await page.getByRole('dialog').getByRole('searchbox').fill(UNITS.INFANTRY.name);
  const card = page
    .locator('.catalog article')
    .filter({ has: page.getByRole('heading', { name: UNITS.INFANTRY.name, exact: true }) });
  await expect(card.locator('.terrain-affinity-card')).toContainText('ATQ +16 %');
  await card.locator('.catalog-details summary').click();
  await expect(card.locator('.army-support')).toContainText('+6 % défense');
  await page.setViewportSize({ width: 390, height: 844 });
  await card.locator('.army-support').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/army-support-mobile.png', animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
