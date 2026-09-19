import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { UNITS } from '@voidmarch/config';
import { createState, createRealm, writeTile } from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { execute, worldView } from '../apps/server/src/engine';
import { eventAvailable } from '../apps/web/src/world-events';

describe('retrait des événements indisponibles', () => {
  const now = 1900000000000;
  function fixture() {
    const s = createState('events', now);
    const r = (s.realms.p = createRealm('p', 'Veille', 'ASH', { q: 0, r: 0 }, now));
    writeTile(s, r.capital, { terrain: 'PLAIN' });
    s.units.u = {
      id: 'u',
      ownerId: r.id,
      kind: 'PEASANT',
      q: 0,
      r: 0,
      hp: UNITS.PEASANT.hp,
      createdAt: now,
      updatedAt: now,
    };
    s.events.e = {
      id: 'e',
      kind: 'METEOR',
      q: 0,
      r: 0,
      title: 'Étoile',
      description: '',
      reward: { GOLD: 15 },
      global: true,
      startsAt: now,
      endsAt: now + 1000,
    };
    return s;
  }
  it('expire exactement à la date annoncée, côté serveur et affichage', () => {
    const s = fixture();
    expect(eventAvailable(s.events.e, now + 999)).toBe(true);
    expect(eventAvailable(s.events.e, now + 1000)).toBe(false);
    expect(worldView(s, 'p', now + 999).events).toHaveLength(1);
    expect(worldView(s, 'p', now + 1000).events).toHaveLength(0);
  });
  it('retire un événement récupéré tout en gardant la récompense et son historique', () => {
    const s = fixture();
    const result = execute(
      s,
      'p',
      actionSchema.parse({
        type: 'INTERACT',
        actorId: 'u',
        payload: { eventId: 'e' },
        actionId: randomUUID(),
        clientTimestamp: now,
      }),
      now,
    );
    expect(result.result.accepted).toBe(true);
    expect(eventAvailable(result.state.events.e, now)).toBe(false);
    expect(worldView(result.state, 'p', now).events).toHaveLength(0);
    expect(result.state.realms.p.wallet.GOLD).toBe(s.realms.p.wallet.GOLD + 15);
    expect(result.state.journal.some((entry) => entry.text?.includes('Étoile'))).toBe(true);
  });
});
