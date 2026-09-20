import { passiveFishingYield } from './naval';
import { isMaritimeEncounter } from '@voidmarch/config';
import { archipelagoAt } from './archipelagos';
export * from './archipelagos';
export * from './foundations';
export * from './development';
import type { DevelopmentProgress } from '@voidmarch/config';
export * from './sea-access';
import { siteOperational, strategicBonuses } from './strategic-control';
export * from './strategic-control';
import { refreshFoodPenalties } from './army-support';
import { developmentReason, unitDevelopmentStage } from '@voidmarch/config';
import { oceanTerrain } from './oceans';
export * from './oceans';
export * from './expeditions';
export * from './naval';
export * from './sea-trade';
import { isSea } from '@voidmarch/config';
import { supplyAttackBonus } from './supplies';
export * from './supplies';
export * from './unit-movement';
export * from './army-support';
import { biomeAt } from './biomes';
export * from './biomes';
import { allUnits } from './transports';
export * from './transports';
import { veteranRank, recruitmentLevel, UNIT_TERRAIN_AFFINITIES } from '@voidmarch/config';
import {
  BUILDINGS,
  heroAura,
  BALANCE_VERSION,
  NPCS,
  INDIRECT_FIRE_UNITS,
  TURRETS,
  WALL_KINDS,
  type TurretLevel,
  isWall,
  buildingConstructionCost,
  BUILDING_DEFENSE,
  productionMultiplier,
  storageBonus,
  populationCapacity,
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
import type {
  Building,
  GameState,
  Hex,
  MissionOffer,
  Realm,
  Tile,
  Unit,
  ViewTile,
} from '@voidmarch/shared';
export const key = (p: Hex) => `${p.q},${p.r}`;
/** Shared by the authoritative action, catalogue and optimistic preview. */
export function recruitmentRequirement(
  kind: UnitKind,
  building: Building,
  owned: readonly Building[],
  progress: DevelopmentProgress,
): string {
  const profile = UNIT_PROFILES[kind];
  if (profile.hero) return 'Le héros est unique et ne peut pas être recruté.';
  if (!profile.recruitAt.includes(building.kind))
    return `Formation : ${BUILDINGS[profile.recruitAt[0]].name}`;
  if (building.level < recruitmentLevel(kind, building.kind))
    return `${BUILDINGS[building.kind].name} niveau ${recruitmentLevel(kind, building.kind)} nécessaire`;
  const missing = profile.requires.find(
    (k) => !owned.some((b) => b.ownerId === building.ownerId && b.kind === k && b.hp > 0),
  );
  return missing
    ? `${BUILDINGS[missing].name} nécessaire pour cette unité.`
    : developmentReason(
        owned.filter((b) => b.ownerId === building.ownerId),
        unitDevelopmentStage(kind),
        progress,
      );
}
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
/** Finite regions sealed by contiguous wall cells. Sparse row spans avoid scanning
 * the huge empty rectangle between distant cities or along an open diagonal wall. */
export function enclosedHexes(walls: readonly Hex[]): Hex[] {
  const remaining = new Map(walls.map((p) => [key(p), p]));
  const allWalls = new Set(remaining.keys());
  const enclosed = new Map<string, Hex>();
  while (remaining.size) {
    const first = remaining.values().next().value!;
    const component: Hex[] = [first];
    remaining.delete(key(first));
    for (let i = 0; i < component.length; i++) {
      for (const neighbor of neighbors(component[i])) {
        const entry = remaining.get(key(neighbor));
        if (entry) {
          remaining.delete(key(entry));
          component.push(entry);
        }
      }
    }
    if (component.length < 6) continue;
    let minQ = Infinity,
      maxQ = -Infinity,
      minR = Infinity,
      maxR = -Infinity;
    const blockedRows = new Map<number, number[]>();
    for (const p of component) {
      minQ = Math.min(minQ, p.q);
      maxQ = Math.max(maxQ, p.q);
      minR = Math.min(minR, p.r);
      maxR = Math.max(maxR, p.r);
      const row = blockedRows.get(p.r) ?? [];
      row.push(p.q);
      blockedRows.set(p.r, row);
    }
    minQ--;
    maxQ++;
    minR--;
    maxR++;
    type Span = { start: number; end: number; r: number; neighbors: Span[]; exterior: boolean };
    const spans: Span[] = [],
      exterior: Span[] = [];
    let previous: Span[] = [];
    for (let r = minR; r <= maxR; r++) {
      const row: Span[] = [];
      let start = minQ;
      const append = (end: number) => {
        if (start > end) return;
        const boundary = r === minR || r === maxR || start === minQ || end === maxQ;
        const span: Span = { start, end, r, neighbors: [], exterior: boundary };
        row.push(span);
        spans.push(span);
        if (boundary) exterior.push(span);
      };
      for (const q of (blockedRows.get(r) ?? []).sort((a, b) => a - b)) {
        append(q - 1);
        start = q + 1;
      }
      append(maxQ);
      // Across increasing r, axial neighbors keep q or decrease q by one.
      let i = 0,
        j = 0;
      while (i < previous.length && j < row.length) {
        const a = previous[i],
          b = row[j];
        if (a.end < b.start) {
          i++;
          continue;
        }
        if (b.end < a.start - 1) {
          j++;
          continue;
        }
        a.neighbors.push(b);
        b.neighbors.push(a);
        if (a.end < b.end) i++;
        else j++;
      }
      previous = row;
    }
    for (let i = 0; i < exterior.length; i++) {
      for (const next of exterior[i].neighbors) {
        if (next.exterior) continue;
        next.exterior = true;
        exterior.push(next);
      }
    }
    for (const span of spans) {
      if (span.exterior) continue;
      for (let q = span.start; q <= span.end; q++) {
        const p = { q, r: span.r },
          k = key(p);
        if (!allWalls.has(k)) enclosed.set(k, p);
      }
    }
  }
  return [...enclosed.values()];
}

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
    biome: biomeAt(seed, p),
    ...(terrain === 'RUINS'
      ? { poi: n < 0.01 ? ('RARE' as const) : ('COMMON' as const) }
      : terrain === 'ALIEN'
        ? { poi: 'MYTHIC' as const }
        : {}),
  };
}
export const tileAt = (s: GameState, p: Hex): Tile => {
  const saved = s.tiles[key(p)];
  return saved
    ? saved.biome
      ? saved
      : { ...saved, biome: biomeAt(s.seed, p) }
    : (() => {
        const t = generateTile(s.seed, p),
          terrain = oceanTerrain(s, p);
        if (!terrain) return t;
        const island = archipelagoAt(s, p);
        const discovery = island && island.q === p.q && island.r === p.r ? island.kind : undefined;
        return { ...t, terrain, poi: discovery ? 'RARE' : undefined, islandDiscovery: discovery };
      })();
};
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
/** Honour accepted quotes; legacy campaigns receive the same reward as new offers. */
export const missionWallCount = (offer: Pick<MissionOffer, 'wall' | 'wallRadius'>) =>
  offer.wall ? 6 * (offer.wallRadius ?? 2) : 0;
