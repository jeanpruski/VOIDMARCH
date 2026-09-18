import type Phaser from 'phaser';
import { hexToPixel } from './map-geometry';
import { newVictories } from './victories';
import type { WorldView } from '@voidmarch/shared';
import { key } from '@voidmarch/game-rules';

/** Replaces each normal banner briefly; it never changes authoritative ownership. */
export class VictoryBanners {
  readonly hidden = new Set<string>();
  private waves = new Set<() => void>();
  constructor(
    private scene: Phaser.Scene,
    private refresh: () => void,
  ) {}
  show(before: WorldView, after: WorldView, enabled: boolean) {
    if (!enabled || after.player.settings.reducedMotion) return;
    const awards = newVictories(before, after);
    if (!awards.length) return;
    const old = new Map(before.tiles.map((t) => [key(t), t]));
    const groups: Phaser.GameObjects.Container[] = [],
      ids: string[] = [];
    for (const tile of after.tiles) {
      if (groups.length >= 16) break;
      const previous = old.get(key(tile));
      const award = awards.find(
        (v) =>
          tile.building?.ownerId === v.ownerId && previous?.building?.ownerId === `mission:${v.id}`,
      );
      if (
        !award ||
        !tile.building ||
        tile.visibility !== 'VISIBLE' ||
        previous?.visibility !== 'VISIBLE'
      )
        continue;
      const p = hexToPixel(tile);
      if (!this.scene.cameras.main.worldView.contains(p.x, p.y)) continue;
      const realm = after.realms.find((r) => r.id === award.ownerId);
      const own = award.ownerId === after.player.id;
      const tint = Number.parseInt(
        (own ? after.player.settings.bannerColor : (realm?.color ?? '#877d63')).slice(1),
        16,
      );
      const square = (own ? after.player.settings.bannerShape : realm?.bannerShape) === 'square';
      const group = this.scene.add
        .container(p.x - 25, p.y + 4)
        .setDepth(14600)
        .setName('victory-banner');
      const pole = this.scene.add.graphics().lineStyle(4, 0x101814).lineBetween(0, -1, 0, 22);
      pole.lineStyle(1.5, 0xd6c9a5).lineBetween(0, -1, 0, 22);
      const flag = (ink: number, box = false) => {
        const points = box
          ? [
              { x: 0, y: 0 },
              { x: 14, y: 0 },
              { x: 14, y: 10 },
              { x: 0, y: 10 },
            ]
          : [
              { x: 0, y: 0 },
              { x: 15, y: 5 },
              { x: 0, y: 11 },
            ];
        const g = this.scene.add.graphics();
        g.fillStyle(ink)
          .fillPoints(points, true)
          .lineStyle(3, 0x101814)
          .strokePoints(points, true)
          .lineStyle(0.8, 0xe0d7bd)
          .strokePoints(points, true);
        return g;
      };
      const oldFlag = flag(0x877d63),
        newFlag = flag(tint, square).setY(15).setAlpha(0);
      group.add([pole, oldFlag, newFlag]);
      groups.push(group);
      ids.push(tile.building.id);
      this.hidden.add(tile.building.id);
      this.scene.tweens.add({ targets: oldFlag, y: 15, alpha: 0, duration: 600 });
      this.scene.tweens.add({ targets: newFlag, y: 0, alpha: 1, duration: 800, delay: 600 });
    }
    if (!groups.length) return;
    const finish = () => {
      clearTimeout(timer);
      this.waves.delete(finish);
      for (const group of groups) {
        this.scene.tweens.killTweensOf(group.list);
        group.destroy(true);
      }
      ids.forEach((id) => this.hidden.delete(id));
    };
    const timer = setTimeout(() => {
      finish();
      if (this.scene.sys.isActive()) this.refresh();
    }, 2200);
    this.waves.add(finish);
    this.refresh();
  }
  clear() {
    for (const finish of [...this.waves]) finish();
  }
}
