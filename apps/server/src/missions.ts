import { developmentProgress } from '@voidmarch/game-rules';
import { placementOrder, completedMissionTitles } from './mission-placement';
import { conquestDevelopmentLevel } from '@voidmarch/config';
import { exceptionalOfferIndex } from './exceptional-missions';
import { findPath, unitMovementBudget } from '@voidmarch/game-rules';
import { developmentStage } from '@voidmarch/config';
import { missionAbandonPlan } from '@voidmarch/game-rules';
import { navalMissionSite, navalMissionFleet } from './naval-missions';
import {
  expeditionOffers,
  acceptExpedition,
  reconcileExpeditions,
  expeditionCarrier,
} from './expeditions';
import { consumeSupplies } from '@voidmarch/game-rules';
import { destroyUnit } from './transports';
import { missionRoster, missionPlacementOrder } from './mission-rosters';
import { createMissionTrophy, awardMissionTrophy } from './mission-trophies';
import { randomUUID } from 'node:crypto';
import {
  formatNumber,
  RESOURCE_NAMES,
  type Resource,
  BUILDINGS,
  BUILDING_POPULATION,
  nuclearStrikeRadius,
  UNITS,
  UNIT_PROFILES,
  WALL_KINDS,
  isWall,
  type UnitKind,
} from '@voidmarch/config';
import {
  alliedRealmIds,
  canAfford,
  missionReward,
  movementCost,
  disk,
  distance,
  estimateDamage,
  DIRECTIONS,
  vision,
  hash,
  key,
  neighbors,
  realmBuildings,
  resolveAttack,
  tileAt,
  transfer,
  unitStats,
  wallBlocks,
  writeTile,
} from '@voidmarch/game-rules';
import type { Action } from '@voidmarch/protocol';
import type {
  ActiveMission,
  Building,
  GameState,
  Hex,
  MissionOffer,
  MissionsView,
  Unit,
} from '@voidmarch/shared';
import { defeat, log, refreshEnclosures, requireRule } from './engine';

export function activeMissions(s: GameState): ActiveMission[] {
  return Object.values(s.missions ?? {}).flatMap((b) => (b.active ? [b.active] : []));
}
export function missionForOwner(s: GameState, owner: string) {
  return activeMissions(s).find((m) => m.ownerId === owner);
}
export function canFightMission(s: GameState, realmId: string, m: ActiveMission) {
  return m.realmId === realmId || alliedRealmIds(s, m.realmId).includes(realmId);
}
export function missionAttackReason(s: GameState, realmId: string, owner: string) {
  const m = missionForOwner(s, owner);
  return m && !canFightMission(s, realmId, m)
    ? 'Cette forteresse est réservée au commanditaire et à ses alliés.'
    : undefined;
}

