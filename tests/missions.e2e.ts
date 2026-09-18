import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { reconcileMissions } from '../apps/server/src/missions';

test('missions : trois offres, acceptation unique, navigation, abandon payant, victoire et mobile', async ({
  page,
}) => {
  const now = Date.now();
  let state = createState('mission-browser', now);
  const realm = addPlayer(state, 'a', 'Campagne', 'ASH', now);
  realm.wallet = { GOLD: 10000, FOOD: 10000, WOOD: 10000, STONE: 10000, IRON: 10000 };
  const view = () => worldView(state, 'a', now);
  await page.exposeFunction('catalogSetup', () => ({
    session: {
      token: 'missions-test',
      user: { id: 'a', username: 'Campagne', faction: 'ASH', guest: true },
    },
    world: view(),
  }));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, 'a', actionSchema.parse(raw), now);
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.exposeFunction('fixtureVictory', () => {
    const m = state.missions!.a.active!;
    delete state.units[m.objectiveId];
    delete state.buildings[m.objectiveId];
    reconcileMissions(state, now);
    return view();
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  const template = await (await page.request.get('/')).text();
  await page.route('**/missions-review', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace(
        '/src/main.tsx',
        `/@fs/${resolve('tests/fixtures/missions-browser.tsx')}`,
      ),
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/missions-review');
  await expect(page.locator('.mission-card')).toHaveCount(3);
  await expect(page.locator('.mission-card').first()).toContainText('Si tu abandonnes ensuite');
  await page.screenshot({ path: 'test-results/missions-offers.png', animations: 'disabled' });
  const gold = state.realms.a.wallet.GOLD;
  await page.getByRole('button', { name: 'Accepter · 0 PA', exact: true }).first().click();
  await expect(page.locator('.mission-active')).toBeVisible();
  await expect(page.locator('.mission-card')).toHaveCount(0);
  await expect(page.locator('.mission-active')).toContainText('Objectif :');
  const mission = state.missions!.a.active!;
  await page.evaluate(() => {
    window.addEventListener(
      'vm:camera',
      (e) => ((window as any).missionCamera = (e as CustomEvent).detail),
    );
  });
  await page.getByRole('button', { name: /Localiser l’objectif/ }).click();
  await expect(page.locator('.missions-panel')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).missionCamera.q)).toBe(
    view().missions!.active!.objectivePosition.q,
  );
  await page.evaluate(() => (window as any).catalogStore.setState({ panel: 'missions' }));
  await page.getByRole('button', { name: 'Abandonner… · 0 PA', exact: true }).click();
  await expect(page.getByText('Les ressources seront déduites.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer la mission' }).click();
  await expect(page.locator('.mission-active')).toBeVisible();
  await page.getByRole('button', { name: 'Abandonner… · 0 PA', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer l’abandon · 0 PA' }).click();
  await expect(page.locator('.mission-card')).toHaveCount(3);
  expect(state.realms.a.wallet.GOLD).toBe(gold - mission.abandonmentCost.GOLD!);
  await expect(page.locator('.mission-result')).toContainText('Mission abandonnée');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mission-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Accepter · 0 PA', exact: true }).first().click();
  await expect(page.locator('.mission-active')).toBeVisible();
  await page.screenshot({
    path: 'test-results/missions-mobile.png',
    animations: 'disabled',
    fullPage: true,
  });
  await page.evaluate(async () => {
    (window as any).catalogStore.setState({ world: await (window as any).fixtureVictory() });
  });
  await expect(page.locator('.mission-result')).toContainText('Victoire');
  await expect(page.locator('.mission-result')).toContainText('Ralliés');
  await expect(page.locator('.mission-card')).toHaveCount(3);
  expect(errors).toEqual([]);
});
