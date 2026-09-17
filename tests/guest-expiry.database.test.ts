import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { RULES } from '@voidmarch/config';
import { createState } from '@voidmarch/game-rules';
import { prisma } from '../apps/server/src/repository';
import { addPlayer } from '../apps/server/src/engine';
import { expireGuests } from '../apps/server/src/guests';

// Run only against a disposable database; this exercises the real account deletion query.
describe.skipIf(process.env.TEST_GUEST_DATABASE !== 'true')(
  'expiration transactionnelle des invités',
  () => {
    const ids: string[] = [];
    afterAll(async () => {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    });
    it('supprime uniquement un invité absent depuis 24 h, avec ses sessions, et conserve les comptes enregistrés', async () => {
      const now = Date.now(),
        old = new Date(now - RULES.guestLifetime - 1000);
      const s = createState('guest-expiry-test', now);
      const create = async (passwordHash: string | null, lastSeen: number) => {
        const id = randomUUID();
        ids.push(id);
        await prisma.user.create({
          data: {
            id,
            username: id,
            usernameNormalized: id,
            passwordHash,
            createdAt: old,
            lastLoginAt: old,
          },
        });
        await prisma.session.create({
          data: { userId: id, refreshHash: randomUUID(), expiresAt: new Date(now + 86400000) },
        });
        const r = addPlayer(s, id, 'Test', 'ASH', old.getTime());
        r.lastSeen = lastSeen;
        return id;
      };
      const expired = await create(null, old.getTime());
      const registered = await create('registered-hash', old.getTime());
      const recent = await create(null, now - 60000);
      const connected = await create(null, old.getTime());
      await prisma.$transaction((tx) => expireGuests(s, tx, now, new Set([connected])));
      expect(await prisma.user.findUnique({ where: { id: expired } })).toBeNull();
      expect(await prisma.session.count({ where: { userId: expired } })).toBe(0);
      expect(s.realms[expired]).toBeUndefined();
      for (const id of [registered, recent, connected]) {
        expect(await prisma.user.findUnique({ where: { id } })).not.toBeNull();
        expect(s.realms[id]).toBeDefined();
      }
    });
  },
);
