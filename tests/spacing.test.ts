import { expect, it } from 'vitest';
import { createState, distance } from '@voidmarch/game-rules';
import { addPlayer } from '../apps/server/src/engine';
import { BotDirector } from '../apps/server/src/bots';
import { RULES } from '@voidmarch/config';

it('espace les bots et les joueurs, même lorsque les bots précèdent le premier humain', () => {
  const state = createState('wide-world', 1900000000000);
  new BotDirector().reconcile(state, 1900000000000, 0);
  for (let i = 0; i < 8; i++) addPlayer(state, `human-${i}`, `Human ${i}`, 'ASH', 1900000000000);
  const realms = Object.values(state.realms);
  for (let i = 0; i < realms.length; i++)
    for (let j = i + 1; j < realms.length; j++)
      expect(distance(realms[i].capital, realms[j].capital)).toBeGreaterThanOrEqual(
        RULES.realmSpacing,
      );
});
