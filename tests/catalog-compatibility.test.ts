import { describe, expect, it } from 'vitest';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
import { ensureHeroes } from '../apps/server/src/heroes';
import { supportsWorldCatalog } from '../apps/web/src/catalog-compatibility';

function snapshot() {
  const state = createState('catalog-check', Date.now());
  addPlayer(state, 'player', 'Joueur', 'ASH', Date.now());
  ensureHeroes(state, Date.now());
  return worldView(state, 'player', Date.now(), []);
}
describe('compatibilité du catalogue reçu du serveur', () => {
  it('accepte les héros ajoutés à un ancien royaume', () => {
    const world = snapshot();
    expect(world.units.some((u) => u.kind === 'HERO')).toBe(true);
    expect(supportsWorldCatalog(world)).toBe(true);
  });
  it('refuse une unité inconnue avant le rendu de la carte et des panneaux', () => {
    const world = snapshot();
    // @ts-expect-error New server unit, unknown to this client.
    world.units[0].kind = 'FUTURE_UNIT';
    expect(supportsWorldCatalog(world)).toBe(false);
  });
  it('refuse aussi les bâtiments inconnus', () => {
    const world = snapshot();
    const tile = world.tiles.find((t) => t.building)!;
    // @ts-expect-error New server building, unknown to this client.
    tile.building!.kind = 'FUTURE_BUILDING';
    expect(supportsWorldCatalog(world)).toBe(false);
  });
});
