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
export const heroArtKey = (a: HeroAppearance) =>
  `hero:unarmed:${HERO_VISIBLE_PARTS.map((p) => `${a[p]}${a.colors[p]}`).join(':')}`;
export function loadHeroSheet(part: HeroVisualPart, source: HTMLImageElement) {
  if (pieces.has(part)) return;
  const c = document.createElement('canvas');
  c.width = source.naturalWidth;
  c.height = source.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const frames = isolateSprites(
    ctx.getImageData(0, 0, c.width, c.height).data,
    c.width,
    c.height,
    5,
    3,
  );
  pieces.set(
    part,
    frames.map((f) => {
      const c = document.createElement('canvas');
      c.width = f.width;
      c.height = f.height;
      const ctx = c.getContext('2d')!;
      const data = ctx.createImageData(f.width, f.height);
      data.data.set(f.pixels);
      ctx.putImageData(data, 0, 0);
      return c;
    }),
  );
}
export const HERO_SHEETS = sheets;
let loading: Promise<void> | undefined;
export function loadHeroArt() {
  return (loading ??= Promise.all(
    HERO_VISIBLE_PARTS.map(async (p) => {
      if (pieces.has(p)) return;
      const i = new Image();
      i.src = `/assets/${sheets[p]}.png`;
      await i.decode();
      loadHeroSheet(p, i);
    }),
  )
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
export function heroStarPoints(x: number, y: number, width: number, height: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? 0.46 : 1;
    return {
      x: x + (Math.cos(angle) * radius * width) / 2,
      y: y + (Math.sin(angle) * radius * height) / 2,
    };
  });
}
export function heroCanvas(a: HeroAppearance): HTMLCanvasElement {
  const key = heroArtKey(a);
  const old = portraits.get(key);
  if (old) return old;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  // Solid tabletop base; the separate faction star remains on the map beneath it.
  ctx.fillStyle = '#141713';
  ctx.beginPath();
  ctx.ellipse(128, 240, 67, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  const earth = ctx.createLinearGradient(0, 216, 0, 247);
  earth.addColorStop(0, '#777666');
  earth.addColorStop(0.5, '#535647');
  earth.addColorStop(1, '#33382d');
  ctx.fillStyle = earth;
  ctx.beginPath();
  ctx.ellipse(128, 231, 67, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#99907a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Deterministic gravel, confined to the top of the base.
  for (let i = 0; i < 28; i++) {
    const angle = i * 2.399963;
    const radius = Math.sqrt((i + 1) / 29);
    ctx.fillStyle = i % 3 === 0 ? '#8d8b75' : '#343c30';
    ctx.beginPath();
    ctx.ellipse(
      128 + Math.cos(angle) * radius * 61,
      231 + Math.sin(angle) * radius * 12,
      2.5,
      1.3,
      angle,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const draw = (part: HeroVisualPart, x: number, y: number, w: number, h: number) => {
    const src = pieces.get(part)?.[a[part]];
    if (!src) return;
    ctx.drawImage(recolor(src, a.colors[part], part === 'head'), x, y, w, h);
  };
  draw('boots', 91, 138, 78, 96);
  draw('armor', 68, 65, 120, 112);
  draw('head', 102, 21, 54, 57);
  portraits.set(key, c);
  if (portraits.size > 100) portraits.delete(portraits.keys().next().value!);
  return c;
}
