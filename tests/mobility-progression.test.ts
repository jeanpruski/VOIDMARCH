import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  MOBILITY_WINDOW,
  mobilityCost,
  mobilityLevel,
  mobilityLimits,
  mobilityQuota,
} from '@voidmarch/config';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';

const now = 1900000000000;
function setup() {
  const s = createState('mobility-progression', now),
    r = addPlayer(s, 'a', 'Logistique', 'ASH', now);
  r.wallet = { GOLD: 100000, FOOD: 100000, WOOD: 100000, STONE: 100000, IRON: 100000 };
  r.ap = 0;
  const workshop = addBuilding(s, r, { q: r.capital.q + 1, r: r.capital.r }, 'WORKSHOP', now);
  const refinery = addBuilding(s, r, { q: r.capital.q + 2, r: r.capital.r }, 'REFINERY', now);
  const monastery = addBuilding(s, r, { q: r.capital.q - 1, r: r.capital.r }, 'MONASTERY', now);
  return { s, r, workshop, refinery, monastery };
}
const order = (actorId: string, amount: number, resource = 'fuel') =>
  actionSchema.parse({
    type: 'PRODUCE_MOBILITY',
    actorId,
    payload: { amount, resource },
    actionId: randomUUID(),
    clientTimestamp: now,
  });
