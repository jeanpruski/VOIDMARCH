import { biomeBlend, type BiomeBlend } from '@voidmarch/game-rules';
import type { Hex } from '@voidmarch/shared';
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

function mixColor(blend: BiomeBlend, get: (biome: Biome) => number) {
  let red = 0,
    green = 0,
    blue = 0;
  for (const { biome, weight } of blend.weights) {
    const value = get(biome);
    red += ((value >> 16) & 255) * weight;
    green += ((value >> 8) & 255) * weight;
    blue += (value & 255) * weight;
  }
  return (Math.round(red) << 16) | (Math.round(green) << 8) | Math.round(blue);
}
function appearance(seed: string, p: Hex, savedBiome?: Biome) {
  const blend = biomeBlend(seed, p, savedBiome);
  return {
    blend,
    texture: biomeTexture(blend.scenery),
    palette: {
      ground: mixColor(blend, (b) => BIOMES[b].ground),
      water: mixColor(blend, (b) => BIOMES[b].water),
      ripple: mixColor(blend, (b) => BIOMES[b].ripple),
      light: mixColor(blend, (b) => BIOMES[b].light),
      dark: mixColor(blend, (b) => BIOMES[b].dark),
    },
  };
}
// Bounded cache shared by the map and minimap; eviction never changes the result.
const appearances = new Map<string, ReturnType<typeof appearance>>();
export function biomeAppearance(seed: string, p: Hex, savedBiome?: Biome) {
  const id = `${seed}:${p.q},${p.r}:${savedBiome ?? ''}`;
  let value = appearances.get(id);
  if (!value) {
    value = appearance(seed, p, savedBiome);
    if (appearances.size >= 24000) appearances.delete(appearances.keys().next().value!);
    appearances.set(id, value);
  }
  return value;
}
export function blendedTerrainColor(terrain: Terrain, blend: BiomeBlend) {
  if (terrain === 'SCORCHED' || terrain === 'ALIEN') return TERRAINS[terrain].color;
  return mixColor(blend, (b) => biomeTerrainColor(terrain, b));
}
