import type Phaser from 'phaser';
import {
  BUILDINGS,
  SITE_NAMES,
  UNIT_PROFILES,
  veteranRank,
  nuclearStrikeRadius,
  hexArea,
} from '@voidmarch/config';
import { disk, key } from '@voidmarch/game-rules';
import type { Hex, WorldView, Unit } from '@voidmarch/shared';
import { hexToPixel, SIZE, Y_SCALE, cameraViewport } from './map-geometry';

export function drawStrategicOperations(
  scene: Phaser.Scene,
  world: WorldView,
  simple: boolean,
): Phaser.GameObjects.GameObject[] {
  const d = world.strategy;
  if (!d) return [];
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics().setDepth(3400).setName('strategic-operations');
  objects.push(g);
  const camera = scene.cameras.main,
    bounds = cameraViewport(
      camera.scrollX,
      camera.scrollY,
      camera.width,
      camera.height,
      camera.zoom,
    );
  const visible = (p: Hex) => {
    const h = hexToPixel(p);
    return (
      h.x >= bounds.x &&
      h.x <= bounds.x + bounds.width &&
      h.y >= bounds.y &&
      h.y <= bounds.y + bounds.height
    );
  };
  const hex = (p: Hex, ink: number, alpha: number) => {
    const h = hexToPixel(p);
    const points = Array.from({ length: 6 }, (_, i) => ({
      x: h.x + Math.cos(((i * 60 - 30) * Math.PI) / 180) * SIZE,
      y: h.y + Math.sin(((i * 60 - 30) * Math.PI) / 180) * SIZE * Y_SCALE,
    }));
    g.fillStyle(ink, alpha);
    g.fillPoints(points, true);
    g.lineStyle(1.4, ink, 0.8);
    g.strokePoints(points, true);
  };
  const label = (p: Hex, text: string, color: string) => {
    if (!visible(p)) return;
    const h = hexToPixel(p);
    objects.push(
      scene.add
        .text(h.x, h.y - 22, text, {
          fontSize: simple ? '15px' : '11px',
          color,
          backgroundColor: '#17201fee',
          padding: { x: 6, y: 4 },
        })
        .setOrigin(0.5)
        .setDepth(13600)
        .setName('strategy-label'),
    );
  };
  for (const mission of [world.missions?.active, ...(world.missions?.allied ?? [])]) {
    if (!mission) continue;
    const objective = 'objectivePosition' in mission ? (mission.objectivePosition as Hex) : mission;
    if (visible(objective)) hex(objective, 0xe2b767, 0.2);
    label(
      objective,
      `⚑ ${mission.realmId === world.player.id ? 'OBJECTIF' : 'MISSION ALLIÉE'} · ${mission.title}`,
      '#f2cc85',
    );
  }
  if (!simple)
    for (const f of d.fallout)
      // A visible but light veil (8–14%) keeps the owner's banner color readable.
      if (f.intensity > 0 && visible(f))
        hex(f, 0x89b643, 0.08 + Math.min(100, f.intensity) * 0.0006);
  for (const strike of d.strikes.filter((s) => !s.resolvedAt)) {
    let count = 0;
    for (const p of disk(strike, nuclearStrikeRadius(strike)))
      if (visible(p)) {
        hex(p, 0xea6349, 0.24);
        count++;
      }
    g.setData('strike-hexes', count);
    label(strike, `☢ ZONE D’IMPACT · ${hexArea(nuclearStrikeRadius(strike))} CASES`, '#ffd48d');
  }
  for (const site of d.sites)
    label(
      site,
      `${site.kind === 'RADIO' ? '◉' : site.kind === 'MINE' ? '◇' : '✦'} ${SITE_NAMES[site.kind]}`,
      world.realms.find((r) => r.id === site.ownerId)?.color ?? '#e8d597',
    );
  for (const op of d.alliance?.operations ?? []) {
    if (op.status !== 'PLANNING' && op.status !== 'ACTIVE') continue;
    if (visible(op)) hex(op, 0xa5dbc7, 0.16);
    label(
      op,
      `⚑ ${op.title} · ${op.status === 'PLANNING' ? 'PRÉPARATION' : Math.round(op.progress * 100) + ' %'}`,
      '#b8e8d5',
    );
  }
  for (const marker of d.alliance?.markers ?? [])
    label(
      marker,
      `${marker.kind === 'HELP' ? '⛨' : marker.kind === 'ATTACK' ? '⚔' : '◇'} ${marker.label}`,
      '#a5dbc7',
    );
  return objects;
}
// JS remainder (%) can be negative west of the world origin. Particle phases
// must stay in [0, 1) so smoke radii and opacity remain valid on Canvas.
const cyclePhase = (value: number) => value - Math.floor(value);

