import type { BuildingKind, UnitKind, Wallet } from '@voidmarch/config';
import type { Hex } from './index';

export interface MissionOffer {
  id: string;
  title: string;
  difficulty: 'Escarmouche' | 'Assaut' | 'Siège' | 'Grande campagne';
  level: number;
  objective: 'BUILDING' | 'COMMANDER';
  buildings: BuildingKind[];
  units: UnitKind[];
  wall?: BuildingKind;
  /** Old missions used a radius of 2. */
  wallRadius?: number;
  abandonmentCost: Partial<Wallet>;
  /** Optional for campaigns accepted before resource rewards were introduced. */
  reward?: Partial<Wallet>;
}
export interface ActiveMission extends MissionOffer, Hex {
  losses?: { units: number; buildings: number };
  id: string;
  realmId: string;
  ownerId: string;
  objectiveId: string;
  startedAt: number;
  distance: number;
}
export interface MissionBoard {
  trophies?: MissionTrophy[];
  generation: number;
  active?: ActiveMission;
  lastResult?: {
    title: string;
    outcome: 'VICTORY' | 'ABANDONED';
    trophyId?: string;
    reward?: Partial<Wallet>;
    units: number;
    buildings: number;
    walls: number;
    at: number;
  };
}
export interface MissionsView {
  trophies?: MissionTrophy[];
  /** Server deadline for unaccepted offers; absent during an active mission. */
  offersRefreshAt?: number;
  offers: MissionOffer[];
  active?: ActiveMission & {
    remainingUnits: number;
    remainingBuildings: number;
    objectiveHp: number;
    objectivePosition: Hex;
  };
  allied: ActiveMission[];
  lastResult?: MissionBoard['lastResult'];
}

export interface MissionMedal {
  name: string;
  shape: 'round' | 'shield' | 'star' | 'diamond';
  emblem: 'tower' | 'swords' | 'eye' | 'moon' | 'flame' | 'star';
  ribbon: 'crimson' | 'pine' | 'midnight' | 'violet' | 'ochre' | 'slate';
  metal: 'bronze' | 'silver' | 'gold';
}
export interface MissionTrophy {
  /** Same id as the completed mission; awards cannot duplicate. */
  id: string;
  medal: MissionMedal;
  mission: Pick<
    ActiveMission,
    | 'title'
    | 'difficulty'
    | 'level'
    | 'objective'
    | 'q'
    | 'r'
    | 'startedAt'
    | 'distance'
    | 'units'
    | 'buildings'
    | 'wall'
    | 'wallRadius'
  >;
  losses?: { units: number; buildings: number };
  completedAt: number;
  reward: Partial<Wallet>;
  captured: { units: number; buildings: number; walls: number };
  destroyed: { units: number; buildings: number; walls: number };
}

export interface MissionVictory extends Hex {
  id: string;
  title: string;
  ownerId: string;
  at: number;
  reward: Partial<Wallet>;
  captured: MissionTrophy['captured'];
  destroyed: MissionTrophy['destroyed'];
  losses: { units: number; buildings: number };
  medal: MissionMedal;
}
