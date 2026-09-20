import { strategy } from '../apps/server/src/strategy';
import { awardMissionTrophy, createMissionTrophy } from '../apps/server/src/mission-trophies';
import { expect, test } from './fixtures/game-test';
import { NAVAL_SHEETS, UNITS, isSea } from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  writeTile,
  tileAt,
  key,
  neighbors,
} from '@voidmarch/game-rules';
import { addBuilding, worldView, execute } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

test('trophée partagé : origine, butin du vainqueur et déblocage visibles', async ({
  page,
}, testInfo) => {
  const now = Date.now();
  let state = createState('naval-browser', now);
  const r = (state.realms.pilot = createRealm(
    'pilot',
    'Les Marées Noires',
    'ASH',
    { q: 0, r: 0 },
    now,
  ));
  r.settings.tutorialCompleted = true;
  r.settings.lastCameraQ = 0;
  r.settings.lastCameraR = 0;
  r.unlimitedAP = true;
  r.wallet = { WOOD: 1000000, STONE: 1000000, GOLD: 1000000, IRON: 1000000, FOOD: 0 };
  for (const p of disk(r.capital, 22))
    writeTile(state, p, {
      terrain: p.q >= 3 ? 'COAST' : p.q >= 0 ? 'BEACH' : 'FOREST',
      ownerId: p.q < 3 && p.q >= 0 ? 'pilot' : undefined,
      biome: p.r > 3 ? 'SNOW' : p.r < -3 ? 'DESERT' : 'TEMPERATE',
    });
  addBuilding(state, r, { q: 0, r: 0 }, 'CAMP', now);
  const port = addBuilding(state, r, { q: 2, r: 0 }, 'PORT', now, 1);
  port.population = 100;
  addBuilding(state, r, { q: 2, r: 3 }, 'SHIPYARD', now, 3);
  addBuilding(state, r, { q: 2, r: -3 }, 'NAVAL_FISHERY', now, 5);
  state.units.fisher = {
    id: 'fisher',
    kind: 'FISHING_CUTTER',
    q: 4,
    r: 0,
    ownerId: 'pilot',
    hp: UNITS.FISHING_CUTTER.hp,
    createdAt: now,
    updatedAt: now,
  };
  state.realms.ally = createRealm('ally', 'Valdoria', 'MASK', { q: 50, r: 0 }, now);
  strategy(state, now).alliances.team = {
    id: 'team',
    name: 'Les Veilleurs',
    leaderId: 'ally',
    members: ['ally', 'pilot'],
    createdAt: now,
    emblem: 'eye',
    messages: [],
    markers: [],
  };
  awardMissionTrophy(
    state,
    'ally',
    createMissionTrophy(
      {
        id: 'victory',
        title: 'Fort des Brumes',
        difficulty: 'Escarmouche',
        level: 1,
        realmId: 'ally',
        ownerId: 'mission:victory',
        objectiveId: 'master',
        objective: 'BUILDING',
        q: 70,
        r: 0,
        startedAt: now - 60000,
        distance: 30,
        units: ['INFANTRY'],
        buildings: ['VILLAGE'],
        abandonmentCost: { GOLD: 100 },
      },
      now,
      { units: 0, buildings: 0, walls: 0 },
      { GOLD: 300 },
    ),
  );
  const view = () => {
    const w = worldView(state, 'pilot', now);
    w.tiles = Object.values(state.tiles).map((t) => ({
      ...t,
      visibility: 'VISIBLE' as const,
      building: state.buildings[t.buildingId ?? ''],
    }));
    return w;
  };
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, 'pilot', actionSchema.parse(raw), now);
    state = r.state;
    return { result: r.result, world: view() };
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
        user: { id: 'pilot', username: 'Marin', faction: 'ASH', guest: true },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.navalScene=this; window.navalStore=useGame;',
      ),
    });
  });
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('/assets/')) failed.push(r.url());
  });
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 60000,
  });
  await page.evaluate(async () => {
    const path = '/src/store.ts';
    const { useGame } = await import(/* @vite-ignore */ path);
    useGame.setState({ panel: 'trophies' });
  });
  await expect(page.getByText('Alliance · victoire de Valdoria', { exact: true })).toBeVisible();
  await page.locator('.trophy-grid button').click();
  await expect(page.getByText('Butin reçu par Valdoria', { exact: true })).toBeVisible();
  await expect(page.getByText(/Trophée d’alliance · victoire de Valdoria/)).toContainText(
    'Compte pour vos déblocages',
  );
  await expect(page.getByText(/Trophée d’alliance · victoire de Valdoria/)).toContainText(
    'Les Veilleurs',
  );
  await page.screenshot({ path: testInfo.outputPath('trophee-alliance.png') });
  expect(errors).toEqual([]);
});