const titles = [
  'Le relais des Cendres',
  'Le bastion du Corbeau',
  'La redoute de Minuit',
  'Le fort des Ronces',
  'La garnison du Voile',
  'La tour du Dernier Serment',
];
const OFFER_REFRESH_MS = 10 * 60_000;
/** Derived from saved dates: reloads and server restarts never reset the countdown. */
function offerWindow(s: GameState, realmId: string, now: number) {
  const anchor = Math.max(s.realms[realmId].createdAt, s.missions?.[realmId]?.lastResult?.at ?? 0);
  const slot = Math.floor(Math.max(0, now - anchor) / OFFER_REFRESH_MS);
  return { anchor, slot, refreshAt: anchor + (slot + 1) * OFFER_REFRESH_MS };
}
/** Three stable offers within each ten-minute window; no assets until acceptance. */
export function missionOffers(s: GameState, realmId: string, now: number): MissionOffer[] {
  if (s.missions?.[realmId]?.active || (s.missions?.[realmId]?.availableAt ?? 0) > now) return [];
  const generation = s.missions?.[realmId]?.generation ?? 0;
  const sites = realmBuildings(s, realmId);
  const baseLevel = conquestDevelopmentLevel(sites, developmentProgress(s, realmId));
  const fleet = Object.values(s.units).filter(
    (u) =>
      u.ownerId === realmId && u.hp > 0 && UNIT_PROFILES[u.kind].naval && UNITS[u.kind].attack > 0,
  );
  const { anchor, slot } = offerWindow(s, realmId, now);
  const naval =
    !!s.oceanVersion &&
    (fleet.length > 0 ||
      hash(`${s.seed}:${realmId}:maritime:${generation}:${anchor}:${slot}`) < 0.5);
  const navalBaseLevel = Math.min(
    developmentStage(sites, developmentProgress(s, realmId)),
    Math.max(1, ...fleet.map((u) => UNIT_PROFILES[u.kind].minRecruitLevel ?? 1)),
  );
  const levels = [baseLevel, baseLevel, naval ? navalBaseLevel : baseLevel];
  const baseSeed = `${s.seed}:${realmId}:missions:${generation}:${baseLevel}:${anchor}`;
  const exceptionalIndex = exceptionalOfferIndex(
    `${s.seed}:${s.createdAt}:${realmId}:${s.realms[realmId].createdAt}:conquest:${generation}:${anchor}:${slot}`,
    levels,
  );
  const seed = `${baseSeed}:${slot}`;
  // At least the title changes for each card, even if random roster rolls repeat.
  const completed = completedMissionTitles(s, realmId);
  const freshTitles = titles.filter((title) => !completed.has(title));
  const pool = freshTitles.length ? freshTitles : titles;
  const offset = (Math.floor(hash(baseSeed) * pool.length) + slot) % pool.length;
  const offers: MissionOffer[] = [0, 1, 2].map((i) => {
    const exceptional = i === exceptionalIndex;
    const level = levels[i] + (exceptional ? 1 : 0);
    const campaign =
      i === 2 &&
      level >= 3 &&
      alliedRealmIds(s, realmId).some((id) => !s.realms[id]?.defeatedAt && s.realms[id]) &&
      (slot + generation) % 2 === 1;
    const difficulty: MissionOffer['difficulty'] = campaign
      ? 'Grande campagne'
      : (['Escarmouche', 'Assaut', 'Siège'] as const)[i];
    const units = missionRoster(level, difficulty, `${seed}:${i}`);
    const specialist =
      units.find((k) => UNIT_PROFILES[k].flying) ??
      units.find((k) => UNIT_PROFILES[k].mechanical || UNIT_PROFILES[k].mounted);
    const recruiter = specialist ? UNIT_PROFILES[specialist].recruitAt[0] : undefined;
    const scale = { Escarmouche: 1, Assaut: 3, Siège: 8, 'Grande campagne': 16 }[difficulty];
    const armyGold = units.reduce((sum, k) => sum + (UNITS[k].cost.GOLD ?? 0), 0);
    const armyFood = units.reduce((sum, k) => sum + (UNITS[k].cost.FOOD ?? 0), 0);
    const abandonmentCost = {
      GOLD: Math.ceil(50 * level * level * scale + armyGold * 0.02),
      FOOD: Math.ceil(30 * level * level * scale + armyFood * 0.02),
    };
    return {
      id: `offer:v2:${generation}:${level}:${anchor.toString(36)}:${slot}:${i}:${campaign ? 'campaign' : 'standard'}${exceptional ? ':exceptional' : ''}`,
      title: campaign
        ? `Grande campagne · ${pool[(offset + i) % pool.length]}`
        : pool[(offset + i) % pool.length],
      difficulty,
      completedBefore: completed.has(pool[(offset + i) % pool.length]),
      level,
      ...(exceptional ? { exceptional: true } : {}),
      objective: i === Math.floor(hash(`${seed}:objective`) * 3) ? 'COMMANDER' : 'BUILDING',
      buildings:
        i === 0
          ? [level === 1 ? 'OUTPOST' : 'VILLAGE', 'HOUSE']
          : [
              level === 1 ? 'OUTPOST' : 'VILLAGE',
              recruiter ?? (hash(`${seed}:${i}:building`) > 0.5 ? 'BARRACKS' : 'ARCHERY'),
              hash(`${seed}:${i}:civil`) > 0.5 ? 'HOUSE' : 'FARM',
            ],
      units,
      wallRadius: i === 0 ? 2 : i === 1 ? 3 : 4,
      wall:
        i === 2 || (i === 1 && hash(`${seed}:wall`) > 0.5)
          ? WALL_KINDS[Math.min(level - 1, 4)]
          : undefined,
      abandonmentCost,
      reward: missionReward({ difficulty, abandonmentCost }, 1.3),
    };
  });
  if (naval) {
    const navalLevel = offers[2].level;
    const units = navalMissionFleet(navalLevel);
    const cost = {
      GOLD: Math.ceil(units.reduce((n, k) => n + UNITS[k].cost.GOLD, 0) * 0.08 + 200 * navalLevel),
      FOOD: 500 * navalLevel,
    };
    const navalTitles = ['La rade des Naufragés', 'Le fort du soleil noyé', 'Les quais de l’Abîme'];
    const freshNavalTitles = navalTitles.filter((title) => !completed.has(title));
    const navalPool = freshNavalTitles.length ? freshNavalTitles : navalTitles;
    const title = navalPool[(slot + generation) % navalPool.length];
    offers[2] = {
      ...offers[2],
      id: offers[2].id + ':naval',
      maritime: true,
      difficulty: 'Siège',
      title,
      completedBefore: completed.has(title),
      level: navalLevel,
      objective: 'BUILDING',
      buildings: ['PORT', 'COASTAL_BATTERY'],
      units,
      wall: undefined,
      wallRadius: 4,
      abandonmentCost: cost,
      reward: missionReward({ difficulty: 'Siège', abandonmentCost: cost }, 1.3),
    };
  }
  return offers;
}

