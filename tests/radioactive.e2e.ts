import { expect, test } from '@playwright/test';
import { BUILDINGS, UNITS, type BuildingKind } from '@voidmarch/config';
import { createState, createRealm, disk, realmUnits, writeTile } from '@voidmarch/game-rules';
import {
  addBuilding,
  addPlayer,
  execute,
  worldView,
  defaultOptions,
} from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('division atomique : catalogue, recrutement depuis les bâtiments existants et hélicoptères', async ({
  page,
}) => {
  const now = Date.now();
  let state = createState('aviation-browser', now);
  const id = 'pilot';
  const realm = addPlayer(state, id, 'Escadrille noire', 'ASH', now);
  realm.wallet = { GOLD: 5000, WOOD: 5000, STONE: 5000, IRON: 5000, FOOD: 5000 };
  realm.protectedUntil = 0;
  const positions = disk({ q: 0, r: 0 }, 5).filter((p) => p.q !== 0 || p.r !== 0);
  const buildings = (Object.keys(BUILDINGS) as BuildingKind[]).map((kind, i) =>
    addBuilding(state, realm, positions[i], kind, now),
  );
  buildings.forEach((b) => (b.population = 100));
  buildings.find((b) => b.kind === 'ARSENAL')!.level = 3;
  const airfield = buildings.find((b) => b.kind === 'AERODROME')!;
  state.realms.enemy = createRealm('enemy', 'Rivaux', 'IRON', { q: 5, r: 0 }, now);
  state.realms.enemy.protectedUntil = 0;
  state.units.enemy = {
    id: 'enemy-plane',
    ownerId: 'enemy',
    kind: 'FIGHTER',
    q: 1,
    r: 0,
    hp: 18,
    createdAt: now,
    updatedAt: now,
  };
  state.units.sword = {
    id: 'sword',
    ownerId: id,
    kind: 'INFANTRY',
    q: 0,
    r: 0,
    hp: UNITS.INFANTRY.hp,
    createdAt: now,
    updatedAt: now,
  };
  for (const p of disk({ q: 0, r: 0 }, 6)) writeTile(state, p, { terrain: 'PLAIN' });
  const view = () =>
    worldView(state, id, Date.now(), [
      { q: -1, r: -1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 0, r: 0 },
    ]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, id, actionSchema.parse(raw), Date.now(), {
      ...defaultOptions,
      recruitBonus: () => 0,
    });
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const handlers={};const socket={on(event,fn){handlers[event]=fn;if(event==='connect')queueMicrotask(fn);return socket;},emit(event){if(['world:join','chunks:subscribe','player:ping'].includes(event))window.fixtureSnapshot().then(w=>handlers['world:snapshot']?.(w));return socket;},timeout(){return socket;},async emitWithAck(event,action){const r=await window.fixtureCommand(action);handlers['world:snapshot']?.(r.world);return r.result;},disconnect(){}};return socket;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id, username: 'Escadrille noire', faction: 'ASH', guest: true },
  };
  await page.route('**/api/**', (route) => route.fulfill({ json: session }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.board canvas')).toBeVisible();
  const recruitFrom = async (building: typeof airfield) =>
    page.evaluate(async (b) => {
      // @ts-expect-error Vite source module for UI fixture.
      const { useGame, focusMap } = await import('/src/store.ts');
      focusMap(b);
      useGame.setState({
        selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
        panel: 'recruit',
        combatTarget: null,
      });
    }, building);

  const recruit = async (buildingKind: BuildingKind, name: string) => {
    await recruitFrom(buildings.find((b) => b.kind === buildingKind)!);
    const filter = page.getByRole('checkbox', { name: /Division atomique/ });
    await filter.check();
    await expect(page.getByRole('dialog').locator('article')).toHaveCount(36);
    const card = page
      .getByRole('dialog')
      .locator('article')
      .filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(card).toContainText('Division atomique');
    await expect(card).toContainText('Réacteur noir');
    await expect(card).toContainText('Palier');
    if (buildingKind === 'ARSENAL') {
      await expect(card).toContainText('+60 %');
      await expect(card).toContainText('ATQ 44,8');
    }
    await card.getByRole('button', { name: 'Recruter · 1 PA', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect
      .poll(() => realmUnits(state, id).some((u) => UNITS[u.kind].name === name))
      .toBe(true);
  };
  await recruit('ARSENAL', 'Grenadier au radium');
  await recruit('STABLE', 'Hussard au radium');
  await recruit('GARAGE', 'Moto d’assaut isotopique');
  await recruit('TANK_FACTORY', 'Chasseur de chars isotopique');
  await recruit('AERODROME', 'Intercepteur isotopique');
  await recruit('HELIPAD', 'Hélicoptère isotopique');
  await page.screenshot({ path: 'test-results/atomic-world.png' });
  await recruitFrom(buildings.find((b) => b.kind === 'HELIPAD')!);
  await page.getByRole('tab', { name: 'Hélicoptères', exact: true }).click();
  await expect(page.getByRole('dialog').locator('article')).toHaveCount(6);
  await page.screenshot({ path: 'test-results/atomic-helicopters.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Motos', exact: true }).click();
  await page.getByRole('checkbox', { name: /Division atomique/ }).check();
  await expect(page.getByRole('dialog').locator('article')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/atomic-motorcycles-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
