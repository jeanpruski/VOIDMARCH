import {
  BUILDINGS,
  BUILDING_DEFENSE,
  BUILDING_POPULATION,
  UNIT_PROFILES,
  TERRAIN_RESOURCES,
  unitPopulation,
  unitUpkeep,
  productionOnTerrain,
  type UnitKind,
  type Resource,
  DEFAULT_SETTINGS,
  FACTIONS,
  RULES,
  TERRAINS,
  UNITS,
  type Faction,
  type Wallet,
  type Terrain,
} from '@voidmarch/config';
import type { Building, GameState, Hex, Realm, Tile, Unit, ViewTile } from '@voidmarch/shared';
export const key = (p: Hex) => `${p.q},${p.r}`;
export const unkey = (s: string): Hex => {
  const [q, r] = s.split(',').map(Number);
  return { q, r };
};
export const distance = (a: Hex, b: Hex) =>
  (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
export const DIRECTIONS: Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];
export const neighbors = (p: Hex) => DIRECTIONS.map((d) => ({ q: p.q + d.q, r: p.r + d.r }));
export function disk(p: Hex, radius: number): Hex[] {
  const out: Hex[] = [];
  for (let q = -radius; q <= radius; q++)
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++)
      out.push({ q: p.q + q, r: p.r + r });
  return out;
}
export const chunkOf = (p: Hex) => ({
  q: Math.floor(p.q / RULES.chunkSize),
  r: Math.floor(p.r / RULES.chunkSize),
});
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function generateTile(seed: string, p: Hex): Tile {
  const n = hash(`${seed}:${key(p)}`),
    region = hash(`${seed}:${Math.floor(p.q / 6)},${Math.floor(p.r / 6)}`);
  const river = Math.abs(p.r - Math.round(5 + Math.sin(p.q / 7) * 3)) === 0;
  let terrain: Terrain = river
    ? 'RIVER'
    : n < 0.035
      ? 'RUINS'
      : n < 0.05
        ? 'MARSH'
        : region > 0.78 && n > 0.35
          ? 'MOUNTAIN'
          : n > 0.8
            ? 'HILL'
            : n > 0.52 || region < 0.2
              ? 'FOREST'
              : 'PLAIN';
  if (n < 0.004) terrain = 'ALIEN';
  else if (n < 0.012) terrain = 'CORRUPTION';
  return {
    ...p,
    terrain,
    ...(terrain === 'RUINS'
      ? { poi: n < 0.01 ? ('RARE' as const) : ('COMMON' as const) }
      : terrain === 'ALIEN'
        ? { poi: 'MYTHIC' as const }
        : {}),
  };
}
export const tileAt = (s: GameState, p: Hex): Tile => s.tiles[key(p)] ?? generateTile(s.seed, p);
export function writeTile(s: GameState, p: Hex, patch: Partial<Tile>): Tile {
  const t = { ...tileAt(s, p), ...patch };
  s.tiles[key(p)] = t;
  return t;
}
export const zeroWallet = (): Wallet => ({ STONE: 0, GOLD: 0, WOOD: 0, IRON: 0, FOOD: 0 });
export const canAfford = (wallet: Wallet, cost: Partial<Wallet>) =>
  Object.entries(cost).every(([k, v]) => wallet[k as keyof Wallet] >= v);
export function transfer(wallet: Wallet, amount: Partial<Wallet>, sign = 1) {
  for (const [k, v] of Object.entries(amount)) wallet[k as keyof Wallet] += v * sign;
}
export const amount = (w: Partial<Wallet>) => Object.values(w).reduce((a, b) => a + b, 0);
export const canGather = (
  tile: Pick<Tile, 'terrain' | 'ownerId'>,
  ownerId: string,
  resource: Resource,
) =>
  (!tile.ownerId || tile.ownerId === ownerId) && TERRAIN_RESOURCES[tile.terrain].includes(resource);
export const armyPopulation = (units: Pick<Unit, 'kind'>[]) =>
  units.reduce((total, unit) => total + unitPopulation(unit.kind), 0);
