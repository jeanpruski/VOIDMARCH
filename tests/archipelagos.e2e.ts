import { test, expect } from '@playwright/test';
import {
  createState,
  createRealm,
  migrateOceans,
  migrateArchipelagos,
  archipelagoInSector,
  disk,
  tileAt,
  key,
} from '@voidmarch/game-rules';
import { worldView, execute } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { ISLAND_DISCOVERIES, UNITS } from '@voidmarch/config';
test('archipel réel : trois lieux illustrés, informations de butin et fouille unique', async ({
  page,
}, testInfo) => {
  const now = Date.now();
  let s = createState('voidmarch-vhal-01', now);
  migrateOceans(s);
  migrateArchipelagos(s);
  const sites = archipelagoInSector(s, -5, -3),
    center = { q: sites[0].q, r: sites[0].r };
  const r = (s.realms.a = createRealm('a', 'Les Navigateurs', 'MASK', center, now));
  r.settings.tutorialCompleted = true;
  s.units.explorer = {
    id: 'explorer',
    ownerId: 'a',
    kind: 'PEASANT',
    ...center,
    hp: UNITS.PEASANT.hp,
    createdAt: now,
    updatedAt: now,
  };
  const area = disk(center, 46);
  const view = () => {
    const w = worldView(s, 'a', now);
    w.tiles = area.map((p) => ({ ...tileAt(s, p), visibility: 'VISIBLE' as const }));
    return w;
  };
  await page.exposeFunction('islandSnapshot', view);
  await page.exposeFunction('islandCommand', (raw: unknown) => {
    const result = execute(s, 'a', actionSchema.parse(raw), now);
    s = result.state;
    return { result: result.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(){window.islandSnapshot().then(w=>h['world:snapshot']?.(w));return s},timeout(){return s},async emitWithAck(e,a){const r=await window.islandCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'a', username: r.name, faction: 'MASK', guest: false },
      },
    }),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /\bcreate\(\)\s*\{/,
        'create() { window.islandScene=this;',
      ),
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  const focus = async (p: { q: number; r: number }, zoom: number) =>
    page.evaluate(
      async ({ p, zoom }) => {
        // @ts-expect-error Vite browser module.
        const { select } = await import('/src/store.ts');
        // @ts-expect-error Vite browser module.
        const { hexToPixel } = await import('/src/map-geometry.ts');
        select({ kind: 'tile', ...p });
        const scene = (window as any).islandScene,
          pixel = hexToPixel(p);
        scene.cameras.main.setZoom(zoom).centerOn(pixel.x, pixel.y);
        scene.renderMap();
      },
      { p, zoom },
    );
  await focus(center, 0.34);
  await page.screenshot({ path: testInfo.outputPath('archipel.png'), animations: 'disabled' });
  for (const site of sites) {
    await focus({ q: site.q, r: site.r }, 1.1);
    await expect
      .poll(() =>
        page.evaluate(
          (kind) => !!(window as any).islandScene.textures.exists(`island:${kind}`),
          site.kind,
        ),
      )
      .toBe(true);
    await expect(page.locator('.island-discovery-info')).toContainText(
      ISLAND_DISCOVERIES[site.kind].name,
    );
    await expect(page.locator('.island-discovery-info')).toContainText('Butin unique');
    await page.screenshot({
      path: testInfo.outputPath(`${site.kind}.png`),
      animations: 'disabled',
    });
  }
  await focus(center, 1);
  await page.evaluate(async (center) => {
    // @ts-expect-error Vite browser module.
    const { select } = await import('/src/store.ts');
    select({ kind: 'unit', id: 'explorer', ...center });
  }, center);
  await page.getByRole('button', { name: /^Fouiller/ }).click();
  await expect.poll(() => tileAt(s, center).exhausted).toBe(true);
  await expect(page.locator('.island-discovery-info')).toContainText('déjà été fouillé');
  await expect(page.getByRole('button', { name: /^Fouiller/ })).toHaveCount(0);
  expect(s.realms.a.wallet.GOLD).toBe(r.wallet.GOLD + ISLAND_DISCOVERIES.LIGHTHOUSE.reward.GOLD!);
  expect(errors).toEqual([]);
});
