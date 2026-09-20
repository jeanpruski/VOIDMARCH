import { expect, test } from './fixtures/game-test';
import {
  BUILDINGS,
  RESOURCE_BUILDINGS,
  BUILDING_REQUIREMENTS,
  type Terrain,
} from '@voidmarch/config';
import { createState, disk, writeTile } from '@voidmarch/game-rules';
import {
  addBuilding,
  addPlayer,
  execute,
  worldView,
  defaultOptions,
} from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('producteurs et mine d’or : filtres, sprites et construction', async ({ page }) => {
  const now = Date.now();
  let state = createState('resource-browser', now);
  const id = 'pilot';
  const realm = addPlayer(state, id, 'Bâtisseurs', 'ASH', now);
  realm.wallet = { GOLD: 30000, WOOD: 30000, STONE: 30000, IRON: 30000, FOOD: 30000 };
  const kinds = [...Object.keys(RESOURCE_BUILDINGS), 'GOLD_MINE'] as (
    keyof typeof RESOURCE_BUILDINGS | 'GOLD_MINE'
  )[];
  const requirements = [...new Set(kinds.flatMap((k) => BUILDING_REQUIREMENTS[k] ?? []))];
  const positions = disk(realm.capital, 3).filter(
    (p) => p.q !== realm.capital.q || p.r !== realm.capital.r,
  );
  requirements.forEach((kind, i) => addBuilding(state, realm, positions[i], kind, now));
  const targets = positions.slice(requirements.length, requirements.length + kinds.length);
  kinds.forEach((kind, i) =>
    writeTile(state, targets[i], {
      terrain: BUILDINGS[kind].terrains[0] as Terrain,
      ownerId: id,
    }),
  );
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
  for (const [i, kind] of kinds.entries()) {
    await page.evaluate(async (p) => {
      // @ts-expect-error Vite fixture import.
      const { useGame, focusMap } = await import('/src/store.ts');
      focusMap(p);
      useGame.setState({ selection: { kind: 'tile', ...p }, panel: 'build' });
    }, targets[i]);
    await page
      .getByLabel('Production', { exact: true })
      .selectOption(kind === 'GOLD_MINE' ? 'GOLD' : ['WOOD', 'STONE', 'IRON'][i % 3]);
    const dialog = page.getByRole('dialog');
    if (kind !== 'GOLD_MINE') await expect(dialog.locator('article')).toHaveCount(3);
    const card = dialog
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: BUILDINGS[kind].name, exact: true }) });
    await expect(card.locator('.miniature')).toHaveCSS('background-image', /blob:/);
    await expect(card).toContainText('Prêt à construire');
    await card.scrollIntoViewIfNeeded();
    if (i === 3) await page.screenshot({ path: 'test-results/resource-buildings-catalog.png' });
    await card.getByRole('button', { name: 'Construire · 1 PA', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() =>
        Object.values(state.buildings).some(
          (b) => b.kind === kind && b.q === targets[i].q && b.r === targets[i].r,
        ),
      )
      .toBe(true);
  }
  await page.screenshot({ path: 'test-results/resource-buildings-map.png' });
  expect(errors).toEqual([]);
});
