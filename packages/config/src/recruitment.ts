import type { BuildingKind, UnitKind, UnitProfile } from './index';

/** A building level is a local training milestone, not the unit's historical era. */
export const RECRUITMENT_TRACKS: Partial<Record<BuildingKind, readonly (readonly UnitKind[])[]>> = {
  SHIPYARD: [
    ['WAR_GALLEY', 'SCOUT_LONGSHIP'],
    ['CANNON_FRIGATE', 'ESCORT_CORVETTE'],
    ['SONAR_DESTROYER'],
    ['MISSILE_ESCORT'],
    ['NUCLEAR_DREADNOUGHT'],
  ],
  // Surface patrol and escort first; stealth submarines retain their levels 3–5.
  SUBMARINE_BASE: [
    ['SONAR_DESTROYER'],
    ['MISSILE_ESCORT'],
    ['BLACK_SUBMARINE'],
    ['HUNTER_SUBMARINE'],
    ['ABYSSAL_SUBMARINE'],
  ],
  BARRACKS: [
    [],
    ['BERSERKER'],
    ['RIFLEMAN', 'STORMTROOPER', 'OFFICER'],
    ['COMMANDO'],
    ['NEUTRON_GUARD', 'RADIUM_GRENADIER'],
  ],
  ARCHERY: [
    ['ARCHER', 'LONGBOWMAN'],
    ['CROSSBOW', 'RANGER'],
    ['SNIPER'],
    ['RAIL_SNIPER'],
    ['ISOTOPE_SNIPER'],
  ],
  STABLE: [['MOUNTED_OUTRIDER', 'KNIGHT', 'LIGHT_CAVALRY'], ['CUIRASSIER'], [], [], []],
  WORKSHOP: [['RAM', 'SIEGE'], [], ['ASSAULT_SAPPER'], ['DRONE_OPERATOR'], ['ATOMIC_SAPPER']],
  MONASTERY: [['HEALER'], ['PALADIN'], ['VOID_ACOLYTE'], ['TESLA_TROOPER'], ['GAMMA_PALADIN']],
  FORT: [
    [],
    ['BERSERKER', 'CROSSBOW', 'IMPERIAL_PIKEMAN'],
    ['MACHINE_GUNNER', 'BAZOOKA'],
    ['TESLA_TROOPER', 'IRON_REVENANT'],
    ['COBALT_SENTINEL', 'NEUTRON_GUARD'],
  ],
  ARSENAL: [
    ['RIFLEMAN', 'OFFICER'],
    ['STORMTROOPER', 'MACHINE_GUNNER', 'SNIPER', 'BAZOOKA'],
    ['ASSAULT_SAPPER', 'ASH_FLAMETHROWER'],
    ['RAIL_SNIPER', 'COMMANDO'],
    ['RADIUM_GRENADIER', 'ISOTOPE_SNIPER'],
  ],
  GARAGE: [['MOTORCYCLE'], ['ARMORED_CAR'], [], ['STEALTH_BIKE'], []],
  TANK_FACTORY: [['TANK'], ['FIELD_GUN', 'CASEMATE_HUNTER'], [], ['SIEGE_WALKER', 'HEX_TANK'], []],
  GUN_BATTERY: [['MORTAR'], ['FIELD_GUN'], [], [], []],
  FLAK_BATTERY: [
    ['FLAK_CANNON'],
    ['SANG_FLAK', 'ABYS_FLAK', 'RONC_FLAK', 'GIVR_FLAK'],
    ['GAMMA_TRIKE'],
    ['GAMMA_FLAK_CRAWLER'],
    ['NEUTRON_FLAK'],
  ],
  AERODROME: [['RECON_PLANE'], ['FIGHTER', 'BOMBER'], ['DIVE_BOMBER'], ['NIGHT_INTERCEPTOR'], []],
  AIRSHIP_YARD: [
    ['WAR_BALLOON'],
    ['ZEPPELIN'],
    ['TESLA_AIRSHIP'],
    ['ISOTOPE_AIRSHIP'],
    ['APOCALYPSE_WING'],
  ],
  DRAGON_ROOST: [
    ['ASH_DRAKE'],
    ['OCCULT_DRAGON'],
    ['STORM_WYVERN'],
    ['RADIUM_DRAGON'],
    ['REACTOR_SERAPH'],
  ],
  HELIPAD: [
    ['RADIUM_GYRO'],
    ['ISOTOPE_HELICOPTER'],
    ['COBALT_GUNSHIP'],
    ['PALE_HUNTER_HELI', 'GAMMA_HELICOPTER'],
    ['APOCALYPSE_HELICOPTER'],
  ],
  ATOMIC_FOUNDRY: [
    ['ISOTOPE_TANK_HUNTER'],
    ['GAMMA_FLAK_CRAWLER'],
    ['MAUSOLEUM_TANK'],
    ['APOCALYPSE_CRAWLER'],
    ['REACTOR_DREADNOUGHT'],
  ],
  CRYPT_BARRACKS: [
    ['GHOUL_INFANTRY'],
    ['SPECTRAL_RIDER'],
    ['PALE_OUTRIDER'],
    ['SOL_KHOPESH'],
    ['PALE_EXECUTIONER', 'NEUTRON_GUARD'],
  ],
  TESLA_COIL: [
    ['TESLA_TROOPER'],
    ['IRON_REVENANT'],
    ['RAIL_SNIPER'],
    ['DRONE_OPERATOR'],
    ['GAMMA_TEMPLAR'],
  ],
  OCCULT_LAB: [
    ['VOID_ACOLYTE'],
    ['IRON_REVENANT'],
    ['TESLA_TROOPER'],
    ['DRONE_OPERATOR'],
    ['PALE_EXECUTIONER'],
  ],
  BLACK_OBSERVATORY: [
    ['HEX_HUNTER'],
    ['COMMANDO'],
    ['DRONE_OPERATOR'],
    ['ISOTOPE_SNIPER'],
    ['PALE_HUNTER_BIKE'],
  ],
  ROCKET_SILO: [
    ['ROCKET_LAUNCHER'],
    ['MISSILE_TANK'],
    ['GAMMA_TRIKE'],
    ['SOL_APOPHIS_BATTERY', 'CYB_OROCHI_MISSILES'],
    ['APOCALYPSE_CRAWLER'],
  ],
  GLOCKE_COMPLEX: [
    ['GLOCKE_VRIL'],
    ['GLOCKE_WACHT'],
    ['GLOCKE_NACHT'],
    ['GLOCKE_STURM'],
    ['GLOCKE_APOCALYPSE'],
  ],
};

