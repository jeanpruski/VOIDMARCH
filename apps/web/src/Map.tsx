import { unitStats } from '@voidmarch/game-rules';
import { worldEffects, type WorldEffect } from './world-effects';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { RULES, TERRAINS, UNITS, BUILDINGS, UNIT_PROFILES, isWall } from '@voidmarch/config';
import {
  chunkOf,
  disk,
  distance,
  findPath,
  hash,
  key,
  neighbors,
  wallBlocks,
  wallConnections,
} from '@voidmarch/game-rules';
import type { Hex, Unit, ViewTile, WorldView } from '@voidmarch/shared';
import { BUILDING_FRAMES, UNIT_FRAMES, miniatureTexture, miniatureFrame } from './ui';
import { normalizedAtlas, SPRITE_CELL, SPRITE_ATLASES } from './sprite-atlas';
import { api, notify, select, send, subscribe, useGame } from './store';
import { SIZE, Y_SCALE, hexToPixel, pixelToHex, cameraViewport } from './map-geometry';
import { wallCanvas, setWallMaterials } from './wall-art';
const points = (p: { x: number; y: number }, size = SIZE) =>
  Array.from(
    { length: 6 },
    (_, i) =>
      new Phaser.Geom.Point(
        p.x + Math.cos((Math.PI / 180) * (30 + 60 * i)) * size,
        p.y + Math.sin((Math.PI / 180) * (30 + 60 * i)) * size * Y_SCALE,
      ),
  );