describe('production de mobilité progressive et partagée', () => {
  it.each([
    [1, 10, 10, 100],
    [2, 20, 14, 115],
    [3, 30, 18, 130],
    [4, 40, 22, 150],
    [5, 50, 25, 175],
  ])('niveau %i : stockage et quota prévus', (level, capacity, hourly, pricePercent) => {
    expect(mobilityLimits(level)).toEqual({ capacity, hourly, pricePercent });
    const { s, r, workshop, refinery } = setup();
    refinery.level = level;
    r.fuel = capacity - 1;
    const ok = execute(s, r.id, order(workshop.id, 1), now);
    expect(ok.result.accepted, ok.result.reason).toBe(true);
    expect(ok.state.realms.a.fuel).toBe(capacity);
    expect(ok.state.realms.a.wallet.GOLD).toBe(
      r.wallet.GOLD - Math.ceil((30 * pricePercent) / 100),
    );
    const blocked = execute(ok.state, r.id, order(refinery.id, 1), now);
    expect(blocked.result.accepted).toBe(false);
    expect(blocked.state).toBe(ok.state);
  });
  it('applique les prix x2,5 au niveau 1 et les majorations sans erreur d’arrondi', () => {
    expect(mobilityCost('WORKSHOP', 1, 'fuel', 1)).toEqual({ GOLD: 30, WOOD: 50, IRON: 20 });
    expect(mobilityCost('REFINERY', 1, 'fuel', 1)).toEqual({ GOLD: 24, WOOD: 40, IRON: 16 });
    expect(mobilityCost('MONASTERY', 1, 'pervitin', 1)).toEqual({ GOLD: 25, FOOD: 75 });
    expect(mobilityCost('FIELD_HOSPITAL', 1, 'pervitin', 1)).toEqual({ GOLD: 20, FOOD: 60 });
    expect(mobilityCost('WORKSHOP', 5, 'fuel', 1)).toEqual({ GOLD: 53, WOOD: 88, IRON: 35 });
    expect(mobilityCost('FIELD_HOSPITAL', 3, 'pervitin', 1)).toEqual({ GOLD: 26, FOOD: 78 });
    for (let level = 1; level <= 5; level++) {
      const one = mobilityCost('WORKSHOP', level, 'fuel', 1),
        ten = mobilityCost('WORKSHOP', level, 'fuel', 10);
      expect(ten.GOLD).toBe(one.GOLD! * 10);
      expect(ten.IRON).toBe(one.IRON! * 10);
    }
  });
  it('partage le quota entre producteurs sans confondre carburant et pervitine', () => {
    const { s, r, workshop, refinery, monastery } = setup();
    const first = execute(s, r.id, order(workshop.id, 10), now).state;
    first.realms.a.fuel = 0; // Points spent on travel; spending cannot replenish production quota.
    const denied = execute(first, r.id, order(refinery.id, 1), now);
    expect(denied.result.accepted).toBe(false);
    expect(denied.result.reason).toContain('Quota');
    expect(denied.state).toBe(first);
    const separate = execute(first, r.id, order(monastery.id, 10, 'pervitin'), now);
    expect(separate.result.accepted).toBe(true);
    expect(separate.state.realms.a.mobilityReceipts).toEqual({
      fuel: [{ at: now, amount: 10 }],
      pervitin: [{ at: now, amount: 10 }],
    });
  });
  it('garde le quota après sauvegarde, démolition, reconstruction et changement de niveau', () => {
    const { s, r, workshop, refinery } = setup();
    const first = execute(s, r.id, order(workshop.id, 10), now).state;
    const restored = JSON.parse(JSON.stringify(first));
    restored.realms.a.fuel = 0;
    delete restored.buildings[workshop.id];
    delete restored.buildings[refinery.id];
    const rebuilt = addBuilding(
      restored,
      restored.realms.a,
      { q: workshop.q, r: workshop.r },
      'WORKSHOP',
      now,
    );
    expect(execute(restored, r.id, order(rebuilt.id, 1), now).result.accepted).toBe(false);
    rebuilt.level = 2;
    expect(mobilityQuota(2, restored.realms.a.mobilityReceipts.fuel, now).remaining).toBe(4);
    expect(execute(restored, r.id, order(rebuilt.id, 5), now).result.accepted).toBe(false);
    expect(execute(restored, r.id, order(rebuilt.id, 1), now).result.accepted).toBe(true);
    expect(worldView(restored, r.id, now).player.mobilityReceipts?.fuel).toEqual([
      { at: now, amount: 10 },
    ]);
  });
  it('libère le quota de chaque lot exactement une heure après sa production', () => {
    const receipts = [
      { at: now, amount: 5 },
      { at: now + 30000, amount: 5 },
    ];
    expect(mobilityQuota(1, receipts, now + MOBILITY_WINDOW - 1).remaining).toBe(0);
    expect(mobilityQuota(1, receipts, now + MOBILITY_WINDOW)).toMatchObject({
      remaining: 5,
      nextAt: now + 30000 + MOBILITY_WINDOW,
    });
    const { s, r, workshop } = setup();
    const first = execute(s, r.id, order(workshop.id, 10), now).state;
    first.realms.a.fuel = 0;
    expect(
      execute(first, r.id, order(workshop.id, 1), now + MOBILITY_WINDOW - 1).result.accepted,
    ).toBe(false);
    expect(
      execute(first, r.id, order(workshop.id, 10), now + MOBILITY_WINDOW).result.accepted,
    ).toBe(true);
  });
  it('ignore les producteurs détruits et garde le surplus existant après baisse de capacité', () => {
    const { s, r, workshop, refinery, monastery } = setup();
    refinery.level = 5;
    refinery.hp = 0;
    monastery.level = 4;
    expect(mobilityLevel(Object.values(s.buildings), 'fuel')).toBe(1);
    expect(mobilityLevel(Object.values(s.buildings), 'pervitin')).toBe(4);
    r.fuel = 40;
    const result = execute(s, r.id, order(workshop.id, 1), now);
    expect(result.result.accepted).toBe(false);
    expect(result.state.realms.a.fuel).toBe(40);
  });
  it('ne consomme pas le quota ni aucune ressource lors d’un refus', () => {
    const { s, r, workshop } = setup();
    r.wallet.IRON = 0;
    const result = execute(s, r.id, order(workshop.id, 5), now);
    expect(result.result.accepted).toBe(false);
    expect(result.state).toBe(s);
    expect(r.wallet.GOLD).toBe(100000);
    expect(r.mobilityReceipts).toBeUndefined();
  });
});
