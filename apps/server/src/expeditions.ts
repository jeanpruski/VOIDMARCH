import { placementOrder, completedExpeditionSites } from './mission-placement';
import { exceptionalOfferIndex } from './exceptional-missions';
import { developmentStage, EXPEDITION_GOLD, expeditionSearchCost } from '@voidmarch/config';
import { expeditionHabitatMatches } from './expedition-habitats';
import { randomUUID } from 'node:crypto';
import {
  EXPEDITION_SITES,
  UNIT_PROFILES,
  UNITS,
  isSea,
  RESOURCE_NAMES,
  formatNumber,
  type Wallet,
} from '@voidmarch/config';
import {
  expeditionFootprint,
  expeditionDistance,
  alliedRealmIds,
  disk,
  distance,
  hash,
  key,
  neighbors,
  movementCost,
  tileAt,
  vision,
  wallBlocks,
  transfer,
  realmBuildings,
} from '@voidmarch/game-rules';
import type { GameState, Hex, MissionOffer, ActiveMission, Unit } from '@voidmarch/shared';
import { requireRule, log } from './engine';
import { createMissionTrophy } from './mission-trophies';

const MODES = ['RECON', 'RECOVER', 'EXTRACT'] as const;

type Position = Hex & { orientation: number };
type PlannedOffer = { offer: MissionOffer; position: Position };
type Survey = { world: string; realmId: string; at: number; plans: PlannedOffer[] };
// Coordinates never leave this server cache until acceptance. Keep surveys across immutable state copies.
const surveys = new Map<string, Survey>();
const worldIdentity = (s: GameState, id: string) =>
  `${s.seed}:${s.createdAt}:${s.realms[id].createdAt}`;
