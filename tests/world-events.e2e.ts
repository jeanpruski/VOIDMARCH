import { expect, test } from '@playwright/test';
import { UNITS } from '@voidmarch/config';
import { createState, createRealm, disk, writeTile } from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('événements : efface nom, figurine et action après expiration ou retrait', async ({
  page,
}) => {
  const now = Date.now();
  let state = createState('event-browser', now);
  const realm = (state.realms.pilot = createRealm(
    'pilot',
    'Veilleurs',
    'ASH',
    { q: 0, r: 0 },
    now,
  ));
  realm.settings.tutorialCompleted = true;
  for (const p of disk(realm.capital, 5)) writeTile(state, p, { terrain: 'PLAIN' });
  addBuilding(state, realm, realm.capital, 'CAMP', now);
  state.units.troop = {
    id: 'troop',
    kind: 'PEASANT',
    ownerId: realm.id,
    q: 1,
    r: 0,
    hp: UNITS.PEASANT.hp,
    createdAt: now,
    updatedAt: now,
  };
  state.events.event = {
    id: 'event',
    q: 1,
    r: 0,
    kind: 'METEOR',
    title: 'Étoile disparue',
    description: 'Une météorite',
    reward: { GOLD: 15 },
    global: true,
    startsAt: now,
    endsAt: now + 120000,
  };
  const view = () => worldView(state, realm.id, now);
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const result = execute(state, 'pilot', actionSchema.parse(raw), now);
    state = result.state;
    return { result: result.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.fixtureCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'pilot', username: 'La légion', faction: 'ASH', guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.eventsStore=useGame; window.eventsScene=this;',
      ),
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  const visuals = () =>
    page.evaluate(() => {
      const children = (window as any).eventsScene.children.list;
      return children
        .filter((o: any) => o.name?.startsWith('world-event-'))
        .map((o: any) => o.name)
        .sort();
    });
  await expect.poll(visuals).toEqual(['world-event-label:event', 'world-event-sprite:event']);
  await page.evaluate(() =>
    (window as any).eventsStore.setState({
      selection: { kind: 'unit', id: 'troop', q: 1, r: 0 },
      selectedUnitIds: ['troop'],
    }),
  );
  await expect(page.getByRole('button', { name: /Explorer l’anomalie/ })).toBeVisible();
  // Time advances while the server snapshot stays unchanged.
  await page.evaluate((time) => (window as any).eventsStore.setState({ now: time }), now + 120000);
  await expect.poll(visuals).toEqual([]);
  await expect(page.getByRole('button', { name: /Explorer l’anomalie/ })).toHaveCount(0);
  // A stale snapshot containing an expired event must not draw it again.
  await page.evaluate((time) => {
    const store = (window as any).eventsStore;
    const world = structuredClone(store.getState().world);
    world.serverTimestamp = time;
    store.setState({ world, now: time });
  }, now + 120000);
  await expect.poll(visuals).toEqual([]);
  // Recovered events can arrive marked claimed or removed from the next snapshot.
  for (const mode of ['claimed', 'removed']) {
    await page.evaluate(async () => {
      const world = await (window as any).fixtureSnapshot();
      (window as any).eventsStore.setState({ world, now: world.serverTimestamp });
    });
    await expect.poll(visuals).toHaveLength(2);
    await page.evaluate((mode) => {
      const store = (window as any).eventsStore;
      const world = structuredClone(store.getState().world);
      if (mode === 'claimed') world.events[0].claimedBy = 'pilot';
      else world.events = [];
      store.setState({ world });
    }, mode);
    await expect.poll(visuals).toEqual([]);
    await expect(page.getByRole('button', { name: /Explorer l’anomalie/ })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
