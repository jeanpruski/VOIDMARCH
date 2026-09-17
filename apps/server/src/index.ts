import Fastify from 'fastify';
import { expireGuests } from './guests';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { actionSchema, chunksSchema, settingsSchema } from '@voidmarch/protocol';
import { DEFAULT_SETTINGS, RULES, type Faction } from '@voidmarch/config';
import { accrueEconomy, chunkOf, disk, key, observe } from '@voidmarch/game-rules';
import type { Hex, WorldView } from '@voidmarch/shared';
import { addPlayer, archive, defaultOptions, RuleError, worldView } from './engine.js';
import { WorldRepository, prisma } from './repository.js';
import { identity, registerAuth, type Identity } from './auth.js';
import { tickWorld } from './simulation.js';
const options = {
  ...defaultOptions,
  apInterval: Number(process.env.AP_INTERVAL_MS ?? RULES.apInterval),
  grace: Number(process.env.DISCONNECT_GRACE_MS ?? RULES.grace),
  botInterval: Number(process.env.BOT_INTERVAL_MS ?? RULES.botInterval),
  offlineProtection: process.env.OFFLINE_PROTECTION === 'true',
};
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32)
  throw new Error('JWT_SECRET doit contenir au moins 32 caractères. Exécutez npm run setup.');
const app = Fastify({ logger: true, bodyLimit: 64 * 1024 });
const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173').split(
  ',',
);
await app.register(cors, { origin: origins, credentials: true });
await app.register(cookie);
await app.register(jwt, { secret });
await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError)
    return reply.code(400).send({ error: error.issues[0]?.message ?? 'Données invalides.' });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    return reply.code(409).send({ error: 'Ce nom ou cette adresse est déjà utilisé.' });
  if (error instanceof RuleError) return reply.code(400).send({ error: error.message });
  const e = error as Error & { statusCode?: number };
  request.log.error(e);
  return reply.code(e.statusCode ?? 500).send({
    error:
      e.statusCode && e.statusCode < 500
        ? e.message
        : 'Le serveur n’a pas pu traiter cette demande.',
  });
});
const io = new Server(app.server, {
  cors: { origin: origins, credentials: true },
  maxHttpBufferSize: 64 * 1024,
  pingInterval: 25000,
  pingTimeout: 20000,
});
let redisClients: ReturnType<typeof createClient>[] = [];
if (process.env.REDIS_URL) {
  const pub = createClient({ url: process.env.REDIS_URL }),
    sub = pub.duplicate();
  pub.on('error', (err) => app.log.error(err));
  sub.on('error', (err) => app.log.error(err));
  await Promise.all([pub.connect(), sub.connect()]);
  io.adapter(createAdapter(pub, sub));
  redisClients = [pub, sub];
}
// Redis distributes messages only. The database advisory lock guards every world mutation.
const repository = new WorldRepository(options);
await repository.init();
const connections = new Map<string, Set<string>>(),
  subscriptions = new Map<string, Hex[]>(),
  socketRates = new Map<string, { tokens: number; at: number }>();
const lastViews = new Map<string, WorldView>();
let shuttingDown = false,
  busy = false;
