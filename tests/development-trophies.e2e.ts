import { test, expect } from './fixtures/game-test';
import { resolve } from 'node:path';
import { createState } from '@voidmarch/game-rules';
import { ERA_REQUIREMENTS, ERA_COSTS } from '@voidmarch/config';
import { actionSchema } from '@voidmarch/protocol';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { prepareTrophies } from './fixtures/development';

test('époques : passage volontaire, coûts, trophées et informations sur ordinateur/mobile', async ({
  page,
}, testInfo) => {
  const now = Date.now();
  let state = createState('adventures-test', now);
  const r = addPlayer(state, 'a', 'Chroniqueur', 'ASH', now);
  r.wallet = { GOLD: 1e7, WOOD: 1e7, STONE: 1e7, IRON: 1e7, FOOD: 1e7 };
  r.unlimitedAP = true;
  // Already surveyed infrastructure isolates the UI; epoch progression still uses real server validation.
  for (const reqs of Object.values(ERA_REQUIREMENTS))
    for (const req of reqs) {
      const b =
        Object.values(state.buildings).find((b) => req.kinds.includes(b.kind)) ??
        addBuilding(
          state,
          r,
          { q: r.capital.q + Object.keys(state.buildings).length, r: r.capital.r },
          req.kinds[0],
          now,
        );
      b.level = Math.max(b.level, req.level);
    }
  addBuilding(state, r, { q: r.capital.q - 1, r: r.capital.r }, 'BARRACKS', now, 5);
  const snapshot = () => worldView(state, 'a', now);
  await page.exposeFunction('eraSetup', () => ({
    session: {
      token: 'era-test',
      user: { id: 'a', username: r.name, faction: 'ASH', guest: false },
    },
    world: snapshot(),
  }));
  await page.exposeFunction('eraSnapshot', snapshot);
  await page.exposeFunction('awardEraTrophies', (level: number) =>
    prepareTrophies(state, 'a', level, now),
  );
  const commands: string[] = [];
  await page.exposeFunction('eraCommand', (raw: unknown) => {
    const command = actionSchema.parse(raw);
    commands.push(command.type);
    const result = execute(state, 'a', command, now);
    state = result.state;
    return { result: result.result, world: snapshot() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(e){if(['world:join','world:sync','chunks:subscribe','player:ping'].includes(e))window.eraSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.eraCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  const template = await (await page.request.get('/')).text();
  await page.route('**/era-browser', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: template.replace('/src/main.tsx', `/@fs/${resolve('tests/fixtures/kingdom-eras.tsx')}`),
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/era-browser');
  const kingdom = page.getByRole('region', { name: 'Progression du royaume' });
  await expect(kingdom).toContainText('Époque 1/5');
  await expect(kingdom).toContainText('Trophées : 0/1');
  await expect(kingdom).toContainText('Encore 1 trophée');
  await expect(page.getByRole('region', { name: 'Progression des expéditions' })).toContainText(
    'sans combat obligatoire',
  );
  await expect(kingdom.getByRole('button', { name: /Passer à l’époque/ })).toHaveCount(0);
  for (const level of [2, 3, 4, 5]) {
    await page.evaluate(async (level) => {
      await (window as any).awardEraTrophies(level);
      (window as any).eraStore.setState({ world: await (window as any).eraSnapshot() });
    }, level);
    await expect(kingdom).toContainText(`Époque ${level - 1}/5`);
    const before = state.realms.a.wallet.GOLD;
    await kingdom
      .getByRole('button', { name: `Passer à l’époque ${level} · 5 PA`, exact: true })
      .click();
    await expect(kingdom).toContainText(`Époque ${level}/5`);
    expect(state.realms.a.wallet.GOLD).toBe(before - ERA_COSTS[level].GOLD!);
    if (level === 3) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: testInfo.outputPath('epoque-mobile.png') });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  await expect(kingdom.getByRole('button', { name: /Passer à l’époque/ })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Progression des expéditions' })).toContainText(
    '5/5',
  );
  expect(commands).toEqual(Array(4).fill('ADVANCE_ERA'));
  expect(errors).toEqual([]);
});
