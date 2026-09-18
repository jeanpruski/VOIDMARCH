import { BIOME_REGION_SIZE, type Biome } from '@voidmarch/config';
import type { Hex } from '@voidmarch/shared';

// A separate hash namespace keeps climate independent of terrain/resource generation.
function climateHash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const centers = new Map<string, Hex & { biome: Biome; region: string }>();
function center(seed: string, q: number, r: number) {
  const id = `${seed}:climate-v1:${q},${r}`;
  let value = centers.get(id);
  if (!value) {
    // Four-color triangular lattice: adjacent anchor cells receive different climates.
    // Seed permutes the four climate labels, without altering existing terrain.
    const rotation = Math.floor(climateHash(`${seed}:climate-labels`) * 4);
    const slot = (((q % 2) + 2) % 2) + 2 * (((r % 2) + 2) % 2);
    value = {
      q: (q + 0.5) * BIOME_REGION_SIZE + (climateHash(id + ':q') - 0.5) * 30,
      r: (r + 0.5) * BIOME_REGION_SIZE + (climateHash(id + ':r') - 0.5) * 30,
      biome: (['TEMPERATE', 'SNOW', 'DESERT', 'AUTUMN'] as Biome[])[(slot + rotation) % 4],
      region: `${q},${r}`,
    };
    if (centers.size > 4096) centers.clear();
    centers.set(id, value);
  }
  return value;
}
export function biomeRegion(seed: string, p: Hex): { biome: Biome; region: string } {
  // Gentle, continuous boundary warping, not per-hex noise or rectangular blocks.
  const q = p.q + Math.sin(p.r / 17) * 5 + Math.sin((p.q + p.r) / 31) * 4;
  const r = p.r + Math.cos(p.q / 21) * 5 + Math.sin((p.q - p.r) / 37) * 4;
  const column = Math.floor(q / BIOME_REGION_SIZE),
    row = Math.floor(r / BIOME_REGION_SIZE);
  let closest = Infinity,
    winner = center(seed, column, row);
  for (let x = column - 1; x <= column + 1; x++)
    for (let y = row - 1; y <= row + 1; y++) {
      const c = center(seed, x, y),
        dq = q - c.q,
        dr = r - c.r;
      const d = dq * dq + dq * dr + dr * dr;
      if (d < closest) {
        closest = d;
        winner = c;
      }
    }
  return { biome: winner.biome, region: winner.region };
}
export const biomeAt = (seed: string, p: Hex): Biome => biomeRegion(seed, p).biome;