/** One reusable graphics layer, capped and culled. No particles/timers accumulate per frame. */
export function drawAmbient(
  g: Phaser.GameObjects.Graphics,
  world: WorldView,
  position: (u: Unit) => { x: number; y: number },
  time: number,
  moving: Set<string>,
  showUnits: boolean,
  showBuildings: boolean,
) {
  g.clear();
  const camera = g.scene.cameras.main,
    reduced = world.player.settings.reducedMotion;
  let count = 0;
  if (showBuildings)
    for (const t of world.tiles) {
      const b = t.building;
      if (!b || t.visibility !== 'VISIBLE') continue;
      const p = hexToPixel(b);
      if (!camera.worldView.contains(p.x, p.y) || count++ > 70) continue;
      const atomic = [
        'NUCLEAR_REACTOR',
        'ISOTOPE_LAB',
        'ATOMIC_FOUNDRY',
        'GLOCKE_COMPLEX',
      ].includes(b.kind);
      const smoke = [
        'FORGE',
        'REFINERY',
        'MUNITIONS',
        'TANK_FACTORY',
        'STEAM_SAWMILL',
        'INDUSTRIAL_MINE',
      ].includes(b.kind);
      const damaged = b.hp < BUILDINGS[b.kind].hp * b.level * 0.7;
      if (atomic) {
        g.fillStyle(0x95d1a0, reduced ? 0.13 : 0.13 + 0.07 * Math.sin(time / 750 + p.x));
        g.fillEllipse(p.x, p.y - 18, 36, 20);
        g.lineStyle(1, 0xc1e9a1, 0.35);
        g.strokeEllipse(p.x, p.y + 7, 36, 10);
      }
      if (smoke || damaged)
        for (let i = 0; i < 3; i++) {
          const phase = reduced ? i / 3 : cyclePhase(time / 3600 + i / 3 + p.x * 0.001);
          g.fillStyle(damaged ? 0x28342b : 0x8c9585, (1 - phase) * 0.24);
          g.fillCircle(p.x + 8 + Math.sin(phase * 3) * 8, p.y - 39 - phase * 26, 3 + phase * 6);
        }
      if (b.kind === 'FORGE' || b.kind === 'ATOMIC_FOUNDRY') {
        g.fillStyle(0xffba65, reduced ? 0.65 : 0.5 + 0.25 * Math.sin(time / 190));
        g.fillCircle(p.x - 3, p.y - 18, 2);
      }
      if (damaged) {
        g.lineStyle(1, 0x101910, 0.8);
        g.beginPath();
        g.moveTo(p.x - 4, p.y - 28);
        g.lineTo(p.x + 1, p.y - 22);
        g.lineTo(p.x - 2, p.y - 18);
        g.lineTo(p.x + 4, p.y - 10);
        g.strokePath();
      }
    }
  count = 0;
  if (showUnits)
    for (const u of world.units) {
      const p = position(u);
      if (!camera.worldView.contains(p.x, p.y) || count++ > 100) continue;
      const profile = UNIT_PROFILES[u.kind],
        isMoving = moving.has(u.id) && !reduced;
      if (profile.flying) {
        g.fillStyle(0x07120c, 0.18);
        g.fillEllipse(p.x + 10, p.y + 14, 40, 10);
        if (/HELI|GYRO/.test(u.kind)) {
          const a = reduced ? 0 : time / 60;
          g.lineStyle(1.5, 0xd1d7c0, 0.6);
          g.lineBetween(
            p.x - Math.cos(a) * 22,
            p.y - 39 - Math.sin(a) * 5,
            p.x + Math.cos(a) * 22,
            p.y - 39 + Math.sin(a) * 5,
          );
        } else if (/PLANE|FIGHTER|BOMBER|INTERCEPTOR/.test(u.kind)) {
          g.lineStyle(1, 0xc1cdbe, 0.45);
          g.strokeEllipse(p.x + 19, p.y - 24, reduced ? 3 : 4 + Math.sin(time / 30) * 2, 15);
        }
      }
      if (isMoving) {
        for (let i = 0; i < 3; i++) {
          const phase = cyclePhase(time / 550 + i / 3);
          g.fillStyle(0xa89c78, (1 - phase) * 0.25);
          g.fillCircle(p.x - 15 - phase * 13, p.y + 8 + Math.sin(i) * 4, 2 + phase * 3);
        }
        if (profile.mechanical && !profile.flying) {
          g.lineStyle(1.2, 0x1d251c, 0.85);
          for (const x of [-12, 12]) {
            const a = time / 90;
            g.strokeCircle(p.x + x, p.y + 1, 3);
            g.lineBetween(
              p.x + x - 3 * Math.cos(a),
              p.y + 1 - 3 * Math.sin(a),
              p.x + x + 3 * Math.cos(a),
              p.y + 1 + 3 * Math.sin(a),
            );
          }
        }
      }
      const rank = veteranRank(u.victories);
      if (rank) {
        g.lineStyle(1.6, 0xe2ce92, 0.9);
        for (let i = 0; i < rank; i++) {
          g.beginPath();
          g.moveTo(p.x - 6, p.y - 51 - i * 4);
          g.lineTo(p.x, p.y - 47 - i * 4);
          g.lineTo(p.x + 6, p.y - 51 - i * 4);
          g.strokePath();
        }
      }
    }
}
