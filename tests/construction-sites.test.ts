import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createState, neighbors, key, writeTile } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { constructionSiteReason, isBuilderSite } from '../apps/web/src/construction';
import { actionSchema } from '@voidmarch/protocol';

const now = 1_800_000_000_000;
function fixture(direction = 0) {
  const state = createState('construction-sites', now);
  const realm = addPlayer(state, 'a', 'Chantiers', 'ASH', now);
  realm.wallet.WOOD = 100;
  realm.wallet.GOLD = 100;
  const worker = (state.units.worker = {
    id: 'worker',
    ownerId: 'a',
    kind: 'PEASANT' as const,
    ...realm.capital,
    hp: 12,
    createdAt: now,
    updatedAt: now,
  });
  const target = neighbors(worker)[direction];
  writeTile(state, target, { terrain: 'FOREST', ownerId: undefined });
  const view = () =>
    worldView(state, 'a', now, [{ q: Math.floor(target.q / 32), r: Math.floor(target.r / 32) }]);
  const world = view();
  const tile = world.tiles.find((t) => key(t) === key(target))!;
  return { state, world, worker, tile, target };
}

describe('chantiers éclairés et action Construire', () => {
  it.each([0, 1, 2, 3, 4, 5])(
    'permet réellement de construire dans la direction %s',
    (direction) => {
      const { state, world, worker, tile, target } = fixture(direction);
      expect(isBuilderSite(world, worker, tile)).toBe(true);
      expect(constructionSiteReason(world, tile)).toBe('');
      const applied = execute(
        state,
        'a',
        actionSchema.parse({
          type: 'BUILD',
          actorId: worker.id,
          payload: { ...target, kind: 'LUMBER' },
          actionId: randomUUID(),
          clientTimestamp: now,
        }),
        now,
      );
      expect(applied.result.accepted).toBe(true);
    },
  );
  it('ne promet pas de chantier sur une terre brûlée ou inconnue', () => {
    const { world, worker, tile } = fixture();
    for (const blocked of [
      { ...tile, terrain: 'SCORCHED' as const },
      { ...tile, visibility: 'UNKNOWN' as const },
    ]) {
      expect(isBuilderSite(world, worker, blocked)).toBe(false);
      expect(constructionSiteReason(world, blocked)).not.toBe('');
    }
  });
  it('exclut les sites stratégiques de la surbrillance et du catalogue', () => {
    const { world, worker, tile } = fixture();
    world.strategy!.sites.push({ q: tile.q, r: tile.r, id: 'radio', kind: 'RADIO' });
    expect(isBuilderSite(world, worker, tile)).toBe(false);
    expect(constructionSiteReason(world, tile)).toContain('stratégique');
  });
  it('permet un chantier dans une enceinte même loin des bâtiments', () => {
    const { world, worker, tile } = fixture();
    world.tiles = [];
    tile.ownerId = 'a';
    tile.enclosureOwnerId = 'a';
    expect(isBuilderSite(world, worker, tile)).toBe(true);
    world.units = [];
    expect(constructionSiteReason(world, tile)).toContain('Approchez');
  });
  it('autorise les unités amies et refuse une occupation ennemie', () => {
    const { world, worker, tile } = fixture();
    world.units.push({ ...worker, ...tile, kind: 'INFANTRY', id: 'friend', ownerId: 'a' });
    expect(isBuilderSite(world, worker, tile)).toBe(true);
    world.units[world.units.length - 1].ownerId = 'enemy';
    expect(isBuilderSite(world, worker, tile)).toBe(false);
    expect(constructionSiteReason(world, tile)).toContain('adverse');
  });
});
