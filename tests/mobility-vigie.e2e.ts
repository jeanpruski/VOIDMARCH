import { expect, test } from '@playwright/test';
import { createState, createRealm, disk, writeTile } from '@voidmarch/game-rules';
import { UNITS } from '@voidmarch/config';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { toggleVigie, setVigieTarget } from '../apps/server/src/vigie';
import { beginCodeSession } from '../apps/server/src/code-session';
import { actionSchema } from '@voidmarch/protocol';

test('production, mouvement avec réserve, vigie et remise à zéro au rechargement', async ({
  page,
}, testInfo) => {
  const now = Date.now();
  let state = createState('supplies-browser', now);
  const realm = addPlayer(state, 'a', 'Intendance', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  realm.ap = 0;
  realm.wallet = { GOLD: 10000, WOOD: 10000, STONE: 10000, IRON: 10000, FOOD: 10000 };
  for (const p of disk(realm.capital, 6)) writeTile(state, p, { terrain: 'PLAIN', road: false });
  const workshop = addBuilding(
    state,
    realm,
    { q: realm.capital.q + 1, r: realm.capital.r },
    'WORKSHOP',
    now,
  );
  const hospital = addBuilding(
    state,
    realm,
    { q: realm.capital.q - 1, r: realm.capital.r + 1 },
    'MONASTERY',
    now,
  );
  const plane = {
    id: 'plane',
    kind: 'FIGHTER' as const,
    ownerId: 'a',
    q: realm.capital.q,
    r: realm.capital.r + 2,
    hp: UNITS.FIGHTER.hp,
    createdAt: now,
    updatedAt: now,
  };
  state.units.plane = plane;
  state.realms.enemy = createRealm('enemy', 'Adversaire test', 'IRON', { q: 120, r: 100 }, now);
  const enemy = addBuilding(state, state.realms.enemy, { q: 120, r: 100 }, 'VILLAGE', now);
  enemy.level = 3;
  const view = () => worldView(state, 'a', now);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureJoin', (id: string) => {
    beginCodeSession(state.realms.a, id);
    return view();
  });
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, 'a', actionSchema.parse(raw), now);
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(options){const h={};setInterval(()=>window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w)),250);const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))(e==='world:join'?window.fixtureJoin(options.auth.codeSessionId):window.fixtureSnapshot()).then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id: 'a', username: realm.name, faction: 'ASH', guest: true },
  };
  await page.route('**/api/**', async (route) => {
    if (route.request().url().endsWith('/admin/vigie')) {
      const body = route.request().postDataJSON();
      if (body.enabled !== false) expect(body.code).toBe('vigie');
      const enabled = toggleVigie(state, 'a', body.enabled === false ? false : undefined);
      await route.fulfill({ json: { enabled } });
      return;
    }
    if (route.request().url().endsWith('/admin/vigie/target')) {
      const position = setVigieTarget(state, 'a', route.request().postDataJSON().realmId);
      await route.fulfill({ json: { position } });
      return;
    }
    if (route.request().url().endsWith('/settings')) {
      Object.assign(state.realms.a.settings, route.request().postDataJSON());
      return route.fulfill({ json: { settings: state.realms.a.settings } });
    }
    await route.fulfill({ json: session });
  });
  await page.goto('/');
  await expect(page.getByRole('application', { name: /Carte hexagonale/ })).toBeVisible();
  await expect(page.getByText('Génération de la carte…')).toBeHidden({ timeout: 90000 });

  const selectBuilding = async (b: typeof workshop) =>
    page.evaluate(async (b) => {
      // @ts-expect-error Vite module
      const { useGame, focusMap } = await import('/src/store.ts');
      focusMap(b);
      useGame.setState({
        panel: null,
        selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
        mode: 'inspect',
      });
    }, b);
  await selectBuilding(workshop);
  await page.getByRole('button', { name: 'Produire carburant' }).click();
  await expect(page.getByRole('dialog')).toContainText('0 / 10 points stockés');
  await expect(page.getByRole('dialog')).toContainText('10 / 10 points encore productibles');
  await expect(page.getByRole('dialog')).toContainText('150 requis');
  await expect(page.getByRole('dialog')).toContainText('250 requis');
  await expect(page.getByRole('dialog')).toContainText('100 requis');
  await page.getByRole('button', { name: 'Confirmer · produire 5 points' }).click();
  await expect.poll(() => state.realms.a.fuel).toBe(5);
  await expect(page.getByRole('dialog')).toContainText('5 / 10 points stockés');
  await expect(page.getByRole('dialog')).toContainText('5 / 10 points encore productibles');
  await expect(page.getByRole('dialog')).toContainText('Prochaines places libérées');
  await page.getByText('Progression du stockage, des quotas et des tarifs').click();
  await expect(page.getByRole('dialog').getByRole('table')).toContainText('+75 %');
  await page.getByRole('button', { name: '+10 points', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Réserve limitée à 10');
  await expect(page.getByRole('dialog').getByRole('button', { name: /Confirmer/ })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('mobility-progression.png') });
  expect(state.realms.a.ap).toBe(0);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Fermer/ })
    .click();
  await page.evaluate(async (u) => {
    // @ts-expect-error Vite module
    const { send } = await import('/src/store.ts');
    await send({ type: 'MOVE', actorId: u.id, payload: { path: [{ q: u.q + 1, r: u.r }] } });
  }, plane);
  await expect.poll(() => state.realms.a.fuel).toBe(4);
  expect(state.realms.a.ap).toBe(0);
  await selectBuilding(hospital);
  await page.getByRole('button', { name: 'Produire pervitine' }).click();
  await page.getByRole('button', { name: 'Confirmer · produire 5 points' }).click();
  await expect.poll(() => state.realms.a.pervitin).toBe(5);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Fermer/ })
    .click();
  await page.locator('body').click({ position: { x: 10, y: 500 } });
  await page.keyboard.type('edc');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary', { name: 'Observation vigie' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Royaume à observer' }).selectOption('enemy');
  await expect.poll(() => state.realms.a.vigieTargetId).toBe('enemy');
  await expect(page.getByRole('complementary', { name: 'Observation vigie' })).toContainText(
    'Adversaire test',
  );
  await expect(page.getByRole('complementary', { name: 'Observation vigie' })).toContainText(
    '1 bâtiments',
  );
  await expect
    .poll(async () =>
      page.evaluate(async (id) => {
        // @ts-expect-error Vite module
        const { useGame } = await import('/src/store.ts');
        return useGame
          .getState()
          .world?.tiles.some((t: any) => t.building?.id === id && t.visibility === 'VISIBLE');
      }, enemy.id),
    )
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath('vigie-observation.png') });
  await page.getByRole('button', { name: 'Fermer vigie' }).click();
  await expect(page.getByRole('complementary', { name: 'Observation vigie' })).toHaveCount(0);
  await page.locator('body').click({ position: { x: 10, y: 500 } });
  await page.keyboard.type('edc');
  await page.keyboard.press('Enter');
  await page.getByRole('combobox', { name: 'Royaume à observer' }).selectOption('enemy');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const counters = await page.getByLabel('Réserves de déplacement').boundingBox();
  expect(counters!.x).toBeGreaterThanOrEqual(0);
  expect(counters!.x + counters!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('mobility-vigie-mobile.png') });
  await page.getByRole('button', { name: 'Retour à mon royaume' }).click();
  await expect.poll(() => state.realms.a.vigieTargetId).toBeUndefined();
  await page.getByRole('combobox', { name: 'Royaume à observer' }).selectOption('enemy');
  await expect.poll(() => state.realms.a.vigieTargetId).toBe('enemy');
  await page.reload();
  await expect.poll(() => state.realms.a.vigie).toBe(false);
  await expect(page.getByRole('complementary', { name: 'Observation vigie' })).toHaveCount(0);
  expect(state.realms.a.fuel).toBe(4);
  expect(state.realms.a.pervitin).toBe(5);
  expect(errors).toEqual([]);
});
