import { expect, test } from './fixtures/game-test';
import { createState, createRealm, disk, key, writeTile } from '@voidmarch/game-rules';
import { UNITS } from '@voidmarch/config';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('Espace confirme une attaque avec la vraie carte, sans doublon ni action pendant la saisie', async ({
  page,
}) => {
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
  for (const [index, kind] of (['PEASANT', 'HERO', 'RIFLEMAN'] as const).entries()) {
    state.units[`u${index}`] = {
      id: `u${index}`,
      ownerId: id,
      kind,
      q: 0,
      r: index * 2,
      hp: UNITS[kind].hp,
      createdAt: now,
      updatedAt: now,
    };
  }
  realm.protectedUntil = 0;
  const enemy = (state.realms.enemy = createRealm(
    'enemy',
    'Adversaire',
    'MASK',
    { q: 30, r: 0 },
    now,
  ));
  enemy.protectedUntil = 0;
  state.units.target = {
    id: 'target',
    ownerId: 'enemy',
    kind: 'RIFLEMAN',
    q: 1,
    r: 4,
    hp: 1000,
    createdAt: now,
    updatedAt: now,
  };
  const view = () => worldView(state, id, now, disk({ q: 0, r: 0 }, 1));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureAP', (ap: number) => {
    state.realms[id].ap = ap;
    state.realms[id].apAt = now;
    state.revision++;
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
      body: `export function io(){const h={};window.__groupSocketSnapshot=(w)=>h['world:snapshot']?.(w);let delayed=false;const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s;},emit(e){if(e==='world:sync'&&delayed)return s;if(['world:join','chunks:subscribe','player:ping','world:sync'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s;},timeout(){return s;},async emitWithAck(e,a){await new Promise(r=>setTimeout(r,500));const result=await window.fixtureCommand(a);if(a.type==='ARMY_SAVE'){delayed=true;setTimeout(()=>{delayed=false;h['world:snapshot']?.(result.world);},350);return result.result;}h['world:snapshot']?.(result.world);return result.result;},disconnect(){}};return s;}`,
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
        'create() { window.__groupScene = this; window.__groupStore = useGame;',
      ),
    });
  });
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  await page.evaluate(() =>
    (window as any).__groupStore.setState({
      selection: { kind: 'unit', id: 'u2', q: 0, r: 4 },
      combatTarget: 'target',
      panel: null,
    }),
  );
  const dialog = page.getByRole('dialog');
  const confirm = page.getByRole('button', { name: 'Confirmer l’attaque · 1 PA', exact: true });
  await expect(confirm).toBeEnabled();
  await expect(confirm).toHaveAttribute('aria-keyshortcuts', 'Space');
  await dialog.focus();
  await page.keyboard.press('Control+Space');
  expect(orders).toBe(0);
  await dialog.evaluate((element) => {
    const input = document.createElement('input');
    input.id = 'test-writing';
    element.append(input);
    input.focus();
  });
  await page.keyboard.press('Space');
  expect(orders).toBe(0);
  await page.locator('#test-writing').evaluate((el) => el.remove());
  await dialog.focus();
  const hp = state.units.target.hp;
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect.poll(() => orders, { timeout: 5000 }).toBe(1);
  expect(state.units.target.hp).toBeLessThan(hp);
  await expect
    .poll(() => page.evaluate(() => (window as any).__groupStore.getState().pending))
    .toBe(false);
  expect(orders).toBe(1);
  expect(errors).toEqual([]);
});
