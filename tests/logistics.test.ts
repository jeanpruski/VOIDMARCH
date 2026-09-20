import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  logisticsCost,
  logisticsQuota,
  LOGISTICS_WINDOW,
  upgradeDevelopmentStage,
  type LogisticsRecipe,
} from '@voidmarch/config';
import { createState, refreshAP } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { prepareDevelopment } from './fixtures/development';

const now = 1_900_000_000_000;
function fixture(level = 1, stage = 1) {
  const s = createState('logistics', now);
  const r = addPlayer(s, 'a', 'Intendance', 'MASK', now);
  prepareDevelopment(s, r.id, stage, now);
  r.wallet = { GOLD: 10000, FOOD: 10000, WOOD: 10000, STONE: 10000, IRON: 10000 };
  r.ap = 0;
  const b = addBuilding(s, r, { q: r.capital.q + 1, r: r.capital.r }, 'LOGISTICS_CENTER', now);
  b.level = level;
  return { s, r, b };
}
function command(actorId: string, amount = 5, recipe: LogisticsRecipe = 'RATIONS') {
  return actionSchema.parse({
    type: 'CONVERT_AP',
    actorId,
    payload: { amount, recipe },
    actionId: randomUUID(),
    clientTimestamp: now,
  });
}
describe('logistique : ressources personnelles contre PA', () => {
  it('fonctionne sans PA et débite exactement le devis', () => {
    const { s, r, b } = fixture();
    const { state, result } = execute(s, r.id, command(b.id), now);
    expect(result.accepted).toBe(true);
    expect(state.realms[r.id].ap).toBe(5);
    expect(state.realms[r.id].wallet.FOOD).toBe(9500);
    expect(state.realms[r.id].wallet.GOLD).toBe(9800);
    expect(state.realms[r.id].wallet.WOOD).toBe(10000);
    expect(state.realms[r.id].logisticsReceipts).toEqual([{ at: now, amount: 5 }]);
    expect(r.ap).toBe(0);
  });
  it('conserve le surplus au-delà de 20 sans régénération', () => {
    const { s, r, b } = fixture();
    r.ap = 40;
    const { state } = execute(s, r.id, command(b.id, 10), now);
    const realm = state.realms[r.id];
    refreshAP(realm, now + 120000);
    expect(realm.ap).toBe(50);
  });
  it('partage le quota entre centres, y compris après sauvegarde et reconstruction', () => {
    const { s, r, b } = fixture();
    const first = execute(s, r.id, command(b.id, 10), now);
    const reloaded = JSON.parse(JSON.stringify(first.state));
    delete reloaded.buildings[b.id];
    const rebuilt = addBuilding(
      reloaded,
      reloaded.realms[r.id],
      { q: b.q + 1, r: b.r },
      'LOGISTICS_CENTER',
      now,
    );
    const denied = execute(reloaded, r.id, command(rebuilt.id, 1), now);
    expect(denied.result.accepted).toBe(false);
    expect(denied.result.reason).toMatch(/Quota/);
    expect(denied.state).toBe(reloaded);
    const view = worldView(reloaded, r.id, now);
    expect(view.player.logisticsReceipts).toEqual([{ at: now, amount: 10 }]);
    expect(
      execute(reloaded, r.id, command(rebuilt.id, 1), now + LOGISTICS_WINDOW).result.accepted,
    ).toBe(true);
  });
  it('libère chaque lot après exactement une heure et ne réinitialise pas à heure fixe', () => {
    const receipts = [
      { at: now, amount: 5 },
      { at: now + 10000, amount: 5 },
    ];
    expect(logisticsQuota(1, receipts, now + LOGISTICS_WINDOW - 1).remaining).toBe(0);
    expect(logisticsQuota(1, receipts, now + LOGISTICS_WINDOW).remaining).toBe(5);
    expect(logisticsQuota(1, receipts, now + LOGISTICS_WINDOW).nextAt).toBe(
      now + LOGISTICS_WINDOW + 10000,
    );
    expect(logisticsQuota(5, receipts, now + 20000).remaining).toBe(20);
  });
  it('refuse les ressources insuffisantes sans paiement partiel ni consommation du quota', () => {
    const { s, r, b } = fixture();
    r.wallet.FOOD = 499;
    const result = execute(s, r.id, command(b.id), now);
    expect(result.result.accepted).toBe(false);
    expect(result.state).toBe(s);
    expect(r.wallet.GOLD).toBe(10000);
    expect(r.logisticsReceipts).toBeUndefined();
  });
  it('refuse un bâtiment ennemi, détruit ou d’un autre type', () => {
    const { s, r, b } = fixture();
    b.ownerId = 'enemy';
    expect(execute(s, r.id, command(b.id), now).result.accepted).toBe(false);
    b.ownerId = r.id;
    b.hp = 0;
    expect(execute(s, r.id, command(b.id), now).result.accepted).toBe(false);
    b.hp = 100;
    b.kind = 'WAREHOUSE';
    expect(execute(s, r.id, command(b.id), now).result.accepted).toBe(false);
  });
  it.each([
    ['INDUSTRY', 2, 2],
    ['OCCULT', 4, 4],
  ] as const)('verrouille %s par centre ET développement', (recipe, level, stage) => {
    const { s, r, b } = fixture();
    expect(execute(s, r.id, command(b.id, 1, recipe), now).result.accepted).toBe(false);
    b.level = level;
    expect(execute(s, r.id, command(b.id, 1, recipe), now).result.accepted).toBe(false);
    prepareDevelopment(s, r.id, stage, now);
    const result = execute(s, r.id, command(b.id, 1, recipe), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms[r.id].ap).toBe(1);
  });
  it('réduit les prix sans avantage à fractionner les achats', () => {
    expect(logisticsCost('RATIONS', 1, 1)).toEqual({ FOOD: 100, GOLD: 40 });
    expect(logisticsCost('RATIONS', 10, 5)).toEqual({ FOOD: 800, GOLD: 320 });
    for (const recipe of ['RATIONS', 'INDUSTRY', 'OCCULT'] as const)
      for (let level = 1; level <= 5; level++) {
        const one = logisticsCost(recipe, 1, level),
          ten = logisticsCost(recipe, 10, level);
        for (const r of Object.keys(one) as (keyof typeof one)[]) expect(ten[r]).toBe(one[r]! * 10);
        expect(upgradeDevelopmentStage('LOGISTICS_CENTER', level)).toBe(level);
      }
  });
  it.each([0, -1, 2, 100000, 1.5])('rejette la quantité invalide %s', (amount) => {
    expect(() => command('b', amount)).toThrow();
  });
});
