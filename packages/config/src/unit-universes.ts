import { ELITE_FAMILIES, eliteUnit } from './elite-units';
import { CAMPAIGN_FAMILIES, campaignUnit } from './campaign-units';

export const UNIT_FAMILIES = { ...CAMPAIGN_FAMILIES, ...ELITE_FAMILIES };
export const unitUniverse = (kind: string) => campaignUnit(kind) ?? eliteUnit(kind);
