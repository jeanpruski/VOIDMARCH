import { randomUUID } from 'node:crypto';
import { rollRareBonus } from './rarity';
import {
  ACTION_COST,
  isWall,
  isBuildable,
  RESOURCES,
  buildingConstructionCost,
  buildingUpgrade,
  trainingBonusAt,
  unitPopulation,
  RESOURCE_NAMES,
  RECON_UNITS,
  UNIT_PROFILES,
  GATHER_YIELD,
  BUILDING_REQUIREMENTS,
  BUILDING_POPULATION,
  BUILDINGS,
  CITY_LEVELS,
  RULES,
  TERRAINS,
  UNITS,
  type BuildingKind,
  type Faction,
  type Wallet,
} from '@voidmarch/config';
import {
  accrueEconomy,
  canGather,
  armyPopulation,
  amount,
  canAfford,
  createRealm,
  disk,
  distance,
  wallBlocks,
  demolitionRefund,
  estimateDamage,
  unitStats,
  findPath,
  hash,
  hostileReason,
  income,
  key,
  movementCost,
  neighbors,
  observe,
  publicTile,
  realmBuildings,
  realmTiles,
  realmUnits,
  realmValue,
  refreshAP,
  storage,
  tileAt,
  transfer,
  truceBetween,
  vision,
  writeTile,
  zeroWallet,
} from '@voidmarch/game-rules';
import type { Action } from '@voidmarch/protocol';
import type {
  ActionResult,
  Building,
  GameState,
  Hex,
  JournalEntry,
  Realm,
  RealmArchive,
  Unit,
  WorldView,
} from '@voidmarch/shared';
export interface EngineOptions {
  recruitBonus?: () => number;
  apInterval: number;
  grace: number;
  offlineProtection: boolean;
  botInterval: number;
}
export const defaultOptions: EngineOptions = {
  apInterval: RULES.apInterval,
  grace: RULES.grace,
  offlineProtection: false,
  botInterval: RULES.botInterval,
};
export class RuleError extends Error {}
export function requireRule(ok: unknown, message: string): asserts ok {
  if (!ok) throw new RuleError(message);
}
export function log(
  s: GameState,
  text: string,
  kind: JournalEntry['kind'],
  now: number,
  realmIds?: string[],
  p?: Hex,
) {
  s.journal.push({ id: randomUUID(), text, kind, at: now, realmIds, ...p });
  if (s.journal.length > 1000) s.journal.splice(0, s.journal.length - 1000);
}
export function spawnPosition(s: GameState, id: string): Hex {
  if (!Object.values(s.realms).some((r) => !r.defeatedAt)) return { q: 0, r: 0 };
  const candidates: { p: Hex; score: number }[] = [];
  for (let i = 0; i < 100; i++) {
    const ring = (18 + Math.floor(i / 12) * 9) * RULES.settlementScale,
      angle = i * 2.39996,
      p = { q: Math.round(Math.cos(angle) * ring), r: Math.round(Math.sin(angle) * ring) };
    const near = Object.values(s.realms).some(
      (r) => !r.defeatedAt && distance(r.capital, p) < RULES.realmSpacing,
    );
    if (near || disk(p, 3).some((t) => tileAt(s, t).ownerId)) continue;
    const terrain = disk(p, 4),
      score =
        terrain.filter((t) => ['PLAIN', 'FOREST', 'HILL'].includes(tileAt(s, t).terrain)).length +
        hash(`${id}:${i}`) * 15;
    candidates.push({ p, score });
  }
  requireRule(candidates.length, 'Aucune région libre. Réessayez dans un instant.');
  candidates.sort((a, b) => b.score - a.score);
  return candidates[Math.floor(hash(id) * Math.min(5, candidates.length))].p;
}
export function addBuilding(
  s: GameState,
  r: Realm,
  p: Hex,
  kind: BuildingKind,
  now: number,
  level = 1,
  constructionCost = buildingConstructionCost(kind, r.faction),
): Building {
  const b: Building = {
    constructionCost,
    ...p,
    id: randomUUID(),
    ownerId: r.id,
    kind,
    hp: BUILDINGS[kind].hp * level,
    level,
    population: BUILDING_POPULATION[kind] ?? 0,
    name: kind === 'VILLAGE' ? `${CITY_LEVELS[level]} de ${r.name}` : BUILDINGS[kind].name,
    createdAt: now,
    updatedAt: now,
  };
  s.buildings[b.id] = b;
  writeTile(s, p, { ownerId: r.id, buildingId: b.id });
  return b;
}
export function settle(s: GameState, r: Realm, now: number) {
  s.realms[r.id] = r;
  const at = (q: number, r0: number) => ({ q: r.capital.q + q, r: r.capital.r + r0 });
  for (const p of disk(r.capital, 2))
    writeTile(s, p, { ownerId: r.id, terrain: 'PLAIN', road: distance(r.capital, p) <= 1 });
  addBuilding(s, r, r.capital, 'VILLAGE', now, 3);
  addBuilding(s, r, at(-2, 1), 'FARM', now);
  writeTile(s, at(2, -1), { terrain: 'HILL' });
  addBuilding(s, r, at(2, -1), 'MINE', now);
  writeTile(s, at(-1, -1), { terrain: 'FOREST' });
  addBuilding(s, r, at(-1, -1), 'LUMBER', now);
  addBuilding(s, r, at(0, 2), 'VILLAGE', now);
  addBuilding(s, r, at(-1, 1), 'MARKET', now);
  addBuilding(s, r, at(1, 0), 'BARRACKS', now);
  const locations: Hex[] = [at(3, -1), at(1, 1), at(0, -1), at(-1, 0), at(2, 0), at(-2, 0)];
  (['SCOUT', 'INFANTRY', 'GUARD', 'ARCHER', 'KNIGHT', 'SIEGE'] as const).forEach((kind, i) => {
    const id = randomUUID(),
      unitKind = kind as keyof typeof UNITS;
    writeTile(s, locations[i], { terrain: 'PLAIN' });
    s.units[id] = {
      ...locations[i],
      id,
      ownerId: r.id,
      kind: unitKind,
      hp: UNITS[unitKind].hp,
      createdAt: now,
      updatedAt: now,
    };
  });
  for (const p of [at(-2, 1), at(0, 2), at(2, -1)]) writeTile(s, p, { road: true });
  observe(s, r, now);
  log(s, `${r.name} a hissé sa bannière dans les Marches.`, 'REALM', now, [r.id], r.capital);
}
export function settleFounding(s: GameState, r: Realm, now: number) {
  s.realms[r.id] = r;
  r.wallet = zeroWallet();
  writeTile(s, r.capital, {
    terrain: 'PLAIN',
    ownerId: r.id,
    buildingId: undefined,
    road: undefined,
    capture: undefined,
  });
  const resources = ['FOREST', 'HILL', 'PLAIN', 'RUINS', 'PLAIN', 'FOREST'] as const;
  neighbors(r.capital).forEach((p, i) => {
    if (!tileAt(s, p).ownerId && !tileAt(s, p).buildingId)
      writeTile(s, p, { terrain: resources[i] });
  });
  addBuilding(s, r, r.capital, 'CAMP', now, 1, {});
  observe(s, r, now);
  log(
    s,
    `${r.name} fonde un campement. Le premier paysan peut être recruté gratuitement.`,
    'REALM',
    now,
    [r.id],
    r.capital,
  );
}
export function addPlayer(
  s: GameState,
  id: string,
  name: string,
  faction: Faction,
  now: number,
  start: 'founding' | 'established' = 'founding',
) {
  if (s.realms[id]) return s.realms[id];
  const r = createRealm(id, name, faction, spawnPosition(s, id), now);
  if (start === 'founding') settleFounding(s, r, now);
  else settle(s, r, now);
  return r;
}
export function archive(s: GameState, r: Realm, now: number): RealmArchive {
  return {
    version: 1,
    createdAt: now,
    realmValue: realmValue(s, r.id),
    realm: structuredClone(r),
    units: structuredClone(realmUnits(s, r.id)),
    buildings: structuredClone(realmBuildings(s, r.id)),
    tiles: structuredClone(realmTiles(s, r.id)),
  };
}
/** Explicit administrative restart; never called by normal connection/return. */
export function restartRealm(s: GameState, id: string, now: number) {
  const previous = s.realms[id];
  requireRule(previous && !previous.bot, 'Royaume humain introuvable.');
  s.archives[id] = archive(s, previous, now);
  const footprint = realmTiles(s, id).map(key);
  removePresence(s, previous);
  for (const tileKey of footprint) delete s.tiles[tileKey];
  for (const proposal of Object.values(s.proposals))
    if ((proposal.from === id || proposal.to === id) && proposal.status === 'PENDING')
      proposal.status = 'CANCELLED';
  for (const treaty of Object.values(s.treaties))
    if (treaty.a === id || treaty.b === id) treaty.endsAt = Math.min(treaty.endsAt, now);
  for (const [caravanId, caravan] of Object.entries(s.caravans))
    if (caravan.ownerId === id || caravan.partnerId === id) delete s.caravans[caravanId];
  const fresh = createRealm(id, previous.name, previous.faction, previous.capital, now);
  fresh.settings = {
    ...previous.settings,
    tutorialCompleted: false,
    lastCameraQ: fresh.capital.q,
    lastCameraR: fresh.capital.r,
  };
  settleFounding(s, fresh, now);
  s.revision++;
  return fresh;
}
export function removePresence(s: GameState, r: Realm) {
  for (const u of realmUnits(s, r.id)) delete s.units[u.id];
  for (const b of realmBuildings(s, r.id)) delete s.buildings[b.id];
  for (const t of realmTiles(s, r.id))
    writeTile(s, t, { ownerId: undefined, buildingId: undefined, capture: undefined });
}
export function defeat(s: GameState, r: Realm, now: number) {
  if (r.defeatedAt) return;
  s.archives[r.id] = archive(s, r, now);
  removePresence(s, r);
  r.defeatedAt = now;
  log(
    s,
    `${r.name} est tombé. Les survivants pourront rebâtir un royaume dans dix minutes.`,
    'COMBAT',
    now,
    [r.id],
  );
}
function targetAt(s: GameState, id: string): Unit | Building | undefined {
  return s.units[id] ?? s.buildings[id];
}
function ownedUnit(s: GameState, r: Realm, id: string) {
  const u = s.units[id];
  requireRule(u && u.ownerId === r.id && u.hp > 0, 'Sélectionnez une de vos unités vivantes.');
  return u;
}
function ownedBuilding(s: GameState, r: Realm, id: string) {
  const b = s.buildings[id];
  requireRule(b && b.ownerId === r.id, 'Ce bâtiment ne vous appartient pas.');
  return b;
}
function pay(r: Realm, cost: Partial<Wallet>) {
  requireRule(canAfford(r.wallet, cost), 'Ressources insuffisantes.');
  transfer(r.wallet, cost, -1);
}
function spend(r: Realm, cost = 1) {
  if (r.unlimitedAP) return;
  requireRule(r.ap >= cost, `Cette action demande ${cost} PA.`);
  r.ap -= cost;
}
function hostile(s: GameState, a: Realm, owner: string, now: number, options: EngineOptions) {
  const b = s.realms[owner];
  if (!b) return;
  requireRule(a.id !== b.id, 'Vous ne pouvez pas attaquer votre royaume.');
  const reason = hostileReason(s, a, b, now, options.offlineProtection);
  requireRule(!reason, reason ?? 'Attaque impossible.');
  a.protectedUntil = 0;
}
function updateDefeat(s: GameState, owner: string, position: Hex, now: number) {
  const r = s.realms[owner];
  if (
    r &&
    distance(r.capital, position) === 0 &&
    !realmBuildings(s, owner).some((b) => distance(b, r.capital) === 0)
  )
    defeat(s, r, now);
}
export function applyAction(
  s: GameState,
  id: string,
  a: Action,
  now: number,
  options: EngineOptions = defaultOptions,
): ActionResult {
  const r = s.realms[id];
  requireRule(r, 'Royaume introuvable.');
  refreshAP(r, now, options.apInterval);
  accrueEconomy(s, r, now, options.grace);
  requireRule(
    !r.defeatedAt || a.type === 'RESPAWN' || a.type === 'RESPOND',
    'Votre royaume doit d’abord être reconstruit.',
  );
  let message = 'Ordre exécuté.';
  const spendAction = (override?: number) => spend(r, override ?? ACTION_COST[a.type]);
  switch (a.type) {
    case 'MOVE': {
      const u = ownedUnit(s, r, a.actorId),
        max = UNITS[u.kind].move + (r.faction === 'IRON' && UNIT_PROFILES[u.kind].mounted ? 1 : 0);
      let cursor: Hex = u,
        cost = 0;
      const seen = vision(s, r);
      for (const p of a.payload.path) {
        requireRule(distance(cursor, p) === 1, 'Le chemin doit suivre des hexagones voisins.');
        requireRule(
          seen.has(key(p)) || r.explored[key(p)],
          'Explorez cette région avant de la traverser.',
        );
        const t = tileAt(s, p);
        requireRule(
          !wallBlocks(t.buildingId ? s.buildings[t.buildingId] : undefined, id),
          'Un rempart ennemi bloque le passage. Détruisez-le ou contournez-le.',
        );
        cost += movementCost(t, u.kind);
        requireRule(cost <= max, 'Ce chemin dépasse la capacité de déplacement.');
        requireRule(
          !Object.values(s.units).some((other) => other.id !== u.id && distance(other, p) === 0),
          'Ce chemin est bloqué.',
        );
        cursor = p;
      }
      spendAction();
      Object.assign(u, cursor, { updatedAt: now });
      message = `${UNITS[u.kind].name} en position.`;
      break;
    }
    case 'GATHER': {
      const u = ownedUnit(s, r, a.actorId),
        resource = a.payload.resource;
      requireRule(u.kind === 'PEASANT', 'Seuls les paysans peuvent récolter.');
      const accessible = canGather(tileAt(s, u), id, resource);
      requireRule(
        accessible,
        'Placez le paysan sur un terrain adapté à cette ressource, neutre ou à vous.',
      );
      const received = Math.min(
        GATHER_YIELD[resource],
        Math.max(0, storage(s, id) - r.wallet[resource]),
      );
      requireRule(received > 0, 'Votre stockage est plein pour cette ressource.');
      spendAction();
      r.wallet[resource] += received;
      message = `Récolte : +${received} ${RESOURCE_NAMES[resource].toLowerCase()}.`;
      log(s, message, 'ECONOMY', now, [id], u);
      break;
    }
    case 'ATTACK': {
      const u = ownedUnit(s, r, a.actorId),
        target = targetAt(s, a.payload.targetId);
      requireRule(UNITS[u.kind].attack > 0, 'Cette unité ne peut pas attaquer.');
      requireRule(target && vision(s, r).has(key(target)), 'Cible indisponible.');
      const cover = tileAt(s, target).buildingId;
      const coveringWall = cover ? s.buildings[cover] : undefined;
      requireRule(
        target.id === coveringWall?.id || !wallBlocks(coveringWall, id),
        'Détruisez d’abord le rempart qui protège cette unité.',
      );
      requireRule(distance(u, target) <= UNITS[u.kind].range, 'La cible est hors de portée.');
      hostile(s, r, target.ownerId, now, options);
      spendAction(UNIT_PROFILES[u.kind].siege ? 2 : ACTION_COST.ATTACK);
      const bounds = estimateDamage(u, target, tileAt(s, target)),
        damage = bounds.min + Math.floor(hash(a.actionId) * (bounds.max - bounds.min + 1));
      target.hp = Math.round((target.hp - damage) * 100) / 100;
      target.updatedAt = now;
      message = `${UNITS[u.kind].name} inflige ${damage} dégâts.`;
      log(
        s,
        `${r.name} attaque ${s.realms[target.ownerId]?.name ?? 'une fortification'} : ${damage} dégâts.`,
        'COMBAT',
        now,
        [id, target.ownerId],
        target,
      );
      if (target.hp <= 0) {
        if ('population' in target) {
          delete s.buildings[target.id];
          writeTile(s, target, { buildingId: undefined });
          updateDefeat(s, target.ownerId, target, now);
        } else delete s.units[target.id];
        r.progression.battles++;
        message += ' Cible détruite.';
      }
      break;
    }
    case 'CAPTURE': {
      const u = ownedUnit(s, r, a.actorId),
        t = tileAt(s, u);
      requireRule(UNITS[u.kind].capture > 0, 'Cette unité ne peut pas revendiquer de territoire.');
      requireRule(t.ownerId !== id, 'Cet hexagone vous appartient déjà.');
      requireRule(
        !t.buildingId || !isWall(s.buildings[t.buildingId]?.kind ?? ''),
        'Les remparts ne peuvent pas être capturés : détruisez-les pour ouvrir une brèche.',
      );
      requireRule(
        u.kind !== 'PEASANT' || (!t.ownerId && !t.buildingId),
        'Les paysans ne revendiquent que les terres neutres sans bâtiment.',
      );
      if (t.ownerId) hostile(s, r, t.ownerId, now, options);
      spendAction();
      const b = t.buildingId ? s.buildings[t.buildingId] : undefined,
        needed = b
          ? b.kind === 'VILLAGE'
            ? b.level + 1
            : BUILDINGS[b.kind].capture
          : t.poi
            ? 3
            : 1;
      const points = (t.capture?.by === id ? t.capture.points : 0) + UNITS[u.kind].capture;
      if (points >= needed) {
        const previous = t.ownerId;
        writeTile(s, u, { ownerId: id, capture: undefined });
        if (b) {
          b.constructionCost ??= demolitionRefund(b, s.realms[b.ownerId]?.faction ?? r.faction);
          b.ownerId = id;
          b.updatedAt = now;
          if (previous) updateDefeat(s, previous, b, now);
        }
        message = 'Un nouvel hexagone rejoint votre royaume.';
        log(s, message, 'REALM', now, previous ? [id, previous] : [id], u);
      } else {
        writeTile(s, u, { capture: { by: id, points } });
        message = `Capture en cours : ${points}/${needed}.`;
      }
      break;
    }
    case 'BUILD': {
      const p = a.payload,
        t = tileAt(s, p);
      requireRule(
        isBuildable(p.kind),
        'Construisez une palissade, puis améliorez-la en pierre et en acier.',
      );
      const builder = s.units[a.actorId];
      const frontier =
        builder?.ownerId === id &&
        UNIT_PROFILES[builder.kind].builder &&
        distance(builder, p) <= 1 &&
        !t.ownerId &&
        realmBuildings(s, id).some((b) => distance(b, p) <= RULES.constructionRadius);
      requireRule(
        t.ownerId === id || frontier,
        'Construisez sur vos terres ou avec un bâtisseur près du chantier, à 3 cases maximum de vos bâtiments.',
      );
      const missing = (BUILDING_REQUIREMENTS[p.kind] ?? []).find(
        (kind) => !realmBuildings(s, id).some((b) => b.kind === kind),
      );
      requireRule(!missing, missing ? `${BUILDINGS[missing].name} nécessaire.` : '');
      requireRule(!t.buildingId, 'Un bâtiment occupe déjà cet hexagone.');
      requireRule(
        !Object.values(s.units).some((u) => u.ownerId !== id && distance(u, p) === 0),
        'Une unité adverse occupe ce terrain.',
      );
      requireRule(
        BUILDINGS[p.kind].terrains.includes(t.terrain),
        'Ce terrain ne convient pas à ce bâtiment.',
      );
      spendAction();
      const cost = buildingConstructionCost(p.kind, r.faction);
      pay(r, cost);
      addBuilding(s, r, p, p.kind, now, 1, cost);
      r.progression.development++;
      message = `Construction terminée : ${BUILDINGS[p.kind].name}.`;
      log(s, message, 'ECONOMY', now, [id], p);
      break;
    }
    case 'ROAD': {
      const t = tileAt(s, a.payload);
      requireRule(t.ownerId === id, 'La route doit être sur votre territoire.');
      requireRule(!t.road, 'Une route traverse déjà cet hexagone.');
      spendAction();
      pay(r, { WOOD: t.terrain === 'RIVER' ? 30 : 10, IRON: t.terrain === 'RIVER' ? 10 : 0 });
      writeTile(s, t, { road: true });
      message = t.terrain === 'RIVER' ? 'Pont construit.' : 'Route construite.';
      break;
    }
    case 'RECRUIT': {
      const b = ownedBuilding(s, r, a.actorId);
      const profile = UNIT_PROFILES[a.payload.kind];
      requireRule(profile.recruitAt.includes(b.kind), 'Ce bâtiment ne forme pas cette unité.');
      const missing = profile.requires.find(
        (kind) => !realmBuildings(s, id).some((x) => x.kind === kind),
      );
      requireRule(
        !missing,
        missing ? `${BUILDINGS[missing].name} nécessaire pour cette unité.` : '',
      );
      const freePeasant =
        a.payload.kind === 'PEASANT' && !realmUnits(s, id).some((u) => u.kind === 'PEASANT');
      const population = realmBuildings(s, id).reduce((v, x) => v + x.population, 0);
      requireRule(
        freePeasant ||
          armyPopulation(realmUnits(s, id)) + unitPopulation(a.payload.kind) <=
            Math.max(15, population),
        'La population ne permet pas de recruter davantage.',
      );
      const p = [b, ...neighbors(b)].find(
        (p) =>
          tileAt(s, p).ownerId === id &&
          !wallBlocks(s.buildings[tileAt(s, p).buildingId ?? ''], id) &&
          movementCost(tileAt(s, p), a.payload.kind) <= UNITS[a.payload.kind].move &&
          !Object.values(s.units).some((u) => distance(u, p) === 0),
      );
      requireRule(p, 'Aucun hexagone libre à proximité.');
      spendAction();
      if (!freePeasant) pay(r, UNITS[a.payload.kind].cost);
      const uid = randomUUID();
      const rareBonus = (options.recruitBonus ?? rollRareBonus)();
      const trainingBonus = profile.builder
        ? 0
        : Math.max(
            0,
            ...realmBuildings(s, id)
              .filter((x) => profile.recruitAt.includes(x.kind))
              .map((x) => trainingBonusAt(x.kind, x.level)),
          );
      s.units[uid] = {
        ...(rareBonus ? { rareBonus } : {}),
        ...(trainingBonus ? { trainingBonus } : {}),
        q: p.q,
        r: p.r,
        id: uid,
        ownerId: id,
        kind: a.payload.kind,
        hp: unitStats({ kind: a.payload.kind, rareBonus, trainingBonus }).hp,
        createdAt: now,
        updatedAt: now,
      };
      message = `${UNITS[a.payload.kind].name}${rareBonus ? ` rare (+${rareBonus} %)` : ''} a rejoint votre armée.`;
      break;
    }
    case 'REPAIR': {
      const target = targetAt(s, a.actorId);
      requireRule(
        target?.ownerId === id,
        'Sélectionnez une unité ou un bâtiment de votre royaume.',
      );
      const max =
        'population' in target ? BUILDINGS[target.kind].hp * target.level : unitStats(target).hp;
      requireRule(target.hp < max, 'La santé est déjà au maximum.');
      spendAction();
      pay(r, {
        STONE: 0,
        GOLD: 10,
        WOOD: 'population' in target ? 15 : 0,
        FOOD: 'population' in target || UNIT_PROFILES[target.kind].mechanical ? 0 : 10,
        IRON: !('population' in target) && UNIT_PROFILES[target.kind].mechanical ? 10 : 0,
      });
      target.hp = Math.round(Math.min(max, target.hp + Math.ceil(max * 0.5)) * 100) / 100;
      target.updatedAt = now;
      message = 'Réparations et soins terminés.';
      break;
    }
    case 'DEMOLISH': {
      const b = ownedBuilding(s, r, a.actorId);
      requireRule(
        distance(b, r.capital) !== 0,
        'Le bâtiment de votre capitale ne peut pas être démoli.',
      );
      const refund = demolitionRefund(b, r.faction);
      spendAction();
      delete s.buildings[b.id];
      writeTile(s, b, { buildingId: undefined, capture: undefined });
      // Preserve the entire refund, even if demolishing a warehouse lowers capacity.
      // Economy already pauses positive production while a resource exceeds its cap.
      transfer(r.wallet, refund);
      const received = RESOURCES.filter((resource) => (refund[resource] ?? 0) > 0)
        .map((resource) => `+${refund[resource]} ${RESOURCE_NAMES[resource].toLowerCase()}`)
        .join(', ');
      message = `${BUILDINGS[b.kind].name} démoli.${received ? ` Ressources récupérées : ${received}.` : ' Aucune ressource à rembourser.'}`;
      log(s, message, 'ECONOMY', now, [id], b);
      break;
    }
    case 'UPGRADE': {
      const b = ownedBuilding(s, r, a.actorId);
      const upgrade = buildingUpgrade(b.kind, b.level);
      requireRule(upgrade, 'Ce bâtiment ne peut plus évoluer.');
      b.constructionCost ??= demolitionRefund(b, r.faction);
      requireRule(
        b.population >= upgrade.population,
        `${upgrade.population} habitants sont nécessaires.`,
      );
      if (b.kind === 'CAMP') {
        spendAction();
        pay(r, upgrade.cost);
        b.kind = 'OUTPOST';
        b.level = 1;
        b.hp = BUILDINGS.OUTPOST.hp;
        b.population = Math.max(10, b.population);
        b.name = BUILDINGS.OUTPOST.name;
        b.updatedAt = now;
        r.progression.development++;
        message = 'Votre campement devient un avant-poste.';
        break;
      }
      if (b.kind === 'OUTPOST') {
        requireRule(b.population >= 10, '10 habitants sont nécessaires.');
        spendAction();
        pay(r, upgrade.cost);
        b.kind = 'VILLAGE';
        b.level = 1;
        b.hp = BUILDINGS.VILLAGE.hp;
        b.population = Math.max(15, b.population);
        b.name = `Village de ${r.name}`;
        b.updatedAt = now;
        r.progression.development++;
        message = 'Votre avant-poste devient un village.';
        break;
      }
      spendAction();
      pay(r, upgrade.cost);
      b.kind = upgrade.kind;
      b.level = upgrade.level;
      b.hp = BUILDINGS[b.kind].hp * b.level;
      b.name =
        b.kind === 'VILLAGE' ? `${CITY_LEVELS[b.level]} de ${r.name}` : BUILDINGS[b.kind].name;
      b.updatedAt = now;
      const training = trainingBonusAt(b.kind, b.level);
      let trained = 0;
      for (const u of realmUnits(s, id)) {
        if (
          UNIT_PROFILES[u.kind].builder ||
          !UNIT_PROFILES[u.kind].recruitAt.includes(b.kind) ||
          (u.trainingBonus ?? 0) >= training
        )
          continue;
        const healthRatio = u.hp / unitStats(u).hp;
        u.trainingBonus = training;
        u.hp = Math.round(unitStats(u).hp * healthRatio * 100) / 100;
        u.updatedAt = now;
        trained++;
      }
      r.progression.development++;
      message = `${upgrade.name} : amélioration terminée.${trained ? ` ${trained} unités améliorées (+${training} % d’entraînement).` : ''}`;
      break;
    }
    case 'ABILITY': {
      const u = ownedUnit(s, r, a.actorId);
      if (a.payload.ability === 'MEND') {
        requireRule(UNIT_PROFILES[u.kind].healer, 'Cette unité ne peut pas soigner les autres.');
        const allies = realmUnits(s, id).filter(
          (x) => distance(x, u) <= 2 && !UNIT_PROFILES[x.kind].mechanical && x.hp < unitStats(x).hp,
        );
        requireRule(allies.length, 'Aucun allié blessé à proximité.');
        spendAction(1);
        for (const ally of allies) {
          ally.hp =
            Math.round(
              Math.min(unitStats(ally).hp, ally.hp + (u.kind === 'HEALER' ? 6 : 3)) * 100,
            ) / 100;
          ally.updatedAt = now;
        }
        message = 'Les alliés proches ont été soignés.';
        break;
      }
      if (a.payload.ability === 'RESTORE') {
        requireRule(u.kind === 'ENGINEER', 'Seul un ingénieur peut réparer les bâtiments proches.');
        const buildings = realmBuildings(s, id).filter(
          (b) => distance(b, u) <= 1 && b.hp < BUILDINGS[b.kind].hp * b.level,
        );
        requireRule(buildings.length, 'Aucun bâtiment endommagé à proximité.');
        spendAction();
        pay(r, { WOOD: 5 });
        for (const b of buildings) {
          b.hp = Math.min(BUILDINGS[b.kind].hp * b.level, b.hp + 20);
          b.updatedAt = now;
        }
        message = 'Les bâtiments proches ont été réparés.';
        break;
      }
      spendAction();
      if (a.payload.ability === 'RALLY') {
        pay(r, { FOOD: 15 });
        for (const ally of realmUnits(s, id).filter(
          (ally) => distance(ally, u) <= 2 && !UNIT_PROFILES[ally.kind].mechanical,
        ))
          ally.hp = Math.round(Math.min(unitStats(ally).hp, ally.hp + 3) * 100) / 100;
        message = 'Ralliement : les unités proches récupèrent 3 points de vie.';
      } else {
        requireRule(
          RECON_UNITS.includes(u.kind),
          'Cette unité ne peut pas reconnaître les environs.',
        );
        const visible = new Set(disk(u, 10).map(key));
        for (const p of disk(u, 10))
          r.explored[key(p)] = { ...publicTile(s, p, visible, r.explored), visibility: 'EXPLORED' };
        message = 'Les environs ont été cartographiés.';
      }
      break;
    }
    case 'INTERACT': {
      const u = ownedUnit(s, r, a.actorId);
      if (a.payload.caravanId) {
        requireRule(UNITS[u.kind].attack > 0, 'Cette unité ne peut pas intercepter de caravane.');
        const c = s.caravans[a.payload.caravanId];
        requireRule(
          c && vision(s, r).has(key(c)) && distance(u, c) <= 1,
          'Caravane hors de portée.',
        );
        hostile(s, r, c.ownerId, now, options);
        if (c.partnerId !== id && s.realms[c.partnerId]) hostile(s, r, c.partnerId, now, options);
        spendAction();
        transfer(r.wallet, c.cargo);
        delete s.caravans[c.id];
        message = `Cargaison récupérée : ${rewardText(c.cargo)}.`;
        log(s, message, 'COMBAT', now, [id, c.ownerId, c.partnerId], u);
      } else if (a.payload.eventId) {
        const e = s.events[a.payload.eventId];
        requireRule(
          e && e.endsAt > now && !e.claimedBy && vision(s, r).has(key(e)) && distance(u, e) <= 1,
          'Ce lieu est inaccessible ou déjà exploré.',
        );
        spendAction();
        e.claimedBy = id;
        transfer(r.wallet, e.reward);
        if (e.relic) r.relics.push(e.relic);
        message = `${e.title} : ${rewardText(e.reward)}${e.relic ? ` · Relique : ${e.relic}` : ''}.`;
        log(s, message, 'WORLD', now, [id], e);
      } else {
        const t = tileAt(s, u);
        requireRule(t.poi && !t.exhausted, 'Aucune découverte disponible ici.');
        spendAction();
        writeTile(s, t, { exhausted: true });
        transfer(r.wallet, { GOLD: t.poi === 'MYTHIC' ? 100 : 35, IRON: 15 });
        if (t.poi === 'MYTHIC' || t.poi === 'RARE') r.relics.push(`Fragment de ${key(u)}`);
        message = `Ruines explorées : +${t.poi === 'MYTHIC' ? 100 : 35} or · +15 fer${t.poi === 'MYTHIC' || t.poi === 'RARE' ? ' · Fragment antique obtenu' : ''}.`;
      }
      break;
    }
    case 'PROPOSE': {
      const p = a.payload,
        target = s.realms[p.to];
      requireRule(
        target && !target.defeatedAt && target.id !== id,
        'Choisissez un autre royaume actif.',
      );
      requireRule(p.payer === id || p.payer === p.to, 'Le payeur doit participer à l’accord.');
      requireRule(amount(p.offer) > 0, 'Proposez au moins une ressource.');
      if (p.kind === 'TRIBUTE')
        requireRule(
          amount(p.request) === 0,
          'Un tribut ne contient pas de contrepartie marchande.',
        );
      if (p.kind === 'TRADE') {
        requireRule(p.payer === id, 'Vous devez fournir les ressources proposées.');
        requireRule(
          realmBuildings(s, id).some((b) => b.kind === 'MARKET'),
          'Construisez un marché pour commercer.',
        );
      }
      requireRule(
        Object.values(s.proposals).filter((x) => x.from === id && x.status === 'PENDING').length <
          10,
        'Dix propositions sont déjà en attente.',
      );
      if (p.parentId) {
        const parent = s.proposals[p.parentId];
        requireRule(
          parent && parent.to === id && parent.from === p.to && parent.status === 'PENDING',
          'Cette proposition ne peut plus être négociée.',
        );
        parent.status = 'REJECTED';
      }
      const pid = randomUUID();
      s.proposals[pid] = {
        id: pid,
        from: id,
        to: p.to,
        payer: p.payer,
        kind: p.kind,
        offer: p.offer,
        request: p.request,
        duration: p.duration,
        status: 'PENDING',
        createdAt: now,
        expiresAt: now + 86_400_000,
        parentId: p.parentId,
      };
      message = 'Proposition envoyée. Elle prendra effet après acceptation.';
      log(
        s,
        `${r.name} propose ${p.kind === 'TRIBUTE' ? 'un tribut contre une trêve' : 'un accord commercial'}.`,
        'DIPLOMACY',
        now,
        [id, p.to],
      );
      break;
    }
    case 'RESPOND': {
      const p = s.proposals[a.payload.proposalId];
      requireRule(
        p && p.status === 'PENDING' && p.expiresAt > now,
        'Cette proposition n’est plus disponible.',
      );
      requireRule(
        a.payload.decision === 'CANCEL' ? p.from === id : p.to === id,
        'Vous ne pouvez pas répondre à cette proposition.',
      );
      if (a.payload.decision !== 'ACCEPT') {
        p.status = a.payload.decision === 'CANCEL' ? 'CANCELLED' : 'REJECTED';
        message = 'Proposition clôturée.';
        break;
      }
      const from = s.realms[p.from],
        to = s.realms[p.to];
      requireRule(
        from && !from.defeatedAt && to && !to.defeatedAt,
        'Un des royaumes n’est plus actif.',
      );
      const payer = s.realms[p.payer],
        receiver = payer.id === from.id ? to : from;
      requireRule(
        canAfford(payer.wallet, p.offer) && canAfford(receiver.wallet, p.request),
        'Un des royaumes ne possède plus les ressources convenues.',
      );
      transfer(payer.wallet, p.offer, -1);
      transfer(receiver.wallet, p.offer);
      transfer(receiver.wallet, p.request, -1);
      transfer(payer.wallet, p.request);
      p.status = 'ACCEPTED';
      const tid = randomUUID();
      s.treaties[tid] = {
        id: tid,
        a: p.from,
        b: p.to,
        kind: p.kind === 'TRIBUTE' ? 'TRUCE' : 'TRADE',
        startsAt: now,
        endsAt: now + p.duration,
        payment: p.offer,
        proposalId: p.id,
        nextCaravanAt: now + 120_000,
      };
      from.progression.commerce += amount(p.offer);
      to.progression.commerce += amount(p.offer);
      message =
        p.kind === 'TRIBUTE'
          ? 'Tribut versé. La trêve protège les deux royaumes.'
          : 'Échange effectué. La route commerciale est ouverte.';
      for (const participant of [payer, receiver]) {
        const gains = participant.id === receiver.id ? p.offer : p.request;
        log(
          s,
          `${message}${amount(gains) > 0 ? ` Reçu : ${rewardText(gains)}.` : ''}`,
          'DIPLOMACY',
          now,
          [participant.id],
        );
      }
      const received = id === receiver.id ? p.offer : p.request;
      if (amount(received) > 0) message += ` Reçu : ${rewardText(received)}.`;
      break;
    }
    case 'RESPAWN': {
      requireRule(
        r.defeatedAt && now >= r.defeatedAt + RULES.defeatCooldown,
        'Les survivants se rassemblent encore (10 minutes après la défaite).',
      );
      const saved = s.archives[id];
      requireRule(saved, 'Sauvegarde du royaume introuvable.');
      const position = spawnPosition(s, id),
        original = saved.realm.capital;
      removePresence(s, r);
      const translate = (p: Hex) => ({
        q: position.q + p.q - original.q,
        r: position.r + p.r - original.r,
      });
      r.wallet = Object.fromEntries(
        Object.entries(saved.realm.wallet).map(([k, v]) => [k, Math.floor(v * 0.75)]),
      ) as Wallet;
      r.capital = position;
      r.defeatedAt = undefined;
      r.protectedUntil = now + RULES.protection;
      r.economyAt = now;
      r.lastSeen = now;
      r.offlineAt = undefined;
      for (const t of saved.tiles)
        writeTile(s, translate(t), {
          ...t,
          ...translate(t),
          buildingId: undefined,
          capture: undefined,
        });
      const count = Math.max(1, Math.floor(saved.buildings.length * 0.75));
      for (const b of saved.buildings.slice(0, count)) {
        const bid = randomUUID();
        s.buildings[bid] = {
          ...b,
          ...translate(b),
          id: bid,
          hp: BUILDINGS[b.kind].hp * b.level,
          updatedAt: now,
        };
        writeTile(s, s.buildings[bid], { ownerId: id, buildingId: bid });
      }
      if (!realmBuildings(s, id).some((b) => distance(b, position) === 0))
        addBuilding(s, r, position, 'VILLAGE', now);
      for (const u of saved.units.slice(0, Math.max(1, Math.floor(saved.units.length * 0.75)))) {
        const uid = randomUUID();
        s.units[uid] = { ...u, ...translate(u), id: uid, hp: unitStats(u).hp, updatedAt: now };
      }
      if (!realmUnits(s, id).length) {
        const uid = randomUUID();
        s.units[uid] = {
          ...position,
          id: uid,
          ownerId: id,
          kind: 'INFANTRY',
          hp: 10,
          createdAt: now,
          updatedAt: now,
        };
      }
      message = 'Votre royaume reprend forme dans une nouvelle région.';
      log(s, message, 'REALM', now, [id], position);
      break;
    }
  }
  observe(s, r, now);
  s.revision++;
  return {
    actionId: a.actionId,
    accepted: true,
    message,
    serverTimestamp: now,
    newActionPoints: r.ap,
    revision: s.revision,
  };
}
// Callers commit only the returned copy. Rejected commands never retain partial mutations.
export function execute(
  s: GameState,
  id: string,
  a: Action,
  now: number,
  options = defaultOptions,
): { state: GameState; result: ActionResult } {
  const draft = structuredClone(s);
  try {
    return { state: draft, result: applyAction(draft, id, a, now, options) };
  } catch (e) {
    if (!(e instanceof RuleError)) throw e;
    return {
      state: s,
      result: {
        actionId: a.actionId,
        accepted: false,
        reason: e.message,
        serverTimestamp: now,
        newActionPoints: s.realms[id]?.ap ?? 0,
      },
    };
  }
}

