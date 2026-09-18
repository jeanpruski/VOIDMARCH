import type { BuildingKind, UnitKind, Wallet } from '@voidmarch/config';
import type { Hex } from './index';

export interface MissionOffer {
  id: string;
  title: string;
  difficulty: 'Escarmouche' | 'Assaut' | 'Siège';
  level: number;
  objective: 'BUILDING' | 'COMMANDER';
  buildings: BuildingKind[];
  units: UnitKind[];
  wall?: BuildingKind;
  abandonmentCost: Partial<Wallet>;
}
export interface ActiveMission extends MissionOffer, Hex {
  id: string;
  realmId: string;
  ownerId: string;
  objectiveId: string;
  startedAt: number;
  distance: number;
}
export interface MissionBoard {
  generation: number;
  active?: ActiveMission;
  lastResult?: {
    title: string;
    outcome: 'VICTORY' | 'ABANDONED';
    units: number;
    buildings: number;
    walls: number;
    at: number;
  };
}
export interface MissionsView {
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
