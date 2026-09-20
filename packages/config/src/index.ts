export * from './event-loot';
export * from './secret-codes';
export * from './alliance-projects';
export * from './mobility';
export * from './logistics';
import {
  NAVAL_UNITS,
  NAVAL_PROFILES,
  NAVAL_CATEGORIES,
  NAVAL_BUILDINGS,
  NAVAL_BUILDING_CATEGORIES,
} from './naval';
export * from './naval';
export * from './emblems';
export * from './identity';
import { createBiomeAdaptations } from './biome-adaptations';
export { BIOME_ADAPTATION_NAMES } from './biome-adaptations';
export * from './biomes';
import { TRANSPORT_UNITS, TRANSPORT_PROFILES, TRANSPORT_CATEGORIES } from './transports';
export * from './transports';
import { createTerrainAffinities } from './terrain-affinities';
export type { TerrainAffinity } from './terrain-affinities';
import { arrangeRecruitment } from './recruitment';
export { RECRUITMENT_TRACKS } from './recruitment';
import { SPECIALIST_UNITS, SPECIALIST_PROFILES, SPECIALIST_CATEGORIES } from './specialist-units';
export * from './specialist-units';
import {
  balanceProfiles,
  balanceUnits,
  TRAINING_BONUSES,
  PRODUCTION_MULTIPLIERS,
  UPGRADE_MULTIPLIERS,
  PRODUCER_UPGRADE_MULTIPLIERS,
} from './balance';
export { TRAINING_BONUSES, PRODUCTION_MULTIPLIERS } from './balance';
import {
  CAMPAIGN_UNITS,
  CAMPAIGN_PROFILES,
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_INDIRECT,
  CAMPAIGN_RECON,
} from './campaign-units';
export * from './campaign-units';
export * from './unit-universes';
import {
  ELITE_UNITS,
  ELITE_PROFILES,
  ELITE_CATEGORIES,
  ELITE_INDIRECT,
  ELITE_RECON,
} from './elite-units';
export * from './elite-units';
export * from './strategy';
import { STRATEGY, hexArea } from './strategy';
import { ERA_REINFORCEMENT_CATEGORIES } from './era-reinforcements';
import { EPOCH_UNITS, EPOCH_PROFILES } from './epoch-units';
import { GLOCKE_UNITS, GLOCKE_PROFILES } from './glocke';
import { UNIT_TIERS } from './progression';
import { BUILDING_ECONOMIC_TIERS, PRICE_MULTIPLIERS, repriceCatalog, scaleCost } from './economy';
export { BUILDING_ECONOMIC_TIERS, PRICE_MULTIPLIERS } from './economy';
import { RESOURCE_BUILDINGS } from './resource-buildings';
export { RESOURCE_BUILDINGS } from './resource-buildings';
export { GLOCKE_UNITS } from './glocke';
import {
  RADIOACTIVE_UNITS,
  RADIOACTIVE_PROFILES,
  RADIOACTIVE_CATEGORIES,
  RADIOACTIVE_RECON,
} from './radioactive';
export { RADIOACTIVE_UNITS } from './radioactive';
export { NPCS, NPC_RULES, NPC_LEVELS, type NpcKind } from './npcs';
export { BALANCE_VERSION, UNIT_TIERS, TIER_NAMES } from './progression';
export * from './ages';
export * from './development';
export { formatNumber } from './format';
export { UNIT_ERAS } from './epoch-units';
export const GAME_NAME = 'VOIDMARCH';
export * from './hero';
export const STARTING_RESOURCES: Wallet = { GOLD: 500, WOOD: 500, STONE: 500, IRON: 500, FOOD: 0 };
export const RULES = {
  maxAP: 20,
  startingAP: 40,
  constructionRadius: 3,
  guestLifetime: 24 * 60 * 60 * 1000,
  apInterval: 10_000,
  grace: 180_000,
  protection: 600_000,
  defeatCooldown: 600_000,
  botInterval: 600_000,
  botCount: 2,
  chunkSize: 32,
  maxViewChunks: 32,
  realmSpacing: 70,
  settlementScale: 5,
  minTruce: 60_000,
  maxTruce: 7 * 86_400_000,
  tradeDuration: 3_600_000,
};
export const MAX_GROUP_UNITS = 10;
export const MAX_MOVE_STEPS = 20; // Includes long-range cargo aircraft and mounted faction bonuses.

export const ACTION_COST = {
  CONVERT_AP: 0,
  PRODUCE_MOBILITY: 0,
  EMBARK: 1,
  DISEMBARK: 1,
  OPERATION_CREATE: 0,
  OPERATION_JOIN: 0,
  OPERATION_START: 0,
  OPERATION_CANCEL: 0,
  ARMY_SAVE: 0,
  ARMY_DELETE: 0,
  MOVE_GROUP: 0, // Each nested movement pays its ordinary cost.
  MISSION_ACCEPT: 0,
  MISSION_ABANDON: 0,
  PROJECT_CREATE: 0,
  PROJECT_CONTRIBUTE: 0,
  PROJECT_CANCEL: 0,
  ALLIANCE_CREATE: 0,
  ALLIANCE_INVITE: 0,
  ALLIANCE_RESPOND: 0,
  ALLIANCE_LEAVE: 0,
  ALLIANCE_CHAT: 0,
  ALLIANCE_MARK: 0,
  ALLIANCE_UNMARK: 0,
  DECLARE_WAR: 0,
  SETTLE_WAR: 0,
  CLAIM_SITE: 1,
  CLEANUP: 2,
  LAUNCH_NUKE: 10,
  RENAME_UNIT: 0,
  INSTALL_TURRET: 2,
  UPGRADE_TURRET: 2,
  MOVE: 1,
  MOVE_ROAD: 0,
  GATHER: 1,
  ATTACK: 1,
  CAPTURE: 1,
  BUILD: 1,
  ROAD: 1,
  REMOVE_ROAD: 1,
  TERRAFORM: 2,
  RECRUIT: 1,
  REPAIR: 1,
  RESUPPLY: 1,
  DEMOLISH: 1,
  UPGRADE: 2,
  INTERACT: 1,
  ABILITY: 2,
  PROPOSE: 0,
  RESPOND: 0,
  RESPAWN: 0,
} as const;
export const RESOURCES = ['GOLD', 'WOOD', 'STONE', 'IRON', 'FOOD'] as const;
export type Resource = (typeof RESOURCES)[number];
export type Wallet = Record<Resource, number>;
export const RESOURCE_NAMES: Record<Resource, string> = {
  STONE: 'Pierre',
  GOLD: 'Or',
  WOOD: 'Bois',
  IRON: 'Fer',
  FOOD: 'Vivres',
};
export const FACTIONS = {
  ASH: {
    name: 'Ordre de la Cendre',
    short: 'La Cendre',
    color: '#bc9860',
    symbol: 'crown',
    description: 'Sous la cendre, le royaume demeure.',
    bonus: 'Bâtiments 10 % moins coûteux.',
  },
  MASK: {
    name: 'Confrérie du Masque',
    short: 'Le Masque',
    color: '#799484',
    symbol: 'eye',
    description: 'Voir ce que les autres redoutent.',
    bonus: 'Éclaireurs : +2 de vision.',
  },
  IRON: {
    name: 'Cavaliers du Fer Mort',
    short: 'Le Fer Mort',
    color: '#999cb8',
    symbol: 'sword',
    description: 'Le fer se souvient des étoiles.',
    bonus: 'Unités montées : +1 déplacement.',
  },
} as const;
export type Faction = keyof typeof FACTIONS;
export const TERRAINS = {
  SEA: { name: 'Haute mer', color: 0x182e3b, cost: 99, defense: 0, yield: null },
  COAST: { name: 'Eaux côtières', color: 0x2e555b, cost: 99, defense: 0, yield: null },
  BEACH: { name: 'Plage', color: 0x9a9377, cost: 1, defense: 0, yield: null },
  SCORCHED: { name: 'Terres brûlées', color: 0x292624, cost: 1, defense: 0, yield: null },
  PLAIN: { name: 'Plaine', color: 0x465140, cost: 1, defense: 0, yield: 'FOOD' },
  FOREST: { name: 'Forêt ancienne', color: 0x293e34, cost: 2, defense: 1, yield: 'WOOD' },
  HILL: {
    name: 'Collines rocheuses et ferrifères',
    color: 0x666457,
    cost: 2,
    defense: 1,
    yield: 'IRON',
  },
  MOUNTAIN: { name: 'Montagne rocheuse', color: 0x777b74, cost: 3, defense: 3, yield: 'STONE' },
  RIVER: { name: 'Rivière', color: 0x354c50, cost: 3, defense: 0, yield: 'FOOD' },
  MARSH: { name: 'Marais', color: 0x3e4b3c, cost: 3, defense: 1, yield: 'FOOD' },
  RUINS: { name: 'Ruines oubliées', color: 0x655e51, cost: 2, defense: 2, yield: 'GOLD' },
  CORRUPTION: { name: 'Sol corrompu', color: 0x45414b, cost: 2, defense: 0, yield: 'GOLD' },
  ALIEN: { name: 'Structure antique', color: 0x30494a, cost: 2, defense: 2, yield: 'GOLD' },
} as const;
export type Terrain = keyof typeof TERRAINS;
export const roadConstructionCost = (terrain?: Terrain): Partial<Wallet> =>
  terrain === 'RIVER' ? { WOOD: 30, IRON: 10 } : { WOOD: 10 };
