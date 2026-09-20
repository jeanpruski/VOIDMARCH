import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  createState,
  writeTile,
  key,
  recruitmentRequirement,
  developmentProgress,
  neighbors,
} from '@voidmarch/game-rules';
import { buildingConstructionCost, type BuildingKind } from '@voidmarch/config';
import { addPlayer, execute, worldView, addBuilding } from '../apps/server/src/engine';
import { strategy } from '../apps/server/src/strategy';
import { actionSchema } from '@voidmarch/protocol';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { constructionSiteReason, isBuilderSite } from '../apps/web/src/construction';
const now = 1_900_000_000_000;
function fixture() {
  const s = createState('remote-bases', now);
  const r = addPlayer(s, 'a', 'Colonie', 'ASH', now);
  r.wallet = { GOLD: 1000, WOOD: 1000, IRON: 1000, FOOD: 1000, STONE: 1000 };
  const target = { q: r.capital.q + 70, r: r.capital.r };
  const u = (s.units.worker = {
    id: 'worker',
    kind: 'PEASANT' as const,
    ownerId: r.id,
    ...target,
    hp: 12,
    createdAt: now,
    updatedAt: now,
  });
  writeTile(s, target, { terrain: 'PLAIN', ownerId: undefined, buildingId: undefined });
  const command = (kind: BuildingKind = 'OUTPOST') =>
    actionSchema.parse({
      type: 'BUILD',
      actorId: u.id,
      payload: { ...target, kind },
      actionId: randomUUID(),
      clientTimestamp: now,
    });
  const view = () =>
    worldView(s, 'a', now, [{ q: Math.floor(target.q / 32), r: Math.floor(target.r / 32) }]);
  return { s, r, u, target, command, view };
}
describe('fondation de bases éloignées', () => {
  it('fonde, paie, revendique une seule case et conserve capitale et paysan', () => {
    const { s, r, u, target, command, view } = fixture();
    const w = view(),
      tile = w.tiles.find((t) => key(t) === key(target))!;
    expect(constructionSiteReason(w, tile, 'OUTPOST')).toBe('');
    expect(isBuilderSite(w, u, tile)).toBe(true);
    const cmd = command();
    expect(
      predictAction(w, cmd)?.world.tiles.find((t) => key(t) === key(target))?.building?.kind,
    ).toBe('OUTPOST');
    const applied = execute(s, 'a', cmd, now);
    expect(applied.result.accepted, applied.result.reason).toBe(true);
    const outpost = Object.values(applied.state.buildings).find((b) => key(b) === key(target))!;
    expect(outpost.kind).toBe('OUTPOST');
    expect(applied.state.tiles[key(target)].ownerId).toBe('a');
    for (const p of neighbors(target)) expect(applied.state.tiles[key(p)]?.ownerId).not.toBe('a');
    expect(applied.state.realms.a.capital).toEqual(r.capital);
    expect(applied.state.units[u.id]).toMatchObject({ kind: 'PEASANT', ...target });
    expect(applied.state.realms.a.ap).toBe(r.ap - 1);
    for (const [resource, cost] of Object.entries(buildingConstructionCost('OUTPOST', r.faction)))
      expect(applied.state.realms.a.wallet[resource as keyof typeof r.wallet]).toBe(
        r.wallet[resource as keyof typeof r.wallet] - cost,
      );
    expect(
      recruitmentRequirement(
        'PEASANT',
        outpost,
        Object.values(applied.state.buildings),
        developmentProgress(applied.state, 'a'),
      ),
    ).toBe('');
    const chantier = { ...target, q: target.q + 3 };
    Object.assign(applied.state.units[u.id], chantier);
    writeTile(applied.state, chantier, { terrain: 'FOREST', ownerId: undefined });
    const next = {
      ...command('LUMBER'),
      type: 'BUILD' as const,
      payload: { ...chantier, kind: 'LUMBER' as const },
    };
    expect(execute(applied.state, 'a', next, now).result.accepted).toBe(true);
    const far = { ...target, q: target.q + 4 };
    Object.assign(applied.state.units[u.id], far);
    writeTile(applied.state, far, { terrain: 'FOREST', ownerId: undefined });
    expect(
      execute(
        applied.state,
        'a',
        { ...next, actionId: randomUUID(), payload: { ...far, kind: 'LUMBER' } },
        now,
      ).result.accepted,
    ).toBe(false);
  });
  it.each(['CAMP', 'VILLAGE', 'WOOD_WALL', 'FARM'] as const)(
    'ne libère pas les autres constructions : %s',
    (kind) => {
      const { s, command, view, target } = fixture();
      const w = view(),
        tile = w.tiles.find((t) => key(t) === key(target))!;
      expect(constructionSiteReason(w, tile, kind)).not.toBe('');
      expect(predictAction(w, command(kind))).toBeUndefined();
      expect(execute(s, 'a', command(kind), now).result.accepted).toBe(false);
    },
  );
  it.each([
    'adjacent',
    'engineer',
    'enemy',
    'absent',
    'dead',
    'sea',
    'mountain',
    'scorched',
    'occupied',
    'hostileUnit',
    'poor',
    'noAP',
    'strategic',
  ] as const)('refuse une fondation invalide sans dépenses : %s', (scenario) => {
    const { s, r, u, target, command, view } = fixture();
    if (scenario === 'adjacent') u.q++;
    if (scenario === 'engineer') (u as { kind: string }).kind = 'ENGINEER';
    if (scenario === 'enemy') u.ownerId = 'enemy';
    if (scenario === 'absent') delete s.units.worker;
    if (scenario === 'dead') u.hp = 0;
    if (scenario === 'sea') writeTile(s, target, { terrain: 'SEA' });
    if (scenario === 'mountain') writeTile(s, target, { terrain: 'MOUNTAIN' });
    if (scenario === 'scorched') writeTile(s, target, { terrain: 'SCORCHED' });
    if (scenario === 'occupied') addBuilding(s, r, target, 'CAMP', now);
    if (scenario === 'hostileUnit') s.units.enemy = { ...u, id: 'enemy', ownerId: 'enemy' };
    if (scenario === 'poor') r.wallet.WOOD = 0;
    if (scenario === 'noAP') r.ap = 0;
    if (scenario === 'strategic')
      strategy(s, now).sites.radio = { id: 'radio', kind: 'RADIO', ...target };
    const cmd = command();
    expect(predictAction(view(), cmd), scenario).toBeUndefined();
    const result = execute(s, 'a', cmd, now);
    expect(result.result.accepted, scenario).toBe(false);
    expect(result.state).toBe(s);
  });
  it('ne fonde pas sur une terre adverse et conserve les constructions sur les terres déjà revendiquées', () => {
    const { s, target, command } = fixture();
    writeTile(s, target, { ownerId: 'enemy' });
    expect(execute(s, 'a', command(), now).result.accepted).toBe(false);
    writeTile(s, target, { ownerId: 'a' });
    expect(execute(s, 'a', command('FARM'), now).result.accepted).toBe(true);
  });
});
