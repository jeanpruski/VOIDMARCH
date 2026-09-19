import {
  BUILDINGS,
  BUILDING_ECONOMIC_TIERS,
  UNIT_PROFILES,
  UNIT_TIERS,
  isWall,
  type BuildingKind,
  type UnitKind,
} from './index';

type Site = { kind: BuildingKind; level: number; hp: number };
export const DEVELOPMENT_STAGES = [
  'Fondations',
  'Manufactures',
  'Industrie',
  'Occultisme',
  'Atome',
] as const;
/** Alternatives inside one row; every row is required. No clocks or disposable wealth checks. */
export const DEVELOPMENT_REQUIREMENTS: Record<number, { kinds: BuildingKind[]; level: number }[]> =
  {
    2: [
      { kinds: ['WORKSHOP'], level: 2 },
      { kinds: ['MARKET'], level: 2 },
    ],
    3: [
      { kinds: ['WORKSHOP'], level: 3 },
      { kinds: ['FORGE'], level: 3 },
      { kinds: ['STEAM_SAWMILL', 'MECHANIZED_QUARRY', 'INDUSTRIAL_MINE'], level: 2 },
    ],
    4: [
      { kinds: ['OCCULT_LAB'], level: 3 },
      { kinds: ['REFINERY'], level: 3 },
      { kinds: ['OCCULT_SAWMILL', 'RUNIC_QUARRY', 'ABYSSAL_MINE'], level: 3 },
    ],
    5: [
      { kinds: ['NUCLEAR_REACTOR'], level: 4 },
      { kinds: ['ISOTOPE_LAB'], level: 4 },
      { kinds: ['REFINERY'], level: 4 },
    ],
  };
export function developmentMissing(sites: readonly Site[], stage: number) {
  const requirements = new Map<string, { kinds: BuildingKind[]; level: number }>();
  for (let level = 2; level <= Math.min(5, stage); level++) {
    for (const req of DEVELOPMENT_REQUIREMENTS[level]) {
      const key = req.kinds.join(',');
      if ((requirements.get(key)?.level ?? 0) < req.level) requirements.set(key, req);
    }
  }
  return [...requirements.values()].filter(
    (req) => !sites.some((b) => b.hp > 0 && b.level >= req.level && req.kinds.includes(b.kind)),
  );
}
export function developmentStage(sites: readonly Site[]) {
  let stage = 1;
  while (stage < 5 && !developmentMissing(sites, stage + 1).length) stage++;
  return stage;
}
export function developmentReason(sites: readonly Site[], stage: number) {
  const missing = developmentMissing(sites, stage);
  return missing.length
    ? `Palier ${DEVELOPMENT_STAGES[stage - 1]} : ${missing.map((r) => `${r.kinds.map((k) => BUILDINGS[k].name).join(' ou ')} niveau ${r.level}`).join(' ; ')} nécessaire(s).`
    : '';
}
export function constructionDevelopmentStage(kind: BuildingKind) {
  const tier = BUILDING_ECONOMIC_TIERS[kind];
  return tier >= 7 ? 5 : tier >= 5 ? 4 : tier >= 4 ? 3 : 1;
}
export function upgradeDevelopmentStage(kind: BuildingKind, nextLevel: number) {
  // Producer investment and logistical capacity can precede military advancement.
  const military = Object.values(UNIT_PROFILES).some(
    (p) => !p.builder && !p.healer && p.recruitAt.includes(kind),
  );
  return !isWall(kind) && military ? (nextLevel >= 5 ? 4 : nextLevel >= 4 ? 3 : 1) : 1;
}
export function unitDevelopmentStage(kind: UnitKind) {
  if (UNIT_PROFILES[kind].hero || UNIT_PROFILES[kind].builder || UNIT_PROFILES[kind].healer)
    return 1;
  const tier = UNIT_TIERS[kind];
  return tier >= 6 ? 5 : tier >= 5 ? 4 : tier >= 4 ? 3 : tier >= 3 ? 2 : 1;
}
export const EXPEDITION_GOLD = [0, 300, 900, 3000, 9000, 24000] as const;
export const expeditionSearchCost = (level: number) => ({
  FOOD: [0, 40, 120, 400, 1000, 2500][Math.max(1, Math.min(5, level))],
});