export function worldView(s: GameState, id: string, now: number, chunks: Hex[] = []): WorldView {
  const r = s.realms[id];
  requireRule(r, 'Royaume introuvable.');
  const visible = vision(s, r);
  const selectedChunks = chunks.length
    ? chunks
    : [{ q: Math.floor(r.capital.q / 32), r: Math.floor(r.capital.r / 32) }];
  const positions = new Map<string, Hex>();
  for (const c of selectedChunks)
    for (let q = c.q * 32; q < (c.q + 1) * 32; q++)
      for (let z = c.r * 32; z < (c.r + 1) * 32; z++) positions.set(key({ q, r: z }), { q, r: z });
  // Own assets remain selectable even when the camera subscribes to distant chunks.
  for (const p of [...realmUnits(s, id), ...realmTiles(s, id)])
    positions.set(key(p), { q: p.q, r: p.r });
  const {
    explored: _explored,
    nextBotAt: _botAt,
    lastSeen: _seen,
    economyAt: _economy,
    apAt: _apAt,
    ...player
  } = r;
  const apCopy = { ap: r.ap, apAt: r.apAt };
  refreshAP(apCopy, now);
  const realms = Object.values(s.realms).map((x) => ({
    id: x.id,
    name: x.name,
    faction: x.faction,
    bot: x.bot,
    online: !x.offlineAt && x.lastSeen + RULES.grace > now,
    protectedUntil: x.protectedUntil,
    emblem: x.settings.emblem,
    color: x.settings.bannerColor,
    bannerShape: x.settings.bannerShape,
    defeated: !!x.defeatedAt,
    stats: {
      territory: realmTiles(s, x.id).length,
      military: realmUnits(s, x.id).reduce((a, u) => a + unitStats(u).attack + u.hp, 0),
      wealth: Math.floor(amount(x.wallet)),
      population: Math.floor(realmBuildings(s, x.id).reduce((a, b) => a + b.population, 0)),
      development: x.progression.development,
      exploration: x.progression.exploration,
      commerce: Math.floor(x.progression.commerce),
      relics: x.relics.length,
    },
  }));
  const onlineHumans = realms.filter((x) => !x.bot && x.online).length;
  return {
    revision: s.revision,
    serverTimestamp: now,
    seed: s.seed,
    player: {
      ...player,
      ap: apCopy.ap,
      nextAPAt: apCopy.apAt + RULES.apInterval,
      income: income(s, id),
      capacity: storage(s, id),
      population: Math.floor(realmBuildings(s, id).reduce((a, b) => a + b.population, 0)),
      realmValue: realmValue(s, id),
    },
    overview: Object.values(r.explored).map((p) => {
      const t = publicTile(s, p, visible, r.explored);
      return { q: t.q, r: t.r, terrain: t.terrain, ownerId: t.ownerId, visibility: t.visibility };
    }),
    tiles: [...positions.values()].map((p) => publicTile(s, p, visible, r.explored)),
    units: Object.values(s.units).filter((u) => u.ownerId === id || visible.has(key(u))),
    realms,
    proposals: Object.values(s.proposals).filter((p) => p.from === id || p.to === id),
    treaties: Object.values(s.treaties).filter((t) => t.a === id || t.b === id),
    caravans: Object.values(s.caravans).filter(
      (c) => c.ownerId === id || c.partnerId === id || visible.has(key(c)),
    ),
    events: Object.values(s.events).filter(
      (e) => !e.claimedBy && e.endsAt > now && (e.global || visible.has(key(e))),
    ),
    journal: s.journal
      .filter((j) =>
        j.realmIds ? j.realmIds.includes(id) : j.q === undefined || visible.has(key(j as Hex)),
      )
      .slice(-80)
      .reverse(),
    onlineHumans,
    botsAwake: onlineHumans > 0,
  };
}

function rewardText(reward: Partial<Wallet>) {
  return (
    Object.entries(reward)
      .filter(([, value]) => value > 0)
      .map(
        ([resource, value]) =>
          `+${value} ${RESOURCE_NAMES[resource as keyof Wallet].toLowerCase()}`,
      )
      .join(' · ') || 'Aucune ressource'
  );
}
