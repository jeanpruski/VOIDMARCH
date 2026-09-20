import { BUILDING_MIN_ERA, unitRequiredEra, eraAccessReason } from './epochs';
import {
  BUILDINGS,
  UNIT_PROFILES,
  isWall,
  WALL_KINDS,
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
export const DEVELOPMENT_TROPHIES = [0, 0, 1, 5, 20, 50] as const;
export interface DevelopmentProgress {
  trophies: number;
  era?: number;
  bot?: boolean;
  /** Pre-update access is exempt from the new trophy condition only. */
  grandfatheredLevel?: number;
}
export const developmentTrophyRequirement = (stage: number) =>
  DEVELOPMENT_TROPHIES[Math.max(1, Math.min(5, stage))];
export function developmentTrophiesMet(stage: number, progress: DevelopmentProgress) {
  return (
    stage <= (progress.grandfatheredLevel ?? 1) ||
    progress.trophies >= developmentTrophyRequirement(stage)
  );
}
export function developmentStage(sites: readonly Site[], progress: DevelopmentProgress) {
  if (progress.era !== undefined) return progress.era;
  let stage = 1;
  while (
    stage < 5 &&
    !developmentMissing(sites, stage + 1).length &&
    developmentTrophiesMet(stage + 1, progress)
  )
    stage++;
  return stage;
}
export const missionRecruiters = () => [
  ...new Set(
    Object.values(UNIT_PROFILES)
      .filter((p) => !p.builder && !p.hero)
      .flatMap((p) => p.recruitAt),
  ),
];
export function militaryDevelopmentLevel(sites: readonly Site[]) {
  const recruiters = missionRecruiters();
  return Math.max(
    1,
    ...sites.filter((b) => b.hp > 0 && recruiters.includes(b.kind)).map((b) => b.level),
  );
}
export function conquestDevelopmentLevel(sites: readonly Site[], progress: DevelopmentProgress) {
  return Math.min(developmentStage(sites, progress), militaryDevelopmentLevel(sites));
}
export function developmentReason(
  sites: readonly Site[],
  stage: number,
  progress: DevelopmentProgress,
) {
  if (progress.era !== undefined) return eraAccessReason(progress.era, stage);
  const missing = developmentMissing(sites, stage).map(
    (r) => `${r.kinds.map((k) => BUILDINGS[k].name).join(' ou ')} niveau ${r.level}`,
  );
  if (!developmentTrophiesMet(stage, progress))
    missing.push(
      `trophées ${progress.trophies}/${developmentTrophyRequirement(stage)} (missions et expéditions)`,
    );
  return missing.length
    ? `Palier ${DEVELOPMENT_STAGES[stage - 1]} : ${missing.join(' ; ')} nécessaire(s).`
    : '';
}
export function constructionDevelopmentStage(kind: BuildingKind) {
  return BUILDING_MIN_ERA[kind];
}
/** Historical fallback for snapshots predating persisted kingdom eras. */
export function upgradeDevelopmentStage(kind: BuildingKind, nextLevel: number) {
  if (kind === 'LOGISTICS_CENTER') return Math.min(5, nextLevel);
  // Producer investment and logistical capacity can precede military advancement.
  const military = Object.values(UNIT_PROFILES).some(
    (p) => !p.builder && !p.healer && p.recruitAt.includes(kind),
  );
  return !isWall(kind) && military ? (nextLevel >= 5 ? 4 : nextLevel >= 4 ? 3 : 1) : 1;
}
export function unitDevelopmentStage(kind: UnitKind) {
  return unitRequiredEra(kind);
}
export const EXPEDITION_GOLD = [0, 300, 900, 3000, 9000, 24000] as const;
export const expeditionSearchCost = (level: number) => ({
  FOOD: [0, 40, 120, 400, 1000, 2500][Math.max(1, Math.min(5, level))],
});

/** Walls encode their displayed level in their material, not their stored level. */
export const buildingUpgradeLevel = (target: { kind: BuildingKind; level: number }) =>
  isWall(target.kind) ? WALL_KINDS.indexOf(target.kind) + 1 : target.level;

/** Epoch cap for current worlds; trophy-only fallback for historical snapshots. */
export function upgradeTrophyReason(level: number, progress: DevelopmentProgress) {
  if (progress.era !== undefined) return eraAccessReason(progress.era, level);
  const required = developmentTrophyRequirement(level);
  return progress.bot || progress.trophies >= required
    ? ''
    : `Niveau ${level} : trophées ${progress.trophies}/${required} requis (missions et expéditions). Les trophées ne sont pas dépensés.`;
}
export function buildingUpgradeReason(
  sites: readonly Site[],
  currentKind: BuildingKind,
  target: { kind: BuildingKind; level: number },
  progress: DevelopmentProgress,
) {
  if (progress.era !== undefined)
    return eraAccessReason(
      progress.era,
      Math.max(buildingUpgradeLevel(target), BUILDING_MIN_ERA[target.kind]),
    );
  return progress.bot
    ? developmentReason(sites, upgradeDevelopmentStage(currentKind, target.level), progress)
    : upgradeTrophyReason(buildingUpgradeLevel(target), progress);
}

/** Historical era, separate from the local recruiter level. */
export const unitTechnologyLevel = unitRequiredEra;
