import type Phaser from 'phaser';
import type { PendingAction } from './pending-action';

/** A temporary work site, not the completed building's sprite. */
export function drawPending(
  g: Phaser.GameObjects.Graphics,
  style: PendingAction['style'],
  phase: number,
) {
  g.clear();
  g.fillStyle(0x101b17, 0.7);
  g.fillEllipse(0, 3, 70, 25);
  g.lineStyle(2, 0xe0b96c, 0.85);
  g.strokeEllipse(0, 3, 72, 28);
  if (style === 'construction') {
    // Planked foundation and braced wooden scaffolding.
    g.fillStyle(0x806745, 1);
    g.fillPoints(
      [
        { x: -27, y: -4 },
        { x: 4, y: -17 },
        { x: 29, y: -5 },
        { x: -2, y: 9 },
      ],
      true,
    );
    g.lineStyle(1, 0x392e24, 1);
    for (let x = -22; x < 20; x += 8) g.lineBetween(x, -3, x + 12, 3);
    g.lineStyle(4, 0x382d23, 1);
    for (const [x, y] of [
      [-24, 0],
      [0, -11],
      [24, 0],
    ])
      g.lineBetween(x, y, x, y - 42);
    g.lineStyle(2, 0xbd9a62, 1);
    for (const [x, y] of [
      [-24, 0],
      [0, -11],
      [24, 0],
    ])
      g.lineBetween(x - 1, y, x - 1, y - 42);
    for (const y of [-16, -37]) {
      g.lineBetween(-26, y, 0, y - 11);
      g.lineBetween(0, y - 11, 26, y);
    }
    g.lineStyle(1.5, 0x9c7c4b, 1);
    g.lineBetween(-24, -2, 0, -45);
    g.lineBetween(0, -45, 24, -2);
    g.fillStyle(0x46584a, 1);
    g.fillTriangle(-20, -35, -2, -43, -2, -22);
    g.fillStyle(0xa38c65, 1);
    g.fillRect(13, -7, 14, 8);
  } else if (style === 'recruit') {
    // Muster pennant and silhouettes, deliberately distinct from a finished unit.
    g.lineStyle(3, 0xb69868, 1);
    g.lineBetween(-22, 0, -22, -39);
    g.fillStyle(0xd5b26b, 1);
    g.fillTriangle(-20, -38, 3, -31, -20, -24);
    for (const x of [-4, 14]) {
      g.fillStyle(0x8d9d87, 0.75);
      g.fillCircle(x, -20, 4);
      g.fillRoundedRect(x - 5, -14, 10, 14, 3);
    }
  } else if (style === 'work') {
    g.fillStyle(0x18231d, 0.95);
    g.fillRoundedRect(-23, -29, 46, 20, 3);
    g.lineStyle(4, 0xe0b96c, 1);
    for (let x = -17; x <= 13; x += 10) g.lineBetween(x, -12, x + 8, -26);
    g.lineStyle(3, 0x92734f, 1);
    g.lineBetween(-18, -9, -21, 3);
    g.lineBetween(18, -9, 21, 3);
  }
  // Indeterminate activity: no invented progress percentage or construction timer.
  g.lineStyle(3, 0xf7d991, 1);
  g.beginPath();
  g.arc(0, 3, 18, phase, phase + Math.PI * 1.35);
  g.strokePath();
}
