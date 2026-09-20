import { randomUUID } from 'node:crypto';
import { it, expect } from 'vitest';
import { createState, createRealm, key, vision } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, worldView, execute } from '../apps/server/src/engine';
import { toggleVigie, setVigieTarget } from '../apps/server/src/vigie';
import { beginCodeSession } from '../apps/server/src/code-session';
import { actionSchema } from '@voidmarch/protocol';
const now = 1900000000000;
function fixture() {
  const s = createState('vigie', now),
    r = addPlayer(s, 'a', 'Observateur', 'ASH', now);
  s.realms.b = createRealm('b', 'Adversaire', 'IRON', { q: 100, r: 100 }, now);
  const b = addBuilding(s, s.realms.b, { q: 100, r: 100 }, 'VILLAGE', now);
  return { s, r, b };
}
it('observe uniquement après activation sans acquérir la vision ni l’exploration du royaume adverse', () => {
  const { s, r, b } = fixture();
  const explored = structuredClone(r.explored);
  expect(() => setVigieTarget(s, r.id, 'b')).toThrow();
  expect(worldView(s, r.id, now).tiles.some((t) => t.building?.id === b.id)).toBe(false);
  toggleVigie(s, r.id);
  expect(setVigieTarget(s, r.id, 'b')).toEqual({ q: 100, r: 100 });
  expect(worldView(s, r.id, now).tiles.find((t) => t.building?.id === b.id)?.visibility).toBe(
    'VISIBLE',
  );
  expect(vision(s, r).has(key(b))).toBe(false);
  expect(r.explored).toEqual(explored);
  expect(setVigieTarget(s, r.id, null)).toEqual(r.capital);
  expect(worldView(s, r.id, now).tiles.some((t) => t.building?.id === b.id)).toBe(false);
});
it('interdit les ordres pendant l’observation et rétablit le brouillard au rechargement', () => {
  const { s, r, b } = fixture();
  const page = randomUUID();
  beginCodeSession(r, page);
  toggleVigie(s, r.id);
  setVigieTarget(s, r.id, 'b');
  const command = actionSchema.parse({
    type: 'RECRUIT',
    actorId: Object.values(s.buildings).find((b) => b.ownerId === r.id)!.id,
    payload: { kind: 'PEASANT' },
    actionId: randomUUID(),
    clientTimestamp: now,
  });
  expect(execute(s, r.id, command, now).result.reason).toContain('observation');
  beginCodeSession(r, page);
  expect(r.vigieTargetId).toBe('b');
  beginCodeSession(r, randomUUID());
  expect(r.vigie).toBe(false);
  expect(r.vigieTargetId).toBeUndefined();
  expect(worldView(s, r.id, now).tiles.some((t) => t.building?.id === b.id)).toBe(false);
});
it('rejette les royaumes absents et défaits, ne révèle rien aux autres joueurs', () => {
  const { s, r } = fixture();
  toggleVigie(s, r.id);
  expect(() => setVigieTarget(s, r.id, 'absent')).toThrow();
  s.realms.b.defeatedAt = now;
  expect(() => setVigieTarget(s, r.id, 'b')).toThrow();
  expect(worldView(s, 'b', now).player.vigie).toBeUndefined();
});
