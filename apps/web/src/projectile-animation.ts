import type Phaser from 'phaser';
import {
  projectileDuration,
  projectilePosition,
  type ProjectileProfile,
  type ShotPoint,
} from './projectile-profile';

/** Cosmetic only: damage and AP always remain authoritative server decisions. */
export function animateProjectile(
  scene: Phaser.Scene,
  from: ShotPoint,
  to: ShotPoint,
  profile: ProjectileProfile,
  impact: () => void,
) {
  const group = scene.add.container(0, 0).setDepth(14400).setName(`projectile:${profile.kind}`);
  const trail = scene.add.graphics();
  const body = scene.add.graphics();
  group.add([trail, body]);
  const progress = { t: 0 };
  const at = (t: number) => projectilePosition(from, to, t, profile.arc);
  const draw = () => {
    const p = at(progress.t),
      next = at(Math.min(1, progress.t + 0.015));
    body.clear();
    trail.clear();
    body.setPosition(p.x, p.y).setRotation(Math.atan2(next.y - p.y, next.x - p.x));
    const color = profile.color;
    const zoom = scene.cameras.main.zoom;
    body.setScale(Math.min(1.6, Math.max(1, 0.85 / zoom)));
    if (profile.kind === 'lightning') {
      trail.lineStyle(5, color, 0.16);
      trail.lineBetween(from.x, from.y, p.x, p.y);
      trail.lineStyle(1.8 / zoom, color, 0.95);
      const dx = p.x - from.x,
        dy = p.y - from.y,
        length = Math.hypot(dx, dy) || 1;
      trail.beginPath();
      trail.moveTo(from.x, from.y);
      for (let i = 1; i <= 12; i++) {
        const bend = i === 12 ? 0 : Math.sin(i * 2.3 + progress.t * 35) * 7;
        trail.lineTo(
          from.x + (dx * i) / 12 - (dy / length) * bend,
          from.y + (dy * i) / 12 + (dx / length) * bend,
        );
      }
      trail.strokePath();
    } else {
      const tail = profile.kind === 'rocket' || profile.kind === 'flame' ? 0.28 : 0.14;
      for (let i = 1; i <= 9; i++) {
        const t = progress.t - (i * tail) / 9;
        if (t < 0) continue;
        const a = at(t),
          b = at(Math.max(0, t - tail / 9));
        if (profile.kind === 'rocket' || profile.kind === 'bomb') {
          trail.fillStyle(profile.radioactive ? 0x97b66b : 0x9b9483, (1 - i / 10) * 0.28);
          trail.fillCircle(a.x, a.y, 2 + i * 0.65);
        } else if (profile.kind === 'flame') {
          trail.fillStyle(color, (1 - i / 10) * 0.6);
          trail.fillCircle(a.x, a.y, 3 + i * 0.6);
        } else {
          trail.lineStyle((profile.kind === 'orb' ? 4 : 1.6) / zoom, color, (1 - i / 10) * 0.6);
          trail.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
    }
    if (profile.kind === 'bullet') {
      for (let i = 0; i < profile.burst; i++) {
        const t = progress.t - i * 0.06;
        if (t < 0) continue;
        const a = at(t),
          b = at(Math.max(0, t - 0.025));
        trail.lineStyle(4 / zoom, color, 0.2);
        trail.lineBetween(a.x, a.y, b.x, b.y);
        trail.lineStyle(1.8 / zoom, 0xfff4d5, 1);
        trail.lineBetween(a.x, a.y, b.x, b.y);
      }
      body.fillStyle(color, 1);
      body.fillEllipse(0, 0, 6, 2.5);
    } else if (profile.kind === 'arrow' || profile.kind === 'bolt') {
      body.lineStyle(2, 0x34271e, 1);
      body.lineBetween(-13, 0, 7, 0);
      body.lineStyle(1, 0xd3b68a, 1);
      body.lineBetween(-13, 0, 7, 0);
      body.fillStyle(0xe4e3cf, 1);
      body.fillTriangle(10, 0, 3, -3, 3, 3);
      body.lineStyle(1, 0xd2cbb7, 1);
      body.lineBetween(-9, 0, -14, -3);
      body.lineBetween(-9, 0, -14, 3);
    } else if (profile.kind === 'rocket') {
      body.fillStyle(color, 0.3);
      body.fillCircle(-10, 0, 7);
      body.fillStyle(color, 1);
      body.fillTriangle(-8, -3, -19 - Math.sin(progress.t * 70) * 4, 0, -8, 3);
      body.fillStyle(0xd4c6a4, 1);
      body.fillRect(-8, -3, 13, 6);
      body.fillStyle(0x635e4d, 1);
      body.fillTriangle(10, 0, 4, -3, 4, 3);
      body.fillTriangle(-7, -5, -7, 5, -1, 0);
    } else if (profile.kind === 'shell' || profile.kind === 'bomb' || profile.kind === 'stone') {
      body.fillStyle(0x0e1210, 0.9);
      body.fillEllipse(0, 0, profile.kind === 'stone' ? 11 : 14, 9);
      body.fillStyle(profile.kind === 'stone' ? 0xb0aa91 : 0xd0b579, 1);
      body.fillEllipse(0, 0, profile.kind === 'stone' ? 8 : 11, 6);
      if (profile.radioactive) {
        body.fillStyle(color, 1);
        body.fillCircle(2, 0, 2);
      }
      if (profile.kind === 'bomb') {
        body.lineStyle(2, 0xb1aa8f, 1);
        body.lineBetween(-8, -5, -8, 5);
      }
    } else {
      body.fillStyle(color, 0.16);
      body.fillCircle(0, 0, 12);
      body.fillStyle(color, 0.7);
      body.fillCircle(0, 0, 6);
      body.fillStyle(0xf2ffd2, 1);
      body.fillCircle(0, 0, 2.5);
    }
    if (progress.t < 0.18) {
      trail.fillStyle(color, (1 - progress.t / 0.18) * 0.8);
      trail.fillCircle(from.x, from.y, 5);
    }
  };
  draw();
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    group.destroy(true);
  };
  const tween = scene.tweens.add({
    targets: progress,
    t: 1,
    duration: projectileDuration(profile.kind, Math.hypot(to.x - from.x, to.y - from.y)),
    onUpdate: draw,
    onComplete: () => {
      finish();
      impact();
    },
  });
  return () => {
    tween.stop();
    finish();
  };
}
