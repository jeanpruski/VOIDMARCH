import { type UnitKind, UNIT_PROFILES } from '@voidmarch/config';
import { hash } from '@voidmarch/game-rules';
import type { MissionOffer } from '@voidmarch/shared';

type ArmyPools = {
  foot: UnitKind[];
  mobile: UnitKind[];
  artillery: UnitKind[];
  air: UnitKind[];
  elite: UnitKind[];
};
/** Historical era is separate from a unit's local recruiter level. */
const armies: ArmyPools[] = [
  {
    foot: ['MILITIA', 'ARCHER', 'GUARD', 'SPEARMAN', 'INFANTRY'],
    mobile: ['MOUNTED_OUTRIDER'],
    artillery: ['RAM', 'SIEGE'],
    air: [],
    elite: ['GUARD'],
  },
  {
    foot: ['MUSKETEER', 'CROSSBOW', 'IMPERIAL_GRENADIER', 'IMPERIAL_PIKEMAN'],
    mobile: ['KNIGHT', 'LIGHT_CAVALRY', 'BLACK_DRAGOON'],
    artillery: ['IMPERIAL_CANNON'],
    air: [],
    elite: ['PALADIN'],
  },
  {
    foot: ['RIFLEMAN', 'MACHINE_GUNNER', 'OFFICER', 'STORMTROOPER', 'BAZOOKA'],
    mobile: ['MOTORCYCLE', 'ARMORED_CAR', 'TANK'],
    artillery: ['MORTAR', 'FIELD_GUN', 'FLAK_CANNON'],
    air: ['FIGHTER', 'BOMBER', 'DIVE_BOMBER'],
    elite: ['TANK', 'ZEPPELIN', 'ASH_DRAKE'],
  },
  {
    foot: ['COMMANDO', 'TESLA_TROOPER', 'IRON_REVENANT', 'HEX_HUNTER', 'DRONE_OPERATOR'],
    mobile: ['STEALTH_BIKE', 'SIEGE_WALKER', 'HEX_TANK'],
    artillery: ['FIELD_GUN', 'FLAK_CANNON'],
    air: ['NIGHT_INTERCEPTOR', 'TESLA_AIRSHIP', 'STORM_WYVERN'],
    elite: ['OCCULT_DRAGON', 'TESLA_AIRSHIP', 'HEX_TANK'],
  },
  {
    foot: [
      'RADIUM_GRENADIER',
      'COBALT_SENTINEL',
      'ISOTOPE_SNIPER',
      'NEUTRON_GUARD',
      'ATOMIC_SAPPER',
    ],
    mobile: ['ISOTOPE_TANK_HUNTER', 'MAUSOLEUM_TANK', 'APOCALYPSE_CRAWLER'],
    artillery: ['GAMMA_FLAK_CRAWLER', 'NEUTRON_FLAK'],
    air: ['ISOTOPE_AIRSHIP', 'RADIUM_DRAGON', 'APOCALYPSE_HELICOPTER'],
    elite: ['GLOCKE_APOCALYPSE', 'REACTOR_SERAPH', 'REACTOR_DREADNOUGHT'],
  },
];
export const MISSION_SIZES = {
  Escarmouche: [2, 5],
  Assaut: [6, 10],
  Siège: [12, 20],
  'Grande campagne': [20, 30],
} as const;
export function missionRoster(
  level: number,
  difficulty: MissionOffer['difficulty'],
  seed: string,
): UnitKind[] {
  const pool = armies[level - 1];
  const [min, max] = MISSION_SIZES[difficulty];
  const count = min + Math.floor(hash(`${seed}:size`) * (max - min + 1));
  const result: UnitKind[] = [];
  const pick = (choices: UnitKind[], slot: number) =>
    choices[Math.floor(hash(`${seed}:unit:${slot}`) * choices.length)];
  for (let i = 0; i < count; i++) {
    let choices = pool.foot;
    // Keep the mortal commander on foot, with support and aircraft spread through the garrison.
    if (difficulty !== 'Escarmouche' && i > 0) {
      if (i % 5 === 1) choices = pool.mobile;
      else if (i % 5 === 2) choices = pool.artillery;
      else if (i % 5 === 4 && pool.air.length) choices = pool.air;
      if (difficulty === 'Grande campagne' && i >= count - 2) choices = pool.elite;
    }
    result.push(pick(choices, i));
  }
  return result;
}
/** Place the least mobile ground troops first; flyers can use the remaining terrain. */
export function missionPlacementOrder(units: UnitKind[]) {
  return units
    .map((kind, index) => ({ kind, index }))
    .sort(
      (a, b) =>
        Number(!!UNIT_PROFILES[a.kind].flying) - Number(!!UNIT_PROFILES[b.kind].flying) ||
        Number(!!(UNIT_PROFILES[b.kind].mechanical || UNIT_PROFILES[b.kind].mounted)) -
          Number(!!(UNIT_PROFILES[a.kind].mechanical || UNIT_PROFILES[a.kind].mounted)) ||
        a.index - b.index,
    );
}
