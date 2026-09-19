import type { Terrain, UnitKind, UnitProfile } from './index';
import { unitUniverse } from './unit-universes';

export interface TerrainAffinity {
  terrain: Terrain;
  attack: number;
  defense: number;
}
const affinity = (terrain: Terrain, attack: number, defense: number): TerrainAffinity => ({
  terrain,
  attack,
  defense,
});
/** Percentages affect trained combat statistics, not HP, mobility or counter bonuses.
 * Each terrain has one entry: role and culture never stack on the same hex. */
export function createTerrainAffinities(
  profiles: Record<UnitKind, UnitProfile>,
  units: Record<UnitKind, { attack: number; range: number }>,
): Record<UnitKind, TerrainAffinity[]> {
  const specific: Partial<Record<UnitKind, TerrainAffinity[]>> = {
    MILITIA: [affinity('PLAIN', 15, 15)],
    INFANTRY: [affinity('RUINS', 15, 25)],
    GUARD: [affinity('RUINS', 10, 30), affinity('HILL', 0, 20)],
    SPEARMAN: [affinity('PLAIN', 20, 20)],
    HALBERDIER: [affinity('PLAIN', 15, 30)],
    BERSERKER: [affinity('FOREST', 30, 0)],
    SCOUT: [affinity('FOREST', 15, 25), affinity('HILL', 15, 10)],
    ARCHER: [affinity('HILL', 25, 10)],
    LONGBOWMAN: [affinity('HILL', 30, 0)],
    CROSSBOW: [affinity('RUINS', 25, 20)],
    RANGER: [affinity('FOREST', 30, 25)],
    SNIPER: [affinity('HILL', 25, 10), affinity('MOUNTAIN', 30, 15)],
    RAIL_SNIPER: [affinity('HILL', 30, 10), affinity('RUINS', 20, 15)],
    COMMANDO: [affinity('FOREST', 25, 20), affinity('RUINS', 20, 20)],
    MACHINE_GUNNER: [affinity('PLAIN', 0, 30), affinity('RUINS', 20, 20)],
    RIFLEMAN: [affinity('HILL', 20, 15)],
    STORMTROOPER: [affinity('RUINS', 30, 10)],
    PALADIN: [affinity('RUINS', 15, 30)],
    HEX_HUNTER: [affinity('RUINS', 25, 15), affinity('CORRUPTION', 20, 20)],
    VOID_ACOLYTE: [affinity('CORRUPTION', 30, 15), affinity('ALIEN', 25, 20)],
  };
  return Object.fromEntries(
    Object.entries(profiles).map(([id, p]) => {
      const kind = id as UnitKind;
      if (p.flying || p.hero || p.builder || units[kind].attack <= 0) return [kind, []];
      if (p.naval)
        return [
          kind,
          [affinity(p.submarine ? 'SEA' : 'COAST', p.submarine ? 20 : 10, p.submarine ? 10 : 15)],
        ];
      const family = unitUniverse(kind)?.family;
      const attack = p.siege || p.mounted ? 30 : p.armored ? 20 : 25;
      const defense = p.siege ? 10 : p.armored ? 30 : p.mounted ? 15 : 20;
      const mobile = p.mechanical || p.mounted;
      let entries: TerrainAffinity[];
      switch (family) {
        case 'blood':
          entries = [affinity('PLAIN', attack, defense)];
          break;
        case 'abyss':
          entries = [
            affinity('RIVER', attack, defense),
            ...(!mobile ? [affinity('MARSH', attack, defense)] : []),
          ];
          break;
        case 'briar':
          entries = [affinity('FOREST', attack, defense)];
          break;
        case 'frost':
          entries = [
            affinity('HILL', attack, defense),
            ...(!mobile ? [affinity('MOUNTAIN', attack, defense)] : []),
          ];
          break;
        case 'solar':
          entries = [affinity('RUINS', 20, 30), affinity('CORRUPTION', attack, defense)];
          break;
        case 'neon':
          entries = [affinity('RUINS', 30, 15), affinity('PLAIN', 0, 25)];
          break;
        default:
          entries =
            specific[kind] ??
            (p.radioactive
              ? [affinity('CORRUPTION', 25, 20)]
              : p.mounted
                ? [affinity('PLAIN', 30, 15)]
                : p.mechanical && p.armored
                  ? [affinity('PLAIN', 15, 30)]
                  : p.siege
                    ? [affinity('HILL', 25, 10)]
                    : p.mechanical
                      ? [affinity('PLAIN', 25, 15)]
                      : units[kind].range > 1
                        ? [affinity('HILL', 20, 15)]
                        : [affinity('RUINS', 15, 25)]);
      }
      return [kind, entries];
    }),
  ) as Record<UnitKind, TerrainAffinity[]>;
}
