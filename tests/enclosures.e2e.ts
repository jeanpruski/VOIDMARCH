import { expect, test } from '@playwright/test';
import { WALL_KINDS } from '@voidmarch/config';
import { createState, disk, distance, key, tileAt, writeTile } from '@voidmarch/game-rules';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('fermer une enceinte, bâtir avec un paysan puis ouvrir une brèche conserve seulement les parcelles bâties', async ({
  page,
}) => {
  const now = Date.now(),
    id = 'enclosure';
  let state = createState('enclosure-browser', now);
  const realm = addPlayer(state, id, 'La cité close', 'MASK', now);
  realm.wallet = { GOLD: 3000, WOOD: 3000, STONE: 3000, IRON: 3000, FOOD: 3000 };
  realm.settings.bannerColor = '#658ed2';
  const center = { q: 12, r: 0 };
  for (const p of disk(center, 5)) writeTile(state, p, { terrain: 'PLAIN' });
  const boundary = disk(center, 3).filter((p) => distance(center, p) === 3),
    gap = boundary.pop()!;
  boundary.forEach((p, i) => addBuilding(state, realm, p, WALL_KINDS[i % 3], now));
  state.units.builder = {
    id: 'builder',
    ownerId: id,
    kind: 'PEASANT',
    ...gap,
    hp: 5,
    createdAt: now,
    updatedAt: now,
  };
  const view = () =>
    worldView(state, id, Date.now(), [
      { q: 0, r: -1 },
      { q: 0, r: 0 },
    ]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const result = execute(state, id, actionSchema.parse(raw), Date.now());
    state = result.state;
    return { result: result.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const handlers={};const socket={on(event,fn){handlers[event]=fn;if(event==='connect')queueMicrotask(fn);return socket;},emit(event){if(['world:join','chunks:subscribe','player:ping'].includes(event))window.fixtureSnapshot().then(w=>handlers['world:snapshot']?.(w));return socket;},timeout(){return socket;},async emitWithAck(event,action){const r=await window.fixtureCommand(action);handlers['world:snapshot']?.(r.world);return r.result;},disconnect(){}};return socket;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id, username: 'La cité close', faction: 'MASK', guest: true },
  };
  await page.route('**/api/**', (route) => route.fulfill({ json: session }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.board canvas')).toBeVisible();
  const select = async (
    p: { q: number; r: number },
    kind: 'tile' | 'building' = 'tile',
    buildingId?: string,
  ) =>
    page.evaluate(
      async ({ p, kind, buildingId }) => {
        // @ts-expect-error Vite UI fixture imports the source module.
        const { useGame, focusMap } = await import('/src/store.ts');
        focusMap({ q: 12, r: 0 });
        useGame.setState({
          selection: { kind, ...p, id: buildingId },
          panel: null,
          combatTarget: null,
        });
      },
      { p, kind, buildingId },
    );
  await select(gap);
  await page.getByRole('button', { name: 'Construire', exact: true }).click();
  const palisade = page.getByRole('dialog').locator('article').first();
  await expect(palisade).toContainText('Palissade en bois');
  await palisade.getByRole('button', { name: 'Construire · 1 PA', exact: true }).click();
  await expect.poll(() => tileAt(state, center).ownerId).toBe(id);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const wallId = tileAt(state, gap).buildingId!;
  await select(center);
  await expect(page.getByRole('region', { name: 'Sélection actuelle' })).toContainText(
    'Terre revendiquée par votre enceinte',
  );
  await expect(page.getByRole('button', { name: 'Construire', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/enclosure-closed-desktop.png' });
  await page.evaluate(async () => {
    // @ts-expect-error Vite UI fixture imports the source module.
    const { send } = await import('/src/store.ts');
    await send({
      type: 'MOVE',
      actorId: 'builder',
      payload: {
        path: [
          { q: 14, r: 0 },
          { q: 13, r: 0 },
          { q: 12, r: 0 },
        ],
      },
    });
  });
  await expect.poll(() => state.units.builder.q).toBe(12);
  await page.getByRole('button', { name: 'Construire', exact: true }).click();
  const house = page
    .getByRole('dialog')
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Chaumière', exact: true }) });
  await house.getByRole('button', { name: 'Construire · 1 PA', exact: true }).click();
  await expect.poll(() => !!tileAt(state, center).buildingId).toBe(true);
  await select(gap, 'building', wallId);
  await page.getByRole('button', { name: 'Démolir · 1 PA', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'cases intérieures sans bâtiment redeviennent neutres',
  );
  await page.getByRole('button', { name: 'Confirmer la démolition · 1 PA', exact: true }).click();
  await expect.poll(() => tileAt(state, { q: 13, r: 0 }).ownerId).toBeUndefined();
  expect(tileAt(state, center).ownerId).toBe(id);
  expect(disk(center, 2).filter((p) => tileAt(state, p).ownerId === id)).toHaveLength(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await select({ q: 13, r: 0 });
  await expect(page.getByRole('region', { name: 'Sélection actuelle' })).toContainText(
    'revendiquer',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/enclosure-open-mobile.png' });
  expect(errors).toEqual([]);
});
