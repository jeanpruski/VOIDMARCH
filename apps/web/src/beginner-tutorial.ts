import { UNIT_PROFILES, type BuildingKind } from '@voidmarch/config';
import type { WorldView } from '@voidmarch/shared';

export const BEGINNER_STEPS: { kind?: BuildingKind; title: string; description: string }[] = [
  {
    title: 'Former votre premier paysan',
    description:
      'Sélectionnez votre campement, puis Recruter → Paysan. Si vous n’avez aucun paysan, sa formation coûte seulement 1 PA, sans ressources. Le campement produit déjà un peu d’or et de vivres pendant votre présence.',
  },
  {
    kind: 'LUMBER',
    title: 'Produire du bois',
    description:
      'Déplacez votre paysan sur une forêt et utilisez Récolter le bois jusqu’à pouvoir payer la scierie. Construisez-la sur une forêt pour produire du bois pendant votre présence.',
  },
  {
    kind: 'QUARRY',
    title: 'Extraire la pierre',
    description:
      'Utilisez le bois de votre scierie pour construire une carrière sur une colline ou une montagne. Elle fournit la pierre nécessaire à la mine de fer. Votre paysan peut aussi récolter la pierre sur ces terrains.',
  },
  {
    kind: 'MINE',
    title: 'Extraire le fer',
    description:
      'Construisez une mine de fer sur une colline avec votre bois et votre pierre. Le fer servira à l’atelier, au stockage et aux équipements avancés.',
  },
  {
    kind: 'FARM',
    title: 'Assurer les vivres',
    description:
      'Construisez une ferme sur une plaine. Les vivres nourrissent les habitants et les troupes ; surveillez leur revenu pour éviter une pénurie.',
  },
  {
    kind: 'HOUSE',
    title: 'Accueillir des habitants',
    description:
      'Construisez une chaumière pour accueillir davantage d’habitants. La population grandit avec des vivres disponibles et permet de recruter davantage de troupes.',
  },
  {
    kind: 'WAREHOUSE',
    title: 'Agrandir le stockage',
    description:
      'Construisez un entrepôt avant d’accumuler les ressources des installations plus coûteuses. Un stock plein limite ce que votre production peut ajouter.',
  },
  {
    kind: 'WORKSHOP',
    title: 'Ouvrir un atelier',
    description:
      'Construisez un atelier avec votre bois, votre pierre et votre fer. Il permet de recruter des ingénieurs et constitue un prérequis de la mine d’or.',
  },
  {
    kind: 'GOLD_MINE',
    title: 'Extraire l’or',
    description:
      'Une fois la mine de fer et l’atelier construits, installez une mine d’or sur une colline ou une montagne. Gardez votre campement actif en attendant d’en réunir le prix.',
  },
  {
    kind: 'BARRACKS',
    title: 'Préparer la défense',
    description:
      'Construisez une caserne pour recruter vos premières troupes de combat. Protégez ensuite vos productions avec des remparts et explorez les environs à votre rythme.',
  },
];
export function beginnerProgress(world: WorldView) {
  const buildings = world.tiles.flatMap((t) =>
    t.building?.ownerId === world.player.id ? [t.building] : [],
  );
  const builder = world.units.find(
    (u) => u.ownerId === world.player.id && u.hp > 0 && UNIT_PROFILES[u.kind].builder,
  );
  const settlement =
    buildings.find((b) => b.q === world.player.capital.q && b.r === world.player.capital.r) ??
    buildings.find((b) => ['CAMP', 'OUTPOST', 'VILLAGE'].includes(b.kind));
  const steps = BEGINNER_STEPS.map((step) => ({
    ...step,
    done: step.kind ? buildings.some((b) => b.kind === step.kind && b.hp > 0) : !!builder,
  }));
  return {
    steps,
    current: steps.find((step) => !step.done),
    completed: steps.filter((step) => step.done).length,
    builder,
    settlement,
  };
}
