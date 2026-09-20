import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  HERO_LABELS,
  HERO_PARTS,
  HERO_RULES,
  UNITS,
  BUILDINGS,
  randomHeroAppearance,
  heroAura,
  unitPopulation,
  unitUpkeep,
} from '@voidmarch/config';
import {
  createState,
  createRealm,
  disk,
  distance,
  writeTile,
  estimateDamage,
  unitStats,
  realmUnits,
  zeroWallet,
} from '@voidmarch/game-rules';
import { actionSchema, heroAppearanceSchema, settingsSchema } from '@voidmarch/protocol';
import {
  addPlayer,
  addBuilding,
  execute,
  defeat,
  defaultOptions,
  worldView,
} from '../apps/server/src/engine';
import { ensureHeroes } from '../apps/server/src/heroes';
import { predictAction } from '../apps/web/src/optimistic-actions';
const now = 1_900_000_000_000;
const command = (type: string, actorId: string, payload = {}) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture() {
  const s = createState('heroes', now),
    r = addPlayer(s, 'a', 'Jean', 'ASH', now);
  r.protectedUntil = 0;
  for (const p of disk(r.capital, 10)) writeTile(s, p, { terrain: 'PLAIN' });
  ensureHeroes(s, now);
  return { s, r, u: realmUnits(s, 'a').find((u) => u.kind === 'HERO')! };
}
describe('héros permanent et apparence', () => {
  it('offre 15 choix par pièce et valide strictement leurs couleurs et indices', () => {
    for (const p of HERO_PARTS) expect(HERO_LABELS[p]).toHaveLength(15);
    const a = randomHeroAppearance(() => 0.999);
    expect(heroAppearanceSchema.parse(a)).toEqual(a);
    expect(heroAppearanceSchema.safeParse({ ...a, head: 15 }).success).toBe(false);
    expect(
      heroAppearanceSchema.safeParse({ ...a, colors: { ...a.colors, armor: 'url(test)' } }).success,
    ).toBe(false);
    expect(settingsSchema.safeParse({ heroAppearance: a }).success).toBe(false);
  });
  it('crée exactement un héros, sans modifier les ressources, PA ou premier paysan gratuit', () => {
    const { s, r, u } = fixture();
    const appearance = structuredClone(r.hero!.appearance);
    expect(u.hero!.name).toBe('Jean');
    expect(u.hp).toBe(80);
    expect(unitPopulation('HERO')).toBe(0);
    expect(unitUpkeep('HERO')).toEqual(zeroWallet());
    ensureHeroes(s, now + 100);
    expect(realmUnits(s, 'a')).toHaveLength(1);
    expect(r.hero!.appearance).toEqual(appearance);
    const camp = Object.values(s.buildings)[0];
    expect([u.q, u.r]).not.toEqual([camp.q, camp.r]);
    expect(distance(u, camp)).toBeLessThanOrEqual(4);
    const result = execute(s, 'a', command('RECRUIT', camp.id, { kind: 'PEASANT' }), now, {
      ...defaultOptions,
      recruitBonus: () => 0,
    });
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.realms.a.wallet).toEqual(r.wallet);
    expect(result.state.realms.a.ap).toBe(39);
  });
  it('attend une case libre dans les quatre hexagones plutôt que de naître plus loin', () => {
    const { s, r, u } = fixture();
    delete s.units[u.id];
    for (const p of disk(r.capital, 4)) writeTile(s, p, { ownerId: 'enemy' });
    ensureHeroes(s, now + 1);
    expect(s.units[u.id]).toBeUndefined();
    const available = { q: r.capital.q + 4, r: r.capital.r };
    writeTile(s, available, { ownerId: r.id });
    ensureHeroes(s, now + 2);
    expect(s.units[u.id]).toMatchObject(available);
  });
  it('conserve une apparence choisie et actualise seulement le pseudo', () => {
    const { s, r, u } = fixture(),
      a = randomHeroAppearance(() => 0.1);
    r.hero!.appearance = a;
    r.name = 'NouveauPseudo';
    ensureHeroes(s, now);
    expect(s.units[u.id].hero).toMatchObject({ appearance: a, name: 'NouveauPseudo' });
    const saved = JSON.parse(JSON.stringify(s));
    ensureHeroes(saved, now + 1);
    expect(saved.realms.a.hero.appearance).toEqual(a);
  });
  it('ne permet ni recrutement supplémentaire, ni attaque, ni capture, ni ralliement détourné', () => {
    const { s, u } = fixture();
    const camp = Object.values(s.buildings)[0];
    for (const action of [
      command('RECRUIT', camp.id, { kind: 'HERO' }),
      command('ATTACK', u.id, { targetId: camp.id }),
      command('CAPTURE', u.id),
      command('ABILITY', u.id, { ability: 'RALLY' }),
    ]) {
      const result = execute(s, 'a', action, now);
      expect(result.result.accepted).toBe(false);
      expect(result.state.realms.a.ap).toBe(40);
    }
  });
  it('met hors combat, libère la case et revient avec la même apparence après cinq minutes', () => {
    const { s, r, u } = fixture();
    s.realms.b = createRealm('b', 'Adversaire', 'IRON', { q: u.q + 1, r: u.r }, now);
    s.realms.b.protectedUntil = 0;
    s.units.enemy = {
      id: 'enemy',
      kind: 'GLOCKE_APOCALYPSE',
      ownerId: 'b',
      q: u.q + 1,
      r: u.r,
      hp: 320,
      trainingBonus: 60,
      createdAt: now,
      updatedAt: now,
    };
    u.hp = 1;
    const result = execute(s, 'b', command('ATTACK', 'enemy', { targetId: u.id }), now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.result.message).toContain('hors combat');
    expect(result.state.units[u.id]).toBeUndefined();
    expect(result.state.realms.a.hero!.recoverAt).toBe(now + HERO_RULES.recovery);
    ensureHeroes(result.state, now + HERO_RULES.recovery - 1);
    expect(result.state.units[u.id]).toBeUndefined();
    ensureHeroes(result.state, now + HERO_RULES.recovery);
    expect(result.state.units[u.id].hp).toBe(80);
    expect(result.state.units[u.id].hero!.appearance).toEqual(r.hero!.appearance);
  });
  it('attend la reconstruction du royaume après une défaite', () => {
    const { s, r } = fixture();
    const a = structuredClone(r.hero!.appearance);
    defeat(s, r, now);
    ensureHeroes(s, now + HERO_RULES.recovery);
    expect(realmUnits(s, 'a')).toHaveLength(0);
    const result = execute(s, 'a', command('RESPAWN', 'a'), now + 600_001);
    expect(result.result.accepted).toBe(true);
    ensureHeroes(result.state, now + 600_001);
    expect(realmUnits(result.state, 'a').filter((u) => u.kind === 'HERO')).toHaveLength(1);
    expect(result.state.realms.a.hero!.appearance).toEqual(a);
  });
});
describe('pouvoirs et aura', () => {
  it('soigne les alliés biologiques, dépense les PA et applique la recharge côté serveur', () => {
    const { s, u } = fixture();
    s.units.soldier = {
      id: 'soldier',
      kind: 'INFANTRY',
      ownerId: 'a',
      q: u.q + 1,
      r: u.r,
      hp: 10,
      createdAt: now,
      updatedAt: now,
    };
    s.units.tank = { ...s.units.soldier, id: 'tank', kind: 'TANK', r: u.r + 1 };
    const action = command('ABILITY', u.id, { ability: 'HERO_MEND' }),
      result = execute(s, 'a', action, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.units.soldier.hp).toBe(16);
    expect(result.state.units.tank.hp).toBe(10);
    expect(result.state.realms.a.ap).toBe(38);
    expect(result.state.realms.a.hero!.xp).toBe(2);
    const repeated = execute(
      result.state,
      'a',
      command('ABILITY', u.id, { ability: 'HERO_MEND' }),
      now + 1,
    );
    expect(repeated.result.accepted).toBe(false);
    expect(repeated.state.realms.a.ap).toBe(38);
    expect(predictAction(worldView(s, 'a', now), action)).toBeUndefined();
  });
  it('répare les bâtiments avec des matériaux et refuse les pouvoirs inutiles', () => {
    const { s, r, u } = fixture();
    r.wallet.WOOD = 20;
    r.wallet.IRON = 10;
    const b = addBuilding(s, r, { q: u.q, r: u.r + 1 }, 'STEEL_WALL', now);
    b.hp = 10;
    const result = execute(s, 'a', command('ABILITY', u.id, { ability: 'HERO_RESTORE' }), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.buildings[b.id].hp).toBe(10 + BUILDINGS.STEEL_WALL.hp * 0.2);
    expect(result.state.realms.a.wallet.IRON).toBe(0);
    const invalid = execute(s, 'a', command('ABILITY', u.id, { ability: 'HERO_MEND' }), now);
    expect(invalid.result.accepted).toBe(false);
    expect(invalid.state.realms.a.ap).toBe(40);
  });
  it('réserve les pouvoirs au héros et plafonne son expérience', () => {
    const { s, r, u } = fixture();
    r.hero!.xp = 59;
    const camp = Object.values(s.buildings)[0];
    expect(
      execute(s, 'a', command('ABILITY', camp.id, { ability: 'HERO_SURVEY' }), now).result.accepted,
    ).toBe(false);
    const result = execute(s, 'a', command('ABILITY', u.id, { ability: 'HERO_SURVEY' }), now);
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.a.hero!.xp).toBe(60);
    expect(heroAura(999)).toBe(0.12);
    const outer = { q: u.q + 8, r: u.r };
    expect(result.state.realms.a.explored[`${outer.q},${outer.r}`].visibility).toBe('EXPLORED');
  });
  it('applique une aura bornée à deux cases, sans cumul, et la retire hors combat', () => {
    const { u } = fixture();
    u.hero!.xp = 60;
    const a = { ...u, hero: undefined, id: 'soldier', kind: 'TANK' as const, q: u.q + 1 },
      b = { ...a, id: 'enemy', ownerId: 'b', kind: 'MILITIA' as const };
    const tile = { q: 0, r: 0, terrain: 'PLAIN' as const };
    const normal = estimateDamage(a, b, tile),
      near = estimateDamage(a, b, tile, [u]);
    expect(near.min).toBeGreaterThan(normal.min);
    expect(estimateDamage(a, b, tile, [u, { ...u, id: 'duplicate' }])).toEqual(near);
    expect(estimateDamage(a, b, tile, [{ ...u, hp: 0 }])).toEqual(normal);
    expect(estimateDamage(a, b, tile, [{ ...u, q: u.q - 8 }])).toEqual(normal);
  });
});
