import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  BUILDINGS,
  BUILDING_MIN_ERA,
  BUILDING_REQUIREMENTS,
  ERA_REQUIREMENTS,
  ERA_COSTS,
  ERA_AP_COST,
  eraMissing,
  unitRequiredEra,
  buildingEra,
  buildingVisualLevel,
  developmentReason,
  constructionDevelopmentStage,
  buildingUpgradeReason,
  type BuildingKind,
} from '@voidmarch/config';
import {
  createState,
  developmentProgress,
  migrateKingdomEras,
  recruitmentRequirement,
  writeTile,
  unitStats,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView, archive } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { prepareTrophies } from './fixtures/development';
const now = 1_900_000_000_000;
const order = (type: string, actorId: string, payload = {}) =>
  actionSchema.parse({ type, actorId, payload, actionId: randomUUID(), clientTimestamp: now });
function fixture() {
  const s = createState('kingdom-eras', now);
  const r = addPlayer(s, 'p', 'Chronologie', 'MASK', now);
  r.wallet = { GOLD: 1e7, WOOD: 1e7, STONE: 1e7, IRON: 1e7, FOOD: 1e7 };
  return { s, r };
}
describe('époques du royaume', () => {
  it('aucune chaîne de construction ni passage ne dépend d’une époque future', () => {
    for (const kind of Object.keys(BUILDINGS) as BuildingKind[])
      for (const parent of BUILDING_REQUIREMENTS[kind] ?? [])
        expect(BUILDING_MIN_ERA[parent], `${kind} -> ${parent}`).toBeLessThanOrEqual(
          BUILDING_MIN_ERA[kind],
        );
    for (const target of [2, 3, 4, 5])
      for (const req of ERA_REQUIREMENTS[target]) {
        expect(req.level).toBeLessThan(target);
        for (const kind of req.kinds) expect(BUILDING_MIN_ERA[kind]).toBeLessThan(target);
      }
  });
  it('bloque les garages et fusiliers même riches et avec des trophées, puis reste cohérent entre client et serveur', () => {
    const { s, r } = fixture();
    prepareTrophies(s, r.id, 5, now);
    expect(r.era?.level).toBe(1);
    const workshop = addBuilding(s, r, { q: r.capital.q + 1, r: r.capital.r }, 'WORKSHOP', now);
    const site = { q: r.capital.q + 2, r: r.capital.r };
    writeTile(s, site, { terrain: 'PLAIN', ownerId: r.id });
    const build = order('BUILD', r.id, { ...site, kind: 'GARAGE' });
    expect(execute(s, r.id, build, now).result.reason).toContain('Époque 3');
    expect(predictAction(worldView(s, r.id, now), build)).toBeUndefined();
    const arsenal = addBuilding(s, r, site, 'ARSENAL', now);
    addBuilding(s, r, { q: site.q + 1, r: site.r }, 'MUNITIONS', now);
    const all = Object.values(s.buildings);
    expect(
      recruitmentRequirement('RIFLEMAN', arsenal, all, developmentProgress(s, r.id)),
    ).toContain('Époque 3');
    expect(
      buildingUpgradeReason(
        all,
        workshop.kind,
        { kind: workshop.kind, level: 2 },
        developmentProgress(s, r.id),
      ),
    ).toContain('Époque 2');
    r.era!.level = 3;
    expect(recruitmentRequirement('RIFLEMAN', arsenal, all, developmentProgress(s, r.id))).toBe('');
  });
  it('paye chacun des quatre passages, conserve les trophées et refuse les doubles clics ou sauts', () => {
    let { s, r } = fixture();
    for (const target of [2, 3, 4, 5]) {
      if (target < 5)
        expect(
          execute(s, r.id, order('ADVANCE_ERA', r.id, { era: target + 1 }), now).result.accepted,
        ).toBe(false);
      for (const req of ERA_REQUIREMENTS[target]) {
        const b =
          Object.values(s.buildings).find((b) => req.kinds.includes(b.kind)) ??
          addBuilding(
            s,
            s.realms.p,
            { q: r.capital.q + Object.keys(s.buildings).length + 1, r: r.capital.r },
            req.kinds[0],
            now,
          );
        b.level = req.level;
      }
      const command = order('ADVANCE_ERA', r.id, { era: target });
      const missing = execute(s, r.id, command, now);
      expect(missing.result.reason).toContain('trophées');
      prepareTrophies(s, r.id, target, now);
      s.realms.p.ap = 20;
      const before = structuredClone(s.realms.p.wallet);
      const trophies = structuredClone(s.missions!.p.trophies);
      const prediction = predictAction(worldView(s, r.id, now), command)!;
      const result = execute(s, r.id, command, now);
      expect(result.result.accepted, result.result.reason).toBe(true);
      s = result.state;
      expect(s.realms.p.era?.level).toBe(target);
      expect(s.realms.p.ap).toBe(20 - ERA_AP_COST);
      for (const [resource, value] of Object.entries(ERA_COSTS[target]))
        expect(s.realms.p.wallet[resource as keyof typeof before]).toBe(
          before[resource as keyof typeof before] - value,
        );
      expect(prediction.world.player.wallet).toEqual(s.realms.p.wallet);
      expect(prediction.world.player.era).toEqual(s.realms.p.era);
      expect(s.missions!.p.trophies).toEqual(trophies);
      expect(
        execute(s, r.id, order('ADVANCE_ERA', r.id, { era: target }), now).result.accepted,
      ).toBe(false);
      expect(JSON.parse(JSON.stringify(s)).realms.p.era.level).toBe(target);
    }
  });
  it('refuse sans mutation un coût insuffisant, des infrastructures absentes ou un autre propriétaire', () => {
    const { s, r } = fixture();
    prepareTrophies(s, r.id, 2, now);
    expect(execute(s, r.id, order('ADVANCE_ERA', r.id, { era: 2 }), now).result.reason).toContain(
      'Atelier',
    );
    for (const req of ERA_REQUIREMENTS[2])
      addBuilding(
        s,
        r,
        { q: r.capital.q + Object.keys(s.buildings).length, r: r.capital.r },
        req.kinds[0],
        now,
      );
    r.wallet.IRON = ERA_COSTS[2].IRON! - 1;
    const before = JSON.stringify(s);
    expect(execute(s, r.id, order('ADVANCE_ERA', r.id, { era: 2 }), now).result.accepted).toBe(
      false,
    );
    expect(JSON.stringify(s)).toBe(before);
    r.wallet.IRON = 1e7;
    expect(execute(s, r.id, order('ADVANCE_ERA', 'other', { era: 2 }), now).result.accepted).toBe(
      false,
    );
    r.ap = ERA_AP_COST - 1;
    expect(execute(s, r.id, order('ADVANCE_ERA', r.id, { era: 2 }), now).result.accepted).toBe(
      false,
    );
  });
  it('conserve les acquis des anciennes sauvegardes et archives une seule fois, sans donner de ressources', () => {
    const { s, r } = fixture();
    delete r.era;
    addBuilding(s, r, { q: r.capital.q + 1, r: r.capital.r }, 'GARAGE', now);
    s.archives.p = archive(s, r, now);
    s.archives.p.units.push({
      id: 'old-glocke',
      ownerId: r.id,
      kind: 'GLOCKE_VRIL',
      q: 0,
      r: 0,
      hp: 1,
      createdAt: now,
      updatedAt: now,
    });
    const wallet = structuredClone(r.wallet);
    expect(migrateKingdomEras(s)).toBe(true);
    expect(r).toMatchObject({ era: { level: 3 } });
    expect(s.archives.p.realm.era?.level).toBe(5);
    expect(r.wallet).toEqual(wallet);
    const saved = JSON.stringify(s);
    expect(migrateKingdomEras(s)).toBe(false);
    expect(JSON.stringify(s)).toBe(saved);
    s.buildings = {};
    expect(developmentProgress(s, r.id).era).toBe(3);
  });
  it('garde les visuels dans leur époque, même pour une base sous-marine niveau 1', () => {
    expect(buildingEra('GARAGE', 1)).toBe('Guerre industrielle');
    expect(buildingEra('GARAGE', 3)).toBe('Guerre industrielle');
    expect(buildingVisualLevel('SUBMARINE_BASE', 1)).toBe(3);
    expect(buildingVisualLevel('PORT', 1)).toBe(1);
    expect(unitRequiredEra('VOID_ACOLYTE')).toBe(4);
    expect(unitRequiredEra('GLOCKE_VRIL')).toBe(5);
  });
});
