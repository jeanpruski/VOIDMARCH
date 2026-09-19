import type { UnitKind, UnitProfile } from './index';
import type { Biome } from './biomes';
import { unitUniverse } from './unit-universes';

export const BIOME_ADAPTATION_NAMES: Record<Biome, string> = {
  TEMPERATE: 'Adaptation aux bois tempérés',
  SNOW: 'Adaptation au froid',
  DESERT: 'Adaptation aux sables',
  AUTUMN: 'Adaptation aux terres automnales',
};
/** One native biome per adapted ground unit. Theme matters, not generic terrain affinity.
 * The woodland roster is split deliberately: spores, mist and dead wood favor autumn. */
export function createBiomeAdaptations(
  profiles: Record<UnitKind, UnitProfile>,
): Partial<Record<UnitKind, Biome>> {
  const specific: Partial<Record<UnitKind, Biome>> = {
    SCOUT: 'TEMPERATE',
    RANGER: 'TEMPERATE',
    RONC_GRENADIER: 'AUTUMN',
    RONC_MORTAR: 'AUTUMN',
    RONC_WAGON: 'AUTUMN',
    RONC_RIFLE: 'AUTUMN',
    RONC_FLAK: 'AUTUMN',
    SPECTRAL_RIDER: 'AUTUMN',
    PLAGUE_MEDIC: 'AUTUMN',
    SANG_CUIRASSIER: 'AUTUMN',
    SANG_HEAVY_TANK: 'AUTUMN',
  };
  const result: Partial<Record<UnitKind, Biome>> = {};
  for (const [id, p] of Object.entries(profiles)) {
    const kind = id as UnitKind;
    if (p.flying || p.hero || p.builder) continue;
    const family = unitUniverse(kind)?.family;
    const biome =
      specific[kind] ??
      (family === 'frost'
        ? 'SNOW'
        : family === 'solar'
          ? 'DESERT'
          : family === 'briar'
            ? 'TEMPERATE'
            : undefined);
    if (biome) result[kind] = biome;
  }
  return result;
}
