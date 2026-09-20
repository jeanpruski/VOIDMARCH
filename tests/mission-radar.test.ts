import { describe, expect, it } from 'vitest';
import type { MissionsView } from '@voidmarch/shared';
import { missionBearing } from '../apps/web/src/capital-radar';
import { hexToPixel } from '../apps/web/src/map-geometry';

const view = { x: -400, y: -300, width: 800, height: 600 };
const mission: NonNullable<MissionsView['active']> = {
  id: 'mission',
  title: 'Forteresse lointaine',
  difficulty: 'Assaut',
  level: 2,
  objective: 'COMMANDER',
  buildings: ['VILLAGE'],
  units: [],
  abandonmentCost: {},
  realmId: 'a',
  ownerId: 'mission-owner',
  objectiveId: 'commander',
  startedAt: 0,
  q: 40,
  r: 0,
  distance: 40,
  remainingUnits: 1,
  remainingBuildings: 1,
  objectiveHp: 100,
  objectivePosition: { q: 35, r: 0 },
};

describe('repérage des missions et aventures en cours', () => {
  it('suit la position réelle du commandant et mesure depuis la caméra', () => {
    expect(missionBearing(view, mission)).toMatchObject({
      edge: 'right',
      distance: 35,
      label: 'Mission',
    });
    const center = hexToPixel({ q: 10, r: 0 });
    expect(missionBearing({ ...view, x: center.x - 400 }, mission)?.distance).toBe(25);
    expect(missionBearing(view, { ...mission, objectivePosition: { q: -35, r: 0 } })?.edge).toBe(
      'left',
    );
  });
  it('conserve le repère du lieu maritime pendant le retour de son porteur', () => {
    const expedition = {
      ...mission,
      q: 30,
      r: -60,
      expedition: {
        siteId: 'boyard',
        mode: 'EXTRACT' as const,
        route: 'SEA' as const,
        targetDistance: 60,
        phase: 'RETURN' as const,
        carrierId: 'carrier',
      },
      objectivePosition: { q: 0, r: 0 },
    };
    expect(missionBearing(view, expedition)).toMatchObject({
      edge: 'top',
      distance: 60,
      label: 'Expédition',
      position: { q: 30, r: -60 },
    });
  });
  it('masque le repère quand le lieu entre dans la vue, y compris par dézoom', () => {
    const near = { ...mission, objectivePosition: { q: 4, r: 0 } };
    expect(missionBearing(view, near)).toBeNull();
    expect(missionBearing({ x: -100, y: -75, width: 200, height: 150 }, near)).not.toBeNull();
  });
  it('ne garde aucun repère après la fin ou l’abandon', () => {
    expect(missionBearing(view, undefined)).toBeNull();
  });
});
