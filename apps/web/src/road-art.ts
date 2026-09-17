import { DIRECTIONS } from '@voidmarch/game-rules';
import { hexToPixel, SIZE, Y_SCALE } from './map-geometry';

/** Procedural dirt/gravel and timber, clipped to the hex so adjacent branches join cleanly. */
export function roadCanvas(
  connections: number,
  bridge: boolean,
  variation: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(128, 128);
  ctx.scale(2, 2);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = ((30 + i * 60) * Math.PI) / 180;
    const x = Math.cos(angle) * SIZE,
      y = Math.sin(angle) * SIZE * Y_SCALE;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.clip();
  const branches = DIRECTIONS.flatMap((p, i) =>
    connections & (1 << i) ? [{ x: hexToPixel(p).x / 2, y: hexToPixel(p).y / 2 }] : [],
  );
  if (!branches.length) branches.push({ x: -12, y: 0 }, { x: 12, y: 0 });
  const trace = (width: number, ink: string) => {
    ctx.beginPath();
    for (const p of branches) {
      ctx.moveTo(0, 0);
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = ink;
    ctx.stroke();
  };
  trace(24, '#10191470');
  trace(20, bridge ? '#30291f' : '#423b2d');
  trace(16, bridge ? '#988568' : '#a08e6d');
  if (bridge) {
    for (const p of branches) {
      const length = Math.hypot(p.x, p.y);
      ctx.save();
      ctx.rotate(Math.atan2(p.y, p.x));
      for (let x = 2; x < length; x += 5) {
        ctx.fillStyle = '#433d30';
        ctx.fillRect(x, -8, 1, 16);
        ctx.fillStyle = '#c4af87';
        ctx.fillRect(x + 1, -7, 0.8, 14);
        ctx.fillStyle = '#3c3a32';
        ctx.fillRect(x + 2, -6, 1, 1);
        ctx.fillRect(x + 2, 5, 1, 1);
      }
      ctx.strokeStyle = '#d0ba8f';
      ctx.lineWidth = 1.5;
      for (const side of [-7.5, 7.5]) {
        ctx.beginPath();
        ctx.moveTo(0, side);
        ctx.lineTo(length, side);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    let seed = 731 + variation * 193 + connections * 101;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const onPath = (x: number, y: number) =>
      branches.some((p) => {
        const ratio = Math.max(0, Math.min(1, (x * p.x + y * p.y) / (p.x * p.x + p.y * p.y)));
        return Math.hypot(x - p.x * ratio, y - p.y * ratio) < 7.6;
      });
    for (let i = 0; i < 800; i++) {
      const x = (random() - 0.5) * 96,
        y = (random() - 0.5) * 80;
      if (!onPath(x, y)) continue;
      ctx.fillStyle = ['#5e5641a0', '#d3c29b90', '#c0b18b70', '#777463a0'][
        Math.floor(random() * 4)
      ];
      ctx.beginPath();
      ctx.ellipse(x, y, 0.35 + random() * 0.95, 0.25 + random() * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Worn wheel tracks make direction legible without looking like a solid UI line.
    for (const p of branches) {
      const length = Math.hypot(p.x, p.y);
      ctx.save();
      ctx.rotate(Math.atan2(p.y, p.x));
      ctx.strokeStyle = '#62543d65';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 3]);
      for (const side of [-3.5, 3.5]) {
        ctx.beginPath();
        ctx.moveTo(5, side);
        ctx.lineTo(length, side);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  return canvas;
}
