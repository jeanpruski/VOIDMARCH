import type Phaser from 'phaser';
import { hash, key } from '@voidmarch/game-rules';
import type { WorldView } from '@voidmarch/shared';
import { SIZE, Y_SCALE, hexToPixel, type CameraViewport } from './map-geometry';

export const RADIATION_DEPTH = 3300;
export const MAX_RADIATION_MIST = 80;
const MIST_TEXTURE = 'radiation-ground-mist';
const GREEN = 0x88cf42;
export interface RadiationCell {
  x: number;
  y: number;
  strength: number;
  phase: number;
}
export function visibleRadiation(world: WorldView, bounds: CameraViewport): RadiationCell[] {
  const visible = new Set(world.tiles.filter((t) => t.visibility === 'VISIBLE').map(key));
  return (world.strategy?.fallout ?? [])
    .flatMap((f) => {
      if (!Number.isFinite(f.intensity) || f.intensity <= 0 || !visible.has(key(f))) return [];
      const p = hexToPixel(f);
      if (
        p.x + SIZE < bounds.x ||
        p.x - SIZE > bounds.x + bounds.width ||
        p.y + SIZE < bounds.y ||
        p.y - SIZE > bounds.y + bounds.height
      )
        return [];
      return [
        { ...p, strength: Math.min(100, f.intensity) / 100, phase: hash(`radiation:${key(f)}`) },
      ];
    })
    .sort(
      (a, b) =>
        Math.hypot(a.x - bounds.x - bounds.width / 2, a.y - bounds.y - bounds.height / 2) -
        Math.hypot(b.x - bounds.x - bounds.width / 2, b.y - bounds.y - bounds.height / 2),
    );
}
export function radiationMotion(cell: RadiationCell, time: number, reduced: boolean) {
  const wave = reduced ? 0 : Math.sin((time * Math.PI) / 2000 + cell.phase * Math.PI * 2);
  const phase = reduced ? 0.45 : (((time / 4200 + cell.phase) % 1) + 1) % 1;
  return {
    wash: 0.23 + cell.strength * 0.1,
    mist: 0.26 + cell.strength * 0.1 + wave * 0.06,
    driftX: reduced ? 0 : Math.sin(time / 2300 + cell.phase * 6) * 4,
    driftY: reduced ? 0 : Math.cos(time / 2700 + cell.phase * 6) * 2,
    moteY: 8 - phase * 24,
    moteAlpha: reduced ? 0 : Math.sin(phase * Math.PI) * 0.65,
  };
}
function mistTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(MIST_TEXTURE)) return;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  // Soft lobes instead of an opaque cloud; transparent edges stay inside each hexagon.
  for (const [x, y, radius] of [
    [36, 49, 29],
    [63, 39, 33],
    [91, 54, 29],
    [62, 62, 25],
  ]) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(164,234,77,0.7)');
    gradient.addColorStop(0.45, 'rgba(130,213,59,0.32)');
    gradient.addColorStop(1, 'rgba(112,194,48,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 96);
  }
  scene.textures.addCanvas(MIST_TEXTURE, canvas);
}
/** Separate ground layer, below selection, buildings and troops. Reuses a bounded pool. */
export class RadiationOverlay {
  private ground: Phaser.GameObjects.Graphics;
  private motes: Phaser.GameObjects.Graphics;
  private clouds: Phaser.GameObjects.Image[] = [];
  private cells: RadiationCell[] = [];
  private reduced = false;
  constructor(private scene: Phaser.Scene) {
    mistTexture(scene);
    this.ground = scene.add.graphics().setDepth(RADIATION_DEPTH).setName('radiation-ground');
    this.motes = scene.add
      .graphics()
      .setDepth(RADIATION_DEPTH + 2)
      .setName('radiation-motes');
  }
  sync(world: WorldView, bounds: CameraViewport, simple: boolean) {
    this.reduced = world.player.settings.reducedMotion;
    this.cells = simple ? [] : visibleRadiation(world, bounds);
    this.ground.clear().setData('tile-count', this.cells.length);
    for (const cell of this.cells) {
      const points = Array.from({ length: 6 }, (_, i) => ({
        x: cell.x + Math.cos(((i * 60 - 30) * Math.PI) / 180) * SIZE,
        y: cell.y + Math.sin(((i * 60 - 30) * Math.PI) / 180) * SIZE * Y_SCALE,
      }));
      this.ground.fillStyle(GREEN, radiationMotion(cell, 0, true).wash).fillPoints(points, true);
      this.ground.lineStyle(1.2, 0x9ed45c, 0.78).strokePoints(points, true);
    }
    const count = Math.min(MAX_RADIATION_MIST, this.cells.length);
    while (this.clouds.length < count)
      this.clouds.push(
        this.scene.add
          .image(0, 0, MIST_TEXTURE)
          .setDepth(RADIATION_DEPTH + 1)
          .setName('radiation-mist')
          .setDisplaySize(72, 34),
      );
    this.clouds.forEach((cloud, i) => cloud.setVisible(i < count));
    this.update(this.scene.time.now);
  }
  update(time: number) {
    this.ground.setAlpha(this.reduced ? 1 : 0.96 + 0.04 * Math.sin((time * Math.PI) / 2000));
    this.motes.clear();
    let particles = 0;
    for (let i = 0; i < Math.min(this.cells.length, MAX_RADIATION_MIST); i++) {
      const cell = this.cells[i],
        m = radiationMotion(cell, time, this.reduced);
      this.clouds[i].setPosition(cell.x + m.driftX, cell.y + m.driftY).setAlpha(m.mist);
      if (i % 2 || this.reduced) continue;
      const x = cell.x + (cell.phase - 0.5) * 34,
        y = cell.y + m.moteY;
      this.motes.fillStyle(0xb7ed72, m.moteAlpha * 0.14).fillCircle(x, y, 3.6);
      this.motes.fillStyle(0xd1ff9c, m.moteAlpha).fillCircle(x, y, 1.15);
      particles++;
    }
    this.motes.setData('particle-count', particles);
  }
  destroy() {
    this.ground.destroy();
    this.motes.destroy();
    for (const cloud of this.clouds) cloud.destroy();
    this.clouds = [];
    this.cells = [];
  }
}
