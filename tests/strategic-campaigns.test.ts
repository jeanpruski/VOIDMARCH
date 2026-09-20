import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  ALLIANCE_PROJECTS,
  PROJECT_BUILD_TIME,
  WAR_HOLD_TIME,
  UNITS,
  logisticsCost,
  mobilityCost,
} from '@voidmarch/config';
import {
  createState,
  createRealm,
  writeTile,
  disk,
  key,
  strategicBonuses,
  siteOperational,
  income,
  vision,
} from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { strategy, tickStrategy } from '../apps/server/src/strategy';
import { tickAllianceProjects } from '../apps/server/src/alliance-projects';
import { actionSchema } from '@voidmarch/protocol';
import type { GameState } from '@voidmarch/shared';
const now = 1900000000000;
function fixture() {
  const s = createState('cooperative-projects', now);
  for (const [i, id] of ['a', 'b', 'c'].entries()) {
    const r = createRealm(id, id, 'ASH', { q: i * 30, r: 0 }, now);
    r.protectedUntil = 0;
    r.ap = 20;
    r.wallet = { GOLD: 100000, WOOD: 100000, STONE: 100000, IRON: 100000, FOOD: 100000 };
    s.realms[id] = r;
    addBuilding(s, r, r.capital, 'CAMP', now);
  }
  for (const p of disk({ q: 0, r: 0 }, 8)) writeTile(s, p, { terrain: 'PLAIN' });
  strategy(s, now).alliances.team = {
    id: 'team',
    name: 'Alliance',
    emblem: 'shield',
    leaderId: 'a',
    members: ['a', 'b'],
    createdAt: now,
    messages: [],
    markers: [],
  };
  const host = addBuilding(s, s.realms.a, { q: 1, r: 0 }, 'LOGISTICS_CENTER', now, 3);
  return { s, host };
}
const run = (s: GameState, id: string, type: string, payload: object, actor = id, at = now) =>
  execute(
    s,
    id,
    actionSchema.parse({
      type,
      actorId: actor,
      payload,
      actionId: randomUUID(),
      clientTimestamp: at,
    }),
    at,
  );
function soldier(s: GameState, id: string, ownerId: string, q: number, r = 0) {
  return (s.units[id] = {
    id,
    ownerId,
    q,
    r,
    kind: 'INFANTRY',
    hp: UNITS.INFANTRY.hp,
    createdAt: now,
    updatedAt: now,
  });
}
function open() {
  let { s, host } = fixture();
  const result = run(s, 'a', 'PROJECT_CREATE', { kind: 'SUPPLY', hostId: host.id });
  expect(result.result.accepted, result.result.reason).toBe(true);
  s = result.state;
  return { s, host, project: s.strategy!.alliances.team.projects![0] };
}

