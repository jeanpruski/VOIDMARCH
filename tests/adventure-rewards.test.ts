import { describe, expect, it } from 'vitest';
import {
  conquestReward,
  expeditionReward,
  EXPEDITION_GOLD,
  CONQUEST_REWARD_BOOST,
  EXPEDITION_REWARD_BOOST,
  ERA_COSTS,
  eraAdvanceReason,
} from '@voidmarch/config';
import { missionReward, missionAbandonPlan } from '@voidmarch/game-rules';

describe('butins et progression par trophées', () => {
  it.each([
    ['Escarmouche', 5, 2],
    ['Assaut', 6, 2.5],
    ['Siège', 8, 3],
    ['Grande campagne', 10, 3],
  ] as const)(
    '%s finance aussi les matériaux, sans renchérir l’abandon',
    (difficulty, boost, base) => {
      const fees = { GOLD: 100, FOOD: 60 };
      const reward = conquestReward(difficulty, fees, 1.3);
      expect(CONQUEST_REWARD_BOOST[difficulty]).toBe(boost);
      const gold = 100 * base * 1.3 * boost;
      expect(reward).toEqual({
        GOLD: gold,
        FOOD: 60 * base * 1.3 * boost,
        WOOD: Math.round(gold * 0.6),
        STONE: Math.round(gold * 0.4),
        IRON: Math.round(gold * 0.3),
      });
      expect(fees).toEqual({ GOLD: 100, FOOD: 60 });
      expect(
        missionAbandonPlan({ GOLD: 1000, FOOD: 1000, WOOD: 0, IRON: 0, STONE: 0 }, fees),
      ).toEqual({ paid: fees, delay: 0 });
    },
  );
  it.each([1, 2, 3, 4, 5])(
    'époque %i : prime croissante pour la distance, la fouille et le retour',
    (era) => {
      for (const distance of [60, 130, 200]) {
        for (const sea of [false, true]) {
          const base = EXPEDITION_GOLD[era] * (0.65 + distance / 150) * (sea ? 1.25 : 1);
          let previous = 0;
          for (const [mode, effort, boost] of [
            ['RECON', 1, 5],
            ['RECOVER', 1.4, 7],
            ['EXTRACT', 2.2, 10],
          ] as const) {
            const factor = base * effort;
            const reward = expeditionReward(factor, mode);
            expect(EXPEDITION_REWARD_BOOST[mode]).toBe(boost);
            expect(reward).toEqual({
              GOLD: Math.round(factor * 1.3) * boost,
              WOOD: Math.round(factor * 0.8 * 1.3) * boost,
              STONE: Math.round(factor * 0.65 * 1.3) * boost,
              IRON: Math.round(factor * 0.5 * 1.3) * boost,
              FOOD: Math.round(factor * 0.9 * 1.3) * boost,
            });
            expect(reward.GOLD).toBeGreaterThan(previous);
            previous = reward.GOLD;
          }
        }
      }
      const short = expeditionReward(EXPEDITION_GOLD[era] * 1.05, 'RECON');
      const long = expeditionReward(EXPEDITION_GOLD[era] * (0.65 + 200 / 150), 'RECON');
      expect(long.GOLD).toBeGreaterThan(short.GOLD);
    },
  );
  it('honore un ancien devis et ne multiplie jamais un devis déjà recalculé', () => {
    const base = { difficulty: 'Siège' as const, abandonmentCost: { GOLD: 100, FOOD: 60 } };
    for (const quoted of [
      { GOLD: 390, FOOD: 234 },
      conquestReward('Siège', base.abandonmentCost, 1.3),
    ]) {
      const offer = { ...base, reward: quoted };
      for (let i = 0; i < 10; i++) expect(missionReward(offer, 1.3)).toEqual(quoted);
      const copy = missionReward(offer);
      copy.GOLD = 0;
      expect(offer.reward.GOLD).not.toBe(0);
    }
  });
  it('les ressources d’une reconnaissance financent le premier passage, mais ne remplacent pas le trophée', () => {
    const reward = expeditionReward(EXPEDITION_GOLD[1] * (0.65 + 60 / 150), 'RECON');
    for (const [resource, cost] of Object.entries(ERA_COSTS[2]))
      expect(reward[resource as keyof typeof reward]).toBeGreaterThanOrEqual(cost);
    const sites = [
      { kind: 'WORKSHOP' as const, level: 1, hp: 100 },
      { kind: 'MARKET' as const, level: 1, hp: 100 },
    ];
    expect(eraAdvanceReason(sites, { era: 1, trophies: 0 }, 2)).toContain('trophées 0/1');
    expect(eraAdvanceReason(sites, { era: 1, trophies: 1 }, 2)).toBe('');
    expect(eraAdvanceReason(sites, { era: 1, trophies: 50 }, 3)).not.toBe('');
  });
});
