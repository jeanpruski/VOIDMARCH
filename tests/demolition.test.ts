import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BUILDINGS, RESOURCES, buildingConstructionCost } from '@voidmarch/config';
import { actionSchema, type Action } from '@voidmarch/protocol';
import {
  accrueEconomy,
  createState,
  demolitionRefund,
  income,
  key,
  observe,
  realmBuildings,
  storage,
  tileAt,
  writeTile,
} from '@voidmarch/game-rules';
import { addBuilding, addPlayer, execute, worldView } from '../apps/server/src/engine';

const now = 1_900_000_000_000;
const order = (type: Action['type'], actorId: string, payload = {}): Action =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture() {
  const s = createState('demolition', now);
  const r = addPlayer(s, 'p', 'Domaine', 'ASH', now);
  r.wallet = { GOLD: 1000, WOOD: 1000, STONE: 1000, IRON: 1000, FOOD: 1000 };
  writeTile(s, { q: 1, r: 0 }, { ownerId: r.id, terrain: 'PLAIN', road: true });
  return { s, r };
}
describe('démolition et remboursement', () => {
  it('rembourse exactement le prix payé, libère la case et conserve le terrain et la route', () => {
    const { s, r } = fixture();
    const built = execute(s, r.id, order('BUILD', r.id, { q: 1, r: 0, kind: 'HOUSE' }), now);
    expect(built.result.accepted).toBe(true);
    const b = realmBuildings(built.state, r.id).find((b) => b.kind === 'HOUSE')!;
    expect(b.constructionCost?.WOOD).toBe(18);
    b.hp = 1;
    const demolished = execute(built.state, r.id, order('DEMOLISH', b.id), now);
    expect(demolished.result.accepted).toBe(true);
    expect(demolished.state.realms[r.id].wallet).toEqual(r.wallet);
    expect(demolished.state.realms[r.id].ap).toBe(38);
    expect(demolished.state.buildings[b.id]).toBeUndefined();
    expect(tileAt(demolished.state, b)).toMatchObject({
      ownerId: undefined,
      terrain: 'PLAIN',
      road: true,
    });
    expect(tileAt(demolished.state, b).buildingId).toBeUndefined();
    expect(demolished.result.message).toContain('+18 bois');
    const duplicate = execute(demolished.state, r.id, order('DEMOLISH', b.id), now);
    expect(duplicate.result.accepted).toBe(false);
    expect(duplicate.state).toEqual(demolished.state);
  });
  it('retire aussi le bâtiment et sa couleur du souvenir quand la démolition fait perdre la visibilité', () => {
    const { s, r } = fixture();
    const p = { q: r.capital.q + 30, r: r.capital.r };
    const b = addBuilding(s, r, p, 'HOUSE', now);
    observe(s, r, now);
    expect(r.explored[key(p)].building?.id).toBe(b.id);
    const result = execute(s, r.id, order('DEMOLISH', b.id), now);
    expect(result.result.accepted).toBe(true);
    const memory = result.state.realms[r.id].explored[key(p)];
    expect(memory.ownerId).toBeUndefined();
    expect(memory.building).toBeUndefined();
    const view = worldView(result.state, r.id, now);
    expect(view.overview.find((t) => key(t) === key(p))?.ownerId).toBeUndefined();
  });
  it('exclut les améliorations même lorsque le camp devient un avant-poste', () => {
    const { s, r } = fixture();
    const b = addBuilding(s, r, { q: 1, r: 0 }, 'CAMP', now);
    const upgraded = execute(s, r.id, order('UPGRADE', b.id), now);
    expect(upgraded.result.accepted).toBe(true);
    expect(upgraded.state.buildings[b.id].kind).toBe('OUTPOST');
    const before = structuredClone(upgraded.state.realms[r.id].wallet);
    const result = execute(upgraded.state, r.id, order('DEMOLISH', b.id), now);
    expect(result.result.accepted).toBe(true);
    for (const resource of RESOURCES)
      expect(result.state.realms[r.id].wallet[resource] - before[resource]).toBe(
        b.constructionCost?.[resource] ?? 0,
      );
  });
  it.each(['CAMP', 'OUTPOST', 'VILLAGE'] as const)(
    'protège la capitale %s sans aucun débit',
    (kind) => {
      const { s, r } = fixture();
      const b = realmBuildings(s, r.id)[0];
      b.kind = kind;
      const result = execute(s, r.id, order('DEMOLISH', b.id), now);
      expect(result.result.accepted).toBe(false);
      expect(result.result.reason).toContain('capitale');
      expect(result.state).toEqual(s);
    },
  );
  it('refuse un bâtiment adverse et les PA insuffisants', () => {
    const { s, r } = fixture();
    const b = addBuilding(s, r, { q: 1, r: 0 }, 'HOUSE', now);
    b.ownerId = 'enemy';
    expect(execute(s, r.id, order('DEMOLISH', b.id), now).result.accepted).toBe(false);
    b.ownerId = r.id;
    r.ap = 0;
    expect(execute(s, r.id, order('DEMOLISH', b.id), now).result.accepted).toBe(false);
    expect(s.buildings[b.id]).toBeDefined();
  });
  it('rembourse sans perte à stockage plein, puis recalcule capacité, population et production', () => {
    const { s, r } = fixture();
    const warehouse = addBuilding(s, r, { q: 1, r: 0 }, 'WAREHOUSE', now, 3);
    const oldCapacity = storage(s, r.id);
    for (const resource of RESOURCES) r.wallet[resource] = oldCapacity;
    const result = execute(s, r.id, order('DEMOLISH', warehouse.id), now);
    expect(result.result.accepted).toBe(true);
    expect(storage(result.state, r.id)).toBeLessThan(oldCapacity);
    for (const resource of RESOURCES)
      expect(result.state.realms[r.id].wallet[resource]).toBe(
        oldCapacity + (warehouse.constructionCost?.[resource] ?? 0),
      );
    const wood = result.state.realms[r.id].wallet.WOOD;
    accrueEconomy(result.state, result.state.realms[r.id], now + 60_000, 0);
    expect(result.state.realms[r.id].wallet.WOOD).toBe(wood);
    const farm = addBuilding(s, r, { q: 2, r: 0 }, 'FARM', now);
    const previousIncome = income(s, r.id).FOOD;
    const removed = execute(s, r.id, order('DEMOLISH', farm.id), now);
    expect(income(removed.state, r.id).FOOD).toBeLessThan(previousIncome);
    const house = addBuilding(s, r, { q: 3, r: 0 }, 'HOUSE', now);
    const population = realmBuildings(s, r.id).reduce((sum, b) => sum + b.population, 0);
    const noHouse = execute(s, r.id, order('DEMOLISH', house.id), now);
    expect(realmBuildings(noHouse.state, r.id).reduce((sum, b) => sum + b.population, 0)).toBe(
      population - house.population,
    );
  });
  it('garde le reçu après changement de propriétaire et prend en charge les anciennes sauvegardes', () => {
    const { s, r } = fixture();
    const b = addBuilding(s, r, { q: 1, r: 0 }, 'HOUSE', now);
    expect(demolitionRefund(b, 'MASK')).toEqual(buildingConstructionCost('HOUSE', 'ASH'));
    delete b.constructionCost;
    b.level = 3;
    expect(demolitionRefund(b, 'MASK')).toEqual(BUILDINGS.HOUSE.cost);
    b.constructionCost = {};
    expect(demolitionRefund(b, 'MASK')).toEqual({});
  });
});
