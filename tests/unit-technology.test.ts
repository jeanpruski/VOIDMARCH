import { describe, expect, it } from 'vitest';
import {
  UNITS,
  UNIT_PROFILES,
  UNIT_ERAS,
  BUILDING_MIN_ERA,
  BUILDING_REQUIREMENTS,
  unitTechnologyLevel,
  recruitmentLevel,
  type UnitKind,
  type BuildingKind,
} from '@voidmarch/config';
const kinds = Object.keys(UNITS) as UnitKind[];
describe('époques historiques et niveaux locaux de formation', () => {
  it.each(kinds)('%s : respecte les infrastructures de son époque', (kind) => {
    const era = unitTechnologyLevel(kind);
    expect(era).toBeGreaterThanOrEqual(1);
    expect(era).toBeLessThanOrEqual(5);
    expect(era).toBeGreaterThanOrEqual(UNIT_ERAS[kind as keyof typeof UNIT_ERAS] ?? 1);
    const queue = [...UNIT_PROFILES[kind].requires];
    const seen = new Set<BuildingKind>();
    while (queue.length) {
      const b = queue.pop()!;
      if (seen.has(b)) continue;
      seen.add(b);
      expect(era).toBeGreaterThanOrEqual(BUILDING_MIN_ERA[b]);
      queue.push(...(BUILDING_REQUIREMENTS[b] ?? []));
    }
    if (UNIT_PROFILES[kind].radioactive) expect(era).toBe(5);
  });
  it('sépare l’époque de la formation locale sans supprimer les unités', () => {
    expect(unitTechnologyLevel('ARCHER')).toBe(1);
    expect(unitTechnologyLevel('RIFLEMAN')).toBe(3);
    expect(recruitmentLevel('RIFLEMAN', 'ARSENAL')).toBe(1);
    expect(recruitmentLevel('RIFLEMAN', 'BARRACKS')).toBe(3);
    expect(unitTechnologyLevel('GLOCKE_VRIL')).toBe(5);
    expect(recruitmentLevel('GLOCKE_VRIL', 'GLOCKE_COMPLEX')).toBe(1);
    expect(unitTechnologyLevel('VOID_ACOLYTE')).toBe(4);
    expect(recruitmentLevel('VOID_ACOLYTE', 'MONASTERY')).toBe(3);
    expect(kinds).toHaveLength(289);
  });
  it('conserve du contenu dans les cinq époques', () => {
    for (let era = 1; era <= 5; era++)
      expect(kinds.filter((k) => unitTechnologyLevel(k) === era).length).toBeGreaterThan(0);
  });
});
