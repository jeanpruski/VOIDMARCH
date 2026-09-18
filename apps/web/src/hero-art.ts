import { type HeroAppearance } from '@voidmarch/config';
import { isolateSprites } from './sprite-atlas';
export const HERO_VISIBLE_PARTS = ['head', 'armor', 'boots'] as const;
export type HeroVisualPart = (typeof HERO_VISIBLE_PARTS)[number];
const sheets: Record<HeroVisualPart, string> = {
  head: 'hero-heads',
  armor: 'hero-armors',
  boots: 'hero-boots',
};
const pieces = new Map<HeroVisualPart, HTMLCanvasElement[]>();
const portraits = new Map<string, HTMLCanvasElement>();
export const HERO_BASE_SPRITE = 'hero-base-v2';
let base: HTMLCanvasElement | undefined;
export const heroArtKey = (a: HeroAppearance) =>
  `hero:unarmed:base-v2:proportions-v4-midpoint:${HERO_VISIBLE_PARTS.map((p) => `${a[p]}${a.colors[p]}`).join(':')}`;
export function loadHeroSheet(part: HeroVisualPart, source: HTMLImageElement) {
  if (pieces.has(part)) return;
  pieces.set(part, isolatedCanvases(source, 5, 3));
}
export function loadHeroBase(source: HTMLImageElement) {
  if (base) return;
  base = isolatedCanvases(source, 1, 1)[0];
  portraits.clear();
}
function isolatedCanvases(source: HTMLImageElement, columns: number, rows: number) {
  const c = document.createElement('canvas');
  c.width = source.naturalWidth;
  c.height = source.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const frames = isolateSprites(
    ctx.getImageData(0, 0, c.width, c.height).data,
    c.width,
    c.height,
    columns,
    rows,
  );
  return frames.map((f) => {
    const c = document.createElement('canvas');
    c.width = f.width;
    c.height = f.height;
    const ctx = c.getContext('2d')!;
    const data = ctx.createImageData(f.width, f.height);
    data.data.set(f.pixels);
    ctx.putImageData(data, 0, 0);
    return c;
  });
}
export const HERO_SHEETS = sheets;
let loading: Promise<void> | undefined;
export function loadHeroArt() {
  return (loading ??= Promise.all([
    ...HERO_VISIBLE_PARTS.map(async (p) => {
      if (pieces.has(p)) return;
      const i = new Image();
      i.src = `/assets/${sheets[p]}.png`;
      await i.decode();
      loadHeroSheet(p, i);
    }),
    (async () => {
      if (base) return;
      const i = new Image();
      i.src = `/assets/${HERO_BASE_SPRITE}.png`;
      await i.decode();
      loadHeroBase(i);
    })(),
  ])
    .then(() => {})
    .catch((e) => {
      loading = undefined;
      throw e;
    }));
}
function recolor(source: HTMLCanvasElement, color: string, head = false) {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let i = 0; i < data.data.length; i += 4) {
    const [r, g, b] = data.data.slice(i, i + 3),
      max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    // Retain skin, brass and emissive accents; dye the neutral fabric and steel.
    if (!data.data[i + 3] || (max - min) / Math.max(1, max) > (head ? 0.2 : 0.32)) continue;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    for (let k = 0; k < 3; k++) data.data[i + k] = Math.min(255, lum * (0.3 + rgb[k] / 150));
  }
  ctx.putImageData(data, 0, 0);
  return c;
}
export function heroCanvas(a: HeroAppearance): HTMLCanvasElement {
  const key = heroArtKey(a);
  const old = portraits.get(key);
  if (old) return old;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  // Painted rubble base uses the same miniature rendering as the ground troops.
  // Transparent atlas padding is removed when loaded, not stretched into the sprite.
  if (base) ctx.drawImage(base, 58, 202, 140, 53);
  const draw = (part: HeroVisualPart, x: number, y: number, w: number, h: number) => {
    const src = pieces.get(part)?.[a[part]];
    if (!src) return;
    ctx.drawImage(recolor(src, a.colors[part], part === 'head'), x, y, w, h);
  };
  // Halfway between v3 and the first v4 preview: keep the head/torso ratio
  // at 92.5% of v3 and gently broaden and lengthen the lower body.
  // Neck alignment scales around the top anchor; feet stay planted at y=234.
  draw('boots', 88, 85.5, 84, 148.5);
  draw('armor', 78.05, 42.15, 99.9, 85.1);
  draw('head', 105.8, 7, 45.325, 46.25);
  portraits.set(key, c);
  if (portraits.size > 100) portraits.delete(portraits.keys().next().value!);
  return c;
}
