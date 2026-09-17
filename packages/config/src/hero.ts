export const HERO_PARTS = ['head', 'armor', 'boots', 'weapon'] as const;
export type HeroPart = (typeof HERO_PARTS)[number];
export interface HeroAppearance {
  head: number;
  armor: number;
  boots: number;
  weapon: number;
  colors: Record<HeroPart, string>;
}
export const HERO_PALETTE = [
  '#626b55',
  '#a6a99e',
  '#564844',
  '#292e35',
  '#754744',
  '#7e7052',
  '#465c68',
  '#6a5478',
  '#b5a386',
  '#426b5d',
  '#87613f',
  '#b3b8bb',
];
export const HERO_LABELS: Record<HeroPart, string[]> = {
  head: [
    'Casquette d’officier',
    'Casque et respirateur',
    'Heaume à visière',
    'Capuche occulte',
    'Officier vétéran',
    'Heaume de croisé',
    'Masque de la peste',
    'Bonnet d’aviateur',
    'Éclaireuse',
    'Vétéran barbu',
    'Calot de campagne',
    'Heaume gothique',
    'Capuche et masque à gaz',
    'Masque mécanique',
    'Officière',
  ],
  armor: [
    'Tunique feldgrau',
    'Cuirasse médiévale',
    'Manteau militaire',
    'Robe occulte',
    'Veste de cuir',
    'Cotte de mailles',
    'Uniforme de tranchée',
    'Armure gothique',
    'Blouson d’aviateur',
    'Tablier de médecin',
    'Combinaison radiologique',
    'Uniforme cuirassé',
    'Chasuble rituelle',
    'Veste d’ingénieur',
    'Tunique de commandement',
  ],
  boots: [
    'Bottes d’officier',
    'Grèves médiévales',
    'Bottes de campagne',
    'Jambières occultes',
    'Bottes de cuir',
    'Chausses de mailles',
    'Guêtres de tranchée',
    'Jambières gothiques',
    'Bottes d’aviateur',
    'Bottes de médecin',
    'Bottes étanches',
    'Bottes de cavalier',
    'Chausses rituelles',
    'Jambe mécanique',
    'Bottes de commandement',
  ],
  weapon: [
    'Épée longue',
    'Pistolet d’officier',
    'Bâton occulte',
    'Sabre',
    'Pistolet-mitrailleur',
    'Clé mécanique',
    'Dague rituelle',
    'Radio de campagne',
    'Marteau',
    'Encensoir',
    'Pistolet Tesla',
    'Grimoire',
    'Bâton de commandement',
    'Masse gothique',
    'Lanterne au radium',
  ],
};
export function randomHeroAppearance(random: () => number = Math.random): HeroAppearance {
  const pick = (n: number) => Math.min(n - 1, Math.floor(random() * n));
  return {
    head: pick(15),
    armor: pick(15),
    boots: pick(15),
    weapon: pick(15),
    colors: Object.fromEntries(
      HERO_PARTS.map((p) => [p, HERO_PALETTE[pick(HERO_PALETTE.length)]]),
    ) as Record<HeroPart, string>,
  };
}
export const HERO_RULES = { recovery: 300_000, cooldown: 300_000, auraRadius: 2, maxXP: 60 };
export const heroLevel = (xp = 0) => (xp >= 60 ? 3 : xp >= 20 ? 2 : 1);
export const heroAura = (xp = 0) => [0, 0.08, 0.1, 0.12][heroLevel(xp)];
export const HERO_POWERS = {
  HERO_MEND: {
    name: 'Secours de campagne',
    description:
      'Rend 20 % des PV maximum aux alliés biologiques blessés à 2 cases. Ne répare pas les véhicules.',
    cost: {},
    ap: 2,
  },
  HERO_RESTORE: {
    name: 'Superviser les réparations',
    description: 'Rend 20 % des PV maximum aux bâtiments à 1 case. Coût : 20 bois et 10 fer.',
    cost: { WOOD: 20, IRON: 10 },
    ap: 2,
  },
  HERO_SURVEY: {
    name: 'Reconnaissance occulte',
    description:
      'Révèle les terrains à 8 cases et les conserve dans la carte explorée. Aucun suivi des ennemis après l’expédition.',
    cost: {},
    ap: 2,
  },
} as const;
export type HeroPower = keyof typeof HERO_POWERS;
