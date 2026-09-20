import { SeasonBanner } from './Season';
import { buildingVisualLevel } from '@voidmarch/config';
import { drawIslandDiscoveries } from './island-art';
import { installMapPinch } from './map-pinch';
import { drawExpeditionSites, expeditionSceneryClearings } from './expedition-art';
import { isSea } from '@voidmarch/config';
import { drawCoastalTerrain, drawCoastalBlend, coastalField, type CoastalField } from './ocean-art';
import { eventAvailable } from './world-events';
import { RadiationOverlay } from './radiation-art';
import { bannerCanvas, realmBanner } from './banner-art';
import { movementBiome, unitMovementBudget } from '@voidmarch/game-rules';
import { BIOMES } from '@voidmarch/config';
import { biomeAppearance, blendedTerrainColor } from './biome-art';
import { TRANSPORTS } from '@voidmarch/config';
import { cargoUsed } from '@voidmarch/game-rules';
import { VictoryBanners } from './victory-animation';
import { groupMovementPreview, groupMovementRange } from './group-movement';
import { isBuilderSite } from './construction';
import { drawStrategicOperations, drawAmbient } from './strategy-art';
import { buildingAtlas, buildingTextureKey, buildingEvolutionFrame } from './building-art';
import { hasBuildingEvolutionArt, CITY_LEVELS } from '@voidmarch/config';
import {
  HERO_SHEETS,
  HERO_BASE_SPRITE,
  loadHeroBase,
  loadHeroSheet,
  heroArtKey,
  heroCanvas,
  type HeroVisualPart,
} from './hero-art';
import { unitStats, turretStats, attackStats } from '@voidmarch/game-rules';
import { worldEffects, type WorldEffect } from './world-effects';
import { combatDamage } from './combat-damage';
import { DamageNumbers } from './damage-numbers';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import Phaser from 'phaser';
import {
  RULES,
  UNITS,
  BUILDINGS,
  UNIT_PROFILES,
  isWall,
  buildingUpgrade,
  WALL_KINDS,
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
import { normalizedAtlas, SPRITE_CELL, SPRITE_ATLASES, spriteAssetUrl } from './sprite-atlas';
import { api, notify, select, toggleUnitSelection, send, subscribe, useGame } from './store';
import {
  SIZE,
  Y_SCALE,
  hexToPixel,
  pixelToHex,
  cameraViewport,
  MAP_ZOOM,
  viewportChunks,
} from './map-geometry';
import { wallCanvas, setWallMaterials, wallGateAxis } from './wall-art';
import { roadOrderReason } from './roads';
import { terraformOrderReason } from './terraform';
import { roadCanvas } from './road-art';
import { movementPosition } from './movement-animation';
import { projectileProfile, type ProjectileProfile } from './projectile-profile';
import { animateProjectile } from './projectile-animation';
import { drawPending } from './pending-art';
import {
  strategicAtZoom,
  strategicTiles,
  STRATEGIC_ZOOM,
  type StrategicTile,
} from './strategic-map';
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
  private radiation?: RadiationOverlay;
  private bannerDesigns = new Map<string, string>();
  private highlights!: Phaser.GameObjects.Graphics;
  private pendingMarker!: Phaser.GameObjects.Graphics;
  private pendingLabel!: Phaser.GameObjects.Text;
  private pieces: Phaser.GameObjects.GameObject[] = [];
  private view?: WorldView;
  private tileMap = new Map<string, ViewTile>();
  private coastCache?: { tiles: Map<string, ViewTile>; field: CoastalField };
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
  private panKey?: Pick<Phaser.Types.Input.Keyboard.CursorKeys, 'up' | 'down' | 'left' | 'right'>;
  private centerSet = false;
  private strategic = false;
  private strategicWorld?: WorldView;
  private strategicTiles: StrategicTile[] = [];
  private victoryBanners = new VictoryBanners(this, () => this.renderMap());
  private damageNumbers = new DamageNumbers(this);
  private impactGroups = new Set<Phaser.GameObjects.Container>();
  private viewportWidth = 0;
  private viewportHeight = 0;
  private cameraSave?: ReturnType<typeof setTimeout>;
  private roadCache?: {
    world: WorldView;
    unitId: string;
    paths: Map<string, Hex | null>;
    blocked: Set<string>;
  };
  private loadingBuildingArt = new Set<string>();
  constructor() {
    super('World');
  }
  private mapLoadFailed = false;
  preload() {
    this.mapLoadFailed = false;
    this.load.on('progress', (progress: number) => this.game.events.emit('map:progress', progress));
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.mapLoadFailed = true;
      this.game.events.emit(
        'map:load-error',
        'Une illustration n’a pas pu être chargée. Réessayez.',
      );
      console.error('VOIDMARCH : illustration inaccessible', file.key);
    });
    this.load.image(HERO_BASE_SPRITE, `/assets/${HERO_BASE_SPRITE}.png`);
    for (const name of Object.values(HERO_SHEETS)) this.load.image(name, `/assets/${name}.png`);
    this.load.image('wall-materials', '/assets/wall-materials.png');
    for (const name of Object.keys(SPRITE_ATLASES))
      this.load.image(`${name}-source`, spriteAssetUrl(name));
    this.load.spritesheet('terrain', '/assets/terrain.png', { frameWidth: 362, frameHeight: 362 });
  }
  create() {
    if (this.mapLoadFailed) return;
    try {
      this.createWorld();
      this.registry.set('map:prepared', true);
    } catch (error) {
      console.error('VOIDMARCH : échec de préparation de la carte', error);
      this.game.events.emit(
        'map:load-error',
        'La préparation du plateau a échoué. Réessayez ou rechargez le jeu.',
      );
    }
  }
  private createWorld() {
    // Register cleanup before the first render, including when initialization fails.
    const cleanup = () => {
      this.victoryBanners.clear();
      this.damageNumbers.clear();
      this.radiation?.destroy();
      this.radiation = undefined;
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      for (const cancel of this.projectiles.values()) cancel();
      clearTimeout(this.cameraSave);
      window.removeEventListener('vm:camera', this.cameraCommand);
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);
    loadHeroBase(this.textures.get(HERO_BASE_SPRITE).getSourceImage() as HTMLImageElement);
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
    // Ground overlays cover roads/scenery, but stay below every building and unit
    // (their lowest depth is 5000, with a bounded Y offset of less than 158).
    this.territories = this.add.graphics().setName('territory-borders').setDepth(3000);
    this.banners = this.add.graphics().setDepth(13000);
    this.ambient = this.add.graphics().setName('ambient-life').setDepth(9200);
    this.radiation = new RadiationOverlay(this);
    this.highlights = this.add.graphics().setName('hex-highlights').setDepth(3500);
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
    // createCursorKeys also captures Space/Shift, stealing confirmation keys from HTML dialogs.
    const keyboard = this.input.keyboard;
    if (keyboard)
      this.panKey = {
        up: keyboard.addKey('UP'),
        down: keyboard.addKey('DOWN'),
        left: keyboard.addKey('LEFT'),
        right: keyboard.addKey('RIGHT'),
      };
    this.input.mouse?.disableContextMenu();
    this.unsubscribe = useGame.subscribe((s, previous) => {
      if (!this.sys.isActive() || !this.cameras.main) return;
      if (previous.actionEffect && !s.actionEffect)
        this.projectiles.get(previous.actionEffect.actionId)?.();
      if (s.world?.player.settings.reducedMotion) this.victoryBanners.clear();
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
        if (previous.world)
          this.victoryBanners.show(previous.world, s.world, !this.strategic && s.showBuildings);
        // Journal damage is authoritative even when speculative effects are suppressed.
        if (previous.world)
          for (const hit of combatDamage(previous.world, s.world))
            this.damageNumbers.show(
              hit,
              s.world.player.id,
              s.world.player.settings.reducedMotion,
              !this.strategic && (hit.targetKind === 'unit' ? s.showUnits : s.showBuildings),
            );
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
        s.pendingMovement !== previous.pendingMovement ||
        s.showUnits !== previous.showUnits ||
        s.showBuildings !== previous.showBuildings
      ) {
        if (s.showUnits !== previous.showUnits || s.showBuildings !== previous.showBuildings) {
          this.victoryBanners.clear();
          this.damageNumbers.clear();
          for (const cancel of [...this.projectiles.values()]) cancel();
          for (const group of this.impactGroups) {
            this.tweens.killTweensOf(group.list);
            group.destroy(true);
          }
          this.impactGroups.clear();
        }
        this.renderMap();
      }
      if (
        s.world === previous.world &&
        s.world &&
        s.now !== previous.now &&
        s.world.events.some(
          (event) =>
            eventAvailable(event, Math.max(s.world!.serverTimestamp, previous.now)) !==
            eventAvailable(event, Math.max(s.world!.serverTimestamp, s.now)),
        )
      )
        this.renderMap();
      if (
        s.constructionBuilderId !== previous.constructionBuilderId ||
        s.selection !== previous.selection ||
        s.selectedUnitIds !== previous.selectedUnitIds ||
        s.groupTarget !== previous.groupTarget ||
        s.groupFormation !== previous.groupFormation ||
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
    const pinch = installMapPinch(this.game.canvas, {
      camera: () => this.cameras.main,
      size: () => ({ width: this.scale.width, height: this.scale.height }),
      change: (next) => {
        const c = this.cameras.main;
        c.setZoom(next.zoom).setScroll(next.scrollX, next.scrollY);
      },
      cancelDrag: () => {
        this.down = undefined;
        this.moved = true;
      },
      redraw: () => {
        if (this.sys.isActive()) this.renderMap();
      },
      finish: () => {
        if (this.sys.isActive()) this.subscribeVisible();
      },
    });
    this.events.once('shutdown', () => pinch.destroy());
    this.events.once('destroy', () => pinch.destroy());
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pinch.capturing) return;
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
      if (pinch.capturing) return;
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
      if (pinch.capturing) return;
      if (
        this.down &&
        !this.moved &&
        pointer.event.target === this.game.canvas &&
        !pointer.rightButtonReleased()
      ) {
        const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.click(pixelToHex(p.x, p.y), !!(pointer.event as MouseEvent).shiftKey);
      }
      this.down = undefined;
      this.subscribeVisible();
    });
    // Listen on the canvas itself: prevent browser scrolling/pinch zoom before
    // Phaser processes the event, and normalize mice reporting lines or pages.
    // Trackpads can emit several events per frame; redraw the map only once.
    const canvas = this.game.canvas;
    let wheelDelta = 0,
      wheelFrame = 0;
    const wheel = (event: WheelEvent) => {
      if (!this.sys.isActive() || !this.cameras.main) return;
      const mode = event.deltaMode;
      const delta = event.deltaY * (mode === 1 ? 16 : mode === 2 ? canvas.clientHeight : 1);
      if (!Number.isFinite(delta) || delta === 0) return;
      event.preventDefault();
      wheelDelta += delta;
      if (wheelFrame) return;
      wheelFrame = requestAnimationFrame(() => {
        wheelFrame = 0;
        const amount = wheelDelta;
        wheelDelta = 0;
        const camera = this.cameras.main;
        if (!this.sys.isActive() || !camera) return;
        camera.setZoom(
          Phaser.Math.Clamp(camera.zoom * Math.exp(-amount * 0.001), MAP_ZOOM.min, MAP_ZOOM.max),
        );
        this.renderMap();
        this.subscribeVisible();
      });
    };
    canvas.addEventListener('wheel', wheel, { passive: false, capture: true });
    const removeWheel = () => {
      canvas.removeEventListener('wheel', wheel, true);
      cancelAnimationFrame(wheelFrame);
      wheelFrame = 0;
      wheelDelta = 0;
    };
    this.events.once('shutdown', removeWheel);
    this.events.once('destroy', removeWheel);
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
  private ambient!: Phaser.GameObjects.Graphics;
  private lastAmbientAt = 0;
  private lastGateAt = 0;
  private recoil = new Map<string, { at: number; x: number; y: number }>();
  private activeEffects = 0;
  private projectiles = new Map<string, () => void>();
  private playEffect(effect: WorldEffect) {
    if (this.strategic || !useGame.getState().showUnits || !useGame.getState().showBuildings)
      return;
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
    if (!this.view?.player.settings.reducedMotion) {
      const firing = this.view?.units.find((u) => key(u) === key(shot.from));
      const len = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
      if (firing)
        this.recoil.set(firing.id, {
          at: Date.now(),
          x: (-(to.x - from.x) / len) * 4,
          y: (-(to.y - from.y) / len) * 4,
        });
      if (profile.kind === 'bullet' || profile.kind === 'shell') {
        const casing = this.add.graphics({ x: from.x, y: from.y }).setDepth(14000);
        casing.fillStyle(0xd8b87b, 0.9);
        casing.fillRect(0, 0, 3, 1.5);
        this.tweens.add({
          targets: casing,
          x: from.x + 10,
          y: from.y + 9,
          rotation: 2,
          alpha: 0,
          duration: 500,
          onComplete: () => casing.destroy(),
        });
      }
    }
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
    if (
      this.strategic ||
      !useGame.getState().showUnits ||
      !useGame.getState().showBuildings ||
      this.activeEffects >= 24
    )
      return;
    const p = hexToPixel(effect);
    if (!this.cameras.main.worldView.contains(p.x, p.y)) return;
    this.activeEffects++;
    const group = this.add.container(p.x, p.y).setDepth(14500).setName(`effect:${effect.kind}`);
    this.impactGroups.add(group);
    const nuclear = effect.kind === 'nuclear';
    if (nuclear) group.setScale(1.5 * ((effect.radius ?? 2) + 1));
    const combat = effect.kind === 'combat' || nuclear,
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
      this.impactGroups.delete(group);
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
      if (!useGame.getState().world?.player.vigieTargetId)
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
    const { selection, showUnits } = useGame.getState();
    if (!showUnits) return undefined;
    return selection?.id ? this.view?.units.find((u) => u.id === selection.id) : undefined;
  }
  private getAttacker() {
    const { selection, showBuildings } = useGame.getState();
    const building =
      showBuildings && selection?.id
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
        const state = useGame.getState(),
          anim = state.movements[unit.id];
        const kick = this.recoil.get(unit.id),
          decay = kick ? Math.max(0, 1 - (now - kick.at) / 220) : 0;
        if (kick && !decay) this.recoil.delete(unit.id);
        const recoilX = part.object.name?.startsWith('unit-sprite:') ? (kick?.x ?? 0) * decay : 0,
          recoilY = part.object.name?.startsWith('unit-sprite:') ? (kick?.y ?? 0) * decay : 0;
        const bob =
          anim &&
          !state.world?.player.settings.reducedMotion &&
          part.object.name?.startsWith('unit-sprite:') &&
          !UNIT_PROFILES[unit.kind].mechanical
            ? Math.sin(now / 100) * 1.4
            : 0;
        if (
          part.object.x === p.x + part.x + recoilX &&
          part.object.y === p.y + part.y + bob + recoilY
        )
          continue;
        part.object.setPosition(p.x + part.x + recoilX, p.y + part.y + bob + recoilY);
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
      if (
        wallBlocks(tile.building, u.ownerId, u.kind, this.view?.strategy?.alliance?.members ?? [])
      )
        blocked.add(key(tile));
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
      if (
        wallBlocks(tile.building, u.ownerId, u.kind, this.view?.strategy?.alliance?.members ?? [])
      )
        blocked.add(key(tile));
    return findPath(
      u,
      p,
      (h) => {
        const t = this.tileMap.get(key(h));
        return t?.terrain ? { q: t.q, r: t.r, terrain: t.terrain, road: t.road } : undefined;
      },
      unitMovementBudget(
        u,
        movementBiome(this.view!.seed, this.tileMap.get(key(u))),
        this.view!.player.faction,
      ),
      blocked,
      u.kind,
    );
  }
  private click(p: Hex, additive = false) {
    if (!this.view) return;
    if (this.strategic) {
      const target = hexToPixel(p);
      this.cameras.main.setZoom(STRATEGIC_ZOOM.detail).centerOn(target.x, target.y);
      useGame.setState({ mode: 'inspect', combatTarget: null, hover: null });
      this.renderMap();
      this.subscribeVisible();
      return;
    }
    const state = useGame.getState(),
      tile = this.tileMap.get(key(p)),
      own = this.getUnit(),
      unit = state.showUnits ? this.view.units.find((u) => key(u) === key(p)) : undefined;
    if (
      (additive || state.multiSelect) &&
      unit?.ownerId === this.view.player.id &&
      !state.pending
    ) {
      toggleUnitSelection(unit.id);
      return;
    }
    if (state.mode === 'move' && state.selectedUnitIds.length > 1) {
      if (!state.pending) useGame.setState({ groupTarget: p });
      return;
    }
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
        unit?.ownerId !== this.view.player.id
          ? (unit ?? (state.showBuildings ? tile?.building : undefined))
          : state.showBuildings
            ? tile?.building
            : undefined;
      if (target && target.ownerId !== this.view.player.id)
        useGame.setState({ combatTarget: target.id });
      else notify('Sélectionnez une cible ennemie visible.', true);
      return;
    }
    if (tile?.visibility === 'UNKNOWN' || !tile) {
      select({ kind: 'tile', ...p });
      return;
    }
    // Keep the chosen builder while browsing its construction sites.
    const builder = this.view.units.find((u) => u.id === state.constructionBuilderId);
    if (
      state.mode === 'inspect' &&
      builder &&
      key(builder) !== key(p) &&
      isBuilderSite(this.view, builder, tile)
    ) {
      select({ kind: 'tile', ...p });
      return;
    }
    if (
      unit &&
      state.showBuildings &&
      tile.building &&
      isWall(tile.building.kind) &&
      state.selection?.id === unit.id
    )
      select({ kind: 'building', id: tile.building.id, ...p });
    else if (unit) select({ kind: 'unit', id: unit.id, ...p });
    else if (state.showBuildings && tile.building)
      select({ kind: 'building', id: tile.building.id, ...p });
    else select({ kind: 'tile', ...p });
  }
  private renderStrategicMap(world: WorldView) {
    if (this.strategicWorld !== world) {
      this.strategicWorld = world;
      this.strategicTiles = strategicTiles(world);
    }
    const c = this.cameras.main;
    const view = cameraViewport(c.scrollX, c.scrollY, c.width, c.height, c.zoom);
    const colors = new Map(world.realms.map((r) => [r.id, color(r.color)]));
    colors.set(world.player.id, color(world.player.settings.bannerColor));
    const names = new Map(world.realms.map((r) => [r.id, r.name]));
    names.set(world.player.id, world.player.name);
    const territories = new Map<string, { x: number; y: number }[]>();
    const fills = new Map<number, { x: number; y: number }[]>();
    const onScreen = (p: { x: number; y: number }, margin = 0) =>
      p.x >= view.x - margin &&
      p.x <= view.x + view.width + margin &&
      p.y >= view.y - margin &&
      p.y <= view.y + view.height + margin;
    for (const tile of this.strategicTiles) {
      const p = hexToPixel(tile);
      if (!onScreen(p, SIZE)) continue;
      const ink = isSea(tile.terrain)
        ? 0x182e3b
        : tile.ownerId
          ? (colors.get(tile.ownerId) ?? 0x877d63)
          : 0x29382f;
      const fill = fills.get(ink) ?? [];
      fill.push(p);
      fills.set(ink, fill);
      if (!tile.ownerId) continue;
      const group = territories.get(tile.ownerId) ?? [];
      group.push(p);
      territories.set(tile.ownerId, group);
      const vertices = points(p);
      this.territories.lineStyle(1.5 / c.zoom, 0x111b17, 1);
      for (const edge of tile.borders) {
        const a = vertices[edge],
          b = vertices[(edge + 1) % 6];
        this.territories.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    // Fill a union of hexagons in one operation per color: no internal seams,
    // even during the opacity transition, and fewer Canvas fill calls.
    for (const [ink, positions] of fills) {
      this.ground.fillStyle(ink, 1);
      this.ground.beginPath();
      for (const p of positions) {
        const vertices = points(p, SIZE + 0.35 / c.zoom);
        this.ground.moveTo(vertices[0].x, vertices[0].y);
        for (const v of vertices.slice(1)) this.ground.lineTo(v.x, v.y);
        this.ground.closePath();
      }
      this.ground.fillPath();
    }
    // Label only discovered territories. PublicRealm intentionally has no enemy
    // capital coordinates: never infer a capital or expose the secret radar here.
    const occupied: Phaser.Geom.Rectangle[] = [];
    const groups = [...territories].sort(([a, aa], [b, bb]) =>
      a === world.player.id ? -1 : b === world.player.id ? 1 : bb.length - aa.length,
    );
    for (const [id, positions] of groups) {
      const own = id === world.player.id;
      const capital = hexToPixel(world.player.capital);
      const showCapital = own && onScreen(capital);
      if (positions.length < 6 && !showCapital) continue;
      const center = positions.reduce((sum, p) => ({ x: sum.x + p.x, y: sum.y + p.y }), {
        x: 0,
        y: 0,
      });
      center.x /= positions.length;
      center.y /= positions.length;
      const nearest = positions.reduce((best, p) =>
        Phaser.Math.Distance.Between(p.x, p.y, center.x, center.y) <
        Phaser.Math.Distance.Between(best.x, best.y, center.x, center.y)
          ? p
          : best,
      );
      const anchor = showCapital ? capital : nearest;
      if (showCapital) {
        const radius = 5 / c.zoom;
        this.banners.fillStyle(0xf5efd7, 1);
        this.banners.lineStyle(2 / c.zoom, 0x111b17, 1);
        const diamond = [
          { x: anchor.x, y: anchor.y - radius },
          { x: anchor.x + radius, y: anchor.y },
          { x: anchor.x, y: anchor.y + radius },
          { x: anchor.x - radius, y: anchor.y },
        ];
        this.banners.fillPoints(diamond, true);
        this.banners.strokePoints(diamond, true);
      }
      const label = this.add
        .text(
          anchor.x,
          anchor.y + (showCapital ? 16 / c.zoom : 0),
          (names.get(id) ?? 'Territoire').slice(0, 32),
          {
            fontFamily: 'Georgia',
            fontSize: '12px',
            resolution: 2,
            color: '#f2edd9',
            backgroundColor: '#152019',
            padding: { x: 7, y: 4 },
          },
        )
        .setOrigin(0.5)
        .setScale(1 / c.zoom)
        .setDepth(13001)
        .setName(`strategic-label:${id}`);
      const bounds = label.getBounds();
      if (occupied.some((rect) => Phaser.Geom.Intersects.RectangleToRectangle(rect, bounds)))
        label.destroy();
      else {
        occupied.push(bounds);
        this.pieces.push(label);
      }
    }
    // Camera matrices update on the next frame; derive the screen anchor directly
    // so wheel events and resizes do not leave this hint displaced.
    const p = { x: view.x + 24 / c.zoom, y: view.y + 76 / c.zoom };
    const hint = this.add
      .text(p.x, p.y, 'VUE STRATÉGIQUE\nCliquez pour vous rapprocher', {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        resolution: 2,
        color: '#d5dfce',
        backgroundColor: '#152019',
        padding: { x: 10, y: 8 },
        lineSpacing: 5,
      })
      .setScale(1 / c.zoom)
      .setDepth(15000)
      .setName('strategic-hint');
    this.pieces.push(hint);
  }
  private renderMap() {
    if (!this.view || !this.cameras.main) return;
    const previousStrategic = this.strategic;
    this.strategic = strategicAtZoom(this.cameras.main.zoom, this.strategic);
    if (this.strategic && !previousStrategic) {
      this.victoryBanners.clear();
      this.damageNumbers.clear();
      for (const cancel of [...this.projectiles.values()]) cancel();
      for (const group of this.impactGroups) {
        this.tweens.killTweensOf(group.list);
        group.destroy(true);
      }
      this.impactGroups.clear();
    }
    if (this.strategic !== previousStrategic) {
      this.tweens.killTweensOf(this.ground);
      this.ground.setAlpha(1);
      if (!this.view.player.settings.reducedMotion)
        this.tweens.add({ targets: this.ground, alpha: { from: 0.65, to: 1 }, duration: 160 });
    }
    this.game.canvas.dataset.mapView = this.strategic ? 'strategic' : 'detailed';
    const world = this.view,
      { showUnits, showBuildings } = useGame.getState(),
      g = this.ground,
      d = this.details;
    g.clear();
    d.clear();
    this.grid.clear();
    this.grid.setVisible(!this.strategic && world.player.settings.grid);
    this.territories.clear();
    this.banners.clear();
    for (const piece of this.pieces) {
      this.tweens.killTweensOf(piece);
      piece.destroy();
    }
    this.pieces = [];
    this.unitVisuals.clear();
    this.ambient?.clear();
    this.radiation?.sync(
      world,
      cameraViewport(
        this.cameras.main.scrollX,
        this.cameras.main.scrollY,
        this.cameras.main.width,
        this.cameras.main.height,
        this.cameras.main.zoom,
      ),
      this.strategic,
    );
    if (this.strategic) {
      this.renderStrategicMap(world);
      this.pieces.push(...drawStrategicOperations(this, world, true));
      this.highlight();
      return;
    }
    const c = this.cameras.main,
      // The camera matrix updates on the next frame. Cull from current scroll/zoom
      // so a jump to a distant coast never renders an empty old viewport.
      viewport = cameraViewport(c.scrollX, c.scrollY, c.width, c.height, c.zoom),
      margin = 160 / c.zoom,
      topLeft = { x: viewport.x - margin, y: viewport.y - margin },
      bottomRight = {
        x: viewport.x + viewport.width + margin,
        y: viewport.y + viewport.height + margin,
      },
      visible = world.tiles
        .filter((t) => {
          const p = hexToPixel(t);
          return (
            p.x >= viewport.x - margin &&
            p.x <= viewport.x + viewport.width + margin &&
            p.y >= viewport.y - margin &&
            p.y <= viewport.y + viewport.height + margin
          );
        })
        .sort((a, b) => a.r - b.r || a.q - b.q);
    const factionColor = (id?: string) =>
      color(
        id === world.player.id
          ? world.player.settings.bannerColor
          : (world.realms.find((r) => r.id === id)?.color ?? '#877d63'),
      );
    const secondaryColor = (id?: string) => color(realmBanner(world, id).secondary);
    const drawBanner = (
      ownerId: string,
      x: number,
      y: number,
      alpha = 1,
      target = this.banners,
    ) => {
      const design = realmBanner(world, ownerId);
      const texture = `realm-banner:${ownerId}`;
      const signature = JSON.stringify(design);
      if (this.bannerDesigns.get(ownerId) !== signature || !this.textures.exists(texture)) {
        if (this.textures.exists(texture)) this.textures.remove(texture);
        this.textures.addCanvas(texture, bannerCanvas(design));
        this.bannerDesigns.set(ownerId, signature);
      }
      target.lineStyle(4, 0x101814, 0.9 * alpha);
      target.lineBetween(x, y - 1, x, y + 22);
      target.lineStyle(1.5, 0xd6c9a5, alpha);
      target.lineBetween(x, y - 1, x, y + 22);
      const flag = this.add
        .image(x, y, texture)
        .setOrigin(0, 0)
        .setDisplaySize(18, 12.6)
        .setAlpha(alpha)
        .setDepth(13000)
        .setName(`realm-flag:${ownerId}`);
      this.pieces.push(flag);
      return flag;
    };
    const coastalTiles = this.tileMap;
    if (this.coastCache?.tiles !== coastalTiles)
      this.coastCache = { tiles: coastalTiles, field: coastalField(world.seed, coastalTiles) };
    const coast = this.coastCache.field;
    const expeditionClearings = expeditionSceneryClearings(world);
    for (const t of visible) {
      const p = hexToPixel(t),
        unknown = t.visibility === 'UNKNOWN',
        explored = t.visibility === 'EXPLORED',
        appearance = unknown ? undefined : biomeAppearance(world.seed, t, t.biome),
        biome = appearance?.palette ?? BIOMES[t.biome ?? 'TEMPERATE'],
        base =
          coast.get(key(t))?.color ??
          (t.terrain && appearance ? blendedTerrainColor(t.terrain, appearance.blend) : 0x25312c),
        n = hash(key(t));
      const tint = Phaser.Display.Color.IntegerToColor(base);
      if (explored) tint.darken(32);
      else if (unknown) tint.darken(12);
      else if (!coast.has(key(t))) tint.lighten(n * 5);
      g.fillStyle(unknown ? 0x151f1b : 0x1b211b, 1);
      g.fillPoints(points({ x: p.x, y: p.y + 6 }), true);
      g.fillStyle(tint.color, 1);
      g.fillPoints(points(p, SIZE - 1), true);
      if (!unknown)
        drawCoastalBlend(g, t, p, coast, coastalTiles, world.seed, (ink) =>
          explored ? Phaser.Display.Color.IntegerToColor(ink).darken(32).color : ink,
        );
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
      // Keep the coloured ground, ownership and grid; omit landscape beneath landmarks.
      if (expeditionClearings.has(key(t)) || (t.islandDiscovery && t.poi && !t.building)) continue;
      if (t.terrain === 'SCORCHED') {
        // Irregular ash patches and broken seams, kept inside the hexagon.
        for (let i = 0; i < 4; i++) {
          const seed = key(t) + ':ash:' + i;
          const x = p.x + (hash(seed + 'x') - 0.5) * 34;
          const y = p.y + (hash(seed + 'y') - 0.5) * 18;
          const patch = Array.from({ length: 7 }, (_, j) => {
            const angle = (j * Math.PI * 2) / 7;
            const radius = 9 + hash(seed + j) * 14;
            return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius * 0.52 };
          });
          d.fillStyle(i % 2 ? 0x171513 : 0x4b3e34, explored ? 0.25 : 0.45);
          d.fillPoints(patch, true);
          const dx = 6 + hash(seed + 'dx') * 8;
          const dy = (hash(seed + 'dy') - 0.5) * 9;
          d.lineStyle(1, 0x0a0908, explored ? 0.35 : 0.65);
          d.lineBetween(x - dx, y - dy, x, y);
          d.lineBetween(x, y, x + dx * 0.7, y - dy + 3);
          d.lineBetween(x, y, x - 3, y + 5);
        }
      }
      for (let i = 0; i < 7; i++) {
        const rx = (hash(`${key(t)}x${i}`) - 0.5) * 60,
          ry = (hash(`${key(t)}y${i}`) - 0.5) * 40;
        d.fillStyle(
          t.terrain === 'SCORCHED' ? 0x746b63 : n > 0.5 ? biome.light : biome.dark,
          explored ? 0.1 : 0.18,
        );
        d.fillEllipse(p.x + rx, p.y + ry, 2 + n * 4, 1.4);
      }
      drawCoastalTerrain(d, t, p, coastalTiles);
      if (t.terrain === 'RIVER') {
        d.fillStyle(biome.water, explored ? 0.25 : 0.5);
        d.fillEllipse(p.x, p.y, 64, 36);
        d.lineStyle(1, biome.ripple, 0.25);
        for (let i = 0; i < 3; i++)
          d.lineBetween(p.x - 20 + i * 4, p.y - 7 + i * 7, p.x + 10 + i * 4, p.y - 7 + i * 7);
      }
      if (
        !t.building &&
        !isSea(t.terrain) &&
        t.terrain !== 'BEACH' &&
        t.terrain !== 'ALIEN' &&
        t.terrain !== 'RIVER' &&
        t.terrain !== 'SCORCHED'
      ) {
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
            .image(p.x, p.y - (t.terrain === 'MOUNTAIN' ? 18 : 10), appearance!.texture, frame)
            .setDisplaySize(size, size)
            .setDepth(depth(1000, p.y))
            .setAlpha(explored ? 0.42 : t.terrain === 'PLAIN' ? 0.48 : 0.95)
            .setName(`terrain:${t.biome ?? 'TEMPERATE'}:${key(t)}`)
            .setData({
              biome: appearance!.blend.primary,
              sceneryBiome: appearance!.blend.scenery,
              biomeWeights: appearance!.blend.weights,
            });
          if (explored) scenery.setTint(0x899082);
          this.pieces.push(scenery);
        }
      }
      if (t.terrain === 'RIVER')
        for (const near of neighbors(t)) {
          if (this.tileMap.get(key(near))?.terrain === 'RIVER') {
            const end = hexToPixel(near);
            d.lineStyle(22, biome.water, explored ? 0.3 : 0.7);
            d.lineBetween(p.x, p.y, (p.x + end.x) / 2, (p.y + end.y) / 2);
            d.lineStyle(1, biome.ripple, 0.2);
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
        if (showBuildings && t.building) {
          if (!this.victoryBanners.hidden.has(t.building.id))
            drawBanner(t.ownerId, p.x - 25, p.y + 4, opacity);
          const b = t.building;
          if (!b.id.startsWith('preview:')) {
            // Material upgrades keep walls at level 1 internally: show their tier.
            const level = isWall(b.kind) ? WALL_KINDS.indexOf(b.kind) + 1 : b.level;
            const maxLevel = !buildingUpgrade(b.kind, b.level);
            const x = p.x - 41.5,
              y = p.y + 10;
            this.banners.fillStyle(secondaryColor(t.ownerId), 0.95 * opacity);
            this.banners.fillRoundedRect(x - 13.5, y - 8, 27, 16, 3);
            this.banners.lineStyle(0.8, ink, opacity);
            this.banners.strokeRoundedRect(x - 13.5, y - 8, 27, 16, 3);
            const badge = this.add
              .text(x, y, `${level} ${maxLevel ? '✓' : '↑'}`, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '10px',
                fontStyle: 'bold',
                color: maxLevel ? '#edcf8e' : '#ffffff',
                stroke: '#101814',
                strokeThickness: 2,
                resolution: 2,
              })
              .setOrigin(0.5)
              .setDepth(13001)
              .setAlpha(opacity)
              .setName(`building-level:${b.id}`)
              .setData({ level, maxLevel });
            this.pieces.push(badge);
          }
        }
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
      if (showBuildings && t.building) {
        const b = t.building,
          frame = b.kind === 'VILLAGE' ? Math.min(9, 6 + b.level) : BUILDING_FRAMES[b.kind],
          size = b.kind === 'VILLAGE' ? 105 : 78;
        if (isWall(b.kind)) {
          const connections = wallConnections(b, (p) => this.tileMap.get(key(p))?.building);
          const roads = neighbors(t).reduce(
            (mask, n, i) => (this.tileMap.get(key(n))?.road ? mask | (1 << i) : mask),
            0,
          );
          const gateAxis = t.road ? wallGateAxis(connections, roads) : undefined;
          const texture = `wall:${b.kind}:${connections}:${b.turretLevel ?? 0}:${gateAxis ?? 'wall'}`;
          if (!this.textures.exists(texture))
            this.textures.addCanvas(
              texture,
              wallCanvas(b.kind, connections, b.turretLevel, gateAxis),
            );
          const sprite = this.add
            .image(p.x, p.y, texture)
            .setDisplaySize(128, 128)
            .setOrigin(0.5, 152 / 256)
            .setDepth(depth(5000, p.y))
            .setName(`wall:${b.id}`)
            .setData('gate', t.road === true)
            .setData(
              'gate-info',
              gateAxis === undefined ? undefined : { b, connections, gateAxis, texture },
            );
          if (t.visibility === 'EXPLORED') sprite.setTint(0x777f75).setAlpha(0.7);
          this.pieces.push(sprite);
          if (t.visibility === 'VISIBLE')
            this.healthBar(b.id, p.x, p.y, b.hp, BUILDINGS[b.kind].hp, b.turretLevel ? -75 : -55);
          continue;
        }
        const ageTexture = buildingTextureKey(b.kind);
        const visualLevel = buildingVisualLevel(b.kind, b.level);
        const evolved = visualLevel > 1 && hasBuildingEvolutionArt(b.kind);
        if (evolved && !this.textures.exists(ageTexture) && !this.loadingBuildingArt.has(b.kind)) {
          this.loadingBuildingArt.add(b.kind);
          void buildingAtlas(b.kind)
            .then((canvas) => {
              if (!this.sys?.isActive()) return;
              if (!this.textures.exists(ageTexture)) {
                const texture = this.textures.addCanvas(ageTexture, canvas)!;
                for (let i = 0; i < 4; i++) texture.add(i, 0, i * 256, 0, 256, 256);
              }
              this.renderMap();
            })
            .catch(console.error)
            .finally(() => this.loadingBuildingArt.delete(b.kind));
        }
        const useAge = evolved && this.textures.exists(ageTexture);
        const sprite = this.add
          .image(
            p.x,
            p.y - 17,
            useAge ? ageTexture : miniatureTexture(frame),
            useAge ? buildingEvolutionFrame(visualLevel) : miniatureFrame(frame),
          )
          .setDisplaySize(size, size)
          .setDepth(depth(5000, p.y))
          .setName(`building-sprite:${b.id}`);
        if (t.visibility === 'EXPLORED') sprite.setTint(0x777f75).setAlpha(0.7);
        this.pieces.push(sprite);
        if (t.visibility === 'VISIBLE')
          this.healthBar(b.id, p.x, p.y, b.hp, BUILDINGS[b.kind].hp * b.level, -size / 2 - 26);
        if (b.kind === 'VILLAGE') {
          const label = this.add
            .text(p.x, p.y + 28, CITY_LEVELS[b.level].toUpperCase(), {
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
      } else if (t.terrain === 'ALIEN' && !expeditionClearings.has(key(t))) {
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
    for (const u of showUnits ? world.units : []) {
      const p = this.visualPosition(u);
      if (
        !useGame.getState().movements[u.id] &&
        (p.x < topLeft.x || p.x > bottomRight.x || p.y < topLeft.y || p.y > bottomRight.y)
      )
        continue;
      const origin = p;
      const parts: {
        object: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | Phaser.GameObjects.Text;
        x: number;
        y: number;
        layer: number;
      }[] = [];
      if (u.npc || u.kind === 'HERO') {
        // Same pulsing oval for encounters and heroes; heroes use their owner's banner.
        const ink = factionColor(u.ownerId);
        const halo = this.add
          .graphics({ x: p.x, y: p.y + 9 })
          .setDepth(depth(6600, p.y))
          .setName(`${u.npc ? 'npc' : 'hero'}-halo:${u.id}`);
        halo.fillStyle(u.npc ? 0xffb642 : ink, 0.08);
        halo.fillEllipse(0, 0, 86, 43);
        halo.fillStyle(u.npc ? 0xffc65c : ink, 0.18);
        halo.fillEllipse(0, 0, 70, 34);
        halo.lineStyle(6, u.npc ? 0xffb642 : ink, 0.18);
        halo.strokeEllipse(0, 0, 63, 30);
        halo.lineStyle(2.4 / Math.min(1, this.cameras.main.zoom), u.npc ? 0xffd47b : ink, 0.95);
        halo.strokeEllipse(0, 0, 63, 30);
        if (!u.npc) {
          halo.lineStyle(1.2 / Math.min(1, this.cameras.main.zoom), secondaryColor(u.ownerId), 1);
          halo.strokeEllipse(0, 0, 57, 24);
        }
        this.pieces.push(halo);
        parts.push({ object: halo, x: 0, y: 9, layer: 6600 });
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
      marker.fillStyle(0x080b08, 0.45);
      marker.fillEllipse(0, 30, markerWidth, markerHeight);
      marker.lineStyle(4, 0x080b08, 0.85);
      marker.strokeEllipse(0, 30, markerWidth, markerHeight);
      marker.lineStyle(2, factionColor(u.ownerId), 1);
      marker.strokeEllipse(0, 30, markerWidth, markerHeight);
      if (!u.npc) {
        marker.lineStyle(1.2, secondaryColor(u.ownerId), 1);
        marker.strokeEllipse(0, 30, markerWidth - 5, markerHeight - 4);
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
          u.expedition ? 95 : UNIT_PROFILES[u.kind].siege ? 75 : 67,
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
      if (TRANSPORTS[u.kind] && u.ownerId === world.player.id) {
        const used = cargoUsed(u),
          capacity = TRANSPORTS[u.kind]!.capacity;
        const full = used >= capacity;
        const scale = 1 / Math.max(0.65, Math.min(1, this.cameras.main.zoom));
        const tag = this.add
          .text(p.x, p.y - 48, `${used}/${capacity}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: full ? '#edcf8e' : used ? '#e1e5d2' : '#a5af9d',
            resolution: 2,
          })
          .setOrigin(0.5)
          .setScale(scale)
          .setDepth(depth(14500, p.y))
          .setName(`cargo-count:${u.id}`)
          .setData({ passengers: u.cargo?.length ?? 0, used, capacity, full });
        const badge = this.add
          .graphics({ x: p.x, y: p.y - 48 })
          .setScale(scale)
          .setDepth(depth(14499, p.y))
          .setName(`cargo-badge:${u.id}`);
        const width = Math.max(32, tag.width + 10),
          height = 18;
        badge.fillStyle(0x111c18, 0.97);
        badge.fillRoundedRect(-width / 2, -height / 2, width, height, 3);
        badge.lineStyle(1, full ? 0xd6ba79 : factionColor(u.ownerId), 1);
        badge.strokeRoundedRect(-width / 2, -height / 2, width, height, 3);
        this.pieces.push(badge, tag);
        parts.push(
          { object: badge, x: 0, y: -48, layer: 14499 },
          { object: tag, x: 0, y: -48, layer: 14500 },
        );
      }
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
      if (!u.npc) {
        const flag = drawBanner(u.ownerId, 20, -26, 1, banner);
        flag.setPosition(p.x + 20, p.y - 26);
        parts.push({ object: flag, x: 20, y: -26, layer: 13000 });
      } else {
        const tag = this.add
          .text(p.x, p.y - 55, u.expedition ? '◆ EXPÉDITION' : '◆ PNJ', {
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
      if (u.nickname && !u.hero) {
        const tag = this.add
          .text(p.x, p.y - 65, u.nickname, {
            fontSize: '10px',
            color: '#ede2be',
            backgroundColor: '#17211be8',
            padding: { x: 4, y: 3 },
          })
          .setOrigin(0.5)
          .setDepth(13500);
        this.pieces.push(tag);
        parts.push({ object: tag, x: 0, y: -65, layer: 13500 });
      }
      this.unitVisuals.set(u.id, { unit: u, parts });
    }
    for (const event of world.events) {
      const t = this.tileMap.get(key(event));
      if (
        t?.visibility !== 'VISIBLE' ||
        !eventAvailable(event, Math.max(world.serverTimestamp, useGame.getState().now))
      )
        continue;
      const p = hexToPixel(event);
      if (event.kind !== 'MONOLITH') {
        const maritime = ['SHIPWRECK', 'SEA_OBELISK', 'DRIFTING_CARGO', 'SUB_WRECK'].indexOf(
          event.kind,
        );
        const frame =
          maritime >= 0
            ? maritime
            : event.kind === 'PORTAL'
              ? 23
              : event.kind === 'METEOR'
                ? 20
                : event.kind === 'ROYAL_CARAVAN'
                  ? 22
                  : event.kind === 'COLOSSUS'
                    ? 21
                    : 19;
        const sprite = this.add
          .image(p.x, p.y - 14, maritime >= 0 ? 'naval-events' : 'miniatures', frame)
          .setDisplaySize(
            event.kind === 'COLOSSUS' ? 135 : 84,
            event.kind === 'COLOSSUS' ? 135 : 84,
          )
          .setDepth(depth(5000, p.y))
          .setName(`world-event-sprite:${event.id}`);
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
        .setDepth(depth(9500, p.y))
        .setName(`world-event-label:${event.id}`);
      this.pieces.push(label);
    }
    this.pieces.push(...drawStrategicOperations(this, world, false));
    this.pieces.push(...drawIslandDiscoveries(this, world, () => this.renderMap()));
    this.pieces.push(...drawExpeditionSites(this, world, () => this.renderMap()));
    for (const caravan of showUnits ? world.caravans : []) {
      const p = hexToPixel(caravan),
        sprite = this.add
          .image(
            p.x,
            p.y - 10,
            caravan.maritime ? miniatureTexture(UNIT_FRAMES.TROOP_BRIG) : 'miniatures',
            caravan.maritime ? miniatureFrame(UNIT_FRAMES.TROOP_BRIG) : 22,
          )
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
    g.setData('groupRangeCount', 0);
    if (this.strategic) return;
    const state = useGame.getState(),
      selection = state.selection,
      u = this.getUnit();
    if (state.selectedUnitIds.length > 1) {
      if (!state.pending && (state.mode === 'inspect' || state.mode === 'move')) {
        const range = groupMovementRange(this.view, state.selectedUnitIds);
        const viewport = this.cameras.main.worldView;
        g.setData('groupRangeCount', range.cells.size);
        for (const cell of range.cells.values()) {
          const p = hexToPixel(cell);
          if (
            p.x < viewport.left - SIZE ||
            p.x > viewport.right + SIZE ||
            p.y < viewport.top - SIZE ||
            p.y > viewport.bottom + SIZE
          )
            continue;
          const common = cell.count === range.total;
          const tint = common ? 0xb8e8d5 : 0xe7b974;
          g.fillStyle(common ? 0x79bdb2 : 0xc59148, state.groupTarget ? 0.1 : common ? 0.27 : 0.16);
          g.fillPoints(points(p, SIZE - 3), true);
          g.lineStyle(5, 0x101c1a, 0.8);
          g.strokePoints(points(p, SIZE - 3), true);
          g.lineStyle(common ? 2.5 : 1.5, tint, common ? 0.95 : 0.8);
          g.strokePoints(points(p, SIZE - 3), true);
        }
        if (state.mode === 'move' && state.hover) {
          g.lineStyle(4, range.cells.has(key(state.hover)) ? 0xffe9b0 : 0xd98576, 1);
          g.strokePoints(points(hexToPixel(state.hover), SIZE - 2), true);
        }
      }
      for (const unit of this.view.units.filter((u) => state.selectedUnitIds.includes(u.id))) {
        const p = this.visualPosition(unit);
        g.lineStyle(3, 0xf2e6bc, 1);
        g.strokePoints(points(p, SIZE - 5), true);
      }
      if (state.mode === 'move' && state.groupTarget) {
        const preview = groupMovementPreview(
          this.view,
          state.selectedUnitIds,
          state.groupTarget,
          state.groupFormation,
        );
        for (let i = 0; i < preview.journeys.length; i++) {
          const journey = preview.journeys[i],
            color = [0xffdaa0, 0x9fddd5, 0xc4b2ec, 0xa6d88b][i % 4];
          let prev = hexToPixel(journey.from);
          for (const step of journey.path) {
            const p = hexToPixel(step);
            g.lineStyle(5, 0x16211b, 0.8);
            g.lineBetween(prev.x, prev.y, p.x, p.y);
            g.lineStyle(2, color, 1);
            g.lineBetween(prev.x, prev.y, p.x, p.y);
            prev = p;
          }
          g.fillStyle(color, 0.25);
          g.fillPoints(points(prev, SIZE - 4), true);
          g.lineStyle(3, color, 1);
          g.strokePoints(points(prev, SIZE - 4), true);
        }
        for (const stopped of preview.stationary) {
          const unit = this.view.units.find((u) => u.id === stopped.unitId);
          if (unit) {
            g.lineStyle(3, 0xd98576, 1);
            g.strokePoints(points(hexToPixel(unit), SIZE - 5), true);
          }
        }
      }
      return;
    }
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
    const builder = this.view.units.find((unit) => unit.id === state.constructionBuilderId);
    if (state.mode === 'inspect' && builder) {
      for (const t of this.view.tiles) {
        if (!isBuilderSite(this.view, builder, t)) continue;
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
          unitMovementBudget(
            u,
            movementBiome(this.view.seed, this.tileMap.get(key(u))),
            this.view.player.faction,
          ),
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
    const visible = !this.strategic && !!(state.pending && action?.position);
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
  private updateGates() {
    const world = this.view;
    if (!world) return;
    const members = world.strategy?.alliance?.members ?? [];
    for (const piece of this.pieces) {
      const sprite = piece as Phaser.GameObjects.Image;
      const gate = sprite.getData?.('gate-info');
      if (!gate) continue;
      const p = hexToPixel(gate.b);
      const open = world.units.some(
        (u) =>
          (u.ownerId === gate.b.ownerId ||
            (members.includes(u.ownerId) && members.includes(gate.b.ownerId))) &&
          !UNIT_PROFILES[u.kind].flying &&
          (() => {
            const v = this.visualPosition(u);
            return Math.hypot(v.x - p.x, v.y - p.y) < 68;
          })(),
      );
      const texture = gate.texture + (open ? ':open' : '');
      if (!this.textures.exists(texture))
        this.textures.addCanvas(
          texture,
          wallCanvas(gate.b.kind, gate.connections, gate.b.turretLevel, gate.gateAxis, true),
        );
      if (sprite.texture.key !== texture) sprite.setTexture(texture);
    }
  }
  update(_time: number, delta: number) {
    if (!this.strategic && this.view && _time - this.lastAmbientAt > 50) {
      this.lastAmbientAt = _time;
      this.radiation?.update(_time);
      const state = useGame.getState();
      drawAmbient(
        this.ambient,
        this.view,
        (u) => this.visualPosition(u),
        _time,
        new Set(Object.keys(state.movements)),
        state.showUnits,
        state.showBuildings,
      );
    }
    if (!this.strategic && _time - this.lastGateAt > 100) {
      this.lastGateAt = _time;
      this.updateGates();
    }
    if (!this.strategic) this.updateUnitVisuals();
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
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    setLoading(true);
    setProgress(0);
    setLoadError(null);
    setSlow(false);
    const slowTimer = window.setTimeout(() => setSlow(true), 45000);
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
    // Assets loading is only the first step: wait until the populated map has
    // actually been rendered, including atlas normalization and scene creation.
    const onFirstFrame = () => {
      if (!game.canvas.dataset.mapView || !game.registry.get('map:prepared')) return;
      game.events.off(Phaser.Core.Events.POST_RENDER, onFirstFrame);
      clearTimeout(slowTimer);
      setLoading(false);
      setLoadError(null);
    };
    const onProgress = (value: number) => setProgress(Math.round(value * 100));
    const onLoadError = (message: string) => {
      clearTimeout(slowTimer);
      setLoadError(message);
    };
    game.events.on('map:progress', onProgress);
    game.events.on('map:load-error', onLoadError);
    game.events.on(Phaser.Core.Events.POST_RENDER, onFirstFrame);
    const resizeObserver = new ResizeObserver(() => {
      if (host.current && game.isBooted)
        game.scale.setParentSize(host.current.clientWidth, host.current.clientHeight);
    });
    resizeObserver.observe(host.current);
    return () => {
      clearTimeout(slowTimer);
      resizeObserver.disconnect();
      game.events.off('map:progress', onProgress);
      game.events.off('map:load-error', onLoadError);
      game.events.off(Phaser.Core.Events.POST_RENDER, onFirstFrame);
      // Stop scene subscriptions synchronously; Phaser destroys the game next frame.
      for (const scene of game.scene.getScenes(false)) scene.scene.stop();
      container.remove();
      game.destroy(true);
    };
  }, [attempt]);
  return (
    <>
      <div
        className="game-canvas"
        ref={host}
        role="application"
        aria-busy={loading && !loadError}
        aria-label="Carte hexagonale des Marches. Sélectionnez une unité, puis Déplacer. Flèches pour déplacer la caméra, molette ou pincement à deux doigts pour zoomer."
      />
      {loading && (
        <div className="map-loading" role={loadError ? 'alert' : 'status'} aria-live="polite">
          <SeasonBanner compact />
          {!loadError && (
            <LoaderCircle className="spin" size={36} strokeWidth={1.5} aria-hidden="true" />
          )}
          <p>{loadError ? 'Impossible de charger la carte' : 'Génération de la carte…'}</p>
          <small>
            {loadError ??
              (progress < 100
                ? 'Chargement des illustrations… ' + progress + ' %'
                : 'Préparation du plateau…')}
          </small>
          {slow && !loadError && (
            <small>
              Le chargement prend plus de temps que prévu. Vous pouvez patienter ou réessayer.
            </small>
          )}
          {(slow || loadError) && (
            <button className="primary" onClick={() => setAttempt((n) => n + 1)}>
              Réessayer le chargement
            </button>
          )}
        </div>
      )}
    </>
  );
}