export function expeditionOffers(s: GameState, id: string, now: number): MissionOffer[] {
  const board = s.missions?.[id],
    r = s.realms[id];
  if (!r || board?.active || (board?.availableAt ?? 0) > now) return [];
  const anchor = Math.max(r.createdAt, board?.lastResult?.at ?? 0);
  const slot = Math.floor(Math.max(0, now - anchor) / 600000);
  const baseLevel = developmentStage(realmBuildings(s, id));
  const exceptionalIndex = exceptionalOfferIndex(
    `${worldIdentity(s, id)}:${id}:expedition:${board?.generation ?? 0}:${anchor}:${slot}`,
    [baseLevel, baseLevel, baseLevel],
  );
  const completed = completedExpeditionSites(s, id);
  const ctx = searchContext(s, id);
  const seed = `${worldIdentity(s, id)}:${id}:${key(r.capital)}:adventure:${board?.generation ?? 0}:${anchor}:${slot}:${baseLevel}:${ctx.ships.length > 0}:${[...completed].sort().join(',')}`;
  let survey = surveys.get(seed);
  if (!survey || (!survey.plans.length && now - survey.at >= 30000)) {
    const surveyed = surveySites(s, id, seed, ctx);
    const fresh = surveyed.filter((x) => !completed.has(x.site.id));
    const available = fresh.length ? fresh : surveyed;
    available.sort((a, b) => hash(seed + ':' + a.site.id) - hash(seed + ':' + b.site.id));
    const plans: PlannedOffer[] = available.length
      ? MODES.map((mode, i) => {
          const exceptional = i === exceptionalIndex;
          const level = baseLevel + (exceptional ? 1 : 0);
          const { site, position } = available[i % available.length];
          const targetDistance = distance(r.capital, position);
          const factor =
            EXPEDITION_GOLD[level] *
            (0.65 + targetDistance / 150) *
            [1, 1.4, 2.2][i] *
            (site.environment === 'SEA' ? 1.25 : 1);
          const reward = {
            GOLD: Math.round(factor * 1.3),
            WOOD: Math.round(0.8 * factor * 1.3),
            STONE: Math.round(0.65 * factor * 1.3),
            IRON: Math.round(0.5 * factor * 1.3),
            FOOD: Math.round(0.9 * factor * 1.3),
          };
          return {
            position,
            offer: {
              id: `adventure:${board?.generation ?? 0}:${anchor}:${slot}:${level}:${i}:${site.id}:${Math.floor(hash(key(position) + ':' + position.orientation) * 1e9)}${exceptional ? ':exceptional' : ''}`,
              title: site.name,
              completedBefore: completed.has(site.id),
              discoveredBefore:
                completed.has(site.id) || !!board?.discoveredSites?.includes(site.id),
              level,
              ...(exceptional ? { exceptional: true } : {}),
              difficulty: i === 0 ? 'Escarmouche' : i === 1 ? 'Assaut' : 'Siège',
              objective: 'BUILDING',
              buildings: [],
              units: [],
              abandonmentCost: {
                GOLD: Math.round(Math.round(factor) / 5),
                FOOD: Math.round(Math.round(0.9 * factor) / 5),
              },
              reward,
              expedition: { siteId: site.id, mode, route: site.environment, targetDistance },
            },
          };
        })
      : [];
    survey = { world: worldIdentity(s, id), realmId: id, at: now, plans };
    if (surveys.size >= 128) surveys.delete(surveys.keys().next().value!);
    surveys.set(seed, survey);
  }
  // Occupation invalidates a quote; revealing it does not. Never relocate its habitat.
  return survey.plans
    .filter(
      ({ offer, position }) =>
        freePosition(s, id, position, offer.expedition!.route === 'SEA', ctx) &&
        expeditionHabitatMatches(s.seed, offer.expedition!.siteId, position, ctx.tile),
    )
    .map((p) => structuredClone(p.offer));
}
/** A bounded A*; no world mutation, no omniscient information returned to the browser. */
function reachable(
  s: GameState,
  start: Hex,
  goals: Hex[],
  kind: Unit['kind'],
  cache: Map<string, ReturnType<typeof tileAt>>,
  allowed: Set<string>,
) {
  const goalDistance = (p: Hex) => Math.min(...goals.map((goal) => distance(p, goal)));
  type Node = { p: Hex; g: number; f: number };
  const heap: Node[] = [],
    cost = new Map<string, number>([[key(start), 0]]);
  const push = (v: Node) => {
    let i = heap.length;
    heap.push(v);
    while (i) {
      const p = (i - 1) >> 1;
      if (heap[p].f <= v.f) break;
      heap[i] = heap[p];
      i = p;
      heap[i] = v;
    }
  };
  const pop = () => {
    const first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1].f < heap[child].f) child++;
        if (heap[i].f <= heap[child].f) break;
        [heap[i], heap[child]] = [heap[child], heap[i]];
        i = child;
      }
    }
    return first;
  };
  push({ p: start, g: 0, f: goalDistance(start) });
  const barriers = new Set(
    Object.values(s.buildings)
      .filter((b) => wallBlocks(b, [...allowed][0], kind, [...allowed]))
      .map(key),
  );
  let expanded = 0;
  while (heap.length && expanded++ < 18000) {
    const n = pop();
    if (n.g !== cost.get(key(n.p))) continue;
    if (goalDistance(n.p) <= 1) return true;
    for (const p of neighbors(n.p)) {
      const k = key(p);
      if (barriers.has(k) || distance(start, p) > 360) continue;
      let t = cache.get(k);
      if (!t) {
        t = tileAt(s, p);
        cache.set(k, t);
      }
      if (movementCost(t, kind) >= 99) continue;
      const g = n.g + 1;
      if (g > 350 || g >= (cost.get(k) ?? Infinity)) continue;
      cost.set(k, g);
      push({ p, g, f: g + goalDistance(p) });
    }
  }
  return false;
}
function searchContext(s: GameState, id: string) {
  const cache = new Map<string, ReturnType<typeof tileAt>>();
  const tile = (p: Hex) => {
    const k = key(p);
    let t = cache.get(k);
    if (!t) {
      t = tileAt(s, p);
      cache.set(k, t);
    }
    return t;
  };
  return {
    cache,
    tile,
    seen: vision(s, s.realms[id]),
    allowed: new Set([id, ...alliedRealmIds(s, id)]),
    ships: Object.values(s.units).filter(
      (u) => u.ownerId === id && u.hp > 0 && UNIT_PROFILES[u.kind].naval,
    ),
    occupied: new Set(
      [
        ...Object.values(s.units),
        ...Object.values(s.buildings),
        ...Object.values(s.events),
        ...Object.values(s.strategy?.sites ?? {}),
        ...Object.values(s.missions ?? {}).flatMap((b) => (b.active ? [b.active] : [])),
      ].map(key),
    ),
  };
}
type SearchContext = ReturnType<typeof searchContext>;
function freePosition(s: GameState, id: string, p: Position, naval: boolean, ctx: SearchContext) {
  if (naval && (!s.oceanVersion || !ctx.ships.length)) return false;
  const footprint = expeditionFootprint({
    ...p,
    expedition: {
      siteId: '',
      mode: 'RECON',
      route: naval ? 'SEA' : 'LAND',
      targetDistance: 60,
      orientation: p.orientation,
    },
  });
  if (
    footprint.some((h) => {
      const t = ctx.tile(h),
        d = distance(s.realms[id].capital, h);
      return (
        d < 60 ||
        d > 200 ||
        (naval
          ? !isSea(t.terrain)
          : !['PLAIN', 'FOREST', 'HILL', 'MOUNTAIN', 'BEACH'].includes(t.terrain) ||
            movementCost(t, 'PEASANT') >= 99)
      );
    })
  )
    return false;
  if (Object.values(s.realms).some((r) => !r.defeatedAt && distance(r.capital, p) < 10))
    return false;
  if (
    disk(p, 2).some((h) => {
      const t = ctx.tile(h);
      return (
        ctx.occupied.has(key(h)) ||
        t.ownerId ||
        t.buildingId ||
        t.road ||
        t.poi ||
        t.terrain === 'SCORCHED' ||
        (naval && !isSea(t.terrain))
      );
    })
  )
    return false;
  if (Object.values(s.missions ?? {}).some((b) => b.active && distance(b.active, p) < 8))
    return false;
  return !Object.values(s.strategy?.strikes ?? {}).some(
    (n) => !n.resolvedAt && distance(n, p) < 12,
  );
}
function accessiblePosition(
  s: GameState,
  id: string,
  p: Position,
  naval: boolean,
  ctx: SearchContext,
) {
  const starts = naval
    ? ctx.ships
        .slice()
        .sort((a, b) => distance(a, p) - distance(b, p))
        .slice(0, 3)
    : [{ ...s.realms[id].capital, kind: 'PEASANT' as const }];
  const goals = expeditionFootprint({
    ...p,
    expedition: {
      siteId: '',
      mode: 'RECON',
      route: naval ? 'SEA' : 'LAND',
      targetDistance: 60,
      orientation: p.orientation,
    },
  });
  return starts.some((start) => reachable(s, start, goals, start.kind, ctx.cache, ctx.allowed));
}
/** Look at regional geography first, then attach fitting landmarks to reachable locations. */
function surveySites(
  s: GameState,
  id: string,
  seed: string,
  ctx: SearchContext,
  onlySite?: string,
) {
  const found = new Map<string, { site: (typeof EXPEDITION_SITES)[number]; position: Position }>();
  const completed = completedExpeditionSites(s, id);
  let paths = 0;
  const candidates: Position[] = [];
  for (let i = 0; i < 840; i++) {
    const range = 60 + ((i * 37) % 141);
    const angle = (hash(seed + ':angle') + i * 0.38196601125) * Math.PI * 2;
    const dq = Math.cos(angle),
      dr = Math.sin(angle),
      norm = (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
    const p: Position = {
      q: s.realms[id].capital.q + Math.round((dq / norm) * range),
      r: s.realms[id].capital.r + Math.round((dr / norm) * range),
      orientation: Math.floor(hash(seed + ':orientation:' + i) * 6),
    };
    candidates.push(p);
  }
  for (const p of placementOrder(s, id, candidates, ctx.seen, 2)) {
    const naval = isSea(ctx.tile(p).terrain);
    if (!freePosition(s, id, p, naval, ctx)) continue;
    const matches = EXPEDITION_SITES.filter(
      (site) =>
        !found.has(site.id) &&
        (!onlySite || site.id === onlySite) &&
        (site.environment === 'SEA') === naval &&
        expeditionHabitatMatches(s.seed, site.id, p, ctx.tile),
    );
    if (!matches.length) continue;
    if (accessiblePosition(s, id, p, naval, ctx))
      for (const site of matches) found.set(site.id, { site, position: p });
    if (
      ++paths >= ([...found.keys()].some((site) => !completed.has(site)) ? 12 : 48) ||
      (onlySite && found.size) ||
      ([...found.keys()].filter((site) => !completed.has(site)).length >= 8 &&
        (!ctx.ships.length || [...found.values()].some((v) => v.site.environment === 'SEA')))
    )
      break;
  }
  return [...found.values()];
}
export function expeditionSitePosition(
  s: GameState,
  id: string,
  offer: MissionOffer,
): Position | undefined {
  if (!offer.expedition || !s.realms[id]) return;
  const ctx = searchContext(s, id);
  for (const survey of surveys.values()) {
    if (survey.realmId !== id || survey.world !== worldIdentity(s, id)) continue;
    const plan = survey.plans.find(
      (p) => p.offer.id === offer.id && p.offer.expedition!.siteId === offer.expedition!.siteId,
    );
    if (!plan) continue;
    const p = plan.position,
      naval = offer.expedition.route === 'SEA';
    return freePosition(s, id, p, naval, ctx) &&
      expeditionHabitatMatches(s.seed, offer.expedition.siteId, p, ctx.tile) &&
      accessiblePosition(s, id, p, naval, ctx)
      ? { ...p }
      : undefined;
  }
  const site = EXPEDITION_SITES.find((site) => site.id === offer.expedition!.siteId);
  if (!site || site.environment !== offer.expedition.route) return;
  return surveySites(s, id, offer.id, ctx, site.id)[0]?.position;
}
export function acceptExpedition(
  s: GameState,
  id: string,
  offer: MissionOffer,
  now: number,
): ActiveMission {
  const p = expeditionSitePosition(s, id, offer);
  requireRule(
    p,
    offer.expedition?.route === 'SEA'
      ? 'Ce site maritime n’est plus disponible ou accessible depuis votre flotte. Consultez les offres actualisées.'
      : 'Ce site n’est plus libre ou accessible. Consultez les offres actualisées.',
  );
  const mid = randomUUID();
  const m: ActiveMission = {
    ...structuredClone(offer),
    q: p.q,
    r: p.r,
    id: mid,
    realmId: id,
    ownerId: `mission:${mid}`,
    objectiveId: `expedition:${mid}`,
    startedAt: now,
    distance: distance(p, s.realms[id].capital),
    expedition: {
      ...offer.expedition!,
      orientation: p.orientation,
      phase: 'VISIT',
      participants: [],
    },
  };
  ((s.missions ??= {})[id] ??= { generation: 0 }).active = m;
  return m;
}
export function expeditionCarrier(s: GameState, m: ActiveMission): Unit | undefined {
  const id = m.expedition?.carrierId;
  if (!id) return;
  return s.units[id] ?? Object.values(s.units).find((u) => u.cargo?.some((c) => c.id === id));
}
export function reconcileExpeditions(s: GameState, now: number) {
  for (const board of Object.values(s.missions ?? {})) {
    const m = board.active,
      exp = m?.expedition;
    if (m && exp && !(board.discoveredSites ?? []).includes(exp.siteId)) {
      const visible = vision(s, s.realms[m.realmId]);
      if (expeditionFootprint(m).some((p) => visible.has(key(p))))
        (board.discoveredSites ??= []).push(exp.siteId);
    }
    if (!m || !exp || exp.phase !== 'RETURN') continue;
    const carrier = expeditionCarrier(s, m);
    if (
      carrier &&
      carrier.hp > 0 &&
      (carrier.ownerId === m.realmId || alliedRealmIds(s, m.realmId).includes(carrier.ownerId))
    )
      continue;
    exp.phase = 'VISIT';
    delete exp.carrierId;
    log(
      s,
      `${m.title} : l’objet a été perdu. Une nouvelle récupération est possible sur le site.`,
      'WORLD',
      now,
      [m.realmId, ...alliedRealmIds(s, m.realmId)],
      m,
    );
  }
}
export function expeditionInteraction(
  s: GameState,
  id: string,
  u: Unit,
  missionId: string,
  now: number,
): string {
  const m = Object.values(s.missions ?? {})
    .map((b) => b.active)
    .find((m) => m?.id === missionId);
  requireRule(m?.expedition, 'Cette expédition n’est plus active.');
  const exp = m.expedition;
  requireRule(
    id === m.realmId || alliedRealmIds(s, m.realmId).includes(id),
    'Cette expédition appartient à un autre royaume.',
  );
  requireRule(u.hp > 0, 'Cette unité est indisponible.');
  const r = s.realms[id];
  const search = exp.mode === 'RECOVER';
  const ap = search ? 3 : 1;
  const food = search ? expeditionSearchCost(m.level).FOOD : 0;
  requireRule(r.unlimitedAP || r.ap >= ap, `Cette action demande ${ap} PA.`);
  requireRule(r.wallet.FOOD >= food, `La fouille demande ${food} vivres.`);
  if (exp.phase === 'RETURN') {
    requireRule(
      expeditionCarrier(s, m)?.id === u.id,
      'Seule l’unité qui transporte l’objet peut le livrer.',
    );
    requireRule(
      Object.values(s.buildings).some(
        (b) =>
          b.ownerId === m.realmId &&
          ['CAMP', 'VILLAGE', 'PORT'].includes(b.kind) &&
          b.hp > 0 &&
          distance(b, u) <= 1,
      ),
      'Rapportez l’objet près d’une ville, du bâtiment de capitale ou d’un port du commanditaire.',
    );
  } else {
    requireRule(
      expeditionDistance(m, u) <= 1 && expeditionFootprint(m).some((p) => vision(s, r).has(key(p))),
      'Approchez une unité à une case maximum du bord du lieu (3 hexagones).',
    );
    requireRule(
      exp.route === 'SEA'
        ? !!UNIT_PROFILES[u.kind].naval
        : !UNIT_PROFILES[u.kind].flying && !UNIT_PROFILES[u.kind].naval,
      exp.route === 'SEA'
        ? 'Un navire est nécessaire pour accoster et explorer ce lieu.'
        : 'Débarquez une unité terrestre pour explorer ce lieu.',
    );
  }
  if (!r.unlimitedAP) r.ap -= ap;
  r.wallet.FOOD -= food;
  if (!exp.participants?.includes(id)) (exp.participants ??= []).push(id);
  if (exp.mode === 'EXTRACT' && exp.phase !== 'RETURN') {
    exp.phase = 'RETURN';
    exp.carrierId = u.id;
    const message = `${m.title} : objet embarqué. Rapportez cette unité dans une ville ou un port du commanditaire.`;
    log(s, message, 'WORLD', now, [m.realmId, ...alliedRealmIds(s, m.realmId)], u);
    return message;
  }
  const reward = { ...m.reward };
  const bonus =
    hash(m.id + ':treasure') < 0.2
      ? Object.fromEntries(Object.entries(reward).map(([k, v]) => [k, Math.round(v! * 0.25)]))
      : {};
  for (const [k, v] of Object.entries(bonus))
    reward[k as keyof Wallet] = (reward[k as keyof Wallet] ?? 0) + v;
  transfer(s.realms[m.realmId].wallet, reward);
  const board = s.missions![m.realmId],
    trophy = createMissionTrophy(m, now, { units: 0, buildings: 0, walls: 0 }, reward);
  (board.trophies ??= []).push(trophy);
  board.active = undefined;
  board.generation++;
  board.lastResult = {
    title: m.title,
    outcome: 'VICTORY',
    trophyId: m.id,
    reward,
    units: 0,
    buildings: 0,
    walls: 0,
    at: now,
  };
  const message = `Expédition accomplie · ${m.title}. Butin reçu par ${s.realms[m.realmId].name} : ${Object.entries(
    reward,
  )
    .map(([k, v]) => `${formatNumber(v!)} ${RESOURCE_NAMES[k as keyof Wallet].toLowerCase()}`)
    .join(
      ' · ',
    )}.${Object.keys(bonus).length ? ' Trésor surprise : +25 % inclus !' : ''} Une médaille rejoint votre carnet.`;
  log(s, message, 'REALM', now, [m.realmId, ...alliedRealmIds(s, m.realmId)], m).victory = {
    expedition: { siteId: exp.siteId, mode: exp.mode },
    id: m.id,
    title: m.title,
    ownerId: m.realmId,
    at: now,
    q: m.q,
    r: m.r,
    reward,
    captured: trophy.captured,
    destroyed: trophy.destroyed,
    losses: { units: 0, buildings: 0 },
    medal: trophy.medal,
  };
  return message;
}
