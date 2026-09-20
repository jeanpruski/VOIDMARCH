import { expect, test } from './fixtures/game-test';
import { randomHeroAppearance, UNITS } from '@voidmarch/config';
import { createState, disk, writeTile, realmUnits } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView, defaultOptions } from '../apps/server/src/engine';
import { ensureHeroes } from '../apps/server/src/heroes';
import { actionSchema } from '@voidmarch/protocol';

test('héros : personnalisation, couleurs et apparence envoyée à l’inscription', async ({
  page,
}) => {
  await page.route('**/api/auth/refresh', (r) =>
    r.fulfill({ status: 401, json: { error: 'test' } }),
  );
  let sent: any;
  await page.route('**/api/auth/register', async (r) => {
    sent = r.request().postDataJSON();
    await r.fulfill({ status: 400, json: { error: 'Inscription simulée pour vérification' } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Créer un compte', exact: true }).click();
  await page.getByLabel('Nom de votre souverain').fill('JeanHeros');
  await page.getByLabel('Mot de passe', { exact: true }).fill('MotDePasseDeTest42');
  const creator = page.getByRole('region', { name: 'Personnaliser votre héros' });
  await expect(creator.getByRole('tab')).toHaveCount(3);
  await expect(creator.getByRole('tab', { name: 'Arme et accessoire' })).toHaveCount(0);
  await expect(page.locator('.identity-hero img')).toHaveAttribute('src', /^data:image/);
  await page.getByRole('tab', { name: 'Tenue et armure', exact: true }).click();
  await page.getByRole('combobox', { name: 'Tenue et armure', exact: true }).selectOption('14');
  await page.getByLabel('Couleur Tenue et armure', { exact: true }).fill('#754744');
  await page.getByRole('tab', { name: 'Tête', exact: true }).click();
  await page.getByRole('combobox', { name: 'Tête', exact: true }).selectOption('4');
  await creator.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/hero-creator.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/hero-creator-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: 'Élever ma bannière' }).click();
  await expect.poll(() => sent?.heroAppearance?.head).toBe(4);
  expect(sent.heroAppearance.armor).toBe(14);
  expect(sent.heroAppearance.colors.armor).toBe('#754744');
  // Exercise every part and all 15 frames, preserving each color selection.
  const coverage = await page.evaluate(async () => {
    // @ts-expect-error Vite fixture import.
    const { loadHeroArt, heroCanvas } = await import('/src/hero-art.ts');
    await loadHeroArt();
    const urls = [];
    for (let i = 0; i < 15; i++) {
      const c = heroCanvas({
        head: i,
        armor: i,
        boots: i,
        weapon: i,
        colors: { head: '#a6a99e', armor: '#626b55', boots: '#564844', weapon: '#b3b8bb' },
      });
      urls.push(c.toDataURL());
    }
    return new Set(urls).size;
  });
  expect(coverage).toBe(15);
});

test('héros : ancien compte, accès direct, pouvoirs et protection des versions', async ({
  page,
}) => {
  const now = Date.now(),
    id = 'hero-player';
  let state = createState('hero-browser', now);
  const r = addPlayer(state, id, 'JeanHeros', 'ASH', now);
  r.protectedUntil = 0;
  expect(r.hero).toBeUndefined(); // Existing kingdom created before heroes were introduced.
  for (const p of disk(r.capital, 10)) writeTile(state, p, { terrain: 'PLAIN' });
  ensureHeroes(state, now);
  const hero = realmUnits(state, id).find((u) => u.kind === 'HERO')!;
  state.units.ally = {
    id: 'ally',
    kind: 'INFANTRY',
    ownerId: id,
    q: hero.q + 1,
    r: hero.r,
    hp: 10,
    createdAt: now,
    updatedAt: now,
  };
  const view = () =>
    worldView(state, id, Date.now(), [
      { q: 0, r: 0 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: -1, r: -1 },
    ]);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('fixtureSnapshot', view);
  await page.exposeFunction('fixtureCommand', (raw: unknown) => {
    const r = execute(state, id, actionSchema.parse(raw), Date.now(), {
      ...defaultOptions,
      recruitBonus: () => 0,
    });
    state = r.state;
    ensureHeroes(state, Date.now());
    return { result: r.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const handlers={};window.fixturePushSnapshot=w=>handlers['world:snapshot']?.(w);const socket={on(event,fn){handlers[event]=fn;if(event==='connect')queueMicrotask(fn);return socket;},emit(event){if(['world:join','chunks:subscribe','player:ping'].includes(event))window.fixtureSnapshot().then(w=>handlers['world:snapshot']?.(w));return socket;},timeout(){return socket;},async emitWithAck(event,action){const r=await window.fixtureCommand(action);handlers['world:snapshot']?.(r.world);return r.result;},disconnect(){}};return socket;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
    user: { id, username: 'Escadrille noire', faction: 'ASH', guest: true },
  };
  await page.route('**/api/**', (route) => route.fulfill({ json: session }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.locator('.board canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Centrer la capitale', exact: true }).click();
  await page.getByRole('button', { name: 'Aller à mon héros', exact: true }).click();
  expect(
    await page.evaluate(async () => {
      // @ts-expect-error Vite fixture import.
      const { useGame } = await import('/src/store.ts');
      return useGame.getState().selection?.id;
    }),
  ).toBe(hero.id);
  await expect(page.locator('.hero-controls')).toContainText('JeanHeros');
  await expect(page.locator('.selection-identity img')).toHaveAttribute('src', /^data:image/);
  await page.getByRole('button', { name: 'Secours de campagne · 2 PA', exact: true }).click();
  await expect.poll(() => state.units.ally.hp).toBe(16);
  await expect(page.getByRole('button', { name: /Secours de campagne · 2 PA ·/ })).toBeDisabled();
  const layout = await page.locator('.selection-panel').evaluate((panel) => {
    const identity = panel.querySelector('.selection-identity')!.getBoundingClientRect();
    const controls = panel.querySelector('.hero-controls')!.getBoundingClientRect();
    const stats = panel.querySelector('.unit-stats')!.getBoundingClientRect();
    return controls.top >= Math.max(identity.bottom, stats.bottom);
  });
  expect(layout).toBe(true);
  await page.screenshot({ path: 'test-results/hero-world.png' });
  await page.getByRole('button', { name: 'Fermer la sélection', exact: true }).click();
  await page.screenshot({ path: 'test-results/hero-map-marker.png' });
  await page.evaluate(async (u) => {
    // @ts-expect-error Vite fixture import.
    const { useGame } = await import('/src/store.ts');
    useGame.setState({ selection: { kind: 'unit', id: u.id, q: u.q, r: u.r } });
  }, hero);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Aller à mon héros', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(async (u) => {
        // @ts-expect-error Vite fixture import.
        const { useGame } = await import('/src/store.ts');
        // @ts-expect-error Vite fixture import.
        const { hexToPixel } = await import('/src/map-geometry.ts');
        const viewport = useGame.getState().cameraViewport;
        if (!viewport) return false;
        const board = document.querySelector('.board')!.getBoundingClientRect();
        const panel = document.querySelector('.selection-panel')!.getBoundingClientRect();
        const y = board.top + ((hexToPixel(u).y - viewport.y) / viewport.height) * board.height;
        return y > board.top + 60 && y + 20 < panel.top;
      }, hero),
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/hero-world-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Keep the transport's subsequent snapshots in convalescence too; camera
  // subscriptions must not restore the old, healthy fixture halfway through.
  delete state.units[hero.id];
  state.realms[id].hero = { ...state.realms[id].hero!, recoverAt: Date.now() + 60_000 };
  const recovering = view();
  await page.evaluate((w) => (window as any).fixturePushSnapshot(w), recovering);
  await page.getByRole('button', { name: 'Aller à mon héros', exact: true }).click();
  // The kingdom panel intentionally no longer contains hero controls.
  await expect(page.getByRole('dialog', { name: 'Votre royaume', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').locator('.hero-controls')).toHaveCount(0);
  const incompatible = structuredClone(view());
  // @ts-expect-error Future unit kind from a newer server.
  incompatible.units[0].kind = 'FUTURE_UNIT';
  await page.evaluate((w) => (window as any).fixturePushSnapshot(w), incompatible);
  await expect(page.getByRole('alert')).toContainText('Une mise à jour du jeu est nécessaire');
  await expect(page.getByRole('button', { name: 'Recharger le jeu' })).toBeVisible();
  await expect(page.locator('.board canvas')).toHaveCount(0);
  // Late snapshots and camera events must not call a destroyed Phaser camera.
  await page.evaluate((w) => {
    (window as any).fixturePushSnapshot(w);
    window.dispatchEvent(new CustomEvent('vm:camera', { detail: { command: 'home' } }));
    window.dispatchEvent(new Event('resize'));
  }, view());
  expect(errors).toEqual([]);
});
