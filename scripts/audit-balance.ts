import { writeFileSync } from 'node:fs';
import {
  BUILDINGS,
  TURRETS,
  WALL_KINDS,
  isWall,
  MAX_BUILDING_LEVEL,
  isBuildable,
  BUILDING_REQUIREMENTS,
  UNIT_PROFILES,
  UNITS,
  RESOURCES,
  RESOURCE_NAMES,
  unitPopulation,
  unitUpkeep,
  UNIT_TIERS,
  TIER_NAMES,
  productionMultiplier,
  trainingBonusAt,
  buildingUpgrade,
  storageBonus,
  type BuildingKind,
  type UnitKind,
  type Wallet,
} from '@voidmarch/config';
import { estimateDamage, unitStats } from '@voidmarch/game-rules';
import type { Unit } from '@voidmarch/shared';
const wallet = (values: Partial<Wallet>) =>
  RESOURCES.filter((r) => values[r])
    .map((r) => `${Number(values[r]!.toFixed(1))} ${RESOURCE_NAMES[r].toLowerCase()}`)
    .join(', ') || '—';
function infrastructure(kind: UnitKind) {
  if (kind === 'HERO') return [];
  const seen = new Set<BuildingKind>();
  const visit = (building: BuildingKind) => {
    if (seen.has(building)) return;
    seen.add(building);
    for (const parent of BUILDING_REQUIREMENTS[building] ?? []) visit(parent);
  };
  for (const building of [...UNIT_PROFILES[kind].requires, UNIT_PROFILES[kind].recruitAt[0]])
    visit(building);
  return [...seen];
}
const lines = [
  '# Audit d’équilibrage — économie et cinq âges v0.7',
  '',
  'Rapport reproductible : `node --import tsx scripts/audit-balance.ts`. Les coûts sont ceux de base, avant le bonus de construction de la Cendre. Le premier bâtiment de recrutement est utilisé pour calculer la chaîne d’infrastructure ; d’autres accès peuvent exister.',
  '',
  '## Corrections appliquées',
  '',
  '- Économie : production ×1 / ×1,8 / ×3 / ×5 / ×8 hors villes. Extracteurs industriels : 48 bois, 36 pierre ou 30 fer/min ; occultes : 160 bois, 120 pierre ou 100 fer/min. Mine d’or 24, fonderie alchimique 30, réacteur 120 or/min. Terrains requis inchangés.',
  '- Améliorations : producteurs sans recrutement ×0,8 / ×1,4 / ×2,4 / ×4 du prix de construction ; autres bâtiments ×2 / ×4 / ×8 / ×16. Planchers militaires en or, bois, pierre et fer pour payer réellement les nouveaux recrutements. Les devis des villes et des remparts restent distincts. Chaque amélioration coûte 2 PA et débite les ressources.',
  '- Formation : +25 / +60 / +80 / +100 % aux niveaux 2 à 5, appliquée aussi aux troupes existantes sans cumul des recruteurs. Statistiques de base harmonisées par palier et rôle ; rareté et vétérans conservés.',
  '- Prix des combattants de paliers 2 à 6 calculés sur leurs PV, attaque, défense, portée, mobilité et spécialités ; allocation des matériaux par rôle. Fondations, civils et prix exceptionnels des Glocke conservés. Les réductions ciblées remplacent l’inflation uniforme.',
  '- Mobilisation et entretien harmonisés par rôle et palier. Les unités mécanisées consomment du fer, les cavaliers davantage de vivres. Un manque de population bloque les nouvelles recrues sans supprimer les armées présentes.',
  '- Contres : bazooka +32 contre le blindage, Flak +30 contre l’aérien ; défense ignorée à 75 % / 50 %. École antiaérienne accessible après les munitions sans relais radio. Les contres spécialisés reçoivent une réduction de prix de 20 %.',
  '- Grenades d’infanterie : 1 PA. Artillerie et bombardiers de siège : 2 PA, attaque contre bâtiments renforcée. Les Glocke conservent leur coût très élevé et doublent leur puissance structurelle de base. Aucun tir automatique ni dégât de zone ajouté.',
  '- Stockage : logistique dédiée conservée ; les extracteurs ajoutent du stockage dès le niveau 2, triplé pour les filières industrielles et occultes.',
  '- Migration v4 : conserve le pourcentage de blessures, les bonus rares, les stocks, les PA, les possessions et remboursements historiques, archives incluses. Les PNJ existants gardent leurs statistiques tirées au sort.',
  '- Voir les parcours chiffrés et limites dans [les simulations](balance-simulations.md) et les choix dans [les notes v0.7](balance-v07.md).',
  '',
  '## Limites de la validation',
  '',
  'Les tests vérifient les sources de ressources, les refus serveur, le départ à zéro, les prérequis, les plafonds, la migration et les contres militaires. Ils ne prouvent pas un équilibre parfait entre joueurs. Les rencontres réelles, les coalitions, les sièges prolongés et le rythme à 1 PA toutes les 30 secondes nécessitent des parties longues. Une pénurie arrête la croissance ; elle ne supprime pas automatiquement les armées. Les chaînes industrielles mobilisent les cinq ressources existantes, sans jauges distinctes de pétrole ou de munitions.',
  '',
  '## Unités',
  '',
  '| Unité | Palier | PV / attaque / défense de base | Attaque avec formation niveau 5 | Déplacement / portée | PA / attaque | Places | Coût | Entretien par minute | Infrastructure requise (nombre) |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
];
for (const [kind, unit] of Object.entries(UNITS) as [UnitKind, (typeof UNITS)[UnitKind]][])
  lines.push(
    `| ${unit.name} | ${TIER_NAMES[UNIT_TIERS[kind]]} | ${unit.hp} / ${unit.attack} / ${unit.defense} | ${Number(unitStats({ kind, trainingBonus: UNIT_PROFILES[kind].builder || kind === 'HERO' ? 0 : trainingBonusAt(UNIT_PROFILES[kind].recruitAt[0], 5) }).attack.toFixed(1))} | ${unit.move} / ${unit.range} | ${unit.attack > 0 ? (UNIT_PROFILES[kind].siege ? 2 : 1) : '—'} | ${unitPopulation(kind)} | ${wallet(unit.cost)} | ${wallet(unitUpkeep(kind))} | ${infrastructure(kind).length} |`,
  );