// Preserve drawing layers at every world coordinate, including negative chunks.
const depth = (layer: number, y: number) => layer + Math.atan(y / 1000) * 100;
function color(hex: string) {
  return Number.parseInt(hex.slice(1), 16);
}
class WorldScene extends Phaser.Scene {
  private ground!: Phaser.GameObjects.Graphics;
  private details!: Phaser.GameObjects.Graphics;
  private territories!: Phaser.GameObjects.Graphics;
  private banners!: Phaser.GameObjects.Graphics;
  private highlights!: Phaser.GameObjects.Graphics;
  private pieces: Phaser.GameObjects.GameObject[] = [];
  private view?: WorldView;
  private tileMap = new Map<string, ViewTile>();
  private unsubscribe?: () => void;
  private down?: { x: number; y: number; scrollX: number; scrollY: number };
  private moved = false;
  private subscriptionKey = '';
  private lastDraw = 0;
  private previousUnits = new Map<string, { x: number; y: number }>();
  private panKey?: Phaser.Types.Input.Keyboard.CursorKeys;
  private centerSet = false;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private cameraSave?: ReturnType<typeof setTimeout>;
  constructor() {
    super('World');
  }
  preload() {
    this.load.image('wall-materials', '/assets/wall-materials.png');
    for (const name of Object.keys(SPRITE_ATLASES))
      this.load.image(`${name}-source`, `/assets/${name}.png`);
    this.load.spritesheet('terrain', '/assets/terrain.png', { frameWidth: 362, frameHeight: 362 });
  }
  create() {
    setWallMaterials(this.textures.get('wall-materials').getSourceImage() as HTMLImageElement);
    for (const name of Object.keys(SPRITE_ATLASES)) {
      const source = this.textures.get(`${name}-source`).getSourceImage() as HTMLImageElement;
      const texture = this.textures.addCanvas(name, normalizedAtlas(name, source))!;
      for (let frame = 0; frame < 24; frame++)
        texture.add(
          frame,
          0,
          (frame % 6) * SPRITE_CELL,
          Math.floor(frame / 6) * SPRITE_CELL,
          SPRITE_CELL,
          SPRITE_CELL,
        );
    }
    this.viewportWidth = this.scale.width;
    this.viewportHeight = this.scale.height;
    this.cameras.main.setBackgroundColor('#1d2723');
    this.cameras.main.setZoom(0.92);
    this.ground = this.add.graphics();
    this.details = this.add.graphics().setDepth(1);
    this.territories = this.add.graphics().setDepth(11000);
    this.banners = this.add.graphics().setDepth(13000);
    this.highlights = this.add.graphics().setDepth(15000);
    this.panKey = this.input.keyboard?.createCursorKeys();
    this.input.mouse?.disableContextMenu();
    this.unsubscribe = useGame.subscribe((s, previous) => {
      if (s.world !== previous.world && s.world) {
        this.view = s.world;
        this.tileMap = new Map(s.world.tiles.map((t) => [key(t), t]));
        if (!this.centerSet) {
          const target = {
            q: s.world.player.settings.lastCameraQ,
            r: s.world.player.settings.lastCameraR,
          };
          const p = hexToPixel(target);
          this.cameras.main.centerOn(p.x, p.y);
          this.centerSet = true;
        }
        this.renderMap();
        if (previous.world && !s.world.player.settings.reducedMotion)
          for (const effect of worldEffects(previous.world, s.world)) this.playEffect(effect);
      }
      if (
        s.selection !== previous.selection ||
        s.mode !== previous.mode ||
        s.hover !== previous.hover
      )
        this.highlight();
    });
    const current = useGame.getState().world;
    if (current) {
      this.view = current;
      this.tileMap = new Map(current.tiles.map((t) => [key(t), t]));
      const p = hexToPixel(current.player.capital);
      this.cameras.main.centerOn(p.x, p.y);
      this.centerSet = true;
      this.renderMap();
    }
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Phaser also forwards window events: HTML panels must never issue map orders.
      if (pointer.event.target !== this.game.canvas) return;
      this.down = {
        x: pointer.x,
        y: pointer.y,
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
      };
      this.moved = false;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const camera = this.cameras.main;
      if (this.down && pointer.isDown) {
        const dx = pointer.x - this.down.x,
          dy = pointer.y - this.down.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) {
          this.moved = true;
          camera.scrollX = this.down.scrollX - dx / camera.zoom;
          camera.scrollY = this.down.scrollY - dy / camera.zoom;
          if (this.time.now - this.lastDraw > 40) {
            this.renderMap();
            this.lastDraw = this.time.now;
          }
        }
      } else {
        if (pointer.event.target !== this.game.canvas) return;
        const p = camera.getWorldPoint(pointer.x, pointer.y),
          hex = pixelToHex(p.x, p.y);
        if (key(hex) !== key(useGame.getState().hover ?? { q: 1e8, r: 1e8 }))
          useGame.setState({ hover: hex });
      }
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (
        this.down &&
        !this.moved &&
        pointer.event.target === this.game.canvas &&
        !pointer.rightButtonReleased()
      ) {
        const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.click(pixelToHex(p.x, p.y));
      }
      this.down = undefined;
      this.subscribeVisible();
    });
    this.input.on('wheel', (_p: unknown, _g: unknown, _x: number, y: number) => {
      const camera = this.cameras.main;
      camera.setZoom(Phaser.Math.Clamp(camera.zoom - y * 0.001, 0.42, 1.6));
      this.renderMap();
      this.subscribeVisible();
    });
    this.scale.on('resize', () => {
      const c = this.cameras.main;
      c.centerOn(c.scrollX + this.viewportWidth / 2, c.scrollY + this.viewportHeight / 2);
      this.viewportWidth = this.scale.width;
      this.viewportHeight = this.scale.height;
      this.renderMap();
      this.subscribeVisible();
    });
    window.addEventListener('vm:camera', this.cameraCommand);
    window.addEventListener('vm:action', this.actionAnimation);
    this.events.once('shutdown', () => {
      this.unsubscribe?.();
      clearTimeout(this.cameraSave);
      window.removeEventListener('vm:camera', this.cameraCommand);
      window.removeEventListener('vm:action', this.actionAnimation);
    });
    this.time.delayedCall(200, () => this.subscribeVisible());
  }
  private cameraCommand = (event: Event) => {
    const p = (event as CustomEvent).detail,
      c = this.cameras.main;
    if (p.command === 'in') c.setZoom(Math.min(1.6, c.zoom + 0.15));
    else if (p.command === 'out') c.setZoom(Math.max(0.42, c.zoom - 0.15));
    else if (p.command === 'home' && this.view) {
      const h = hexToPixel(this.view.player.capital);
      c.centerOn(h.x, h.y);
    } else if (Number.isFinite(p.q)) {
      const h = hexToPixel(p);
      c.centerOn(h.x, h.y);
    }
    this.renderMap();
    this.subscribeVisible();
  };
  private activeEffects = 0;
  private playEffect(effect: WorldEffect) {
    if (this.activeEffects >= 24) return;
    const p = hexToPixel(effect);
    if (!this.cameras.main.worldView.contains(p.x, p.y)) return;
    this.activeEffects++;
    const group = this.add.container(p.x, p.y).setDepth(14500).setName(`effect:${effect.kind}`);
    const combat = effect.kind === 'combat',
      dust = effect.kind === 'build' || effect.kind === 'demolish';
    const ink = combat ? 0xe4a46e : dust ? 0xb0a18a : effect.kind === 'rare' ? 0xe0d69b : 0xa0d1ba;
    const ring = this.add.graphics();
    ring.lineStyle(combat ? 3 : 2, ink, 0.85);
    ring.strokeEllipse(0, 0, 32, 17);
    group.add(ring);
    this.tweens.add({ targets: ring, scale: combat ? 3 : 2.4, alpha: 0, duration: 650 });
    for (let i = 0; i < (combat || dust ? 14 : 9); i++) {
      const particle = this.add.graphics();
      const angle = (i / 14) * Math.PI * 2;
      const radius = 15 + Math.random() * 30;
      particle.fillStyle(ink, dust ? 0.35 : 0.8);
      if (dust) particle.fillCircle(0, 0, 5 + Math.random() * 5);
      else if (effect.kind === 'repair') {
        particle.fillRect(-1, -5, 2, 10);
        particle.fillRect(-5, -1, 10, 2);
      } else particle.fillCircle(0, 0, combat ? 2.5 : 2);
      group.add(particle);
      this.tweens.add({
        targets: particle,
        x: Math.cos(angle) * radius,
        y: dust || combat ? Math.sin(angle) * radius * 0.55 - 12 : -20 - radius,
        scale: dust ? 2.2 : 0.2,
        alpha: 0,
        duration: 650 + Math.random() * 350,
        delay: i * 12,
      });
    }
    this.time.delayedCall(1250, () => {
      group.destroy(true);
      this.activeEffects--;
    });
  }
  private actionAnimation = (event: Event) => {
    const type = (event as CustomEvent).detail.type;
    if (type === 'ATTACK' && !this.view?.player.settings.reducedMotion)
      this.cameras.main.shake(160, 0.0015);
  };
  private subscribeVisible() {
    clearTimeout(this.cameraSave);
    this.cameraSave = setTimeout(() => {
      const c = this.cameras.main,
        p = c.getWorldPoint(this.scale.width / 2, this.scale.height / 2),
        hex = pixelToHex(p.x, p.y);
      void api('/settings', { lastCameraQ: hex.q, lastCameraR: hex.r }, 'PATCH').catch(() => {});
    }, 1500);
    const c = this.cameras.main,
      center = c.getWorldPoint(this.scale.width / 2, this.scale.height / 2),
      middle = pixelToHex(center.x, center.y),
      radius = Math.min(
        27,
        Math.ceil(Math.max(this.scale.width / 100, this.scale.height / 75) / c.zoom) + 3,
      );
    const chunks = [
      ...new Map(
        disk(middle, radius).map((p) => {
          const chunk = chunkOf(p);
          return [key(chunk), chunk];
        }),
      ).values(),
    ].slice(0, 12);
    const k = JSON.stringify(chunks);
    if (k !== this.subscriptionKey) {
      this.subscriptionKey = k;
      subscribe(chunks);
    }
  }
  private getUnit() {
    const selection = useGame.getState().selection;
    return selection?.id ? this.view?.units.find((u) => u.id === selection.id) : undefined;
  }
  private path(u: Unit, p: Hex) {
    const blocked = new Set(this.view?.units.filter((x) => x.id !== u.id).map(key));
    for (const tile of this.view?.tiles ?? [])
      if (wallBlocks(tile.building, u.ownerId, u.kind)) blocked.add(key(tile));
    return findPath(
      u,
      p,
      (h) => {
        const t = this.tileMap.get(key(h));
        return t?.terrain ? { q: t.q, r: t.r, terrain: t.terrain, road: t.road } : undefined;
      },
      UNITS[u.kind].move +
        (UNIT_PROFILES[u.kind].mounted && this.view?.player.faction === 'IRON' ? 1 : 0),
      blocked,
      u.kind,
    );
  }
  private click(p: Hex) {
    if (!this.view) return;
    const state = useGame.getState(),
      tile = this.tileMap.get(key(p)),
      own = this.getUnit(),
      unit = this.view.units.find((u) => key(u) === key(p));
    if (state.mode === 'move' && own && own.ownerId === this.view.player.id) {
      const path = this.path(own, p);
      if (!path?.length) {
        notify(
          'Ce déplacement est impossible : rempart ennemi, terrain, distance ou unité sur le chemin.',
          true,
        );
        return;
      }
      void send({ type: 'MOVE', actorId: own.id, payload: { path } });
      return;
    }
    if (state.mode === 'attack' && own) {
      const target =
        wallBlocks(tile?.building, this.view.player.id, own.kind) &&
        !(unit && UNIT_PROFILES[unit.kind].flying)
          ? tile?.building
          : (unit ?? tile?.building);
      if (target && target.ownerId !== this.view.player.id)
        useGame.setState({ combatTarget: target.id });
      else notify('Sélectionnez une cible ennemie visible.', true);
      return;
    }
    if (tile?.visibility === 'UNKNOWN' || !tile) {
      useGame.setState({ selection: { kind: 'tile', ...p }, mode: 'inspect' });
      return;
    }
    if (unit) select({ kind: 'unit', id: unit.id, ...p });
    else if (tile.building) select({ kind: 'building', id: tile.building.id, ...p });
    else select({ kind: 'tile', ...p });
  }
  private renderMap() {
    if (!this.view) return;
    const world = this.view,
      g = this.ground,
      d = this.details;
    g.clear();
    d.clear();
    this.territories.clear();
    this.banners.clear();
    for (const piece of this.pieces) {
      this.tweens.killTweensOf(piece);
      piece.destroy();
    }
    this.pieces = [];
    const c = this.cameras.main,
      topLeft = c.getWorldPoint(-160, -160),
      bottomRight = c.getWorldPoint(this.scale.width + 160, this.scale.height + 160),
      visible = world.tiles
        .filter((t) => {
          const p = hexToPixel(t);
          return (
            p.x >= topLeft.x && p.x <= bottomRight.x && p.y >= topLeft.y && p.y <= bottomRight.y
          );
        })
        .sort((a, b) => a.r - b.r || a.q - b.q);
    const factionColor = (id?: string) =>
      color(
        id === world.player.id
          ? world.player.settings.bannerColor
          : (world.realms.find((r) => r.id === id)?.color ?? '#877d63'),
      );
    const drawBanner = (ownerId: string, x: number, y: number, alpha = 1) => {
      const g = this.banners;
      const square =
        (ownerId === world.player.id
          ? world.player.settings.bannerShape
          : world.realms.find((r) => r.id === ownerId)?.bannerShape) === 'square';
      const flag = square
        ? [
            { x, y },
            { x: x + 14, y },
            { x: x + 14, y: y + 10 },
            { x, y: y + 10 },
          ]
        : [
            { x, y },
            { x: x + 15, y: y + 5 },
            { x, y: y + 11 },
          ];
      g.lineStyle(4, 0x101814, 0.9 * alpha);
      g.lineBetween(x, y - 1, x, y + 22);
      g.lineStyle(1.5, 0xd6c9a5, alpha);
      g.lineBetween(x, y - 1, x, y + 22);
      g.fillStyle(factionColor(ownerId), alpha);
      g.fillPoints(flag, true);
      g.lineStyle(3, 0x101814, alpha);
      g.strokePoints(flag, true);
      g.lineStyle(0.8, 0xe0d7bd, 0.8 * alpha);
      g.strokePoints(flag, true);
    };
    for (const t of visible) {
      const p = hexToPixel(t),
        unknown = t.visibility === 'UNKNOWN',
        explored = t.visibility === 'EXPLORED',
        base = t.terrain ? TERRAINS[t.terrain].color : 0x25312c,
        n = hash(key(t));
      const tint = Phaser.Display.Color.IntegerToColor(base);
      if (explored) tint.darken(32);
      else if (unknown) tint.darken(12);
      else tint.lighten(n * 5);
      g.fillStyle(unknown ? 0x151f1b : 0x1b211b, 1);
      g.fillPoints(points({ x: p.x, y: p.y + 6 }), true);
      g.fillStyle(tint.color, 1);
      g.fillPoints(points(p, SIZE - 1), true);
      if (!unknown && t.ownerId) {
        const own = t.ownerId === world.player.id;
        g.fillStyle(factionColor(t.ownerId), explored ? 0.07 : own ? 0.3 : 0.18);
        g.fillPoints(points(p, SIZE - 1), true);
      }
      if (world.player.settings.grid || unknown) {
        g.lineStyle(0.7, unknown ? 0x3b4940 : 0x899079, unknown ? 0.2 : 0.22);
        g.strokePoints(points(p, SIZE - 1), true);
      }
      if (unknown) {
        if (n > 0.87) {
          d.fillStyle(0x9aa994, 0.07);
          d.fillCircle(p.x, p.y, 1);
        }
        continue;
      }
      for (let i = 0; i < 7; i++) {
        const rx = (hash(`${key(t)}x${i}`) - 0.5) * 60,
          ry = (hash(`${key(t)}y${i}`) - 0.5) * 40;
        d.fillStyle(n > 0.5 ? 0xabb495 : 0x19251c, explored ? 0.1 : 0.18);
        d.fillEllipse(p.x + rx, p.y + ry, 2 + n * 4, 1.4);
      }
      if (t.terrain === 'RIVER') {
        d.fillStyle(0x557477, explored ? 0.25 : 0.5);
        d.fillEllipse(p.x, p.y, 64, 36);
        d.lineStyle(1, 0x91aba0, 0.25);
        for (let i = 0; i < 3; i++)
          d.lineBetween(p.x - 20 + i * 4, p.y - 7 + i * 7, p.x + 10 + i * 4, p.y - 7 + i * 7);
      }
      if (!t.building && t.terrain !== 'ALIEN' && t.terrain !== 'RIVER') {
        const frame =
          t.terrain === 'FOREST'
            ? n > 0.5
              ? 0
              : 1
            : t.terrain === 'MOUNTAIN'
              ? 2
              : t.terrain === 'HILL'
                ? 3
                : t.terrain === 'RUINS'
                  ? n > 0.65
                    ? 8
                    : 4
                  : t.terrain === 'MARSH'
                    ? 5
                    : t.terrain === 'CORRUPTION'
                      ? 10
                      : 6;
        if (t.terrain !== 'PLAIN' || n > 0.82) {
          const size =
            t.terrain === 'MOUNTAIN'
              ? 104
              : t.terrain === 'FOREST'
                ? 84
                : t.terrain === 'PLAIN'
                  ? 52
                  : 78;
          const scenery = this.add
            .image(p.x, p.y - (t.terrain === 'MOUNTAIN' ? 18 : 10), 'terrain', frame)
            .setDisplaySize(size, size)
            .setDepth(depth(1000, p.y))
            .setAlpha(explored ? 0.42 : t.terrain === 'PLAIN' ? 0.48 : 0.95);
          if (explored) scenery.setTint(0x899082);
          this.pieces.push(scenery);
        }
      }
      if (t.terrain === 'RIVER')
        for (const near of neighbors(t)) {
          if (this.tileMap.get(key(near))?.terrain === 'RIVER') {
            const end = hexToPixel(near);
            d.lineStyle(22, 0x46686b, explored ? 0.3 : 0.7);
            d.lineBetween(p.x, p.y, (p.x + end.x) / 2, (p.y + end.y) / 2);
            d.lineStyle(1, 0x8ea69a, 0.2);
            d.lineBetween(p.x - 4, p.y, (p.x + end.x) / 2 - 4, (p.y + end.y) / 2);
          }
        }
      if (t.terrain === 'CORRUPTION') {
        d.lineStyle(1.5, 0x727a86, 0.3);
        d.lineBetween(p.x - 14, p.y + 8, p.x + 3, p.y - 5);
        d.lineBetween(p.x + 3, p.y - 5, p.x + 17, p.y);
      }
    }
    for (const t of visible.filter((t) => t.visibility !== 'UNKNOWN')) {
      const p = hexToPixel(t);
      if (t.road) {
        d.fillStyle(
          t.terrain === 'RIVER' ? 0xb4a07f : 0x9c8e72,
          t.visibility === 'EXPLORED' ? 0.3 : 0.85,
        );
        d.fillRoundedRect(p.x - 9, p.y - 3, 18, 6, 2);
        for (const n of neighbors(t)) {
          if (this.tileMap.get(key(n))?.road) {
            const end = hexToPixel(n);
            d.lineStyle(7, 0x242a22, 0.6);
            d.lineBetween(p.x, p.y, (p.x + end.x) / 2, (p.y + end.y) / 2);
            d.lineStyle(
              t.terrain === 'RIVER' ? 5 : 3.5,
              t.terrain === 'RIVER' ? 0x968269 : 0x93856a,
              t.visibility === 'EXPLORED' ? 0.25 : 0.65,
            );
            d.lineBetween(p.x, p.y, (p.x + end.x) / 2, (p.y + end.y) / 2);
          }
        }
      }
      if (t.ownerId) {
        const pts = points(p, SIZE - 1),
          own = t.ownerId === world.player.id,
          ink = factionColor(t.ownerId),
          opacity = t.visibility === 'EXPLORED' ? 0.35 : 1,
          borders = this.territories;
        drawBanner(t.ownerId, p.x - 25, p.y + 4, opacity);
        // Keep ownership legible above tall terrain and buildings, even with the grid hidden.
        borders.lineStyle(4, 0x101814, 0.7 * opacity);
        borders.strokePoints(pts, true);
        borders.lineStyle(own ? 1.8 : 1.2, ink, 0.7 * opacity);
        borders.strokePoints(pts, true);
        neighbors(t).forEach((n, i) => {
          const nt = this.tileMap.get(key(n));
          if (nt?.ownerId !== t.ownerId) {
            const edge = (5 - i + 6) % 6;
            borders.lineStyle(own ? 6 : 4.5, 0x101814, 0.9 * opacity);
            borders.lineBetween(
              pts[edge].x,
              pts[edge].y,
              pts[(edge + 1) % 6].x,
              pts[(edge + 1) % 6].y,
            );
            borders.lineStyle(own ? 3.2 : 2.2, ink, opacity);
            borders.lineBetween(
              pts[edge].x,
              pts[edge].y,
              pts[(edge + 1) % 6].x,
              pts[(edge + 1) % 6].y,
            );
          }
        });
      }
      if (t.building) {
        const b = t.building,
          frame = b.kind === 'VILLAGE' ? Math.min(9, 6 + b.level) : BUILDING_FRAMES[b.kind],
          size = b.kind === 'VILLAGE' ? 105 : 78;
        if (isWall(b.kind)) {
          const connections = wallConnections(b, (p) => this.tileMap.get(key(p))?.building);
          const texture = `wall:${b.kind}:${connections}`;
          if (!this.textures.exists(texture))
            this.textures.addCanvas(texture, wallCanvas(b.kind, connections));
          const sprite = this.add
            .image(p.x, p.y, texture)
            .setDisplaySize(128, 128)
            .setOrigin(0.5, 152 / 256)
            .setDepth(depth(5000, p.y))
            .setName(`wall:${b.id}`);
          if (t.visibility === 'EXPLORED') sprite.setTint(0x777f75).setAlpha(0.7);
          this.pieces.push(sprite);
          if (t.visibility === 'VISIBLE')
            this.healthBar(b.id, p.x, p.y, b.hp, BUILDINGS[b.kind].hp, -55);
          continue;
        }
        const sprite = this.add
          .image(p.x, p.y - 17, miniatureTexture(frame), miniatureFrame(frame))
          .setDisplaySize(size, size)
          .setDepth(depth(5000, p.y));
        if (t.visibility === 'EXPLORED') sprite.setTint(0x777f75).setAlpha(0.7);
        this.pieces.push(sprite);
        if (t.visibility === 'VISIBLE')
          this.healthBar(b.id, p.x, p.y, b.hp, BUILDINGS[b.kind].hp * b.level, -size / 2 - 26);
        if (b.kind === 'VILLAGE') {
          const label = this.add
            .text(p.x, p.y + 28, b.level >= 3 ? 'CITADELLE' : b.level === 2 ? 'BOURG' : 'VILLAGE', {
              fontFamily: 'Georgia',
              fontSize: '9px',
              color: '#dbd2b6',
              backgroundColor: '#20271fee',
              padding: { x: 8, y: 4 },
              letterSpacing: 2,
            })
            .setOrigin(0.5)
            .setDepth(depth(9000, p.y));
          this.pieces.push(label);
        }
      } else if (t.terrain === 'ALIEN') {
        const sprite = this.add
          .image(p.x, p.y - 19, 'miniatures', 19)
          .setDisplaySize(94, 94)
          .setAlpha(t.visibility === 'EXPLORED' ? 0.45 : 1)
          .setDepth(depth(5000, p.y));
        this.pieces.push(sprite);
        d.fillStyle(0x7ad0c5, 0.08);
        d.fillEllipse(p.x, p.y, 60, 24);
      }
      if (t.capture) {
        const txt = this.add
          .text(p.x, p.y + 20, `⚑ ${t.capture.points}`, {
            fontSize: '12px',
            color: '#ddc994',
            backgroundColor: '#19221c',
          })
          .setOrigin(0.5)
          .setDepth(12000);
        this.pieces.push(txt);
      }
    }
    for (const u of world.units) {
      const p = hexToPixel(u);
      if (p.x < topLeft.x || p.x > bottomRight.x || p.y < topLeft.y || p.y > bottomRight.y)
        continue;
      const old = this.previousUnits.get(u.id),
        selected = useGame.getState().selection?.id === u.id;
      d.fillStyle(0x080b08, 0.45);
      d.fillEllipse(p.x, p.y + 10, 32, 13);
      d.lineStyle(1.5, factionColor(u.ownerId), 0.95);
      d.strokeEllipse(p.x, p.y + 10, 34, 13);
      const sprite = this.add
        .image(
          old?.x ?? p.x,
          (old?.y ?? p.y) - 20,
          miniatureTexture(UNIT_FRAMES[u.kind]),
          miniatureFrame(UNIT_FRAMES[u.kind]),
        )
        .setDisplaySize(
          UNIT_PROFILES[u.kind].siege ? 75 : 67,
          UNIT_PROFILES[u.kind].siege ? 75 : 67,
        )
        .setDepth(depth(UNIT_PROFILES[u.kind].flying ? 8500 : 7000, p.y));
      if (u.ownerId !== world.player.id)
        sprite.setTint(
          world.realms.find((r) => r.id === u.ownerId)?.faction === 'MASK' ? 0xc0d2c0 : 0xcebdbe,
        );
      this.pieces.push(sprite);
      if (u.rareBonus) {
        const aura = this.add
          .graphics({ x: p.x, y: p.y + 8 })
          .setDepth(depth(6500, p.y))
          .setName(`rare-aura:${u.id}`);
        aura.fillStyle(0x9fd9c6, 0.12);
        aura.fillEllipse(0, 0, 57, 29);
        aura.lineStyle(2, 0xded6a2, 0.85);
        aura.strokeEllipse(0, 0, 42, 20);
        aura.lineStyle(1, 0xa7e0cd, 0.5);
        aura.strokeEllipse(0, 0, 54, 27);
        const star = this.add
          .text(p.x - 20, p.y - 39, '✦', {
            fontSize: '17px',
            color: '#e4e2b6',
            stroke: '#12231f',
            strokeThickness: 3,
          })
          .setDepth(13500);
        this.pieces.push(aura, star);
        if (!world.player.settings.reducedMotion)
          this.tweens.add({
            targets: aura,
            alpha: 0.5,
            scaleX: 1.1,
            scaleY: 1.1,
            yoyo: true,
            repeat: -1,
            duration: 1300,
          });
      }
      const health = this.healthBar(u.id, sprite.x, sprite.y, u.hp, unitStats(u).hp, 39);
      if (old && (old.x !== p.x || old.y !== p.y) && !world.player.settings.reducedMotion)
        this.tweens.add({
          targets: health ? [sprite, health] : sprite,
          x: p.x,
          y: p.y - 20,
          duration: 380,
          ease: 'Sine.easeInOut',
        });
      this.previousUnits.set(u.id, p);
      drawBanner(u.ownerId, p.x + 20, p.y - 26);
    }
    for (const event of world.events) {
      const t = this.tileMap.get(key(event));
      if (t?.visibility !== 'VISIBLE' || event.claimedBy) continue;
      const p = hexToPixel(event);
      if (event.kind !== 'MONOLITH') {
        const frame =
          event.kind === 'PORTAL'
            ? 23
            : event.kind === 'METEOR'
              ? 20
              : event.kind === 'ROYAL_CARAVAN'
                ? 22
                : event.kind === 'COLOSSUS'
                  ? 21
                  : 19;
        const sprite = this.add
          .image(p.x, p.y - 14, 'miniatures', frame)
          .setDisplaySize(
            event.kind === 'COLOSSUS' ? 135 : 84,
            event.kind === 'COLOSSUS' ? 135 : 84,
          )
          .setDepth(depth(5000, p.y));
        this.pieces.push(sprite);
      }
      const label = this.add
        .text(p.x, p.y + 32, '◇ ' + event.title.toUpperCase(), {
          fontFamily: 'Georgia',
          fontSize: '8px',
          color: '#a0c4bd',
          backgroundColor: '#182521',
          padding: { x: 5, y: 4 },
          letterSpacing: 1,
        })
        .setOrigin(0.5)
        .setDepth(depth(9500, p.y));
      this.pieces.push(label);
    }
    for (const caravan of world.caravans) {
      const p = hexToPixel(caravan),
        sprite = this.add
          .image(p.x, p.y - 10, 'miniatures', 22)
          .setDisplaySize(58, 58)
          .setDepth(depth(7000, p.y));
      this.pieces.push(sprite);
    }
    this.highlight();
  }
  private healthBar(id: string, x: number, y: number, hp: number, max: number, offset: number) {
    if (hp >= max || max <= 0) return undefined;
    const ratio = Phaser.Math.Clamp(hp / max, 0, 1),
      g = this.add.graphics({ x, y }).setDepth(14000).setName(`health:${id}`);
    g.fillStyle(0x101713, 1);
    g.fillRoundedRect(-20, offset - 1, 40, 7, 2);
    g.fillStyle(ratio > 0.6 ? 0x96b47e : ratio > 0.3 ? 0xd5ac5b : 0xc56756, 1);
    g.fillRoundedRect(-19, offset, 38 * ratio, 5, 1);
    g.lineStyle(0.7, 0xc7b78b, 0.65);
    g.strokeRoundedRect(-20, offset - 1, 40, 7, 2);
    this.pieces.push(g);
    return g;
  }
  private highlight() {
    if (!this.highlights || !this.view) return;
    const g = this.highlights;
    g.clear();
    const state = useGame.getState(),
      selection = state.selection,
      u = this.getUnit();
    if (
      state.mode === 'inspect' &&
      u?.ownerId === this.view.player.id &&
      UNIT_PROFILES[u.kind].builder
    ) {
      const buildings = this.view.tiles.filter((t) => t.building?.ownerId === this.view!.player.id);
      for (const t of this.view.tiles) {
        if (
          t.visibility !== 'VISIBLE' ||
          t.building ||
          (t.ownerId && t.ownerId !== u.ownerId) ||
          distance(u, t) > 1
        )
          continue;
        if (
          t.ownerId !== u.ownerId &&
          !buildings.some((b) => distance(b, t) <= RULES.constructionRadius)
        )
          continue;
        if (
          this.view.units.some((enemy) => enemy.ownerId !== u.ownerId && distance(enemy, t) === 0)
        )
          continue;
        const p = hexToPixel(t);
        g.fillStyle(0x99c781, 0.12);
        g.fillPoints(points(p, SIZE - 3), true);
        g.lineStyle(2, 0x99c781, 0.8);
        g.strokePoints(points(p, SIZE - 3), true);
      }
    }
    if (state.mode === 'move' && u && u.ownerId === this.view.player.id) {
      for (const p of disk(u, UNITS[u.kind].move)) {
        if (distance(u, p) === 0 || !this.path(u, p)) continue;
        const px = hexToPixel(p);
        g.fillStyle(0x86bcb4, 0.1);
        g.fillPoints(points(px, SIZE - 3), true);
        g.lineStyle(1, 0x8fb9ae, 0.35);
        g.strokePoints(points(px, SIZE - 3), true);
      }
    }
    if (selection) {
      const location = u ?? selection,
        p = hexToPixel(location);
      g.lineStyle(3, 0xf2e6bc, 1);
      g.strokePoints(points(p, SIZE - 5), true);
      g.lineStyle(7, 0xcdb775, 0.1);
      g.strokePoints(points(p, SIZE - 2), true);
    }
    if (state.hover) {
      const p = hexToPixel(state.hover);
      g.lineStyle(1.2, state.mode === 'attack' ? 0xbc6962 : 0xc5c7ac, 0.7);
      g.strokePoints(points(p, SIZE - 2), true);
      if (state.mode === 'move' && u) {
        const path = this.path(u, state.hover);
        if (path) {
          let prev = hexToPixel(u);
          for (const step of path) {
            const px = hexToPixel(step);
            g.lineStyle(2, 0xa0c5bb, 0.7);
            g.lineBetween(prev.x, prev.y, px.x, px.y);
            g.fillStyle(0xc5ddd0, 0.8);
            g.fillCircle(px.x, px.y, 3);
            prev = px;
          }
        }
      }
    }
  }
  private publishCamera() {
    const c = this.cameras.main;
    const next = cameraViewport(c.scrollX, c.scrollY, c.width, c.height, c.zoom);
    const previous = useGame.getState().cameraViewport;
    if (
      !previous ||
      Object.keys(next).some(
        (k) => Math.abs(next[k as keyof typeof next] - previous[k as keyof typeof next]) > 0.01,
      )
    )
      useGame.setState({ cameraViewport: next });
  }
  update(_time: number, delta: number) {
    const c = this.cameras.main,
      keys = this.panKey;
    if (keys && (keys.left.isDown || keys.right.isDown || keys.up.isDown || keys.down.isDown)) {
      const speed = (delta * 0.5 * (this.view?.player.settings.cameraSpeed ?? 1)) / c.zoom;
      c.scrollX += (keys.right.isDown ? speed : 0) - (keys.left.isDown ? speed : 0);
      c.scrollY += (keys.down.isDown ? speed : 0) - (keys.up.isDown ? speed : 0);
      this.renderMap();
      this.subscribeVisible();
    }
    if (this.view?.player.settings.edgeScrolling && !this.down) {
      const p = this.input.activePointer;
      if (
        p.event?.target === this.game.canvas &&
        p.x >= 0 &&
        p.y >= 0 &&
        p.x < this.scale.width &&
        p.y < this.scale.height
      ) {
        const speed = delta * 0.3;
        if (p.x < 15) c.scrollX -= speed;
        else if (p.x > this.scale.width - 15) c.scrollX += speed;
        if (p.y < 15) c.scrollY -= speed;
        else if (p.y > this.scale.height - 15) c.scrollY += speed;
        if (p.x < 15 || p.x > this.scale.width - 15 || p.y < 15 || p.y > this.scale.height - 15) {
          this.renderMap();
          this.subscribeVisible();
        }
      }
    }
    this.publishCamera();
  }
}
export function GameMap() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    // Each mount owns its container. Phaser destroys asynchronously, whereas React
    // StrictMode immediately mounts again; an old canvas must not shift the new one.
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.inset = '0';
    host.current.append(container);
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: container,
      backgroundColor: '#1d2723',
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: host.current.clientWidth,
        height: host.current.clientHeight,
      },
      render: { antialias: true, pixelArt: false },
      scene: WorldScene,
      audio: { noAudio: true },
      input: { activePointers: 2 },
    });
    const resizeObserver = new ResizeObserver(() => {
      if (host.current && game.isBooted)
        game.scale.setParentSize(host.current.clientWidth, host.current.clientHeight);
    });
    resizeObserver.observe(host.current);
    return () => {
      resizeObserver.disconnect();
      container.remove();
      game.destroy(true);
    };
  }, []);
  return (
    <div
      className="game-canvas"
      ref={host}
      role="application"
      aria-label="Carte hexagonale des Marches. Sélectionnez une unité, puis Déplacer. Flèches pour déplacer la caméra, molette pour zoomer."
    />
  );
}
