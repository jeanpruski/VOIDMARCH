import type { Settings } from './index';
import { randomHeroAppearance, type HeroAppearance } from './hero';
import { EMBLEM_IDS } from './emblems';

export type RealmIdentity = Pick<
  Settings,
  | 'realmName'
  | 'emblem'
  | 'bannerColor'
  | 'bannerSecondary'
  | 'bannerAccent'
  | 'bannerPattern'
  | 'bannerShape'
  | 'miniFlagShape'
>;
export const REALM_PALETTES = [
  { name: 'Or et cendres', primary: '#e6bc68', secondary: '#262b28', accent: '#644937' },
  { name: 'Glaces impériales', primary: '#bce7ef', secondary: '#20394a', accent: '#456576' },
  { name: 'Soleil noir', primary: '#efaa55', secondary: '#302328', accent: '#73412c' },
  { name: 'Forêt ancienne', primary: '#c3d694', secondary: '#243b30', accent: '#586943' },
  { name: 'Crépuscule occulte', primary: '#d4b5ef', secondary: '#30263f', accent: '#64507a' },
  { name: 'Empire carmin', primary: '#f0c8b2', secondary: '#511f2c', accent: '#8b4650' },
] as const;
export function assortHero(
  appearance: HeroAppearance,
  identity: Pick<RealmIdentity, 'bannerColor' | 'bannerSecondary' | 'bannerAccent'>,
): HeroAppearance {
  return {
    ...appearance,
    colors: {
      head: identity.bannerColor,
      armor: identity.bannerAccent,
      boots: identity.bannerSecondary,
      weapon: identity.bannerColor,
    },
  };
}
export function randomRealmIdentity(
  username: string,
  random: () => number = Math.random,
): RealmIdentity & { heroAppearance: HeroAppearance } {
  const pick = <T>(items: readonly T[]) =>
    items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  const palette = pick(REALM_PALETTES);
  const identity: RealmIdentity = {
    realmName: `Marches de ${username}`.slice(0, 40),
    emblem: pick(EMBLEM_IDS),
    bannerColor: palette.primary,
    bannerSecondary: palette.secondary,
    bannerAccent: palette.accent,
    bannerShape: pick(['swallow', 'shield', 'square', 'pennant']),
    bannerPattern: pick(['plain', 'diagonal', 'vertical', 'horizontal']),
    miniFlagShape: pick(['same', 'swallow', 'shield', 'square', 'pennant']),
  };
  return { ...identity, heroAppearance: assortHero(randomHeroAppearance(random), identity) };
}
