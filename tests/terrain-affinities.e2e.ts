import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import {
  createState,
  createRealm,
  disk,
  writeTile,
  estimateDamage,
  tileAt,
  unitStats,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { formatNumber } from '@voidmarch/config';

test('affinités : recherche par terrain, fiches, estimation puis dégâts réels sur mobile', async ({
  page,
}) => {
  page.setDefaultTimeout(15000);
  const now = Date.now();
  let state = createState('terrain-browser', now);
  const realm = addPlayer(state, 'a', 'Ronces', 'MASK', now);
  realm.protectedUntil = 0;
  realm.wallet = { GOLD: 1000000, WOOD: 1000000, STONE: 1000000, IRON: 1000000, FOOD: 1000000 };
  state.realms.b = createRealm('b', 'Givre', 'ASH', { q: 10, r: 0 }, now);
  state.realms.b.protectedUntil = 0;
  for (const p of disk({ q: 0, r: 0 }, 5)) writeTile(state, p, { terrain: 'PLAIN' });
  const arsenal = addBuilding(state, realm, { q: 1, r: 0 }, 'ARSENAL', now);
  arsenal.level = 3;
  addBuilding(state, realm, { q: -1, r: 0 }, 'MUNITIONS', now);
  state.units.shooter = {
    id: 'shooter',
    kind: 'RONC_RIFLE',
    ownerId: 'a',
    q: 1,
    r: 1,
    hp: 100,
    createdAt: now,
    updatedAt: now,
  };
  state.units.target = {
    ...state.units.shooter,
    id: 'target',
    kind: 'GIVR_RIFLE',
    ownerId: 'b',
    q: 2,
    hp: 500,
  };
  writeTile(state, state.units.shooter, { terrain: 'FOREST' });
  writeTile(state, state.units.target, { terrain: 'HILL' });
  const view = () =>
    worldView(state, 'a', now, [
      { q: 0, r: 0 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: -1, r: -1 },
    ]);
  await page.exposeFunction('catalogSetup', () => ({
    session: {
      token: 'terrain-test',
      user: { id: 'a', username: 'Ronces', faction: 'MASK', guest: true },
    },
    world: view(),
    selection: { kind: 'building', id: arsenal.id, q: arsenal.q, r: arsenal.r },
  }));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const result = execute(state, 'a', actionSchema.parse(raw), now);
    state = result.state;
    return { result: result.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  const template = await (await page.request.get('/')).text();
  await page.route('**/terrain-affinity-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace(
        '/src/main.tsx',
        `/@fs/${resolve('tests/fixtures/catalog-browser.tsx')}`,
      ),
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/terrain-affinity-review');
  await page.getByLabel('Univers', { exact: true }).selectOption('briar');
  const rifle = page.locator('.catalog article').filter({
    has: page.getByRole('heading', { name: unitStats(state.units.shooter).name, exact: true }),
  });
  await expect(rifle.locator('.terrain-affinity-card')).toContainText('Forêt ancienne');
  await expect(rifle.locator('.terrain-affinity-card')).toContainText('ATQ +25 %');
  await page.getByLabel('Univers', { exact: true }).selectOption('all');
  await page.getByRole('searchbox').fill('montagne');
  await expect(
    page.locator('.catalog article').first().locator('.terrain-affinity-card'),
  ).toContainText('Montagne rocheuse');
  await page.screenshot({ path: 'test-results/terrain-recruitment.png' });
  const estimate = estimateDamage(
    state.units.shooter,
    state.units.target,
    tileAt(state, state.units.target),
    Object.values(state.units),
    tileAt(state, state.units.shooter).terrain,
  );
  await page.evaluate(() => {
    (window as any).catalogStore.setState({
      selection: { kind: 'unit', id: 'shooter', q: 1, r: 1 },
      panel: null,
      combatTarget: 'target',
    });
  });
  await expect(page.getByRole('dialog')).toContainText('Attaquant · Forêt ancienne');
  await expect(page.locator('.combat-terrain-bonuses')).toContainText('ATQ +25 %');
  await expect(page.locator('.combat-terrain-bonuses')).toContainText('DÉF +20 %');
  await expect(page.locator('.damage-estimate strong')).toHaveText(
    `${formatNumber(estimate.min)}–${formatNumber(estimate.max)}`,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.getByRole('dialog').evaluate((e) => e.scrollWidth <= e.clientWidth + 1))
    .toBe(true);
  await page.screenshot({ path: 'test-results/terrain-combat-mobile.png' });
  const hp = state.units.target.hp;
  await expect(
    page.getByRole('button', { name: 'Confirmer l’attaque · 1 PA', exact: true }),
  ).toHaveAttribute('aria-keyshortcuts', 'Space');
  await page.keyboard.press('Space');
  await expect.poll(() => hp - state.units.target.hp).toBeGreaterThanOrEqual(estimate.min);
  expect(hp - state.units.target.hp).toBeLessThanOrEqual(estimate.max);
  expect(errors).toEqual([]);
});
