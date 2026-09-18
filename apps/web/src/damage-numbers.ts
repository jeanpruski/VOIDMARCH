import type Phaser from 'phaser';
import { formatNumber } from '@voidmarch/config';
import { key } from '@voidmarch/game-rules';
import { hexToPixel } from './map-geometry';
import type { CombatDamage } from './combat-damage';

/** Separate from speculative projectiles: only server-confirmed hits enter this layer. */
export class DamageNumbers {
  private seen = new Set<string>();
  private labels = new Map<
    Phaser.GameObjects.Text,
    { tile: string; timer: ReturnType<typeof setTimeout> }
  >();
  constructor(private scene: Phaser.Scene) {}

  show(hit: CombatDamage, ownerId: string, reducedMotion: boolean, enabled: boolean) {
    if (this.seen.has(hit.id)) return;
    this.seen.add(hit.id);
    if (this.seen.size > 256) this.seen.delete(this.seen.values().next().value!);
    if (!enabled) return;
    const p = hexToPixel(hit);
    const camera = this.scene.cameras.main;
    if (!camera.worldView.contains(p.x, p.y)) return;
    if (this.labels.size >= 48) this.remove(this.labels.keys().next().value!);
    const scale = Math.min(3, 1 / camera.zoom);
    const tile = key(hit);
    const stack = [...this.labels.values()].filter((entry) => entry.tile === tile).length;
    const y = p.y - (hit.airborne ? 100 : hit.targetKind === 'building' ? 82 : 78);
    const label = this.scene.add
      .text(
        p.x + (stack % 2 ? 9 : -9) * scale,
        y - stack * 48 * scale,
        `−${formatNumber(hit.amount)}${hit.retaliation ? '\nRiposte' : ''}`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: hit.targetOwnerId === ownerId ? '#ff8580' : '#ffe4a0',
          stroke: '#151717',
          strokeThickness: 4,
          align: 'center',
          padding: { x: 5, y: 3 },
        },
      )
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(14900)
      .setName(`damage:${hit.id}`);
    label.setData('amount', hit.amount);
    if (!reducedMotion)
      this.scene.tweens.add({
        targets: label,
        y: '-=' + 24 * scale,
        duration: 1800,
        ease: 'Sine.Out',
      });
    this.scene.tweens.add({ targets: label, alpha: 0, delay: 1250, duration: 550 });
    // Expire in real time, including when the renderer is throttled or paused.
    const timer = setTimeout(() => this.remove(label), 1800);
    this.labels.set(label, { tile, timer });
  }

  private remove(label: Phaser.GameObjects.Text) {
    clearTimeout(this.labels.get(label)?.timer);
    this.labels.delete(label);
    this.scene.tweens.killTweensOf(label);
    label.destroy();
  }
  clear() {
    for (const label of this.labels.keys()) this.remove(label);
  }
}
