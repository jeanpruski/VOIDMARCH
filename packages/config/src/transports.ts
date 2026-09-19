import { NAVAL_TRANSPORTS } from './naval';
import type { UnitKind, UnitProfile, UnitTab } from './index';

export const TRANSPORT_UNITS = {
  TRANSPORT_SIDECAR: {
    name: 'Side-car des convois',
    hp: 48,
    attack: 0,
    defense: 4,
    move: 10,
    vision: 2,
    range: 1,
    capture: 0,
    cost: { GOLD: 600, WOOD: 150, STONE: 0, IRON: 450, FOOD: 100 },
  },
  TROOP_CARRIER: {
    name: 'Transport blindé des cendres',
    hp: 100,
    attack: 0,
    defense: 12,
    move: 8,
    vision: 2,
    range: 1,
    capture: 0,
    cost: { GOLD: 1200, WOOD: 300, STONE: 0, IRON: 950, FOOD: 150 },
  },
  CARGO_TRUCK: {
    name: 'Camion de la longue marche',
    hp: 80,
    attack: 0,
    defense: 5,
    move: 9,
    vision: 2,
    range: 1,
    capture: 0,
    cost: { GOLD: 1800, WOOD: 450, STONE: 0, IRON: 1400, FOOD: 220 },
  },
  CARGO_PLANE: {
    name: 'Avion-cargo Corbeau',
    hp: 90,
    attack: 0,
    defense: 6,
    move: 16,
    vision: 2,
    range: 1,
    capture: 0,
    cost: { GOLD: 4500, WOOD: 800, STONE: 0, IRON: 3600, FOOD: 400 },
  },
  TRANSPORT_HELICOPTER: {
    name: 'Hélicoptère Passeur',
    hp: 105,
    attack: 0,
    defense: 9,
    move: 12,
    vision: 2,
    range: 1,
    capture: 0,
    cost: { GOLD: 5500, WOOD: 900, STONE: 0, IRON: 4200, FOOD: 500 },
  },
  CARGO_AIRSHIP: {
    name: 'Dirigeable Arche noire',
    hp: 160,
    attack: 0,
    defense: 10,
    move: 12,
    vision: 2,
    range: 1,
    capture: 0,
    cost: { GOLD: 8000, WOOD: 2200, STONE: 0, IRON: 6000, FOOD: 900 },
  },
};
export type TransportKind = keyof typeof TRANSPORT_UNITS;
export interface TransportSpec {
  capacity: number;
  heavy?: boolean;
  vehicles: boolean;
  landing: 'LAND' | 'AIRSTRIP' | 'HOVER' | 'SEA';
}
export const TRANSPORTS: Partial<Record<UnitKind, TransportSpec>> = {
  ...NAVAL_TRANSPORTS,
  TRANSPORT_SIDECAR: { capacity: 2, vehicles: false, landing: 'LAND' },
  TROOP_CARRIER: { capacity: 4, vehicles: false, landing: 'LAND' },
  CARGO_TRUCK: { capacity: 8, vehicles: true, landing: 'LAND' },
  CARGO_PLANE: { capacity: 12, vehicles: true, landing: 'AIRSTRIP' },
  TRANSPORT_HELICOPTER: { capacity: 8, vehicles: true, landing: 'HOVER' },
  CARGO_AIRSHIP: { capacity: 16, vehicles: true, landing: 'HOVER' },
};
export const TRANSPORT_PROFILES: Record<TransportKind, UnitProfile> = {
  TRANSPORT_SIDECAR: {
    role: 'Transport de 2 fantassins. Vision 2, déplacement 10. Sans armement.',
    recruitAt: ['GARAGE'],
    requires: ['GARAGE'],
    minRecruitLevel: 1,
    transport: true,
    mechanical: true,
    population: 2,
  },
  TROOP_CARRIER: {
    role: 'Transport protégé de 4 fantassins. Vision 2, déplacement 8. Sans armement.',
    recruitAt: ['GARAGE'],
    requires: ['GARAGE'],
    minRecruitLevel: 2,
    transport: true,
    mechanical: true,
    armored: true,
    population: 3,
  },
  CARGO_TRUCK: {
    role: '8 places partagées : fantassin 1, cavalerie 2, petit véhicule 4. Vision 2, déplacement 9. Sans armement.',
    recruitAt: ['GARAGE'],
    requires: ['GARAGE', 'REFINERY'],
    minRecruitLevel: 3,
    transport: true,
    mechanical: true,
    population: 3,
  },
  CARGO_PLANE: {
    role: '12 places partagées. Vision 2, déplacement 16. Embarque et débarque depuis une plaine ou un aérodrome ami ; pas de parachutage.',
    recruitAt: ['AERODROME'],
    requires: ['AERODROME', 'REFINERY'],
    minRecruitLevel: 3,
    transport: true,
    mechanical: true,
    flying: true,
    population: 5,
  },
  TRANSPORT_HELICOPTER: {
    role: '8 places partagées. Vision 2, déplacement 12. Dépose les passagers sur un terrain voisin praticable.',
    recruitAt: ['HELIPAD'],
    requires: ['HELIPAD'],
    minRecruitLevel: 2,
    transport: true,
    mechanical: true,
    flying: true,
    population: 5,
  },
  CARGO_AIRSHIP: {
    role: '16 places partagées. Vision 2, déplacement 12. Grande capacité, vulnérable à la DCA. Sans armement.',
    recruitAt: ['AIRSHIP_YARD'],
    requires: ['AIRSHIP_YARD', 'REFINERY'],
    minRecruitLevel: 3,
    transport: true,
    mechanical: true,
    flying: true,
    population: 6,
  },
};
export const TRANSPORT_TIERS: Record<TransportKind, number> = {
  TRANSPORT_SIDECAR: 3,
  TROOP_CARRIER: 3,
  CARGO_TRUCK: 3,
  CARGO_PLANE: 3,
  TRANSPORT_HELICOPTER: 5,
  CARGO_AIRSHIP: 4,
};
export const TRANSPORT_CATEGORIES: Record<TransportKind, UnitTab> = {
  TRANSPORT_SIDECAR: 'Motos',
  TROOP_CARRIER: 'Véhicules',
  CARGO_TRUCK: 'Véhicules',
  CARGO_PLANE: 'Aviation',
  TRANSPORT_HELICOPTER: 'Hélicoptères',
  CARGO_AIRSHIP: 'Aviation',
};
export const TRANSPORT_SHEETS = [
  'transport-sidecar',
  'transport-carrier',
  'transport-truck',
  'transport-plane',
  'transport-helicopter',
  'transport-airship',
];
export const TRANSPORT_FRAMES = Object.fromEntries(
  Object.keys(TRANSPORT_UNITS).map((kind, index) => [kind, 3000 + index * 24]),
) as Record<TransportKind, number>;