lines.push(
  '',
  '## Bâtiments',
  '',
  '| Bâtiment | PV de base | Coût initial | Production brute / minute niveau 1 | Production brute / minute au niveau maximal | Terrains | Prérequis |',
  '| --- | --- | --- | --- | --- | --- | --- |',
);
for (const [kind, building] of Object.entries(BUILDINGS) as [
  BuildingKind,
  (typeof BUILDINGS)[BuildingKind],
][])
  lines.push(
    `| ${building.name} | ${building.hp} | ${wallet(building.cost)} | ${wallet(building.production)} | ${wallet(Object.fromEntries(RESOURCES.map((r) => [r, (building.production[r] ?? 0) * productionMultiplier(kind, kind === 'CAMP' || kind === 'OUTPOST' || isWall(kind) ? 1 : MAX_BUILDING_LEVEL)])))} | ${building.terrains.join(', ')} | ${!isBuildable(kind) ? `Évolution uniquement : ${isWall(kind) ? BUILDINGS[WALL_KINDS[WALL_KINDS.indexOf(kind) - 1]].name : 'fondation précédente'} (2 PA, coût sans réduction)` : (BUILDING_REQUIREMENTS[kind] ?? []).map((k) => BUILDINGS[k].name).join(', ') || '—'} |`,
  );
lines.push(
  '',
  '## Dépenses d’évolution',
  '',
  'Chaque ligne est un paiement supplémentaire réel, en plus de 2 PA. Les habitants requis ne sont pas consommés.',
  '',
  '| Bâtiment actuel | Évolution | Ressources débitées | Stockage total ajouté après évolution |',
  '| --- | --- | --- | --- |',
);
for (const kind of Object.keys(BUILDINGS) as BuildingKind[]) {
  for (const level of kind === 'CAMP' || kind === 'OUTPOST' || isWall(kind) ? [1] : [1, 2, 3, 4]) {
    const upgrade = buildingUpgrade(kind, level);
    if (!upgrade) continue;
    lines.push(
      `| ${BUILDINGS[kind].name} · ${level} | ${upgrade.name} | ${wallet(upgrade.cost)} | ${storageBonus(upgrade.kind, upgrade.level)} par ressource |`,
    );
  }
}
lines.push(
  '',
  '## Tourelles de rempart',
  '',
  'Équipements fixes partageant les PV du mur, sans production ni entretien. Installation et chaque évolution : 2 PA. Tir manuel : 1 PA. Les prix ci-dessous excluent le mur et les étapes précédentes. Voir [les règles des tourelles](turrets.md).',
  '',
  '| Arme | Mur minimal | Attaque / portée | Bonus antiaérien | Coût de cette étape |',
  '| --- | --- | --- | --- | --- |',
);
for (const turret of Object.values(TURRETS))
  lines.push(
    `| ${turret.name} | ${BUILDINGS[turret.wall].name} | ${turret.attack} / ${turret.range} | ${turret.antiAir} | ${wallet(turret.cost)} |`,
  );
