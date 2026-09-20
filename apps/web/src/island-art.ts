import type Phaser from 'phaser';
import { ISLAND_DISCOVERIES } from '@voidmarch/config';
import type { WorldView } from '@voidmarch/shared';
import { hexToPixel, cameraViewport } from './map-geometry';
const pending = new WeakMap<Phaser.Scene, Set<string>>();
/** Permanent sites remain under fog as remembered, but never disclose unknown islands. */
export function drawIslandDiscoveries(scene: Phaser.Scene, world: WorldView, redraw: () => void) {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const c = scene.cameras.main,
    bounds = cameraViewport(c.scrollX, c.scrollY, c.width, c.height, c.zoom);
  let loading = pending.get(scene);
  if (!loading) pending.set(scene, (loading = new Set()));
  for (const tile of world.tiles) {
    if (!tile.islandDiscovery || !tile.poi || tile.building || tile.visibility === 'UNKNOWN')
      continue;
    const p = hexToPixel(tile);
    if (
      p.x < bounds.x - 120 ||
      p.x > bounds.x + bounds.width + 120 ||
      p.y < bounds.y - 120 ||
      p.y > bounds.y + bounds.height + 120
    )
      continue;
    const discovery = ISLAND_DISCOVERIES[tile.islandDiscovery],
      texture = `island:${tile.islandDiscovery}`;
    const alpha = tile.visibility === 'VISIBLE' ? 1 : 0.5;
    if (!scene.textures.exists(texture)) {
      if (!loading.has(texture)) {
        loading.add(texture);
        const image = new Image();
        image.onload = () => {
          loading!.delete(texture);
          if (!scene.sys.isActive()) return;
          if (!scene.textures.exists(texture)) scene.textures.addImage(texture, image);
          redraw();
        };
        image.onerror = () => loading!.delete(texture);
        image.src = discovery.image;
      }
    } else
      objects.push(
        scene.add
          .image(p.x, p.y - 18, texture)
          .setDisplaySize(100, 100)
          .setDepth(5900)
          .setAlpha(alpha)
          .setName(`island-discovery:${tile.q},${tile.r}`),
      );
    objects.push(
      scene.add
        .text(
          p.x,
          p.y + 29,
          `${tile.exhausted ? '✓' : '◇'} ${discovery.name}${tile.exhausted ? ' · fouillé' : ''}`,
          {
            fontFamily: 'Georgia',
            fontSize: '9px',
            color: tile.exhausted ? '#a9b0a2' : '#e9ce88',
            backgroundColor: '#182521',
            padding: { x: 5, y: 3 },
          },
        )
        .setOrigin(0.5)
        .setDepth(6100)
        .setAlpha(alpha)
        .setName(`island-discovery-label:${tile.q},${tile.r}`),
    );
  }
  return objects;
}
