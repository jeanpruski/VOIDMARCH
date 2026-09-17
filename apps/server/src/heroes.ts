import { randomInt } from 'node:crypto';
import {
  BUILDINGS,
  HERO_POWERS,
  HERO_RULES,
  UNITS,
  UNIT_PROFILES,
  randomHeroAppearance,
  type HeroPower,
} from '@voidmarch/config';
import {
  canAfford,
  disk,
  distance,
  hash,
  key,
  movementCost,
  observe,
  publicTile,
  realmBuildings,
  realmUnits,
  tileAt,
  transfer,
  unitStats,
} from '@voidmarch/game-rules';
import type { GameState, Unit } from '@voidmarch/shared';

/** Once per account; absent heroes return only after recovery and kingdom reconstruction. */
export function ensureHeroes(s: GameState, now: number) {
  for (const r of Object.values(s.realms)) {
    if (r.bot) continue;
    if (!r.hero) {
      let i = 0;
      r.hero = {
        appearance: randomHeroAppearance(() => hash(`${r.id}:hero:${i++}`)),
        xp: 0,
        cooldowns: {},
      };
      s.revision++;
    }
    const existing = realmUnits(s, r.id).filter((u) => u.kind === 'HERO');
    if (r.defeatedAt) {
      for (const u of existing) delete s.units[u.id];
      continue;
    }
    if (existing.length) {
      const u = existing[0];
      u.hero = { appearance: r.hero.appearance, name: r.name, xp: r.hero.xp };
      for (const duplicate of existing.slice(1)) delete s.units[duplicate.id];
      continue;
    }
    if ((r.hero.recoverAt ?? 0) > now) continue;
    const candidates = disk(r.capital, 4).filter(
      (p) =>
        distance(p, r.capital) > 0 &&
        !Object.values(s.units).some((u) => distance(u, p) === 0) &&
        (!tileAt(s, p).ownerId || tileAt(s, p).ownerId === r.id) &&
        !tileAt(s, p).buildingId &&
        movementCost(tileAt(s, p), 'HERO') <= UNITS.HERO.move,
    );
    if (!candidates.length) continue;
    const p = candidates[randomInt(candidates.length)];
    const id = `hero:${r.id}`;
    s.units[id] = {
      ...p,
      id,
      kind: 'HERO',
      ownerId: r.id,
      hp: UNITS.HERO.hp,
      hero: { appearance: r.hero.appearance, name: r.name, xp: r.hero.xp },
      createdAt: now,
      updatedAt: now,
    };
    delete r.hero.recoverAt;
    s.revision++;
    observe(s, r, now);
  }
}
export function incapacitateHero(s: GameState, u: Unit, now: number): boolean {
  if (u.kind !== 'HERO') return false;
  const r = s.realms[u.ownerId];
  if (r?.hero) r.hero.recoverAt = now + HERO_RULES.recovery;
  delete s.units[u.id];
  return true;
}
export function heroPower(
  s: GameState,
  u: Unit,
  power: HeroPower,
  now: number,
): { ok: boolean; message: string } {
  const r = s.realms[u.ownerId],
    h = r?.hero,
    config = HERO_POWERS[power];
  const no = (message: string) => ({ ok: false, message });
  if (u.kind !== 'HERO' || !h || !config || u.hp <= 0)
    return no('Seul votre héros peut utiliser ce pouvoir.');
  if ((h.cooldowns[power] ?? 0) > now)
    return no(`Pouvoir disponible dans ${Math.ceil((h.cooldowns[power]! - now) / 1000)} secondes.`);
  if (!r.unlimitedAP && r.ap < config.ap) return no('2 PA nécessaires.');
  if (!canAfford(r.wallet, config.cost)) return no('Ressources insuffisantes : 20 bois et 10 fer.');
  const allies = realmUnits(s, r.id).filter(
    (a) => distance(a, u) <= 2 && !UNIT_PROFILES[a.kind].mechanical && a.hp < unitStats(a).hp,
  );
  const buildings = realmBuildings(s, r.id).filter(
    (b) => distance(b, u) <= 1 && b.hp < BUILDINGS[b.kind].hp * b.level,
  );
  if (power === 'HERO_MEND' && !allies.length)
    return no('Aucun allié biologique blessé à 2 cases.');
  if (power === 'HERO_RESTORE' && !buildings.length) return no('Aucun bâtiment blessé à 1 case.');
  if (!r.unlimitedAP) r.ap -= config.ap;
  transfer(r.wallet, config.cost, -1);
  if (power === 'HERO_MEND')
    for (const a of allies) {
      a.hp = Math.min(unitStats(a).hp, Math.round((a.hp + unitStats(a).hp * 0.2) * 100) / 100);
      a.updatedAt = now;
    }
  if (power === 'HERO_RESTORE')
    for (const b of buildings) {
      b.hp = Math.min(
        BUILDINGS[b.kind].hp * b.level,
        b.hp + Math.ceil(BUILDINGS[b.kind].hp * b.level * 0.2),
      );
      b.updatedAt = now;
    }
  if (power === 'HERO_SURVEY') {
    const seen = new Set(disk(u, 8).map(key));
    for (const p of disk(u, 8))
      r.explored[key(p)] = { ...publicTile(s, p, seen, r.explored), visibility: 'EXPLORED' };
  }
  h.cooldowns[power] = now + HERO_RULES.cooldown;
  h.xp = Math.min(HERO_RULES.maxXP, h.xp + 2);
  u.hero = { appearance: h.appearance, name: r.name, xp: h.xp };
  return {
    ok: true,
    message: `${config.name} : ${power === 'HERO_MEND' ? `${allies.length} allié(s) soigné(s) de 20 % de leurs PV maximum` : power === 'HERO_RESTORE' ? `${buildings.length} bâtiment(s) réparé(s) de 20 %` : 'terrains cartographiés à 8 cases'}. +2 expérience de héros (maximum 60). Recharge : 5 min.`,
  };
}