function missionSite(
  s: GameState,
  realmId: string,
  salt: string,
  offer: MissionOffer,
): { center: Hex; spots: Hex[]; buildingSpots?: Hex[] } {
  if (offer.maritime) {
    const site = navalMissionSite(s, realmId, offer);
    requireRule(
      site,
      'Aucune rade libre trouvée. Les bâtiments et unités existants restent protégés ; réessayez au prochain renouvellement.',
    );
    return site;
  }
  const radius = offer.wallRadius ?? 2;
  const capital = s.realms[realmId].capital;
  const visible = vision(s, s.realms[realmId]);
  const terrainCache = new Map<string, ReturnType<typeof tileAt>>();
  const terrainAt = (p: Hex) => {
    const k = key(p);
    let tile = terrainCache.get(k);
    if (!tile) {
      tile = tileAt(s, p);
      terrainCache.set(k, tile);
    }
    return tile;
  };
  const occupied = new Set(
    [
      ...Object.values(s.units),
      ...Object.values(s.events),
      ...Object.values(s.strategy?.sites ?? {}),
    ].map(key),
  );
  const blocked = new Set(
    Object.values(s.buildings)
      .filter((b) => wallBlocks(b, realmId, 'INFANTRY', alliedRealmIds(s, realmId)))
      .map(key),
  );
  // Grow with the amount of occupied/visible land, not the distance of a lone scout.
  // Search lazily by hex ring: after the preferred band, the nearest valid ring wins.
  const searchLimit = Math.max(
    80,
    Math.ceil(Math.sqrt((visible.size + Object.keys(s.tiles).length + occupied.size) / 3)) + 80,
  );
  function* candidates(): Generator<Hex> {
    const preferred = disk(capital, 40).filter((p) => distance(p, capital) >= 20);
    const offset = Math.floor(hash(salt) * preferred.length);
    for (let i = 0; i < preferred.length; i++) yield preferred[(offset + i) % preferred.length];
    for (let range = 41; range <= searchLimit; range++) {
      const ring: Hex[] = [];
      let p = { q: capital.q + DIRECTIONS[4].q * range, r: capital.r + DIRECTIONS[4].r * range };
      for (const direction of DIRECTIONS)
        for (let i = 0; i < range; i++) {
          ring.push(p);
          p = { q: p.q + direction.q, r: p.r + direction.r };
        }
      const offset = Math.floor(hash(`${salt}:${range}`) * ring.length);
      for (let i = 0; i < ring.length; i++) yield ring[(offset + i) % ring.length];
    }
  }
  // One reusable flood search instead of repeating a path search capped at 50 cells.
  // It verifies a walkable route, regardless of the number of movement orders required.
  const reachable = new Set([key(capital)]),
    queue: Hex[] = [capital];
  let cursor = 0;
  const canReach = (target: Hex) => {
    const targetKey = key(target);
    while (!reachable.has(targetKey) && cursor < queue.length) {
      const current = queue[cursor++];
      for (const next of neighbors(current)) {
        const k = key(next);
        if (
          reachable.has(k) ||
          blocked.has(k) ||
          distance(next, capital) > searchLimit + radius + 12
        )
          continue;
        if (movementCost(terrainAt(next), 'INFANTRY') > UNITS.INFANTRY.move) continue;
        reachable.add(k);
        queue.push(next);
      }
    }
    return reachable.has(targetKey);
  };
  for (const p of placementOrder(s, realmId, [...candidates()], visible, radius + 1)) {
    if (Object.values(s.realms).some((r) => !r.defeatedAt && distance(r.capital, p) < 12)) continue;
    if (activeMissions(s).some((m) => distance(m, p) <= (m.wallRadius ?? 2) + radius + 2)) continue;
    if (
      Object.values(s.strategy?.strikes ?? {}).some(
        (strike) =>
          !strike.resolvedAt && distance(strike, p) <= nuclearStrikeRadius(strike) + radius + 1,
      )
    )
      continue;
    if (
      disk(p, radius + 1).some((h) => {
        const t = terrainAt(h);
        return (
          t.ownerId ||
          t.buildingId ||
          t.road ||
          t.poi ||
          occupied.has(key(h)) ||
          t.terrain === 'SCORCHED'
        );
      })
    )
      continue;
    // Only ordinary plains receive buildings; never flatten natural deposits to create a mission.
    if ([p, neighbors(p)[0], neighbors(p)[3]].some((h) => terrainAt(h).terrain !== 'PLAIN'))
      continue;
    if (!canReach(p)) continue;
    const reserved = new Set(
      [p, neighbors(p)[0], neighbors(p)[3]].slice(0, offer.buildings.length).map(key),
    );
    const interior = disk(p, radius - 1).filter((h) => !reserved.has(key(h)));
    const traversable = new Map<UnitKind, Set<string>>();
    const spots: Hex[] = [];
    for (const { kind, index } of missionPlacementOrder(offer.units)) {
      let connected = traversable.get(kind);
      if (!connected) {
        connected = new Set([key(p)]);
        const queue = [p];
        for (let n = 0; n < queue.length; n++)
          for (const h of neighbors(queue[n])) {
            if (
              distance(h, p) >= radius ||
              connected.has(key(h)) ||
              movementCost(terrainAt(h), kind) >= 99
            )
              continue;
            connected.add(key(h));
            queue.push(h);
          }
        traversable.set(kind, connected);
      }
      const spot = interior.find(
        (h) =>
          !reserved.has(key(h)) &&
          connected!.has(key(h)) &&
          movementCost(terrainAt(h), kind) <= UNITS[kind].move,
      );
      if (!spot) break;
      spots[index] = spot;
      reserved.add(key(spot));
    }
    if (spots.filter(Boolean).length === offer.units.length) return { center: p, spots };
  }
  requireRule(
    false,
    'Aucun emplacement libre et accessible à pied n’a été trouvé. Réessayez après une évolution du territoire.',
  );
}

