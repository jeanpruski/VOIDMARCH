import { expect, test } from '@playwright/test';
import { createState, createRealm, disk, writeTile } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('projectiles : trajet, impact à l’arrivée, confirmation sans doublon et annulation', async ({
  page,
}) => {
  const now = Date.now();
  let state = createState('projectile-browser', now);
  const realm = addPlayer(state, 'a', 'Batterie noire', 'ASH', now);
  realm.protectedUntil = 0;
  realm.settings.reducedMotion = false;
  state.realms.b = createRealm('b', 'Cible', 'MASK', { q: 3, r: 0 }, now);
  state.realms.b.protectedUntil = 0;
  state.units.gunner = {
    id: 'gunner',
    ownerId: 'a',
    kind: 'BAZOOKA',
    q: 0,
    r: 0,
    hp: 9,
    createdAt: now,
    updatedAt: now,
  };
  state.units.target = {
    id: 'target',
    ownerId: 'b',
    kind: 'GUARD',
    q: 3,
    r: 0,
    hp: 1000,
    createdAt: now,
    updatedAt: now,
  };
  for (const h of disk({ q: 0, r: 0 }, 7)) writeTile(state, h, { terrain: 'PLAIN' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const view = () => worldView(state, 'a', Date.now());
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, 'a', actionSchema.parse(raw), Date.now());
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route('**/src/Map.tsx', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const instrumented = body
      .replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.__projectileScene = this; window.__impacts = 0;',
      )
      .replace(
        /\bplayImpact\(effect, projectile\)\s*\{/,
        'playImpact(effect, projectile) { if(effect.kind === "combat")window.__impacts++;',
      );
    expect(instrumented).not.toBe(body);
    await route.fulfill({ response, body: instrumented });
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},emitWithAck(e,a){return new Promise(resolve=>{window.__confirm=async()=>{const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);resolve(r.result)};window.__reject=()=>resolve({accepted:false,actionId:a.actionId,reason:'Attaque refusée'});})},disconnect(){}};window.__push=()=>window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id: 'a', username: realm.name, faction: 'ASH', guest: true },
  };
  await page.route('**/api/**', (route) => route.fulfill({ json: session }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await page.waitForFunction(() => (window as any).__projectileScene?.view);
  await page.evaluate(() => {
    (window as any).__projectileScene.tweens.timeScale = 0.15;
  });
  const begin = () =>
    page.evaluate(async () => {
      // @ts-expect-error Vite serves the source module.
      const { send } = await import('/src/store.ts');
      (window as any).__request = send({
        type: 'ATTACK',
        actorId: 'gunner',
        payload: { targetId: 'target' },
      });
    });
  const shots = (): Promise<{ name: string; x: number; y: number }[]> =>
    page.evaluate(() => {
      const s = (window as any).__projectileScene;
      return s.children.list
        .filter((o: any) => o.name.startsWith('projectile:'))
        .map((o: any) => ({ name: o.name, x: o.list[1].x, y: o.list[1].y }));
    });
  await begin();
  await expect.poll(async () => (await shots()).length).toBe(1);
  expect((await shots())[0].name).toBe('projectile:rocket');
  expect(await page.evaluate(() => (window as any).__impacts)).toBe(0);
  const start = (await shots())[0];
  await expect.poll(async () => (await shots())[0]?.x ?? 0).toBeGreaterThan(start.x + 20);
  await page.evaluate(() => {
    (window as any).__projectileScene.tweens.pauseAll();
  });
  await page.screenshot({ path: 'test-results/projectile-rocket.png' });
  await page.evaluate(async () => {
    await (window as any).__confirm();
    await (window as any).__request;
  });
  expect((await shots()).length).toBe(1);
  expect(await page.evaluate(() => (window as any).__impacts)).toBe(0);
  await page.evaluate(() => {
    const s = (window as any).__projectileScene;
    s.tweens.timeScale = 1;
    s.tweens.resumeAll();
  });
  await expect.poll(async () => (await shots()).length).toBe(0);
  expect(await page.evaluate(() => (window as any).__impacts)).toBe(1);
  expect(state.units.target.hp).toBeLessThan(1000);
  await page.evaluate(() => {
    (window as any).__projectileScene.tweens.timeScale = 0.1;
  });
  await begin();
  await expect.poll(async () => (await shots()).length).toBe(1);
  await page.evaluate(async () => {
    (window as any).__reject();
    await (window as any).__request;
  });
  expect(await shots()).toEqual([]);
  expect(await page.evaluate(() => (window as any).__impacts)).toBe(1);
  state.realms.a.settings.reducedMotion = true;
  await page.evaluate(() => (window as any).__push());
  await begin();
  expect(await shots()).toEqual([]);
  await page.evaluate(async () => {
    await (window as any).__confirm();
    await (window as any).__request;
  });
  expect(await page.evaluate(() => (window as any).__impacts)).toBe(1);
  state.realms.a.settings.reducedMotion = false;
  await page.evaluate(() => (window as any).__push());
  // Exercise every renderer, including the occult and radioactive palette.
  await page.evaluate(() => {
    const s = (window as any).__projectileScene;
    s.tweens.timeScale = 0.2;
    [
      'ARCHER',
      'CROSSBOW',
      'OFFICER',
      'FIELD_GUN',
      'APOCALYPSE_CRAWLER',
      'BOMBER',
      'SIEGE',
      'VOID_ACOLYTE',
      'TESLA_TROOPER',
      'OCCULT_DRAGON',
    ].forEach((unitKind, i) =>
      s.playEffect({
        kind: 'combat',
        q: 3,
        r: (i % 3) - 1,
        shot: { from: { q: 0, r: (i % 3) - 1 }, unitKind, targetAirborne: false },
      }),
    );
  });
  await expect.poll(async () => (await shots()).length).toBe(10);
  expect(new Set((await shots()).map((s) => s.name)).size).toBe(10);
  await page.evaluate(() => {
    const s = (window as any).__projectileScene;
    s.tweens.timeScale = 1;
  });
  await expect.poll(async () => (await shots()).length).toBe(0);
  expect(errors).toEqual([]);
});
