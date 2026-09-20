import { test, expect } from './fixtures/game-test';
import { resolve } from 'node:path';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { missionOffers } from '../apps/server/src/missions';
import { actionSchema } from '@voidmarch/protocol';
import { prepareDevelopment } from './fixtures/development';

test('équilibrage : jalons expliqués, amélioration sous le feu, vivres et abandon sans ressources', async ({
  page,
}) => {
  const now = Date.now();
  let state = createState('balance-ui', now);
  const realm = addPlayer(state, 'a', 'Équilibre', 'ASH', now);
  const building = addBuilding(
    state,
    realm,
    { q: realm.capital.q + 1, r: realm.capital.r },
    'BARRACKS',
    now,
    3,
  );
  state.units.soldier = {
    id: 'soldier',
    ownerId: 'a',
    kind: 'INFANTRY',
    ...realm.capital,
    hp: 35,
    createdAt: now,
    updatedAt: now,
  };
  const accepted = execute(
    state,
    'a',
    actionSchema.parse({
      type: 'MISSION_ACCEPT',
      actorId: 'a',
      payload: { offerId: missionOffers(state, 'a', now)[0].id },
      actionId: crypto.randomUUID(),
      clientTimestamp: now,
    }),
    now,
  );
  expect(accepted.result.accepted).toBe(true);
  state = accepted.state;
  state.realms.a.wallet = { GOLD: 0, WOOD: 0, STONE: 0, IRON: 0, FOOD: 0 };
  state.realms.a.foodShortageMinutes = 15;
  const snapshot = () => worldView(state, 'a', now);
  await page.exposeFunction('catalogSetup', () => ({
    session: {
      token: 'test',
      user: { id: 'a', username: 'Équilibre', faction: 'ASH', guest: true },
    },
    world: snapshot(),
  }));
  await page.exposeFunction('fixtureSnapshot', snapshot);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const result = execute(state, 'a', actionSchema.parse(raw), now);
    state = result.state;
    return { result: result.result, world: snapshot() };
  });
  await page.exposeFunction('fixtureCombat', () => {
    prepareDevelopment(state, 'a', 3, now);
    state.buildings[building.id].lastDamagedAt = now;
    return snapshot();
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  const template = await (await page.request.get('/')).text();
  await page.route('**/balance-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace(
        '/src/main.tsx',
        `/@fs/${resolve('tests/fixtures/balance-browser.tsx')}`,
      ),
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/balance-review');
  const development = page.getByRole('region', { name: 'Progression du royaume' });
  await expect(development).toContainText('Fondations (1/5)');
  await development.locator('summary').click();
  await expect(development).toContainText('Atelier');
  await expect(development).toContainText('Marché');
  await page.getByRole('button', { name: 'Améliorer · 2 PA', exact: true }).click();
  await expect(page.locator('.upgrade-preview .negative')).toContainText('Palier Industrie');
  await expect(
    page.getByRole('button', { name: 'Confirmer l’amélioration · 2 PA', includeHidden: true }),
  ).toBeDisabled();
  await page.evaluate(async () =>
    (window as any).catalogStore.setState({ world: await (window as any).fixtureCombat() }),
  );
  await expect(page.locator('.upgrade-preview .negative')).toContainText('90 secondes');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.locator('.supply-details summary').click();
  await expect(page.locator('.supply-details')).toContainText('Pénurie : 15 min');
  await page.getByRole('button', { name: 'Abandonner…' }).click();
  const abandon = page.getByRole('button', { name: 'Confirmer l’abandon' });
  await expect(abandon).toBeEnabled();
  await abandon.click();
  await expect(page.getByRole('status').filter({ hasText: 'Réorganisation' })).toContainText(
    'Réorganisation après abandon',
  );
  await expect(page.locator('.mission-card')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Expéditions & aventures' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Réorganisation' })).toHaveCount(1);
  await expect(page.getByRole('status').filter({ hasText: 'Réorganisation' })).toContainText(
    'Réorganisation',
  );
  await expect(page.getByText('Aucun site compatible', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Nouvelles offres dans', { exact: false })).toHaveCount(0);
  await expect(page.locator('.expeditions-panel')).toContainText('récupérer coûte 3 PA');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/balance-v08.png', fullPage: true });
  expect(errors).toEqual([]);
});