export function missionAction(
  s: GameState,
  realmId: string,
  action: Action,
  now: number,
): string | undefined {
  if (action.type !== 'MISSION_ACCEPT' && action.type !== 'MISSION_ABANDON') return;
  const r = s.realms[realmId];
  const board = ((s.missions ??= {})[realmId] ??= { generation: 0 });
  if (action.type === 'MISSION_ABANDON') {
    const m = board.active;
    requireRule(m && m.id === action.payload.missionId, 'Cette mission n’est plus active.');
    reconcileExpeditions(s, now);
    const plan = missionAbandonPlan(r.wallet, m.abandonmentCost);
    transfer(r.wallet, plan.paid, -1);
    board.availableAt = now + plan.delay;
    clearMission(s, realmId);
    board.lastResult = {
      title: m.title,
      outcome: 'ABANDONED',
      units: 0,
      buildings: 0,
      walls: 0,
      at: now,
    };
    const message = `Mission abandonnée : ${formatNumber(plan.paid.GOLD ?? 0)} or et ${formatNumber(plan.paid.FOOD ?? 0)} vivres payés.${plan.delay ? ` Fonds insuffisants : nouvelles missions dans ${Math.ceil(plan.delay / 60000)} minutes, sans dette.` : ''} ${m.expedition ? 'Le lieu et l’objet de quête disparaissent' : 'La garnison disparaît'} ; vos troupes restent sur place.`;
    log(s, message, 'REALM', now, [realmId], m);
    return message;
  }
  requireRule(!board.active, 'Terminez ou abandonnez votre mission avant d’en accepter une autre.');
  requireRule(
    (board.availableAt ?? 0) <= now,
    'Votre expédition se réorganise après l’abandon. Consultez le compte à rebours.',
  );
  const offer = [...missionOffers(s, realmId, now), ...expeditionOffers(s, realmId, now)].find(
    (o) => o.id === action.payload.offerId,
  );
  requireRule(offer, 'Cette offre a changé. Consultez les nouvelles missions.');
  if (offer.expedition) {
    const m = acceptExpedition(s, realmId, offer, now);
    const message = `Expédition acceptée : ${m.title}, à ${m.distance} cases. Approchez le lieu avec ${m.expedition!.route === 'SEA' ? 'un navire' : 'une unité terrestre'}.`;
    log(s, message, 'REALM', now, [realmId, ...alliedRealmIds(s, realmId)], m);
    return message;
  }
  const {
    center: p,
    spots,
    buildingSpots,
  } = missionSite(s, realmId, `${s.seed}:${realmId}:${offer.id}`, offer);
  const id = randomUUID();
  const m: ActiveMission = {
    ...offer,
    ...p,
    id,
    realmId,
    ownerId: `mission:${id}`,
    losses: { units: 0, buildings: 0 },
    objectiveId: '',
    startedAt: now,
    distance: distance(p, r.capital),
  };
  board.active = m;
  const positions = buildingSpots ?? [p, neighbors(p)[0], neighbors(p)[3]];
  function building(kind: Building['kind'], h: Hex, level: number) {
    const b: Building = {
      ...h,
      id: randomUUID(),
      ownerId: m.ownerId,
      kind,
      level,
      hp: BUILDINGS[kind].hp * level,
      population: BUILDING_POPULATION[kind] ?? 0,
      name: BUILDINGS[kind].name,
      createdAt: now,
      updatedAt: now,
      constructionCost: {},
    };
    s.buildings[b.id] = b;
    writeTile(s, h, { ownerId: m.ownerId, buildingId: b.id });
    return b;
  }
  const radius = offer.wallRadius ?? 2;
  for (const h of disk(p, radius))
    if (!['SEA', 'COAST'].includes(tileAt(s, h).terrain)) writeTile(s, h, { ownerId: m.ownerId });
  offer.buildings.forEach((kind, i) => {
    const b = building(kind, positions[i], offer.level);
    if (i === 0 && offer.objective === 'BUILDING') {
      m.objectiveId = b.id;
      b.name = `Objectif · ${offer.title}`;
    }
  });
  if (offer.wall)
    for (const h of disk(p, radius).filter((h) => distance(h, p) === radius))
      building(offer.wall, h, 1);
  offer.units.forEach((kind, i) => {
    const u: Unit = {
      ...spots[i],
      id: randomUUID(),
      ownerId: m.ownerId,
      kind,
      hp: UNITS[kind].hp,
      createdAt: now,
      updatedAt: now,
    };
    if (i === 0 && offer.objective === 'COMMANDER') {
      m.objectiveId = u.id;
      u.nickname = 'Commandant de garnison';
    }
    s.units[u.id] = u;
  });
  const message = `Mission acceptée : ${m.title}, à ${m.distance} cases. ${m.objective === 'COMMANDER' ? 'Éliminez le commandant mortel' : 'Détruisez le bâtiment maître'} pour rallier les survivants.`;
  log(s, message, 'REALM', now, [realmId, ...alliedRealmIds(s, realmId)], m);
  return message;
}

