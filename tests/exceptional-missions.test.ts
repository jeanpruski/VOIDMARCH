import { developmentProgress } from '@voidmarch/game-rules';
import { navalMissionFleet } from '../apps/server/src/naval-missions';
import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { exceptionalOfferIndex } from '../apps/server/src/exceptional-missions';
import { missionOffers, reconcileMissions } from '../apps/server/src/missions';
import { expeditionOffers } from '../apps/server/src/expeditions';
import { addPlayer, addBuilding, execute } from '../apps/server/src/engine';
import { createState, missionReward } from '@voidmarch/game-rules';
import {
  developmentStage,
  conquestDevelopmentLevel,
  EXPEDITION_GOLD,
  expeditionSearchCost,
} from '@voidmarch/config';
import { actionSchema } from '@voidmarch/protocol';
import { prepareDevelopment } from './fixtures/development';
const now = 1900000000000;
function fixture() {
  const s = createState('adventures-test', now);
  addPlayer(s, 'a', 'Défis', 'ASH', now);
  return s;
}
function rareTime(s: ReturnType<typeof fixture>, category: 'conquest' | 'expedition') {
  for (let slot = 0; slot < 1000; slot++) {
    const seed =
      `${s.seed}:${s.createdAt}:` +
      (category === 'conquest'
        ? `a:${s.realms.a.createdAt}:conquest:0:${now}:${slot}`
        : `${s.realms.a.createdAt}:a:expedition:0:${now}:${slot}`);
    const index = exceptionalOfferIndex(seed, [1, 1, 1]);
    if (index >= 0) return { at: now + slot * 600000, index };
  }
  throw Error('No exceptional window in sample');
}
describe('missions exceptionnelles et accès normal', () => {
  it('effectue un seul tirage à 5 % pour un tableau, sans dépasser le niveau 5', () => {
    let found = 0;
    const positions = new Set<number>();
    for (let i = 0; i < 10000; i++) {
      const index = exceptionalOfferIndex(`board-${i}`, [1, 1, 1]);
      if (index >= 0) {
        found++;
        positions.add(index);
      }
      expect(exceptionalOfferIndex(`board-${i}`, [5, 5, 5])).toBe(-1);
      const mixed = exceptionalOfferIndex(`board-${i}`, [5, 3, 5]);
      expect([-1, 1]).toContain(mixed);
      expect(mixed >= 0).toBe(index >= 0);
    }
    expect(found).toBeGreaterThan(430);
    expect(found).toBeLessThan(570);
    expect([...positions].sort()).toEqual([0, 1, 2]);
  });
  it('demande les infrastructures et le recruteur pour augmenter l’accès normal', () => {
    const s = fixture(),
      r = s.realms.a;
    const b = addBuilding(s, r, { q: 1, r: 0 }, 'BARRACKS', now, 5);
    expect(conquestDevelopmentLevel(Object.values(s.buildings), developmentProgress(s, 'a'))).toBe(
      1,
    );
    prepareDevelopment(s, 'a', 2, now);
    expect(conquestDevelopmentLevel(Object.values(s.buildings), developmentProgress(s, 'a'))).toBe(
      2,
    );
    b.hp = 0;
    expect(developmentStage(Object.values(s.buildings), developmentProgress(s, 'a'))).toBe(2);
  });
  it('conserve le tirage, le prix et le niveau de la conquête après acceptation et rechargement', () => {
    const s = fixture(),
      { at, index } = rareTime(s, 'conquest');
    const offers = missionOffers(s, 'a', at),
      offer = offers[index];
    expect(offers.filter((o) => o.exceptional)).toHaveLength(1);
    expect(offer.level).toBe(2);
    expect(offers.filter((o) => !o.exceptional).every((o) => o.level === 1)).toBe(true);
    expect(missionOffers(JSON.parse(JSON.stringify(s)), 'a', at + 599999)).toEqual(offers);
    expect(offer.reward).toEqual(missionReward(offer));
    const result = execute(
      s,
      'a',
      actionSchema.parse({
        type: 'MISSION_ACCEPT',
        actorId: 'a',
        payload: { offerId: offer.id },
        actionId: randomUUID(),
        clientTimestamp: at,
      }),
      at,
    );
    expect(result.result.accepted, result.result.reason).toBe(true);
    const mission = result.state.missions!.a.active!;
    expect(mission).toMatchObject({ exceptional: true, level: 2, reward: offer.reward });
    delete result.state.buildings[mission.objectiveId];
    delete result.state.units[mission.objectiveId];
    reconcileMissions(result.state, at);
    expect(
      developmentStage(
        Object.values(result.state.buildings).filter((b) => b.ownerId === 'a'),
        developmentProgress(result.state, 'a'),
      ),
    ).toBe(1);
  });
  it('applique l’époque exceptionnelle au butin et au coût de récupération de l’expédition', () => {
    const s = fixture(),
      { at, index } = rareTime(s, 'expedition');
    const offers = expeditionOffers(s, 'a', at),
      offer = offers[index];
    expect(offers).toHaveLength(3);
    expect(offers.filter((o) => o.exceptional)).toHaveLength(1);
    expect(offer.level).toBe(2);
    const exp = offer.expedition!;
    const factor =
      EXPEDITION_GOLD[2] *
      (0.65 + exp.targetDistance / 150) *
      { RECON: 1, RECOVER: 1.4, EXTRACT: 2.2 }[exp.mode] *
      (exp.route === 'SEA' ? 1.25 : 1);
    expect(offer.reward!.GOLD).toBe(Math.round(factor * 1.3));
    expect(expeditionSearchCost(offer.level).FOOD).toBe(120);
    expect(expeditionOffers(JSON.parse(JSON.stringify(s)), 'a', at + 599999)).toEqual(offers);
    const result = execute(
      s,
      'a',
      actionSchema.parse({
        type: 'MISSION_ACCEPT',
        actorId: 'a',
        payload: { offerId: offer.id },
        actionId: randomUUID(),
        clientTimestamp: at,
      }),
      at,
    );
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.missions!.a.active).toMatchObject({
      level: 2,
      exceptional: true,
      reward: offer.reward,
    });
    expect(
      developmentStage(
        Object.values(result.state.buildings),
        developmentProgress(result.state, 'a'),
      ),
    ).toBe(1);
  });
  it('conserve le défi supérieur lors du remplacement de la troisième offre par une mission navale', () => {
    const s = fixture(),
      { at } = rareTime(s, 'conquest');
    prepareDevelopment(s, 'a', 5, now);
    addBuilding(s, s.realms.a, { q: 1, r: 0 }, 'BARRACKS', now, 5);
    s.oceanVersion = 1;
    s.units.ship = {
      id: 'ship',
      ownerId: 'a',
      kind: 'WAR_GALLEY',
      q: 5,
      r: 0,
      hp: 100,
      createdAt: now,
      updatedAt: now,
    };
    const offers = missionOffers(s, 'a', at);
    expect(offers.slice(0, 2).every((o) => o.level === 5 && !o.exceptional)).toBe(true);
    expect(offers[2]).toMatchObject({
      exceptional: true,
      level: 2,
      maritime: true,
      units: navalMissionFleet(2),
    });
    expect(offers[2].reward).toEqual(missionReward(offers[2]));
    expect(offers.filter((o) => o.exceptional)).toHaveLength(1);
  });
  it('ne propose jamais de niveau 6 même dans une fenêtre chanceuse', () => {
    const s = fixture(),
      { at } = rareTime(s, 'conquest');
    prepareDevelopment(s, 'a', 5, now);
    addBuilding(s, s.realms.a, { q: 1, r: 0 }, 'BARRACKS', now, 5);
    for (const offer of [
      ...missionOffers(s, 'a', at),
      ...expeditionOffers(s, 'a', rareTime(s, 'expedition').at),
    ]) {
      expect(offer.level).toBe(5);
      expect(offer.exceptional).not.toBe(true);
    }
  });
});
