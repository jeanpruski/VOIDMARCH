import { WALL_KINDS, WALL_HEIGHTS, type WallKind, type TurretLevel } from '@voidmarch/config';
import { DIRECTIONS } from '@voidmarch/game-rules';
import { hexToPixel } from './map-geometry';

type Point = { x: number; y: number };
const palettes = {
  WOOD_WALL: {
    height: 20,
    width: 7,
    face: '#63503a',
    side: '#342d24',
    top: '#a08a61',
    line: '#282820',
  },
  STONE_WALL: {
    height: 27,
    width: 11,
    face: '#71766a',
    side: '#393f3a',
    top: '#a6aa91',
    line: '#343c34',
  },
  STEEL_WALL: {
    height: 34,
    width: 10,
    face: '#505e57',
    side: '#283630',
    top: '#89968a',
    line: '#1e2923',
  },
};
const cache = new Map<string, HTMLCanvasElement>();
const urls = new Map<string, string>();
let materials: HTMLImageElement | undefined;
let loading: Promise<void> | undefined;
export function setWallMaterials(image: HTMLImageElement) {
  if (materials) return;
  materials = image;
  cache.clear();
  urls.clear();
}
export function loadWallMaterials(): Promise<void> {
  if (materials) return Promise.resolve();
  return (loading ??= (async () => {
    const image = new Image();
    image.src = '/assets/wall-materials.png';
    await image.decode();
    setWallMaterials(image);
  })());
}

/** Joined geometry is drawn in the same hex projection as the map, so every
 * rotation, terminal, corner and junction meets exactly at the shared boundary. */