/** Deletes only mission assets; player/ally armies on the site are never removed. */
export function clearMission(s: GameState, realmId: string) {
  const board = s.missions?.[realmId],
    m = board?.active;
  if (!m || !board) return;
  for (const u of Object.values(s.units)) if (u.ownerId === m.ownerId) delete s.units[u.id];
  for (const b of Object.values(s.buildings))
    if (b.ownerId === m.ownerId) {
      delete s.buildings[b.id];
      writeTile(s, b, { buildingId: undefined });
    }
  for (const t of Object.values(s.tiles))
    if (t.ownerId === m.ownerId) {
      delete t.ownerId;
      delete t.capture;
      delete t.enclosureOwnerId;
    }
  clearMissionMemory(s, m.ownerId);
  board.active = undefined;
  board.generation++;
}
function clearMissionMemory(s: GameState, ownerId: string) {
  for (const r of Object.values(s.realms))
    for (const t of Object.values(r.explored))
      if (t.ownerId === ownerId) {
        delete t.ownerId;
        delete t.building;
        delete t.capture;
        delete t.enclosureOwnerId;
      }
}
export function reconcileMissions(s: GameState, now: number) {
  reconcileExpeditions(s, now);
  const completed: string[] = [];
  for (const m of activeMissions(s)) {
    const r = s.realms[m.realmId];
    if (!r || r.defeatedAt) {
      clearMission(s, m.realmId);
      continue;
    }
    if (m.expedition) continue;
    if (s.units[m.objectiveId] || s.buildings[m.objectiveId]) continue;
    const units = Object.values(s.units).filter((u) => u.ownerId === m.ownerId);
    const buildings = Object.values(s.buildings).filter((b) => b.ownerId === m.ownerId);
    for (const asset of [...units, ...buildings]) {
      asset.ownerId = m.realmId;
      asset.updatedAt = now;
    }
    for (const t of Object.values(s.tiles))
      if (t.ownerId === m.ownerId) {
        t.ownerId = t.buildingId && s.buildings[t.buildingId] ? m.realmId : undefined;
        delete t.capture;
      }
    clearMissionMemory(s, m.ownerId);
    const board = s.missions![m.realmId];
    board.active = undefined;
    board.generation++;
    const walls = buildings.filter((b) => isWall(b.kind)).length;
    const reward = missionReward(m);
    // Mission rewards are loot: paid in full, even above passive production capacity.
    transfer(r.wallet, reward);
    const trophies = (board.trophies ??= []);
    const trophy =
      trophies.find((t) => t.id === m.id) ??
      createMissionTrophy(
        m,
        now,
        { units: units.length, buildings: buildings.length - walls, walls },
        reward,
      );
    const trophyRecipients = awardMissionTrophy(s, m.realmId, trophy);
    board.lastResult = {
      title: m.title,
      outcome: 'VICTORY',
      trophyId: trophy.id,
      reward,
      units: units.length,
      buildings: buildings.length - walls,
      walls,
      at: now,
    };
    const message = `Victoire · ${m.title} : ${units.length} unité(s), ${buildings.length - walls} bâtiment(s) et ${walls} rempart(s) survivants rejoignent votre royaume, avec leurs dégâts actuels. Butin reçu par ${r.name} : ${Object.entries(
      reward,
    )
      .filter(([, value]) => value > 0)
      .map(
        ([resource, value]) =>
          `+${formatNumber(value)} ${RESOURCE_NAMES[resource as Resource].toLowerCase()}`,
      )
      .join(
        ' · ',
      )}. Médaille « ${trophy.medal.name} » décernée à ${r.name}${trophyRecipients.length > 1 ? ` et partagée avec ${trophyRecipients.length - 1} membre(s) de son alliance` : ''}.`;
    log(s, message, 'REALM', now, [m.realmId, ...alliedRealmIds(s, m.realmId)], m).victory = {
      id: m.id,
      title: m.title,
      ownerId: m.realmId,
      at: now,
      q: m.q,
      r: m.r,
      reward,
      captured: trophy.captured,
      destroyed: trophy.destroyed,
      losses: trophy.losses ?? { units: 0, buildings: 0 },
      medal: trophy.medal,
    };
    completed.push(message);
    refreshEnclosures(s, now);
  }
  return completed;
}

