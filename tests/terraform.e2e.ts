import { expect, test } from './fixtures/game-test';
import { createState, disk, key, writeTile } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { hexToPixel } from '../apps/web/src/map-geometry';

test('terrasser : annuler puis confirmer, coût, carte et figurine', async ({ page }) => {
  const now = Date.now(),
    id = 'terraform-browser';
  let state = createState('terraform-browser', now);
  const realm = addPlayer(state, id, 'Les terrassiers', 'MASK', now);
  realm.wallet = { GOLD: 200, WOOD: 200, STONE: 200, IRON: 200, FOOD: 200 };
  state.units.worker = {
    id: 'worker',
    ownerId: id,
    kind: 'TERRAFORMER',
    q: 0,
    r: 0,
    hp: 10,
    createdAt: now,
    updatedAt: now,
  };
  writeTile(
    state,
    { q: 1, r: 0 },
    { terrain: 'MOUNTAIN', ownerId: undefined, buildingId: undefined, poi: undefined },
  );
  const view = () => worldView(state, id, Date.now());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, id, actionSchema.parse(raw), Date.now());
    state = r.state;
    return { result: r.result, world: view() };
  });
  // Instrument only the Vite test response; no inspection hook is shipped with the game.
  await page.route('**/src/Map.tsx', async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    const instrumented = body.replace(
      /\bcreate\(\)\s*\{/,
      'create() { window.__terraformScene = this;',
    );
    expect(instrumented).not.toBe(body);
    await route.fulfill({ response, body: instrumented });
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const socket={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return socket;},emit(e){if(['world:join','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return socket;},timeout(){return socket;},async emitWithAck(e,a){const r=await window.fixtureCommand(a);const push=()=>h['world:snapshot']?.(r.world);if(window.__holdSnapshot){window.__releaseSnapshot=push;}else{push();}if(window.__holdAck)await new Promise(resolve=>window.__releaseAck=resolve);return r.result;},disconnect(){}};window.__pushSnapshot=()=>window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return socket;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id, username: realm.name, faction: 'MASK', guest: true },
  };
  await page.route('**/api/**', (route) => route.fulfill({ json: session }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.board canvas')).toBeVisible();

  await page.evaluate(async () => {
    // @ts-expect-error Vite source module.
    const { select } = await import('/src/store.ts');
    select({ kind: 'unit', id: 'worker' });
  });
  await expect(page.getByRole('button', { name: 'Terrasser · 2 PA' })).toBeVisible();
  await page.getByRole('button', { name: 'Terrasser · 2 PA' }).click();
  await expect(page.getByRole('region', { name: 'Terrassement', exact: true })).toBeVisible();
  // Click the actual map through its camera coordinates.
  const destination = await page.evaluate(
    ({ x, y }) => {
      const scene = (window as any).__terraformScene;
      const c = scene.cameras.main;
      const rect = scene.game.canvas.getBoundingClientRect();
      return {
        x: rect.left + (x - c.worldView.x) * c.zoom,
        y: rect.top + (y - c.worldView.y) * c.zoom,
      };
    },
    hexToPixel({ q: 1, r: 0 }),
  );
  await page.mouse.click(destination.x, destination.y);
  await expect(page.getByRole('dialog')).toContainText('Transformer en plaine');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  expect(state.tiles['1,0'].terrain).toBe('MOUNTAIN');
  await page.mouse.click(destination.x, destination.y);
  await page.getByRole('button', { name: 'Transformer en plaine · 2 PA', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.tiles['1,0'].terrain).toBe('PLAIN');
  expect(state.realms[id].ap).toBe(38);
  expect(state.realms[id].wallet.WOOD).toBe(180);
  const sprite = await page.evaluate(() => {
    const scene = (window as any).__terraformScene;
    const sprite = scene.children.getByName('unit-sprite:worker');
    return { texture: sprite.texture.key, frame: sprite.frame.name };
  });
  expect(sprite).toEqual({ texture: 'terraformer', frame: 0 });
  await page.screenshot({ path: 'test-results/terraform-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Terrasser · 2 PA' }).click();
  await expect(page.getByRole('region', { name: 'Terrassement', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/terraform-mobile.png' });
  expect(errors).toEqual([]);
});
