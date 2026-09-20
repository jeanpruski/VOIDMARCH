import { test, expect } from './fixtures/game-test';
import {
  createState,
  disk,
  key,
  migrateOceans,
  ensureSeaAccess,
  tileAt,
} from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';

test('ancienne carte : repérer la côte sans déplacer les troupes', async ({ page }, testInfo) => {
  const now = Date.now(),
    state = createState('coast-browser', now);
  const realm = addPlayer(state, 'a', 'Les Navigateurs', 'ASH', now);
  realm.settings.tutorialCompleted = true;
  for (const p of disk(realm.capital, 110))
    realm.explored[key(p)] = { ...p, terrain: 'PLAIN', biome: 'TEMPERATE', visibility: 'EXPLORED' };
  migrateOceans(state);
  expect(ensureSeaAccess(state, realm, now)).toBe('CREATED');
  const coast = realm.seaAccess!.position!;
  const units = structuredClone(state.units);
  const snapshot = worldView(state, 'a', now);
  snapshot.tiles = [...disk(realm.capital, 12), ...disk(coast, 20)].map((p) => ({
    ...tileAt(state, p),
    visibility: 'EXPLORED' as const,
  }));
  await page.exposeFunction('coastSnapshot', () => snapshot);
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const push=()=>window.coastSnapshot().then(w=>h['world:snapshot']?.(w));const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(){push();return s},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'a', username: realm.name, faction: 'ASH', guest: false },
      },
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let focused: unknown;
  await page.exposeFunction('recordCoastFocus', (p: unknown) => {
    focused = p;
  });
  await page.addInitScript(() =>
    window.addEventListener('vm:camera', (e) => {
      // @ts-expect-error Playwright exposed callback
      window.recordCoastFocus((e as CustomEvent).detail);
    }),
  );
  await page.goto('/');
  await expect(page.getByText('Génération de la carte…')).toBeHidden({ timeout: 90000 });
  await page.getByRole('button', { name: 'Royaume', exact: true }).click();
  await expect(page.getByText('Accès à la mer', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText(
    `${realm.seaAccess!.distance} cases de votre capitale`,
  );
  await page.screenshot({ path: testInfo.outputPath('acces-maritime.png') });
  await page.getByRole('button', { name: 'Repérer la côte', exact: true }).click();
  await expect.poll(() => focused).toEqual({ ...coast, abovePanel: false });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('ancienne-carte-nouvelle-cote.png') });
  expect(state.units).toEqual(units);
  expect(errors).toEqual([]);
});
