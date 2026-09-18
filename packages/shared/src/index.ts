import type { MissionBoard, MissionsView, MissionVictory } from './missions';
export type {
  MissionOffer,
  ActiveMission,
  MissionBoard,
  MissionsView,
  MissionTrophy,
  MissionMedal,
  MissionVictory,
} from './missions';
import type { StrategyState, StrategyView } from './strategy';
export * from './strategy';
import type {
  Wallet,
  Biome,
  Faction,
  Terrain,
  UnitKind,
  BuildingKind,
  Settings,
  TurretLevel,
  WallKind,
  NpcKind,
  HeroAppearance,
  HeroPower,
} from '@voidmarch/config';
export interface Hex {
  q: number;
  r: number;
}
export interface Tile extends Hex {
  biome?: Biome;
  terrain: Terrain;
  ownerId?: string;
  /** Territory dependent on this realm’s currently closed wall enclosure. */
  enclosureOwnerId?: string;
  buildingId?: string;
  road?: boolean;
  /** Builder of the road; does not grant ownership or vision of the land. */
  roadOwnerId?: string;
  poi?: 'COMMON' | 'UNCOMMON' | 'RARE' | 'MYTHIC';
  capture?: { by: string; points: number };
  exhausted?: boolean;
}
export interface SeenTile extends Tile {
  seenAt: number;
}
export interface ViewTile extends Hex {
  biome?: Biome;
  visibility: 'UNKNOWN' | 'EXPLORED' | 'VISIBLE';
  terrain?: Terrain;
  ownerId?: string;
  /** Territory dependent on this realm’s currently closed wall enclosure. */
  enclosureOwnerId?: string;
  building?: Building;
  road?: boolean;
  roadOwnerId?: string;
  poi?: Tile['poi'];
  exhausted?: boolean;
  capture?: Tile['capture'];
}
export interface Unit extends Hex {
  /** Passengers exist only inside their carrier, never in the board unit dictionary. */
  cargo?: Unit[];
  carrierId?: string;
  victories?: number;
  nickname?: string;
  expedition?: { title: string };
  hero?: { appearance: HeroAppearance; name: string; xp: number };
  npc?: {
    kind: NpcKind;
    maxHp: number;
    attack: number;
    defense: number;
    reward: Partial<Wallet>;
    bonusAP: number;
    expiresAt: number;
    contributions: Record<string, number>;
  };
  /** Permanent server-generated percentage bonus, absent for ordinary units. */
  rareBonus?: number;
  trainingBonus?: number;
  id: string;
  ownerId: string;
  kind: UnitKind;
  hp: number;
  createdAt: number;
  updatedAt: number;
}
export interface Building extends Hex {
  /** A fixed weapon attachment; its survival and ownership follow the wall. */
  turretLevel?: TurretLevel;
  turretConstructionCost?: Partial<Wallet>;
  /** Actual initial construction payment, excluding later upgrades. */
  constructionCost?: Partial<Wallet>;
  id: string;
  ownerId: string;
  kind: BuildingKind;
  hp: number;
  level: number;
  population: number;
  name: string;
  createdAt: number;
  updatedAt: number;
}
export type ArmyFormation = 'COMPACT' | 'LINE' | 'PROTECTED';
export interface SavedArmy {
  id: string;
  name: string;
  unitIds: string[];
  formation: ArmyFormation;
  updatedAt: number;
}
export interface Realm {
  armies?: SavedArmy[];
  hero?: {
    appearance: HeroAppearance;
    xp: number;
    recoverAt?: number;
    cooldowns: Partial<Record<HeroPower, number>>;
  };
  id: string;
  name: string;
  faction: Faction;
  bot: boolean;
  personality?: string;
  temporary?: boolean;
  createdAt: number;
  wallet: Wallet;
  ap: number;
  codeSessionId?: string;
  unlimitedAP?: boolean;
  capitalRadar?: boolean;
  apAt: number;
  economyAt: number;
  lastSeen: number;
  offlineAt?: number;
  protectedUntil: number;
  defeatedAt?: number;
  capital: Hex;
  explored: Record<string, ViewTile>;
  progression: { exploration: number; battles: number; commerce: number; development: number };
  relics: string[];
  settings: Settings;
  nextBotAt: number;
  connections?: never;
}
export interface Proposal {
  id: string;
  kind: 'TRIBUTE' | 'TRADE';
  from: string;
  to: string;
  payer: string;
  offer: Wallet;
  request: Wallet;
  duration: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  createdAt: number;
  expiresAt: number;
  parentId?: string;
}
export interface Treaty {
  id: string;
  a: string;
  b: string;
  kind: 'TRUCE' | 'TRADE';
  startsAt: number;
  endsAt: number;
  payment: Wallet;
  proposalId: string;
  nextCaravanAt: number;
  physicalTrade?: boolean;
}
export interface Caravan extends Hex {
  delivery?: boolean;
  id: string;
  ownerId: string;
  partnerId: string;
  from: Hex;
  to: Hex;
  path: Hex[];
  startedAt: number;
  arrivesAt: number;
  cargo: Wallet;
  treatyId: string;
}
export interface WorldEvent extends Hex {
  id: string;
  kind:
    | 'MONOLITH'
    | 'METEOR'
    | 'FORTRESS'
    | 'RED_MOON'
    | 'MIST'
    | 'PORTAL'
    | 'COLOSSUS'
    | 'ROYAL_CARAVAN';
  title: string;
  description: string;
  startsAt: number;
  endsAt: number;
  global: boolean;
  claimedBy?: string;
  reward: Partial<Wallet>;
  relic?: string;
}
export interface CombatShot {
  wallKind?: WallKind;
  from: Hex;
  unitKind: UnitKind;
  targetAirborne: boolean;
}
export interface JournalEntry {
  victory?: MissionVictory;
  shot?: CombatShot;
  /** Confirmed strike damage, retained even when the target is destroyed. */
  damage?: {
    amount: number;
    targetOwnerId: string;
    targetKind: 'unit' | 'building';
    airborne: boolean;
    retaliation: boolean;
  };
  id: string;
  at: number;
  text: string;
  kind: 'WORLD' | 'ECONOMY' | 'COMBAT' | 'DIPLOMACY' | 'REALM';
  realmIds?: string[];
  q?: number;
  r?: number;
}
export interface RealmArchive {
  version: 1;
  createdAt: number;
  realmValue: number;
  realm: Realm;
  units: Unit[];
  buildings: Building[];
  tiles: Tile[];
}
export interface GameState {
  missions?: Record<string, MissionBoard>;
  strategy?: StrategyState;
  version: 1;
  balanceVersion?: number;
  seed: string;
  createdAt: number;
  realms: Record<string, Realm>;
  units: Record<string, Unit>;
  buildings: Record<string, Building>;
  tiles: Record<string, Tile>;
  proposals: Record<string, Proposal>;
  treaties: Record<string, Treaty>;
  caravans: Record<string, Caravan>;
  events: Record<string, WorldEvent>;
  journal: JournalEntry[];
  archives: Record<string, RealmArchive>;
  nextEventAt: number;
  npcZoneChecks?: Record<string, number>;
  botSerial: number;
  revision: number;
}
export interface PublicRealm {
  connectedSince?: number;
  onMission?: boolean;
  /** Public total; the mission history remains private. Optional for older snapshots. */
  trophyCount?: number;
  id: string;
  name: string;
  faction: Faction;
  bot: boolean;
  online: boolean;
  protectedUntil: number;
  emblem: string;
  color: string;
  bannerShape: string;
  stats: {
    territory: number;
    military: number;
    wealth: number;
    population: number;
    development: number;
    exploration: number;
    commerce: number;
    relics: number;
  };
  defeated: boolean;
}
export interface PlayerState extends Omit<
  Realm,
  'explored' | 'nextBotAt' | 'lastSeen' | 'economyAt' | 'apAt'
