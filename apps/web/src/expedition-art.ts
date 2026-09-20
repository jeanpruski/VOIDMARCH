import type Phaser from 'phaser';
import { expeditionImage } from '@voidmarch/config';
import { key, expeditionFootprint, expeditionCenter } from '@voidmarch/game-rules';
import type { WorldView } from '@voidmarch/shared';
import { hexToPixel, cameraViewport, SIZE, Y_SCALE } from './map-geometry';
const SITE_SIZE = 256;
const SITE_Y_OFFSET = -22;

function disclosedSites(world: WorldView) {
  const known = new Set(
    world.tiles.filter((t) => t.terrain && t.visibility !== 'UNKNOWN').map(key),
  );
  return [world.missions?.active, ...(world.missions?.allied ?? [])].filter(
    (m) => m?.expedition && expeditionFootprint(m).some((h) => known.has(key(h))),
  );
}

/** Clear scenery on covered cells, including the illustration extending beyond its three gameplay cells. */
export function expeditionSceneryClearings(world: WorldView) {
  const cleared = new Set<string>();
  for (const mission of disclosedSites(world)) {
    if (!mission) continue;
    const center = hexToPixel(expeditionCenter(mission));
    for (const cell of expeditionFootprint(mission)) cleared.add(key(cell));
    for (const tile of world.tiles) {
      const p = hexToPixel(tile);
      if (
        Math.abs(p.x - center.x) < SITE_SIZE / 2 + (SIZE * Math.sqrt(3)) / 2 &&
        Math.abs(p.y - center.y - SITE_Y_OFFSET) < SITE_SIZE / 2 + SIZE * Y_SCALE
      )
        cleared.add(key(tile));
    }
  }
  return cleared;
}

const pending = new WeakMap<Phaser.Scene, Set<string>>();
/** Load only accepted, disclosed landmarks. The illustrations never delay initial map loading. */
export function drawExpeditionSites(scene: Phaser.Scene, world: WorldView, redraw: () => void) {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const c = scene.cameras.main,
    bounds = cameraViewport(c.scrollX, c.scrollY, c.width, c.height, c.zoom);
  const sites = disclosedSites(world);
  let loading = pending.get(scene);
  if (!loading) pending.set(scene, (loading = new Set()));
  for (const m of sites) {
    if (!m?.expedition) continue;
    const footprint = expeditionFootprint(m);
    const tiles = footprint.map((h) => world.tiles.find((t) => key(t) === key(h)));
    if (!tiles.some((t) => t?.terrain && t.visibility !== 'UNKNOWN')) continue;
    const alpha = tiles.some((t) => t?.visibility === 'VISIBLE') ? 1 : 0.58;
    const p = hexToPixel(expeditionCenter(m));
    if (
      p.x < bounds.x - 200 ||
      p.x > bounds.x + bounds.width + 200 ||
      p.y < bounds.y - 200 ||
      p.y > bounds.y + bounds.height + 200
    )
      continue;
    const texture = `expedition:${m.expedition.siteId}`;
    if (!scene.textures.exists(texture)) {
      if (!loading.has(texture)) {
        loading.add(texture);
        const image = new Image();
        image.onload = () => {
          if (!scene.sys.isActive()) return;
          if (!scene.textures.exists(texture)) scene.textures.addImage(texture, image);
          loading!.delete(texture);
          redraw();
        };
        image.onerror = () => loading!.delete(texture);
        image.src = expeditionImage(m.expedition.siteId);
      }
      continue;
    }
    // Only the outer contour: shared edges between the three cells disappear.
    const ground = scene.add
      .graphics()
      .setDepth(3400)
      .setName(`expedition-footprint:${m.expedition.siteId}`);
    const edges = new Map<
      string,
      { a: { x: number; y: number }; b: { x: number; y: number }; count: number }
    >();
    for (const cell of footprint) {
      const h = hexToPixel(cell);
      const points = Array.from({ length: 6 }, (_, i) => ({
        x: h.x + Math.cos(((i * 60 - 30) * Math.PI) / 180) * SIZE,
        y: h.y + Math.sin(((i * 60 - 30) * Math.PI) / 180) * SIZE * Y_SCALE,
      }));
      ground.fillStyle(0xd6b56d, 0.06 * alpha).fillPoints(points, true);
      points.forEach((a, i) => {
        const b = points[(i + 1) % 6];
        const k = [a, b]
          .map((v) => `${Math.round(v.x * 100)},${Math.round(v.y * 100)}`)
          .sort()
          .join(':');
        const edge = edges.get(k);
        if (edge) edge.count++;
        else edges.set(k, { a, b, count: 1 });
      });
    }
    ground.lineStyle(1.5, 0xe2bf79, 0.7 * alpha);
    for (const edge of edges.values())
      if (edge.count === 1) ground.lineBetween(edge.a.x, edge.a.y, edge.b.x, edge.b.y);
    objects.push(ground);
    objects.push(
      scene.add
        .image(p.x, p.y + SITE_Y_OFFSET, texture)
        .setDisplaySize(SITE_SIZE, SITE_SIZE)
        // Below every unit and its ownership oval (minimum depth: 6400 − 158).
        .setDepth(6000)
        .setAlpha(alpha)
        .setName(`expedition-site:${m.expedition.siteId}`),
    );
  }
  return objects;
}
