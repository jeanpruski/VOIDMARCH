import { ensureHeroes } from '../apps/server/src/heroes';
import { expect, test } from '@playwright/test';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';

test('bannières : aperçu, sauvegarde, texture de carte et toutes les variantes', async ({
  page,
}) => {
  page.setDefaultTimeout(15000);
  const now = Date.now();
  const state = createState('grid-browser', now);
  const realm = addPlayer(state, 'grid-player', 'Cartographes', 'ASH', now, 'established');
  ensureHeroes(state, now);
  realm.settings.grid = false;
  realm.settings.reducedMotion = true;
  realm.settings.tutorialCompleted = true;
  await page.exposeFunction('fixtureSnapshot', () =>
    worldView(state, realm.id, Date.now()),
  );
  await page.route(/\/src\/Map\.tsx(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /\bcreate\(\)\s*\{/,
      'create() { window.__bannerScene = this;',
    );
    await route.fulfill({ response, body });
  });
  // Only the initial snapshot is sent: preference updates must also work via HTTP.
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};let joined=false;return {on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return this},emit(e){if(e==='world:join'&&!joined){joined=true;window.fixtureSnapshot().then(w=>h['world:snapshot']?.(w));}return this},disconnect(){}}}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id: realm.id, username: realm.name, faction: 'ASH', guest: true },
  };
  await page.route('**/api/**', async (route) => {
    if (route.request().url().endsWith('/settings')) {
      Object.assign(realm.settings, route.request().postDataJSON());
      return route.fulfill({ json: { settings: realm.settings } });
    }
    await route.fulfill({ json: session });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', { timeout: 90000 });
  await expect
    .poll(() =>
      page.evaluate(
        () => !!(window as any).__bannerScene?.textures.exists('realm-banner:grid-player'),
      ),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Profil du souverain' }).click();
  await page.getByRole('button', { name: 'Emblème Atome', exact: true }).click();
  await page.getByLabel('Couleur principale · emblème et territoire').fill('#ffcc22');
  await page.getByLabel('Couleur secondaire · fond et liseré').fill('#552277');
  await page.getByRole('combobox', { name: /^Motif du fond/ }).selectOption('diagonal');
  await page.getByLabel('Troisième couleur · motif').fill('#182644');
  await page.getByRole('combobox', { name: /^Forme de bannière/ }).selectOption('shield');
  await page.getByLabel('Mini-drapeaux sur la carte').selectOption('pennant');
  await page.screenshot({ path: 'test-results/banner-profile.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Enregistrer la bannière', exact: true }).click();
  await expect.poll(() => realm.settings.bannerPattern).toBe('diagonal');
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__bannerScene?.bannerDesigns.get('grid-player')),
    )
    .toContain('"miniShape":"pennant"');
  await page.keyboard.press('Escape');
  const rings = await page.evaluate(() => {
    const scene = (window as any).__bannerScene;
    const objects = scene.children.list;
    const hero = objects.find((o: any) => o.name.startsWith('hero-halo:'));
    const unit = objects.find((o: any) => o.name.startsWith('unit-owner:'));
    return [hero, unit].map((o: any) => !!o && o.commandBuffer.includes(0xffcc22) && o.commandBuffer.includes(0x552277));
  });
  expect(rings).toEqual([true, true]);
  await page.screenshot({ path: 'test-results/banner-map.png', animations: 'disabled' });
  await page.reload();
  await page.getByRole('button', { name: 'Profil du souverain' }).click();
  await expect(page.getByRole('combobox', { name: /^Motif du fond/ })).toHaveValue('diagonal');
  await expect(page.getByRole('button', { name: 'Emblème Atome', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Mini-drapeaux sur la carte')).toHaveValue('pennant');
  const dialog = page.getByRole('dialog');
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: 'test-results/banner-profile-mobile.png', animations: 'disabled' });
  const variants = await page.evaluate(async () => {
    const moduleUrl = '/src/banner-art.ts';
    const art = await import(moduleUrl);
    const gallery = document.createElement('div');
    gallery.style.cssText =
      'position:fixed;inset:0;background:#152019;z-index:999999;overflow:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:15px;padding:20px;color:white';
    let count = 0;
    for (const shape of Object.keys(art.BANNER_SHAPES))
      for (const pattern of Object.keys(art.BANNER_PATTERNS)) {
        const d = art.bannerDesign({
          bannerShape: shape,
          bannerPattern: pattern,
          bannerColor: '#ffcc22',
          bannerSecondary: '#552277',
          bannerAccent: '#182644',
          emblem: 'atom',
        });
        const card = document.createElement('div');
        card.textContent = `${shape} / ${pattern}`;
        const canvas = art.bannerCanvas(d);
        canvas.style.width = '100%';
        const pixels = canvas.getContext('2d').getImageData(0, 0, 200, 140).data;
        if (!pixels.some((v: number, i: number) => i % 4 === 3 && v > 0))
          throw new Error('Empty flag');
        card.append(canvas);
        gallery.append(card);
        count++;
      }
    document.body.append(gallery);
    return count;
  });
  expect(variants).toBe(16);
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.screenshot({ path: 'test-results/banner-variants.png', animations: 'disabled' });
  expect(errors).toEqual([]);
});
