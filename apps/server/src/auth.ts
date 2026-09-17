import { randomHeroAppearance } from '@voidmarch/config';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authSchema, guestSchema } from '@voidmarch/protocol';
import { prisma } from './repository.js';
import type { User } from '@prisma/client';
const scrypt = promisify(scryptCallback),
  digest = (s: string) => createHash('sha256').update(s).digest('hex');
const normalize = (s: string) => s.normalize('NFKC').toLocaleLowerCase('fr');
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
async function passwordMatches(password: string, encoded: string) {
  const [salt, expected] = encoded.split(':');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return expected?.length === 128 && timingSafeEqual(hash, Buffer.from(expected, 'hex'));
}
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 30 * 86400,
};
export type Identity = { sub: string; sid: string; exp: number };
export async function identity(request: FastifyRequest) {
  const claims = await request.jwtVerify<Identity>();
  const session = await prisma.session.findUnique({ where: { id: claims.sid } });
  if (!session || session.userId !== claims.sub || session.expiresAt < new Date())
    throw Object.assign(new Error('Session expirée.'), { statusCode: 401 });
  return claims;
}
export async function registerAuth(app: FastifyInstance, onLogout: (userId: string) => void) {
  const sendSession = async (user: User, reply: FastifyReply) => {
    const refresh = randomBytes(48).toString('base64url'),
      session = await prisma.session.create({
        data: {
          userId: user.id,
          refreshHash: digest(refresh),
          expiresAt: new Date(Date.now() + 30 * 86400_000),
        },
      });
    reply.setCookie('vm_refresh', refresh, cookieOptions);
    return {
      token: app.jwt.sign({ sub: user.id, sid: session.id }, { expiresIn: '10m' }),
      user: { id: user.id, username: user.username, guest: !user.passwordHash },
    };
  };
  app.post(
    '/api/auth/guest',
    { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const data = guestSchema.parse(request.body);
      const user = await prisma.user.create({
        data: {
          username: data.username,
          usernameNormalized: normalize(data.username),
          faction: data.faction,
          settings: JSON.parse(JSON.stringify({ heroAppearance: randomHeroAppearance() })),
        },
      });
      return sendSession(user, reply);
    },
  );
  app.post(
    '/api/auth/register',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const data = authSchema.parse(request.body),
        hash = await passwordHash(data.password);
      let current: string | undefined;
      if (request.headers.authorization) {
        const who = await identity(request),
          user = await prisma.user.findUnique({ where: { id: who.sub } });
        if (user && !user.passwordHash) current = user.id;
        else throw Object.assign(new Error('Ce compte est déjà enregistré.'), { statusCode: 400 });
      }
      const fields = {
        lastLoginAt: new Date(),
        username: data.username,
        usernameNormalized: normalize(data.username),
        email: data.email?.toLowerCase(),
        passwordHash: hash,
        faction: data.faction,
      };
      const user = current
        ? await prisma.user.update({ where: { id: current }, data: fields })
        : await prisma.user.create({
            data: {
              ...fields,
              settings: JSON.parse(
                JSON.stringify({ heroAppearance: data.heroAppearance ?? randomHeroAppearance() }),
              ),
            },
          });
      return sendSession(user, reply);
    },
  );
  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const data = authSchema.pick({ username: true, password: true }).parse(request.body),
        user = await prisma.user.findUnique({
          where: { usernameNormalized: normalize(data.username) },
        });
      if (!user?.passwordHash || !(await passwordMatches(data.password, user.passwordHash)))
        return reply.code(401).send({ error: 'Nom ou mot de passe incorrect.' });
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return sendSession(user, reply);
    },
  );
  app.post('/api/auth/refresh', async (request, reply) => {
    const refresh = request.cookies.vm_refresh;
    if (!refresh)
      return reply.code(401).send({ error: 'Connectez-vous pour entrer dans les Marches.' });
    const next = randomBytes(48).toString('base64url');
    const session = await prisma.$transaction(async (tx) => {
      const existing = await tx.session.findUnique({
        where: { refreshHash: digest(refresh) },
        include: { user: true },
      });
      if (!existing || existing.expiresAt < new Date()) return null;
      const changed = await tx.session.updateMany({
        where: { id: existing.id, refreshHash: digest(refresh) },
        data: { refreshHash: digest(next) },
      });
      return changed.count ? existing : null;
    });
    if (!session) {
      reply.clearCookie('vm_refresh', { path: '/api/auth' });
      return reply.code(401).send({ error: 'Session expirée.' });
    }
    reply.setCookie('vm_refresh', next, cookieOptions);
    return {
      token: app.jwt.sign({ sub: session.userId, sid: session.id }, { expiresIn: '10m' }),
      user: {
        id: session.userId,
        username: session.user.username,
        guest: !session.user.passwordHash,
      },
    };
  });
  app.post('/api/auth/logout', async (request, reply) => {
    const who = await identity(request);
    await prisma.session.deleteMany({ where: { id: who.sid, userId: who.sub } });
    reply.clearCookie('vm_refresh', { path: '/api/auth' });
    onLogout(who.sub);
    return { ok: true };
  });
}