export function refreshAP(
  realm: Pick<Realm, 'ap' | 'apAt'>,
  now: number,
  interval = RULES.apInterval,
) {
  if (now < realm.apAt) return;
  if (realm.ap >= RULES.maxAP) {
    realm.ap = RULES.maxAP;
    realm.apAt = now;
    return;
  }
  const earned = Math.floor((now - realm.apAt) / interval);
  if (earned > 0) {
    realm.ap = Math.min(RULES.maxAP, realm.ap + earned);
    realm.apAt = realm.ap === RULES.maxAP ? now : realm.apAt + earned * interval;
  }
}
export function territoryMultiplier(count: number) {
  return count <= 20 ? 1 : count <= 40 ? 1.1 : count <= 80 ? 1.3 : count <= 150 ? 1.7 : 2.5;
}
export const realmUnits = (s: GameState, id: string) =>
  Object.values(s.units).filter((u) => u.ownerId === id);
export const realmBuildings = (s: GameState, id: string) =>
  Object.values(s.buildings).filter((b) => b.ownerId === id);
export const realmTiles = (s: GameState, id: string) =>
  Object.values(s.tiles).filter((t) => t.ownerId === id);
export function income(s: GameState, id: string): Wallet {
  const out = zeroWallet(),
    buildings = realmBuildings(s, id),
    units = realmUnits(s, id),
    tiles = realmTiles(s, id);
  for (const b of buildings) {
    for (const [k, v] of Object.entries(productionOnTerrain(b.kind, tileAt(s, b).terrain)))
      out[k as keyof Wallet] += v * (b.kind === 'VILLAGE' ? Math.max(1, b.level) : 1);
    if (b.kind === 'VILLAGE') out.GOLD += b.population * 0.015;
  }
  for (const unit of units) transfer(out, unitUpkeep(unit.kind), -1);
  out.GOLD -= tiles.length * 0.04 * territoryMultiplier(tiles.length);
  out.FOOD -= buildings.reduce((a, b) => a + b.population, 0) * 0.015;
  return out;
}
export const storage = (s: GameState, id: string) =>
  800 +
  realmBuildings(s, id).filter((b) => b.kind === 'WAREHOUSE').length * 800 +
  realmBuildings(s, id).filter((b) => b.kind === 'GRANARY').length * 400 +
  realmBuildings(s, id).filter((b) => b.kind === 'RAIL_DEPOT').length * 1200;