> {
  nextAPAt: number;
  income: Wallet;
  capacity: number;
  population: number;
  realmValue: number;
}
export type OverviewTile = Pick<ViewTile, 'q' | 'r' | 'terrain' | 'biome' | 'ownerId' | 'visibility'>;
export interface WorldView {
  missions?: MissionsView;
  strategy?: StrategyView;
  /** Secret radar only: never included in ordinary player views. */
  enemyCapitals?: { realmId: string; position: Hex }[];
  overview: OverviewTile[];
  revision: number;
  serverTimestamp: number;
  seed: string;
  player: PlayerState;
  tiles: ViewTile[];
  units: Unit[];
  realms: PublicRealm[];
  proposals: Proposal[];
  treaties: Treaty[];
  caravans: Caravan[];
  events: WorldEvent[];
  journal: JournalEntry[];
  onlineHumans: number;
  botsAwake: boolean;
}
export interface ActionResult {
  /** Actual accepted route, returned only to the player issuing the movement. */
  movement?: { unitId: string; from: Hex; path: Hex[] };
  movements?: { unitId: string; from: Hex; path: Hex[] }[];
  actionId: string;
  accepted: boolean;
  reason?: string;
  serverTimestamp: number;
  newActionPoints: number;
  message?: string;
  revision?: number;
}
export interface AuthUser {
  id: string;
  username: string;
  guest: boolean;
}
