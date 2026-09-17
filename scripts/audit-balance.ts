import { writeFileSync } from 'node:fs';
import {
  BUILDINGS,
  isBuildable,
  BUILDING_REQUIREMENTS,
  UNIT_PROFILES,
  UNITS,
  RESOURCES,
  RESOURCE_NAMES,
  unitPopulation,
  unitUpkeep,
  type BuildingKind,
  type UnitKind,
  type Wallet,
} from '@voidmarch/config';
const wallet = (values: Partial<Wallet>) =>
  RESOURCES.filter((r) => values[r])
    .map((r) => `${Number(values[r]!.toFixed(2))} ${RESOURCE_NAMES[r].toLowerCase()}`)
    .join(', ') || '—';
function infrastructure(kind: UnitKind) {
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
  '# Audit d’équilibrage — ressources, population et catalogue',
  '',
  'Rapport reproductible : `node --import tsx scripts/audit-balance.ts`. Les coûts sont ceux de base, avant le bonus de construction de la Cendre. Le premier bâtiment de recrutement est utilisé pour calculer la chaîne d’infrastructure ; d’autres accès peuvent exister.',
  '',
  '## Corrections appliquées',
  '',
  '- Récolte uniquement sur la case occupée, jamais sur une voisine ni sur une terre adverse. Bois : forêt ; pierre : colline/montagne ; fer : colline ; vivres : plaine/rivière/marais ; or : ruines. Les vestiges cosmiques se fouillent par leur action dédiée.',
  '- Pierre ajoutée aux stocks, échanges, coûts et sauvegardes. Carrière accessible sans coût initial en pierre. La mine extrait le fer sur colline ; la carrière extrait la pierre sur colline ou montagne.',
  '- Aucun revenu brut par simple propriété d’une case. Le campement ne produit plus de bois, les forges/ateliers/raffineries/manufactures ne génèrent plus de fer sans mine. Le grenier stocke sans générer de vivres.',
  '- Entretien proportionné au prix des unités ; les machines consomment aussi du fer. Mobilisation unifiée entre recrutement, interface et croissance : paysan 3, soldats 5, siège médiéval 6, machines légères 8, chars / bombardiers / dirigeables / dragons 12.',
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
  '| Unité | PV / attaque / défense | Déplacement / portée | Places | Coût | Entretien par minute | Infrastructure requise (nombre) |',
  '| --- | --- | --- | --- | --- | --- | --- |',
];
for (const [kind, unit] of Object.entries(UNITS) as [UnitKind, (typeof UNITS)[UnitKind]][])
  lines.push(
    `| ${unit.name} | ${unit.hp} / ${unit.attack} / ${unit.defense} | ${unit.move} / ${unit.range} | ${unitPopulation(kind)} | ${wallet(unit.cost)} | ${wallet(unitUpkeep(kind))} | ${infrastructure(kind).length} |`,
  );
lines.push(
  '',
  '## Bâtiments',
  '',
  '| Bâtiment | PV | Coût | Production brute / minute | Terrains | Prérequis |',
  '| --- | --- | --- | --- | --- | --- |',
);
for (const [kind, building] of Object.entries(BUILDINGS) as [
  BuildingKind,
  (typeof BUILDINGS)[BuildingKind],
][])
  lines.push(
    `| ${building.name} | ${building.hp} | ${wallet(building.cost)} | ${wallet(building.production)} | ${building.terrains.join(', ')} | ${!isBuildable(kind) ? `Évolution uniquement : ${kind === 'STONE_WALL' ? 'palissade en bois' : 'rempart de pierre'} (2 PA, coût sans réduction)` : (BUILDING_REQUIREMENTS[kind] ?? []).map((k) => BUILDINGS[k].name).join(', ') || '—'} |`,
  );
writeFileSync('docs/balance-audit.md', lines.join('\n') + '\n');
console.log(
  `Audit écrit : ${Object.keys(UNITS).length} unités, ${Object.keys(BUILDINGS).length} bâtiments, ${RESOURCES.length} ressources.`,
);
