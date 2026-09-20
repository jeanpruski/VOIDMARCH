import { EMBLEM_IDS, EMBLEM_NAMES } from '@voidmarch/config';
import { hash, missionWallCount } from '@voidmarch/game-rules';
import type { ActiveMission, MissionMedal, MissionTrophy, GameState } from '@voidmarch/shared';

/** The server-created mission UUID randomises the design once; the stored award never rerolls. */
export function createMissionTrophy(
  mission: ActiveMission,
  completedAt: number,
  captured: MissionTrophy['captured'],
  reward: MissionTrophy['reward'],
): MissionTrophy {
  const pick = <T>(values: readonly T[], salt: string): T =>
    values[Math.floor(hash(`${mission.id}:medal:${salt}`) * values.length)];
  const shape = pick(
    [
      'round',
      'shield',
      'star',
      'diamond',
      'cross',
      'hexagon',
      'octagon',
      'sun',
      'oval',
      'crest',
    ] as const,
    'shape',
  );
  const emblem = pick(EMBLEM_IDS, 'emblem');
  const ribbon = pick(
    [
      'crimson',
      'pine',
      'midnight',
      'violet',
      'ochre',
      'slate',
      'teal',
      'ivory',
      'amber',
      'black',
    ] as const,
    'ribbon',
  );
  const theme = mission.expedition
    ? mission.expedition.route === 'SEA'
      ? 'sea'
      : 'land'
    : 'campaign';
  const ribbonPattern = pick(
    ['classic', 'stripes', 'chevron', 'split', 'diagonal', 'cross'] as const,
    'pattern',
  );
  const ornament = pick(
    ['none', 'laurel', 'wings', 'swords', 'chain', 'rays'] as const,
    'ornament',
  );
  const gem = pick(['ruby', 'emerald', 'sapphire', 'amber', 'amethyst', 'onyx'] as const, 'gem');
  const finish = pick(['polished', 'antique', 'enamel'] as const, 'finish');
  const themedNames =
    theme === 'sea'
      ? [
          'des Profondeurs',
          'des Marées Noires',
          'du Dernier Phare',
          'des Brisants',
          'de l’Abysse',
          'des Océans Perdus',
        ]
      : theme === 'land'
        ? [
            'des Horizons',
            'des Cités Perdues',
            'des Archives Oubliées',
            'des Terres Lointaines',
            'des Ruines',
            'des Pionniers',
          ]
        : ['du Bastion', 'des Victoires', 'du Siège', 'des Lames', 'des Alliés', 'du Rempart'];
  const epithet = pick(
    [
      'de la Cendre',
      'du Dernier Serment',
      'du Voile',
      'de Minuit',
      'des Marches',
      'du Corbeau',
      'du Soleil Noir',
      'de l’Aube',
      'des Braises',
      'du Silence',
      'de l’Éclipse',
      'des Veilleurs',
      ...themedNames,
    ],
    'name',
  );
  const metal: MissionMedal['metal'] = ['Siège', 'Grande campagne'].includes(mission.difficulty)
    ? 'gold'
    : mission.difficulty === 'Assaut'
      ? 'silver'
      : 'bronze';
  return {
    id: mission.id,
    medal: {
      name: `${EMBLEM_NAMES[emblem]} ${epithet}`,
      shape,
      emblem,
      ribbon,
      metal,
      ribbonPattern,
      ornament,
      gem,
      finish,
      theme,
    },
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

/** Award at victory time only: no retroactive sharing on joining, no duplicate or recursive awards. */
export function awardMissionTrophy(s: GameState, ownerId: string, trophy: MissionTrophy): string[] {
  const owner = s.realms[ownerId];
  if (!owner) return [];
  const boards = (s.missions ??= {});
  const board = (boards[ownerId] ??= { generation: 0 });
  if (board.trophies?.some((t) => t.id === trophy.id)) return [];
  (board.trophies ??= []).push(structuredClone(trophy));
  const alliance = Object.values(s.strategy?.alliances ?? {}).find((a) =>
    a.members.includes(ownerId),
  );
  const recipients = [ownerId];
  for (const id of new Set(alliance?.members ?? [])) {
    if (id === ownerId || !s.realms[id]) continue;
    const allyBoard = (boards[id] ??= { generation: 0 });
    if (allyBoard.trophies?.some((t) => t.id === trophy.id)) continue;
    (allyBoard.trophies ??= []).push({
      ...structuredClone(trophy),
      sharedFrom: { realmId: ownerId, realmName: owner.name, allianceName: alliance!.name },
    });
    recipients.push(id);
  }
  return recipients;
}
