import { describe, expect, it } from 'vitest';
import { createState } from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { PlayerPresence } from '../apps/server/src/presence';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { missionOffers } from '../apps/server/src/missions';
const now = 1_900_000_000_000;
function fixture() {
  const state = createState('presence', now);
  addPlayer(state, 'a', 'Alice', 'ASH', now);
  addPlayer(state, 'b', 'Basile', 'MASK', now);
  return { state, presence: new PlayerPresence() };
}
describe('joueurs connectés', () => {
  it('conserve le début de session entre plusieurs onglets et ignore les jointures répétées', () => {
    const { state, presence } = fixture();
    presence.join('a', 'tab1', now);
    presence.join('a', 'tab2', now + 1000);
    presence.join('a', 'tab1', now + 2000);
    presence.leave('a', 'tab1');
    const view = presence.decorate(worldView(state, 'a', now + 3000));
    expect(view.realms.find((r) => r.id === 'a')).toMatchObject({
      online: true,
      connectedSince: now,
    });
    expect(view.onlineHumans).toBe(1);
    expect(presence.connected()).toEqual(new Set(['a']));
    presence.leave('a', 'tab2');
    expect(presence.connected().size).toBe(0);
    presence.join('a', 'tab3', now + 10000);
    expect(presence.decorate(view).realms.find((r) => r.id === 'a')?.connectedSince).toBe(
      now + 10000,
    );
  });
  it('retire immédiatement les déconnectés malgré la grâce économique et exclut les bots du compteur', () => {
    const { state, presence } = fixture();
    state.realms.b.bot = true;
    const original = worldView(state, 'a', now);
    expect(original.realms.find((r) => r.id === 'a')?.online).toBe(true);
    presence.join('a', 'socket', now);
    expect(presence.decorate(original).onlineHumans).toBe(1);
    presence.leave('a', 'socket');
    const view = presence.decorate(original);
    expect(view.onlineHumans).toBe(0);
    expect(view.realms.find((r) => r.id === 'a')).toMatchObject({
      online: false,
      connectedSince: undefined,
    });
    expect(original.realms.find((r) => r.id === 'a')?.online).toBe(true);
  });
  it('publie seulement le statut de mission, sans révéler son objectif ni ses coordonnées', () => {
    const { state } = fixture();
    const offer = missionOffers(state, 'b', now)[0];
    const result = execute(
      state,
      'b',
      actionSchema.parse({
        type: 'MISSION_ACCEPT',
        actorId: 'b',
        payload: { offerId: offer.id },
        actionId: crypto.randomUUID(),
        clientTimestamp: now,
      }),
      now,
    );
    expect(result.result.accepted).toBe(true);
    const view = worldView(result.state, 'a', now);
    expect(view.realms.find((r) => r.id === 'a')?.onMission).toBe(false);
    const other = view.realms.find((r) => r.id === 'b')!;
    expect(other.onMission).toBe(true);
    expect(other).not.toHaveProperty('mission');
    expect(other).not.toHaveProperty('objectiveId');
    expect(other).not.toHaveProperty('q');
  });
});
