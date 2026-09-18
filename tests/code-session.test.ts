import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createState, createRealm } from '@voidmarch/game-rules';
import { addPlayer, execute, worldView } from '../apps/server/src/engine';
import { beginCodeSession } from '../apps/server/src/code-session';
import { actionSchema } from '@voidmarch/protocol';

const now = 1_800_000_000_000;
describe('codes temporaires de la page de jeu', () => {
  it('désactive les anciens modes persistés avant le snapshot et recommence à dépenser les PA', () => {
    const s = createState('codes', now);
    const r = addPlayer(s, 'a', 'Observateur', 'ASH', now);
    s.realms.b = createRealm('b', 'Autre', 'IRON', { q: 80, r: 0 }, now);
    r.unlimitedAP = r.capitalRadar = true;
    r.ap = 7;
    const before = { ...r.wallet };
    expect(beginCodeSession(r, randomUUID())).toBe(true);
    const view = worldView(s, r.id, now);
    expect(view.player.unlimitedAP).toBe(false);
    expect(view.player.capitalRadar).toBe(false);
    expect(view.enemyCapitals).toBeUndefined();
    expect(view.player).not.toHaveProperty('codeSessionId');
    expect(r.ap).toBe(7);
    expect(r.wallet).toEqual(before);
    const capital = Object.values(s.buildings).find((b) => b.ownerId === r.id)!;
    const command = actionSchema.parse({
      type: 'RECRUIT',
      actorId: capital.id,
      payload: { kind: 'PEASANT' },
      actionId: randomUUID(),
      clientTimestamp: now,
    });
    const result = execute(s, r.id, command, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.realms.a.ap).toBe(6);
  });
  it('conserve les modes pendant une reconnexion de la même page, les désactive pour une nouvelle', () => {
    const r = createRealm('a', 'Observateur', 'ASH', { q: 0, r: 0 }, now);
    const page = randomUUID();
    beginCodeSession(r, page);
    r.unlimitedAP = r.capitalRadar = true;
    const saved = JSON.parse(JSON.stringify(r));
    expect(beginCodeSession(saved, page)).toBe(false);
    expect(saved.unlimitedAP).toBe(true);
    expect(saved.capitalRadar).toBe(true);
    expect(beginCodeSession(saved, randomUUID())).toBe(true);
    expect(saved.unlimitedAP).toBe(false);
    expect(saved.capitalRadar).toBe(false);
  });
  it.each([undefined, null, '', 'invalid', {}, 42])(
    'les anciens clients et identifiants invalides démarrent OFF (%s)',
    (id) => {
      const r = createRealm('a', 'Observateur', 'ASH', { q: 0, r: 0 }, now);
      r.unlimitedAP = r.capitalRadar = true;
      beginCodeSession(r, id);
      expect(r.unlimitedAP).toBe(false);
      expect(r.capitalRadar).toBe(false);
    },
  );
});
