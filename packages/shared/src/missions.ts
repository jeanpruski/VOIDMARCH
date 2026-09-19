import type { BuildingKind, UnitKind, Wallet, EmblemId } from '@voidmarch/config';
import type { Hex } from './index';

export interface ExpeditionDetails {
  siteId: string;
  mode: 'RECON' | 'RECOVER' | 'EXTRACT';
  route: 'LAND' | 'SEA';
  targetDistance: number;
  /** Orientation of the three contiguous site hexagons; immutable after acceptance. */
  orientation?: number;
  phase?: 'VISIT' | 'RETURN';
  carrierId?: string;
  participants?: string[];
  bonus?: Partial<Wallet>;
}

export interface MissionOffer {
  completedBefore?: boolean;
  discoveredBefore?: boolean;
  /** One level above this board's normal access when it was rolled. */
  exceptional?: boolean;
  expedition?: ExpeditionDetails;
  maritime?: boolean;
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
  /** Personal discoveries, also retained when an extraction is later abandoned. */
  discoveredSites?: string[];
  /** Recovery after an abandonment that could not be fully paid. */
  availableAt?: number;
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
  discoveredSites?: string[];
  availableAt?: number;
  trophies?: MissionTrophy[];
  /** Server deadline for unaccepted offers; absent during an active mission. */
  offersRefreshAt?: number;
  offers: MissionOffer[];
  expeditionOffers?: MissionOffer[];
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
  shape:
    | 'round'
    | 'shield'
    | 'star'
    | 'diamond'
    | 'cross'
    | 'hexagon'
    | 'octagon'
    | 'sun'
    | 'oval'
    | 'crest';
  emblem: EmblemId;
  ribbon:
    | 'crimson'
    | 'pine'
    | 'midnight'
    | 'violet'
    | 'ochre'
    | 'slate'
    | 'teal'
    | 'ivory'
    | 'amber'
    | 'black';
  /** Optional so previously awarded medals keep their original appearance. */
  ribbonPattern?: 'classic' | 'stripes' | 'chevron' | 'split' | 'diagonal' | 'cross';
  ornament?: 'none' | 'laurel' | 'wings' | 'swords' | 'chain' | 'rays';
  gem?: 'ruby' | 'emerald' | 'sapphire' | 'amber' | 'amethyst' | 'onyx';
  finish?: 'polished' | 'antique' | 'enamel';
  theme?: 'campaign' | 'land' | 'sea';
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
    | 'expedition'
  >;
  losses?: { units: number; buildings: number };
  completedAt: number;
  reward: Partial<Wallet>;
  captured: { units: number; buildings: number; walls: number };
  destroyed: { units: number; buildings: number; walls: number };
}

export interface MissionVictory extends Hex {
  expedition?: Pick<ExpeditionDetails, 'siteId' | 'mode'>;
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