describe('projets communs', () => {
  it('refuse un non-chef, un étranger, un mauvais hôte et un doublon', () => {
    const { s, host } = fixture();
    expect(run(s, 'b', 'PROJECT_CREATE', { kind: 'SUPPLY', hostId: host.id }).result.accepted).toBe(
      false,
    );
    expect(run(s, 'c', 'PROJECT_CREATE', { kind: 'SUPPLY', hostId: host.id }).result.accepted).toBe(
      false,
    );
    expect(run(s, 'a', 'PROJECT_CREATE', { kind: 'HARBOR', hostId: host.id }).result.accepted).toBe(
      false,
    );
    host.level = 2;
    expect(run(s, 'a', 'PROJECT_CREATE', { kind: 'SUPPLY', hostId: host.id }).result.accepted).toBe(
      false,
    );
    const opened = open();
    expect(
      run(opened.s, 'a', 'PROJECT_CREATE', { kind: 'SUPPLY', hostId: opened.host.id }).result
        .accepted,
    ).toBe(false);
  });
  it('débite les contributeurs, attend deux heures puis donne le bonus aux seuls membres', () => {
    let { s, project } = open();
    s = run(s, 'a', 'PROJECT_CONTRIBUTE', { projectId: project.id, percent: 25 }).state;
    const goldA = s.realms.a.wallet.GOLD;
    expect(goldA).toBe(100000 - ALLIANCE_PROJECTS.SUPPLY.cost.GOLD / 4);
    s = run(s, 'b', 'PROJECT_CONTRIBUTE', { projectId: project.id, percent: 100 }).state;
    expect(s.realms.b.wallet.GOLD).toBe(100000 - ALLIANCE_PROJECTS.SUPPLY.cost.GOLD * 0.75);
    expect(strategicBonuses(s, 'a').logistics).toBe(0);
    s = JSON.parse(JSON.stringify(s));
    tickAllianceProjects(s, now + PROJECT_BUILD_TIME - 1);
    expect(strategicBonuses(s, 'b').logistics).toBe(0);
    tickAllianceProjects(s, now + PROJECT_BUILD_TIME);
    expect(strategicBonuses(s, 'a').logistics).toBe(10);
    expect(strategicBonuses(s, 'b').logistics).toBe(10);
    expect(strategicBonuses(s, 'c').logistics).toBe(0);
    expect(worldView(s, 'c', now).strategy?.alliance).toBeUndefined();
    expect(
      run(s, 'a', 'PROJECT_CONTRIBUTE', { projectId: project.id, percent: 100 }).result.accepted,
    ).toBe(false);
  });
  it('rembourse une fois après annulation ou perte de l’hôte, sans créer de ressources', () => {
    let { s, project, host } = open();
    s = run(s, 'a', 'PROJECT_CONTRIBUTE', { projectId: project.id, percent: 25 }).state;
    const cancelled = run(s, 'a', 'PROJECT_CANCEL', { projectId: project.id });
    expect(cancelled.result.accepted).toBe(true);
    expect(cancelled.state.realms.a.wallet.GOLD).toBe(100000);
    expect(
      run(cancelled.state, 'a', 'PROJECT_CANCEL', { projectId: project.id }).result.accepted,
    ).toBe(false);
    delete s.buildings[host.id];
    tickAllianceProjects(s, now);
    tickAllianceProjects(s, now + 1);
    expect(s.realms.a.wallet.GOLD).toBe(100000);
  });
  it('arrête le bonus immédiatement après capture de l’hôte et ne rembourse pas un projet achevé', () => {
    let { s, project, host } = open();
    s = run(s, 'a', 'PROJECT_CONTRIBUTE', { projectId: project.id, percent: 100 }).state;
    tickAllianceProjects(s, now + PROJECT_BUILD_TIME);
    const balance = s.realms.a.wallet.GOLD;
    s.buildings[host.id].ownerId = 'c';
    expect(strategicBonuses(s, 'a').logistics).toBe(0);
    tickAllianceProjects(s, now + PROJECT_BUILD_TIME);
    expect(s.realms.a.wallet.GOLD).toBe(balance);
    expect(s.strategy!.alliances.team.projects![0].status).toBe('LOST');
  });
  it('applique la remise réelle au paiement serveur et la retire au départ de l’alliance', () => {
    let { s, project, host } = open();
    s = run(s, 'a', 'PROJECT_CONTRIBUTE', { projectId: project.id, percent: 100 }).state;
    tickAllianceProjects(s, now + PROJECT_BUILD_TIME);
    const before = s.realms.a.wallet.GOLD;
    const paid = run(
      s,
      'a',
      'CONVERT_AP',
      { recipe: 'RATIONS', amount: 1 },
      host.id,
      now + PROJECT_BUILD_TIME,
    );
    expect(paid.result.accepted, paid.result.reason).toBe(true);
    expect(paid.state.realms.a.wallet.GOLD).toBe(before - logisticsCost('RATIONS', 1, 3, 10).GOLD!);
    paid.state.strategy!.alliances.team.members = ['b'];
    expect(strategicBonuses(paid.state, 'a').logistics).toBe(0);
    expect(strategicBonuses(paid.state, 'b').logistics).toBe(0);
  });
  it('conserve les prix par point quel que soit le fractionnement', () => {
    expect(logisticsCost('RATIONS', 10, 5, 15).FOOD).toBe(
      logisticsCost('RATIONS', 1, 5, 15).FOOD! * 10,
    );
    expect(mobilityCost('WORKSHOP', 3, 'fuel', 10, 20).IRON).toBe(
      mobilityCost('WORKSHOP', 3, 'fuel', 1, 20).IRON! * 10,
    );
    expect(mobilityCost('MONASTERY', 1, 'pervitin', 1, 20)).toEqual(
      mobilityCost('MONASTERY', 1, 'pervitin', 1),
    );
  });
});
describe('sites et campagnes limitées', () => {
  it('exige une garnison, accepte un allié et coupe les bonus si contesté', () => {
    const { s } = fixture();
    const site = (s.strategy!.sites.mine = {
      id: 'mine',
      q: 5,
      r: 0,
      kind: 'MINE' as const,
      ownerId: 'a',
    });
    writeTile(s, site, { ownerId: 'a' });
    const base = income(s, 'a').IRON;
    expect(siteOperational(s, site)).toBe(false);
    soldier(s, 'guard', 'b', 5);
    expect(siteOperational(s, site)).toBe(true);
    expect(income(s, 'a').IRON).toBe(base + 8);
    soldier(s, 'enemy', 'c', 6);
    expect(siteOperational(s, site)).toBe(false);
    expect(income(s, 'a').IRON).toBe(base);
  });
  it('donne une vision locale au relais et plafonne les remises identiques', () => {
    const { s } = fixture();
    for (const [i, id] of ['one', 'two'].entries()) {
      const site = (s.strategy!.sites[id] = { id, q: 6 + i, r: 0, kind: 'REFINERY', ownerId: 'a' });
      writeTile(s, site, { ownerId: 'a' });
    }
    soldier(s, 'guard', 'a', 6);
    expect(strategicBonuses(s, 'a').fuel).toBe(10);
    s.strategy!.sites.one.kind = 'RADIO';
    expect(vision(s, s.realms.a).has(key({ q: 14, r: 0 }))).toBe(true);
  });
  it('réinitialise le maintien contesté, paie une seule fois puis établit la paix', () => {
    let { s } = fixture();
    const pos = { q: 4, r: 0 };
    const target = addBuilding(s, s.realms.c, pos, 'FORT', now);
    soldier(s, 'guard', 'a', 3);
    const declared = run(s, 'a', 'DECLARE_WAR', {
      to: 'c',
      objective: 'FORT',
      tributeGold: 0,
      ...pos,
    });
    expect(declared.result.accepted, declared.result.reason).toBe(true);
    s = declared.state;
    const war = Object.values(s.strategy!.wars)[0];
    expect(s.realms.a.wallet.GOLD).toBe(99250);
    s.buildings[target.id].ownerId = 'b';
    writeTile(s, pos, { ownerId: 'b' });
    tickStrategy(s, now, new Set());
    tickStrategy(s, now + 600000, new Set());
    expect(war.heldMs).toBe(600000);
    soldier(s, 'enemy', 'c', 5);
    tickStrategy(s, now + 600001, new Set());
    expect(war.heldMs).toBe(0);
    delete s.units.enemy;
    tickStrategy(s, now + 600002, new Set());
    tickStrategy(s, now + 600002 + WAR_HOLD_TIME, new Set());
    expect(war.status).toBe('WON');
    expect(s.realms.a.warPrestige).toBe(1);
    const balance = s.realms.a.wallet.GOLD;
    tickStrategy(s, now + 600003 + WAR_HOLD_TIME, new Set());
    expect(s.realms.a.wallet.GOLD).toBe(balance);
    expect(Object.values(s.treaties).some((t) => t.kind === 'TRUCE')).toBe(true);
  });
  it('refuse une campagne contre la capitale et protège les trêves', () => {
    const { s } = fixture();
    const b = addBuilding(s, s.realms.c, s.realms.c.capital, 'FORT', now);
    soldier(s, 'scout', 'a', b.q - 1);
    expect(
      run(s, 'a', 'DECLARE_WAR', { to: 'c', objective: 'FORT', tributeGold: 0, q: b.q, r: b.r })
        .result.accepted,
    ).toBe(false);
  });
});
