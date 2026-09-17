import type { UnitProfile } from './index';

export const GLOCKE_UNITS = {
  GLOCKE_VRIL: {
    name: 'Die Glocke I — Vril',
    hp: 200,
    attack: 52,
    buildingAttack: 70,
    defense: 10,
    move: 5,
    vision: 7,
    range: 4,
    capture: 0,
    cost: { GOLD: 1800, IRON: 1100, WOOD: 200, STONE: 0, FOOD: 150 },
  },
  GLOCKE_NACHT: {
    name: 'Die Glocke II — Nacht',
    hp: 260,
    attack: 60,
    buildingAttack: 110,
    defense: 14,
    move: 4,
    vision: 8,
    range: 5,
    capture: 0,
    cost: { GOLD: 2600, IRON: 1600, WOOD: 280, STONE: 0, FOOD: 200 },
  },
  GLOCKE_APOCALYPSE: {
    name: 'Die Glocke III — Götterdämmerung',
    hp: 320,
    attack: 64,
    buildingAttack: 145,
    defense: 16,
    move: 3,
    vision: 8,
    range: 6,
    capture: 0,
    cost: { GOLD: 3800, IRON: 2400, WOOD: 360, STONE: 0, FOOD: 260 },
  },
} as const;
const common = {
  recruitAt: ['GLOCKE_COMPLEX'],
  requires: ['GLOCKE_COMPLEX', 'NUCLEAR_REACTOR', 'ATOMIC_FOUNDRY', 'BLACK_OBSERVATORY'],
  flying: true,
  mechanical: true,
  siege: true,
} satisfies Partial<UnitProfile>;
export const GLOCKE_PROFILES = {
  GLOCKE_VRIL: {
    ...common,
    population: 18,
    minRecruitLevel: 1,
    role: 'Cloche volante d’assaut. Décharge Vril : 2 PA par tir, une cible. Survole terrains et remparts, sans capture ; vulnérable à l’antiaérien. Complexe des cloches niveau 1.',
  },
  GLOCKE_NACHT: {
    ...common,
    population: 22,
    minRecruitLevel: 2,
    role: 'Cloche volante de siège. Orbe du néant : 2 PA par tir, dégâts accrus aux bâtiments, une cible. Survole les remparts, sans capture ; vulnérable à l’antiaérien. Complexe des cloches niveau 2.',
  },
  GLOCKE_APOCALYPSE: {
    ...common,
    population: 26,
    minRecruitLevel: 3,
    role: 'Cloche volante ultime, lente et très coûteuse. Décharge d’annihilation : 2 PA par tir, une cible, puissance de siège extrême. Sans capture ; vulnérable à l’antiaérien. Complexe des cloches niveau 3.',
  },
} satisfies Record<keyof typeof GLOCKE_UNITS, UnitProfile>;