export function accrueEconomy(s: GameState, r: Realm, now: number, grace = RULES.grace) {
  const until = Math.min(now, r.offlineAt ?? r.lastSeen + grace),
    minutes = Math.max(0, until - r.economyAt) / 60_000;
  if (minutes > 0 && !r.defeatedAt) {
    const rates = income(s, r.id),
      cap = storage(s, r.id);
    for (const k of Object.keys(rates) as (keyof Wallet)[])
      r.wallet[k] = Math.max(
        0,
        rates[k] > 0
          ? Math.min(Math.max(cap, r.wallet[k]), r.wallet[k] + rates[k] * minutes)
          : r.wallet[k] + rates[k] * minutes,
      );
    const buildings = realmBuildings(s, r.id),
      workers =
        buildings.reduce((a, b) => a + b.population, 0) - armyPopulation(realmUnits(s, r.id));
    if (r.wallet.FOOD > 5 && workers > 0)
      for (const b of buildings)
        if (['CAMP', 'HOUSE', 'VILLAGE', 'OUTPOST'].includes(b.kind))
          b.population = Math.min(
            Math.max(
              b.population,
              (BUILDING_POPULATION[b.kind] ?? 0) * (b.kind === 'VILLAGE' ? b.level + 1 : 2),
            ),
            b.population +
              minutes *
                0.4 *
                Math.min(1, workers / 25) *
                (1 +
                  (buildings.some((x) => x.kind === 'WELL') ? 0.5 : 0) +
                  (buildings.some((x) => x.kind === 'MONASTERY') ? 0.5 : 0) +
                  (buildings.some((x) => x.kind === 'FIELD_HOSPITAL') ? 0.5 : 0)),
          );
  }
  r.economyAt = now;
}
export function realmValue(s: GameState, id: string) {
  const r = s.realms[id];
  return Math.round(
    amount(r.wallet) +
      realmUnits(s, id).reduce(
        (a, u) => a + (amount(UNITS[u.kind].cost) * u.hp) / unitStats(u).hp,
        0,
      ) +
      realmBuildings(s, id).reduce(
        (a, b) => a + amount(BUILDINGS[b.kind].cost) * b.level + b.population,
        0,
      ) +
      realmTiles(s, id).length * 5 +
      r.relics.length * 100,
  );
}
export function vision(s: GameState, r: Realm): Set<string> {
  const visible = new Set<string>();
  for (const u of realmUnits(s, r.id)) {
    const range = UNITS[u.kind].vision + (r.faction === 'MASK' && u.kind === 'SCOUT' ? 2 : 0);
    for (const p of disk(u, range)) visible.add(key(p));
  }
  for (const b of realmBuildings(s, r.id))
    for (const p of disk(
      b,
      (b.kind === 'RADIO' ? 10 : b.kind === 'TOWER' ? 7 : b.kind === 'FORT' ? 4 : 3) +
        (realmBuildings(s, r.id).some((x) => x.kind === 'LIBRARY') ? 1 : 0),
    ))
      visible.add(key(p));
  for (const t of realmTiles(s, r.id)) visible.add(key(t));
  return visible;
}
export function observe(s: GameState, r: Realm, now: number) {
  for (const k of vision(s, r)) {
    const p = unkey(k),
      t = tileAt(s, p),
      b = t.buildingId ? s.buildings[t.buildingId] : undefined;
    r.explored[k] = {
      q: p.q,
      r: p.r,
      visibility: 'EXPLORED',
      terrain: t.terrain,
      ownerId: t.ownerId,
      road: t.road,
      poi: t.poi,
      exhausted: t.exhausted,
      capture: t.capture ? { ...t.capture } : undefined,
      building: b ? { ...b } : undefined,
    };
  }
  r.progression.exploration = Object.keys(r.explored).length;
}
export function movementCost(t: Tile, kind?: UnitKind) {
  if (t.road) return 1;
  if (
    kind &&
    (UNIT_PROFILES[kind].mechanical || UNIT_PROFILES[kind].mounted) &&
    ['MOUNTAIN', 'MARSH'].includes(t.terrain)
  )
    return 99;
  return kind && UNIT_PROFILES[kind].mechanical && t.terrain === 'FOREST'
    ? 3
    : TERRAINS[t.terrain].cost;
}
export function findPath(
  start: Hex,
  end: Hex,
  getTile: (p: Hex) => Tile | undefined,
  budget: number,
  blocked: Set<string> = new Set(),
  kind?: UnitKind,
): Hex[] | null {
  if (key(start) === key(end)) return [];
  const frontier: { p: Hex; cost: number; priority: number }[] = [
      { p: start, cost: 0, priority: 0 },
    ],
    costs = new Map([[key(start), 0]]),
    came = new Map<string, Hex>();
  let visits = 0;
  while (frontier.length && visits++ < 4000) {
    frontier.sort((a, b) => a.priority - b.priority);
    const current = frontier.shift()!;
    if (key(current.p) === key(end)) {
      const path: Hex[] = [];
      let p = end;
      while (key(p) !== key(start)) {
        path.unshift(p);
        p = came.get(key(p))!;
      }
      return path;
    }
    for (const n of neighbors(current.p)) {
      const t = getTile(n);
      if (!t || blocked.has(key(n))) continue;
      const c = current.cost + movementCost(t, kind);
      if (c > budget || c >= (costs.get(key(n)) ?? Infinity)) continue;
      costs.set(key(n), c);
      came.set(key(n), current.p);
      frontier.push({ p: n, cost: c, priority: c + distance(n, end) });
    }
  }
  return null;
}
export function unitStats(unit: Pick<Unit, 'kind' | 'rareBonus'>) {
  const base = UNITS[unit.kind];
  const multiplier = 1 + (unit.rareBonus ?? 0) / 100;
  const boosted = (value: number) => Math.round(value * multiplier * 100) / 100;
  return {
    ...base,
    hp: boosted(base.hp),
    attack: boosted(base.attack),
    defense: boosted(base.defense),
    buildingAttack: boosted('buildingAttack' in base ? base.buildingAttack : base.attack),
  };
}

