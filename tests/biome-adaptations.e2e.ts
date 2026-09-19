import { expect, test } from '@playwright/test';
import { UNITS, BIOMES, type Biome, type UnitKind } from '@voidmarch/config';
import { createState, disk, key, writeTile, refreshWorldTraining } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('adaptations : quatre biomes, portée sur la carte, départ figé, fiches et recrutement', async ({
  page,
}) => {
  const now = Date.now();
  let state = createState('biome-adaptation-browser', now);
  const realm = addPlayer(state, 'pilot', 'Les climats', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  realm.wallet = { GOLD: 1e6, WOOD: 1e6, STONE: 1e6, IRON: 1e6, FOOD: 1e6 };
  state.units = {};
  const entries: [Biome, UnitKind][] = [
    ['SNOW', 'GIVR_MUSKET'],
    ['DESERT', 'SOL_KHOPESH'],
    ['TEMPERATE', 'RONC_MUSKET'],
    ['AUTUMN', 'RONC_GRENADIER'],
  ];
  for (const p of disk({ q: 0, r: 0 }, 14)) {
    writeTile(state, p, { terrain: 'PLAIN', biome: 'DESERT', road: false, ownerId: undefined });
    realm.explored[key(p)] = { ...p, terrain: 'PLAIN', biome: 'DESERT', visibility: 'EXPLORED' };
  }
  const barracks = addBuilding(state, realm, { q: 0, r: -2 }, 'BARRACKS', now, 5);
  addBuilding(state, realm, { q: 0, r: -3 }, 'FORGE', now);
  entries.forEach(([biome, kind], i) => {
    const unit = {
      id: biome,
      kind,
      ownerId: 'pilot',
      q: 0,
      r: i * 2,
      hp: UNITS[kind].hp,
      createdAt: now,
      updatedAt: now,
    };
    state.units[biome] = unit;
    writeTile(state, unit, { biome });
  });
  refreshWorldTraining(state, now);
  const view = () => {
    const world = worldView(state, 'pilot', now);
    world.tiles = Object.values(state.tiles).map((t) => ({
      ...t,
      building: state.buildings[t.buildingId ?? ''],
      visibility: 'VISIBLE' as const,
    }));
    return world;
  };
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
        user: { id: 'pilot', username: realm.name, faction: 'ASH', guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.biomeMoveStore=useGame; window.biomeMoveScene=this;',
      ),
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  for (const [biome, kind] of entries) {
    const unit = state.units[biome];
    await page.evaluate(
      (u) =>
        (window as any).biomeMoveStore.setState({
          selection: { kind: 'unit', id: u.id, q: u.q, r: u.r },
          panel: null,
          mode: 'move',
        }),
      unit,
    );
    const panel = page.locator('.selection-panel');
    await expect(panel.locator('.biome-adaptation summary')).toContainText(
      `${BIOMES[biome].name.toLowerCase()} · actif`,
    );
    await expect(
      panel.locator('.unit-stats > div').filter({ hasText: 'MOUV.' }).locator('strong'),
    ).toHaveText(String(UNITS[kind].move + 1));
    const paths = await page.evaluate(
      ({ id, max }) => {
        const scene = (window as any).biomeMoveScene;
        const unit = scene.view.units.find((u: any) => u.id === id);
        return [
          scene.path(unit, { q: max, r: unit.r })?.length,
          scene.path(unit, { q: max + 1, r: unit.r }),
        ];
      },
      { id: biome, max: UNITS[kind].move + 1 },
    );
    expect(paths).toEqual([UNITS[kind].move + 1, null]);
  }
  await page.evaluate(() =>
    (window as any).biomeMoveStore.setState({
      selection: { kind: 'unit', id: 'SNOW', q: 0, r: 0 },
      mode: 'move',
    }),
  );
  await page
    .getByRole('button', { name: `Origine des bonus de ${UNITS.GIVR_MUSKET.name}` })
    .click();
  await expect(page.getByRole('dialog').locator('.biome-adaptation summary')).toContainText(
    'enneigé · actif',
  );
  await page.keyboard.press('Escape');
  await page.evaluate(() => (window as any).biomeMoveScene.click({ q: 4, r: 0 }));
  await expect.poll(() => state.units.SNOW.q).toBe(4);
  await expect(page.locator('.selection-panel .biome-adaptation summary')).toContainText(
    'inactif ici',
  );
  await expect(
    page.locator('.unit-stats > div').filter({ hasText: 'MOUV.' }).locator('strong'),
  ).toHaveText('3');
  await page.evaluate(
    (b) =>
      (window as any).biomeMoveStore.setState({
        selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
        panel: 'recruit',
        mode: 'inspect',
      }),
    barracks,
  );
  await page.getByRole('dialog').getByRole('searchbox').fill('froid');
  const cards = page.locator('.catalog article');
  expect(await cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all())
    await expect(card.locator('.biome-adaptation summary')).toContainText('enneigé');
  await page.setViewportSize({ width: 390, height: 844 });
  await cards.first().locator('.biome-adaptation').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'test-results/biome-adaptations-mobile.png',
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
