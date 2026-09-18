import type { Wallet } from './index';
export const STRATEGY = {
  allianceSize: 5,
  invitationLifetime: 86_400_000,
  departureTruce: 86_400_000,
  warDuration: 86_400_000,
  nuclearRadius: 8,
  nuclearDelay: 300_000,
  nuclearCooldown: 21_600_000,
  nuclearAP: 10,
  nuclearCost: {
    GOLD: 1_000_000,
    WOOD: 1_000_000,
    STONE: 1_000_000,
    IRON: 1_000_000,
    FOOD: 1_000_000,
  } satisfies Wallet,
  cleanupCost: { GOLD: 20, IRON: 50 } as Partial<Wallet>,
  expeditionInterval: 3_600_000,
  expeditionLifetime: 7_200_000,
  siteInterval: 1_800_000,
} as const;
export const veteranRank = (victories = 0) =>
  victories >= 25 ? 3 : victories >= 10 ? 2 : victories >= 3 ? 1 : 0;
export const VETERAN_NAMES = ['Recrue', 'Aguerrie', 'Vétéran', 'Élite'] as const;
export const SITE_NAMES = {
  RADIO: 'Relais de veille',
  MINE: 'Gisement exceptionnel',
  SANCTUARY: 'Sanctuaire occulte',
} as const;
export const SITE_BENEFITS = {
  RADIO: '+1 vision pour vos unités (non cumulable)',
  MINE: '+8 fer / minute pendant votre présence',
  SANCTUARY: '+5 or / minute pendant votre présence',
} as const;

/** Freeze each launched missile's footprint; pre-update missiles keep their announced radius. */
export const nuclearStrikeRadius = (strike: { radius?: number }) => strike.radius ?? 2;
export const hexArea = (radius: number) => 1 + 3 * radius * (radius + 1);
