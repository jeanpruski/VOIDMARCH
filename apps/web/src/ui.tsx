import { formatNumber } from '@voidmarch/config';
import { HeroPortrait } from './Hero';
import { buildingAtlasUrl, buildingEvolutionFrame } from './building-art';
import { hasBuildingEvolutionArt, type BuildingKind, type UnitKind } from '@voidmarch/config';
import type { HeroAppearance } from '@voidmarch/config';
import {
  Coins,
  Trees,
  Pickaxe,
  Mountain,
  Wheat,
  Crown,
  Sword,
  Eye,
  Castle,
  Bird,
  Star,
  KeyRound,
  Bell,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, useRef, type ReactNode } from 'react';
import { miniatureAtlasUrl } from './sprite-atlas';
import { wallImageUrl, loadWallMaterials } from './wall-art';
import { WALL_KINDS, type WallKind } from '@voidmarch/config';
import { RESOURCES, RESOURCE_NAMES, type Resource, type Wallet } from '@voidmarch/config';
import { useGame } from './store';
import type { Unit } from '@voidmarch/shared';
export const resourceIcons: Record<Resource, LucideIcon> = {
  STONE: Mountain,
  GOLD: Coins,
  WOOD: Trees,
  IRON: Pickaxe,
  FOOD: Wheat,
};
export const symbols: Record<string, LucideIcon> = {
  crown: Crown,
  sword: Sword,
  eye: Eye,
  tower: Castle,
  bird: Bird,
  star: Star,
  key: KeyRound,
  bell: Bell,
};
export const format = formatNumber;
export function Duration({ until }: { until: number }) {
  const now = useGame((s) => s.now),
    seconds = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <>
      {seconds >= 3600
        ? `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`
        : `${Math.floor(seconds / 60)
            .toString()
            .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`}
    </>
  );
}
export function Sigil({
  symbol = 'crown',
  color,
  size = 36,
}: {
  symbol?: string;
  color?: string;
  size?: number;
}) {
  const Icon = symbols[symbol] ?? Crown;
  return (
    <span className="sigil" style={{ color, width: size + 22, height: size + 32 }}>
      <Icon size={size} strokeWidth={1.15} />
    </span>
  );
}
export function Cost({ cost, wallet }: { cost: Partial<Wallet>; wallet?: Wallet }) {
  return (
    <span className="cost">
      {RESOURCES.filter((r) => (cost[r] ?? 0) > 0).map((r) => {
        const Icon = resourceIcons[r];
        const shortage = wallet ? Math.max(0, Math.ceil(cost[r]! - wallet[r])) : 0;
        const label = wallet
          ? `${RESOURCE_NAMES[r]} : coût ${format(cost[r]!)}, stock ${format(wallet[r])}${shortage ? `, il manque ${format(shortage)}` : ''}`
          : RESOURCE_NAMES[r];
        return (
          <span
            key={r}
            title={label}
            aria-label={label}
            className={shortage ? 'cost-insufficient' : undefined}
          >
            <Icon size={13} />
            {format(cost[r]!)}
          </span>
        );
      })}
    </span>
  );
}
export function StorageHint({
  cost,
  wallet,
  capacity,
}: {
  cost: Partial<Wallet>;
  wallet: Wallet;
  capacity: number;
}) {
  const needed = Math.max(
    0,
    ...RESOURCES.filter((r) => (cost[r] ?? 0) > wallet[r]).map((r) => cost[r] ?? 0),
  );
  if (needed <= capacity) return null;
  return (
    <p className="catalog-unavailable">
      Stockage insuffisant pour économiser ce coût : {format(capacity)} par ressource, contre{' '}
      {format(needed)} nécessaires. Construisez ou améliorez vos entrepôts, greniers ou gares.
    </p>
  );
}
export function Modal({
  title,
  eyebrow,
  toolbar,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  toolbar?: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        useGame.setState({ constructionBuilderId: null });
        event.preventDefault();
        event.stopImmediatePropagation();
        if (close.current) close.current();
        else useGame.setState({ panel: null, combatTarget: null });
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href], [tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
      const first = controls[0],
        last = controls.at(-1);
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', keyboard, true);
    return () => {
      window.removeEventListener('keydown', keyboard, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          if (onClose) onClose();
          else useGame.setState({ panel: null, combatTarget: null });
        }
      }}
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2>{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Fermer"
            onClick={onClose ?? (() => useGame.setState({ panel: null, combatTarget: null }))}
          >
            <X size={20} />
          </button>
        </header>
        {toolbar}
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
export const UNIT_FRAMES: Record<UnitKind, number> = {
  HALBERDIER: 768,
  LONGBOWMAN: 769,
  MOUNTED_OUTRIDER: 770,
  WAR_WAGON: 771,
  IMPERIAL_PIKEMAN: 792,
  BLACK_DRAGOON: 793,
  IMPERIAL_CANNON: 794,
  WAR_BALLOON: 795,
  ASSAULT_SAPPER: 816,
  ASH_FLAMETHROWER: 817,
  CASEMATE_HUNTER: 818,
  DIVE_BOMBER: 819,
  RAIL_SNIPER: 840,
  STEALTH_BIKE: 841,
  MISSILE_TANK: 842,
  NIGHT_INTERCEPTOR: 843,
  REACTOR_DREADNOUGHT: 864,
  GAMMA_INTERCEPTOR: 865,
  NEUTRON_MORTAR: 866,
  REACTOR_SERAPH: 867,
  MUSKETEER: 624,
  IMPERIAL_GRENADIER: 648,
  CUIRASSIER: 672,
  COMMANDO: 696,
  DRONE_OPERATOR: 720,
  NEUTRON_GUARD: 744,
  HERO: 0,
  GLOCKE_VRIL: 432,
  GLOCKE_NACHT: 456,
  GLOCKE_APOCALYPSE: 480,
  RADIUM_GRENADIER: 144,
  COBALT_SENTINEL: 145,
  ISOTOPE_SNIPER: 146,
  ATOMIC_SAPPER: 147,
  PALE_EXECUTIONER: 148,
  GAMMA_TEMPLAR: 149,
  RADIUM_HUSSAR: 168,
  ISOTOPE_LANCER: 169,
  COBALT_CUIRASSIER: 170,
  ASH_DRAGOON: 171,
  PALE_OUTRIDER: 172,
  GAMMA_PALADIN: 173,
  RADIUM_COURIER: 192,
  ISOTOPE_BIKE: 193,
  COBALT_SIDECAR: 194,
  PALE_HUNTER_BIKE: 195,
  GAMMA_TRIKE: 196,
  APOCALYPSE_BIKE: 197,
  RADIUM_SCOUT_CAR: 216,
  COBALT_HALFTRACK: 217,
  ISOTOPE_TANK_HUNTER: 218,
  MAUSOLEUM_TANK: 219,
  GAMMA_FLAK_CRAWLER: 220,
  APOCALYPSE_CRAWLER: 221,
  RADIUM_RECON: 240,
  ISOTOPE_INTERCEPTOR: 241,
  COBALT_ATTACK_PLANE: 242,
  PALE_NIGHT_FIGHTER: 243,
  GAMMA_BOMBER: 244,
  APOCALYPSE_WING: 245,
  RADIUM_GYRO: 264,
  ISOTOPE_HELICOPTER: 265,
  COBALT_GUNSHIP: 266,
  PALE_HUNTER_HELI: 267,
  GAMMA_HELICOPTER: 268,
  APOCALYPSE_HELICOPTER: 269,

  TERRAFORMER: 120,
  RECON_PLANE: 96,
  FIGHTER: 97,
  BOMBER: 98,
  ZEPPELIN: 99,
  OCCULT_DRAGON: 100,
  FLAK_CANNON: 101,
  TESLA_TROOPER: 72,
  HEX_HUNTER: 73,
  PLAGUE_MEDIC: 74,
  GHOUL_INFANTRY: 75,
  SPECTRAL_RIDER: 76,
  SIEGE_WALKER: 77,
  HEX_TANK: 78,
  MORTAR: 79,

  RIFLEMAN: 48,
  STORMTROOPER: 49,
  MACHINE_GUNNER: 50,
  SNIPER: 51,
  BAZOOKA: 52,
  OFFICER: 53,
  MOTORCYCLE: 54,
  ARMORED_CAR: 55,
  TANK: 56,
  FIELD_GUN: 57,
  ROCKET_LAUNCHER: 58,
  IRON_REVENANT: 59,

  PEASANT: 24,
  MILITIA: 25,
  SPEARMAN: 26,
  CROSSBOW: 27,
  RANGER: 28,
  LIGHT_CAVALRY: 29,
  PALADIN: 30,
  RAM: 31,
  HEALER: 32,
  ENGINEER: 33,
  BERSERKER: 34,
  VOID_ACOLYTE: 35,

  SCOUT: 0,
  INFANTRY: 1,
  GUARD: 2,
  ARCHER: 3,
  KNIGHT: 4,
  SIEGE: 5,
};
export const BUILDING_FRAMES: Record<string, number> = {
  STEAM_SAWMILL: 528,
  MECHANIZED_QUARRY: 529,
  INDUSTRIAL_MINE: 530,
  OCCULT_SAWMILL: 531,
  RUNIC_QUARRY: 532,
  ABYSSAL_MINE: 533,
  GLOCKE_COMPLEX: 504,
  ISOTOPE_LAB: 288,
  NUCLEAR_REACTOR: 289,
  HELIPAD: 290,
  ATOMIC_FOUNDRY: 291,
  AERODROME: 102,
  AIRSHIP_YARD: 103,
  DRAGON_ROOST: 104,
  FLAK_BATTERY: 105,
  WOOD_WALL: 84,
  STONE_WALL: 85,
  STEEL_WALL: 86,
  CONCRETE_WALL: 87,
  ATOMIC_WALL: 88,
  TESLA_COIL: 80,
  CRYPT_BARRACKS: 81,
  ALCHEMY_FOUNDRY: 82,
  BLACK_OBSERVATORY: 83,

  QUARRY: 576,
  GOLD_MINE: 600,
  ARSENAL: 60,
  BUNKER: 61,
  GARAGE: 62,
  TANK_FACTORY: 63,
  REFINERY: 64,
  MUNITIONS: 65,
  RADIO: 66,
  FIELD_HOSPITAL: 67,
  GUN_BATTERY: 68,
  OCCULT_LAB: 69,
  ROCKET_SILO: 70,
  RAIL_DEPOT: 71,

  CAMP: 36,
  HOUSE: 37,
  GRANARY: 38,
  HUNTER: 39,
  FISHERY: 40,
  STABLE: 41,
  ARCHERY: 42,
  MONASTERY: 43,
  FORGE: 44,
  LIBRARY: 45,
  BAKERY: 46,
  WELL: 47,

  OUTPOST: 6,
  VILLAGE: 7,
  FARM: 10,
  LUMBER: 11,
  MINE: 552,
  MARKET: 13,
  WAREHOUSE: 14,
  WORKSHOP: 15,
  BARRACKS: 16,
  FORT: 17,
  TOWER: 18,
};
const npcTextures = ['npc-deserter', 'npc-marauder', 'npc-cultist', 'npc-mutant', 'npc-rider'];
export const unitFrame = (unit: Unit) =>
  unit.npc ? 312 + npcTextures.indexOf(`npc-${unit.npc.kind}`) * 24 : UNIT_FRAMES[unit.kind];
export const miniatureTexture = (frame: number) =>
  frame >= 768
    ? [
        'reinforcements-medieval',
        'reinforcements-empire',
        'reinforcements-industrial',
        'reinforcements-modern',
        'reinforcements-atomic',
      ][Math.floor((frame - 768) / 24)]
    : frame >= 624
      ? [
          'epoch-musketeer',
          'epoch-grenadier',
          'epoch-cuirassier',
          'epoch-commando',
          'epoch-drones',
          'epoch-neutron',
        ][Math.floor((frame - 624) / 24)]
      : frame >= 552
        ? ['mine-iron', 'mine-stone', 'mine-gold'][Math.floor((frame - 552) / 24)]
        : frame >= 528
          ? 'resource-buildings'
          : frame >= 432
            ? ['glocke-vril', 'glocke-nacht', 'glocke-apocalypse', 'glocke-complex'][
                Math.floor((frame - 432) / 24)
              ]
            : frame >= 312
              ? npcTextures[Math.floor((frame - 312) / 24)]
              : frame >= 144
                ? [
                    'rad-infantry',
                    'rad-cavalry',
                    'rad-motorcycles',
                    'rad-vehicles',
                    'rad-planes',
                    'rad-helicopters',
                    'rad-buildings',
                  ][Math.floor((frame - 144) / 24)]
                : frame >= 120
                  ? 'terraformer'
                  : frame >= 96
                    ? 'aviation'
                    : frame < 6
                      ? 'units-medieval'
                      : frame >= 24 && frame < 36
                        ? 'units-civil'
                        : frame >= 48 && frame < 60
                          ? 'units-industrial'
                          : frame >= 72
                            ? 'occult'
                            : frame >= 48
                              ? 'industrial'
                              : frame >= 24
                                ? 'expansion'
                                : 'miniatures';
export const miniatureFrame = (frame: number) => frame % 24;
export function Miniature({
  building,
  heroAppearance,
  frame,
  size = 76,
  turretLevel,
  gate = false,
}: {
  heroAppearance?: HeroAppearance;
  building?: { kind: BuildingKind; level: number };
  frame: number;
  size?: number;
  turretLevel?: import('@voidmarch/config').TurretLevel;
  gate?: boolean;
}) {
  if (heroAppearance) return <HeroPortrait appearance={heroAppearance} size={size} />;
  if (building && building.level > 1 && hasBuildingEvolutionArt(building.kind))
    return <EvolvedBuildingMiniature building={building} size={size} fallback={frame} />;
  const wall = WALL_KINDS[frame - 84];
  return wall ? (
    <WallMiniature wall={wall} size={size} turretLevel={turretLevel} gate={gate} />
  ) : (
    <AtlasMiniature frame={frame} size={size} />
  );
}
function EvolvedBuildingMiniature({
  building,
  size,
  fallback,
}: {
  building: { kind: BuildingKind; level: number };
  size: number;
  fallback: number;
}) {
  const [atlas, setAtlas] = useState<{ kind: BuildingKind; url: string }>();
  useEffect(() => {
    let active = true;
    void buildingAtlasUrl(building.kind)
      .then((url) => {
        if (active) setAtlas({ kind: building.kind, url });
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [building.kind]);
  if (atlas?.kind !== building.kind) return <AtlasMiniature frame={fallback} size={size} />;
  return (
    <span
      className="miniature"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${atlas.url})`,
        backgroundSize: '400% 100%',
        backgroundPosition: `${(buildingEvolutionFrame(building.level) * 100) / 3}% 0%`,
      }}
    />
  );
}
function WallMiniature({
  wall,
  size,
  turretLevel,
  gate,
}: {
  wall: WallKind;
  size: number;
  turretLevel?: import('@voidmarch/config').TurretLevel;
  gate: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void loadWallMaterials()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, []);
  return (
    <span
      className="miniature"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundImage: ready
          ? `url(${wallImageUrl(wall, 9, turretLevel, gate ? 0 : undefined)})`
          : 'none',
        backgroundSize: '100% 100%',
      }}
    />
  );
}
function AtlasMiniature({ frame, size }: { frame: number; size: number }) {
  const texture = miniatureTexture(frame);
  const [atlas, setAtlas] = useState<{ texture: string; url: string }>();
  useEffect(() => {
    let active = true;
    void miniatureAtlasUrl(texture)
      .then((url) => {
        if (active) setAtlas({ texture, url });
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [texture]);
  return (
    <span
      className="miniature"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundImage: atlas?.texture === texture ? `url(${atlas.url})` : 'none',
        backgroundSize: '600% 400%',
        backgroundPosition: `${(frame % 6) * 20}% ${(Math.floor((frame % 24) / 6) * 100) / 3}%`,
      }}
    />
  );
}
