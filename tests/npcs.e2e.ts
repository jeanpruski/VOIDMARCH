import { expect, test } from '@playwright/test';
import { createState, disk, writeTile } from '@voidmarch/game-rules';
import { NPCS, UNITS, type NpcKind } from '@voidmarch/config';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { createNpc } from '../apps/server/src/npcs';
import { actionSchema } from '@voidmarch/protocol';

test('PNJ : cinq figurines, aperçu, riposte, butin et disparition', async ({ page }) => {
  const now = Date.now();
  let state = createState('npc-browser', now);
  const realm = addPlayer(state, 'a', 'Les Chasseurs', 'ASH', now);
  realm.settings.reducedMotion = false;
  realm.settings.tutorialCompleted = true;
  realm.ap = 10;
  for (const p of disk({ q: 0, r: 0 }, 8)) writeTile(state, p, { terrain: 'PLAIN' });
  state.units.soldier = {
    id: 'soldier',
    kind: 'RIFLEMAN',
    ownerId: 'a',
    q: 1,
    r: 0,
    hp: 100,
    createdAt: now,
    updatedAt: now,
  };
  const positions = [
    { q: 2, r: 0 },
    { q: 0, r: 2 },
    { q: -2, r: 2 },
    { q: 2, r: -2 },
    { q: 0, r: -2 },
  ];
  const npcs = (Object.keys(NPCS) as NpcKind[]).map((kind, i) =>
    createNpc(state, positions[i], kind, now),
  );
  const target = npcs[0];
  target.hp = UNITS.RIFLEMAN.attack + 4;
  target.npc!.defense = 0;
  target.npc!.bonusAP = 2;
  target.npc!.reward = { GOLD: 35 };
  const gold = realm.wallet.GOLD;
  const view = () =>
    worldView(state, 'a', now, [
      { q: 0, r: 0 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
    ]);
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
      'create() { window.__npcScene=this;',
    );
    await route.fulfill({ response, body });
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
  await page.waitForFunction(() => (window as any).__npcScene?.view, undefined, { timeout: 90000 });

  const textures = await page.evaluate(
    (ids) =>
      ids.map(
        (id) => (window as any).__npcScene.children.getByName(`unit-sprite:${id}`)?.texture.key,
      ),
    npcs.map((n) => n.id),
  );
  expect(textures).toEqual([
    'npc-deserter',
    'npc-marauder',
    'npc-cultist',
    'npc-mutant',
    'npc-rider',
  ]);
  const selectNpc = async () =>
    page.evaluate(async (u) => {
      // @ts-expect-error Vite source module.
      const { useGame, focusMap } = await import('/src/store.ts');
      focusMap(u);
      useGame.setState({
        panel: null,
        selection: { kind: 'unit', id: u.id, q: u.q, r: u.r },
        mode: 'inspect',
      });
    }, target);
  await selectNpc();
  await expect(page.locator('.npc-info')).toContainText('35');
  await expect(page.locator('.npc-info')).toContainText('2 PA');
  const title = page.locator('.selection-identity h2');
  expect((await title.boundingBox())!.height).toBeLessThan(65);
  await page.screenshot({ path: 'test-results/npc-map.png' });
  await page.getByRole('button', { name: /Attaquer avec/ }).click();
  await expect(page.getByRole('dialog')).toContainText('riposte estimée');
  await page.getByRole('button', { name: 'Confirmer l’attaque · 1 PA', exact: true }).click();
  await expect.poll(() => state.units.soldier.hp).toBeLessThan(100);
  expect(state.units[target.id]).toBeDefined();
  expect(state.realms.a.ap).toBe(9);
  for (let i = 0; i < 5 && state.units[target.id]; i++) {
    await selectNpc();
    await page.getByRole('button', { name: /Attaquer avec/ }).click();
    await page.getByRole('button', { name: 'Confirmer l’attaque · 1 PA', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(state.units[target.id]).toBeUndefined();
  expect(state.realms.a.wallet.GOLD).toBe(gold + 35);
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module.
    const { useGame } = await import('/src/store.ts');
    useGame.setState({ panel: 'events' });
  });
  await expect(page.getByRole('dialog')).toContainText('Rencontres neutres visibles');
  await expect(page.getByRole('dialog')).not.toContainText('Déserteur des brumes');
  await expect(page.getByRole('button', { name: 'Voir le PNJ', exact: true })).toHaveCount(4);
  await page
    .getByRole('dialog')
    .evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
  await page.screenshot({ path: 'test-results/npc-encounters.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/npc-mobile.png' });
  expect(errors).toEqual([]);
});