export function missionReward(
  offer: Pick<MissionOffer, 'difficulty' | 'abandonmentCost' | 'reward'>,
  bonus = 1,
): Partial<Wallet> {
  if (offer.reward) return { ...offer.reward };
  const multiplier = { Escarmouche: 2, Assaut: 2.5, Siège: 3, 'Grande campagne': 3 }[
    offer.difficulty
  ];
  return Object.fromEntries(
    Object.entries(offer.abandonmentCost).map(([resource, cost]) => [
      resource,
      Math.round(cost * multiplier * bonus * 10) / 10,
    ]),
  );
}
export const amount = (w: Partial<Wallet>) => Object.values(w).reduce((a, b) => a + b, 0);
export function missionAbandonPlan(wallet: Wallet, cost: Partial<Wallet>) {
  const paid = Object.fromEntries(
    Object.entries(cost).map(([k, value]) => [k, Math.min(wallet[k as keyof Wallet], value)]),
  ) as Partial<Wallet>;
  const due = amount(cost),
    shortfall = Math.max(0, due - amount(paid));
  return {
    paid,
    delay:
      shortfall > 0
        ? Math.max(5 * 60000, Math.ceil((30 * 60000 * shortfall) / Math.max(1, due)))
        : 0,
  };
}

export const alliedRealmIds = (s: GameState, id: string): string[] =>
  Object.values(s.strategy?.alliances ?? {})
    .find((a) => a.members.includes(id))
    ?.members.filter((x) => x !== id) ?? [];
/** Walls block ground movement for every other realm, even on roads or during a truce. */
export const wallBlocks = (
  building: Building | undefined,
  realmId: string,
  kind?: UnitKind,
  allies: readonly string[] = [],
) =>
  !(kind && UNIT_PROFILES[kind].flying) &&
  !!building &&
  building.hp > 0 &&
  isWall(building.kind) &&
  building.ownerId !== realmId &&
  !allies.includes(building.ownerId);