let nextGuestCleanup = 0;
const connected = () => new Set([...connections].filter(([, s]) => s.size > 0).map(([id]) => id));
await registerAuth(app, (userId) => {
  io.in(`player:${userId}`).disconnectSockets(true);
});
app.get('/api/health', async () => ({
  status: 'ok',
  world: 'main',
  revision: repository.state.revision,
  storage: 'postgresql',
  botsAwake: connected().size > 0,
}));
app.patch('/api/settings', async (request) => {
  const who = await identity(request),
    settings = settingsSchema.parse(request.body);
  await repository.mutate(async (s, tx) => {
    const r = s.realms[who.sub];
    if (!r) throw new RuleError('Royaume introuvable.');
    r.settings = { ...r.settings, ...settings };
    await tx.user.update({ where: { id: who.sub }, data: { settings: r.settings } });
  });
  broadcast();
  return { settings: repository.state.realms[who.sub].settings };
});
io.use(async (socket, next) => {
  try {
    const claims = app.jwt.verify<Identity>(String(socket.handshake.auth.token ?? '')),
      session = await prisma.session.findUnique({ where: { id: claims.sid } });
    if (!session || session.userId !== claims.sub || session.expiresAt < new Date())
      return next(new Error('Session expirée.'));
    socket.data.identity = claims;
    next();
  } catch {
    next(new Error('Authentification requise.'));
  }
});
function rate(userId: string) {
  const now = Date.now(),
    r = socketRates.get(userId) ?? { tokens: 30, at: now };
  r.tokens = Math.min(30, r.tokens + ((now - r.at) / 1000) * 3);
  r.at = now;
  r.tokens--;
  socketRates.set(userId, r);
  return r.tokens >= 0;
}
function sendView(socket: import('socket.io').Socket, view: WorldView) {
  const previous = lastViews.get(socket.id),
    oldTiles = new Map(previous?.tiles.map((t) => [key(t), JSON.stringify(t)]));
  const chunks = new Map<
    string,
    { q: number; r: number; tiles: WorldView['tiles']; units: WorldView['units'] }
  >();
  for (const tile of view.tiles) {
    const c = chunkOf(tile),
      k = key(c);
    if (!chunks.has(k)) chunks.set(k, { ...c, tiles: [], units: [] });
    if (!previous || oldTiles.get(key(tile)) !== JSON.stringify(tile))
      chunks.get(k)!.tiles.push(tile);
  }
  for (const unit of view.units) {
    const c = chunkOf(unit),
      chunk = chunks.get(key(c));
    if (chunk) chunk.units.push(unit);
  }
  for (const chunk of chunks.values())
    socket.emit(previous ? 'chunk:patch' : 'chunk:snapshot', {
      ...chunk,
      revision: view.revision,
      serverTimestamp: view.serverTimestamp,
      unitsReplace: true,
    });
  const oldEvents = new Set(previous?.events.map((e) => e.id));
  for (const event of view.events) if (!oldEvents.has(event.id)) socket.emit('world:event', event);
  socket.emit('world:snapshot', view);
  socket.emit('player:state', view.player);
  lastViews.set(socket.id, view);
}
function broadcast() {
  for (const socket of io.sockets.sockets.values()) {
    const who = socket.data.identity as Identity;
    if (!repository.state.realms[who.sub] || !subscriptions.has(socket.id)) continue;
    sendView(
      socket,
      worldView(repository.state, who.sub, Date.now(), subscriptions.get(socket.id)),
    );
  }
}

