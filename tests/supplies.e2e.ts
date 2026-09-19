import { expect, test } from '@playwright/test';
import { UNITS, formatNumber } from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  writeTile,
  supplyCost,
  repairPlan,
} from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('vivres : ravitaillement, soins renforcés, groupe et bilan économique', async ({ page }) => {
  const now = Date.now();
  let state = createState('food-browser', now);
  const realm = (state.realms.pilot = createRealm(
    'pilot',
    'La légion',
    'ASH',
    { q: 0, r: 0 },
    now,
  ));
  realm.settings.tutorialCompleted = true;
  realm.wallet = { GOLD: 10000, WOOD: 10000, STONE: 10000, IRON: 10000, FOOD: 10000 };
  for (const p of disk(realm.capital, 6)) writeTile(state, p, { terrain: 'PLAIN' });
  addBuilding(state, realm, realm.capital, 'CAMP', now);
  for (const [id, kind, q] of [
    ['troop', 'RIFLEMAN', 1],
    ['tank', 'TANK', 2],
  ] as const)
    state.units[id] = {
      id,
      kind,
      ownerId: realm.id,
      q,
      r: 0,
      hp: 1,
      createdAt: now,
      updatedAt: now,
    };
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
        'create() { window.suppliesStore=useGame;',
      ),
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  await page.evaluate(() =>
    (window as any).suppliesStore.setState({
      selection: { kind: 'unit', id: 'troop', q: 1, r: 0 },
      selectedUnitIds: ['troop'],
    }),
  );
  const supplies = page.locator('.supply-details');
  await supplies.locator('summary').click();
  await expect(supplies).toContainText('Provisions : 0/8');
  await expect(supplies).toContainText('+10 %');
  const cost = supplyCost(state.units.troop).FOOD!;
  await supplies.getByRole('button', { name: /Ravitailler/ }).click();
  await expect(supplies).toContainText('Provisions : 8/8');
  expect(state.realms.pilot.wallet.FOOD).toBe(10000 - cost);
  const heal = repairPlan(state.units.troop);
  const repair = page.getByRole('button', { name: 'Soigner l’unité', exact: true });
  await expect(repair).toContainText(`+${formatNumber(heal.restored)} PV`);
  await repair.click();
  await expect(supplies).toContainText('Provisions : 7/8');
  expect(state.units.troop.hp).toBe(1 + heal.restored);
  await page.evaluate(() =>
    (window as any).suppliesStore.setState({ selectedUnitIds: ['troop', 'tank'] }),
  );
  await supplies.locator('summary').click();
  await expect(supplies).toContainText('2 PA');
  await supplies.getByRole('button', { name: /Ravitailler/ }).click();
  await expect(supplies).toContainText('Provisions complètes');
  expect(state.units.tank.provisions).toBe(8);
  await page.evaluate(() =>
    (window as any).suppliesStore.setState({
      selection: null,
      selectedUnitIds: [],
      panel: 'economy',
    }),
  );
  const balance = page.getByRole('region', { name: 'Bilan des vivres' });
  await expect(balance).toContainText('troupes et équipages');
  await expect(balance).toContainText('restent en vie');
  await page.screenshot({ path: 'test-results/food-economy.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(balance).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/food-economy-mobile.png', animations: 'disabled' });
  expect(errors).toEqual([]);
});
