import { expect, it } from 'vitest';
import { randomRealmIdentity, assortHero, DEFAULT_SETTINGS } from '@voidmarch/config';
import { authSchema, settingsSchema } from '@voidmarch/protocol';
it('préserve les modèles du héros lorsque les couleurs sont assorties', () => {
  const generated = randomRealmIdentity('Jean', () => 0.3);
  const matched = assortHero(generated.heroAppearance, { ...generated, bannerColor: '#abcdef' });
  expect(matched.head).toBe(generated.heroAppearance.head);
  expect(matched.armor).toBe(generated.heroAppearance.armor);
  expect(matched.boots).toBe(generated.heroAppearance.boots);
  expect(matched.colors.head).toBe('#abcdef');
  expect(generated.heroAppearance.colors.head).not.toBe('#abcdef');
});
it('accepte les anciennes préférences et protège les champs du héros et du jeu', () => {
  expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  expect(
    settingsSchema.safeParse({ heroAppearance: randomRealmIdentity('Jean').heroAppearance })
      .success,
  ).toBe(false);
  const account = { username: 'Jean', password: 'MonMotDePasse42' };
  expect(authSchema.safeParse({ ...account, realmIdentity: { bannerColor: 'red' } }).success).toBe(
    false,
  );
  expect(authSchema.safeParse({ ...account, realmIdentity: { unlimitedAP: true } }).success).toBe(
    false,
  );
  expect(
    authSchema.safeParse({ ...account, realmIdentity: { realmName: '<script>' } }).success,
  ).toBe(false);
});
