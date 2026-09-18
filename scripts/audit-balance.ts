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
    .map((r) => `${Number(values[r]!.toFixed(2))} ${RESOURCE_NAMES[r].toLowerCase()}`)
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
  '# Audit d’équilibrage — économie et cinq âges v0.6',
  '',
  'Rapport reproductible : `node --import tsx scripts/audit-balance.ts`. Les coûts sont ceux de base, avant le bonus de construction de la Cendre. Le premier bâtiment de recrutement est utilisé pour calculer la chaîne d’infrastructure ; d’autres accès peuvent exister.',
  '',
  '## Corrections appliquées',
  '',
  '- Progression : entraînement +25 / +60 / +100 / +160 % aux niveaux 2 / 3 / 4 / 5 ; production hors villes ×1,6 / ×2,4 / ×3,6 / ×5,2. Les bonus d’entraînement s’appliquent aussi aux troupes existantes, sans cumuler plusieurs bâtiments.',
  '- Référence de puissance : fantassin 8 d’attaque, char Mausolée 40, char Mausolée entraîné 64. Ce rapport ×5 à ×8 porte sur l’attaque ; blindage, terrain, rareté et contres modifient les dégâts effectivement reçus.',
  '- Contres : bazooka et chasseur de chars isotopique ignorent 75 % du blindage des cibles blindées ; armes antiaériennes spécialisées ignorent 50 % de la défense aérienne. Les bonus de contre bénéficient de l’entraînement.',
  '- Récolte uniquement sur la case occupée, jamais sur une voisine ni sur une terre adverse. Bois : forêt ; pierre : colline/montagne ; fer : colline ; vivres : plaine/rivière/marais ; or : ruines. Les vestiges cosmiques se fouillent par leur action dédiée.',
  '- Pierre ajoutée aux stocks, échanges, coûts et sauvegardes. Carrière accessible sans coût initial en pierre. La mine extrait le fer sur colline ; la carrière extrait la pierre sur colline ou montagne.',
  '- Aucun revenu brut par simple propriété d’une case. Le campement ne produit plus de bois, les forges/ateliers/raffineries/manufactures ne génèrent plus de fer sans mine. Le grenier stocke sans générer de vivres.',
  '- Prix progressifs : bâtiments intermédiaires ×1,5 / ×2,5 / ×4 / ×7 ; fin de progression ×10 / ×12 / ×15 par rapport à v0.4. Unités médiévales ×2,5, industrielles ×4, occultes ×7, atomiques ×10, Apocalypse ×12 et Glocke ×15. Fondations et civils ordinaires conservés.',
  '- Améliorations ordinaires : 2 PA et débit de 2,5 fois le nouveau coût de construction pour le niveau 2, puis 5 / 12 / 25 fois pour les niveaux 3 / 4 / 5. Campements, villes et murs ont leurs devis spécifiques. Les coûts de chaque étape ne sont pas cumulatifs.',
  '- Entretien conservé aux valeurs v0.4, séparé du nouveau prix de recrutement ; les machines consomment aussi du fer. Mobilisation : paysan 3, soldats 5, siège médiéval 6, machines légères 8, chars / bombardiers / dirigeables / dragons 12 ; division atomique de 7 à 18 places selon le modèle.',
  '- Croissance bornée selon le bâtiment : un campement ou une chaumière ne finit plus avec la capacité d’une ville. Les populations existantes ne sont pas supprimées.',
  '- Montagne accessible au paysan pour la pierre ; véhicules et cavaliers ont besoin de routes en montagne ou marais. Les machines terrestres ralentissent en forêt. Les unités volantes survolent tous les terrains et les remparts pour un point de déplacement par case.',
  '- L’amélioration campement → avant-poste ne réduit plus la résistance ni la production de vivres. Les améliorations de villes en pierre utilisent désormais cette ressource.',
  '',
  '## Limites de la validation',
  '',
  'Les tests vérifient les sources de ressources, les refus serveur, le départ à zéro, les prérequis, les plafonds, la migration et les contres militaires. Ils ne prouvent pas un équilibre parfait entre joueurs. Les rencontres réelles, les coalitions, les sièges prolongés et le rythme à 1 PA par minute nécessitent des parties longues. Une pénurie arrête la croissance ; elle ne supprime pas automatiquement les armées. Les chaînes industrielles mobilisent les cinq ressources existantes, sans jauges distinctes de pétrole ou de munitions.',
  '',
  '## Unités',
  '',
  '| Unité | Palier | PV / attaque / défense de base | Attaque avec formation niveau 5 | Déplacement / portée | Places | Coût | Entretien par minute | Infrastructure requise (nombre) |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
];
for (const [kind, unit] of Object.entries(UNITS) as [UnitKind, (typeof UNITS)[UnitKind]][])
  lines.push(
    `| ${unit.name} | ${TIER_NAMES[UNIT_TIERS[kind]]} | ${unit.hp} / ${unit.attack} / ${unit.defense} | ${Number(unitStats({ kind, trainingBonus: UNIT_PROFILES[kind].builder ? 0 : 160 }).attack.toFixed(2))} | ${unit.move} / ${unit.range} | ${unitPopulation(kind)} | ${wallet(unit.cost)} | ${wallet(unitUpkeep(kind))} | ${infrastructure(kind).length} |`,
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
  'Chaque prérequis est compté une seule fois, au coût de construction de base. Hors évolutions de bâtiments, habitat, entretien, recrutement, routes et PA. Ces montants servent à comparer les filières ; ils ne sont pas des durées de progression.',
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
    RESOURCES.map((r) => [r, chain.reduce((sum, b) => sum + BUILDINGS[b].cost[r], 0)]),
  );
  lines.push(
    `| ${UNITS[kind].name} | ${chain.map((b) => BUILDINGS[b].name).join(', ')} | ${wallet(total)} |`,
  );
}
writeFileSync('docs/balance-audit.md', lines.join('\n') + '\n');
console.log(
  `Audit écrit : ${Object.keys(UNITS).length} unités, ${Object.keys(BUILDINGS).length} bâtiments, ${RESOURCES.length} ressources.`,
);
