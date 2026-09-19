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

export interface BiomeBlend {
  primary: Biome;
  scenery: Biome;
  /** Total transition width, across both sides of the original boundary. */
  width: number;
  weights: { biome: Biome; weight: number }[];
}

/** Cosmetic only: the original region, terrain and saved biome never change. */
export function biomeBlend(seed: string, p: Hex, savedBiome?: Biome): BiomeBlend {
  const q = p.q + Math.sin(p.r / 17) * 5 + Math.sin((p.q + p.r) / 31) * 4;
  const r = p.r + Math.cos(p.q / 21) * 5 + Math.sin((p.q - p.r) / 37) * 4;
  const column = Math.floor(q / BIOME_REGION_SIZE),
    row = Math.floor(r / BIOME_REGION_SIZE);
  const candidates = [];
  for (let x = column - 1; x <= column + 1; x++)
    for (let y = row - 1; y <= row + 1; y++) {
      const c = center(seed, x, y),
        dq = q - c.q,
        dr = r - c.r;
      candidates.push({ center: c, distance: dq * dq + dq * dr + dr * dr });
    }
  candidates.sort((a, b) => a.distance - b.distance);
  const nearest = candidates[0],
    primary = savedBiome ?? nearest.center.biome;
  const phase = climateHash(`${seed}:climate-transition-width`) * Math.PI * 2;
  const wave = (2 + Math.sin(p.q / 19 + phase) + Math.sin(p.r / 23 - phase)) / 4;
  const width = 2 + 3 * wave * wave;
  // Respect explicit theme overrides in old/custom tiles and map fixtures.
  if (primary !== nearest.center.biome)
    return { primary, scenery: primary, width, weights: [{ biome: primary, weight: 1 }] };
  const influence = new Map<Biome, number>([[primary, 1]]);
  for (const other of candidates.slice(1)) {
    const dq = other.center.q - nearest.center.q,
      dr = other.center.r - nearest.center.r;
    const separation = Math.sqrt(dq * dq + dq * dr + dr * dr);
    // Distance to the Voronoi bisector in axial hex units, not distance to a center.
    const boundaryDistance = (other.distance - nearest.distance) / (2 * separation);
    const strength = Math.max(0, 1 - boundaryDistance / (width / 2));
    if (strength > 0)
      influence.set(
        other.center.biome,
        (influence.get(other.center.biome) ?? 0) + strength * strength,
      );
  }
  const total = [...influence.values()].reduce((a, b) => a + b, 0);
  const weights = [...influence.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([biome, value]) => ({ biome, weight: value / total }));
  // Whole opaque sprites alternate in the transition; no ghosted double silhouettes.
  let roll = climateHash(`${seed}:climate-scenery-v1:${p.q},${p.r}`);
  let scenery = primary;
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll < 0) {
      scenery = entry.biome;
      break;
    }
  }
  return { primary, scenery, width, weights };
}
