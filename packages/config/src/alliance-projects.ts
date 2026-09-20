import type { BuildingKind, Wallet } from './index';
export const ALLIANCE_PROJECTS = {
  SUPPLY: {
    name: 'Intendance commune',
    hosts: ['LOGISTICS_CENTER', 'WAREHOUSE'] as BuildingKind[],
    benefit: '−10 % sur les ressources nécessaires à la production de PA pour chaque membre.',
    cost: { GOLD: 12000, WOOD: 18000, STONE: 12000, IRON: 8000, FOOD: 24000 },
  },
  HARBOR: {
    name: 'Base navale d’alliance',
    hosts: ['PORT', 'SHIPYARD'] as BuildingKind[],
    benefit: '−10 % sur le prix du carburant pour chaque membre.',
    cost: { GOLD: 18000, WOOD: 24000, STONE: 16000, IRON: 20000, FOOD: 12000 },
  },
  WATCH: {
    name: 'Réseau de forteresses',
    hosts: ['FORT', 'TOWER'] as BuildingKind[],
    benefit: '+2 cases de vision autour des forts et tours de chaque membre.',
    cost: { GOLD: 12000, WOOD: 16000, STONE: 30000, IRON: 18000, FOOD: 16000 },
  },
} satisfies Record<string, { name: string; hosts: BuildingKind[]; benefit: string; cost: Wallet }>;
export type AllianceProjectKind = keyof typeof ALLIANCE_PROJECTS;
export const PROJECT_BUILD_TIME = 2 * 60 * 60 * 1000;
export const WAR_HOLD_TIME = 30 * 60 * 1000;
export const WAR_CAMPAIGN_COST: Partial<Wallet> = { GOLD: 750, FOOD: 750 };
export const WAR_CAMPAIGN_REWARD: Partial<Wallet> = { GOLD: 2000, FOOD: 1500, IRON: 1000 };