lines.push(
  '',
  '## Comparatif de tirs sur plaine',
  '',
  'Cibles à pleine santé, sans rareté, remparts, trêves ni ripostes. Le nombre de tirs utilise le minimum des dégâts : il ne représente pas une victoire garantie en duel. Les bonus indiquent le niveau d’entraînement, pas un niveau individuel acquis par expérience.',
  '',
  '| Attaquant | Entraînement | Cible | Entraînement | Dégâts par tir | Tirs nécessaires au maximum |',
  '| --- | --- | --- | --- | --- | --- |',
);
const specimen = (kind: UnitKind, trainingBonus: number): Unit => ({
  kind,
  trainingBonus,
  id: kind,
  ownerId: 'audit',
  q: 0,
  r: 0,
  hp: unitStats({ kind, trainingBonus }).hp,
  createdAt: 0,
  updatedAt: 0,
});
for (const [attackerKind, training, targetKind, targetTraining] of [
  ['INFANTRY', 0, 'MILITIA', 0],
  ['RIFLEMAN', 0, 'MILITIA', 0],
  ['TANK', 0, 'MILITIA', 0],
  ['MAUSOLEUM_TANK', 60, 'MILITIA', 0],
  ['RIFLEMAN', 25, 'MAUSOLEUM_TANK', 60],
  ['BAZOOKA', 25, 'MAUSOLEUM_TANK', 60],
  ['ISOTOPE_TANK_HUNTER', 60, 'MAUSOLEUM_TANK', 60],
  ['RIFLEMAN', 60, 'APOCALYPSE_WING', 60],
  ['FLAK_CANNON', 60, 'APOCALYPSE_WING', 60],
] as [UnitKind, number, UnitKind, number][]) {
  const attacker = specimen(attackerKind, training),
    target = specimen(targetKind, targetTraining);
  const damage = estimateDamage(attacker, target, { q: 0, r: 0, terrain: 'PLAIN' });
  lines.push(
    `| ${UNITS[attackerKind].name} | +${training} % | ${UNITS[targetKind].name} | +${targetTraining} % | ${damage.min}–${damage.max} | ${Math.ceil(target.hp / damage.min)} |`,
  );
}
lines.push(
  '',
  '## Coût des filières de recrutement',
  '',
  'Chaque prérequis est compté une seule fois, au coût de construction de base. Inclut les évolutions du premier recruteur jusqu’au niveau minimal demandé. Hors habitat, entretien, recrutement, routes et PA. Ces montants servent à comparer les filières ; ils ne sont pas des durées de progression.',
  '',
  '| Recrue visée | Infrastructure minimale retenue | Investissement initial |',
  '| --- | --- | --- |',
);
for (const kind of [
  'INFANTRY',
  'KNIGHT',
  'TANK',
  'HEX_TANK',
  'MAUSOLEUM_TANK',
  'APOCALYPSE_WING',
] as UnitKind[]) {
  const chain = infrastructure(kind);
  const total = Object.fromEntries(
    RESOURCES.map((r) => [
      r,
      chain.reduce((sum, b) => sum + BUILDINGS[b].cost[r], 0) +
        Array.from(
          { length: Math.max(0, (UNIT_PROFILES[kind].minRecruitLevel ?? 1) - 1) },
          (_, i) => buildingUpgrade(UNIT_PROFILES[kind].recruitAt[0], i + 1)?.cost[r] ?? 0,
        ).reduce((a, b) => a + b, 0),
    ]),
  );
  lines.push(
    `| ${UNITS[kind].name} | ${chain.map((b) => BUILDINGS[b].name).join(', ')} | ${wallet(total)} |`,
  );
}
writeFileSync('docs/balance-audit.md', lines.join('\n') + '\n');
console.log(
  `Audit écrit : ${Object.keys(UNITS).length} unités, ${Object.keys(BUILDINGS).length} bâtiments, ${RESOURCES.length} ressources.`,
);
