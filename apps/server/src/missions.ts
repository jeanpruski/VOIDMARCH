import { missionRoster, missionPlacementOrder } from './mission-rosters';
import { createMissionTrophy } from './mission-trophies';
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
  findPath,
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
import { incapacitateHero } from './heroes';

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

const militaryRecruiters = new Set(
  Object.values(UNIT_PROFILES)
    .filter((p) => !p.builder && !p.hero)
    .flatMap((p) => p.recruitAt ?? []),
);
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
  if (s.missions?.[realmId]?.active) return [];
  const generation = s.missions?.[realmId]?.generation ?? 0;
  const level = Math.min(
    5,
    Math.max(
      1,
      ...realmBuildings(s, realmId)
        .filter((b) => militaryRecruiters.has(b.kind))
        .map((b) => b.level),
    ),
  );
  const { anchor, slot } = offerWindow(s, realmId, now);
  const baseSeed = `${s.seed}:${realmId}:missions:${generation}:${level}:${anchor}`;
  const seed = `${baseSeed}:${slot}`;
  // At least the title changes for each card, even if random roster rolls repeat.
  const offset = (Math.floor(hash(baseSeed) * titles.length) + slot) % titles.length;
  return [0, 1, 2].map((i) => {
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
      id: `offer:v2:${generation}:${level}:${anchor.toString(36)}:${slot}:${i}:${campaign ? 'campaign' : 'standard'}`,
      title: campaign
        ? `Grande campagne · ${titles[(offset + i) % titles.length]}`
        : titles[(offset + i) % titles.length],
      difficulty,
      level,
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
      reward: missionReward({ difficulty, abandonmentCost }),
    };
  });
}

function missionSite(
  s: GameState,
  realmId: string,
  salt: string,
  offer: MissionOffer,
): { center: Hex; spots: Hex[] } {
  const radius = offer.wallRadius ?? 2;
  const capital = s.realms[realmId].capital;
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
  const ring = disk(capital, 40).filter((p) => distance(p, capital) >= 20);
  const offset = Math.floor(hash(salt) * ring.length);
  for (let i = 0; i < ring.length; i++) {
    const p = ring[(offset + i * 37) % ring.length];
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
        const t = tileAt(s, h);
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
    if ([p, neighbors(p)[0], neighbors(p)[3]].some((h) => tileAt(s, h).terrain !== 'PLAIN'))
      continue;
    if (
      !findPath(
        capital,
        p,
        (h) => (distance(h, capital) <= 50 ? tileAt(s, h) : undefined),
        250,
        blocked,
        'INFANTRY',
      )
    )
      continue;
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
              movementCost(tileAt(s, h), kind) >= 99
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
          movementCost(tileAt(s, h), kind) <= UNITS[kind].move,
      );
      if (!spot) break;
      spots[index] = spot;
      reserved.add(key(spot));
    }
    if (spots.filter(Boolean).length === offer.units.length) return { center: p, spots };
  }
  requireRule(
    false,
    'Aucun emplacement libre et accessible entre 20 et 40 cases. Réessayez après une évolution du territoire.',
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
    requireRule(
      canAfford(r.wallet, m.abandonmentCost),
      'Or ou vivres insuffisants pour abandonner cette mission.',
    );
    transfer(r.wallet, m.abandonmentCost, -1);
    clearMission(s, realmId);
    board.lastResult = {
      title: m.title,
      outcome: 'ABANDONED',
      units: 0,
      buildings: 0,
      walls: 0,
      at: now,
    };
    const message = `Mission abandonnée : ${m.abandonmentCost.GOLD} or et ${m.abandonmentCost.FOOD} vivres payés. La garnison disparaît ; vos troupes restent sur place.`;
    log(s, message, 'REALM', now, [realmId], m);
    return message;
  }
  requireRule(!board.active, 'Terminez ou abandonnez votre mission avant d’en accepter une autre.');
  const offer = missionOffers(s, realmId, now).find((o) => o.id === action.payload.offerId);
  requireRule(offer, 'Cette offre a changé. Consultez les nouvelles missions.');
  const { center: p, spots } = missionSite(s, realmId, `${s.seed}:${realmId}:${offer.id}`, offer);
  const id = randomUUID();
  const m: ActiveMission = {
    ...offer,
    ...p,
    id,
    realmId,
    ownerId: `mission:${id}`,
    objectiveId: '',
    startedAt: now,
    distance: distance(p, r.capital),
  };
  board.active = m;
  const positions = [p, neighbors(p)[0], neighbors(p)[3]];
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
  for (const h of disk(p, radius)) writeTile(s, h, { ownerId: m.ownerId });
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
  const completed: string[] = [];
  for (const m of activeMissions(s)) {
    const r = s.realms[m.realmId];
    if (!r || r.defeatedAt) {
      clearMission(s, m.realmId);
      continue;
    }
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
    if (!trophies.some((t) => t.id === m.id)) trophies.push(trophy);
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
      .join(' · ')}. Médaille « ${trophy.medal.name} » décernée à ${r.name}.`;
    log(s, message, 'REALM', now, [m.realmId, ...alliedRealmIds(s, m.realmId)], m);
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
    const reply = resolveAttack(guard, attacker, Object.values(s.buildings));
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
    target.hp = Math.round((target.hp - damage) * 100) / 100;
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
      if ('population' in target) {
        delete s.buildings[target.id];
        writeTile(s, target, { buildingId: undefined });
        const owner = s.realms[target.ownerId];
        if (owner && distance(owner.capital, target) === 0) defeat(s, owner, now);
      } else if (!incapacitateHero(s, target, now)) delete s.units[target.id];
    }
    return message;
  }
  return '';
}
export function missionsView(s: GameState, realmId: string, now: number): MissionsView {
  const board = s.missions?.[realmId];
  const m = board?.active;
  const objective = m ? (s.units[m.objectiveId] ?? s.buildings[m.objectiveId]) : undefined;
  return {
    trophies: board?.trophies ?? [],
    offers: missionOffers(s, realmId, now),
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
          objectivePosition: objective ? { q: objective.q, r: objective.r } : m,
        }
      : undefined,
    allied: activeMissions(s)
      .filter((m) => m.realmId !== realmId && canFightMission(s, realmId, m))
      .map((m) => ({ ...m, reward: missionReward(m) })),
    lastResult: board?.lastResult,
  };
}