/** The garrison never raids kingdoms: one nearby defender answers each attack on its site. */
export function retaliateMission(
  s: GameState,
  m: ActiveMission,
  attacker: Unit | Building,
  now: number,
  actionId: string,
) {
  if (!s.missions?.[m.realmId]?.active || attacker.hp <= 0) return '';
  const candidates = Object.values(s.units)
    .filter(
      (u) => u.ownerId === m.ownerId && u.hp > 0 && distance(u, attacker) <= unitStats(u).range,
    )
    .sort((a, b) => unitStats(b).attack - unitStats(a).attack || a.id.localeCompare(b.id));
  for (const guard of candidates) {
    const reply = resolveAttack(guard, attacker, Object.values(s.buildings), (p) => tileAt(s, p));
    if (reply.reason || reply.target.ownerId === m.ownerId) continue;
    if (missionAttackReason(s, m.realmId, reply.target.ownerId)) continue;
    // An unrelated wall may intercept the shot, but a private encounter must not damage outsiders.
    if (reply.target.ownerId !== attacker.ownerId && !canFightMission(s, reply.target.ownerId, m))
      continue;
    const target = reply.target;
    const bounds = estimateDamage(
      guard,
      target,
      tileAt(s, target),
      Object.values(s.units),
      tileAt(s, guard).terrain,
    );
    const damage =
      bounds.min + Math.floor(hash(`${actionId}:garrison`) * (bounds.max - bounds.min + 1));
    consumeSupplies(guard, now);
    if (UNIT_PROFILES[guard.kind].submarine) guard.revealedUntil = now + 60000;
    target.hp = Math.round((target.hp - damage) * 100) / 100;
    target.lastDamagedAt = now;
    target.updatedAt = now;
    const message = `${unitStats(guard).name} défend la garnison : ${damage} dégâts${reply.intercepted ? ' au rempart' : ''}.`;
    log(
      s,
      message,
      'COMBAT',
      now,
      [attacker.ownerId, m.realmId],
      target,
      {
        from: { q: guard.q, r: guard.r },
        unitKind: guard.kind,
        targetAirborne: !('population' in target) && !!UNIT_PROFILES[target.kind].flying,
      },
      {
        amount: damage,
        targetOwnerId: target.ownerId,
        targetKind: 'population' in target ? 'building' : 'unit',
        airborne: !('population' in target) && !!UNIT_PROFILES[target.kind].flying,
        retaliation: true,
      },
    );
    if (target.hp <= 0) {
      const losses = (m.losses ??= { units: 0, buildings: 0 });
      if ('population' in target) losses.buildings++;
      if ('population' in target) {
        delete s.buildings[target.id];
        writeTile(s, target, { buildingId: undefined });
        const owner = s.realms[target.ownerId];
        if (owner && distance(owner.capital, target) === 0) defeat(s, owner, now);
      } else losses.units += destroyUnit(s, target, now);
    }
    return message;
  }
  // One defensive reaction per attack: approach if no defender could fire.
  // Keep the garrison near its site; never raid a kingdom or walk through a hostile wall.
  const guards = Object.values(s.units).filter(
    (g) => g.ownerId === m.ownerId && g.hp > 0 && distance(g, m) <= (m.wallRadius ?? 2) + 6,
  );
  const occupied = new Set(Object.values(s.units).map(key));
  for (const guard of guards.sort((a, b) => distance(a, attacker) - distance(b, attacker))) {
    const goals = neighbors(attacker).filter(
      (p) => distance(p, m) <= (m.wallRadius ?? 2) + 6 && !occupied.has(key(p)),
    );
    for (const goal of goals) {
      const path = findPath(
        guard,
        goal,
        (p) => {
          if (distance(p, m) > (m.wallRadius ?? 2) + 6) return undefined;
          const t = tileAt(s, p);
          return wallBlocks(s.buildings[t.buildingId ?? ''], m.ownerId, guard.kind) ? undefined : t;
        },
        18,
        occupied,
        guard.kind,
      );
      if (!path?.length) continue;
      let budget = Math.min(2, unitMovementBudget(guard, tileAt(s, guard).biome));
      let destination: Hex | undefined;
      for (const p of path) {
        budget -= movementCost(tileAt(s, p), guard.kind);
        if (budget < 0) break;
        if (!occupied.has(key(p))) destination = p;
      }
      if (!destination || distance(destination, attacker) >= distance(guard, attacker)) continue;
      guard.q = destination.q;
      guard.r = destination.r;
      guard.updatedAt = now;
      return `${unitStats(guard).name} se rapproche pour défendre la garnison.`;
    }
  }
  return '';
}
export function missionsView(s: GameState, realmId: string, now: number): MissionsView {
  const board = s.missions?.[realmId];
  const m = board?.active;
  const objective =
    m?.expedition?.phase === 'RETURN'
      ? expeditionCarrier(s, m)
      : m
        ? (s.units[m.objectiveId] ?? s.buildings[m.objectiveId])
        : undefined;
  return {
    availableAt: board?.availableAt,
    trophies: board?.trophies ?? [],
    discoveredSites: board?.discoveredSites ?? [],
    offers: missionOffers(s, realmId, now),
    expeditionOffers: expeditionOffers(s, realmId, now),
    ...(!m ? { offersRefreshAt: offerWindow(s, realmId, now).refreshAt } : {}),
    active: m
      ? {
          ...m,
          reward: missionReward(m),
          remainingUnits: Object.values(s.units).filter((u) => u.ownerId === m.ownerId).length,
          remainingBuildings: Object.values(s.buildings).filter(
            (b) => b.ownerId === m.ownerId && !isWall(b.kind),
          ).length,
          objectiveHp: objective?.hp ?? 0,
          objectivePosition: objective ? { q: objective.q, r: objective.r } : { q: m.q, r: m.r },
        }
      : undefined,
    allied: activeMissions(s)
      .filter((m) => m.realmId !== realmId && canFightMission(s, realmId, m))
      .map((m) => ({ ...m, reward: missionReward(m) })),
    lastResult: board?.lastResult,
  };
}
