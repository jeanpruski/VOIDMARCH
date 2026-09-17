import { HERO_PARTS, type HeroAppearance, type HeroPart } from '@voidmarch/config';
import { isolateSprites } from './sprite-atlas';
const sheets: Record<HeroPart, string> = {
  head: 'hero-heads',
  armor: 'hero-armors',
  boots: 'hero-boots',
  weapon: 'hero-weapons',
};
const pieces = new Map<HeroPart, HTMLCanvasElement[]>();
const portraits = new Map<string, HTMLCanvasElement>();
export const heroArtKey = (a: HeroAppearance) =>
  `hero:${HERO_PARTS.map((p) => `${a[p]}${a.colors[p]}`).join(':')}`;
export function loadHeroSheet(part: HeroPart, source: HTMLImageElement) {
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
    HERO_PARTS.map(async (p) => {
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
export function heroCanvas(a: HeroAppearance, withBase = true): HTMLCanvasElement {
  const key = `${heroArtKey(a)}:${withBase ? 'portrait' : 'map'}`;
  const old = portraits.get(key);
  if (old) return old;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  if (withBase) {
    ctx.fillStyle = '#27291c';
    ctx.beginPath();
    heroStarPoints(128, 231, 158, 42).forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#dcc780';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  const draw = (part: HeroPart, x: number, y: number, w: number, h: number) => {
    const src = pieces.get(part)?.[a[part]];
    if (!src) return;
    ctx.drawImage(recolor(src, a.colors[part], part === 'head'), x, y, w, h);
  };
  draw('boots', 91, 138, 78, 96);
  const compact = [1, 7, 10, 11, 14].includes(a.weapon);
  const tall = a.weapon === 2;
  draw(
    'weapon',
    166,
    compact ? 155 : tall ? 99 : 152,
    compact ? 36 : tall ? 33 : 35,
    compact ? 53 : tall ? 134 : 91,
  );
  draw('armor', 68, 65, 120, 112);
  draw('head', 102, 21, 54, 57);
  portraits.set(key, c);
  if (portraits.size > 100) portraits.delete(portraits.keys().next().value!);
  return c;
}