export const TERRAFORM_COST: Partial<Wallet> = { WOOD: 20, IRON: 10 };
const UNIT_BASE_CATALOG = {
  ...NAVAL_UNITS,
  ...TRANSPORT_UNITS,
  ...SPECIALIST_UNITS,
  ...ELITE_UNITS,
  ...CAMPAIGN_UNITS,
  ...EPOCH_UNITS,
  HERO: {
    name: 'Héros',
    hp: 80,
    attack: 0,
    buildingAttack: 0,
    defense: 6,
    move: 6,
    vision: 5,
    range: 0,
    capture: 0,
    cost: { GOLD: 0, WOOD: 0, STONE: 0, IRON: 0, FOOD: 0 },
  },
  ...RADIOACTIVE_UNITS,
  ...GLOCKE_UNITS,
  TERRAFORMER: {
    name: 'Terrassier arcanique',
    hp: 28,
    attack: 0,
    defense: 4,
    move: 3,
    vision: 4,
    range: 1,
    capture: 0,
    cost: { STONE: 0, GOLD: 60, WOOD: 35, IRON: 30, FOOD: 20 },
  },
  RECON_PLANE: {
    name: 'Avion de reconnaissance',
    hp: 32,
    attack: 6,
    defense: 2,
    move: 10,
    vision: 12,
    range: 2,
    capture: 0,
    cost: { STONE: 0, GOLD: 165, WOOD: 45, IRON: 105, FOOD: 20 },
  },
  FIGHTER: {
    name: 'Chasseur Nachtjäger',
    hp: 62,
    attack: 27,
    defense: 5,
    move: 8,
    vision: 8,
    range: 3,
    capture: 0,
    cost: { STONE: 0, GOLD: 255, WOOD: 50, IRON: 175, FOOD: 25 },
  },
  BOMBER: {
    name: 'Bombardier funèbre',
    hp: 78,
    attack: 20,
    defense: 5,
    move: 5,
    vision: 7,
    range: 3,
    capture: 0,
    buildingAttack: 55,
    cost: { STONE: 0, GOLD: 335, WOOD: 70, IRON: 245, FOOD: 35 },
  },
  ZEPPELIN: {
    name: 'Dirigeable de guerre',
    hp: 120,
    attack: 24,
    defense: 8,
    move: 4,
    vision: 9,
    range: 4,
    capture: 0,
    buildingAttack: 60,
    cost: { STONE: 0, GOLD: 415, WOOD: 115, IRON: 255, FOOD: 50 },
  },
  OCCULT_DRAGON: {
    name: 'Dragon du Reich noir',
    hp: 150,
    attack: 36,
    defense: 12,
    move: 5,
    vision: 8,
    range: 2,
    capture: 0,
    buildingAttack: 64,
    cost: { STONE: 0, GOLD: 625, WOOD: 75, IRON: 315, FOOD: 190 },
  },
  FLAK_CANNON: {
    name: 'Canon antiaérien Flak',
    hp: 54,
    attack: 12,
    defense: 5,
    move: 2,
    vision: 6,
    range: 5,
    capture: 0,
    cost: { STONE: 0, GOLD: 150, WOOD: 35, IRON: 115, FOOD: 25 },
  },
  TESLA_TROOPER: {
    name: 'Voltigeur Tesla',
    hp: 44,
    attack: 24,
    defense: 6,
    move: 2,
    vision: 5,
    range: 3,
    capture: 1,
    cost: { STONE: 0, GOLD: 150, WOOD: 25, IRON: 100, FOOD: 35 },
  },
  HEX_HUNTER: {
    name: 'Chasseur de maléfices',
    hp: 36,
    attack: 23,
    defense: 4,
    move: 4,
    vision: 7,
    range: 3,
    capture: 1,
    cost: { STONE: 0, GOLD: 125, WOOD: 45, IRON: 50, FOOD: 35 },
  },
  PLAGUE_MEDIC: {
    name: 'Médecin de la peste',
    hp: 28,
    attack: 4,
    defense: 4,
    move: 3,
    vision: 5,
    range: 1,
    capture: 0,
    cost: { STONE: 0, GOLD: 85, WOOD: 20, IRON: 20, FOOD: 35 },
  },
  GHOUL_INFANTRY: {
    name: 'Grenadier revenant',
    hp: 54,
    attack: 22,
    defense: 7,
    move: 2,
    vision: 4,
    range: 2,
    capture: 1,
    cost: { STONE: 0, GOLD: 120, WOOD: 20, IRON: 75, FOOD: 25 },
  },
  SPECTRAL_RIDER: {
    name: 'Cavalier spectral',
    hp: 58,
    attack: 26,
    defense: 7,
    move: 5,
    vision: 6,
    range: 1,
    capture: 1,
    cost: { STONE: 0, GOLD: 200, WOOD: 35, IRON: 90, FOOD: 50 },
  },
  SIEGE_WALKER: {
    name: 'Marcheur de siège',
    hp: 100,
    attack: 27,
    defense: 10,
    move: 2,
    vision: 5,
    range: 4,
    capture: 0,
    buildingAttack: 58,
    cost: { STONE: 0, GOLD: 275, WOOD: 75, IRON: 225, FOOD: 40 },
  },
  HEX_TANK: {
    name: 'Char possédé',
    hp: 140,
    attack: 34,
    defense: 15,
    move: 2,
    vision: 5,
    range: 3,
    capture: 1,
    cost: { STONE: 0, GOLD: 375, WOOD: 85, IRON: 315, FOOD: 60 },
  },
  MORTAR: {
    name: 'Section de mortier',
    hp: 30,
    attack: 16,
    defense: 2,
    move: 2,
    vision: 5,
    range: 5,
    capture: 0,
    buildingAttack: 36,
    cost: { STONE: 0, GOLD: 130, WOOD: 50, IRON: 90, FOOD: 25 },
  },

  RIFLEMAN: {
    name: 'Fusilier',
    hp: 34,
    attack: 14,
    defense: 4,
    move: 3,
    vision: 5,
    range: 4,
    capture: 1,
    cost: { STONE: 0, GOLD: 55, WOOD: 20, IRON: 35, FOOD: 20 },
  },
  STORMTROOPER: {
    name: 'Soldat d’assaut',
    hp: 44,
    attack: 19,
    defense: 6,
    move: 3,
    vision: 4,
    range: 2,
    capture: 1,
    cost: { STONE: 0, GOLD: 85, WOOD: 15, IRON: 55, FOOD: 25 },
  },
  MACHINE_GUNNER: {
    name: 'Mitrailleur',
    hp: 38,
    attack: 22,
    defense: 4,
    move: 2,
    vision: 5,
    range: 4,
    capture: 0,
    cost: { STONE: 0, GOLD: 100, WOOD: 25, IRON: 65, FOOD: 25 },
  },
  SNIPER: {
    name: 'Tireur des brumes',
    hp: 26,
    attack: 24,
    defense: 2,
    move: 3,
    vision: 8,
    range: 6,
    capture: 0,
    cost: { STONE: 0, GOLD: 110, WOOD: 30, IRON: 60, FOOD: 20 },
  },
  BAZOOKA: {
    name: 'Chasseur de blindés',
    hp: 34,
    attack: 12,
    defense: 3,
    move: 2,
    vision: 5,
    range: 4,
    capture: 0,
    cost: { STONE: 0, GOLD: 115, WOOD: 25, IRON: 75, FOOD: 25 },
    buildingAttack: 32,
  },
  OFFICER: {
    name: 'Officier au sabre',
    hp: 42,
    attack: 16,
    defense: 6,
    move: 4,
    vision: 5,
    range: 2,
    capture: 1,
    cost: { STONE: 0, GOLD: 75, WOOD: 20, IRON: 35, FOOD: 30 },
  },
  MOTORCYCLE: {
    name: 'Moto de reconnaissance',
    hp: 34,
    attack: 12,
    defense: 3,
    move: 8,
    vision: 8,
    range: 2,
    capture: 1,
    cost: { STONE: 0, GOLD: 100, WOOD: 25, IRON: 75, FOOD: 20 },
  },
  ARMORED_CAR: {
    name: 'Automitrailleuse',
    hp: 64,
    attack: 20,
    defense: 7,
    move: 6,
    vision: 6,
    range: 3,
    capture: 1,
    cost: { STONE: 0, GOLD: 150, WOOD: 30, IRON: 115, FOOD: 25 },
  },
  TANK: {
    name: 'Char de rupture',
    hp: 110,
    attack: 28,
    defense: 12,
    move: 3,
    vision: 5,
    range: 4,
    capture: 1,
    cost: { STONE: 0, GOLD: 220, WOOD: 45, IRON: 200, FOOD: 30 },
    buildingAttack: 42,
  },
  FIELD_GUN: {
    name: 'Canon de campagne',
    hp: 40,
    attack: 22,
    defense: 3,
    move: 2,
    vision: 6,
    range: 6,
    capture: 0,
    cost: { STONE: 0, GOLD: 145, WOOD: 60, IRON: 115, FOOD: 20 },
    buildingAttack: 48,
  },
  ROCKET_LAUNCHER: {
    name: 'Batterie de fusées',
    hp: 52,
    attack: 30,
    defense: 4,
    move: 2,
    vision: 7,
    range: 7,
    capture: 0,
    cost: { STONE: 0, GOLD: 255, WOOD: 50, IRON: 210, FOOD: 25 },
    buildingAttack: 60,
  },
  IRON_REVENANT: {
    name: 'Chevalier mécanique',
    hp: 82,
    attack: 28,
    defense: 10,
    move: 3,
    vision: 4,
    range: 1,
    capture: 1,
    cost: { STONE: 0, GOLD: 215, WOOD: 40, IRON: 175, FOOD: 25 },
  },

  PEASANT: {
    name: 'Paysan',
    hp: 12,
    attack: 0,
    defense: 0,
    move: 3,
    vision: 3,
    range: 1,
    capture: 1,
    cost: { STONE: 0, GOLD: 5, WOOD: 10, IRON: 0, FOOD: 10 },
  },
  MILITIA: {
    name: 'Milicien',
    hp: 22,
    attack: 6,
    defense: 2,
    move: 3,
    vision: 3,
    range: 1,
    capture: 1,
    cost: { GOLD: 15, WOOD: 10, STONE: 0, IRON: 0, FOOD: 10 },
  },
  SPEARMAN: {
    name: 'Lancier',
    hp: 32,
    attack: 8,
    defense: 5,
    move: 3,
    vision: 3,
    range: 1,
    capture: 1,
    cost: { STONE: 0, GOLD: 30, WOOD: 20, IRON: 15, FOOD: 15 },
  },
  CROSSBOW: {
    name: 'Arbalétrier',
    hp: 26,
    attack: 13,
    defense: 3,
    move: 2,
    vision: 4,
    range: 3,
    capture: 0,
    cost: { STONE: 0, GOLD: 45, WOOD: 25, IRON: 20, FOOD: 15 },
  },
  RANGER: {
    name: 'Rôdeur',
    hp: 26,
    attack: 11,
    defense: 4,
    move: 4,
    vision: 7,
    range: 3,
    capture: 0,
    cost: { STONE: 0, GOLD: 55, WOOD: 35, IRON: 10, FOOD: 20 },
  },
  LIGHT_CAVALRY: {
    name: 'Cavalier léger',
    hp: 30,
    attack: 9,
    defense: 3,
    move: 6,
    vision: 5,
    range: 1,
    capture: 1,
    cost: { STONE: 0, GOLD: 50, WOOD: 10, IRON: 15, FOOD: 30 },
  },
  PALADIN: {
    name: 'Paladin',
    hp: 60,
    attack: 16,
    defense: 9,
    move: 2,
    vision: 4,
    range: 1,
    capture: 1,
    cost: { STONE: 0, GOLD: 110, WOOD: 10, IRON: 60, FOOD: 35 },
  },
  RAM: {
    name: 'Bélier',
    hp: 70,
    attack: 4,
    defense: 7,
    move: 2,
    vision: 3,
    range: 1,
    capture: 0,
    cost: { STONE: 0, GOLD: 75, WOOD: 90, IRON: 35, FOOD: 15 },
    buildingAttack: 36,
  },
  HEALER: {
    name: 'Guérisseuse',
    hp: 20,
    attack: 0,
    defense: 2,
    move: 3,
    vision: 4,
    range: 1,
    capture: 0,
    cost: { STONE: 0, GOLD: 45, WOOD: 10, IRON: 5, FOOD: 25 },
  },
  ENGINEER: {
    name: 'Ingénieur',
    hp: 26,
    attack: 3,
    defense: 4,
    move: 3,
    vision: 4,
    range: 1,
    capture: 0,
    cost: { STONE: 0, GOLD: 45, WOOD: 30, IRON: 20, FOOD: 15 },
  },
  BERSERKER: {
    name: 'Berserker',
    hp: 38,
    attack: 19,
    defense: 1,
    move: 3,
    vision: 3,
    range: 1,
    capture: 1,
    cost: { STONE: 0, GOLD: 65, WOOD: 10, IRON: 30, FOOD: 30 },
  },
  VOID_ACOLYTE: {
    name: 'Acolyte du Vide',
    hp: 30,
    attack: 22,
    defense: 3,
    move: 2,
    vision: 6,
    range: 3,
    capture: 0,
    cost: { STONE: 0, GOLD: 125, WOOD: 25, IRON: 40, FOOD: 35 },
  },
  SCOUT: {
    name: 'Éclaireur',
    hp: 16,
    attack: 3,
    defense: 1,
    move: 5,
    vision: 6,
    range: 1,
    capture: 0,
    cost: { STONE: 0, GOLD: 20, WOOD: 15, IRON: 0, FOOD: 10 },
  },
  INFANTRY: {
    name: 'Fantassin',
    hp: 30,
    attack: 8,
    defense: 4,
    move: 3,
    vision: 3,
    range: 1,
    capture: 1,
    cost: { GOLD: 25, WOOD: 10, STONE: 0, IRON: 10, FOOD: 10 },
  },
  GUARD: {
    name: 'Garde',
    hp: 46,
    attack: 6,
    defense: 8,
    move: 2,
    vision: 3,
    range: 1,
    capture: 1,
    cost: { STONE: 0, GOLD: 45, WOOD: 0, IRON: 25, FOOD: 15 },
  },
  ARCHER: {
    name: 'Archer',
    hp: 22,
    attack: 10,
    defense: 2,
    move: 2,
    vision: 4,
    range: 3,
    capture: 0,
    cost: { GOLD: 30, WOOD: 25, STONE: 0, IRON: 0, FOOD: 10 },
  },
  KNIGHT: {
    name: 'Chevalier',
    hp: 48,
    attack: 14,
    defense: 6,
    move: 5,
    vision: 4,
    range: 1,
    capture: 1,
    cost: { STONE: 0, GOLD: 70, WOOD: 10, IRON: 30, FOOD: 25 },
  },
  SIEGE: {
    name: 'Engin de siège',
    hp: 30,
    attack: 7,
    buildingAttack: 28,
    defense: 2,
    move: 1,
    vision: 4,
    range: 4,
    capture: 0,
    cost: { STONE: 0, GOLD: 90, WOOD: 65, IRON: 40, FOOD: 10 },
  },
} as const;
export type UnitKind = keyof typeof UNIT_BASE_CATALOG;
/** Ground weapons deliberately able to fire over fortifications. */
export const INDIRECT_FIRE_UNITS: readonly UnitKind[] = [
  ...ELITE_INDIRECT,
  ...CAMPAIGN_INDIRECT,
  'LONGBOWMAN',
  'ASSAULT_SAPPER',
  'MISSILE_TANK',
  'NEUTRON_MORTAR',
  'IMPERIAL_GRENADIER',
  'DRONE_OPERATOR',
  'ARCHER',
  'RANGER',
  'SIEGE',
  'MORTAR',
  'ATOMIC_SAPPER',
];
const BUILDING_BASE_CATALOG = {
  ...NAVAL_BUILDINGS,
  ...RESOURCE_BUILDINGS,
  GLOCKE_COMPLEX: {
    name: 'Complexe des cloches',
    hp: 750,
    capture: 6,
    cost: { GOLD: 2200, WOOD: 500, STONE: 700, IRON: 1200, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'RUINS'],
  },
  ISOTOPE_LAB: {
    name: 'Laboratoire des isotopes',
    hp: 385,
    capture: 4,
    cost: { GOLD: 440, WOOD: 160, STONE: 200, IRON: 300, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  NUCLEAR_REACTOR: {
    name: 'Réacteur noir',
    hp: 630,
    capture: 6,
    cost: { GOLD: 800, WOOD: 200, STONE: 400, IRON: 560, FOOD: 0 },
    production: { GOLD: 120 },
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  HELIPAD: {
    name: 'Héliport occulte',
    hp: 430,
    capture: 4,
    cost: { GOLD: 560, WOOD: 180, STONE: 240, IRON: 360, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'RUINS'],
  },
  ATOMIC_FOUNDRY: {
    name: 'Fonderie atomique',
    hp: 625,
    capture: 5,
    cost: { GOLD: 1250, WOOD: 340, STONE: 435, IRON: 865, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  AERODROME: {
    name: 'Aérodrome militaire',
    hp: 265,
    capture: 4,
    cost: { STONE: 100, GOLD: 225, WOOD: 140, IRON: 140, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'RUINS'],
  },
  AIRSHIP_YARD: {
    name: 'Chantier de dirigeables',
    hp: 380,
    capture: 4,
    cost: { STONE: 155, GOLD: 360, WOOD: 225, IRON: 255, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'RUINS'],
  },
  DRAGON_ROOST: {
    name: 'Sanctuaire draconique',
    hp: 440,
    capture: 4,
    cost: { STONE: 275, GOLD: 445, WOOD: 170, IRON: 240, FOOD: 0 },
    production: {},
    terrains: ['HILL', 'MOUNTAIN', 'RUINS', 'CORRUPTION'],
  },
  FLAK_BATTERY: {
    name: 'École de défense antiaérienne',
    hp: 280,
    capture: 4,
    cost: { STONE: 95, GOLD: 140, WOOD: 70, IRON: 120, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  WOOD_WALL: {
    name: 'Palissade en bois',
    hp: 100,
    capture: 0,
    cost: { WOOD: 30, STONE: 0, GOLD: 0, IRON: 0, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS', 'MOUNTAIN'],
  },
  STONE_WALL: {
    name: 'Rempart de pierre',
    hp: 240,
    capture: 0,
    cost: { WOOD: 0, STONE: 65, GOLD: 0, IRON: 0, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS', 'MOUNTAIN'],
  },
  STEEL_WALL: {
    name: 'Mur en acier',
    hp: 480,
    capture: 0,
    cost: { WOOD: 0, STONE: 0, GOLD: 0, IRON: 90, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS', 'MOUNTAIN'],
  },
  CONCRETE_WALL: {
    name: 'Rempart en béton blindé',
    hp: 900,
    capture: 6,
    cost: { GOLD: 200, WOOD: 0, STONE: 260, IRON: 180, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  ATOMIC_WALL: {
    name: 'Enceinte atomique',
    hp: 1600,
    capture: 8,
    cost: { GOLD: 400, WOOD: 0, STONE: 300, IRON: 350, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  TESLA_COIL: {
    name: 'Tour Tesla',
    hp: 380,
    capture: 5,
    cost: { STONE: 120, GOLD: 155, WOOD: 80, IRON: 155, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  CRYPT_BARRACKS: {
    name: 'Caserne des revenants',
    hp: 300,
    capture: 4,
    cost: { STONE: 115, GOLD: 170, WOOD: 105, IRON: 85, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  ALCHEMY_FOUNDRY: {
    name: 'Fonderie alchimique',
    hp: 260,
    capture: 4,
    cost: { STONE: 85, GOLD: 225, WOOD: 120, IRON: 140, FOOD: 0 },
    production: { GOLD: 30 },
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  BLACK_OBSERVATORY: {
    name: 'Observatoire noir',
    hp: 220,
    capture: 3,
    cost: { STONE: 105, GOLD: 240, WOOD: 140, IRON: 115, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },

  QUARRY: {
    name: 'Carrière de pierre',
    hp: 75,
    capture: 3,
    cost: { GOLD: 20, WOOD: 30, STONE: 0, IRON: 0, FOOD: 0 },
    production: { STONE: 6 },
    terrains: ['HILL', 'MOUNTAIN'],
  },
  ARSENAL: {
    name: 'Arsenal',
    hp: 175,
    capture: 3,
    cost: { STONE: 50, GOLD: 100, WOOD: 95, IRON: 50, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  BUNKER: {
    name: 'Bunker',
    hp: 350,
    capture: 4,
    cost: { STONE: 115, GOLD: 100, WOOD: 50, IRON: 140, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  GARAGE: {
    name: 'Garage militaire',
    hp: 175,
    capture: 3,
    cost: { STONE: 0, GOLD: 115, WOOD: 95, IRON: 80, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  TANK_FACTORY: {
    name: 'Usine de blindés',
    hp: 265,
    capture: 4,
    cost: { STONE: 95, GOLD: 225, WOOD: 140, IRON: 185, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  REFINERY: {
    name: 'Raffinerie',
    hp: 160,
    capture: 3,
    cost: { STONE: 50, GOLD: 140, WOOD: 100, IRON: 100, FOOD: 0 },
    production: { GOLD: 6 },
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  MUNITIONS: {
    name: 'Manufacture de munitions',
    hp: 160,
    capture: 3,
    cost: { STONE: 35, GOLD: 120, WOOD: 95, IRON: 85, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  RADIO: {
    name: 'Relais radio',
    hp: 125,
    capture: 3,
    cost: { STONE: 25, GOLD: 105, WOOD: 60, IRON: 95, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  FIELD_HOSPITAL: {
    name: 'Hôpital militaire',
    hp: 175,
    capture: 3,
    cost: { STONE: 30, GOLD: 95, WOOD: 95, IRON: 35, FOOD: 45 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  GUN_BATTERY: {
    name: 'Batterie fortifiée',
    hp: 300,
    capture: 4,
    cost: { STONE: 70, GOLD: 155, WOOD: 85, IRON: 140, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  OCCULT_LAB: {
    name: 'Laboratoire des cendres',
    hp: 240,
    capture: 3,
    cost: { STONE: 105, GOLD: 255, WOOD: 140, IRON: 170, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  ROCKET_SILO: {
    name: 'Rampe de lancement',
    hp: 260,
    capture: 3,
    cost: { STONE: 105, GOLD: 290, WOOD: 140, IRON: 240, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  LOGISTICS_CENTER: {
    name: 'Centre logistique',
    hp: 160,
    capture: 3,
    cost: { STONE: 80, GOLD: 100, WOOD: 140, IRON: 35, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  RAIL_DEPOT: {
    name: 'Dépôt ferroviaire',
    hp: 195,
    capture: 3,
    cost: { STONE: 45, GOLD: 130, WOOD: 130, IRON: 105, FOOD: 0 },
    production: { GOLD: 5 },
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },

  CAMP: {
    name: 'Campement',
    hp: 75,
    capture: 2,
    cost: { STONE: 0, GOLD: 0, WOOD: 25, IRON: 0, FOOD: 0 },
    production: { GOLD: 2, FOOD: 4 },
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  HOUSE: {
    name: 'Chaumière',
    hp: 50,
    capture: 2,
    cost: { STONE: 0, GOLD: 0, WOOD: 20, IRON: 0, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  GRANARY: {
    name: 'Grenier',
    hp: 65,
    capture: 2,
    cost: { STONE: 0, GOLD: 15, WOOD: 40, IRON: 0, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  HUNTER: {
    name: 'Cabane de chasse',
    hp: 50,
    capture: 2,
    cost: { STONE: 0, GOLD: 0, WOOD: 20, IRON: 0, FOOD: 0 },
    production: { FOOD: 5 },
    terrains: ['FOREST'],
  },
  FISHERY: {
    name: 'Pêcherie',
    hp: 50,
    capture: 2,
    cost: { STONE: 0, GOLD: 10, WOOD: 30, IRON: 0, FOOD: 0 },
    production: { FOOD: 10 },
    terrains: ['RIVER', 'MARSH'],
  },
  STABLE: {
    name: 'Écurie',
    hp: 105,
    capture: 2,
    cost: { STONE: 0, GOLD: 65, WOOD: 70, IRON: 20, FOOD: 30 },
    production: {},
    terrains: ['PLAIN', 'HILL'],
  },
  ARCHERY: {
    name: 'Archerie',
    hp: 90,
    capture: 2,
    cost: { GOLD: 35, WOOD: 50, STONE: 10, IRON: 0, FOOD: 10 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  MONASTERY: {
    name: 'Monastère',
    hp: 135,
    capture: 3,
    cost: { STONE: 45, GOLD: 90, WOOD: 70, IRON: 35, FOOD: 25 },
    production: { GOLD: 3, FOOD: 3 },
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  FORGE: {
    name: 'Forge',
    hp: 140,
    capture: 3,
    cost: { STONE: 30, GOLD: 95, WOOD: 65, IRON: 50, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  LIBRARY: {
    name: 'Bibliothèque des astres',
    hp: 105,
    capture: 3,
    cost: { STONE: 35, GOLD: 115, WOOD: 80, IRON: 35, FOOD: 25 },
    production: { GOLD: 4 },
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  BAKERY: {
    name: 'Boulangerie',
    hp: 75,
    capture: 2,
    cost: { STONE: 15, GOLD: 30, WOOD: 40, IRON: 10, FOOD: 15 },
    production: { FOOD: 24 },
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  WELL: {
    name: 'Puits',
    hp: 75,
    capture: 2,
    cost: { STONE: 10, GOLD: 5, WOOD: 20, IRON: 0, FOOD: 0 },
    production: { FOOD: 3 },
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  OUTPOST: {
    name: 'Avant-poste',
    hp: 90,
    capture: 2,
    cost: { STONE: 0, GOLD: 35, WOOD: 35, IRON: 5, FOOD: 0 },
    production: { GOLD: 3, FOOD: 5 },
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  VILLAGE: {
    name: 'Village',
    hp: 105,
    capture: 2,
    cost: { STONE: 25, GOLD: 70, WOOD: 60, IRON: 15, FOOD: 30 },
    production: { GOLD: 6, FOOD: 6 },
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  FARM: {
    name: 'Ferme',
    hp: 40,
    capture: 2,
    cost: { STONE: 0, GOLD: 20, WOOD: 25, IRON: 0, FOOD: 0 },
    production: { FOOD: 8 },
    terrains: ['PLAIN'],
  },
  LUMBER: {
    name: 'Scierie',
    hp: 50,
    capture: 2,
    cost: { GOLD: 15, WOOD: 25, STONE: 0, IRON: 0, FOOD: 0 },
    production: { WOOD: 8 },
    terrains: ['FOREST'],
  },
  MINE: {
    name: 'Mine de fer',
    hp: 65,
    capture: 3,
    cost: { GOLD: 30, WOOD: 35, STONE: 10, IRON: 0, FOOD: 0 },
    production: { IRON: 5 },
    terrains: ['HILL'],
  },
  GOLD_MINE: {
    name: 'Mine d’or',
    hp: 120,
    capture: 3,
    cost: { GOLD: 160, WOOD: 120, STONE: 90, IRON: 60, FOOD: 0 },
    production: { GOLD: 24 },
    terrains: ['HILL', 'MOUNTAIN'],
  },
  MARKET: {
    name: 'Marché',
    hp: 75,
    capture: 2,
    cost: { STONE: 0, GOLD: 60, WOOD: 40, IRON: 15, FOOD: 15 },
    production: { GOLD: 8 },
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  WAREHOUSE: {
    name: 'Entrepôt',
    hp: 90,
    capture: 2,
    cost: { STONE: 20, GOLD: 40, WOOD: 50, IRON: 15, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
  WORKSHOP: {
    name: 'Atelier',
    hp: 90,
    capture: 3,
    cost: { STONE: 20, GOLD: 75, WOOD: 50, IRON: 30, FOOD: 0 },
    production: { GOLD: 2 },
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  BARRACKS: {
    name: 'Caserne',
    hp: 120,
    capture: 3,
    cost: { GOLD: 35, WOOD: 45, STONE: 15, IRON: 0, FOOD: 10 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  FORT: {
    name: 'Fort',
    hp: 195,
    capture: 4,
    cost: { STONE: 75, GOLD: 100, WOOD: 50, IRON: 75, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'RUINS'],
  },
  TOWER: {
    name: 'Tour de guet',
    hp: 120,
    capture: 3,
    cost: { STONE: 30, GOLD: 50, WOOD: 30, IRON: 35, FOOD: 0 },
    production: {},
    terrains: ['PLAIN', 'HILL', 'FOREST', 'RUINS'],
  },
} satisfies Record<
  string,
  {
    name: string;
    hp: number;
    capture: number;
    cost: Wallet;
    production: Partial<Wallet>;
    terrains: string[];
  }
>;
export type BuildingKind = keyof typeof BUILDING_BASE_CATALOG;
export const BUILDINGS = repriceCatalog(
  BUILDING_BASE_CATALOG,
  (kind) => PRICE_MULTIPLIERS[BUILDING_ECONOMIC_TIERS[kind]],
);
export const ECONOMY_V2_BUILDING_COSTS = Object.fromEntries(
  Object.entries(BUILDING_BASE_CATALOG).map(([kind, building]) => [kind, { ...building.cost }]),
) as Record<BuildingKind, Wallet>;
export const WALL_KINDS = [
  'WOOD_WALL',
  'STONE_WALL',
  'STEEL_WALL',
  'CONCRETE_WALL',
  'ATOMIC_WALL',
] as const;
export type WallKind = (typeof WALL_KINDS)[number];
export type TurretLevel = 1 | 2 | 3 | 4 | 5;
export const WALL_HEIGHTS: Record<WallKind, number> = {
  WOOD_WALL: 20,
  STONE_WALL: 27,
  STEEL_WALL: 34,
  CONCRETE_WALL: 37,
  ATOMIC_WALL: 37,
};
export const TURRETS = {
  1: {
    name: 'Arbalète de rempart',
    attack: 16,
    range: 3,
    antiAir: 0,
    wall: 'WOOD_WALL',
    projectileUnit: 'CROSSBOW',
    cost: { GOLD: 60, WOOD: 50, IRON: 20 },
  },
  2: {
    name: 'Canon de rempart',
    attack: 30,
    range: 4,
    antiAir: 0,
    wall: 'STONE_WALL',
    projectileUnit: 'FIELD_GUN',
    cost: { GOLD: 120, STONE: 60, IRON: 50 },
  },
  3: {
    name: 'Tourelle Tesla occulte',
    attack: 48,
    range: 5,
    antiAir: 18,
    wall: 'STEEL_WALL',
    projectileUnit: 'TESLA_TROOPER',
    cost: { GOLD: 220, STONE: 40, IRON: 120 },
  },
  4: {
    name: 'Tourelle automatique de forteresse',
    attack: 72,
    range: 5,
    antiAir: 24,
    wall: 'CONCRETE_WALL',
    projectileUnit: 'MACHINE_GUNNER',
    cost: { GOLD: 1400, STONE: 600, IRON: 1000 },
  },
  5: {
    name: 'Lance à neutrons',
    attack: 110,
    range: 6,
    antiAir: 36,
    wall: 'ATOMIC_WALL',
    projectileUnit: 'GLOCKE_VRIL',
    cost: { GOLD: 7000, STONE: 1800, IRON: 4200 },
  },
} as const satisfies Record<
  TurretLevel,
  {
    name: string;
    attack: number;
    range: number;
    antiAir: number;
    wall: WallKind;
    projectileUnit: UnitKind;
    cost: Partial<Wallet>;
  }
>;
export const isWall = (kind: string): kind is WallKind => WALL_KINDS.includes(kind as WallKind);
export const isBuildable = (kind: BuildingKind) => !isWall(kind) || kind === 'WOOD_WALL';
export function buildingConstructionCost(kind: BuildingKind, faction: Faction): Partial<Wallet> {
  const discount = faction === 'ASH' ? 0.9 : 1;
  return Object.fromEntries(
    Object.entries(BUILDINGS[kind].cost).map(([resource, value]) => [
      resource,
      Math.ceil(value * discount),
    ]),
  );
}
export const EXTRACTOR_BUILDINGS: readonly BuildingKind[] = [
  ...(Object.keys(RESOURCE_BUILDINGS) as (keyof typeof RESOURCE_BUILDINGS)[]),
  'LUMBER',
  'MINE',
  'GOLD_MINE',
  'QUARRY',
  'FARM',
  'FISHERY',
  'HUNTER',
];
export function productionOnTerrain(kind: BuildingKind, terrain: Terrain): Partial<Wallet> {
  return terrain === 'SCORCHED' ||
    (EXTRACTOR_BUILDINGS.includes(kind) && !BUILDINGS[kind].terrains.includes(terrain))
    ? {}
    : BUILDINGS[kind].production;
}

export interface UnitProfile {
  naval?: boolean;
  submarine?: boolean;
  sonar?: number;
  fishing?: number;
  hero?: boolean;
  transport?: boolean;
  /** Primary recruiter only. Use recruitmentLevel() for a selected building. */
  minRecruitLevel?: number;
  recruitLevels?: Partial<Record<BuildingKind, number>>;
  radioactive?: boolean;
  population?: number;
  role: string;
  recruitAt: BuildingKind[];
  requires: BuildingKind[];
  flying?: boolean;
  antiAir?: number;
  antiArmor?: number;
  antiCavalry?: number;
  mounted?: boolean;
  mechanical?: boolean;
  armored?: boolean;
  siege?: boolean;
  builder?: boolean;
  healer?: boolean;
}
const BASE_UNIT_PROFILES: Record<UnitKind, UnitProfile> = {
  ...NAVAL_PROFILES,
  ...TRANSPORT_PROFILES,
  ...SPECIALIST_PROFILES,
  ...ELITE_PROFILES,
  ...CAMPAIGN_PROFILES,
  ...EPOCH_PROFILES,
  HERO: {
    hero: true,
    population: 0,
    role: 'Commandant immortel : aura de soutien, soins, réparations et exploration. Revient après 5 minutes hors combat. Ne peut ni attaquer, ni capturer, ni être recruté.',
    recruitAt: [],
    requires: [],
  },
  ...RADIOACTIVE_PROFILES,
  ...GLOCKE_PROFILES,
  TERRAFORMER: {
    role: 'Transforme son terrain ou une case voisine en plaine : 2 PA, 20 bois, 10 fer. Case neutre ou à vous, sans bâtiment. Relief et ressources naturelles supprimés ; propriété conservée.',
    recruitAt: ['WORKSHOP'],
    requires: ['WORKSHOP'],
  },
  RECON_PLANE: {
    role: 'Reconnaissance aérienne : vision 12, déplacement 10 ; armement léger. Survole terrains et remparts, sans capture.',
    recruitAt: ['AERODROME'],
    requires: ['RADIO'],
    mechanical: true,
    flying: true,
  },
  FIGHTER: {
    role: 'Chasseur rapide : +5 dégâts contre les unités aériennes. Survole terrains et remparts, sans capture.',
    recruitAt: ['AERODROME'],
    requires: ['MUNITIONS'],
    mechanical: true,
    flying: true,
    antiAir: 5,
  },
  BOMBER: {
    role: 'Bombardement des fortifications : dégâts de siège renforcés contre les bâtiments, 2 PA. Survole terrains et remparts, sans capture.',
    recruitAt: ['AERODROME'],
    requires: ['MUNITIONS', 'REFINERY'],
    mechanical: true,
    flying: true,
    siege: true,
  },
  ZEPPELIN: {
    role: 'Forteresse volante lente : vision 9 et bombardement à 4 cases, 2 PA. Survole terrains et remparts, sans capture.',
    recruitAt: ['AIRSHIP_YARD'],
    requires: ['MUNITIONS'],
    mechanical: true,
    flying: true,
    siege: true,
  },
  OCCULT_DRAGON: {
    role: 'Dragon cuirassé du Reich noir, lié par les rites occultes. Souffle à 2 cases, dégâts de siège renforcés, 2 PA. Vole, sans capture ; vulnérable à la Flak.',
    recruitAt: ['DRAGON_ROOST'],
    requires: ['ALCHEMY_FOUNDRY'],
    flying: true,
    siege: true,
  },
  FLAK_CANNON: {
    role: 'Défense antiaérienne mobile : +30 dégâts contre les cibles volantes à 5 cases. Faible contre les troupes au sol. Attaque : 1 PA.',
    recruitAt: ['FLAK_BATTERY'],
    requires: ['MUNITIONS'],
    mechanical: true,
    antiAir: 22,
  },

  TESLA_TROOPER: {
    role: 'Fusil électrique à moyenne portée ; puissance élevée, déplacement lent.',
    recruitAt: ['TESLA_COIL'],
    requires: ['OCCULT_LAB'],
  },
  HEX_HUNTER: {
    role: 'Éclaireur armé de pistolet et d’arbalète ; vision étendue.',
    recruitAt: ['BLACK_OBSERVATORY'],
    requires: ['ARSENAL'],
  },
  PLAGUE_MEDIC: {
    role: 'Soigne les alliés voisins ; le soin de groupe coûte 1 PA.',
    recruitAt: ['FIELD_HOSPITAL'],
    requires: ['MONASTERY'],
    healer: true,
  },
  GHOUL_INFANTRY: {
    role: 'Infanterie revenante résistante capable de revendiquer les terres.',
    recruitAt: ['CRYPT_BARRACKS'],
    requires: ['ARSENAL'],
  },
  SPECTRAL_RIDER: {
    role: 'Cavalerie occulte rapide, armée d’une épée et d’un pistolet.',
    recruitAt: ['CRYPT_BARRACKS'],
    requires: ['STABLE'],
    mounted: true,
  },
  SIEGE_WALKER: {
    role: 'Marcheur blindé contre les fortifications. Attaque : 2 PA.',
    recruitAt: ['TANK_FACTORY'],
    requires: ['ALCHEMY_FOUNDRY'],
    mechanical: true,
    armored: true,
    siege: true,
  },
  HEX_TANK: {
    role: 'Blindé lourd possédé ; coûteux à produire et entretenir.',
    recruitAt: ['TANK_FACTORY'],
    requires: ['ALCHEMY_FOUNDRY', 'OCCULT_LAB'],
    mechanical: true,
    armored: true,
  },
  MORTAR: {
    role: 'Artillerie mobile à longue portée et fragile au contact. Attaque : 2 PA.',
    recruitAt: ['GUN_BATTERY'],
    requires: ['MUNITIONS'],
    siege: true,
  },

  RIFLEMAN: {
    role: 'Tir à 4 cases ; infanterie de conquête.',
    recruitAt: ['ARSENAL'],
    requires: ['ARSENAL'],
  },
  STORMTROOPER: {
    role: 'Infanterie d’assaut à courte portée.',
    recruitAt: ['ARSENAL'],
    requires: ['ARSENAL'],
  },
  MACHINE_GUNNER: {
    role: 'Feu puissant à distance, déplacement lent.',
    recruitAt: ['ARSENAL'],
    requires: ['ARSENAL', 'MUNITIONS'],
  },
  SNIPER: {
    role: 'Tir à 6 cases et grande vision ; très fragile.',
    recruitAt: ['ARSENAL'],
    requires: ['ARSENAL', 'RADIO'],
  },
  BAZOOKA: {
    antiArmor: 24,
    role: 'Bonus antichar de +32 et ignore 75 % de leur défense. Efficace contre les blindés, attaque : 1 PA.',
    recruitAt: ['ARSENAL'],
    requires: ['ARSENAL', 'MUNITIONS'],
  },
  OFFICER: {
    role: 'Pistolet et sabre ; capture et ralliement des soldats.',
    recruitAt: ['ARSENAL'],
    requires: ['ARSENAL'],
  },
  MOTORCYCLE: {
    role: 'Reconnaissance motorisée : mouvement 8, vision 8.',
    recruitAt: ['GARAGE'],
    requires: ['GARAGE'],
    mechanical: true,
  },
  ARMORED_CAR: {
    role: 'Véhicule blindé rapide pour reconnaissance et capture.',
    recruitAt: ['GARAGE'],
    requires: ['GARAGE', 'REFINERY'],
    mechanical: true,
    armored: true,
  },
  TANK: {
    role: 'Blindé lourd, puissant contre les fortifications.',
    recruitAt: ['TANK_FACTORY'],
    requires: ['TANK_FACTORY', 'MUNITIONS'],
    mechanical: true,
    armored: true,
  },
  FIELD_GUN: {
    role: 'Artillerie à 6 cases ; attaque 2 PA.',
    recruitAt: ['GUN_BATTERY', 'TANK_FACTORY'],
    requires: ['MUNITIONS'],
    mechanical: true,
    siege: true,
  },
  ROCKET_LAUNCHER: {
    role: 'Fusées à 7 cases, très puissantes contre les bâtiments ; attaque 2 PA.',
    recruitAt: ['ROCKET_SILO'],
    requires: ['ROCKET_SILO', 'MUNITIONS'],
    mechanical: true,
    siege: true,
  },
  IRON_REVENANT: {
    role: 'Armure mécanique de mêlée ; nécessite des réparations.',
    recruitAt: ['OCCULT_LAB'],
    requires: ['OCCULT_LAB', 'TANK_FACTORY'],
    mechanical: true,
    armored: true,
  },

  PEASANT: {
    role: 'Récolte uniquement sur sa case : bois en forêt, pierre sur relief rocheux, fer sur colline, vivres sur terrain nourricier. Premier paysan gratuit.',
    recruitAt: ['CAMP', 'VILLAGE', 'OUTPOST'],
    requires: [],
    builder: true,
  },
  MILITIA: {
    role: 'Défense bon marché et conquête des premières terres.',
    recruitAt: ['BARRACKS', 'FORT'],
    requires: [],
  },
  SCOUT: {
    role: 'Exploration rapide et reconnaissance à longue distance.',
    recruitAt: ['BARRACKS', 'FORT'],
    requires: [],
  },
  INFANTRY: {
    role: 'Infanterie polyvalente pour tenir et capturer les territoires.',
    recruitAt: ['BARRACKS', 'FORT'],
    requires: [],
  },
  GUARD: {
    role: 'Défenseur lourd, solide mais lent.',
    recruitAt: ['BARRACKS', 'FORT'],
    requires: ['BARRACKS'],
  },
  ARCHER: {
    role: 'Tir à distance, fragile au contact.',
    recruitAt: ['ARCHERY'],
    requires: [],
  },
  KNIGHT: {
    role: 'Cavalerie lourde pour percer et capturer.',
    recruitAt: ['STABLE'],
    requires: ['BARRACKS'],
    mounted: true,
  },
  SIEGE: {
    role: 'Bombardement des fortifications à longue portée. Attaque : 2 PA.',
    recruitAt: ['WORKSHOP'],
    requires: ['BARRACKS'],
    siege: true,
  },
  SPEARMAN: {
    antiCavalry: 12,
    role: 'Bonus de +12 en attaque contre la cavalerie.',
    recruitAt: ['BARRACKS', 'FORT'],
    requires: ['BARRACKS'],
  },
  CROSSBOW: {
    role: 'Bonus de +6 contre gardes, chevaliers et paladins.',
    recruitAt: ['ARCHERY'],
    requires: ['ARCHERY', 'FORGE'],
  },
  RANGER: {
    role: 'Éclaireur archer ; +2 de défense en forêt et reconnaissance.',
    recruitAt: ['ARCHERY'],
    requires: ['ARCHERY'],
  },
  LIGHT_CAVALRY: {
    role: 'Mobilité supérieure et reconnaissance montée.',
    recruitAt: ['STABLE'],
    requires: ['STABLE'],
    mounted: true,
  },
  PALADIN: {
    role: 'Infanterie lourde capable de soigner les alliés proches.',
    recruitAt: ['MONASTERY'],
    requires: ['MONASTERY', 'FORGE'],
    healer: true,
  },
  RAM: {
    role: 'Très solide au contact des bâtiments. Attaque : 2 PA.',
    recruitAt: ['WORKSHOP'],
    requires: ['WORKSHOP'],
    siege: true,
  },
  HEALER: {
    role: 'Soigne de 6 PV les alliés blessés proches pour 1 PA.',
    recruitAt: ['MONASTERY', 'FIELD_HOSPITAL'],
    requires: ['MONASTERY'],
    healer: true,
  },
  ENGINEER: {
    role: 'Construit aux frontières et répare les bâtiments proches.',
    recruitAt: ['WORKSHOP'],
    requires: ['WORKSHOP'],
    builder: true,
  },
  BERSERKER: {
    role: 'Attaque très élevée, sans protection défensive.',
    recruitAt: ['BARRACKS', 'FORT'],
    requires: ['BARRACKS', 'FORGE'],
  },
  VOID_ACOLYTE: {
    role: 'Attaquant à distance ; observe les vestiges et les régions lointaines.',
    recruitAt: ['LIBRARY', 'OCCULT_LAB'],
    requires: ['LIBRARY', 'MONASTERY'],
  },
};
export const GATHER_YIELD: Wallet = { STONE: 20, GOLD: 16, WOOD: 24, IRON: 16, FOOD: 24 };
export const UNIT_PROFILES = balanceProfiles(
  arrangeRecruitment(BASE_UNIT_PROFILES, UNIT_TIERS),
  UNIT_TIERS,
);
export const UNIT_TERRAIN_AFFINITIES = createTerrainAffinities(UNIT_PROFILES, UNIT_BASE_CATALOG);
export const UNIT_BIOME_ADAPTATIONS = createBiomeAdaptations(UNIT_PROFILES);
export function recruitmentLevel(kind: UnitKind, building: BuildingKind): number {
  const profile = UNIT_PROFILES[kind];
  return profile.recruitLevels?.[building] ?? profile.minRecruitLevel ?? 1;
}
export const UNITS = balanceUnits(UNIT_BASE_CATALOG, UNIT_TIERS, UNIT_PROFILES, (kind) =>
  UNIT_TIERS[kind] <= 1 ? 1 : PRICE_MULTIPLIERS[UNIT_TIERS[kind]],
);

export const BUILDING_REQUIREMENTS: Partial<Record<BuildingKind, BuildingKind[]>> = {
  SHIPYARD: ['PORT'],
  SUBMARINE_BASE: ['SHIPYARD', 'MUNITIONS'],
  COASTAL_BATTERY: ['PORT', 'FORGE'],
  GOLD_MINE: ['MINE', 'WORKSHOP'],
  STEAM_SAWMILL: ['LUMBER', 'WORKSHOP'],
  MECHANIZED_QUARRY: ['QUARRY', 'WORKSHOP'],
  INDUSTRIAL_MINE: ['MINE', 'FORGE'],
  OCCULT_SAWMILL: ['STEAM_SAWMILL', 'OCCULT_LAB'],
  RUNIC_QUARRY: ['MECHANIZED_QUARRY', 'OCCULT_LAB'],
  ABYSSAL_MINE: ['INDUSTRIAL_MINE', 'OCCULT_LAB'],
  GLOCKE_COMPLEX: ['NUCLEAR_REACTOR', 'ATOMIC_FOUNDRY', 'BLACK_OBSERVATORY'],
  ISOTOPE_LAB: ['OCCULT_LAB', 'MUNITIONS'],
  NUCLEAR_REACTOR: ['ISOTOPE_LAB', 'REFINERY'],
  HELIPAD: ['ISOTOPE_LAB', 'GARAGE', 'RADIO'],
  ATOMIC_FOUNDRY: ['NUCLEAR_REACTOR', 'TANK_FACTORY'],
  AERODROME: ['GARAGE', 'RADIO'],
  AIRSHIP_YARD: ['AERODROME', 'REFINERY'],
  DRAGON_ROOST: ['BLACK_OBSERVATORY', 'CRYPT_BARRACKS'],
  FLAK_BATTERY: ['MUNITIONS'],
  TESLA_COIL: ['FORGE', 'OCCULT_LAB'],
  CRYPT_BARRACKS: ['BARRACKS', 'OCCULT_LAB'],
  ALCHEMY_FOUNDRY: ['REFINERY', 'OCCULT_LAB'],
  BLACK_OBSERVATORY: ['LIBRARY', 'RADIO'],
  ARSENAL: ['BARRACKS', 'FORGE'],
  BUNKER: ['FORGE'],
  GARAGE: ['WORKSHOP'],
  TANK_FACTORY: ['GARAGE', 'REFINERY'],
  REFINERY: ['FORGE'],
  MUNITIONS: ['ARSENAL'],
  RADIO: ['WORKSHOP'],
  FIELD_HOSPITAL: ['HOUSE', 'MONASTERY'],
  GUN_BATTERY: ['MUNITIONS'],
  OCCULT_LAB: ['LIBRARY', 'FORGE'],
  ROCKET_SILO: ['TANK_FACTORY', 'OCCULT_LAB'],
  LOGISTICS_CENTER: ['MARKET', 'GRANARY'],
  RAIL_DEPOT: ['WORKSHOP', 'WAREHOUSE'],

  STABLE: ['BARRACKS'],
  MONASTERY: ['HOUSE'],
  FORGE: ['WORKSHOP'],
  LIBRARY: ['MONASTERY'],
  BAKERY: ['FARM'],
};
export const BUILDING_POPULATION: Partial<Record<BuildingKind, number>> = {
  CAMP: 5,
  HOUSE: 12,
  VILLAGE: 35,
  OUTPOST: 10,
};
export const BUILDING_ROLES: Partial<Record<BuildingKind, string>> = {
  PORT: 'Dans l’eau, directement contre une plage : forme les transports maritimes et ravitaille les flottes à deux cases. Un bâtisseur doit travailler depuis la plage voisine. Les navires apparaissent sur une case d’eau libre du port ou de ses voisines.',
  SHIPYARD:
    'Dans l’eau, directement contre une plage : construit éclaireurs, frégates, destroyers et cuirassés selon son niveau. Entraîne les équipages.',
  NAVAL_FISHERY:
    'Dans l’eau, directement contre une plage : produit des vivres et forme les bateaux de pêche. La pêche active en mer coûte 1 PA.',
  SUBMARINE_BASE:
    'Dans l’eau, directement contre une plage : sous-marins aux niveaux 3 à 5. Sonar à partir du niveau 3, portée niveau moins un.',
  COASTAL_BATTERY:
    'À terre, directement contre la mer : artillerie défensive commandée, 1 PA par tir. Puissance et portée augmentent à chaque niveau. Sonar à partir du niveau 3.',
  STEAM_SAWMILL:
    'Exploitation industrielle du bois : 48 bois/min, uniquement en forêt. Exige une scierie et un atelier. Débloque la scierie des ombres. Production +80 % au niveau 2, +200 % au niveau 3, +400 % au niveau 4 et +700 % au niveau 5 ; stockage local dès le niveau 2.',
  MECHANIZED_QUARRY:
    'Extraction mécanique : 36 pierre/min sur colline ou montagne. Exige une carrière de pierre et un atelier. Débloque la carrière runique. Production +80 % au niveau 2, +200 % au niveau 3, +400 % au niveau 4 et +700 % au niveau 5 ; stockage local dès le niveau 2.',
  INDUSTRIAL_MINE:
    'Extraction industrielle : 30 fer/min, uniquement sur colline. Exige une mine et une forge. Débloque la mine des abysses. Production +80 % au niveau 2, +200 % au niveau 3, +400 % au niveau 4 et +700 % au niveau 5 ; stockage local dès le niveau 2.',
  OCCULT_SAWMILL:
    'Scies alimentées par les ombres : 160 bois/min, uniquement en forêt. Exige une scierie à vapeur et un laboratoire des cendres. Production +80 % au niveau 2, +200 % au niveau 3, +400 % au niveau 4 et +700 % au niveau 5 ; stockage local dès le niveau 2.',
  RUNIC_QUARRY:
    'Excavation par résonance runique : 120 pierre/min sur colline ou montagne. Exige une carrière mécanisée et un laboratoire des cendres. Production +80 % au niveau 2, +200 % au niveau 3, +400 % au niveau 4 et +700 % au niveau 5 ; stockage local dès le niveau 2.',
  ABYSSAL_MINE:
    'Forage occulte des profondeurs : 100 fer/min, uniquement sur colline. Exige une mine industrielle et un laboratoire des cendres. Production +80 % au niveau 2, +200 % au niveau 3, +400 % au niveau 4 et +700 % au niveau 5 ; stockage local dès le niveau 2.',
  GLOCKE_COMPLEX:
    'Armes occultes de fin de progression : exige réacteur noir, fonderie atomique et observatoire noir. Une cloche par niveau : Vril, Wacht (escorte), Nacht (siège), Sturm (antiblindage), puis Götterdämmerung au niveau 5. Entraînement +25 / +60 / +80 / +100 % aux niveaux 2 / 3 / 4 / 5 pour les cloches existantes et futures. Aucun revenu ni tir automatique.',
  ISOTOPE_LAB:
    'Recherche atomique : débloque le réacteur noir et l’héliport. Ne produit pas de ressources et ne forme pas de troupes directement. Confine les réacteurs à trois cases : réduit les émissions de 2 points par niveau, suppression complète au niveau 3.',
  NUCLEAR_REACTOR:
    'Débloque la division atomique et la garde à neutrons dans leurs bâtiments de formation. Produit 120 or/min ; production +80 / +200 / +400 / +700 % aux niveaux 2 / 3 / 4 / 5. Radioactivité : peut contaminer sa case et les six voisines, signalées par des contours et un voile verts. Dès 30 points de contamination, la production des bâtiments touchés est divisée par deux. Un laboratoire isotopique à trois cases maximum réduit les émissions de 2 points par niveau et les bloque au niveau 3. Un ingénieur ou terrassier peut décontaminer pour 2 PA, 20 or et 50 fer. Au niveau 5, permet les frappes atomiques avec un silo de niveau 5.',
  HELIPAD:
    'Débloque progressivement les hélicoptères sur cinq niveaux : reconnaissance, assaut, précision, interception et siège. Réacteur noir requis ; fonderie atomique pour les deux modèles ultimes. +25 / +60 / +80 / +100 % aux niveaux 2 / 3 / 4 / 5, pour les appareils existants et futurs.',
  ATOMIC_FOUNDRY:
    'Assemble le char Mausolée et le chenillé de l’Apocalypse ; débloque les unités atomiques ultimes des autres filières. Améliorations : +25 / +60 / +80 / +100 % aux niveaux 2 / 3 / 4 / 5 pour les unités qu’elle forme, existantes et futures.',
  AERODROME:
    'Recrute avions de reconnaissance, chasseurs et bombardiers, puis 5 modèles atomiques avec un réacteur noir. Nécessite une plaine ou des ruines. Chaque amélioration renforce les avions existants et futurs de +25 / +60 / +80 / +100 % aux niveaux 2 / 3 / 4 / 5.',
  AIRSHIP_YARD:
    'Assemble les dirigeables de guerre et l’aile de l’Apocalypse : bombardement et observation. Chaque amélioration renforce vos dirigeables existants et futurs de +25 / +60 / +80 / +100 % aux niveaux 2 / 3 / 4 / 5.',
  DRAGON_ROOST:
    'Invoque successivement drakes des cendres, dragons occultes, wyvernes des tempêtes, dragons au radium et séraphins du réacteur. Chaque modèle exige ses infrastructures. Chaque amélioration renforce les dragons existants et futurs de +25 / +60 / +80 / +100 % aux niveaux 2 / 3 / 4 / 5.',
  FLAK_BATTERY:
    'Recrute les canons antiaériens Flak et les chenillés Flak gamma avec la filière atomique. Défense du bâtiment +3 ; les tirs sont effectués par les canons recrutés, sur votre ordre. Amélioration : +25 % puis +60 % aux canons existants et futurs. Niveaux 4 et 5 : +80 % et +100 %.',
  WOOD_WALL: `Occupe une case, bloque les ennemis terrestres et laisse passer vos unités. Se raccorde aux remparts voisins. Une enceinte fermée revendique les terres neutres intérieures ; en cas de brèche, les cases sans bâtiment redeviennent neutres. Évolue avec ${BUILDINGS.STONE_WALL.cost.STONE} pierre, puis ${BUILDINGS.STEEL_WALL.cost.IRON} fer pour l’acier (2 PA par évolution). Sélectionnez le mur pour y installer une tourelle à tir manuel.`,
  STONE_WALL: `Remplace une palissade : 240 PV, défense 6. Vos unités traversent ; les ennemis terrestres doivent ouvrir une brèche. Évolue en acier avec ${BUILDINGS.STEEL_WALL.cost.IRON} fer et 2 PA. Peut porter une tourelle de niveau 1 ou 2.`,
  STEEL_WALL:
    'Palier 3 : 480 PV, défense 12. Bloque les ennemis terrestres, même sur une route. L’acier est construit à partir de votre réserve de fer. Peut porter la tourelle Tesla de niveau 3.',
  CONCRETE_WALL:
    'Palier 4 : béton blindé, 900 PV et défense 20. Permet la tourelle automatique de forteresse.',
  ATOMIC_WALL: 'Palier 5 : enceinte atomique, 1 600 PV et défense 32. Permet le lance à neutrons.',
  TESLA_COIL:
    'Fortification électrique (+4 défense) ; forme les voltigeurs Tesla puis les templiers gamma avec la filière atomique.',
  CRYPT_BARRACKS:
    'Forme grenadiers revenants et cavaliers spectraux, puis exécuteurs et éclaireurs blafards avec la filière atomique.',
  ALCHEMY_FOUNDRY: 'Produit 10 or par minute et débloque marcheurs de siège et chars possédés.',
  BLACK_OBSERVATORY:
    'Observe dans un rayon de 12 cases. Filière de reconnaissance : chasseurs de maléfices, commandos, opérateurs de drones, tireurs isotopiques, puis chasseurs blafards à moto.',
  FARM: 'Produit des vivres pour nourrir les habitants et entretenir les troupes.',
  LUMBER: 'Exploite le bois en forêt ; finance les premières constructions.',
  MINE: 'Extrait le fer des collines pour les armes, les véhicules et les réparations.',
  GOLD_MINE:
    'Extrait 12 pièces d’or par minute sur colline ou montagne. Nécessite une mine de fer et un atelier ; améliorable sur 5 niveaux.',
  MARKET: 'Permet de proposer des échanges de ressources par caravane.',
  WAREHOUSE: 'Ajoute 1 000 places de stockage pour chaque ressource.',
  WORKSHOP:
    'Produit des points de carburant contre or, bois et fer (stockage partagé de 10 à 50, quota de 10 à 25 points/h selon le meilleur producteur). Forme ingénieurs, terrassiers, engins de siège et balistes ; débloque forge et garage. Avec un réacteur noir : sapeurs atomiques.',
  BARRACKS: 'Forme les premières troupes et les éclaireurs ; base de la filière militaire.',
  FORT: 'Fortification qui forme les troupes de caserne et sécurise un point de passage. Avec un réacteur noir : sentinelles de cobalt.',
  TOWER: 'Poste de surveillance : vision de 7 cases autour de la tour.',
  OUTPOST:
    'Fonde une nouvelle base sans limite de distance sur une terre neutre, avec un paysan sur la case. Ouvre les chantiers à 3 cases autour, forme des paysans et évolue en village. Votre capitale reste inchangée.',
  VILLAGE: 'Centre civil : forme les paysans, produit des ressources et accueille la population.',

  QUARRY: 'Extrait 6 pierres par minute sur colline ou montagne.',
  ARSENAL:
    'Forme fusiliers, troupes d’assaut et officiers ; avec un réacteur noir, grenadiers au radium et tireurs isotopiques.',
  BUNKER: 'Fortification résistante : +5 de défense contre les attaques.',
  GARAGE:
    'Produit motos et automitrailleuses. Avec un réacteur noir : 6 motos atomiques et l’automitrailleuse au radium.',
  TANK_FACTORY:
    'Assemble chars, canons et batteries de fusées, puis semi-chenillés cobalt et chasseurs de chars isotopiques avec un réacteur noir.',
  REFINERY:
    'Convertit or, bois et fer en carburant, avec 20 % de réduction par rapport à l’atelier (stockage partagé de 10 à 50, quota de 10 à 25 points/h selon le meilleur producteur). Soutient l’industrie : +6 or par minute ; débloque les blindés.',
  MUNITIONS: 'Débloque les armes lourdes ; le fer nécessaire doit être extrait ou acheté.',
  RADIO: 'Observe le terrain dans un rayon de 10 cases.',
  FIELD_HOSPITAL:
    'Convertit or et vivres en points de pervitine, avec 20 % de réduction par rapport au monastère (stockage partagé de 10 à 50, quota de 10 à 25 points/h selon le meilleur producteur). Forme les guérisseuses et accélère la croissance de population.',
  GUN_BATTERY: 'Position défensive (+3) qui produit les canons de campagne.',
  OCCULT_LAB: 'Unit la forge et les savoirs interdits : chevaliers mécaniques et acolytes.',
  ROCKET_SILO: `Assemble les batteries de fusées à longue portée. Au niveau 5, avec un réacteur de niveau 5 : frappe atomique de ${hexArea(STRATEGY.nuclearRadius)} cases, alerte 5 minutes avant impact. Terres brûlées sans ressources, à restaurer au terrassier avant construction. Coût : 10 PA et 1 000 000 de chaque ressource (or, bois, pierre, fer, vivres) ; recharge 6 heures.`,
  LOGISTICS_CENTER:
    'Convertit vos ressources en 1, 5 ou 10 PA, sans dépenser de PA. Quota partagé : 10 à 30 PA sur une heure glissante selon le développement du royaume. Niveaux 2 et 4 : nouvelles recettes avec l’époque correspondante ; chaque amélioration réduit les coûts de 5 %, jusqu’à 20 %. Les PA gagnés peuvent dépasser 20.',
  RAIL_DEPOT: 'Logistique industrielle : +1 500 de stockage et +5 or par minute.',

  CAMP: 'Premier paysan gratuit si vous n’en avez aucun. Produit or et vivres ; le bois se récolte en forêt.',
  HOUSE: 'Accueille 12 habitants supplémentaires et augmente votre capacité de recrutement.',
  GRANARY: 'Ajoute 500 places de stockage ; les vivres doivent être récoltés ou produits.',
  HUNTER: 'Fournit des vivres dès les premières récoltes de bois.',
  FISHERY: 'Production importante de vivres sur rivière ou marais.',
  STABLE:
    'Recrute cavalerie légère et chevaliers, puis hussards, lanciers, cuirassiers et dragons des cendres avec un réacteur noir.',
  ARCHERY:
    'Filière de précision : archers au niveau 1, arbalétriers au niveau 2, tireurs au niveau 3, fusils électromagnétiques au niveau 4 et tireurs isotopiques au niveau 5. Les armes avancées exigent leurs infrastructures.',
  MONASTERY:
    'Produit des points de pervitine contre or et vivres (stockage partagé de 10 à 50, quota de 10 à 25 points/h selon le meilleur producteur). Filière spirituelle sur cinq niveaux : guérisseuses, paladins, acolytes du Vide, voltigeurs Tesla, puis paladins gamma ; accélère la croissance de population. Les unités avancées exigent les infrastructures occultes ou atomiques.',
  FORGE:
    'Transforme les équipements et débloque les troupes lourdement équipées ; le fer vient des mines.',
  LIBRARY:
    'Savoir et surveillance : prérequis des acolytes du Vide, recrutés au laboratoire des cendres ou au monastère. Étend la vision de tous vos bâtiments.',
  BAKERY: 'Transforme votre domaine agricole en production abondante de vivres.',
  WELL: 'Produit des vivres et accélère la croissance de population.',
};

export const BUILDING_DEFENSE: Partial<Record<BuildingKind, number>> = {
  FLAK_BATTERY: 3,
  WOOD_WALL: 0,
  STONE_WALL: 6,
  STEEL_WALL: 12,
  CONCRETE_WALL: 20,
  ATOMIC_WALL: 32,
  TESLA_COIL: 4,
  BUNKER: 5,
  GUN_BATTERY: 3,
};
export const RECON_UNITS: UnitKind[] = [
  ...ELITE_RECON,
  ...CAMPAIGN_RECON,
  ...RADIOACTIVE_RECON,
  'RECON_PLANE',
  'HEX_HUNTER',
  'SCOUT',
  'RANGER',
  'VOID_ACOLYTE',
  'MOTORCYCLE',
  'ARMORED_CAR',
  'SNIPER',
];

export const CITY_LEVELS = [
  'Avant-poste',
  'Village',
  'Bourg impérial',
  'Ville industrielle',
  'Métropole',
  'Cité atomique',
];
export const DEFAULT_SETTINGS = {
  locale: 'fr',
  masterVolume: 0,
  musicVolume: 0,
  sfxVolume: 0,
  muteUnfocused: true,
  cameraSpeed: 1,
  edgeScrolling: false,
  grid: true,
  coordinates: false,
  reducedMotion: false,
  highContrast: false,
  confirmDangerous: true,
  autoCenterEvents: false,
  combatNotifications: true,
  realmNotifications: true,
  input: 'mouse',
  uiScale: 1,
  tutorialCompleted: false,
  emblem: 'crown',
  realmName: '',
  bannerColor: '#bc9860',
  bannerSecondary: '#272b26',
  bannerShape: 'swallow',
  bannerPattern: 'plain',
  bannerAccent: '#d6c9a5',
  miniFlagShape: 'same',
  lastCameraQ: 0,
  lastCameraR: 0,
};
export type Settings = typeof DEFAULT_SETTINGS;

/** Manual harvesting is separate from building production and always uses the occupied tile. */
export const TERRAIN_RESOURCES: Record<Terrain, readonly Resource[]> = {
  SEA: [],
  COAST: [],
  BEACH: [],
  SCORCHED: [],
  PLAIN: ['FOOD'],
  FOREST: ['WOOD'],
  HILL: ['STONE', 'IRON'],
  MOUNTAIN: ['STONE'],
  RIVER: ['FOOD'],
  MARSH: ['FOOD'],
  RUINS: ['GOLD'],
  CORRUPTION: [],
  ALIEN: [],
};
export const UNIT_TABS = [
  'Toutes',
  'Civils & soutien',
  'Infanterie médiévale',
  'Infanterie d’élite',
  'Armes à distance',
  'Cavalerie',
  'Armes à feu',
  'Motos',
  'Véhicules',
  'Blindés',
  'Marine',
  'Aviation',
  'Hélicoptères',
  'Cloches occultes',
  'Artillerie',
  'Occulte',
] as const;
export type UnitTab = (typeof UNIT_TABS)[number];
export const UNIT_CATEGORY: Record<UnitKind, UnitTab> = {
  ...NAVAL_CATEGORIES,
  ...TRANSPORT_CATEGORIES,
  ...SPECIALIST_CATEGORIES,
  ...ELITE_CATEGORIES,
  ...CAMPAIGN_CATEGORIES,
  ...ERA_REINFORCEMENT_CATEGORIES,
  MUSKETEER: 'Armes à feu',
  IMPERIAL_GRENADIER: 'Armes à feu',
  CUIRASSIER: 'Cavalerie',
  COMMANDO: 'Armes à feu',
  DRONE_OPERATOR: 'Armes à distance',
  NEUTRON_GUARD: 'Occulte',
  HERO: 'Civils & soutien',
  ...RADIOACTIVE_CATEGORIES,
  GLOCKE_VRIL: 'Cloches occultes',
  GLOCKE_NACHT: 'Cloches occultes',
  GLOCKE_APOCALYPSE: 'Cloches occultes',
  RECON_PLANE: 'Aviation',
  FIGHTER: 'Aviation',
  BOMBER: 'Aviation',
  ZEPPELIN: 'Aviation',
  OCCULT_DRAGON: 'Aviation',
  FLAK_CANNON: 'Artillerie',
  TESLA_TROOPER: 'Occulte',
  HEX_HUNTER: 'Occulte',
  PLAGUE_MEDIC: 'Civils & soutien',
  GHOUL_INFANTRY: 'Occulte',
  SPECTRAL_RIDER: 'Cavalerie',
  SIEGE_WALKER: 'Véhicules',
  HEX_TANK: 'Véhicules',
  MORTAR: 'Artillerie',
  PEASANT: 'Civils & soutien',
  ENGINEER: 'Civils & soutien',
  TERRAFORMER: 'Civils & soutien',
  HEALER: 'Civils & soutien',
  SCOUT: 'Civils & soutien',
  MILITIA: 'Infanterie médiévale',
  INFANTRY: 'Infanterie médiévale',
  GUARD: 'Infanterie médiévale',
  SPEARMAN: 'Infanterie médiévale',
  BERSERKER: 'Infanterie médiévale',
  PALADIN: 'Infanterie médiévale',
  ARCHER: 'Armes à distance',
  CROSSBOW: 'Armes à distance',
  RANGER: 'Armes à distance',
  KNIGHT: 'Cavalerie',
  LIGHT_CAVALRY: 'Cavalerie',
  RIFLEMAN: 'Armes à feu',
  STORMTROOPER: 'Armes à feu',
  MACHINE_GUNNER: 'Armes à feu',
  SNIPER: 'Armes à feu',
  BAZOOKA: 'Armes à feu',
  OFFICER: 'Armes à feu',
  MOTORCYCLE: 'Motos',
  ARMORED_CAR: 'Véhicules',
  TANK: 'Véhicules',
  RAM: 'Artillerie',
  SIEGE: 'Artillerie',
  FIELD_GUN: 'Artillerie',
  ROCKET_LAUNCHER: 'Artillerie',
  IRON_REVENANT: 'Occulte',
  VOID_ACOLYTE: 'Occulte',
};
export const BUILDING_TABS = [
  'Tous',
  'Vie civile',
  'Ressources',
  'Recrutement',
  'Défenses',
  'Industrie',
  'Savoir & logistique',
] as const;
export type BuildingTab = (typeof BUILDING_TABS)[number];
export const BUILDING_CATEGORY: Record<BuildingKind, BuildingTab> = {
  ...NAVAL_BUILDING_CATEGORIES,
  STEAM_SAWMILL: 'Ressources',
  MECHANIZED_QUARRY: 'Ressources',
  INDUSTRIAL_MINE: 'Ressources',
  OCCULT_SAWMILL: 'Ressources',
  RUNIC_QUARRY: 'Ressources',
  ABYSSAL_MINE: 'Ressources',
  GLOCKE_COMPLEX: 'Recrutement',
  ISOTOPE_LAB: 'Savoir & logistique',
  NUCLEAR_REACTOR: 'Industrie',
  HELIPAD: 'Recrutement',
  ATOMIC_FOUNDRY: 'Industrie',
  AERODROME: 'Recrutement',
  AIRSHIP_YARD: 'Recrutement',
  DRAGON_ROOST: 'Recrutement',
  FLAK_BATTERY: 'Défenses',
  WOOD_WALL: 'Défenses',
  STONE_WALL: 'Défenses',
  STEEL_WALL: 'Défenses',
  CONCRETE_WALL: 'Défenses',
  ATOMIC_WALL: 'Défenses',
  TESLA_COIL: 'Défenses',
  CRYPT_BARRACKS: 'Recrutement',
  ALCHEMY_FOUNDRY: 'Industrie',
  BLACK_OBSERVATORY: 'Savoir & logistique',
  CAMP: 'Vie civile',
  HOUSE: 'Vie civile',
  OUTPOST: 'Vie civile',
  VILLAGE: 'Vie civile',
  WELL: 'Vie civile',
  FIELD_HOSPITAL: 'Vie civile',
  FARM: 'Ressources',
  LUMBER: 'Ressources',
  MINE: 'Ressources',
  GOLD_MINE: 'Ressources',
  QUARRY: 'Ressources',
  HUNTER: 'Ressources',
  FISHERY: 'Ressources',
  BAKERY: 'Ressources',
  BARRACKS: 'Recrutement',
  ARCHERY: 'Recrutement',
  STABLE: 'Recrutement',
  ARSENAL: 'Recrutement',
  GARAGE: 'Recrutement',
  FORT: 'Défenses',
  TOWER: 'Défenses',
  BUNKER: 'Défenses',
  GUN_BATTERY: 'Défenses',
  WORKSHOP: 'Industrie',
  FORGE: 'Industrie',
  REFINERY: 'Industrie',
  MUNITIONS: 'Industrie',
  TANK_FACTORY: 'Industrie',
  ROCKET_SILO: 'Industrie',
  MONASTERY: 'Savoir & logistique',
  LIBRARY: 'Savoir & logistique',
  OCCULT_LAB: 'Savoir & logistique',
  RADIO: 'Savoir & logistique',
  LOGISTICS_CENTER: 'Savoir & logistique',
  RAIL_DEPOT: 'Savoir & logistique',
  WAREHOUSE: 'Savoir & logistique',
  GRANARY: 'Savoir & logistique',
  MARKET: 'Savoir & logistique',
};
export const unitPopulation = (kind: UnitKind) =>
  UNIT_PROFILES[kind].population ??
  (kind === 'PEASANT'
    ? 3
    : ['TANK', 'HEX_TANK', 'SIEGE_WALKER', 'BOMBER', 'ZEPPELIN', 'OCCULT_DRAGON'].includes(kind)
      ? 12
      : UNIT_PROFILES[kind].mechanical
        ? 8
        : UNIT_PROFILES[kind].siege
          ? 6
          : 5);
/** Food for the unit's actual crew; passenger rations are billed on passengers separately. */
export function unitFoodUpkeep(kind: UnitKind): number {
  if (kind === 'HERO') return 0;
  const profile = UNIT_PROFILES[kind];
  if (profile.builder || profile.healer) return 0.25;
  const tier = UNIT_TIERS[kind];
  const base =
    unitPopulation(kind) * (profile.mechanical ? 0.09 : 0.12) +
    [0, 0.2, 0.5, 0.9, 1.5, 2.3, 3.4, 4.5][tier];
  return (
    Math.round(
      base * (profile.mounted ? 1.6 : profile.flying && !profile.mechanical ? 2 : 1) * 10,
    ) / 10
  );
}
export function unitUpkeep(kind: UnitKind): Wallet {
  if (kind === 'HERO') return { GOLD: 0, WOOD: 0, STONE: 0, IRON: 0, FOOD: 0 };
  const tier = UNIT_TIERS[kind],
    profile = UNIT_PROFILES[kind];
  if (tier >= 2 && !profile.builder && !profile.healer) {
    const places = unitPopulation(kind);
    return {
      GOLD: Math.round((places * 0.08 + [0, 0, 0.1, 0.25, 0.75, 1.5, 3, 5][tier]) * 100) / 100,
      WOOD: 0,
      STONE: 0,
      IRON: profile.mechanical
        ? Math.round((places * 0.04 + Math.max(0, tier - 2) * 0.3) * 100) / 100
        : 0,
      FOOD: unitFoodUpkeep(kind),
    };
  }
  // Recruitment inflation is an investment, not a retroactive ×15 upkeep bill.
  const cost = Object.values(UNIT_BASE_CATALOG[kind].cost).reduce<number>((a, b) => a + b, 0);
  return {
    GOLD: Math.max(0.15, cost / 600),
    WOOD: 0,
    STONE: 0,
    IRON: UNIT_PROFILES[kind].mechanical ? 0.2 + UNITS[kind].attack / 40 : 0,
    FOOD: unitFoodUpkeep(kind),
  };
}

/** Production investments pay for themselves; military levels also buy new recruitment access. */
export function ordinaryUpgradeCost(kind: BuildingKind, level: number): Partial<Wallet> {
  const producer =
    Object.keys(BUILDINGS[kind].production).length > 0 &&
    !Object.values(UNIT_PROFILES).some((p) => p.recruitAt.includes(kind));
  const cost = scaleCost(
    BUILDINGS[kind].cost,
    (producer && BUILDING_ECONOMIC_TIERS[kind] <= 1
      ? [0.8, 1.4, 8, 20]
      : producer
        ? PRODUCER_UPGRADE_MULTIPLIERS
        : UPGRADE_MULTIPLIERS)[level - 1],
  );
  if (Object.values(UNIT_PROFILES).some((p) => !p.builder && p.recruitAt.includes(kind))) {
    const floor = [80, 500, 2500, 10000][level - 1];
    for (const [r, ratio] of [
      ['GOLD', 1],
      ['WOOD', 0.5],
      ['STONE', 0.4],
      ['IRON', 0.6],
    ] as const)
      cost[r] = Math.max(cost[r] ?? 0, Math.ceil(floor * ratio));
  }
  return cost;
}

/** Authoritative upgrade quote shared by the server and the preview. */
export function buildingUpgrade(kind: BuildingKind, level: number) {
  if (isWall(kind)) {
    const next = WALL_KINDS[WALL_KINDS.indexOf(kind) + 1];
    if (!next) return null;
    return {
      kind: next as BuildingKind,
      level: 1,
      name: BUILDINGS[next].name,
      cost: { ...BUILDINGS[next].cost } as Partial<Wallet>,
      population: 0,
      minimumPopulation: 0,
    };
  }
  if (kind === 'CAMP')
    return {
      kind: 'OUTPOST' as BuildingKind,
      level: 1,
      name: BUILDINGS.OUTPOST.name,
      cost: { GOLD: 20, WOOD: 60, FOOD: 30 } as Partial<Wallet>,
      population: 0,
      minimumPopulation: 10,
    };
  if (kind === 'OUTPOST')
    return {
      kind: 'VILLAGE' as BuildingKind,
      level: 1,
      name: CITY_LEVELS[1],
      cost: { STONE: 60, GOLD: 120, WOOD: 135, IRON: 30, FOOD: 60 } as Partial<Wallet>,
      population: 10,
      minimumPopulation: 15,
    };
  if (kind !== 'VILLAGE') {
    if (level >= 5) return null;
    return {
      kind,
      level: level + 1,
      name: `${BUILDINGS[kind].name} · niveau ${level + 1}`,
      cost: ordinaryUpgradeCost(kind, level),
      population: 0,
      minimumPopulation: 0,
    };
  }
  if (level >= 5) return null;
  return {
    kind: 'VILLAGE' as BuildingKind,
    level: level + 1,
    name: CITY_LEVELS[level + 1],
    cost: scaleCost(
      {
        STONE: 20 * level,
        GOLD: 50 * level,
        WOOD: 40 * level,
        IRON: 20 * level,
        FOOD: 25 * level,
      },
      [6, 12, 24, 48][level - 1],
    ),
    population: level * 25,
    minimumPopulation: 0,
  };
}

export const productionMultiplier = (kind: BuildingKind, level: number) =>
  kind === 'VILLAGE'
    ? level
    : (BUILDING_ECONOMIC_TIERS[kind] <= 1 && Object.keys(BUILDINGS[kind].production).length
        ? [1, 1.8, 3, 4.5, 6]
        : PRODUCTION_MULTIPLIERS)[Math.max(0, Math.min(4, level - 1))];
export const trainingBonusAt = (kind: BuildingKind, level: number) =>
  Object.values(UNIT_PROFILES).some((p) => p.recruitAt.includes(kind) && !p.builder)
    ? TRAINING_BONUSES[Math.max(0, Math.min(4, level - 1))]
    : 0;
export const storageBonus = (kind: BuildingKind, level: number) => {
  const index = Math.max(0, Math.min(4, level - 1));
  if (EXTRACTOR_BUILDINGS.includes(kind))
    return [0, 250, 750, 2500, 8000][index] * (BUILDING_ECONOMIC_TIERS[kind] >= 3 ? 3 : 1);
  return (
    kind === 'WAREHOUSE'
      ? [1000, 4000, 16000, 50000, 150000]
      : kind === 'GRANARY'
        ? [500, 2000, 8000, 25000, 75000]
        : kind === 'RAIL_DEPOT'
          ? [1500, 7500, 30000, 90000, 270000]
          : [0, 0, 0, 0, Object.keys(BUILDINGS[kind].production).length ? 8000 : 0]
  )[index];
};
export const populationCapacity = (kind: BuildingKind, level: number) =>
  (BUILDING_POPULATION[kind] ?? 0) *
  (kind === 'VILLAGE' ? level + 1 : 2 * productionMultiplier(kind, level));

export * from './expeditions';

export * from './island-discoveries';
