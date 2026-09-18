import { tickStrategy } from './strategy';
import { wallBlocks, alliedRealmIds } from '@voidmarch/game-rules';
import { formatNumber, RESOURCE_NAMES, type Resource } from '@voidmarch/config';
import { randomUUID } from 'node:crypto';
import { RULES } from '@voidmarch/config';
import {
  accrueEconomy,
  disk,
  distance,
  findPath,
  hash,
  key,
  observe,
  realmBuildings,
  refreshAP,
  tileAt,
  transfer,
  writeTile,
} from '@voidmarch/game-rules';
import type { GameState, Hex, WorldEvent } from '@voidmarch/shared';
import { BotDirector } from './bots.js';
import { tickNpcs } from './npcs.js';
import { archive, defaultOptions, log, type EngineOptions } from './engine.js';
export function initialEvents(s: GameState, now: number) {
  if (tileAt(s, { q: 7, r: -3 }).terrain === 'SCORCHED') return;
  const id = randomUUID();
  s.events[id] = {
    id,
    q: 7,
    r: -3,
    kind: 'MONOLITH',
    title: 'Le Monolithe de Veille',
    description:
      'Une ligne de lumière traverse la pierre sans joint. Quelque chose, dessous, vous a entendu.',
    startsAt: now,
    endsAt: now + 7 * 86_400_000,
    global: false,
    reward: { GOLD: 80, IRON: 30 },
    relic: 'Éclat du Monolithe',
  };
  writeTile(s, s.events[id], { terrain: 'ALIEN', poi: 'MYTHIC' });
}
const eventTypes: Pick<WorldEvent, 'kind' | 'title' | 'description' | 'reward' | 'relic'>[] = [
  {
    kind: 'METEOR',
    title: 'La chute d’une étoile',
    description: 'Du verre noir fume au creux d’un cratère. Les prospecteurs se mettent en route.',
    reward: { IRON: 90, GOLD: 45 },
    relic: 'Fer céleste',
  },
  {
    kind: 'FORTRESS',
    title: 'La forteresse sans nom',
    description:
      'Une citadelle émerge de la brume. Ses couloirs semblent plus vastes que la colline qui les porte.',
    reward: { GOLD: 120, WOOD: 70 },
  },
  {
    kind: 'RED_MOON',
    title: 'La lune de sang',
    description:
      'Les cloches sonnent sans mains pour les mouvoir. Un fragment attend ses découvreurs.',
    reward: { GOLD: 70 },
    relic: 'Sceau de la lune rouge',
  },
  {
    kind: 'MIST',
    title: 'La brume inversée',
    description:
      'La pluie remonte vers le ciel. Des voix inconnues répondent dans les postes de radio éteints.',
    reward: { FOOD: 100, GOLD: 35 },
  },
  {
    kind: 'PORTAL',
    title: 'La Porte Aveugle',
    description: 'À travers l’arche, les étoiles ne sont pas les nôtres.',
    reward: { GOLD: 110, IRON: 35 },
    relic: 'Clé du ciel absent',
  },
  {
    kind: 'COLOSSUS',
    title: 'Le réveil du Colosse',
    description:
      'Les collines se soulèvent au rythme d’une respiration. Les instruments indiquent une profondeur impossible.',
    reward: { IRON: 150 },
    relic: 'Cœur du Colosse',
  },
  {
    kind: 'ROYAL_CARAVAN',
    title: 'La caravane royale',
    description: 'Une caravane de royaumes lointains cherche un protecteur.',
    reward: { GOLD: 100, FOOD: 65 },
  },
];
export function tickWorld(
  s: GameState,
  now: number,
  connected: Set<string>,
  options: EngineOptions = defaultOptions,
) {
  const humans = connected.size;
  for (const r of Object.values(s.realms)) {
    const present = r.bot ? humans > 0 : connected.has(r.id);
    // Settle only the prior presence interval before extending a live session.
    accrueEconomy(s, r, now, options.grace);
    refreshAP(r, now, options.apInterval);
    if (present) {
      r.lastSeen = now;
      r.offlineAt = undefined;
    } else if (!r.offlineAt && r.lastSeen + options.grace <= now) {
      r.offlineAt = r.lastSeen + options.grace;
      s.archives[r.id] = archive(s, r, now);
    }
  }
  tickStrategy(s, now, connected);
  new BotDirector(options).tick(s, now, humans);
  tickNpcs(s, now, connected);
  for (const p of Object.values(s.proposals))
    if (p.status === 'PENDING' && p.expiresAt <= now) p.status = 'EXPIRED';
  for (const c of Object.values(s.caravans)) {
    if (c.delivery) {
      const nextStep = Math.min(
        c.path.length - 1,
        Math.floor(((now - c.startedAt) / (c.arrivesAt - c.startedAt)) * c.path.length),
      );
      const currentStep = c.path.findIndex((p) => p.q === c.q && p.r === c.r);
      const allowed = [
        c.partnerId,
        ...alliedRealmIds(s, c.ownerId),
        ...alliedRealmIds(s, c.partnerId),
      ];
      const interrupted = c.path.slice(Math.max(0, currentStep), nextStep + 1).some((p) => {
        const t = tileAt(s, p);
        return (
          !t.road || wallBlocks(s.buildings[t.buildingId ?? ''], c.ownerId, undefined, allowed)
        );
      });
      if (interrupted) {
        if (s.realms[c.ownerId]) transfer(s.realms[c.ownerId].wallet, c.cargo);
        log(
          s,
          'Route interrompue : la caravane retourne sa cargaison à son expéditeur.',
          'ECONOMY',
          now,
          [c.ownerId, c.partnerId],
          c,
        );
        delete s.caravans[c.id];
        continue;
      }
    }
    const step = Math.min(
      c.path.length - 1,
      Math.floor(((now - c.startedAt) / (c.arrivesAt - c.startedAt)) * c.path.length),
    );
    const position = c.path[Math.max(0, step)];
    c.q = position.q;
    c.r = position.r;
    if (now >= c.arrivesAt) {
      const owner = s.realms[c.ownerId],
        partner = s.realms[c.partnerId];
      if (owner && !owner.defeatedAt && partner && !partner.defeatedAt) {
        if (!c.delivery) transfer(owner.wallet, c.cargo);
        transfer(partner.wallet, c.cargo);
        owner.progression.commerce += c.cargo.GOLD;
        partner.progression.commerce += c.cargo.GOLD;
        log(
          s,
          c.delivery
            ? `Livraison arrivée : ${Object.entries(c.cargo)
                .filter(([, v]) => v > 0)
                .map(
                  ([k, v]) => `${formatNumber(v)} ${RESOURCE_NAMES[k as Resource].toLowerCase()}`,
                )
                .join(' · ')} pour ${partner.name}.`
            : `Une caravane est arrivée : +${formatNumber(c.cargo.GOLD ?? 0)} or pour chaque partenaire.`,
          'ECONOMY',
          now,
          [owner.id, partner.id],
          c.to,
        );
      }
      delete s.caravans[c.id];
    }
  }
  if (humans > 0) {
    for (const t of Object.values(s.treaties).filter(
      (t) => t.kind === 'TRADE' && !t.physicalTrade && t.endsAt > now && t.nextCaravanAt <= now,
    )) {
      t.nextCaravanAt = now + 180_000;
      const a = s.realms[t.a],
        b = s.realms[t.b];
      if (!a || !b || a.defeatedAt || b.defeatedAt) continue;
      const start = realmBuildings(s, a.id).find((x) => x.kind === 'MARKET'),
        end = realmBuildings(s, b.id).find((x) => x.kind === 'MARKET');
      if (!start || !end) continue;
      const path = findPath(
        start,
        end,
        (p) => {
          const tile = tileAt(s, p);
          return tile.road && (tile.ownerId === a.id || tile.ownerId === b.id || !tile.ownerId)
            ? tile
            : undefined;
        },
        100,
      );
      if (path?.length) {
        const id = randomUUID();
        s.caravans[id] = {
          id,
          q: start.q,
          r: start.r,
          ownerId: a.id,
          partnerId: b.id,
          from: { q: start.q, r: start.r },
          to: { q: end.q, r: end.r },
          path: [{ q: start.q, r: start.r }, ...path],
          startedAt: now,
          arrivesAt: now + path.length * 15_000,
          cargo: { STONE: 0, GOLD: 25 + path.length, WOOD: 0, IRON: 0, FOOD: 0 },
          treatyId: t.id,
        };
      }
    }
    if (s.nextEventAt <= now) {
      const realms = Object.values(s.realms).filter((r) => connected.has(r.id) && !r.defeatedAt);
      if (realms.length) {
        const r = realms[Math.floor(hash(String(now)) * realms.length)],
          places = disk(r.capital, 12).filter(
            (p) =>
              distance(p, r.capital) > 6 &&
              !tileAt(s, p).buildingId &&
              tileAt(s, p).terrain !== 'SCORCHED',
          ),
          p = places[Math.floor(hash(`${now}:p`) * places.length)],
          event = eventTypes[Math.floor(hash(`${now}:e`) * eventTypes.length)],
          id = randomUUID();
        if (p) {
          s.events[id] = {
            ...event,
            ...p,
            id,
            startsAt: now,
            endsAt: now + 3_600_000,
            global: event.kind !== 'PORTAL',
          };
          if (event.kind === 'COLOSSUS')
            for (const near of disk(p, 1))
              if (!tileAt(s, near).buildingId && tileAt(s, near).terrain !== 'SCORCHED')
                writeTile(s, near, { terrain: 'CORRUPTION' });
          log(s, event.title, 'WORLD', now, undefined, event.kind === 'PORTAL' ? p : undefined);
        }
      }
      s.nextEventAt = now + 900_000 + hash(String(now)) * 600_000;
    }
  }
  for (const r of Object.values(s.realms))
    if (connected.has(r.id) || (r.bot && humans > 0)) observe(s, r, now);
  s.revision++;
}
