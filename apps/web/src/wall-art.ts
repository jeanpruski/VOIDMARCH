import { WALL_KINDS, WALL_HEIGHTS, type WallKind, type TurretLevel } from '@voidmarch/config';
import { DIRECTIONS } from '@voidmarch/game-rules';
import { hexToPixel, Y_SCALE } from './map-geometry';

type Point = { x: number; y: number };
const palettes = {
  CONCRETE_WALL: {
    height: 37,
    width: 13,
    face: '#737e7a',
    side: '#404d47',
    top: '#a4b4aa',
    line: '#293a31',
  },
  ATOMIC_WALL: {
    height: 37,
    width: 14,
    face: '#3c574d',
    side: '#1c302b',
    top: '#8bba99',
    line: '#162d22',
  },
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

/** Axis in 60-degree steps (half-steps for corners), modulo a half-turn.
 * A corner follows the chord between its arms, not one arbitrary neighbour. */
export function wallGateAxis(connections: number, roads: number): number {
  const sides = DIRECTIONS.flatMap((_, side) => (connections & (1 << side) ? [side] : []));
  if (sides.length === 1) return sides[0] % 3;
  const candidates: { axis: number; span: number }[] = [];
  for (let i = 0; i < sides.length; i++)
    for (let j = i + 1; j < sides.length; j++) {
      const a = hexToPixel(DIRECTIONS[sides[i]]),
        b = hexToPixel(DIRECTIONS[sides[j]]);
      const angle = Math.atan2((b.y - a.y) / Y_SCALE, b.x - a.x);
      const axis = (((Math.round(-angle / (Math.PI / 6)) % 6) + 6) % 6) / 2;
      const delta = Math.abs(sides[i] - sides[j]);
      candidates.push({ axis, span: Math.min(delta, 6 - delta) });
    }
  if (!candidates.length) for (const axis of [0, 1, 2]) candidates.push({ axis, span: 0 });
  const score = ({ axis, span }: (typeof candidates)[number]) => {
    const angle = (-axis * Math.PI) / 3;
    let crossing = 0;
    DIRECTIONS.forEach((direction, side) => {
      if (!(roads & (1 << side))) return;
      const road = hexToPixel(direction);
      crossing += Math.abs(Math.sin(Math.atan2(road.y / Y_SCALE, road.x) - angle));
    });
    // Round equivalent crossings: floating-point noise must not flip a junction.
    return span * 10 + Math.round(crossing * 1000) / 1000;
  };
  return candidates.sort((a, b) => score(b) - score(a) || a.axis - b.axis)[0].axis;
}

/** Join the outside of a jamb, never the middle of the doorway. */
export function gateArmStart(end: Point, gateAxis: number): Point {
  const angle = (-gateAxis * Math.PI) / 3,
    ux = Math.cos(angle),
    uy = Math.sin(angle);
  const x = end.x * ux + (end.y / Y_SCALE) * uy;
  const y = -end.x * uy + (end.y / Y_SCALE) * ux;
  const jamb = x < -0.001 ? -20 : 20;
  const offset = Math.max(-6, Math.min(6, y));
  return { x: ux * jamb - uy * offset, y: (uy * jamb + ux * offset) * Y_SCALE };
}

/** Joined geometry is drawn in the same hex projection as the map, so every
 * rotation, terminal, corner and junction meets exactly at the shared boundary. */
export function wallCanvas(
  kind: WallKind,
  connections = 9,
  turretLevel?: TurretLevel,
  gateAxis?: number,
  gateOpen = false,
): HTMLCanvasElement {
  const id = `${kind}:${connections}:${turretLevel ?? 0}:${gateAxis ?? 'wall'}:${gateOpen ? 'open' : 'closed'}`;
  const previous = cache.get(id);
  if (previous) return previous;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(128, 152);
  ctx.scale(2, 2);
  const palette = palettes[kind];
  const poly = (points: Point[], fill: string, stroke = palette.line, textured = true) => {
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
    if (textured && materials && points.length === 4 && Math.abs(area) > 0.001) {
      // Project the painted material onto this exact parallelogram; geometry,
      // end caps and adjacency remain deterministic in every orientation.
      const a = points[0],
        b = points[1],
        d = points[3];
      const size = materials.naturalWidth / 3;
      const column = kind === 'CONCRETE_WALL' ? 1 : Math.min(2, WALL_KINDS.indexOf(kind));
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
    const isolatedAxis = gateAxis ?? 0;
    if (
      connections
        ? !(connections & (1 << side))
        : side !== isolatedAxis && side !== isolatedAxis + 3
    )
      return [];
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
          if (['STEEL_WALL', 'CONCRETE_WALL', 'ATOMIC_WALL'].includes(kind)) {
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
  if (gateAxis !== undefined) {
    // A gatehouse replaces the central pier. Its axes use the map projection,
    // so road surfaces remain visible at its feet and every wall arm still joins.
    const angle = (-gateAxis * Math.PI) / 3;
    const ux = Math.cos(angle),
      uy = Math.sin(angle);
    const point = (x: number, y: number, z = 0): Point => ({
      x: ux * x - uy * y,
      y: (uy * x + ux * y) * Y_SCALE - z,
    });
    const h = palette.height + 2;
    const block = (
      x: number,
      y: number,
      width: number,
      depth: number,
      z: number,
      height: number,
    ) => {
      const corners = [
        point(x - width / 2, y - depth / 2, z),
        point(x + width / 2, y - depth / 2, z),
        point(x + width / 2, y + depth / 2, z),
        point(x - width / 2, y + depth / 2, z),
      ];
      for (let i = 0; i < 4; i++) {
        const a = corners[i],
          b = corners[(i + 1) % 4];
        if (b.x >= a.x) continue;
        poly(
          [a, b, { x: b.x, y: b.y - height }, { x: a.x, y: a.y - height }],
          i % 2 ? palette.side : palette.face,
        );
      }
      poly(
        corners.map((p) => ({ x: p.x, y: p.y - height })),
        palette.top,
      );
    };
    const drawArm = (end: Point) => {
      const start = gateArmStart(end, gateAxis);
      ctx.save();
      ctx.translate(start.x, start.y);
      beam({ x: end.x - start.x, y: end.y - start.y });
      ctx.restore();
    };
    for (const end of arms.filter((p) => p.y < 0)) drawArm(end);
    // Closed double leaves: wood with iron braces, iron grille in masonry,
    // or riveted armoured steel. Their appearance never changes collision rules.
    const front = ux >= 0 ? 1 : -1;
    const door = (x: number, z: number) =>
      point((gateOpen ? (x < 0 ? -9 : 9) + x * 0.1 : x) * 1.4, front * 6, z);
    poly(
      [door(-10, 1), door(10, 1), door(10, h - 5), door(-10, h - 5)],
      kind === 'WOOD_WALL' ? '#51402c' : '#1b2520',
      palette.line,
      kind !== 'STONE_WALL',
    );
    const stroke = (x1: number, z1: number, x2: number, z2: number, ink: string, width = 0.8) =>
      line(door(x1, z1), door(x2, z2), ink, width);
    if (kind === 'WOOD_WALL') {
      for (let x = -8; x < 10; x += 3) stroke(x, 1, x, h - 5, '#231d16', 0.7);
      for (const z of [5, h - 9]) stroke(-10, z, 10, z, '#292d27', 2.2);
      stroke(-9, 5, -1, h - 9, '#a08a61', 1.6);
      stroke(1, h - 9, 9, 5, '#a08a61', 1.6);
    } else if (kind === 'STONE_WALL') {
      for (let x = -8; x <= 8; x += 4) {
        stroke(x, 1, x, h - 5, '#7f8c7e', 1.6);
        stroke(x - 0.6, 1, x - 0.6, h - 5, '#242e29', 0.6);
      }
      for (const z of [6, 13, h - 7]) stroke(-10, z, 10, z, '#9a9e87', 1.2);
    } else {
      poly(
        [door(-10, 1), door(10, 1), door(10, h - 5), door(-10, h - 5)],
        '#0c1c1877',
        '#879583',
        false,
      );
      for (const x of [-8, -2, 2, 8])
        for (const z of [4, h - 8]) stroke(x, z, x, z + 0.7, '#bec0a0', 1.3);
      for (const x of [-6, 6]) {
        stroke(x - 2, h - 12, x + 2, h - 12, '#17261c', 3);
        stroke(x - 1.5, h - 12, x + 1.5, h - 12, '#9cbe86', 0.8);
      }
      stroke(-9, 5, -2, 12, '#303e34', 1.8);
      stroke(2, 12, 9, 5, '#303e34', 1.8);
    }
    stroke(0, 1, 0, h - 5, '#111b16', 1.4);
    // Two stone/wood/steel jambs, then a load-bearing lintel for the turret.
    for (const x of [-17, 17].sort((a, b) => point(a, 0).y - point(b, 0).y))
      block(x, 0, 6, 12, 0, h);
    block(0, 0, 40, 12, h - 5, 5);
    for (const x of [-17, 17]) block(x, 0, 7, 13, h, kind === 'WOOD_WALL' ? 2 : 3);
    for (const end of arms.filter((p) => p.y >= 0)) drawArm(end);
  } else {
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
  }
  if (kind === 'CONCRETE_WALL' || kind === 'ATOMIC_WALL') {
    for (const end of arms) {
      const start = gateAxis === undefined ? { x: 0, y: 0 } : gateArmStart(end, gateAxis);
      line(
        { x: start.x, y: start.y - palette.height + 1 },
        { x: end.x, y: end.y - palette.height + 1 },
        kind === 'ATOMIC_WALL' ? '#8df4b4' : '#b6c9c0',
        kind === 'ATOMIC_WALL' ? 1.8 : 2.5,
      );
    }
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
    if (turretLevel >= 4) {
      line({ x: -7, y: -3 }, { x: 23, y: -17 }, turretLevel === 5 ? '#8cefc0' : '#bdcbc4', 6);
      line({ x: -7, y: -7 }, { x: 23, y: -21 }, '#203d32', 5);
      for (const x of [-8, 8])
        poly(
          [
            { x: x - 3, y: 0 },
            { x: x + 3, y: 0 },
            { x: x + 3, y: -14 },
            { x: x - 3, y: -14 },
          ],
          turretLevel === 5 ? '#63b885' : '#667c72',
        );
      if (turretLevel === 5) line({ x: 0, y: -6 }, { x: 0, y: -28 }, '#b4ff8d', 3);
    } else if (turretLevel === 1) {
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

export function wallImageUrl(
  kind: WallKind,
  connections = 9,
  turretLevel?: TurretLevel,
  gateAxis?: number,
): string {
  const id = `${kind}:${connections}:${turretLevel ?? 0}:${gateAxis ?? 'wall'}`;
  let url = urls.get(id);
  if (!url) {
    url = wallCanvas(kind, connections, turretLevel, gateAxis).toDataURL();
    urls.set(id, url);
  }
  return url;
}