export function wallCanvas(
  kind: WallKind,
  connections = 9,
  turretLevel?: TurretLevel,
): HTMLCanvasElement {
  const id = `${kind}:${connections}:${turretLevel ?? 0}`;
  const previous = cache.get(id);
  if (previous) return previous;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(128, 152);
  ctx.scale(2, 2);
  const palette = palettes[kind];
  const poly = (points: Point[], fill: string, stroke = palette.line) => {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    // An edge-on face has zero area. A singular texture transform can leave
    // stray strokes at the canvas origin in Chrome, outside the wall sprite.
    const area =
      points.length === 4
        ? (points[1].x - points[0].x) * (points[3].y - points[0].y) -
          (points[1].y - points[0].y) * (points[3].x - points[0].x)
        : 0;
    if (materials && points.length === 4 && Math.abs(area) > 0.001) {
      // Project the painted material onto this exact parallelogram; geometry,
      // end caps and adjacency remain deterministic in every orientation.
      const a = points[0],
        b = points[1],
        d = points[3];
      const size = materials.naturalWidth / 3;
      const column = WALL_KINDS.indexOf(kind);
      ctx.save();
      ctx.clip();
      ctx.transform(
        (b.x - a.x) / size,
        (b.y - a.y) / size,
        (d.x - a.x) / size,
        (d.y - a.y) / size,
        a.x,
        a.y,
      );
      ctx.globalAlpha = fill === palette.top ? 0.62 : 0.92;
      ctx.drawImage(materials, column * size, 0, size, materials.naturalHeight, 0, 0, size, size);
      const shade = ctx.createLinearGradient(0, 0, 0, size);
      shade.addColorStop(0, '#050c0866');
      shade.addColorStop(1, '#dae0c70a');
      ctx.globalAlpha = fill === palette.side ? 0.7 : 0.4;
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.65;
    ctx.stroke();
  };
  const line = (a: Point, b: Point, ink: string, width = 0.6) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = ink;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const arms = DIRECTIONS.flatMap((direction, side) => {
    if (connections ? !(connections & (1 << side)) : side !== 0 && side !== 3) return [];
    const p = hexToPixel(direction),
      fraction = connections ? 0.5 : 0.29;
    return [{ x: p.x * fraction, y: p.y * fraction, side }];
  }).sort((a, b) => a.y - b.y);
  ctx.lineCap = 'round';
  // Contact shadows keep the wall planted on the terrain, without a floating base.
  for (const end of arms)
    line({ x: 3, y: 5 }, { x: end.x + 3, y: end.y + 5 }, '#10171365', palette.width + 7);
  ctx.lineCap = 'butt';
  function beam(end: Point) {
    const length = Math.hypot(end.x, end.y),
      nx = ((-end.y / length) * palette.width) / 2,
      ny = ((end.x / length) * palette.width) / 2,
      h = palette.height;
    const corners = [
      { x: nx, y: ny },
      { x: end.x + nx, y: end.y + ny },
      { x: end.x - nx, y: end.y - ny },
      { x: -nx, y: -ny },
    ];
    // Render visible vertical faces, then the coping. Faces share the same points.
    for (let i = 0; i < 4; i++) {
      if (
        (i === 0 && ny < 0) ||
        (i === 2 && ny >= 0) ||
        (i === 1 && end.y < 0) ||
        (i === 3 && end.y >= 0)
      )
        continue;
      const a = corners[i],
        b = corners[(i + 1) % 4];
      poly(
        [a, b, { x: b.x, y: b.y - h }, { x: a.x, y: a.y - h }],
        i % 2 ? palette.side : palette.face,
      );
    }
    const front = ny >= 0 ? 1 : -1;
    const a = { x: nx * front, y: ny * front },
      b = { x: end.x + nx * front, y: end.y + ny * front };
    if (kind === 'WOOD_WALL') {
      const count = Math.max(3, Math.round(length / 4));
      for (let i = 0; i <= count; i++) {
        const t = i / count,
          x = a.x + (b.x - a.x) * t,
          y = a.y + (b.y - a.y) * t;
        line({ x, y }, { x, y: y - h }, '#2a271d', 1.4);
        line({ x: x + 1, y: y - 3 }, { x: x + 1, y: y - h + 3 }, '#b4996755');
        poly(
          [
            { x: x - 1.6, y: y - h },
            { x, y: y - h - 3 },
            { x: x + 1.6, y: y - h },
          ],
          palette.top,
        );
      }
      for (const z of [6, 14]) line({ x: a.x, y: a.y - z }, { x: b.x, y: b.y - z }, '#332a21', 2);
    } else if (!materials) {
      const courses = kind === 'STONE_WALL' ? 4 : 2;
      for (let row = 0; row < courses; row++) {
        const low = (row * h) / courses,
          high = ((row + 1) * h) / courses;
        line({ x: a.x, y: a.y - low }, { x: b.x, y: b.y - low }, palette.line, 1);
        const blocks = Math.max(2, Math.round(length / (kind === 'STONE_WALL' ? 9 : 14)));
        for (let j = 0; j < blocks; j++) {
          const t = (j + (row % 2 ? 0.5 : 0)) / blocks;
          const x = a.x + (b.x - a.x) * t,
            y = a.y + (b.y - a.y) * t;
          line({ x, y: y - low }, { x, y: y - high }, palette.line, 1);
          if (kind === 'STEEL_WALL') {
            line({ x: x + 1, y: y - low - 1 }, { x: x + 1, y: y - high + 1 }, '#95a396', 0.7);
            ctx.fillStyle = '#b1afa0';
            for (const z of [low + 2, high - 2]) {
              ctx.beginPath();
              ctx.arc(x + 2, y - z, 0.7, 0, Math.PI * 2);
              ctx.fill();
            }
            line({ x: x + 3, y: y - high + 4 }, { x: x + 3, y: y - high + 8 }, '#98573f88', 0.8);
          } else {
            line({ x: x + 2, y: y - high + 1 }, { x: x + 5, y: y - high + 1 }, '#b3b59a88');
          }
        }
      }
    }
    poly(
      corners.map((p) => ({ x: p.x, y: p.y - h })),
      palette.top,
    );
    if (kind === 'WOOD_WALL') {
      const count = Math.max(3, Math.round(length / 4));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count,
          x = end.x * t,
          y = end.y * t - h;
        poly(
          [
            { x: x - 1.7, y },
            { x, y: y - 4 },
            { x: x + 1.7, y },
          ],
          palette.top,
        );
      }
    }
    if (kind !== 'WOOD_WALL') {
      const count = Math.max(2, Math.round(length / 8));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.35) / count,
          x = end.x * t,
          y = end.y * t - h;
        poly(
          [
            { x: x - 2, y },
            { x: x + 2, y },
            { x: x + 2, y: y - 3 },
            { x: x - 2, y: y - 3 },
          ],
          palette.face,
        );
      }
    }
  }
  for (const end of arms) beam(end);
  // A compact joining pier closes multi-direction corners and exposed end caps.
  const width = palette.width * 0.63,
    h = palette.height + 2;
  poly(
    [
      { x: -width, y: 0 },
      { x: 0, y: 3 },
      { x: 0, y: 3 - h },
      { x: -width, y: -h },
    ],
    palette.side,
  );
  poly(
    [
      { x: 0, y: 3 },
      { x: width, y: 0 },
      { x: width, y: -h },
      { x: 0, y: 3 - h },
    ],
    palette.face,
  );
  poly(
    [
      { x: -width, y: -h },
      { x: 0, y: -h - 3 },
      { x: width, y: -h },
      { x: 0, y: -h + 3 },
    ],
    palette.top,
  );
  // Subtle ageing at the foot of the central pier.
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? '#78816a' : '#3c4735';
    ctx.fillRect(-5 + i * 2, 2 + (i % 2), 1.8, 0.8);
  }
  if (turretLevel) {
    ctx.save();
    ctx.translate(0, -WALL_HEIGHTS[kind] - 3);
    // The weapon sits on the joining pier; wall ends and corners remain untouched.
    const platform = turretLevel === 1 ? '#8d7350' : '#748176';
    poly(
      [
        { x: -12, y: 0 },
        { x: 0, y: 6 },
        { x: 12, y: 0 },
        { x: 0, y: -6 },
      ],
      platform,
    );
    poly(
      [
        { x: -12, y: 0 },
        { x: 0, y: 6 },
        { x: 0, y: 10 },
        { x: -12, y: 4 },
      ],
      '#303931',
    );
    poly(
      [
        { x: 0, y: 6 },
        { x: 12, y: 0 },
        { x: 12, y: 4 },
        { x: 0, y: 10 },
      ],
      '#515d50',
    );
    for (const x of [-8, 8]) line({ x, y: 1 }, { x, y: -7 }, '#c3b483', 1.5);
    if (turretLevel === 1) {
      line({ x: -6, y: 0 }, { x: 1, y: -11 }, '#332b20', 5);
      line({ x: -6, y: 0 }, { x: 1, y: -11 }, '#977947', 3);
      line({ x: -7, y: -4 }, { x: 17, y: -14 }, '#3c3023', 5);
      line({ x: -7, y: -4 }, { x: 17, y: -14 }, '#c2a16b', 2.5);
      line({ x: 5, y: -21 }, { x: 12, y: -13 }, '#322b25', 3);
      line({ x: 12, y: -13 }, { x: 20, y: -6 }, '#322b25', 3);
      line({ x: 5, y: -21 }, { x: -1, y: -8 }, '#e4d1a2', 0.7);
      line({ x: -1, y: -8 }, { x: 20, y: -6 }, '#e4d1a2', 0.7);
      line({ x: -3, y: -6 }, { x: 19, y: -15 }, '#e0cf9f', 0.8);
      poly(
        [
          { x: 21, y: -16 },
          { x: 17, y: -12 },
          { x: 16, y: -16 },
        ],
        '#c4c9bb',
      );
    } else if (turretLevel === 2) {
      poly(
        [
          { x: -9, y: -2 },
          { x: -6, y: -12 },
          { x: 5, y: -14 },
          { x: 11, y: -5 },
          { x: 3, y: 0 },
        ],
        '#596251',
      );
      poly(
        [
          { x: -6, y: -12 },
          { x: 5, y: -14 },
          { x: 11, y: -5 },
          { x: 0, y: -6 },
        ],
        '#889080',
      );
      line({ x: 2, y: -10 }, { x: 24, y: -20 }, '#18231d', 8);
      line({ x: 2, y: -11 }, { x: 24, y: -21 }, '#7e8978', 5);
      line({ x: 5, y: -12 }, { x: 23, y: -20 }, '#bac1a0', 1);
      ctx.fillStyle = '#111e16';
      ctx.beginPath();
      ctx.ellipse(24, -20, 2.2, 3.8, -0.5, 0, Math.PI * 2);
      ctx.fill();
      for (const x of [-5, 4]) {
        ctx.fillStyle = '#b2a77c';
        ctx.fillRect(x, -6, 1.3, 1.3);
      }
    } else {
      poly(
        [
          { x: -8, y: 0 },
          { x: -7, y: -10 },
          { x: 0, y: -14 },
          { x: 8, y: -10 },
          { x: 9, y: 0 },
          { x: 0, y: 4 },
        ],
        '#344b3e',
      );
      line({ x: 0, y: 0 }, { x: 0, y: -24 }, '#a7b69c', 3);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(0, -8 - i * 4, 6 - i * 0.6, 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#697d67';
        ctx.fill();
        ctx.strokeStyle = '#acb69a';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      ctx.shadowColor = '#adff71';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#b5f18c';
      ctx.beginPath();
      ctx.arc(0, -26, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      for (const x of [-5, 5]) {
        line({ x, y: -1 }, { x, y: -7 }, '#ace977', 2);
      }
      line({ x: -5, y: -19 }, { x: -9, y: -24 }, '#98d7a4', 1);
      line({ x: 5, y: -19 }, { x: 9, y: -24 }, '#98d7a4', 1);
    }
    ctx.restore();
  }
  cache.set(id, canvas);
  return canvas;
}

export function wallImageUrl(kind: WallKind, connections = 9, turretLevel?: TurretLevel): string {
  const id = `${kind}:${connections}:${turretLevel ?? 0}`;
  let url = urls.get(id);
  if (!url) {
    url = wallCanvas(kind, connections, turretLevel).toDataURL();
    urls.set(id, url);
  }
  return url;
}
