import { INDIRECT_FIRE_UNITS, UNIT_PROFILES, type UnitKind } from '@voidmarch/config';
export type ProjectileKind =
  | 'arrow'
  | 'bolt'
  | 'bullet'
  | 'shell'
  | 'rocket'
  | 'bomb'
  | 'stone'
  | 'orb'
  | 'lightning'
  | 'flame';
/** Deliberate weapon assignments: new ranged troops must choose their ammunition. */
export const PROJECTILE_WEAPONS = {
  GLOCKE_VRIL: 'lightning',
  GLOCKE_NACHT: 'orb',
  GLOCKE_APOCALYPSE: 'lightning',
  ARCHER: 'arrow',
  RANGER: 'arrow',
  CROSSBOW: 'bolt',
  SIEGE: 'stone',
  VOID_ACOLYTE: 'orb',
  TESLA_TROOPER: 'lightning',
  OCCULT_DRAGON: 'flame',
  HEX_HUNTER: 'bolt',
  GHOUL_INFANTRY: 'bullet',
  SIEGE_WALKER: 'shell',
  HEX_TANK: 'shell',
  MORTAR: 'shell',
  RIFLEMAN: 'bullet',
  STORMTROOPER: 'bullet',
  MACHINE_GUNNER: 'bullet',
  SNIPER: 'bullet',
  BAZOOKA: 'rocket',
  OFFICER: 'bullet',
  MOTORCYCLE: 'bullet',
  ARMORED_CAR: 'bullet',
  TANK: 'shell',
  FIELD_GUN: 'shell',
  ROCKET_LAUNCHER: 'rocket',
  FLAK_CANNON: 'shell',
  RECON_PLANE: 'bullet',
  FIGHTER: 'bullet',
  BOMBER: 'bomb',
  ZEPPELIN: 'bomb',
  RADIUM_GRENADIER: 'bullet',
  COBALT_SENTINEL: 'bullet',
  ISOTOPE_SNIPER: 'bullet',
  ATOMIC_SAPPER: 'shell',
  GAMMA_TEMPLAR: 'lightning',
  ASH_DRAGOON: 'bullet',
  PALE_OUTRIDER: 'orb',
  RADIUM_COURIER: 'bullet',
  ISOTOPE_BIKE: 'bullet',
  COBALT_SIDECAR: 'bullet',
  PALE_HUNTER_BIKE: 'bullet',
  GAMMA_TRIKE: 'shell',
  APOCALYPSE_BIKE: 'rocket',
  RADIUM_SCOUT_CAR: 'bullet',
  COBALT_HALFTRACK: 'shell',
  ISOTOPE_TANK_HUNTER: 'shell',
  MAUSOLEUM_TANK: 'shell',
  GAMMA_FLAK_CRAWLER: 'shell',
  APOCALYPSE_CRAWLER: 'rocket',
  RADIUM_RECON: 'bullet',
  ISOTOPE_INTERCEPTOR: 'bullet',
  COBALT_ATTACK_PLANE: 'bullet',
  PALE_NIGHT_FIGHTER: 'bullet',
  GAMMA_BOMBER: 'bomb',
  APOCALYPSE_WING: 'bomb',
  RADIUM_GYRO: 'bullet',
  ISOTOPE_HELICOPTER: 'rocket',
  COBALT_GUNSHIP: 'rocket',
  PALE_HUNTER_HELI: 'shell',
  GAMMA_HELICOPTER: 'shell',
  APOCALYPSE_HELICOPTER: 'rocket',
} satisfies Partial<Record<UnitKind, ProjectileKind>>;
const automatic = new Set<UnitKind>([
  'STORMTROOPER',
  'MACHINE_GUNNER',
  'MOTORCYCLE',
  'ARMORED_CAR',
  'FIGHTER',
  'RADIUM_GRENADIER',
  'ISOTOPE_BIKE',
  'COBALT_SIDECAR',
  'RADIUM_SCOUT_CAR',
  'ISOTOPE_INTERCEPTOR',
  'COBALT_ATTACK_PLANE',
  'PALE_NIGHT_FIGHTER',
]);
export function projectileProfile(unit: UnitKind, targetAirborne = false) {
  let kind = (PROJECTILE_WEAPONS as Partial<Record<UnitKind, ProjectileKind>>)[unit];
  if (!kind) return null;
  // Aircraft use defensive guns against other aircraft, not falling bombs.
  if (kind === 'bomb' && targetAirborne) kind = 'bullet';
  const radioactive = !!UNIT_PROFILES[unit].radioactive;
  const color =
    unit === 'GLOCKE_APOCALYPSE' || unit === 'GLOCKE_VRIL'
      ? 0xbaff55
      : radioactive
        ? 0xbaff55
        : kind === 'orb'
          ? 0xc08cff
          : kind === 'lightning'
            ? 0x98eaff
            : kind === 'flame'
              ? 0x87e76a
              : 0xffd69a;
  const arc = targetAirborne
    ? 0
    : INDIRECT_FIRE_UNITS.includes(unit)
      ? 100
      : kind === 'shell'
        ? 0
        : kind === 'bomb'
          ? 65
          : kind === 'arrow' || kind === 'bolt'
            ? 24
            : kind === 'rocket'
              ? 14
              : 0;
  return {
    kind,
    color,
    radioactive,
    arc,
    burst: kind === 'bullet' && automatic.has(unit) ? 3 : 1,
    explosive: ['shell', 'rocket', 'bomb', 'stone'].includes(kind),
  };
}
export type ProjectileProfile = NonNullable<ReturnType<typeof projectileProfile>>;
export type ShotPoint = { x: number; y: number };
export function projectilePosition(
  from: ShotPoint,
  to: ShotPoint,
  progress: number,
  arc: number,
): ShotPoint {
  const t = Math.max(0, Math.min(1, progress));
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t - 4 * arc * t * (1 - t),
  };
}
export function projectileDuration(kind: ProjectileKind, distance: number) {
  const fast = kind === 'bullet' || kind === 'lightning';
  return Math.min(fast ? 420 : 950, Math.max(fast ? 180 : 360, distance * (fast ? 0.8 : 2)));
}
