import type { WorldView } from '@voidmarch/shared';
import { test, expect, type Page } from '@playwright/test';
async function moveWorkerToResource(page: Page, terrain: 'FOREST' | 'RUINS') {
  await page.evaluate(async (terrain) => {
    // @ts-expect-error Browser source module served by Vite.
    const { useGame, send } = await import('/src/store.ts');
    const world: WorldView = useGame.getState().world;
    const worker = world.units.find((u) => u.ownerId === world.player.id && u.kind === 'PEASANT')!;
    const target = {
      q: world.player.capital.q + (terrain === 'FOREST' ? 1 : -1),
      r: world.player.capital.r,
    };
    await send({ type: 'MOVE', actorId: worker.id, payload: { path: [target] } });
  }, terrain);
}
const suffix = Date.now().toString(36);
test('les invités sont désactivés et un compte inscrit renouvelle sa session', async ({
  request,
}) => {
  const username = `Test Auth ${suffix}`;
  const denied = await request.post('/api/auth/guest', { data: { username, faction: 'ASH' } });
  expect(denied.status()).toBe(403);
  const registered = await request.post('/api/auth/register', {
    data: { username, password: 'CendresDesMarches2026', faction: 'ASH' },
  });
  expect(registered.ok()).toBe(true);
  const account = await registered.json();
  expect(account.user.guest).toBe(false);
  const refreshed = await request.post('/api/auth/refresh', { data: {} });
  expect(refreshed.ok()).toBe(true);
  expect((await refreshed.json()).user.id).toBe(account.user.id);
  const login = await request.post('/api/auth/login', {
    data: { username: username.toLowerCase(), password: 'CendresDesMarches2026' },
  });
  expect(login.ok()).toBe(true);
  expect((await login.json()).user.id).toBe(account.user.id);
});
test('un souverain joue, construit, négocie et retrouve son royaume', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByLabel('Nom de votre souverain').fill(`Test Cendre ${suffix}`);
  await page.getByLabel('Mot de passe', { exact: true }).fill('CendresDesMarches2026');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: 'Élever ma bannière' }).click();
  await page.getByRole('button', { name: 'Entrer dans les Marches' }).click();
  await expect(page.getByRole('application')).toBeVisible();
  await expect(page.getByRole('application')).toBeVisible();
  await expect(page.locator('.map-heading')).toHaveCount(0);
  await page.screenshot({
    path: 'test-results/desktop.png',
    animations: 'disabled',
    timeout: 20000,
  });
  await page.getByRole('button', { name: 'Économie E', exact: false }).click();
  await expect(page.getByRole('dialog')).toContainText('Les richesses des Marches');
  await expect(page.getByRole('dialog')).toContainText('Domaines productifs');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Recruter', exact: true }).click();
  await expect(page.getByRole('dialog').locator('article')).toHaveCount(30);
  await page.getByRole('button', { name: 'Former le paysan · 1 PA' }).click();
  await expect(page.getByRole('dialog')).toContainText('Mobilisation : 3/');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Armées A', exact: false }).click();
  await page.getByRole('dialog').getByRole('searchbox').fill('Paysan');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Paysan/ })
    .click();
  await moveWorkerToResource(page, 'FOREST');
  await page.getByRole('button', { name: 'Récolter bois +20 · 1 PA' }).click();
  await expect(page.getByText('Récolte : +20 bois.', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Construire', exact: true }).click();
  const house = page
    .getByRole('dialog')
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Chaumière', exact: true }) });
  await house.getByRole('button', { name: 'Construire · 1 PA' }).click();
  await expect(house).toContainText('Hexagone déjà construit');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: 'Commerce & diplomatie D', exact: false }).click();
  await expect(page.getByRole('dialog')).toContainText('Tribut & trêve');
  await page.getByRole('button', { name: 'Proposer l’accord' }).click();
  await expect(page.getByRole('dialog')).toContainText('Votre proposition');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: `Test Cendre ${suffix}`, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('application')).toBeVisible();
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await page.getByLabel('Coordonnées axiales').check();
  await page.getByRole('button', { name: 'Enregistrer les préférences' }).click();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/mobile.png',
    animations: 'disabled',
    timeout: 20000,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('button', { name: 'Villes & domaines V', exact: false }).click();
  await expect(page.getByRole('dialog')).toContainText('Villes & domaines');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  expect(errors).toEqual([]);
});
test('deux navigateurs acceptent une trêve et voient le même accord', async ({ browser }) => {
  const a = await browser.newContext(),
    b = await browser.newContext(),
    pa = await a.newPage(),
    pb = await b.newPage();
  const nameA = `Test Fer ${suffix}`,
    nameB = `Test Paix ${suffix}`;
  for (const [page, name] of [
    [pa, nameA],
    [pb, nameB],
  ] as const) {
    await page.bringToFront();
    await page.goto('/');
    await page.getByLabel('Nom de votre souverain').fill(name);
    await page.getByLabel('Mot de passe', { exact: true }).fill('CendresDesMarches2026');
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.getByRole('button', { name: 'Élever ma bannière' }).click();
    await expect(page.getByRole('application')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await pa.bringToFront();
  await pa.getByRole('button', { name: 'Recruter', exact: true }).click();
  await pa.getByRole('button', { name: 'Former le paysan · 1 PA' }).click();
  await expect(pa.getByRole('dialog')).toContainText('Mobilisation : 3/');
  await pa.getByRole('button', { name: 'Fermer', exact: true }).click();
  await pa.getByRole('button', { name: 'Armées A', exact: false }).click();
  await pa.getByRole('dialog').getByRole('searchbox').fill('Paysan');
  await pa
    .getByRole('dialog')
    .getByRole('button', { name: /Paysan/ })
    .click();
  await moveWorkerToResource(pa, 'RUINS');
  await pa.getByRole('button', { name: 'Récolter or +12 · 1 PA' }).click();
  await expect(pa.getByText('Récolte : +12 or.', { exact: true }).first()).toBeVisible();
  await pa.getByRole('button', { name: 'Commerce & diplomatie D', exact: false }).click();
  await pa.getByLabel('Royaume partenaire').selectOption({ label: nameB });
  await pa.getByLabel('Tribut proposé Or', { exact: true }).fill('10');
  await pa.getByRole('button', { name: 'Proposer l’accord' }).click();
  await expect(pa.getByRole('dialog')).toContainText('Votre proposition');
  await pb.bringToFront();
  await pb.getByRole('button', { name: 'Commerce & diplomatie', exact: false }).first().click();
  await expect(pb.getByRole('dialog')).toContainText('Proposition reçue');
  await pb.getByRole('button', { name: 'Accepter', exact: true }).click();
  await expect(pb.getByRole('dialog')).toContainText(`Trêve avec ${nameA}`);
  await expect(pa.getByRole('dialog')).toContainText(`Trêve avec ${nameB}`);
  await a.close();
  await b.close();
});
