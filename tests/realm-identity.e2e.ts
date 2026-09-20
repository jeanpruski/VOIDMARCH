import { test, expect } from './fixtures/game-test';
test('création en trois étapes : identité assortie, aperçu, retour et inscription', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/auth/refresh', (r) =>
    r.fulfill({ status: 401, json: { error: 'test' } }),
  );
  let sent: any;
  await page.route('**/api/auth/register', async (r) => {
    sent = r.request().postDataJSON();
    await r.fulfill({ status: 400, json: { error: 'Inscription simulée' } });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Entrer dans le monde', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel('Mot de passe', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Créer un compte', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByLabel('Nom de votre souverain')).toBeVisible();
  await page.getByLabel('Nom de votre souverain').fill('JeanHeros');
  await page.getByLabel('Mot de passe', { exact: true }).fill('MotDePasseDeTest42');
  await expect(page.locator('.identity-hero img')).toHaveAttribute('src', /^data:image/);
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByLabel('Nom du royaume').fill('Empire des brumes');
  await page.getByRole('button', { name: 'Emblème Atome', exact: true }).click();
  await page.getByRole('button', { name: 'Palette Glaces impériales', exact: true }).click();
  await page.getByLabel('Motif du fond').selectOption('diagonal');
  await page.getByLabel('Forme de bannière').selectOption('shield');
  await page.getByRole('button', { name: 'Tout assortir', exact: true }).click();
  await expect(page.locator('.identity-preview h3')).toHaveText('Empire des brumes');
  await page.screenshot({ path: 'output/kingdom-creation.png', fullPage: true });
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByLabel('Mini-drapeaux sur la carte').selectOption('pennant');
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page.getByLabel('Nom du royaume')).toHaveValue('Empire des brumes');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByLabel('Mini-drapeaux sur la carte')).toHaveValue('pennant');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/kingdom-creation-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Élever ma bannière', exact: true }).click();
  await expect.poll(() => sent?.realmIdentity?.realmName).toBe('Empire des brumes');
  expect(sent.realmIdentity).toMatchObject({
    emblem: 'atom',
    bannerColor: '#bce7ef',
    bannerSecondary: '#20394a',
    bannerAccent: '#456576',
    bannerPattern: 'diagonal',
    bannerShape: 'shield',
    miniFlagShape: 'pennant',
  });
  expect(sent.realmIdentity.heroAppearance).toBeUndefined();
  expect(sent.heroAppearance.colors).toMatchObject({
    head: '#bce7ef',
    armor: '#456576',
    boots: '#20394a',
  });
  expect(errors).toEqual([]);
});