export function wallConnections(
  building: Building,
  getBuilding: (p: Hex) => Building | undefined,
): number {
  return neighbors(building).reduce((mask, p, side) => {
    const other = getBuilding(p);
    return other && other.hp > 0 && isWall(other.kind) && other.ownerId === building.ownerId
      ? mask | (1 << side)
      : mask;
  }, 0);
}
/** Legacy saves have no payment receipt: use the level-one catalogue cost. */
export const demolitionRefund = (building: Building, faction: Faction): Partial<Wallet> => {
  const result = {
    ...(building.constructionCost ?? buildingConstructionCost(building.kind, faction)),
  };
  for (const [resource, value] of Object.entries(building.turretConstructionCost ?? {}))
    result[resource as Resource] = (result[resource as Resource] ?? 0) + value;
  return result;
};
export const turretStats = (building: Building) =>
  building.kind === 'COASTAL_BATTERY'
    ? TURRETS[Math.max(1, Math.min(5, building.level)) as TurretLevel]
    : isWall(building.kind) && building.turretLevel
      ? TURRETS[building.turretLevel]
      : undefined;
export const nextTurretLevel = (building: Building): TurretLevel | undefined =>
  isWall(building.kind) && (building.turretLevel ?? 0) < 5
    ? (((building.turretLevel ?? 0) + 1) as TurretLevel)
    : undefined;
export function turretUpgradeReason(building: Building, ownerId: string, units: Unit[]) {
  if (building.ownerId !== ownerId) return 'Ce rempart ne vous appartient pas.';
  if (!isWall(building.kind) || building.hp <= 0)
    return 'Une tourelle doit être posée sur un rempart intact.';
  const next = nextTurretLevel(building);
  if (!next) return 'Cette tourelle est au niveau maximal.';
  if (WALL_KINDS.indexOf(building.kind) < next - 1)
    return `Améliorez d’abord le mur : ${BUILDINGS[TURRETS[next].wall].name} nécessaire.`;
  if (
    !building.turretLevel &&
    !units.some(
      (u) =>
        u.ownerId === ownerId &&
        u.hp > 0 &&
        UNIT_PROFILES[u.kind].builder &&
        distance(u, building) <= 1,
    )
  )
    return 'Approchez un paysan ou un ingénieur à une case maximum pour installer la tourelle.';
  if (units.some((u) => u.ownerId !== ownerId && distance(u, building) === 0))
    return 'Une unité adverse occupe ce rempart.';
  return '';
}
export const canGather = (
  tile: Pick<Tile, 'terrain' | 'ownerId'>,
  ownerId: string,
  resource: Resource,
) =>
  (!tile.ownerId || tile.ownerId === ownerId) && TERRAIN_RESOURCES[tile.terrain].includes(resource);
/** Neutral road works need a nearby builder; foreign territory remains protected. */
export function roadSiteReason(
  tile: Pick<Tile, 'q' | 'r' | 'ownerId' | 'roadOwnerId'> & { terrain?: Terrain },
  ownerId: string,
  units: Pick<Unit, 'q' | 'r' | 'ownerId' | 'kind'>[],
  remove = false,
) {
  if (isSea(tile.terrain)) return 'Une route ne peut pas traverser la mer.';
  if (!remove && tile.terrain === 'SCORCHED')
    return 'Restaurez ces terres brûlées avec un terrassier avant de construire une route.';
  if (tile.ownerId === ownerId) return '';
  if (tile.ownerId) return 'Impossible de modifier les routes d’un territoire adverse.';
  if (remove && tile.roadOwnerId !== ownerId)
    return 'Sur terrain neutre, vous pouvez seulement retirer vos propres routes.';
  if (
    !units.some(
      (u) => u.ownerId === ownerId && UNIT_PROFILES[u.kind].builder && distance(u, tile) <= 1,
    )
  )
    return 'Terrain neutre : un paysan ou un ingénieur doit être à une case maximum du chantier.';
  return '';
}
export const armyPopulation = (units: Pick<Unit, 'kind'>[]) =>
  units.reduce((total, unit) => total + unitPopulation(unit.kind), 0);
