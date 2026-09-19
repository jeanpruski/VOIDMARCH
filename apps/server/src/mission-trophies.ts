import { EMBLEM_IDS, EMBLEM_NAMES } from '@voidmarch/config';
import { hash, missionWallCount } from '@voidmarch/game-rules';
import type { ActiveMission, MissionMedal, MissionTrophy } from '@voidmarch/shared';

/** The server-created mission UUID randomises the design once; the stored award never rerolls. */
export function createMissionTrophy(
  mission: ActiveMission,
  completedAt: number,
  captured: MissionTrophy['captured'],
  reward: MissionTrophy['reward'],
): MissionTrophy {
  const pick = <T>(values: readonly T[], salt: string): T =>
    values[Math.floor(hash(`${mission.id}:medal:${salt}`) * values.length)];
  const shape = pick(['round', 'shield', 'star', 'diamond'] as const, 'shape');
  const emblem = pick(EMBLEM_IDS, 'emblem');
  const ribbon = pick(
    ['crimson', 'pine', 'midnight', 'violet', 'ochre', 'slate'] as const,
    'ribbon',
  );
  const epithet = pick(
    ['de la Cendre', 'du Dernier Serment', 'du Voile', 'de Minuit', 'des Marches', 'du Corbeau'],
    'name',
  );
  const metal: MissionMedal['metal'] = ['Siège', 'Grande campagne'].includes(mission.difficulty)
    ? 'gold'
    : mission.difficulty === 'Assaut'
      ? 'silver'
      : 'bronze';
  return {
    id: mission.id,
    medal: { name: `${EMBLEM_NAMES[emblem]} ${epithet}`, shape, emblem, ribbon, metal },
    mission: structuredClone({
      title: mission.title,
      difficulty: mission.difficulty,
      level: mission.level,
      objective: mission.objective,
      q: mission.q,
      r: mission.r,
      startedAt: mission.startedAt,
      distance: mission.distance,
      units: mission.units,
      buildings: mission.buildings,
      wall: mission.wall,
      wallRadius: mission.wallRadius,
      expedition: mission.expedition,
    }),
    losses: { units: mission.losses?.units ?? 0, buildings: mission.losses?.buildings ?? 0 },
    completedAt,
    captured: { ...captured },
    destroyed: {
      units: Math.max(0, mission.units.length - captured.units),
      buildings: Math.max(0, mission.buildings.length - captured.buildings),
      walls: Math.max(0, missionWallCount(mission) - captured.walls),
    },
    reward: { ...reward },
  };
}
