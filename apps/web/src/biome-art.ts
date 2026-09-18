import { BIOMES, TERRAINS, type Biome, type Terrain } from '@voidmarch/config';
const colors: Record<Exclude<Biome, 'TEMPERATE'>, Partial<Record<Terrain, number>>> = {
  SNOW: {
    PLAIN: 0x9da9ac,
    FOREST: 0x6f8580,
    MOUNTAIN: 0x899397,
    HILL: 0x8f9998,
    RIVER: 0x64818c,
    MARSH: 0x788e90,
    RUINS: 0x969a8f,
    CORRUPTION: 0x767684,
  },
  DESERT: {
    PLAIN: 0x988260,
    FOREST: 0x7b7954,
    MOUNTAIN: 0x88745c,
    HILL: 0x9b8163,
    RIVER: 0x4b7771,
    MARSH: 0x747951,
    RUINS: 0x9b896b,
    CORRUPTION: 0x786973,
  },
  AUTUMN: {
    PLAIN: 0x686047,
    FOREST: 0x60563c,
    MOUNTAIN: 0x77766b,
    HILL: 0x7b7259,
    RIVER: 0x526761,
    MARSH: 0x646647,
    RUINS: 0x7e7961,
    CORRUPTION: 0x625564,
  },
};

/** Stable functional terrain colors; climate affects presentation only. */
export function biomeTerrainColor(terrain: Terrain, biome: Biome = 'TEMPERATE'): number {
  if (biome === 'TEMPERATE' || terrain === 'SCORCHED' || terrain === 'ALIEN')
    return TERRAINS[terrain].color;
  return colors[biome][terrain] ?? BIOMES[biome].ground;
}
export const biomeTexture = (biome?: Biome) => BIOMES[biome ?? 'TEMPERATE'].texture;
