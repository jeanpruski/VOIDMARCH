import { expect, test } from './fixtures/game-test';
import { createState, disk, key, writeTile } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { hexToPixel } from '../apps/web/src/map-geometry';

test('la figurine suit les virages sur ses terres et les routes malgré les snapshots et déplacements de caméra', async ({
  page,
}) => {
  const now = Date.now(),
    id = 'movement';
  let state = createState('movement-browser', now);
  const realm = addPlayer(state, id, 'Les marcheurs', 'MASK', now);
  realm.settings.reducedMotion = false;
  for (const p of disk({ q: 0, r: 0 }, 8)) writeTile(state, p, { terrain: 'PLAIN' });
  state.units.worker = {
    id: 'worker',
    ownerId: id,
    kind: 'PEASANT',
    q: 0,
    r: 0,
    hp: 4,
    rareBonus: 20,
    createdAt: now,
    updatedAt: now,
  };
  const road = [
    { q: 0, r: 2 },
    { q: 0, r: 3 },
    { q: 0, r: 4 },
    { q: 1, r: 4 },
    { q: 2, r: 4 },
    { q: 3, r: 3 },
    { q: 4, r: 2 },
  ];
  for (const p of road) {
    writeTile(state, p, { road: true });
    realm.explored[key(p)] = { ...p, terrain: 'PLAIN', road: true, visibility: 'EXPLORED' };
  }
  // A connected mixed journey: own land → neutral roads → own land, with no road on the ends.
  for (const p of [road[0], road[1], road[6]]) writeTile(state, p, { road: false, ownerId: id });
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
      'create() { window.__movementScene = this;',
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
  const parts = () =>
    page.evaluate(() => {
      const scene = (window as any).__movementScene;
      return [
        'unit-sprite:worker',
        'unit-owner:worker',
        'unit-banner:worker',
        'rare-aura:worker',
        'health:worker',
      ].map((name) => {
        const p = scene?.children.getByName(name);
        return p ? { name, x: p.x, y: p.y } : null;
      });
    });
  await expect.poll(async () => (await parts()).every(Boolean)).toBe(true);
  const begin = async (
    type: 'MOVE' | 'MOVE_ROAD',
    payload: unknown,
    holdAck = false,
    holdSnapshot = false,
  ) =>
    page.evaluate(
      async ({ type, payload, holdAck, holdSnapshot }) => {
        const w = window as any;
        w.__holdAck = holdAck;
        w.__holdSnapshot = holdSnapshot;
        // @ts-expect-error Vite test source module.
        const { send } = await import('/src/store.ts');
        w.__sendPromise = send({ type, actorId: 'worker', payload });
      },
      { type, payload, holdAck, holdSnapshot },
    );
  const normalPath = [
    { q: 1, r: 0 },
    { q: 1, r: 1 },
    { q: 0, r: 2 },
  ];
  await begin('MOVE', { path: normalPath }, true);
  await page.waitForFunction(() => typeof (window as any).__releaseAck === 'function');
  // Prediction starts immediately, even before the acknowledgement. Preserve its clock on confirmation.
  const startedAt = await page.evaluate(async () => {
    // @ts-expect-error Vite test source module.
    const { useGame } = await import('/src/store.ts');
    return useGame.getState().movements.worker.startedAt;
  });
  await page.evaluate(async () => {
    (window as any).__releaseAck();
    await (window as any).__sendPromise;
  });
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Vite test source module.
      const { useGame } = await import('/src/store.ts');
      return useGame.getState().movements.worker.startedAt;
    }),
  ).toBe(startedAt);
  const sampleAtCorner = async (index: number, pan = false) =>
    page.evaluate(
      async ({ index, pan }) => {
        // @ts-expect-error Vite test source module.
        const { useGame, focusMap } = await import('/src/store.ts');
        const a = useGame.getState().movements.worker;
        const time = a.startedAt + (a.duration * a.distances[index]) / a.distances.at(-1);
        Date.now = () => time;
        if (pan) {
          focusMap({ q: 1, r: 1 });
          await (window as any).__pushSnapshot();
        }
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return a.points[index];
      },
      { index, pan },
    );
  const assertParts = async (p: { x: number; y: number }) => {
    const all = await parts();
    for (const [i, dy] of [-20, -20, 0, 8, -20].entries()) {
      expect(all[i]!.x).toBeCloseTo(p.x, 4);
      expect(all[i]!.y).toBeCloseTo(p.y + dy, 4);
    }
  };
  await sampleAtCorner(1, true);
  await assertParts(hexToPixel(normalPath[0]));
  await page.screenshot({ path: 'test-results/movement-corner.png' });
  await sampleAtCorner(2);
  await assertParts(hexToPixel(normalPath[1]));
  await sampleAtCorner(3);
  await assertParts(hexToPixel(normalPath[2]));
  // The reverse ordering (acknowledgement before snapshot) must follow the road too.
  const preview = await page.evaluate(async (destination) => {
    // @ts-expect-error Vite test source module.
    const { useGame } = await import('/src/store.ts');
    const unit = useGame.getState().world.units.find((u: any) => u.id === 'worker');
    useGame.setState({
      selection: { kind: 'unit', id: unit.id, q: unit.q, r: unit.r },
      mode: 'move',
    });
    return (window as any).__movementScene.path(unit, destination);
  }, road.at(-1));
  expect(preview).toEqual(road.slice(1));
  await begin('MOVE_ROAD', road.at(-1), false, true);
  await page.evaluate(async () => {
    await (window as any).__sendPromise;
  });
  await sampleAtCorner(2);
  await assertParts(hexToPixel(road[2]));
  await page.evaluate(() => {
    (window as any).__releaseSnapshot();
  });
  await sampleAtCorner(3, true);
  await assertParts(hexToPixel(road[3]));
  await sampleAtCorner(6);
  await assertParts(hexToPixel(road[6]));
  expect(state.units.worker).toMatchObject(road[6]);
  // Reduced motion applies the final position immediately and leaves no stale attachment.
  state.realms[id].settings.reducedMotion = true;
  await page.evaluate(async () => {
    await (window as any).__pushSnapshot();
  });
  await begin('MOVE_ROAD', road[0]);
  await page.evaluate(async () => {
    await (window as any).__sendPromise;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  await assertParts(hexToPixel(road[0]));
  expect(errors).toEqual([]);
});
