import { expect, test } from '@playwright/test';
import { createState, disk, key, writeTile } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { createNpc } from '../apps/server/src/npcs';
import { actionSchema } from '@voidmarch/protocol';

test('dégâts confirmés : attaque, riposte, doublons et mouvement réduit', async ({ page }) => {
  page.setDefaultTimeout(15000);
  const now = Date.now(),
    id = 'pilot';
  let state = createState('group-browser', now),
    orders = 0;
  const realm = addPlayer(state, id, 'Armée', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  realm.settings.reducedMotion = false;
  realm.settings.lastCameraQ = 0;
  realm.settings.lastCameraR = 0;
  state.units = {};
  for (const p of disk({ q: 0, r: 0 }, 12)) {
    writeTile(state, p, { terrain: 'PLAIN', ownerId: undefined, road: false });
    realm.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
  }
  state.units.shooter = {
    id: 'shooter',
    ownerId: id,
    kind: 'RIFLEMAN',
    q: 0,
    r: 0,
    hp: 100,
    createdAt: now,
    updatedAt: now,
  };
  const npc = createNpc(state, { q: 1, r: 0 }, 'deserter', now);
  npc.hp = 500;
  const view = () => worldView(state, id, now, disk({ q: 0, r: 0 }, 1));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureAP', (ap: number) => {
    state.realms[id].ap = ap;
    return view();
  });
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    orders++;
    const r = execute(state, id, actionSchema.parse(raw), now);
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s;},emit(e){if(['world:join','chunks:subscribe','player:ping','world:sync'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s;},timeout(){return s;},async emitWithAck(e,a){await new Promise(r=>setTimeout(r,500));const result=await window.fixtureCommand(a);h['world:snapshot']?.(result.world);return result.result;},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id, username: 'Armée', faction: 'ASH', guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.__damageScene = this;',
      ),
    });
  });
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module.
    const store = await import('/src/store.ts');
    (window as any).__damageStore = store;
    const scene = (window as any).__damageScene;
    scene.cameras.main.setZoom(1.2).centerOn(0, 0);
    scene.renderMap();
  });
  const numbers = () =>
    page.evaluate(() =>
      (window as any).__damageScene.children.list
        .filter((child: any) => child.name.startsWith('damage:'))
        .map((child: any) => ({ name: child.name, text: child.text, color: child.style.color })),
    );
  await page.evaluate((targetId) => {
    void (window as any).__damageStore.send({
      type: 'ATTACK',
      actorId: 'shooter',
      payload: { targetId },
    });
  }, npc.id);
  expect(await numbers()).toEqual([]); // No invented damage while awaiting confirmation.
  await expect.poll(async () => (await numbers()).length).toBe(2);
  const hits = await numbers();
  expect(hits.some((hit: any) => hit.text.includes('Riposte') && hit.color === '#ff8580')).toBe(
    true,
  );
  expect(hits.some((hit: any) => !hit.text.includes('Riposte') && hit.color === '#ffe4a0')).toBe(
    true,
  );
  await page.evaluate(() => {
    const store = (window as any).__damageStore.useGame;
    store.setState({ world: structuredClone(store.getState().world) });
  });
  expect((await numbers()).map((hit: any) => hit.name).sort()).toEqual(
    hits.map((hit: any) => hit.name).sort(),
  );
  await page.screenshot({ path: 'test-results/combat-damage.png' });
  await expect
    .poll(async () => {
      expect(errors).toEqual([]);
      return (await numbers()).length;
    })
    .toBe(0);
  // A second server attack still shows feedback with reduced motion enabled.
  await page.evaluate(() => {
    const store = (window as any).__damageStore.useGame;
    const world = structuredClone(store.getState().world);
    world.player.settings.reducedMotion = true;
    store.setState({ world });
  });
  realm.settings.reducedMotion = true;
  state.realms[id].settings.reducedMotion = true;
  await page.evaluate((targetId) => {
    void (window as any).__damageStore.send({
      type: 'ATTACK',
      actorId: 'shooter',
      payload: { targetId },
    });
  }, npc.id);
  await expect.poll(async () => (await numbers()).length).toBe(2);
  expect(errors).toEqual([]);
});
