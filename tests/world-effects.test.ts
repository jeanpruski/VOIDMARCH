import { describe, expect, it } from 'vitest';
import { createState, realmBuildings } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
import { worldEffects } from '../apps/web/src/world-effects';
const now = 1_900_000_000_000;
function fixture() {
  const state = createState('effects', now);
  addPlayer(state, 'p', 'Effets', 'ASH', now);
  const before = worldView(state, 'p', now);
  return { before, after: structuredClone(before), camp: realmBuildings(state, 'p')[0] };
}
describe('effets du monde', () => {
  it('déclenche un nuage de poussière quand un bâtiment visible disparaît', () => {
    const { before, after } = fixture();
    const tile = after.tiles.find((t) => t.building)!;
    tile.building = undefined;
    expect(worldEffects(before, after).map((effect) => effect.kind)).toEqual(['demolish']);
    tile.visibility = 'EXPLORED';
    expect(worldEffects(before, after)).toEqual([]);
  });
  it('ne joue aucun effet pour un snapshot inchangé ou une reconnexion', () => {
    const { before, after } = fixture();
    expect(worldEffects(before, after)).toEqual([]);
    after.serverTimestamp += 20000;
    after.tiles.find((t) => t.building)!.building!.hp--;
    expect(worldEffects(before, after)).toEqual([]);
  });
  it('détecte dégâts, réparation et développement', () => {
    const { before, after } = fixture();
    const tile = after.tiles.find((t) => t.building)!;
    tile.building!.hp--;
    expect(worldEffects(before, after).map((e) => e.kind)).toEqual(['combat']);
    expect(worldEffects(after, before).map((e) => e.kind)).toEqual(['repair']);
    tile.building!.kind = 'OUTPOST';
    expect(worldEffects(before, after).map((e) => e.kind)).toEqual(['build']);
  });
  it('ne montre pas de travaux ou de combat sur une case hors vision', () => {
    const { before, after } = fixture();
    const tile = after.tiles.find((t) => t.building)!;
    tile.visibility = 'EXPLORED';
    tile.building!.hp--;
    expect(worldEffects(before, after)).toEqual([]);
  });
});
