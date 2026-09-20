import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { BUILDING_REQUIREMENTS, type BuildingKind } from '@voidmarch/config';
import { createState, createRealm, writeTile, neighbors, disk, key } from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { constructionSiteReason, isBuilderSite } from '../apps/web/src/construction';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { prepareDevelopment } from './fixtures/development';
const now = 1_900_000_000_000;
const kinds = ['PORT', 'SHIPYARD', 'NAVAL_FISHERY', 'SUBMARINE_BASE'] as const;
function fixture(kind: BuildingKind = 'PORT', direction = 0) {
  const s = createState('offshore', now),
    r = (s.realms.a = createRealm('a', 'Marins', 'ASH', { q: 0, r: 0 }, now));
  r.wallet = { GOLD: 1e7, WOOD: 1e7, STONE: 1e7, IRON: 1e7, FOOD: 1e7 };
  addBuilding(s, r, r.capital, 'CAMP', now);
  const target = { q: 3, r: 0 },
    shore = neighbors(target)[direction];
  for (const p of disk(target, 2))
    writeTile(s, p, { terrain: 'COAST', ownerId: undefined, buildingId: undefined });
  writeTile(s, shore, { terrain: 'BEACH' });
  const worker = (s.units.worker = {
    id: 'worker',
    kind: 'PEASANT' as const,
    ownerId: 'a',
    ...shore,
    hp: 12,
    createdAt: now,
    updatedAt: now,
  });
  prepareDevelopment(s, 'a', 5, now);
  for (const [i, k] of (BUILDING_REQUIREMENTS[kind] ?? []).entries())
    addBuilding(s, r, { q: -10 - i, r: 0 }, k, now);
  const cmd = () =>
    actionSchema.parse({
      type: 'BUILD',
      actorId: worker.id,
      payload: { ...target, kind },
      actionId: randomUUID(),
      clientTimestamp: now,
    });
  const view = () =>
    worldView(s, 'a', now, [
      { q: 0, r: 0 },
      { q: 0, r: -1 },
    ]);
  return { s, r, worker, target, shore, cmd, view };
}
describe('installations sur l’eau à une case de la plage', () => {
  it.each(kinds.flatMap((kind) => [0, 1, 2, 3, 4, 5].map((direction) => ({ kind, direction }))))(
    '$kind touche la plage dans la direction $direction',
    ({ kind, direction }) => {
      const { s, r, worker, target, cmd, view } = fixture(kind, direction);
      const w = view(),
        tile = w.tiles.find((t) => key(t) === key(target))!;
      expect(constructionSiteReason(w, tile, kind)).toBe('');
      expect(isBuilderSite(w, worker, tile)).toBe(true);
      expect(
        predictAction(w, cmd())?.world.tiles.find((t) => key(t) === key(target))?.building?.kind,
      ).toBe(kind);
      const result = execute(s, 'a', cmd(), now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      expect(result.state.tiles[key(target)].terrain).toBe('COAST');
      expect(result.state.tiles[key(target)].ownerId).toBe('a');
      expect(result.state.units.worker).toMatchObject({ q: worker.q, r: worker.r });
      expect(result.state.realms.a.ap).toBe(r.ap - 1);
    },
  );
  it.each([
    'land',
    'openSea',
    'plainShore',
    'foreignShore',
    'foreignWater',
    'missingWorker',
    'remoteWorker',
    'enemyUnit',
    'expedition',
  ] as const)('refuse sans dépense : %s', (scenario) => {
    const { s, worker, target, shore, cmd, view } = fixture();
    if (scenario === 'land') writeTile(s, target, { terrain: 'BEACH' });
    if (scenario === 'openSea') writeTile(s, shore, { terrain: 'COAST' });
    if (scenario === 'plainShore') writeTile(s, shore, { terrain: 'PLAIN' });
    if (scenario === 'foreignShore') writeTile(s, shore, { ownerId: 'enemy' });
    if (scenario === 'foreignWater') writeTile(s, target, { ownerId: 'enemy' });
    if (scenario === 'missingWorker') delete s.units.worker;
    if (scenario === 'remoteWorker') worker.q += 2;
    if (scenario === 'enemyUnit')
      s.units.enemy = { ...worker, id: 'enemy', ownerId: 'enemy', kind: 'INFANTRY', ...target };
    if (scenario === 'expedition') {
      s.missions!.a.active = {
        id: 'exp',
        realmId: 'a',
        ownerId: 'mission:exp',
        objectiveId: 'objective',
        startedAt: now,
        objective: 'BUILDING',
        title: 'Site',
        difficulty: 'Escarmouche',
        level: 1,
        units: [],
        buildings: [],
        abandonmentCost: {},
        distance: 70,
        ...target,
        expedition: { siteId: 'giza', mode: 'RECON', route: 'LAND', targetDistance: 70 },
      };
    }
    const result = execute(s, 'a', cmd(), now);
    expect(result.result.accepted, scenario).toBe(false);
    expect(result.state).toBe(s);
    expect(predictAction(view(), cmd())).toBeUndefined();
  });
  it('une plage revendiquée permet le chantier lointain sans capturer toute la mer', () => {
    const { s, r, worker, target, shore, cmd, view } = fixture();
    for (const b of Object.values(s.buildings))
      if (b.ownerId === 'a') {
        b.q -= 100;
      }
    expect(execute(s, 'a', cmd(), now).result.accepted).toBe(false);
    writeTile(s, shore, { ownerId: 'a' });
    const result = execute(s, 'a', cmd(), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(predictAction(view(), cmd())).toBeDefined();
    for (const n of neighbors(target))
      if (key(n) !== key(shore)) expect(result.state.tiles[key(n)]?.ownerId).not.toBe('a');
  });
  it('garde la batterie à terre et empêche les bâtiments terrestres de flotter', () => {
    const { s, r, worker, target, shore, cmd, view } = fixture('COASTAL_BATTERY');
    expect(execute(s, 'a', cmd(), now).result.accepted).toBe(false);
    writeTile(s, shore, { ownerId: 'a' });
    const command = actionSchema.parse({
      ...cmd(),
      payload: { ...shore, kind: 'COASTAL_BATTERY' },
    });
    expect(execute(s, 'a', command, now).result.accepted).toBe(true);
    expect(
      constructionSiteReason(
        view(),
        view().tiles.find((t) => key(t) === key(target)),
        'CAMP',
      ),
    ).not.toBe('');
  });
  it('conserve recrutement et améliorations des anciens ports sur la rive', () => {
    const { s, r, shore } = fixture();
    delete s.units.worker;
    const port = addBuilding(s, r, shore, 'PORT', now);
    port.population = 100;
    const recruit = actionSchema.parse({
      type: 'RECRUIT',
      actorId: port.id,
      payload: { kind: 'TROOP_FERRY' },
      actionId: randomUUID(),
      clientTimestamp: now,
    });
    const result = execute(s, 'a', recruit, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(Object.values(result.state.units).some((u) => u.kind === 'TROOP_FERRY')).toBe(true);
    const upgrade = actionSchema.parse({ ...recruit, type: 'UPGRADE', payload: {} });
    expect(execute(s, 'a', upgrade, now).result.accepted).toBe(true);
  });
});
