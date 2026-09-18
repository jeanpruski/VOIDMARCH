import { expect, test } from '@playwright/test';
import { BUILDINGS, UNITS, RESOURCES, buildingUpgrade, type BuildingKind } from '@voidmarch/config';
import { createState, createRealm, disk, realmUnits, writeTile } from '@voidmarch/game-rules';
import {
  addBuilding,
  addPlayer,
  execute,
  worldView,
  defaultOptions,
} from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('Projet Glocke : déblocage par niveau, trois recrutements et sprites', async ({ page }) => {
  const now = Date.now();
  let state = createState('aviation-browser', now);
  const id = 'pilot';
  const realm = addPlayer(state, id, 'Escadrille noire', 'ASH', now);
  realm.wallet = { GOLD: 500000, WOOD: 500000, STONE: 500000, IRON: 500000, FOOD: 500000 };
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
    worldView(state, id, now, [
      { q: -1, r: -1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 0, r: 0 },
    ]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    // Freeze economic time so assertions isolate payments from passive upkeep.
    const r = execute(state, id, actionSchema.parse(raw), now, {
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
  const complex = buildings.find((b) => b.kind === 'GLOCKE_COMPLEX')!;
  const open = async () => {
    await page.evaluate(async (b) => {
      // @ts-expect-error Vite fixture import.
      const { useGame, focusMap } = await import('/src/store.ts');
      focusMap(b);
      useGame.setState({
        selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
        panel: 'recruit',
        combatTarget: null,
      });
    }, complex);
    await page.getByRole('tab', { name: 'Cloches occultes', exact: true }).click();
    await expect(page.getByRole('dialog').locator('article')).toHaveCount(3);
  };
  const names = [
    'Die Glocke I — Vril',
    'Die Glocke II — Nacht',
    'Die Glocke III — Götterdämmerung',
  ];
  const kinds = ['GLOCKE_VRIL', 'GLOCKE_NACHT', 'GLOCKE_APOCALYPSE'] as const;
  await open();
  await expect(page.getByRole('dialog')).toContainText('niveau 2 nécessaire');
  await expect(page.getByRole('dialog')).toContainText('niveau 3 nécessaire');
  for (let i = 0; i < 3; i++) {
    if (i) {
      await page.evaluate(async (b) => {
        // @ts-expect-error Vite fixture import.
        const { useGame } = await import('/src/store.ts');
        useGame.setState({
          panel: null,
          selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
        });
      }, complex);
      const before = { ...state.realms[id].wallet };
      const quote = buildingUpgrade('GLOCKE_COMPLEX', i)!;
      await page.getByRole('button', { name: 'Améliorer · 2 PA', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('À payer pour cette amélioration');
      await expect(dialog.getByRole('columnheader', { name: 'Après paiement' })).toBeVisible();
      const gold = dialog
        .getByRole('row')
        .filter({ has: page.getByRole('cell', { name: 'Or', exact: true }) });
      await expect(gold.getByRole('cell').nth(1)).toHaveText(
        quote.cost.GOLD!.toLocaleString('fr-FR'),
      );
      await expect(gold.getByRole('cell').nth(3)).toHaveText(
        Math.floor(before.GOLD - quote.cost.GOLD!).toLocaleString('fr-FR'),
      );
      if (i === 2) {
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(dialog).toBeVisible();
        expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await gold.scrollIntoViewIfNeeded();
        await page.screenshot({ path: '.data/economy-review/upgrade-mobile.png' });
      }
      await dialog
        .getByRole('button', { name: 'Confirmer l’amélioration · 2 PA', exact: true })
        .click();
      await expect.poll(() => state.buildings[complex.id].level).toBe(i + 1);
      for (const resource of RESOURCES)
        expect(state.realms[id].wallet[resource]).toBeCloseTo(
          before[resource] - (quote.cost[resource] ?? 0),
          3,
        );
      await page.setViewportSize({ width: 1440, height: 960 });
      await open();
    }
    const card = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: names[i], exact: true }) });
    await expect(card).toContainText('2 PA par tir');
    await expect(card.locator('.miniature')).toHaveCSS('background-image', /blob:/);
    if (i === 2) {
      await expect(card).toContainText('ATQ 102,4');
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'test-results/glocke-catalogue.png' });
    }
    const beforeRecruit = { ...state.realms[id].wallet };
    await card.getByRole('button', { name: 'Recruter · 1 PA', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => realmUnits(state, id).some((u) => u.kind === kinds[i])).toBe(true);
    for (const resource of RESOURCES)
      expect(state.realms[id].wallet[resource]).toBeCloseTo(
        beforeRecruit[resource] - UNITS[kinds[i]].cost[resource],
        3,
      );
  }
  await page.screenshot({ path: 'test-results/glocke-world.png' });
  await open();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/glocke-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