export function estimateDamage(attacker: Unit, target: Unit | Building, tile: Tile) {
  const a = unitStats(attacker);
  const atk = 'population' in target && 'buildingAttack' in a ? a.buildingAttack : a.attack;
  const defense =
    'population' in target
      ? Math.floor(target.level / 2) + (BUILDING_DEFENSE[target.kind] ?? 0)
      : unitStats(target).defense;
  const bonus =
    !('population' in target) && attacker.kind === 'BAZOOKA' && UNIT_PROFILES[target.kind].armored
      ? 6
      : !('population' in target) &&
          attacker.kind === 'SPEARMAN' &&
          UNIT_PROFILES[target.kind].mounted
        ? 3
        : !('population' in target) &&
            attacker.kind === 'CROSSBOW' &&
            ['GUARD', 'PALADIN', 'KNIGHT'].includes(target.kind)
          ? 2
          : 0;
  const cover =
    !('population' in target) && target.kind === 'RANGER' && tile.terrain === 'FOREST' ? 2 : 0;
  const base = Math.max(
    1,
    Math.round(atk + bonus - defense - cover - TERRAINS[tile.terrain].defense),
  );
  return { min: Math.max(1, base - 1), max: base + 1 };
}
export const truceBetween = (s: GameState, a: string, b: string, now: number) =>
  Object.values(s.treaties).find(
    (t) =>
      t.kind === 'TRUCE' &&
      t.endsAt > now &&
      ((t.a === a && t.b === b) || (t.a === b && t.b === a)),
  );
export function hostileReason(
  s: GameState,
  a: Realm,
  b: Realm,
  now: number,
  offlineProtection = false,
): string | undefined {
  if (truceBetween(s, a.id, b.id, now)) return 'Une trêve protège ces deux royaumes.';
  if (b.protectedUntil > now) return 'Ce royaume bénéficie de la protection initiale.';
  if (offlineProtection && (b.offlineAt ?? b.lastSeen + RULES.grace) <= now)
    return 'Ce royaume est protégé hors ligne.';
}
export function createRealm(
  id: string,
  name: string,
  faction: Faction,
  capital: Hex,
  now: number,
  bot = false,
): Realm {
  return {
    id,
    name,
    faction,
    bot,
    createdAt: now,
    wallet: { STONE: 0, GOLD: 320, WOOD: 240, IRON: 140, FOOD: 200 },
    ap: RULES.maxAP,
    apAt: now,
    economyAt: now,
    lastSeen: now,
    protectedUntil: bot ? 0 : now + RULES.protection,
    capital,
    explored: {},
    progression: { exploration: 0, battles: 0, commerce: 0, development: 0 },
    relics: [],
    settings: {
      ...DEFAULT_SETTINGS,
      emblem: FACTIONS[faction].symbol,
      bannerColor: FACTIONS[faction].color,
      lastCameraQ: capital.q,
      lastCameraR: capital.r,
    },
    nextBotAt: now + RULES.botInterval,
  };
}
export function createState(seed: string, now: number): GameState {
  return {
    version: 1,
    seed,
    createdAt: now,
    realms: {},
    units: {},
    buildings: {},
    tiles: {},
    proposals: {},
    treaties: {},
    caravans: {},
    events: {},
    journal: [],
    archives: {},
    nextEventAt: now + 900_000,
    botSerial: 0,
    revision: 0,
  };
}
export function publicTile(
  s: GameState,
  p: Hex,
  visible: Set<string>,
  memory: Record<string, ViewTile>,
): ViewTile {
  const k = key(p);
  if (!visible.has(k))
    return memory[k] ? { ...memory[k], visibility: 'EXPLORED' } : { ...p, visibility: 'UNKNOWN' };
  const t = tileAt(s, p);
  return {
    q: p.q,
    r: p.r,
    visibility: 'VISIBLE',
    terrain: t.terrain,
    ownerId: t.ownerId,
    building: t.buildingId ? s.buildings[t.buildingId] : undefined,
    road: t.road,
    poi: t.poi,
    exhausted: t.exhausted,
    capture: t.capture,
  };
}