export function arrangeRecruitment(
  source: Record<UnitKind, UnitProfile>,
  tiers: Record<UnitKind, number>,
): Record<UnitKind, UnitProfile> {
  const profiles = Object.fromEntries(
    Object.entries(source).map(([id, original]) => {
      const kind = id as UnitKind;
      const recruitAt = original.recruitAt.filter((b) => b !== 'LIBRARY');
      // Legacy profiles had no level: radioactive weapons should not unlock at level 1
      // of a medieval building. Specialized advanced facilities override this below.
      const level =
        original.minRecruitLevel ??
        (original.radioactive ? 5 : Math.min(5, Math.max(1, tiers[kind])));
      const civilian =
        original.builder || original.healer || kind === 'TERRAFORMER' || original.hero;
      return [
        kind,
        {
          ...original,
          recruitAt,
          requires: [...original.requires],
          recruitLevels: Object.fromEntries(recruitAt.map((b) => [b, civilian ? 1 : level])),
        },
      ];
    }),
  ) as Record<UnitKind, UnitProfile>;
  for (const [building, levels] of Object.entries(RECRUITMENT_TRACKS)) {
    const b = building as BuildingKind;
    levels.forEach((kinds, index) =>
      kinds.forEach((kind) => {
        const p = profiles[kind];
        if (!p.recruitAt.includes(b)) p.recruitAt.push(b);
        p.recruitLevels![b] = index + 1;
      }),
    );
  }
  // Alternative recruitment must retain the technological access of the original
  // facility, not allow a medieval fort to skip the industrial/occult research tree.
  const research: Partial<Record<UnitKind, BuildingKind[]>> = {
    RIFLEMAN: ['MUNITIONS'],
    STORMTROOPER: ['MUNITIONS'],
    OFFICER: ['MUNITIONS'],
    SNIPER: ['MUNITIONS'],
    MACHINE_GUNNER: ['MUNITIONS'],
    BAZOOKA: ['MUNITIONS'],
    IRON_REVENANT: ['OCCULT_LAB'],
    TESLA_TROOPER: ['OCCULT_LAB'],
    RAIL_SNIPER: ['RADIO', 'TESLA_COIL'],
  };
  for (const [id, p] of Object.entries(profiles)) {
    const kind = id as UnitKind;
    p.requires = [...new Set([...p.requires, ...(research[kind] ?? [])])];
    p.minRecruitLevel = p.recruitAt.length ? p.recruitLevels![p.recruitAt[0]] : undefined;
  }
  return profiles;
}
