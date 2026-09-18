import { describe, it, expect } from 'vitest';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
import { newVictories } from '../apps/web/src/victories';
import type { MissionVictory } from '@voidmarch/shared';
const now = 1_900_000_000_000;
function fixture() {
  const s = createState('victory', now);
  addPlayer(s, 'a', 'A', 'ASH', now);
  const before = worldView(s, 'a', now),
    after = structuredClone(before);
  const victory: MissionVictory = {
    id: 'win',
    title: 'La tour',
    ownerId: 'a',
    at: now,
    q: 2,
    r: 0,
    reward: { GOLD: 500 },
    captured: { units: 2, buildings: 1, walls: 12 },
    destroyed: { units: 1, buildings: 1, walls: 0 },
    losses: { units: 1, buildings: 0 },
    medal: {
      name: 'Tour du soir',
      metal: 'gold',
      ribbon: 'pine',
      shape: 'shield',
      emblem: 'tower',
    },
  };
  after.journal.unshift({ id: 'entry', at: now, text: 'Victoire', kind: 'REALM', victory });
  return { before, after };
}
describe('bilans de victoire confirmés', () => {
  it('affiche un bilan frais, sans rejouer la collection à la connexion ou au rafraîchissement', () => {
    const { before, after } = fixture();
    expect(newVictories(before, after)).toHaveLength(1);
    expect(newVictories(undefined, after)).toEqual([]);
    expect(newVictories(after, after)).toEqual([]);
    after.serverTimestamp += 20000;
    expect(newVictories(before, after)).toEqual([]);
  });
  it('déduplique la même victoire et ignore les anciens joueurs', () => {
    const { before, after } = fixture();
    after.journal.unshift({ ...after.journal[0], id: 'another' });
    expect(newVictories(before, after)).toHaveLength(1);
    after.player.id = 'other';
    expect(newVictories(before, after)).toEqual([]);
  });
});