export function refreshAP(
  realm: Pick<Realm, 'ap' | 'apAt'>,
  now: number,
  interval = RULES.apInterval,
) {
  if (now < realm.apAt) return;
  if (realm.ap >= RULES.maxAP) {
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
export const allRealmUnits = (s: GameState, id: string) => allUnits(realmUnits(s, id));
export const realmBuildings = (s: GameState, id: string) =>
  Object.values(s.buildings).filter((b) => b.ownerId === id);
export const realmTiles = (s: GameState, id: string) =>
  Object.values(s.tiles).filter((t) => t.ownerId === id);
export function fishingIncome(s: GameState, id: string) {
  return realmUnits(s, id).reduce(
    (sum, unit) =>
      sum + (UNIT_PROFILES[unit.kind].fishing ? passiveFishingYield(unit, tileAt(s, unit)) : 0),
    0,
  );
}
export function income(s: GameState, id: string): Wallet {
  const out = zeroWallet(),
    buildings = realmBuildings(s, id),
    units = allRealmUnits(s, id),
    tiles = realmTiles(s, id);
  for (const b of buildings) {
    for (const [k, v] of Object.entries(productionOnTerrain(b.kind, tileAt(s, b).terrain)))
      out[k as keyof Wallet] +=
        v *
        productionMultiplier(b.kind, b.level) *
        ((s.strategy?.fallout[key(b)]?.intensity ?? 0) >= 30 ? 0.5 : 1);
    if (b.kind === 'VILLAGE' && tileAt(s, b).terrain !== 'SCORCHED')
      out.GOLD += b.population * 0.015;
  }
  for (const site of Object.values(s.strategy?.sites ?? {}))
    if (site.ownerId === id && siteOperational(s, site)) {
      if (site.kind === 'MINE') out.IRON += 8;
      if (site.kind === 'SANCTUARY') out.GOLD += 5;
    }
  out.FOOD += fishingIncome(s, id);
  for (const unit of units) transfer(out, unitUpkeep(unit.kind), -1);
  out.GOLD -= tiles.length * 0.04 * territoryMultiplier(tiles.length);
  out.FOOD -= buildings.reduce((a, b) => a + b.population, 0) * 0.015;
  return out;
}
export function foodBalance(s: GameState, id: string, net = income(s, id).FOOD) {
  const army = allRealmUnits(s, id).reduce((sum, u) => sum + (unitUpkeep(u.kind).FOOD ?? 0), 0);
  const civilians = realmBuildings(s, id).reduce((sum, b) => sum + b.population, 0) * 0.015;
  return {
    production: Math.max(0, net + army + civilians),
    fishing: fishingIncome(s, id),
    army,
    civilians,
    net,
  };
}
export const storage = (s: GameState, id: string) =>
  800 + realmBuildings(s, id).reduce((sum, b) => sum + storageBonus(b.kind, b.level), 0);
export function accrueEconomy(s: GameState, r: Realm, now: number, grace = RULES.grace) {
  const until = Math.min(now, r.offlineAt ?? r.lastSeen + grace),
    minutes = Math.max(0, until - r.economyAt) / 60_000;
  if (minutes > 0 && !r.defeatedAt) {
    const rates = income(s, r.id),
      cap = storage(s, r.id);
    // Count only the part of this online interval after the food reserve is exhausted.
    const fedMinutes =
      rates.FOOD < 0 ? Math.min(minutes, Math.max(0, r.wallet.FOOD) / -rates.FOOD) : minutes;
    const hungryMinutes = minutes - fedMinutes;
    r.foodShortageMinutes = Math.min(
      45,
      Math.max(0, (r.foodShortageMinutes ?? 0) - fedMinutes * 2) + hungryMinutes,
    );
    refreshFoodPenalties(s, now, r.id);
    for (const k of Object.keys(rates) as (keyof Wallet)[])
      r.wallet[k] = Math.max(
        0,
        rates[k] > 0
          ? Math.min(Math.max(cap, r.wallet[k]), r.wallet[k] + rates[k] * minutes)
          : r.wallet[k] + rates[k] * minutes,
      );
    const buildings = realmBuildings(s, r.id),
      workers =
        buildings.reduce((a, b) => a + b.population, 0) - armyPopulation(allRealmUnits(s, r.id));
    if (r.wallet.FOOD > 5 && workers > 0)
      for (const b of buildings)
        if (['CAMP', 'HOUSE', 'VILLAGE', 'OUTPOST'].includes(b.kind))
          b.population = Math.min(
            Math.max(b.population, populationCapacity(b.kind, b.level)),
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
      allRealmUnits(s, id).reduce(
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
  const bonuses = strategicBonuses(s, r.id);
  for (const site of Object.values(s.strategy?.sites ?? {}))
    if (site.ownerId === r.id && site.kind === 'RADIO' && siteOperational(s, site))
      for (const p of disk(site, 8)) visible.add(key(p));
  for (const u of realmUnits(s, r.id)) {
    const range = unitStats(u).vision + (r.faction === 'MASK' && u.kind === 'SCOUT' ? 2 : 0);
    for (const p of disk(u, range)) visible.add(key(p));
  }
  for (const b of realmBuildings(s, r.id))
    for (const p of disk(
      b,
      (turretStats(b)?.range ??
        (b.kind === 'BLACK_OBSERVATORY'
          ? 12
          : b.kind === 'RADIO'
            ? 10
            : b.kind === 'TOWER'
              ? 7
              : b.kind === 'FORT'
                ? 4
                : 3)) +
        (b.level - 1) +
        (['FORT', 'TOWER'].includes(b.kind) ? bonuses.watch : 0) +
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
      biome: t.biome,
      ownerId: t.ownerId,
      enclosureOwnerId: t.enclosureOwnerId,
      road: t.road,
      roadOwnerId: t.roadOwnerId,
      poi: t.poi,
      islandDiscovery: t.islandDiscovery,
      exhausted: t.exhausted,
      capture: t.capture ? { ...t.capture } : undefined,
      building: b ? { ...b } : undefined,
    };
  }
  r.progression.exploration = Object.keys(r.explored).length;
}
export function movementCost(t: Tile, kind?: UnitKind) {
  if (kind && UNIT_PROFILES[kind].naval) return isSea(t.terrain) ? 1 : 99;
  if (kind && UNIT_PROFILES[kind].flying) return 1;
  if (isSea(t.terrain)) return 99;
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
      if (
        !t ||
        (blocked.has(key(n)) && (!kind || !UNIT_PROFILES[kind].flying || key(n) === key(end)))
      )
        continue;
      const c = current.cost + movementCost(t, kind);
      if (c > budget || c >= (costs.get(key(n)) ?? Infinity)) continue;
      costs.set(key(n), c);
      came.set(key(n), current.p);
      frontier.push({ p: n, cost: c, priority: c + distance(n, end) });
    }
  }
  return null;
}
type TravelTile = Hex & Partial<Pick<Tile, 'road' | 'ownerId' | 'enclosureOwnerId' | 'terrain'>>;
/** Roads are public; only closed friendly enclosure interiors extend the free network. */
export function travelNetworkTile(tile: TravelTile | undefined, ownerId?: string, kind?: UnitKind) {
  return (
    !!tile &&
    !isSea(tile.terrain) &&
    !(kind && UNIT_PROFILES[kind].naval) &&
    (!!tile.road ||
      (!!ownerId &&
        tile.ownerId === ownerId &&
        tile.enclosureOwnerId === ownerId &&
        !!tile.terrain &&
        movementCost({ ...tile, terrain: tile.terrain }, kind) < 99))
  );
}
/** Waive AP only when the origin and every step belong to the free network. */
export function movementAPCost(
  start: Hex,
  path: readonly Hex[],
  getTile: (p: Hex) => TravelTile | undefined,
  ownerId: string,
  kind: UnitKind,
) {
  return path.length && [start, ...path].every((p) => travelNetworkTile(getTile(p), ownerId, kind))
    ? 0
    : 1;
}
/** Stable 1–6 AP reward, shared by previews and collection; reloads cannot reroll it. */
export function anomalyAPReward(seed: string, identity: string) {
  return 1 + Math.floor(hash(`${seed}:anomaly-ap:${identity}`) * 6);
}
/** Sea encounters grant the same stable draw at twice the terrestrial amount. */
export function eventAPReward(seed: string, event: { id: string; kind: string }) {
  return anomalyAPReward(seed, event.id) * (isMaritimeEncounter(event.kind) ? 2 : 1);
}
/** Traverse connected roads and closed enclosures without a movement-budget or chunk limit. */
export function roadPaths(
  start: Hex,
  roads: ReadonlyMap<string, TravelTile>,
  blocked: ReadonlySet<string> = new Set(),
  kind?: UnitKind,
  ownerId?: string,
): Map<string, Hex | null> {
  const came = new Map<string, Hex | null>();
  if (!travelNetworkTile(roads.get(key(start)), ownerId, kind)) return came;
  const frontier: Hex[] = [start];
  came.set(key(start), null);
  for (let index = 0; index < frontier.length; index++) {
    const current = frontier[index];
    for (const next of neighbors(current)) {
      const k = key(next);
      if (came.has(k) || !travelNetworkTile(roads.get(k), ownerId, kind)) continue;
      if (blocked.has(k) && (!kind || !UNIT_PROFILES[kind].flying)) continue;
      came.set(k, current);
      frontier.push(next);
    }
  }
  return came;
}
export function roadPathTo(
  end: Hex,
  paths: ReadonlyMap<string, Hex | null>,
  blocked: ReadonlySet<string> = new Set(),
): Hex[] | null {
  if (!paths.has(key(end)) || blocked.has(key(end))) return null;
  const result: Hex[] = [];
  let current = end;
  while (paths.get(key(current))) {
    result.push(current);
    current = paths.get(key(current))!;
  }
  return result.reverse();
}
export function unitStats(
  unit: Pick<
    Unit,
    | 'kind'
    | 'rareBonus'
    | 'trainingBonus'
    | 'supportBonus'
    | 'npc'
    | 'victories'
    | 'expedition'
    | 'provisions'
    | 'foodPenalty'
  >,
) {
  const base = UNITS[unit.kind];
  if (unit.npc) {
    const profile = NPCS[unit.npc.kind];
    return {
      ...base,
      name: unit.expedition?.title ?? profile.name,
      hp: unit.npc.maxHp,
      attack: unit.npc.attack,
      defense: unit.npc.defense,
      buildingAttack: unit.npc.attack,
      range: profile.range,
      move: 0,
    };
  }
  const multiplier = 1 + ((unit.rareBonus ?? 0) + (unit.trainingBonus ?? 0)) / 100;
  const boosted = (value: number, extra = 0) =>
    Math.round(value * multiplier * (1 + Math.min(15, Math.max(0, extra)) / 100) * 100) / 100;
  const support = unit.supportBonus;
  const provisions =
    (1 + supplyAttackBonus(unit) / 100) *
    (1 - Math.min(20, Math.max(0, unit.foodPenalty ?? 0)) / 100);
  return {
    ...base,
    hp: boosted(base.hp, support?.hp),
    attack: boosted(
      base.attack * (1 + veteranRank(unit.victories) * 0.05) * provisions,
      support?.attack,
    ),
    defense: boosted(base.defense * (1 + veteranRank(unit.victories) * 0.05), support?.defense),
    buildingAttack: boosted(
      base.buildingAttack * (1 + veteranRank(unit.victories) * 0.05) * provisions,
      support?.attack,
    ),
    move: base.move + Math.min(1, Math.max(0, support?.move ?? 0)),
    vision: base.vision + Math.min(1, Math.max(0, support?.vision ?? 0)),
  };
}

/** Affinities are positional, never persisted into a unit's permanent stats. */
export function terrainCombatBonus(
  unit: Pick<Unit, 'kind' | 'npc' | 'supportBonus'>,
  terrain?: Terrain,
) {
  if (unit.npc || !terrain) return { attack: 0, defense: 0 };
  const affinity = UNIT_TERRAIN_AFFINITIES[unit.kind].find((a) => a.terrain === terrain);
  const extra = Math.min(5, Math.max(0, unit.supportBonus?.terrain ?? 0));
  return {
    attack: affinity?.attack ? affinity.attack + extra : 0,
    defense: affinity?.defense ? affinity.defense + extra : 0,
  };
}
export function unitCombatStats(unit: Parameters<typeof unitStats>[0], terrain?: Terrain) {
  const stats = unitStats(unit);
  const bonus = terrainCombatBonus(unit, terrain);
  const boosted = (value: number, percent: number) =>
    Math.round(value * (1 + percent / 100) * 100) / 100;
  return {
    ...stats,
    attack: boosted(stats.attack, bonus.attack),
    buildingAttack: boosted(stats.buildingAttack, bonus.attack),
    defense: boosted(stats.defense, bonus.defense),
  };
}

/** Shared targeting restrictions for server orders, bots and the combat preview. */
export function attackStats(attacker: Unit | Building, terrain?: Terrain) {
  if (!('population' in attacker)) return unitCombatStats(attacker, terrain);
  const turret = turretStats(attacker);
  return {
    name: turret?.name ?? BUILDINGS[attacker.kind].name,
    attack: turret?.attack ?? 0,
    buildingAttack: turret?.attack ?? 0,
    range: turret?.range ?? 0,
  };
}
export const attackCost = (attacker: Unit | Building) =>
  'population' in attacker ? 1 : UNIT_PROFILES[attacker.kind].siege ? 2 : 1;
export function attackBlockReason(attacker: Unit | Building, target: Unit | Building) {
  const building = 'population' in attacker;
  if (
    !building &&
    UNIT_PROFILES[attacker.kind].submarine &&
    ('population' in target || !UNIT_PROFILES[target.kind].naval)
  )
    return 'Les torpilles ne peuvent toucher que des navires.';
  if (building && !turretStats(attacker)) return 'Ce bâtiment ne possède pas de tourelle.';
  if (building && attacker.hp <= 0) return 'Ce rempart est détruit.';
  if (building && distance(attacker, target) === 0)
    return 'Une tourelle ne peut pas tirer sur sa propre case.';
  const flyingTarget = !('population' in target) && UNIT_PROFILES[target.kind].flying;
  if (
    flyingTarget &&
    !building &&
    !UNIT_PROFILES[attacker.kind].flying &&
    UNITS[attacker.kind].range <= 1
  )
    return 'Cette unité terrestre ne peut pas atteindre une cible aérienne. Utilisez une unité à distance.';
  return '';
}
export function attackTrajectory(attacker: Unit | Building) {
  if ('population' in attacker) return 'elevated';
  if (UNIT_PROFILES[attacker.kind].flying) return 'air';
  if (
    INDIRECT_FIRE_UNITS.includes(attacker.kind) ||
    (UNIT_PROFILES[attacker.kind].naval && UNIT_PROFILES[attacker.kind].siege)
  )
    return 'indirect';
  return attackStats(attacker).range <= 1 ? 'melee' : 'direct';
}

/** Clip the centre-to-centre segment against a hex's six half-planes.
 * Edge/corner contact counts as cover, symmetrically in both directions. */
function wallEntry(from: Hex, to: Hex, wall: Hex): number | undefined {
  const x = from.q - wall.q + (from.r - wall.r) / 2;
  const y = ((from.r - wall.r) * Math.sqrt(3)) / 2;
  const dx = to.q - from.q + (to.r - from.r) / 2;
  const dy = ((to.r - from.r) * Math.sqrt(3)) / 2;
  let enter = 0,
    leave = 1;
  for (const d of DIRECTIONS) {
    const nx = d.q + d.r / 2,
      ny = (d.r * Math.sqrt(3)) / 2;
    const origin = x * nx + y * ny,
      delta = dx * nx + dy * ny;
    if (Math.abs(delta) < 1e-9) {
      if (origin > 0.5 + 1e-9) return;
    } else {
      const t = (0.5 - origin) / delta;
      if (delta > 0) leave = Math.min(leave, t);
      else enter = Math.max(enter, t);
      if (enter > leave + 1e-9) return;
    }
  }
  return enter;
}

/** One authoritative target resolver, also used by previews, bots and projectiles. */
export function resolveAttack(
  attacker: Unit | Building,
  intended: Unit | Building,
  buildings: Iterable<Building>,
  getTile?: (p: Hex) => { terrain?: Terrain } | undefined,
) {
  let reason = attackBlockReason(attacker, intended);
  if (
    !reason &&
    getTile &&
    !('population' in attacker) &&
    UNIT_PROFILES[attacker.kind].submarine &&
    disk(attacker, distance(attacker, intended)).some(
      (p) => wallEntry(attacker, intended, p) !== undefined && !isSea(getTile(p)?.terrain),
    )
  )
    reason = 'Le trajet des torpilles doit rester entièrement en mer, sans terre ni case inconnue.';
  const trajectory = attackTrajectory(attacker);
  if (
    reason ||
    ['indirect', 'air', 'elevated'].includes(trajectory) ||
    (!('population' in intended) && UNIT_PROFILES[intended.kind].flying)
  )
    return { target: intended, intercepted: undefined, reason };
  const walls = [...buildings]
    .filter((b) => isWall(b.kind) && b.hp > 0)
    .map((wall) => ({ wall, t: wallEntry(attacker, intended, wall) }))
    .filter((v): v is { wall: Building; t: number } => v.t !== undefined)
    .sort((a, b) => a.t - b.t || a.wall.q - b.wall.q || a.wall.r - b.wall.r);
  const wall = walls[0]?.wall;
  return {
    target: wall ?? intended,
    intercepted: wall && wall.id !== intended.id ? wall : undefined,
    reason:
      wall?.ownerId === attacker.ownerId
        ? 'Votre rempart bloque cette attaque. Utilisez une tourelle, un tir en cloche ou une unité aérienne.'
        : '',
  };
}
export const targetTerrainDefense = (target: Unit | Building, terrain: Terrain) =>
  !('population' in target) && UNIT_PROFILES[target.kind].flying ? 0 : TERRAINS[terrain].defense;

export function estimateDamage(
  attacker: Unit | Building,
  target: Unit | Building,
  tile: Tile,
  units: readonly Unit[] = [],
  attackerTerrain?: Terrain,
) {
  const a = attackStats(attacker, attackerTerrain);
  const aura = (actor: Unit | Building) =>
    'population' in actor || actor.kind === 'HERO'
      ? 0
      : Math.max(
          0,
          ...units
            .filter(
              (u) =>
                u.kind === 'HERO' &&
                u.hp > 0 &&
                u.ownerId === actor.ownerId &&
                distance(u, actor) <= 2,
            )
            .map((u) => heroAura(u.hero?.xp)),
        );
  const atk = 'population' in target && 'buildingAttack' in a ? a.buildingAttack : a.attack;
  const defense =
    'population' in target
      ? Math.floor(target.level / 2) + (BUILDING_DEFENSE[target.kind] ?? 0)
      : unitCombatStats(target, tile.terrain).defense;
  const counterMultiplier =
    'population' in attacker
      ? 1
      : (1 + ((attacker.trainingBonus ?? 0) + (attacker.rareBonus ?? 0)) / 100) *
        (1 - Math.min(20, Math.max(0, attacker.foodPenalty ?? 0)) / 100);
  const antiArmor =
    !('population' in attacker) &&
    (UNIT_PROFILES[attacker.kind].antiArmor ?? 0) > 0 &&
    !('population' in target) &&
    UNIT_PROFILES[target.kind].armored;
  const antiAir =
    !('population' in target) && UNIT_PROFILES[target.kind].flying
      ? ('population' in attacker
          ? (turretStats(attacker)?.antiAir ?? 0)
          : (UNIT_PROFILES[attacker.kind].antiAir ?? 0)) * counterMultiplier
      : 0;
  const bonus = antiArmor
    ? UNIT_PROFILES[attacker.kind].antiArmor! * counterMultiplier
    : !('population' in target) &&
        !('population' in attacker) &&
        (UNIT_PROFILES[attacker.kind].antiCavalry ?? 0) > 0 &&
        UNIT_PROFILES[target.kind].mounted
      ? UNIT_PROFILES[attacker.kind].antiCavalry! * counterMultiplier
      : !('population' in target) &&
          attacker.kind === 'CROSSBOW' &&
          ['GUARD', 'PALADIN', 'KNIGHT'].includes(target.kind)
        ? 6 * counterMultiplier
        : 0;
  const base = Math.max(
    1,
    Math.round(
      atk * (1 + aura(attacker)) +
        bonus +
        antiAir -
        defense * (1 + aura(target)) * (antiArmor ? 0.25 : antiAir > 0 ? 0.5 : 1) -
        targetTerrainDefense(target, tile.terrain),
    ),
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
  if (alliedRealmIds(s, a.id).includes(b.id)) return 'Votre alliance interdit cette attaque.';
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
    ap: bot ? RULES.maxAP : RULES.startingAP,
    apAt: now,
    economyAt: now,
    lastSeen: now,
    protectedUntil: bot ? 0 : now + RULES.protection,
    capital,
    explored: {},
    trophyDevelopment: { version: 1, grandfatheredLevel: 1 },
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
    balanceVersion: BALANCE_VERSION,
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
    return memory[k]
      ? { ...memory[k], biome: memory[k].biome ?? biomeAt(s.seed, p), visibility: 'EXPLORED' }
      : { ...p, visibility: 'UNKNOWN' };
  const t = tileAt(s, p);
  return {
    q: p.q,
    r: p.r,
    visibility: 'VISIBLE',
    terrain: t.terrain,
    biome: t.biome,
    ownerId: t.ownerId,
    enclosureOwnerId: t.enclosureOwnerId,
    building: t.buildingId ? s.buildings[t.buildingId] : undefined,
    road: t.road,
    roadOwnerId: t.roadOwnerId,
    poi: t.poi,
    islandDiscovery: t.islandDiscovery,
    exhausted: t.exhausted,
    capture: t.capture,
  };
}

/** Shared site validation; visibility and budgets are checked by the caller. */
export function terraformSiteReason(
  tile: Hex & { terrain?: Terrain; ownerId?: string; buildingId?: string; building?: Building },
  ownerId: string,
  unit: Unit,
  units: readonly Unit[],
  capital?: Hex,
) {
  if (isSea(tile.terrain)) return 'La mer ne peut pas être terrassée.';
  if (unit.ownerId !== ownerId || unit.kind !== 'TERRAFORMER')
    return 'Sélectionnez votre terrassier arcanique.';
  if (distance(unit, tile) > 1) return 'Le terrassier doit être à une case maximum du chantier.';
  if (tile.ownerId && tile.ownerId !== ownerId)
    return 'Impossible de transformer un territoire ennemi.';
  if (
    (tile.buildingId || tile.building) &&
    !(
      tile.terrain === 'SCORCHED' &&
      tile.ownerId === ownerId &&
      capital &&
      key(tile) === key(capital)
    )
  )
    return 'Démolissez le bâtiment avant de transformer ce terrain.';
  if (!tile.terrain || tile.terrain === 'PLAIN') return 'Cette case est déjà une plaine.';
  if (units.some((u) => u.ownerId !== ownerId && key(u) === key(tile)))
    return 'Une unité ennemie occupe ce terrain.';
  return '';
}
