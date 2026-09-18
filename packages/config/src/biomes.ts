/** A biome is a visual climate; terrain names, resources and rules remain universal. */
export const BIOMES = {
  TEMPERATE: {
    name: 'Tempéré',
    texture: 'terrain',
    ground: 0x465140,
    water: 0x46686b,
    ripple: 0x8ea69a,
    light: 0xabb495,
    dark: 0x19251c,
  },
  SNOW: {
    name: 'Enneigé',
    texture: 'terrain-snow',
    ground: 0x9da9ac,
    water: 0x698994,
    ripple: 0xc6dce0,
    light: 0xe0e6e3,
    dark: 0x687980,
  },
  DESERT: {
    name: 'Désertique',
    texture: 'terrain-desert',
    ground: 0x988260,
    water: 0x507d77,
    ripple: 0xa5c1ac,
    light: 0xc3ab7d,
    dark: 0x69543b,
  },
  AUTUMN: {
    name: 'Automnal',
    texture: 'terrain-autumn',
    ground: 0x686047,
    water: 0x526761,
    ripple: 0xa3ae98,
    light: 0xb39a60,
    dark: 0x393f2e,
  },
} as const;
export type Biome = keyof typeof BIOMES;
export const BIOME_REGION_SIZE = 100;
export const BIOME_SHEETS = ['terrain-snow', 'terrain-desert', 'terrain-autumn'];
