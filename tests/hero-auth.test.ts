import { beforeEach, describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { randomHeroAppearance } from '@voidmarch/config';
const db = vi.hoisted(() => ({
  user: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  session: { create: vi.fn(), findUnique: vi.fn() },
}));
vi.mock('../apps/server/src/repository.js', () => ({ prisma: db }));
import { registerAuth } from '../apps/server/src/auth';
async function app() {
  const a = Fastify();
  await a.register(jwt, { secret: 'hero-auth-test-secret-only' });
  await a.register(cookie);
  await registerAuth(a, () => {});
  return a;
}
beforeEach(() => {
  vi.resetAllMocks();
  db.user.create.mockImplementation(async ({ data }) => ({ id: 'new', ...data }));
  db.session.create.mockResolvedValue({ id: 'session' });
});
const registration = { username: 'HerosTest', password: 'UnMotDePasseTest42', faction: 'ASH' };
describe('identité cosmétique du compte', () => {
  it('enregistre définitivement la personnalisation choisie à l’inscription', async () => {
    const a = await app(),
      appearance = randomHeroAppearance(() => 0.2);
    try {
      const response = await a.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { ...registration, heroAppearance: appearance },
      });
      expect(response.statusCode, response.body).toBe(200);
      expect(db.user.create.mock.calls[0][0].data.settings.heroAppearance).toEqual(appearance);
    } finally {
      await a.close();
    }
  });
  it('génère le héros invité côté serveur même si le client fournit une apparence', async () => {
    const a = await app();
    try {
      const response = await a.inject({
        method: 'POST',
        url: '/api/auth/guest',
        payload: { username: 'VisiteurTest', faction: 'ASH', heroAppearance: { invalid: true } },
      });
      expect(response.statusCode, response.body).toBe(200);
      expect(
        db.user.create.mock.calls[0][0].data.settings.heroAppearance.head,
      ).toBeGreaterThanOrEqual(0);
    } finally {
      await a.close();
    }
  });
  it('conserve le héros invité lors de la conversion, même si une autre apparence est envoyée', async () => {
    const original = randomHeroAppearance(() => 0.1);
    let user = {
      id: 'guest',
      username: 'Invite',
      passwordHash: null,
      settings: { heroAppearance: original },
    };
    db.user.findUnique.mockResolvedValue(user);
    db.user.update.mockImplementation(async ({ data }) => {
      user = { ...user, ...data };
      return user;
    });
    db.session.findUnique.mockResolvedValue({
      id: 'session',
      userId: 'guest',
      expiresAt: new Date(Date.now() + 60000),
    });
    const a = await app();
    try {
      const response = await a.inject({
        method: 'POST',
        url: '/api/auth/register',
        headers: { authorization: `Bearer ${a.jwt.sign({ sub: 'guest', sid: 'session' })}` },
        payload: { ...registration, heroAppearance: randomHeroAppearance(() => 0.9) },
      });
      expect(response.statusCode, response.body).toBe(200);
      expect(user.settings.heroAppearance).toEqual(original);
      expect(db.user.create).not.toHaveBeenCalled();
    } finally {
      await a.close();
    }
  });
  it('rejette une apparence hors catalogue avant de créer le compte', async () => {
    const a = await app();
    try {
      const response = await a.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { ...registration, heroAppearance: { ...randomHeroAppearance(), head: 999 } },
      });
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(db.user.create).not.toHaveBeenCalled();
    } finally {
      await a.close();
    }
  });
});
