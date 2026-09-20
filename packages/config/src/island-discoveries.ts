import type { Wallet } from './index';
export const ISLAND_DISCOVERIES = {
  LIGHTHOUSE: {
    name: 'Phare abandonné',
    description:
      'Le gardien a disparu. Débarquez et fouillez les réserves du phare ; cette découverte ne nécessite aucune mission.',
    reward: { GOLD: 1200, WOOD: 600, IRON: 200 } as Partial<Wallet>,
    relic: 'Lentille des horizons perdus',
    image: '/assets/expeditions/cordouan.png',
  },
  RUINED_PORT: {
    name: 'Port en ruine',
    description:
      'Un ancien comptoir conserve des vivres et des matériaux. Débarquez pour récupérer son dépôt. Ce vestige ne recrute pas de navires.',
    reward: { GOLD: 600, WOOD: 1400, IRON: 400, FOOD: 500 } as Partial<Wallet>,
    relic: undefined,
    image: '/assets/expeditions/portarthur.png',
  },
  MINERAL_CACHE: {
    name: 'Réserve des prospecteurs',
    description:
      'Des caisses de minerais attendent dans une ancienne mine. Débarquez pour les récupérer ; les collines alentour peuvent accueillir vos propres mines.',
    reward: { GOLD: 500, STONE: 1800, IRON: 1000 } as Partial<Wallet>,
    relic: undefined,
    image: '/assets/expeditions/wieliczka.png',
  },
} as const;
export type IslandDiscoveryKind = keyof typeof ISLAND_DISCOVERIES;
