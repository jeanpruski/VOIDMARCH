import { prepareDevelopment } from './fixtures/development';
import { strategy } from '../apps/server/src/strategy';
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { UNITS, formatNumber } from '@voidmarch/config';
import { createState, createRealm } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { createMissionTrophy } from '../apps/server/src/mission-trophies';
import { reconcileMissions } from '../apps/server/src/missions';

test('missions : trois offres, acceptation unique, navigation, abandon payant, victoire et mobile', async ({
  page,
}) => {
  let now = Date.now();
  let state = createState('mission-browser', now);
  const realm = addPlayer(state, 'a', 'Campagne', 'ASH', now);
  realm.wallet = { GOLD: 10000, FOOD: 10000, WOOD: 10000, STONE: 10000, IRON: 10000 };
  state.units.traveler = {
    id: 'traveler',
    ownerId: 'a',
    kind: 'INFANTRY',
    q: realm.capital.q,
    r: realm.capital.r,
    hp: UNITS.INFANTRY.hp,
    createdAt: now,
    updatedAt: now,
  };
  const view = () => worldView(state, 'a', now);
  await page.exposeFunction('catalogSetup', () => ({
    session: {
      token: 'missions-test',
      user: { id: 'a', username: 'Campagne', faction: 'ASH', guest: true },
    },
    world: view(),
  }));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureAdvanced', () => {
    now += 600000;
    state.realms.a.economyAt = now;
    state.missions!.a.generation = 0;
    addBuilding(
      state,
      state.realms.a,
      { q: realm.capital.q + 3, r: realm.capital.r },
      'BARRACKS',
      now,
      5,
    );
    prepareDevelopment(state, 'a', 5, now);
    state.realms.ally = createRealm('ally', 'Renforts', 'ASH', { q: -100, r: 0 }, now);
    strategy(state, now).alliances.team = {
      id: 'team',
      name: 'Alliance de test',
      leaderId: 'a',
      members: ['a', 'ally'],
      emblem: 'eye',
      createdAt: now,
      messages: [],
      markers: [],
    };
    return view();
  });
  await page.exposeFunction('fixtureAdvance', (elapsed: number) => {
    now += elapsed;
    state.realms.a.economyAt = now; // Keep UI assertions independent of production/upkeep.
    return view();
  });
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, 'a', actionSchema.parse(raw), now);
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.exposeFunction('fixtureCollection', () => {
    const original = state.missions!.a.trophies![0];
    const base = {
      ...original.mission,
      id: '',
      realmId: 'a',
      ownerId: 'test-garrison',
      objectiveId: 'target',
      abandonmentCost: {},
    };
    for (let i = 0; i < 14; i++) {
      const difficulty = (['Escarmouche', 'Assaut', 'Siège'] as const)[i % 3];
      const m = {
        ...base,
        id: `trophy-fixture-${i}`,
        title: `Chronique de test ${i}`,
        difficulty,
        level: (i % 5) + 1,
        units: Array.from({ length: (i % 5) + 1 }, () => 'RIFLEMAN' as const),
        buildings:
          i % 2
            ? ['VILLAGE' as const, 'BARRACKS' as const]
            : ['VILLAGE' as const, 'BARRACKS' as const, 'HOUSE' as const],
        wall: difficulty === 'Siège' ? ('STEEL_WALL' as const) : undefined,
      };
      state.missions!.a.trophies!.push(
        createMissionTrophy(
          m,
          now + i * 60000,
          { units: 0, buildings: 0, walls: 0 },
          { GOLD: 100, FOOD: 60 },
        ),
      );
    }
    return view();
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
  await expect(page.locator('.mission-card .mission-difficulty-badge')).toHaveText([
    'Difficulté : Facile',
    'Difficulté : Moyenne',
    'Difficulté : Difficile',
  ]);
  await expect(page.locator('.mission-card .mission-offer-distance').first()).toContainText(
    '20–40 cases',
  );
  await expect(page.locator('.mission-card .mission-rewards')).toHaveCount(3);
  await expect(page.locator('.mission-card').first().locator('.mission-rewards')).toContainText(
    'Récompenses de victoire',
  );
  await expect(
    page
      .locator('.mission-card')
      .first()
      .locator('.mission-rewards')
      .getByLabel('Or', { exact: true }),
  ).toHaveText(formatNumber(view().missions!.offers[0].reward!.GOLD!));
  await expect(page.locator('.mission-card').first()).toContainText('Si tu abandonnes ensuite');
  await page.screenshot({ path: 'test-results/missions-offers.png', animations: 'disabled' });
  await expect(page.getByRole('timer')).toContainText('10:00');
  const oldTitles = await page.locator('.mission-card h3').allTextContents();
  await page.evaluate(() => {
    const s = (window as any).catalogStore;
    s.setState({ now: s.getState().world.serverTimestamp + 1000 });
  });
  await expect(page.getByRole('timer')).toContainText('09:59');
  await page.evaluate(() => {
    const s = (window as any).catalogStore;
    s.setState({ now: s.getState().world.missions.offersRefreshAt });
  });
  await expect(page.getByRole('timer')).toContainText('Renouvellement des offres en cours');
  for (const button of await page.getByRole('button', { name: 'Accepter', exact: true }).all())
    await expect(button).toBeDisabled();
  await page.evaluate(async () => {
    const world = await (window as any).fixtureAdvance(600000);
    (window as any).catalogStore.setState({ world, now: world.serverTimestamp });
  });
  await expect(page.getByRole('timer')).toContainText('10:00');
  const newTitles = await page.locator('.mission-card h3').allTextContents();
  newTitles.forEach((title, i) => expect(title).not.toBe(oldTitles[i]));
  const gold = state.realms.a.wallet.GOLD;
  await page.getByRole('button', { name: 'Accepter', exact: true }).first().click();
  await expect(page.locator('.mission-active')).toBeVisible();
  await expect(page.locator('.mission-card')).toHaveCount(0);
  await expect(page.locator('.mission-active')).toContainText('Objectif :');
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(
    page.locator('.mission-active .mission-rewards').getByLabel('Vivres', { exact: true }),
  ).toHaveText(formatNumber(state.missions!.a.active!.reward!.FOOD!));
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
  await page.getByRole('button', { name: 'Abandonner…', exact: true }).click();
  await expect(page.getByText('Les ressources seront déduites.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer la mission' }).click();
  await expect(page.locator('.mission-active')).toBeVisible();
  await page.getByRole('button', { name: 'Abandonner…', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmer l’abandon' }).click();
  await expect(page.locator('.mission-card')).toHaveCount(3);
  expect(state.realms.a.wallet.GOLD).toBe(gold - mission.abandonmentCost.GOLD!);
  await expect(page.locator('.mission-result')).toContainText('Mission abandonnée');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mission-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Accepter', exact: true }).first().click();
  await expect(page.locator('.mission-active')).toBeVisible();
  await page.screenshot({
    path: 'test-results/missions-mobile.png',
    animations: 'disabled',
    fullPage: true,
  });
  await page.evaluate(async () => {
    (window as any).catalogStore.setState({ world: await (window as any).fixtureVictory() });
  });
  await expect(page.getByRole('complementary', { name: 'Bilan de victoire' })).toBeVisible();
  await expect(page.locator('.victory-report')).toContainText('troupes récupérées');
  await page.screenshot({ path: 'test-results/victory-report.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Fermer le bilan de victoire' }).click();

  await expect(page.locator('.mission-result')).toContainText('Victoire');
  await expect(page.locator('.mission-result')).toContainText('Ralliés');
  await expect(page.locator('.mission-result')).toContainText('Ressources reçues');
  await expect(
    page.locator('.mission-result .mission-rewards').getByLabel('Or', { exact: true }),
  ).toHaveText(formatNumber(state.missions!.a.lastResult!.reward!.GOLD!));
  await expect(page.locator('.mission-card')).toHaveCount(3);
  await page.getByRole('button', { name: /Médaille obtenue/ }).click();
  await expect(page.locator('.trophy-card')).toHaveCount(1);
  await page.locator('.trophy-card').click();
  await expect(page.locator('.trophy-detail')).toContainText(
    'La mission qui t’a valu cette médaille',
  );
  await expect(page.getByRole('table')).toContainText('Bilan de la forteresse');
  await expect(page.locator('.trophy-detail')).toContainText(
    state.missions!.a.trophies![0].mission.title,
  );
  await page.locator('.modal-body').evaluate((el) => el.scrollTo({ top: 0 }));
  await page.screenshot({
    path: 'test-results/trophy-detail-mobile.png',
    animations: 'disabled',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Retour à la collection' }).click();
  await page.evaluate(async () => {
    (window as any).catalogStore.setState({ world: await (window as any).fixtureCollection() });
  });
  await expect(page.locator('.trophy-card')).toHaveCount(12);
  await expect(page.getByRole('navigation', { name: 'Pages des trophées' })).toContainText(
    'Page 1 / 2',
  );
  await page.getByRole('button', { name: 'Suivant', exact: true }).click();
  await expect(page.locator('.trophy-card')).toHaveCount(3);
  await page.getByRole('combobox', { name: 'Difficulté', exact: true }).selectOption('Siège');
  await expect(page.locator('.trophy-card')).toHaveCount(4);
  await page.getByRole('combobox', { name: 'Niveau', exact: true }).selectOption('3');
  await expect(page.locator('.trophy-card')).toHaveCount(1);
  await expect(page.locator('.trophy-card')).toContainText('Chronique de test 2');
  await page.getByRole('combobox', { name: 'Niveau', exact: true }).selectOption('all');
  await page.getByRole('combobox', { name: 'Difficulté', exact: true }).selectOption('all');
  await page.getByRole('searchbox').fill('chronique de test 13');
  await expect(page.locator('.trophy-card')).toHaveCount(1);
  await page.getByRole('searchbox').fill('');
  await page
    .getByRole('combobox', { name: 'Trier les trophées', exact: true })
    .selectOption('enemies');
  await expect(page.locator('.trophy-card').first()).toContainText('5 ennemis');
  await page
    .getByRole('combobox', { name: 'Trier les trophées', exact: true })
    .selectOption('buildings');
  await expect(page.locator('.trophy-card').first()).toContainText('3 bâtiments');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page
    .getByRole('combobox', { name: 'Trier les trophées', exact: true })
    .selectOption('difficulty');
  await page.locator('.modal-body').evaluate((el) => el.scrollTo({ top: 0 }));
  await page.screenshot({ path: 'test-results/trophy-collection.png', animations: 'disabled' });
  await page.evaluate(async () =>
    (window as any).catalogStore.setState({
      world: await (window as any).fixtureAdvanced(),
      panel: 'missions',
      now: (await (window as any).fixtureSnapshot()).serverTimestamp,
    }),
  );
  await expect(page.locator('.mission-card')).toHaveCount(3);
  const campaign = page.locator('.mission-card').last();
  await expect(campaign).toContainText('Grande campagne');
  await expect(campaign).toContainText('Difficulté : Extrême');
  await expect(campaign).toContainText('Aviation repérée');
  const quoted = view().missions!.offers[2];
  await campaign.locator('summary').click();
  await expect(campaign.locator('.mission-roster-details')).toContainText(
    UNITS[quoted.units[0]].name,
  );
  await campaign.getByRole('button', { name: 'Accepter', exact: true }).click();
  await expect(page.locator('.mission-active')).toContainText('Grande campagne');
  expect(state.missions!.a.active!.units).toHaveLength(quoted.units.length);
  await page.locator('.modal-body').evaluate((el) => el.scrollTo({ top: 0 }));
  await page.screenshot({ path: 'test-results/large-mission.png', animations: 'disabled' });
  expect(errors).toEqual([]);
});
