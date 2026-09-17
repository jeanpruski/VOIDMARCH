import { expect, test } from '@playwright/test';
import { createState, createRealm, disk, writeTile } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { createNpc } from '../apps/server/src/npcs';
import { actionSchema } from '@voidmarch/protocol';

test('remparts : aperçu et projectile interceptés, tir allié bloqué, riposte absorbée', async ({
  page,
}) => {
  const now = Date.now();
  let state = createState('wall-browser', now);
  const realm = addPlayer(state, 'a', 'Archers', 'ASH', now);
  realm.protectedUntil = 0;
  realm.settings.reducedMotion = false;
  state.realms.b = createRealm('b', 'Les Remparts', 'MASK', { q: 20, r: 0 }, now);
  state.realms.b.protectedUntil = 0;
  for (const p of disk({ q: 0, r: 0 }, 8)) writeTile(state, p, { terrain: 'PLAIN' });
  state.units.soldier = {
    id: 'soldier',
    kind: 'RIFLEMAN',
    ownerId: 'a',
    q: 0,
    r: 0,
    hp: 100,
    createdAt: now,
    updatedAt: now,
  };
  const npc = createNpc(state, { q: 2, r: 0 }, 'deserter', now);
  npc.hp = 100;
  const wall = addBuilding(state, state.realms.b, { q: 1, r: 0 }, 'WOOD_WALL', now);
  const view = () => worldView(state, 'a', now);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, 'a', actionSchema.parse(raw), now);
    state = r.state;
    return { result: r.result, world: view() };
  });
  await page.route('**/src/Map.tsx', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /\bcreate\(\)\s*\{/,
      'create() { window.__wallScene=this; window.__effects=[];',
    );
    await route.fulfill({
      response,
      body: body.replace(
        /playEffect\(effect\)\s*\{/,
        'playEffect(effect) { window.__effects.push(effect);',
      ),
    });
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id: 'a', username: realm.name, faction: 'ASH', guest: true },
  };
  await page.route('**/api/**', async (route) => {
    if (route.request().url().endsWith('/settings')) {
      Object.assign(state.realms.a.settings, route.request().postDataJSON());
      return route.fulfill({ json: { settings: state.realms.a.settings } });
    }
    await route.fulfill({ json: session });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await page.waitForFunction(() => (window as any).__wallScene?.view);

  const preview = async () =>
    page.evaluate(async (targetId) => {
      // @ts-expect-error Vite source module.
      const { useGame } = await import('/src/store.ts');
      useGame.setState({
        world: await (window as any).fixtureSnapshot(),
        selection: { kind: 'unit', id: 'soldier', q: 0, r: 0 },
        mode: 'attack',
        combatTarget: targetId,
      });
    }, npc.id);
  await preview();
  await expect(page.getByRole('dialog')).toContainText('Rempart sur la trajectoire');
  await expect(page.getByRole('dialog')).toContainText('Palissade');
  await page
    .getByRole('dialog')
    .evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
  await page.screenshot({ path: 'test-results/wall-interception.png' });
  await page.getByRole('button', { name: 'Confirmer l’attaque · 1 PA', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.units[npc.id].hp).toBe(100);
  expect(state.buildings[wall.id].hp).toBeLessThan(wall.hp);
  const shot = await page.evaluate(() =>
    (window as any).__effects.find((e: any) => e.actionId && e.kind === 'combat'),
  );
  expect(shot).toMatchObject({ q: 1, r: 0, shot: { from: { q: 0, r: 0 } } });
  state.buildings[wall.id].ownerId = 'a';
  await preview();
  await expect(page.getByRole('dialog')).toContainText('Votre rempart bloque');
  await expect(
    page.getByRole('button', { name: 'Confirmer l’attaque · 1 PA', exact: true }),
  ).toBeHidden();
  state.units.soldier.kind = 'ARCHER';
  await preview();
  await expect(page.getByRole('dialog')).toContainText('sur le rempart qui vous protège');
  const wallHP = state.buildings[wall.id].hp;
  await page.evaluate(() => {
    (window as any).__effects = [];
  });
  await page.getByRole('button', { name: 'Confirmer l’attaque · 1 PA', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.units.soldier.hp).toBe(100);
  expect(state.buildings[wall.id].hp).toBeLessThan(wallHP);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__effects.some((e: any) => e.q === 1 && e.r === 0 && e.shot?.from.q === 2),
      ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
