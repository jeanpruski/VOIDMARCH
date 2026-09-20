import { test, expect } from '@playwright/test';
import { createState, createRealm, disk, writeTile } from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { prepareTrophies } from './fixtures/development';

test('afficher le seuil rouge 3/5 puis autoriser le niveau 3 avec cinq trophées', async ({
  page,
}, testInfo) => {
  const now = Date.now();
  let s = createState('offshore-ui', now);
  const r = (s.realms.a = createRealm('a', 'Rivage', 'ASH', { q: 0, r: 0 }, now));
  r.settings.tutorialCompleted = true;
  r.wallet = { GOLD: 10000, WOOD: 10000, IRON: 10000, STONE: 10000, FOOD: 10000 };
  for (const p of disk(r.capital, 6)) writeTile(s, p, { terrain: 'PLAIN', ownerId: 'a' });
  const building = addBuilding(s, r, r.capital, 'QUARRY', now, 2);
  prepareTrophies(s, 'a', 3, now);
  const trophies = [...s.missions!.a.trophies!];
  s.missions!.a.trophies = trophies.slice(0, 3);
  const view = () =>
    worldView(s, 'a', now, [
      { q: 0, r: 0 },
      { q: 0, r: -1 },
    ]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('shoreSnapshot', view);
  await page.exposeFunction('earnTwoTrophies', () => {
    s.missions!.a.trophies = trophies;
    return view();
  });
  await page.exposeFunction('shoreCommand', (raw: unknown) => {
    const result = execute(s, 'a', actionSchema.parse(raw), now);
    s = result.state;
    return { result: result.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};window.__trophySnapshot=w=>h['world:snapshot']?.(w);const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(){window.shoreSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.shoreCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'a', username: r.name, faction: 'ASH', guest: false },
      },
    }),
  );
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  await page.evaluate(async (building) => {
    // @ts-expect-error Vite browser module.
    const { select, focusMap } = await import('/src/store.ts');
    select({ kind: 'building', id: building.id, q: building.q, r: building.r });
    focusMap(building);
  }, building);
  await page.getByRole('button', { name: 'Améliorer · 2 PA', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.development-trophies .negative')).toContainText('Trophées : 3/5');
  await expect(dialog.locator('.development-trophies .negative')).toBeVisible();
  const confirm = dialog.locator('button').filter({ hasText: 'Confirmer l’amélioration · 2 PA' });
  await expect(confirm).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('seuil-trophees.png'), animations: 'disabled' });
  await page.evaluate(async () => {
    // @ts-expect-error Browser fixture transport.
    window.__trophySnapshot(await window.earnTwoTrophies());
  });
  await expect(dialog.locator('.development-trophies .positive')).toContainText('Trophées : 5/5');
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect.poll(() => s.buildings[building.id].level).toBe(3);
  expect(s.missions!.a.trophies).toHaveLength(5);
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});
