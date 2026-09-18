import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  BUILDING_REQUIREMENTS,
  RESOURCE_BUILDINGS,
  buildingConstructionCost,
  type Terrain,
  type Resource,
} from '@voidmarch/config';
import { createState, writeTile, income } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { compareBuildings } from '../apps/web/src/building-order';

const now = 1_900_000_000_000;
const kinds = [...Object.keys(RESOURCE_BUILDINGS), 'GOLD_MINE'] as (
  keyof typeof RESOURCE_BUILDINGS | 'GOLD_MINE'
)[];
function fixture(kind: (typeof kinds)[number], prerequisites = true, terrain?: Terrain) {
  const s = createState('resource-buildings', now);
  const r = addPlayer(s, 'p', 'Bâtisseurs', 'ASH', now);
  r.wallet = { GOLD: 10000, WOOD: 10000, STONE: 10000, IRON: 10000, FOOD: 10000 };
  const p = { q: r.capital.q + 1, r: r.capital.r };
  writeTile(s, p, { terrain: terrain ?? (BUILDINGS[kind].terrains[0] as Terrain), ownerId: r.id });
  if (prerequisites)
    (BUILDING_REQUIREMENTS[kind] ?? []).forEach((k, i) =>
      addBuilding(s, r, { q: r.capital.q - 1, r: r.capital.r + i }, k, now),
    );
  const action = actionSchema.parse({
    type: 'BUILD',
    actorId: r.id,
    payload: { kind, ...p },
    actionId: randomUUID(),
    clientTimestamp: now,
  });
  return { s, r, p, action };
}
describe('exploitations de ressources et mine d’or', () => {
  it.each(kinds)('%s : construit avec les prérequis, paie son coût et 1 PA', (kind) => {
    const { s, r, action } = fixture(kind);
    const result = execute(s, r.id, action, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(Object.values(result.state.buildings).some((b) => b.kind === kind)).toBe(true);
    expect(result.state.realms.p.ap).toBe(r.ap - 1);
    for (const resource of Object.keys(r.wallet) as Resource[])
      expect(result.state.realms.p.wallet[resource]).toBe(
        r.wallet[resource] - (buildingConstructionCost(kind, r.faction)[resource] ?? 0),
      );
  });
  it.each(kinds)(
    '%s : refuse les mauvais terrains et les prérequis manquants sans débit',
    (kind) => {
      for (const fixtureArgs of [
        [false, undefined],
        [true, 'PLAIN'],
      ] as const) {
        const { s, r, action } = fixture(kind, fixtureArgs[0], fixtureArgs[1]);
        const result = execute(s, r.id, action, now);
        expect(result.result.accepted).toBe(false);
        expect(result.state.realms.p.ap).toBe(r.ap);
        expect(result.state.realms.p.wallet).toEqual(r.wallet);
      }
    },
  );
  it.each(kinds)(
    '%s : produit au bon endroit aux trois niveaux, aucun minerai sur plaine',
    (kind) => {
      const { s, r, p } = fixture(kind, false);
      const [resource, rate] = Object.entries(BUILDINGS[kind].production)[0] as [Resource, number];
      const baseline = income(s, r.id)[resource];
      const b = addBuilding(s, r, p, kind, now);
      for (const terrain of BUILDINGS[kind].terrains) {
        writeTile(s, p, { terrain: terrain as Terrain });
        for (const [i, multiplier] of [1, 1.8, 3].entries()) {
          b.level = i + 1;
          expect(income(s, r.id)[resource] - baseline).toBeCloseTo(rate * multiplier);
        }
      }
      writeTile(s, p, { terrain: 'PLAIN' });
      expect(income(s, r.id)[resource]).toBe(baseline);
    },
  );
  it('propose trois producteurs par matériau, dans un ordre progressif', () => {
    for (const [resource, chain, terrain] of [
      ['WOOD', ['LUMBER', 'STEAM_SAWMILL', 'OCCULT_SAWMILL'], 'FOREST'],
      ['STONE', ['QUARRY', 'MECHANIZED_QUARRY', 'RUNIC_QUARRY'], 'MOUNTAIN'],
      ['IRON', ['MINE', 'INDUSTRIAL_MINE', 'ABYSSAL_MINE'], 'HILL'],
    ] as const) {
      const producers = (Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[]).filter(
        (k) => (BUILDINGS[k].production as Partial<Record<Resource, number>>)[resource],
      );
      expect(producers.sort((a, b) => compareBuildings(a, b, terrain))).toEqual(chain);
    }
  });
});
