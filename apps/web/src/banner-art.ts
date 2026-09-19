import { DEFAULT_SETTINGS } from '@voidmarch/config';
import type { Settings } from '@voidmarch/config';
import type { WorldView } from '@voidmarch/shared';
import emblemArt from './emblem-art.json';

export const BANNER_PATTERNS = {
  plain: 'Uni',
  diagonal: 'Bande diagonale',
  vertical: 'Partagé verticalement',
  horizontal: 'Partagé horizontalement',
};
export const BANNER_SHAPES = {
  swallow: 'Queue d’hirondelle',
  shield: 'Écu',
  square: 'Étendard carré',
  pennant: 'Fanion triangulaire',
};
export const MINI_FLAG_SHAPES = { same: 'Comme la bannière', ...BANNER_SHAPES };
export type BannerDesign = ReturnType<typeof bannerDesign>;
const validColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
export function bannerDesign(settings: Partial<Settings>) {
  return {
    emblem: Object.hasOwn(emblemArt, settings.emblem ?? '') ? settings.emblem! : 'crown',
    primary: validColor(settings.bannerColor, DEFAULT_SETTINGS.bannerColor),
    secondary: validColor(settings.bannerSecondary, DEFAULT_SETTINGS.bannerSecondary),
    accent: validColor(settings.bannerAccent, DEFAULT_SETTINGS.bannerAccent),
    pattern: Object.hasOwn(BANNER_PATTERNS, settings.bannerPattern ?? '')
      ? settings.bannerPattern!
      : 'plain',
    shape: Object.hasOwn(BANNER_SHAPES, settings.bannerShape ?? '')
      ? settings.bannerShape!
      : 'swallow',
    miniShape: Object.hasOwn(MINI_FLAG_SHAPES, settings.miniFlagShape ?? '')
      ? settings.miniFlagShape!
      : 'same',
  };
}
export function realmBanner(world: WorldView, id?: string) {
  if (id === world.player.id) return bannerDesign(world.player.settings);
  const realm = world.realms.find((r) => r.id === id);
  return bannerDesign({ ...realm, bannerColor: realm?.color });
}
const shapes: Record<string, string> = {
  square: 'M3 3H97V67H3Z',
  swallow: 'M3 3H97L77 35 97 67H3Z',
  shield: 'M3 3H97V38L50 67 3 38Z',
  pennant: 'M3 3L97 35 3 67Z',
};
const patterns: Record<string, string> = {
  diagonal: 'M-20 55L85 -15H120L15 85Z',
  vertical: 'M50 0H100V70H50Z',
  horizontal: 'M0 35H100V70H0Z',
};
function shapeOf(d: BannerDesign, mini: boolean) {
  return mini && d.miniShape !== 'same' ? d.miniShape : d.shape;
}
function emblemPlacement(shape: string) {
  if (shape === 'pennant') return { x: 20, y: 21, size: 28 };
  if (shape === 'shield') return { x: 29, y: 8, size: 42 };
  if (shape === 'square') return { x: 27.5, y: 12.5, size: 45 };
  return { x: 16, y: 12, size: 45 };
}
export function bannerSvg(d: BannerDesign, mini = false) {
  const path = shapes[shapeOf(d, mini)];
  const icon = emblemPlacement(shapeOf(d, mini));
  const emblem = emblemArt[d.emblem as keyof typeof emblemArt];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140" viewBox="0 0 100 70"><defs><clipPath id="cloth"><path d="${path}"/></clipPath></defs><g clip-path="url(#cloth)"><path d="${path}" fill="${d.secondary}"/>${d.pattern !== 'plain' ? `<path d="${patterns[d.pattern]}" fill="${d.accent}"/>` : ''}</g><path d="${path}" fill="none" stroke="${d.primary}" stroke-width="2"/><svg x="${icon.x}" y="${icon.y}" width="${icon.size}" height="${icon.size}" viewBox="0 0 24 24" fill="none" color="${d.primary}" stroke="${d.primary}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${emblem}</svg></svg>`;
}
export function bannerDataUrl(d: BannerDesign, mini = false) {
  return `data:image/svg+xml,${encodeURIComponent(bannerSvg(d, mini))}`;
}
/** Synchronous canvas texture: no asynchronous image loading during map startup. */
export function bannerCanvas(d: BannerDesign) {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  const outline = new Path2D(shapes[shapeOf(d, true)]);
  ctx.save();
  ctx.clip(outline);
  ctx.fillStyle = d.secondary;
  ctx.fillRect(0, 0, 100, 70);
  if (patterns[d.pattern]) {
    ctx.fillStyle = d.accent;
    ctx.fill(new Path2D(patterns[d.pattern]));
  }
  ctx.restore();
  ctx.strokeStyle = d.primary;
  ctx.lineWidth = 2;
  ctx.stroke(outline);
  const icon = emblemPlacement(shapeOf(d, true));
  ctx.translate(icon.x, icon.y);
  ctx.scale(icon.size / 24, icon.size / 24);
  ctx.strokeStyle = d.primary;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const svg = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${emblemArt[d.emblem as keyof typeof emblemArt]}</svg>`,
    'image/svg+xml',
  );
  for (const node of Array.from(svg.documentElement.children)) {
    const n = (key: string) => Number(node.getAttribute(key) ?? 0);
    let path = new Path2D();
    switch (node.tagName) {
      case 'path':
        path = new Path2D(node.getAttribute('d')!);
        break;
      case 'circle':
        path.arc(n('cx'), n('cy'), n('r'), 0, Math.PI * 2);
        break;
      case 'ellipse':
        path.ellipse(n('cx'), n('cy'), n('rx'), n('ry'), 0, 0, Math.PI * 2);
        break;
      case 'rect':
        path.roundRect(n('x'), n('y'), n('width'), n('height'), n('rx'));
        break;
      case 'line':
        path.moveTo(n('x1'), n('y1'));
        path.lineTo(n('x2'), n('y2'));
        break;
      case 'polygon':
      case 'polyline': {
        const points = node.getAttribute('points')!.trim().split(/[ ,]+/).map(Number);
        points.forEach((value, i) => {
          if (i % 2 === 0) {
            if (i === 0) path.moveTo(value, points[i + 1]);
            else path.lineTo(value, points[i + 1]);
          }
        });
        if (node.tagName === 'polygon') path.closePath();
        break;
      }
    }
    if (node.getAttribute('fill') === 'currentColor') {
      ctx.fillStyle = d.primary;
      ctx.fill(path);
    }
    ctx.stroke(path);
  }
  return canvas;
}
export function bannerContrast(a: string, b: string) {
  const luminance = (color: string) => {
    const channels = color
      .slice(1)
      .match(/../g)!
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