io.on('connection', (socket) => {
  const who = socket.data.identity as Identity;
  const guarded = (fn: () => Promise<void>) => {
    void fn().catch((err) => {
      app.log.error(err);
      socket.emit('server:error', {
        message:
          err instanceof RuleError ? err.message : 'L’ordre n’a pas pu être enregistré. Réessayez.',
      });
    });
  };
  socket.on('world:join', () =>
    guarded(async () => {
      if (!rate(who.sub)) return;
      const user = await prisma.user.findUnique({ where: { id: who.sub } });
      if (!user) {
        socket.disconnect(true);
        return;
      }
      await repository.mutate((s) => {
        const r = addPlayer(s, user.id, user.username, user.faction as Faction, Date.now());
        accrueEconomy(s, r, Date.now(), options.grace);
        r.lastSeen = Date.now();
        r.offlineAt = undefined;
        r.name = user.username;
        r.settings = { ...DEFAULT_SETTINGS, ...r.settings, ...(user.settings as object) };
        observe(s, r, Date.now());
      });
      if (!socket.connected) return;
      const set = connections.get(who.sub) ?? new Set();
      set.add(socket.id);
      connections.set(who.sub, set);
      await socket.join(['world:main', `player:${who.sub}`]);
      const r = repository.state.realms[who.sub],
        chunks = [
          ...new Map(
            disk(r.capital, 14).map((p) => {
              const c = chunkOf(p);
              return [key(c), c];
            }),
          ).values(),
        ];
      subscriptions.set(socket.id, chunks);
      for (const c of chunks) await socket.join(`chunk:${c.q}:${c.r}`);
      socket.emit('presence:update', { status: 'ONLINE' });
      broadcast();
    }),
  );
  socket.on('chunks:subscribe', (raw: unknown) =>
    guarded(async () => {
      if (!rate(who.sub)) return;
      const parsed = chunksSchema.safeParse(raw);
      if (!parsed.success) return;
      const previous = subscriptions.get(socket.id) ?? [];
      for (const c of previous) await socket.leave(`chunk:${c.q}:${c.r}`);
      subscriptions.set(socket.id, parsed.data.chunks);
      for (const c of parsed.data.chunks) await socket.join(`chunk:${c.q}:${c.r}`);
      if (repository.state.realms[who.sub]) {
        lastViews.delete(socket.id);
        sendView(socket, worldView(repository.state, who.sub, Date.now(), parsed.data.chunks));
      }
    }),
  );
  socket.on('world:sync', () => {
    if (!rate(who.sub) || !subscriptions.has(socket.id) || !repository.state.realms[who.sub])
      return;
    sendView(
      socket,
      worldView(repository.state, who.sub, Date.now(), subscriptions.get(socket.id)),
    );
  });
  socket.on('player:ping', () => {
    if (!rate(who.sub)) return;
    socket.emit('presence:update', { status: 'ONLINE', serverTimestamp: Date.now() });
  });
  socket.on('player:action', (raw: unknown, ack?: unknown) =>
    guarded(async () => {
      const reply = (result: unknown) => {
        socket.emit('action:result', result);
        if (typeof ack === 'function') ack(result);
      };
      if (!rate(who.sub))
        return reply({ accepted: false, reason: 'Trop d’ordres. Patientez un instant.' });
      if (who.exp * 1000 <= Date.now())
        return reply({ accepted: false, reason: 'Session expirée. Reconnexion en cours.' });
      const parsed = actionSchema.safeParse(raw);
      if (!parsed.success) return reply({ accepted: false, reason: 'Ordre invalide.' });
      if (!subscriptions.has(socket.id))
        return reply({ accepted: false, reason: 'Rejoignez le monde avant d’agir.' });
      const result = await repository.action(who.sub, parsed.data);
      reply(result);
      broadcast();
    }),
  );
  socket.on('disconnect', () => {
    connections.get(who.sub)?.delete(socket.id);
    subscriptions.delete(socket.id);
    lastViews.delete(socket.id);
  });
});
const tick = setInterval(() => {
  if (busy || shuttingDown) return;
  busy = true;
  void repository
    .mutate(async (s, tx) => {
      const now = Date.now();
      if (now >= nextGuestCleanup) {
        await expireGuests(s, tx, now, connected());
        nextGuestCleanup = now + 60000;
      }
      tickWorld(s, now, connected(), options);
    })
    .then(broadcast)
    .catch((err) => app.log.error(err))
    .finally(() => {
      busy = false;
    });
}, 5000);
await repository.mutate(async (s, tx) => {
  const now = Date.now();
  if (now >= nextGuestCleanup) {
    await expireGuests(s, tx, now, connected());
    nextGuestCleanup = now + 60000;
  }
  tickWorld(s, now, connected(), options);
});
app.post(
  '/api/admin/unlimited-ap',
  { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
  async (request, reply) => {
    const who = await identity(request);
    const body = request.body as { code?: unknown } | null;
    if (body?.code !== (process.env.ADMIN_AP_CODE || 'ytreza'))
      return reply.code(403).send({ error: 'Code incorrect.' });
    const enabled = await repository.mutate((s) => {
      const r = s.realms[who.sub];
      if (!r) throw new Error('Rejoignez le monde avant d’activer le code.');
      r.unlimitedAP = !r.unlimitedAP;
      s.revision++;
      return r.unlimitedAP;
    });
    broadcast();
    return { enabled };
  },
);
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
if (existsSync(dist)) {
  await app.register(fastifyStatic, { root: dist });
  app.setNotFoundHandler((request, reply) =>
    request.url.startsWith('/api/')
      ? reply.code(404).send({ error: 'Route inconnue.' })
      : reply.sendFile('index.html'),
  );
}
app.addHook('onClose', async () => {
  clearInterval(tick);
  for (const client of redisClients) await client.quit();
  await prisma.$disconnect();
});
await app.listen({ port: Number(process.env.PORT ?? 3001), host: process.env.HOST ?? '127.0.0.1' });
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(tick);
  try {
    await repository.mutate((s) => {
      const now = Date.now();
      for (const r of Object.values(s.realms)) {
        accrueEconomy(s, r, now, options.grace);
        r.offlineAt = now;
        if (!r.bot) s.archives[r.id] = archive(s, r, now);
      }
    });
  } finally {
    io.disconnectSockets(true);
    await app.close();
    process.exit(0);
  }
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
