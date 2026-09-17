import {
  HERO_SHEETS,
  loadHeroSheet,
  heroArtKey,
  heroCanvas,
  heroStarPoints,
  type HeroVisualPart,
} from './hero-art';
import { unitStats, turretStats, attackStats } from '@voidmarch/game-rules';
import { worldEffects, type WorldEffect } from './world-effects';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import {
  RULES,
  TERRAINS,
  UNITS,
  BUILDINGS,
  UNIT_PROFILES,
  isWall,
  WALL_HEIGHTS,
} from '@voidmarch/config';
import {
  disk,
  distance,
  findPath,
  roadPaths,
  roadPathTo,
  hash,
  key,
  neighbors,
  wallBlocks,
  wallConnections,
} from '@voidmarch/game-rules';
import type { Hex, Unit, ViewTile, WorldView } from '@voidmarch/shared';
import { BUILDING_FRAMES, UNIT_FRAMES, unitFrame, miniatureTexture, miniatureFrame } from './ui';
import { normalizedAtlas, SPRITE_CELL, SPRITE_ATLASES } from './sprite-atlas';
import { api, notify, select, send, subscribe, useGame } from './store';
import {
  SIZE,
  Y_SCALE,
  hexToPixel,
  pixelToHex,
  cameraViewport,
  MAP_ZOOM,
  viewportChunks,
} from './map-geometry';
import { wallCanvas, setWallMaterials } from './wall-art';
import { roadOrderReason } from './roads';
import { terraformOrderReason } from './terraform';
import { roadCanvas } from './road-art';
import { movementPosition } from './movement-animation';
import { projectileProfile, type ProjectileProfile } from './projectile-profile';
import { animateProjectile } from './projectile-animation';
import { drawPending } from './pending-art';
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
  private grid!: Phaser.GameObjects.Graphics;
  private territories!: Phaser.GameObjects.Graphics;
  private banners!: Phaser.GameObjects.Graphics;
  private highlights!: Phaser.GameObjects.Graphics;
  private pendingMarker!: Phaser.GameObjects.Graphics;
  private pendingLabel!: Phaser.GameObjects.Text;
  private pieces: Phaser.GameObjects.GameObject[] = [];
  private view?: WorldView;
  private tileMap = new Map<string, ViewTile>();
  private unsubscribe?: () => void;
  private down?: { x: number; y: number; scrollX: number; scrollY: number };
  private moved = false;
  private subscriptionKey = '';
  private lastDraw = 0;
  private unitVisuals = new Map<
    string,
    {
      unit: Unit;
      parts: {
        object: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | Phaser.GameObjects.Text;
        x: number;
        y: number;
        layer: number;
      }[];
    }
  >();
  private panKey?: Phaser.Types.Input.Keyboard.CursorKeys;
  private centerSet = false;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private cameraSave?: ReturnType<typeof setTimeout>;
  private roadCache?: {
    world: WorldView;
    unitId: string;
    paths: Map<string, Hex | null>;
    blocked: Set<string>;
  };
  constructor() {
    super('World');
  }
  preload() {
    for (const name of Object.values(HERO_SHEETS)) this.load.image(name, `/assets/${name}.png`);
    this.load.image('wall-materials', '/assets/wall-materials.png');
    for (const name of Object.keys(SPRITE_ATLASES))
      this.load.image(`${name}-source`, `/assets/${name}.png`);
    this.load.spritesheet('terrain', '/assets/terrain.png', { frameWidth: 362, frameHeight: 362 });
  }
  create() {
    // Register cleanup before the first render, including when initialization fails.
    const cleanup = () => {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      for (const cancel of this.projectiles.values()) cancel();
      clearTimeout(this.cameraSave);
      window.removeEventListener('vm:camera', this.cameraCommand);
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);
    for (const [part, name] of Object.entries(HERO_SHEETS))
      loadHeroSheet(
        part as HeroVisualPart,
        this.textures.get(name).getSourceImage() as HTMLImageElement,
      );
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
    // Keep the optional grid above scenery and roads, below buildings and units.
    this.grid = this.add.graphics().setName('hex-grid').setDepth(2500);
    this.territories = this.add.graphics().setDepth(11000);
    this.banners = this.add.graphics().setDepth(13000);
    this.highlights = this.add.graphics().setDepth(15000);
    this.pendingMarker = this.add
      .graphics()
      .setDepth(17000)
      .setName('pending-site')
      .setVisible(false);
    this.pendingLabel = this.add
      .text(0, 0, '', {
        fontFamily: 'Georgia',
        fontSize: '11px',
        color: '#ffe0a1',
        backgroundColor: '#19231ef2',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(17001)
      .setName('pending-site-label')
      .setVisible(false);
    this.panKey = this.input.keyboard?.createCursorKeys();
    this.input.mouse?.disableContextMenu();
    this.unsubscribe = useGame.subscribe((s, previous) => {
      if (!this.sys.isActive() || !this.cameras.main) return;
      if (previous.actionEffect && !s.actionEffect)
        this.projectiles.get(previous.actionEffect.actionId)?.();
      if (s.world?.player.settings.reducedMotion)
        for (const cancel of this.projectiles.values()) cancel();
      if (
        s.actionEffect &&
        s.actionEffect !== previous.actionEffect &&
        !s.world?.player.settings.reducedMotion
      )
        this.playEffect(s.actionEffect);
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
        if (previous.world && !s.world.player.settings.reducedMotion && s.effectPolicy !== 'none')
          for (const effect of worldEffects(previous.world, s.world))
            if (
              s.effectPolicy !== 'confirmed' ||
              effect.kind === 'rare' ||
              (effect.shot &&
                previous.actionEffect?.shot &&
                key(effect.shot.from) !== key(previous.actionEffect.shot.from))
            )
              this.playEffect(effect);
      } else if (
        s.movements !== previous.movements ||
        s.pendingMovement !== previous.pendingMovement
      ) {
        this.renderMap();
      }
      if (
        s.selection !== previous.selection ||
        s.mode !== previous.mode ||
        s.roadTool !== previous.roadTool ||
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
      camera.setZoom(
        Phaser.Math.Clamp(camera.zoom * Math.exp(-y * 0.001), MAP_ZOOM.min, MAP_ZOOM.max),
      );
      this.renderMap();
      this.subscribeVisible();
    });
    const resize = () => {
      const c = this.cameras.main;
      if (!this.sys.isActive() || !c) return;
      c.centerOn(c.scrollX + this.viewportWidth / 2, c.scrollY + this.viewportHeight / 2);
      this.viewportWidth = this.scale.width;
      this.viewportHeight = this.scale.height;
      this.renderMap();
      this.subscribeVisible();
    };
    this.scale.on('resize', resize);
    this.events.once('shutdown', () => this.scale.off('resize', resize));
    this.events.once('destroy', () => this.scale.off('resize', resize));
    window.addEventListener('vm:camera', this.cameraCommand);
    this.time.delayedCall(200, () => this.subscribeVisible());
  }
  private cameraCommand = (event: Event) => {
    const p = (event as CustomEvent).detail,
      c = this.cameras.main;
    if (!c) return;
    if (p.command === 'in') c.setZoom(Math.min(MAP_ZOOM.max, c.zoom * MAP_ZOOM.step));
    else if (p.command === 'out') c.setZoom(Math.max(MAP_ZOOM.min, c.zoom / MAP_ZOOM.step));
    else if (p.command === 'home' && this.view) {
      const h = hexToPixel(this.view.player.capital);
      c.centerOn(h.x, h.y);
    } else if (Number.isFinite(p.q)) {
      const h = hexToPixel(p);
      // Hero controls can occupy the bottom half on phones; keep the figurine above them.
      c.centerOn(h.x, h.y + (p.abovePanel ? (c.height * 0.23) / c.zoom : 0));
    }
    this.renderMap();
    this.subscribeVisible();
  };
  private activeEffects = 0;
  private projectiles = new Map<string, () => void>();
  private playEffect(effect: WorldEffect) {
    const shot = effect.shot;
    const profile = shot && projectileProfile(shot.unitKind, shot.targetAirborne);
    if (effect.kind !== 'combat' || !shot || !profile || key(shot.from) === key(effect)) {
      this.playImpact(effect);
      return;
    }
    if (this.activeEffects >= 24) return;
    const from = hexToPixel(shot.from),
      to = hexToPixel(effect);
    const viewport = this.cameras.main.worldView;
    if (!viewport.contains(from.x, from.y) && !viewport.contains(to.x, to.y)) return;
    from.y -= shot.wallKind
      ? WALL_HEIGHTS[shot.wallKind] + 14
      : UNIT_PROFILES[shot.unitKind].flying
        ? 36
        : 20;
    to.y -= shot.targetAirborne ? 36 : 20;
    const id = effect.actionId ?? crypto.randomUUID();
    this.activeEffects++;
    const complete = () => {
      this.projectiles.delete(id);
      this.activeEffects--;
    };
    const cancel = animateProjectile(this, from, to, profile, () => {
      complete();
      if (!this.view?.player.settings.reducedMotion) this.playImpact(effect, profile);
    });
    this.projectiles.set(id, () => {
      cancel();
      complete();
    });
  }
  private playImpact(effect: WorldEffect, projectile?: ProjectileProfile) {
    if (this.activeEffects >= 24) return;
    const p = hexToPixel(effect);
    if (!this.cameras.main.worldView.contains(p.x, p.y)) return;
    this.activeEffects++;
    const group = this.add.container(p.x, p.y).setDepth(14500).setName(`effect:${effect.kind}`);
    const combat = effect.kind === 'combat',
      dust = effect.kind === 'build' || effect.kind === 'demolish';
    const ink =
      projectile?.color ??
      (combat ? 0xe4a46e : dust ? 0xb0a18a : effect.kind === 'rare' ? 0xe0d69b : 0xa0d1ba);
    const heavy = projectile?.explosive ?? combat;
    if (combat && heavy && !this.view?.player.settings.reducedMotion)
      this.cameras.main.shake(140, 0.0012);
    if (combat) group.y -= effect.shot?.targetAirborne ? 36 : 20;
    const ring = this.add.graphics();
    ring.lineStyle(combat ? 3 : 2, ink, 0.85);
    ring.strokeEllipse(0, 0, heavy ? 32 : 14, heavy ? 17 : 8);
    group.add(ring);
    this.tweens.add({ targets: ring, scale: combat ? 3 : 2.4, alpha: 0, duration: 650 });
    for (let i = 0; i < (dust || heavy ? 14 : combat ? 6 : 9); i++) {
      const particle = this.add.graphics();
      const angle = (i / 14) * Math.PI * 2;
      const radius = combat && !heavy ? 5 + Math.random() * 12 : 15 + Math.random() * 30;
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
  private subscribeVisible() {
    clearTimeout(this.cameraSave);
    this.cameraSave = setTimeout(() => {
      const c = this.cameras.main,
        p = c.getWorldPoint(this.scale.width / 2, this.scale.height / 2),
        hex = pixelToHex(p.x, p.y);
      void api('/settings', { lastCameraQ: hex.q, lastCameraR: hex.r }, 'PATCH').catch(() => {});
    }, 1500);
    const c = this.cameras.main;
    const chunks = viewportChunks(cameraViewport(c.scrollX, c.scrollY, c.width, c.height, c.zoom));
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
  private getAttacker() {
    const selection = useGame.getState().selection;
    const building = selection?.id
      ? this.view?.tiles.find((t) => t.building?.id === selection.id)?.building
      : undefined;
    return this.getUnit() ?? (building && turretStats(building) ? building : undefined);
  }
  private visualPosition(u: Unit, now = Date.now()) {
    const state = useGame.getState();
    if (state.world?.player.settings.reducedMotion) return hexToPixel(u);
    const animation = state.movements[u.id];
    if (animation) return movementPosition(animation, now);
    return hexToPixel(state.pendingMovement?.unitId === u.id ? state.pendingMovement.from : u);
  }
  private updateUnitVisuals() {
    const now = Date.now();
    let selectedMoved = false;
    for (const { unit, parts } of this.unitVisuals.values()) {
      const p = this.visualPosition(unit, now);
      for (const part of parts) {
        if (part.object.x === p.x + part.x && part.object.y === p.y + part.y) continue;
        part.object.setPosition(p.x + part.x, p.y + part.y);
        part.object.setDepth(depth(part.layer, p.y));
        if (useGame.getState().selection?.id === unit.id) selectedMoved = true;
      }
    }
    if (selectedMoved) this.highlight();
  }
  private unitRoads(u: Unit) {
    if (this.roadCache?.world === this.view && this.roadCache?.unitId === u.id)
      return this.roadCache;
    const blocked = new Set(this.view?.units.filter((x) => x.id !== u.id).map(key));
    for (const tile of this.view?.tiles ?? [])
      if (wallBlocks(tile.building, u.ownerId, u.kind)) blocked.add(key(tile));
    this.roadCache = {
      world: this.view!,
      unitId: u.id,
      blocked,
      paths: roadPaths(u, this.tileMap, blocked, u.kind, u.ownerId),
    };
    return this.roadCache;
  }
  private roadPath(u: Unit, p: Hex) {
    const routes = this.unitRoads(u);
    return roadPathTo(p, routes.paths, routes.blocked);
  }
  private path(u: Unit, p: Hex) {
    const road = this.roadPath(u, p);
    if (road?.length) return road;
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
    if (state.mode === 'terraform') {
      if (state.pending || state.terraformTarget) return;
      const reason = terraformOrderReason(this.view, tile, own);
      if (reason) notify(reason, true);
      else useGame.setState({ terraformTarget: p });
      return;
    }
    if (state.mode === 'road') {
      if (state.pending) return;
      const reason = roadOrderReason(this.view, tile, state.roadTool);
      if (reason) {
        notify(reason, true);
        return;
      }
      useGame.setState({ hover: p });
      void send({
        type: state.roadTool === 'build' ? 'ROAD' : 'REMOVE_ROAD',
        actorId: this.view.player.id,
        payload: p,
      });
      return;
    }
    if (state.mode === 'move' && own && own.ownerId === this.view.player.id) {
      if (this.roadPath(own, p)?.length) {
        void send({ type: 'MOVE_ROAD', actorId: own.id, payload: p });
        return;
      }
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
    const attacker = this.getAttacker();
    if (state.mode === 'attack' && attacker) {
      if (tile?.visibility !== 'VISIBLE') {
        notify('Sélectionnez une cible ennemie visible.', true);
        return;
      }
      const target =
        unit?.ownerId !== this.view.player.id ? (unit ?? tile?.building) : tile?.building;
      if (target && target.ownerId !== this.view.player.id)
        useGame.setState({ combatTarget: target.id });
      else notify('Sélectionnez une cible ennemie visible.', true);
      return;
    }
    if (tile?.visibility === 'UNKNOWN' || !tile) {
      useGame.setState({ selection: { kind: 'tile', ...p }, mode: 'inspect' });
      return;
    }
    if (unit && tile.building && isWall(tile.building.kind) && state.selection?.id === unit.id)
      select({ kind: 'building', id: tile.building.id, ...p });
    else if (unit) select({ kind: 'unit', id: unit.id, ...p });
    else if (tile.building) select({ kind: 'building', id: tile.building.id, ...p });
    else select({ kind: 'tile', ...p });
  }
  private renderMap() {
    if (!this.view || !this.cameras.main) return;
    const world = this.view,
      g = this.ground,
      d = this.details;
    g.clear();
    d.clear();
    this.grid.clear();
    this.grid.setVisible(world.player.settings.grid);
    this.territories.clear();
    this.banners.clear();
    for (const piece of this.pieces) {
      this.tweens.killTweensOf(piece);
      piece.destroy();
    }
    this.pieces = [];
    this.unitVisuals.clear();
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
    const drawBanner = (
      ownerId: string,
      x: number,
      y: number,
      alpha = 1,
      target = this.banners,
    ) => {
      const g = target;
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
      if (world.player.settings.grid) {
        const outline = points(p);
        const width = 1.2 / this.cameras.main.zoom;
        this.grid.lineStyle(width + 1.5, 0x101814, unknown ? 0.3 : 0.6);
        this.grid.strokePoints(outline, true);
        this.grid.lineStyle(width, 0xc1cab0, unknown ? 0.2 : explored ? 0.4 : 0.65);
        this.grid.strokePoints(outline, true);
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
        const connections = neighbors(t).reduce(
          (mask, n, i) => (this.tileMap.get(key(n))?.road ? mask | (1 << i) : mask),
          0,
        );
        const bridge = t.terrain === 'RIVER',
          variation = Math.floor(hash(key(t)) * 4);
        const texture = `road:${connections}:${bridge}:${variation}`;
        if (!this.textures.exists(texture))
          this.textures.addCanvas(texture, roadCanvas(connections, bridge, variation));
        const road = this.add
          .image(p.x, p.y, texture)
          .setDisplaySize(128, 128)
          .setDepth(depth(2000, p.y))
          .setAlpha(t.visibility === 'EXPLORED' ? 0.4 : 1);
        this.pieces.push(road);
      }
      if (t.ownerId) {
        const pts = points(p),
          own = t.ownerId === world.player.id,
          ink = factionColor(t.ownerId),
          opacity = t.visibility === 'EXPLORED' ? 0.35 : 1,
          borders = this.territories;
        if (t.building) drawBanner(t.ownerId, p.x - 25, p.y + 4, opacity);
        // Outline the territory as a whole. Full-size vertices join adjacent
        // boundary segments without drawing seams between the realm's cells.
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
          const texture = `wall:${b.kind}:${connections}:${b.turretLevel ?? 0}`;
          if (!this.textures.exists(texture))
            this.textures.addCanvas(texture, wallCanvas(b.kind, connections, b.turretLevel));
          const sprite = this.add
            .image(p.x, p.y, texture)
            .setDisplaySize(128, 128)
            .setOrigin(0.5, 152 / 256)
            .setDepth(depth(5000, p.y))
            .setName(`wall:${b.id}`);
          if (t.visibility === 'EXPLORED') sprite.setTint(0x777f75).setAlpha(0.7);
          this.pieces.push(sprite);
          if (t.visibility === 'VISIBLE')
            this.healthBar(b.id, p.x, p.y, b.hp, BUILDINGS[b.kind].hp, b.turretLevel ? -75 : -55);
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
      const p = this.visualPosition(u);
      if (
        !useGame.getState().movements[u.id] &&
        (p.x < topLeft.x || p.x > bottomRight.x || p.y < topLeft.y || p.y > bottomRight.y)
      )
        continue;
      const origin = p;
      if (u.npc) {
        // A warm beacon distinguishes encounters from faction rings and rare-unit auras.
        const halo = this.add
          .graphics({ x: p.x, y: p.y + 9 })
          .setDepth(depth(6600, p.y))
          .setName(`npc-halo:${u.id}`);
        halo.fillStyle(0xffb642, 0.08);
        halo.fillEllipse(0, 0, 86, 43);
        halo.fillStyle(0xffc65c, 0.18);
        halo.fillEllipse(0, 0, 70, 34);
        halo.lineStyle(6, 0xffb642, 0.18);
        halo.strokeEllipse(0, 0, 63, 30);
        halo.lineStyle(2.4 / Math.min(1, this.cameras.main.zoom), 0xffd47b, 0.95);
        halo.strokeEllipse(0, 0, 63, 30);
        this.pieces.push(halo);
        if (!world.player.settings.reducedMotion)
          this.tweens.add({
            targets: halo,
            alpha: 0.6,
            duration: 1200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
          });
      }
      const parts: {
        object: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | Phaser.GameObjects.Text;
        x: number;
        y: number;
        layer: number;
      }[] = [];
      const large =
        UNIT_PROFILES[u.kind].siege ||
        UNIT_PROFILES[u.kind].mechanical ||
        UNIT_PROFILES[u.kind].flying;
      const markerWidth = large ? 60 : 52,
        markerHeight = large ? 23 : 20;
      // Ownership sits above scenery/buildings and outside the miniature's opaque base.
      // Every attachment follows the same point on the accepted route.
      const marker = this.add
        .graphics({ x: origin.x, y: origin.y - 20 })
        .setDepth(depth(6400, p.y))
        .setName(`unit-owner:${u.id}`);
      if (u.kind === 'HERO') {
        const star = heroStarPoints(0, 30, 72, 38);
        marker.fillStyle(0x080b08, 0.85);
        marker.fillPoints(star, true);
        marker.lineStyle(9, factionColor(u.ownerId), 0.22);
        marker.strokePoints(star, true);
        marker.lineStyle(6, 0x080b08, 0.95);
        marker.strokePoints(star, true);
        marker.fillStyle(factionColor(u.ownerId), 0.3);
        marker.fillPoints(star, true);
        marker.lineStyle(3, factionColor(u.ownerId), 1);
        marker.strokePoints(star, true);
      } else {
        marker.fillStyle(0x080b08, 0.45);
        marker.fillEllipse(0, 30, markerWidth, markerHeight);
        marker.lineStyle(4, 0x080b08, 0.85);
        marker.strokeEllipse(0, 30, markerWidth, markerHeight);
        marker.lineStyle(2, factionColor(u.ownerId), 1);
        marker.strokeEllipse(0, 30, markerWidth, markerHeight);
      }
      this.pieces.push(marker);
      parts.push({ object: marker, x: 0, y: -20, layer: 6400 });
      const heroTexture = u.hero ? `${heroArtKey(u.hero.appearance)}:map` : undefined;
      if (heroTexture && !this.textures.exists(heroTexture))
        this.textures.addCanvas(heroTexture, heroCanvas(u.hero!.appearance));
      const sprite = this.add
        .image(
          origin.x,
          origin.y - 20,
          heroTexture ?? miniatureTexture(unitFrame(u)),
          heroTexture ? undefined : miniatureFrame(unitFrame(u)),
        )
        .setDisplaySize(
          UNIT_PROFILES[u.kind].siege ? 75 : 67,
          UNIT_PROFILES[u.kind].siege ? 75 : 67,
        )
        .setDepth(depth(UNIT_PROFILES[u.kind].flying ? 8500 : 7000, p.y))
        .setName(`unit-sprite:${u.id}`);
      if (u.ownerId !== world.player.id && !u.npc)
        sprite.setTint(
          world.realms.find((r) => r.id === u.ownerId)?.faction === 'MASK' ? 0xc0d2c0 : 0xcebdbe,
        );
      this.pieces.push(sprite);
      parts.push({
        object: sprite,
        x: 0,
        y: -20,
        layer: UNIT_PROFILES[u.kind].flying ? 8500 : 7000,
      });
      if (u.hero) {
        const tag = this.add
          .text(p.x, p.y - 59, u.hero.name, {
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#e9ddac',
            backgroundColor: '#101914',
            stroke: '#101914',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setScale(1 / Math.min(1, this.cameras.main.zoom))
          .setDepth(depth(14500, p.y))
          .setName(`hero-name:${u.id}`);
        this.pieces.push(tag);
        parts.push({ object: tag, x: 0, y: -59, layer: 14500 });
      }
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
        parts.push(
          { object: aura, x: 0, y: 8, layer: 6500 },
          { object: star, x: -20, y: -39, layer: 13500 },
        );
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
      if (health) parts.push({ object: health, x: 0, y: -20, layer: 14000 });
      const banner = this.add
        .graphics({ x: p.x, y: p.y })
        .setDepth(depth(13000, p.y))
        .setName(`unit-banner:${u.id}`);
      if (!u.npc) drawBanner(u.ownerId, 20, -26, 1, banner);
      else {
        const tag = this.add
          .text(p.x, p.y - 55, '◆ PNJ', {
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#20190d',
            backgroundColor: '#f0c56c',
            padding: { x: 5, y: 3 },
          })
          .setOrigin(0.5)
          .setScale(Math.max(1, 1 / this.cameras.main.zoom))
          .setDepth(13500)
          .setName(`npc-tag:${u.id}`);
        this.pieces.push(tag);
      }
      this.pieces.push(banner);
      parts.push({ object: banner, x: 0, y: 0, layer: 13000 });
      this.unitVisuals.set(u.id, { unit: u, parts });
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
    const attacker = this.getAttacker();
    if (state.mode === 'attack' && attacker?.ownerId === this.view.player.id) {
      for (const t of this.view.tiles) {
        if (
          t.visibility !== 'VISIBLE' ||
          distance(attacker, t) > attackStats(attacker).range ||
          key(attacker) === key(t)
        )
          continue;
        const p = hexToPixel(t);
        g.fillStyle(0xc87f67, 0.12);
        g.fillPoints(points(p, SIZE - 3), true);
        g.lineStyle(1.5, 0xe5a782, 0.65);
        g.strokePoints(points(p, SIZE - 3), true);
      }
    }
    if (state.mode === 'terraform') {
      for (const t of this.view.tiles) {
        if (terraformOrderReason(this.view, t, u)) continue;
        const p = hexToPixel(t);
        g.fillStyle(0x8ad0b5, 0.25);
        g.fillPoints(points(p, SIZE - 3), true);
        g.lineStyle(3, 0xb8ecd0, 1);
        g.strokePoints(points(p, SIZE - 3), true);
      }
      if (state.hover) {
        const valid = !terraformOrderReason(this.view, this.tileMap.get(key(state.hover)), u);
        g.lineStyle(4, valid ? 0xf0d792 : 0xbc6962, 1);
        g.strokePoints(points(hexToPixel(state.hover), SIZE - 2), true);
      }
      return;
    }
    if (state.mode === 'road') {
      const tint = state.roadTool === 'build' ? 0x99c781 : 0xe08b78;
      for (const t of this.view.tiles) {
        if (roadOrderReason(this.view, t, state.roadTool)) continue;
        const p = hexToPixel(t);
        g.fillStyle(tint, 0.13);
        g.fillPoints(points(p, SIZE - 3), true);
        g.lineStyle(2, tint, 0.8);
        g.strokePoints(points(p, SIZE - 3), true);
      }
      if (state.hover) {
        const valid = !roadOrderReason(
          this.view,
          this.tileMap.get(key(state.hover)),
          state.roadTool,
        );
        g.lineStyle(3, valid ? tint : 0xbc6962, 1);
        g.strokePoints(points(hexToPixel(state.hover), SIZE - 2), true);
      }
      return;
    }
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
      const routes = this.unitRoads(u);
      const destinations = new Map(
        disk(
          u,
          UNITS[u.kind].move +
            (UNIT_PROFILES[u.kind].mounted && this.view.player.faction === 'IRON' ? 1 : 0),
        ).map((p) => [key(p), p]),
      );
      for (const t of this.view.tiles)
        if (routes.paths.has(key(t)) && !routes.blocked.has(key(t))) destinations.set(key(t), t);
      for (const p of destinations.values()) {
        const byRoad = routes.paths.has(key(p)) && !routes.blocked.has(key(p));
        if (distance(u, p) === 0 || (!byRoad && !this.path(u, p))) continue;
        const px = hexToPixel(p);
        g.fillStyle(0x79bdb2, 0.23);
        g.fillPoints(points(px, SIZE - 3), true);
        g.lineStyle(6, 0x101c1a, 0.8);
        g.strokePoints(points(px, SIZE - 3), true);
        g.lineStyle(2.5, 0xb8e8d5, 0.95);
        g.strokePoints(points(px, SIZE - 3), true);
      }
    }
    if (selection) {
      const p = u ? this.visualPosition(u) : hexToPixel(selection);
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
        if (path?.length) {
          g.fillStyle(0xe3be7e, 0.18);
          g.fillPoints(points(p, SIZE - 3), true);
          g.lineStyle(6, 0x1d2019, 0.9);
          g.strokePoints(points(p, SIZE - 3), true);
          g.lineStyle(3, 0xffdaa0, 1);
          g.strokePoints(points(p, SIZE - 3), true);
          let prev = hexToPixel(u);
          for (const step of path) {
            const px = hexToPixel(step);
            g.lineStyle(6, 0x17211c, 0.85);
            g.lineBetween(prev.x, prev.y, px.x, px.y);
            g.lineStyle(3, 0xf2ce8a, 1);
            g.lineBetween(prev.x, prev.y, px.x, px.y);
            g.fillStyle(0xffe2aa, 1);
            g.fillCircle(px.x, px.y, 3.5);
            prev = px;
          }
        } else if (distance(u, state.hover) > 0) {
          g.lineStyle(2, 0xd98576, 0.9);
          g.strokePoints(points(p, SIZE - 3), true);
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
  private updatePendingSite() {
    const state = useGame.getState(),
      action = state.pendingAction;
    const visible = !!(state.pending && action?.position);
    this.pendingMarker.setVisible(visible);
    this.pendingLabel.setVisible(visible);
    if (!visible || !action?.position) return;
    const unit = action.movingUnitId && this.view?.units.find((u) => u.id === action.movingUnitId);
    const p = unit ? this.visualPosition(unit) : hexToPixel(action.position);
    this.pendingMarker.setPosition(p.x, p.y);
    drawPending(
      this.pendingMarker,
      action.style,
      state.world?.player.settings.reducedMotion ? 0 : (this.time.now / 450) % (Math.PI * 2),
    );
    this.pendingLabel.setPosition(p.x, p.y - (action.style === 'construction' ? 66 : 52));
    this.pendingLabel.setText(`${action.label}…`);
  }
  update(_time: number, delta: number) {
    this.updateUnitVisuals();
    this.updatePendingSite();
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
      // Stop scene subscriptions synchronously; Phaser destroys the game next frame.
      for (const scene of game.scene.getScenes(false)) scene.scene.stop();
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
