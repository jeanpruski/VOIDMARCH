import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  createState,
  createRealm,
  writeTile,
  observe,
  disk,
  key,
  zeroWallet,
  unitStats,
  income,
  wallBlocks,
  tileAt,
  canGather,
} from '@voidmarch/game-rules';
import { STRATEGY, UNITS, RESOURCES, productionOnTerrain } from '@voidmarch/config';
import { execute, addBuilding, worldView } from '../apps/server/src/engine';
import { strategy, tickStrategy, launchTrade } from '../apps/server/src/strategy';
import { tickWorld } from '../apps/server/src/simulation';
import { commandSchema, type Action } from '@voidmarch/protocol';
import type { GameState, Unit } from '@voidmarch/shared';
const now = 1_800_000_000_000;
const command = (type: string, actorId: string, payload: object = {}) =>
  ({
    ...commandSchema.parse({ type, actorId, payload }),
    actionId: randomUUID(),
    clientTimestamp: now,
  }) as Action;
function fixture() {
  const s = createState('strategy-tests', now);
  for (const [i, id] of ['a', 'b', 'c', 'd', 'e', 'f'].entries()) {
    const r = createRealm(id, id, 'ASH', { q: i * 20, r: 0 }, now);
    r.protectedUntil = 0;
    r.unlimitedAP = true;
    r.wallet = { GOLD: 100000, WOOD: 100000, IRON: 100000, STONE: 100000, FOOD: 100000 };
    s.realms[id] = r;
    addBuilding(s, r, r.capital, 'CAMP', now);
  }
  for (const p of disk({ q: 0, r: 0 }, 35)) {
    writeTile(s, p, { terrain: 'PLAIN' });
    s.realms.a.explored[key(p)] = { ...p, terrain: 'PLAIN', visibility: 'EXPLORED' };
  }
  strategy(s, now);
  return s;
}
const run = (s: GameState, id: string, type: string, actor: string, payload: object = {}) =>
  execute(s, id, command(type, actor, payload), now);
function team(s: GameState, members = ['a', 'b']) {
  s.strategy!.alliances.team = {
    id: 'team',
    name: 'Veilleurs',
    emblem: 'eye',
    leaderId: members[0],
    members,
    createdAt: now,
    messages: [],
    markers: [],
  };
}
function unit(
  s: GameState,
  id: string,
  owner: string,
  q: number,
  r = 0,
  kind: Unit['kind'] = 'INFANTRY',
) {
  s.units[id] = {
    id,
    ownerId: owner,
    q,
    r,
    kind,
    hp: UNITS[kind].hp,
    createdAt: now,
    updatedAt: now,
  };
  return s.units[id];
}
function armed() {
  const s = fixture();
  for (const resource of RESOURCES) s.realms.a.wallet[resource] = 1_100_000;
  addBuilding(s, s.realms.a, { q: 1, r: 0 }, 'ROCKET_SILO', now, 5);
  addBuilding(s, s.realms.a, { q: 2, r: 0 }, 'NUCLEAR_REACTOR', now, 5);
  return s;
}
const silo = (s: GameState) => Object.values(s.buildings).find((b) => b.kind === 'ROCKET_SILO')!;
describe('Alliances : consentement, confidentialité et protection', () => {
  it('ne révèle la capitale qu’après acceptation', () => {
    let s = fixture();
    s = run(s, 'a', 'ALLIANCE_CREATE', 'a', { name: 'Veilleurs', emblem: 'eye' }).state;
    s = run(s, 'a', 'ALLIANCE_INVITE', 'a', { to: 'b' }).state;
    expect(worldView(s, 'a', now).strategy!.allies).toEqual([]);
    const invitation = Object.values(s.strategy!.invitations)[0];
    s = run(s, 'b', 'ALLIANCE_RESPOND', 'b', { invitationId: invitation.id, accept: true }).state;
    expect(worldView(s, 'a', now).strategy!.allies[0].position).toEqual(s.realms.b.capital);
    expect(worldView(s, 'c', now).strategy!.alliance).toBeUndefined();
    expect(worldView(s, 'c', now).strategy!.allies).toEqual([]);
  });
  it('refuse une réponse usurpée et une sixième adhésion', () => {
    let s = fixture();
    team(s, ['a', 'b', 'c', 'd']);
    s = run(s, 'a', 'ALLIANCE_INVITE', 'a', { to: 'f' }).state;
    const i = Object.values(s.strategy!.invitations)[0];
    expect(
      run(s, 'c', 'ALLIANCE_RESPOND', 'c', { invitationId: i.id, accept: true }).result.accepted,
    ).toBe(false);
    s.strategy!.alliances.team.members.push('e');
    expect(
      run(s, 'f', 'ALLIANCE_RESPOND', 'f', { invitationId: i.id, accept: true }).result.accepted,
    ).toBe(false);
  });
  it('protège les alliés des attaques, captures et tirs de tourelle', () => {
    const s = fixture();
    team(s);
    unit(s, 'soldier', 'a', 19, 0, 'RIFLEMAN');
    unit(s, 'target', 'b', 20);
    observe(s, s.realms.a, now);
    expect(run(s, 'a', 'ATTACK', 'soldier', { targetId: 'target' }).result.accepted).toBe(false);
    Object.assign(s.units.soldier, { q: 20 });
    expect(run(s, 'a', 'CAPTURE', 'soldier').result.accepted).toBe(false);
  });
  it('autorise le passage allié des remparts côté serveur', () => {
    const s = fixture();
    team(s);
    unit(s, 'soldier', 'a', 18);
    const wall = addBuilding(s, s.realms.b, { q: 19, r: 0 }, 'WOOD_WALL', now);
    observe(s, s.realms.a, now);
    expect(wallBlocks(wall, 'a', 'INFANTRY', ['b'])).toBe(false);
    expect(run(s, 'a', 'MOVE', 'soldier', { path: [{ q: 19, r: 0 }] }).result.accepted).toBe(true);
  });
  it('garde le chat privé et bride les envois', () => {
    const s = fixture();
    team(s);
    const sent = run(s, 'a', 'ALLIANCE_CHAT', 'a', { text: 'Défendez la mine' });
    expect(worldView(sent.state, 'b', now).strategy!.alliance!.messages[0].text).toBe(
      'Défendez la mine',
    );
    expect(worldView(sent.state, 'c', now).strategy!.alliance).toBeUndefined();
    expect(run(sent.state, 'a', 'ALLIANCE_CHAT', 'a', { text: 'encore' }).result.accepted).toBe(
      false,
    );
  });
  it('retire les flèches immédiatement au départ et applique une trêve', () => {
    const s = fixture();
    team(s);
    const out = run(s, 'b', 'ALLIANCE_LEAVE', 'b');
    expect(worldView(out.state, 'a', now).strategy!.allies).toEqual([]);
    expect(Object.values(out.state.treaties)[0].endsAt).toBe(now + 86400000);
  });
  it('refuse de signaler un lieu inconnu et borne la taille du texte', () => {
    const s = fixture();
    team(s);
    expect(
      run(s, 'a', 'ALLIANCE_MARK', 'a', { q: 900, r: 900, label: 'cible', kind: 'ATTACK' }).result
        .accepted,
    ).toBe(false);
    expect(
      commandSchema.safeParse({
        type: 'ALLIANCE_CHAT',
        actorId: 'a',
        payload: { text: 'a'.repeat(401) },
      }).success,
    ).toBe(false);
  });
});
describe('Arsenal atomique', () => {
  it('exige deux infrastructures de niveau 5', () => {
    const s = armed();
    silo(s).level = 4;
    expect(run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 }).result.accepted).toBe(false);
    silo(s).level = 5;
    Object.values(s.buildings).find((b) => b.kind === 'NUCLEAR_REACTOR')!.level = 4;
    expect(run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 }).result.accepted).toBe(false);
  });
  it('débite 10 PA et tous les matériaux, avertit tout le monde et attend 5 minutes', () => {
    const s = armed();
    s.realms.a.unlimitedAP = false;
    s.realms.a.ap = 15;
    unit(s, 'target', 'b', 21);
    const res = run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 });
    expect(res.result.accepted).toBe(true);
    expect(res.state.realms.a.ap).toBe(5);
    for (const resource of RESOURCES) expect(res.state.realms.a.wallet[resource]).toBe(100_000);
    expect(worldView(res.state, 'c', now).strategy!.strikes).toHaveLength(1);
    tickStrategy(res.state, now + 299999, new Set());
    expect(res.state.units.target).toBeDefined();
    expect(
      run(res.state, 'a', 'LAUNCH_NUKE', silo(res.state).id, { q: 20, r: 0 }).result.accepted,
    ).toBe(false);
  });
  it('détruit exactement dans le rayon de huit, préserve héros et capitale, sans butin', () => {
    const s = armed();
    unit(s, 'target', 'b', 28);
    unit(s, 'safe', 'b', 29);
    unit(s, 'hero', 'b', 21, 0, 'HERO');
    const doomed = addBuilding(s, s.realms.b, { q: 21, r: 1 }, 'FARM', now, 5);
    writeTile(s, { q: 22, r: 0 }, { road: true, roadOwnerId: 'b', ownerId: 'b' });
    const res = run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 });
    expect(res.result.accepted).toBe(true);
    const balance = res.state.realms.a.wallet.GOLD;
    tickStrategy(res.state, now + 300000, new Set());
    expect(res.state.units.target).toBeUndefined();
    expect(res.state.units.safe).toBeDefined();
    expect(res.state.units.hero).toBeDefined();
    expect(res.state.buildings[doomed.id]).toBeUndefined();
    expect(
      Object.values(res.state.buildings).some((b) => b.ownerId === 'b' && b.q === 20 && b.r === 0),
    ).toBe(true);
    expect(res.state.tiles['22,0'].road).toBeUndefined();
    expect(Object.values(res.state.strategy!.fallout)).toHaveLength(217);
    expect(res.state.realms.a.wallet.GOLD).toBe(balance);
    const snapshot = JSON.stringify(res.state);
    tickStrategy(res.state, now + 300001, new Set());
    expect(JSON.stringify(res.state)).toBe(snapshot);
  });
  it('respecte alliance, trêve, protection initiale et les coordonnées explorées', () => {
    const s = armed();
    team(s);
    expect(run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 }).result.accepted).toBe(false);
    delete s.strategy!.alliances.team;
    s.realms.b.protectedUntil = now + 600000;
    expect(run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 }).result.accepted).toBe(false);
    expect(run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 9999, r: 0 }).result.accepted).toBe(false);
  });
  it.each(RESOURCES)('refuse une bombe sans le million de %s et ne dépense rien', (resource) => {
    const s = armed();
    s.realms.a.wallet[resource] = 999_999;
    const res = run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 });
    expect(res.result.accepted).toBe(false);
    expect(res.state).toBe(s);
    expect(Object.keys(res.state.strategy!.strikes)).toHaveLength(0);
  });
  it('un redémarrage conserve la frappe et ne la rejoue pas', () => {
    let s = armed();
    s = run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 }).state;
    s = JSON.parse(JSON.stringify(s));
    tickStrategy(s, now + 300000, new Set());
    expect(Object.values(s.strategy!.strikes)[0].resolvedAt).toBe(now + 300000);
  });
});
describe('Commerce livré, objectifs, vétérans et industrie', () => {
  it('réserve les deux paiements puis livre sans doubler la cargaison', () => {
    const s = fixture();
    addBuilding(s, s.realms.a, { q: 5, r: 0 }, 'MARKET', now);
    addBuilding(s, s.realms.b, { q: 7, r: 0 }, 'MARKET', now);
    for (let q = 5; q <= 7; q++) writeTile(s, { q, r: 0 }, { road: true });
    const offer = { ...zeroWallet(), WOOD: 50 },
      request = { ...zeroWallet(), IRON: 30 };
    let result = run(s, 'a', 'PROPOSE', 'a', {
      to: 'b',
      kind: 'TRADE',
      payer: 'a',
      offer,
      request,
      duration: 3600000,
    });
    const proposal = Object.values(result.state.proposals)[0];
    result = run(result.state, 'b', 'RESPOND', 'b', {
      proposalId: proposal.id,
      decision: 'ACCEPT',
    });
    expect(result.result.accepted).toBe(true);
    expect(result.state.realms.a.wallet.WOOD).toBe(99950);
    expect(result.state.realms.b.wallet.WOOD).toBe(100000);
    expect(result.state.realms.b.wallet.IRON).toBe(99970);
    expect(Object.values(result.state.caravans)).toHaveLength(2);
    for (const r of Object.values(result.state.realms)) {
      r.economyAt = now + 30000;
      r.lastSeen = 0;
      r.offlineAt = 0;
    }
    tickWorld(result.state, now + 30000, new Set());
    expect(result.state.realms.b.wallet.WOOD).toBe(100050);
    expect(result.state.realms.a.wallet.IRON).toBe(100030);
    expect(Object.values(result.state.caravans)).toHaveLength(0);
  });
  it('refuse un échange sans route et renvoie la cargaison si une route est coupée', () => {
    const s = fixture();
    addBuilding(s, s.realms.a, { q: 5, r: 0 }, 'MARKET', now);
    addBuilding(s, s.realms.b, { q: 7, r: 0 }, 'MARKET', now);
    expect(() =>
      launchTrade(s, 'a', 'b', { ...zeroWallet(), WOOD: 10 }, zeroWallet(), 't', now),
    ).toThrow();
    for (let q = 5; q <= 7; q++) writeTile(s, { q, r: 0 }, { road: true });
    launchTrade(s, 'a', 'b', { ...zeroWallet(), WOOD: 10 }, zeroWallet(), 't', now);
    s.realms.a.wallet.WOOD -= 10;
    writeTile(s, { q: 6, r: 0 }, { road: false });
    for (const r of Object.values(s.realms)) {
      r.economyAt = now + 30000;
      r.lastSeen = 0;
      r.offlineAt = 0;
    }
    tickWorld(s, now + 30000, new Set());
    expect(s.realms.a.wallet.WOOD).toBe(100000);
    expect(s.realms.b.wallet.WOOD).toBe(100000);
  });
  it('les vétérans restent plafonnés à 15 % et ne gagnent pas de PV gratuits', () => {
    const base = unitStats({ kind: 'INFANTRY' }),
      elite = unitStats({ kind: 'INFANTRY', victories: 999 });
    expect(elite.attack).toBeCloseTo(base.attack * 1.15);
    expect(elite.hp).toBe(base.hp);
  });
  it('un site demande une capture physique et produit seulement pour son propriétaire', () => {
    const s = fixture();
    s.strategy!.sites.mine = { id: 'mine', q: 3, r: 0, kind: 'MINE' };
    unit(s, 'soldier', 'a', 2);
    expect(run(s, 'a', 'CLAIM_SITE', 'soldier', { siteId: 'mine' }).result.accepted).toBe(false);
    s.units.soldier.q = 3;
    const before = income(s, 'a').IRON;
    const out = run(s, 'a', 'CLAIM_SITE', 'soldier', { siteId: 'mine' });
    expect(out.result.accepted).toBe(true);
    expect(income(out.state, 'a').IRON).toBe(before + 8);
  });
  it('un laboratoire de niveau 3 contient les émissions et un ingénieur nettoie', () => {
    const s = fixture();
    addBuilding(s, s.realms.a, { q: 2, r: 0 }, 'NUCLEAR_REACTOR', now, 5);
    tickStrategy(s, now + 60000, new Set(['a']));
    expect(s.strategy!.fallout['2,0'].intensity).toBeGreaterThan(0);
    addBuilding(s, s.realms.a, { q: 3, r: 0 }, 'ISOTOPE_LAB', now, 3);
    const before = s.strategy!.fallout['2,0'].intensity;
    tickStrategy(s, now + 120000, new Set(['a']));
    expect(s.strategy!.fallout['2,0'].intensity).toBeLessThan(before);
    unit(s, 'engineer', 'a', 2, 0, 'ENGINEER');
    expect(run(s, 'a', 'CLEANUP', 'engineer', { q: 2, r: 0 }).result.accepted).toBe(true);
  });
  it('un tribut de guerre accepté verse une seule fois et protège les royaumes', () => {
    let s = fixture();
    s = run(s, 'a', 'DECLARE_WAR', 'a', {
      to: 'b',
      objective: 'TRIBUTE',
      tributeGold: 500,
      q: 0,
      r: 0,
    }).state;
    const war = Object.values(s.strategy!.wars)[0];
    const out = run(s, 'b', 'SETTLE_WAR', 'b', { warId: war.id });
    expect(out.result.accepted).toBe(true);
    expect(out.state.realms.a.wallet.GOLD).toBe(100500);
    expect(run(out.state, 'b', 'SETTLE_WAR', 'b', { warId: war.id }).result.accepted).toBe(false);
  });
  it('les anciennes sauvegardes initialisent les nouveaux systèmes sans changer les actifs', () => {
    const s = fixture();
    delete s.strategy;
    const buildings = JSON.stringify(s.buildings);
    tickStrategy(s, now, new Set());
    expect(s.strategy).toBeDefined();
    expect(JSON.stringify(s.buildings)).toBe(buildings);
  });
});

describe('Cohérence des systèmes combinés', () => {
  it('une escorte doit être vaincue avant le pillage', () => {
    const s = fixture();
    unit(s, 'raider', 'c', 6, 1, 'KNIGHT');
    unit(s, 'escort', 'a', 6, 0, 'INFANTRY');
    observe(s, s.realms.c, now);
    s.caravans.cargo = {
      id: 'cargo',
      ownerId: 'a',
      partnerId: 'b',
      q: 6,
      r: 0,
      from: { q: 5, r: 0 },
      to: { q: 7, r: 0 },
      path: [
        { q: 5, r: 0 },
        { q: 6, r: 0 },
        { q: 7, r: 0 },
      ],
      startedAt: now,
      arrivesAt: now + 30000,
      cargo: { ...zeroWallet(), GOLD: 100 },
      treatyId: 't',
      delivery: true,
    };
    expect(run(s, 'c', 'INTERACT', 'raider', { caravanId: 'cargo' }).result.accepted).toBe(false);
    delete s.units.escort;
    const out = run(s, 'c', 'INTERACT', 'raider', { caravanId: 'cargo' });
    expect(out.result.accepted).toBe(true);
    expect(out.state.realms.c.wallet.GOLD).toBe(100100);
    expect(out.state.caravans.cargo).toBeUndefined();
  });
  it('une trêve acceptée pendant le vol est respectée à l’impact', () => {
    let s = armed();
    unit(s, 'protected', 'b', 21);
    s = run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 }).state;
    s.treaties.peace = {
      id: 'peace',
      a: 'a',
      b: 'b',
      kind: 'TRUCE',
      startsAt: now + 1,
      endsAt: now + 86400000,
      payment: zeroWallet(),
      proposalId: 'p',
      nextCaravanAt: 0,
    };
    tickStrategy(s, now + 300000, new Set());
    expect(s.units.protected).toBeDefined();
  });
  it('la capture ordinaire d’un site lui donne le même propriétaire', () => {
    const s = fixture();
    unit(s, 'soldier', 'a', 3);
    s.strategy!.sites.mine = { id: 'mine', q: 3, r: 0, kind: 'MINE' };
    const out = run(s, 'a', 'CAPTURE', 'soldier');
    expect(out.result.accepted).toBe(true);
    expect(out.state.strategy!.sites.mine.ownerId).toBe('a');
  });
  it('un site ne permet pas de voler un bâtiment par un raccourci', () => {
    const s = fixture();
    unit(s, 'soldier', 'a', 3);
    s.strategy!.sites.mine = { id: 'mine', q: 3, r: 0, kind: 'MINE', ownerId: 'b' };
    addBuilding(s, s.realms.b, { q: 3, r: 0 }, 'FORT', now, 5);
    expect(run(s, 'a', 'CLAIM_SITE', 'soldier', { siteId: 'mine' }).result.accepted).toBe(false);
  });
  it('une victoire réelle donne un grade sans soigner la troupe', () => {
    const s = fixture();
    const attacker = unit(s, 'knight', 'a', 19, 0, 'KNIGHT');
    attacker.victories = 2;
    attacker.hp -= 3;
    unit(s, 'target', 'b', 20).hp = 1;
    observe(s, s.realms.a, now);
    const out = run(s, 'a', 'ATTACK', 'knight', { targetId: 'target' });
    expect(out.result.accepted).toBe(true);
    expect(out.state.units.knight.victories).toBe(3);
    expect(out.state.units.knight.hp).toBe(attacker.hp);
  });
  it('une expédition est publique et survit au partage d’une sauvegarde', () => {
    const s = fixture();
    s.strategy!.nextExpeditionAt = now;
    tickStrategy(s, now, new Set(['a']));
    const boss = Object.values(s.units).find((u) => u.expedition);
    expect(boss).toBeDefined();
    expect(boss!.npc!.bonusAP).toBe(10);
    expect(worldView(s, 'c', now).strategy!.expeditions).toHaveLength(1);
  });
});

describe('Dévastation et restauration atomiques', () => {
  it('brûle les 217 terrains, supprime leurs découvertes, événements et sites, conserve l’extérieur', () => {
    let s = armed();
    const terrain = { q: 21, r: 0 };
    writeTile(s, terrain, { terrain: 'MOUNTAIN', poi: 'MYTHIC', exhausted: false });
    writeTile(s, { q: 29, r: 0 }, { terrain: 'FOREST', poi: 'RARE' });
    s.strategy!.sites.ore = { ...terrain, id: 'ore', kind: 'MINE', ownerId: 'b' };
    s.events.loot = {
      ...terrain,
      id: 'loot',
      kind: 'METEOR',
      title: 'Butin',
      description: '',
      startsAt: now,
      endsAt: now + 3600000,
      global: true,
      reward: { GOLD: 500 },
    };
    s = run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 }).state;
    tickStrategy(s, now + 300000, new Set());
    for (const p of disk({ q: 20, r: 0 }, 8)) {
      expect(tileAt(s, p)).toMatchObject({ terrain: 'SCORCHED', exhausted: true });
      expect(tileAt(s, p).poi).toBeUndefined();
      for (const resource of RESOURCES) expect(canGather(tileAt(s, p), 'b', resource)).toBe(false);
    }
    expect(s.events.loot).toBeUndefined();
    expect(s.strategy!.sites.ore).toBeUndefined();
    expect(tileAt(s, { q: 29, r: 0 })).toMatchObject({ terrain: 'FOREST', poi: 'RARE' });
    s = JSON.parse(JSON.stringify(s));
    tickStrategy(s, now + 4000000, new Set());
    expect(s.strategy!.fallout['21,0']).toBeUndefined();
    expect(tileAt(s, terrain).terrain).toBe('SCORCHED');
  });
  it('interdit bâtiments et routes puis restaure une plaine sans recréer le gisement', () => {
    let s = fixture();
    const p = { q: 1, r: 0 };
    writeTile(s, p, { terrain: 'SCORCHED', ownerId: 'a', poi: undefined, exhausted: true });
    s.strategy!.fallout[key(p)] = { ...p, intensity: 100 };
    unit(s, 'worker', 'a', 0, 0, 'TERRAFORMER');
    unit(s, 'builder', 'a', 0, 0, 'PEASANT');
    expect(run(s, 'a', 'BUILD', 'builder', { ...p, kind: 'FARM' }).result.accepted).toBe(false);
    expect(run(s, 'a', 'ROAD', 'builder', p).result.accepted).toBe(false);
    const before = { ...s.realms.a.wallet };
    s.realms.a.unlimitedAP = false;
    s.realms.a.ap = 15;
    const restored = run(s, 'a', 'TERRAFORM', 'worker', p);
    expect(restored.result.accepted).toBe(true);
    s = restored.state;
    expect(tileAt(s, p)).toMatchObject({ terrain: 'PLAIN', ownerId: 'a', exhausted: true });
    expect(s.strategy!.fallout[key(p)]).toBeUndefined();
    expect(s.realms.a.ap).toBe(13);
    expect(s.realms.a.wallet).toEqual({
      ...before,
      WOOD: before.WOOD - 20,
      IRON: before.IRON - 10,
    });
    expect(canGather(tileAt(s, p), 'a', 'FOOD')).toBe(true);
    expect(run(s, 'a', 'ROAD', 'builder', p).result.accepted).toBe(true);
    expect(run(s, 'a', 'BUILD', 'builder', { ...p, kind: 'FARM' }).result.accepted).toBe(true);
  });
  it('restaure aussi le sol de la capitale survivante et réactive sa production', () => {
    let s = armed();
    s = run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 }).state;
    tickStrategy(s, now + 300000, new Set());
    const cap = s.realms.b.capital;
    const building = tileAt(s, cap).buildingId;
    expect(building).toBeTruthy();
    expect(productionOnTerrain('CAMP', 'SCORCHED')).toEqual({});
    expect(income(s, 'b').FOOD).toBeLessThanOrEqual(0);
    unit(s, 'worker', 'b', 20, 0, 'TERRAFORMER');
    const restored = run(s, 'b', 'TERRAFORM', 'worker', cap);
    expect(restored.result.accepted).toBe(true);
    expect(tileAt(restored.state, cap)).toMatchObject({
      terrain: 'PLAIN',
      buildingId: building,
      ownerId: 'b',
    });
    expect(income(restored.state, 'b').FOOD).toBeGreaterThan(income(s, 'b').FOOD);
  });
  it('conserve la zone annoncée et l’ancien effet pour un missile déjà en vol', () => {
    const s = armed();
    s.strategy!.strikes.old = {
      id: 'old',
      ownerId: 'a',
      siloId: silo(s).id,
      q: 20,
      r: 0,
      launchedAt: now,
      impactAt: now + 300000,
    };
    unit(s, 'near', 'b', 22);
    unit(s, 'outside', 'b', 23);
    tickStrategy(s, now + 300000, new Set());
    expect(s.units.near).toBeUndefined();
    expect(s.units.outside).toBeDefined();
    expect(tileAt(s, { q: 22, r: 0 }).terrain).toBe('PLAIN');
    expect(Object.keys(s.strategy!.fallout)).toHaveLength(19);
  });
  it('ne régénère pas les terres brûlées avec des événements, sites ou expéditions', () => {
    const s = fixture();
    for (const p of disk(s.realms.a.capital, 30))
      writeTile(s, p, { terrain: 'SCORCHED', poi: undefined });
    s.strategy!.nextSiteAt = now;
    s.strategy!.nextExpeditionAt = now;
    s.nextEventAt = now;
    tickWorld(s, now + 60000, new Set(['a']));
    expect(Object.values(s.events)).toHaveLength(0);
    expect(Object.values(s.strategy!.sites)).toHaveLength(0);
    expect(Object.values(s.units).some((u) => u.expedition)).toBe(false);
    for (const p of disk(s.realms.a.capital, 30)) expect(tileAt(s, p).terrain).toBe('SCORCHED');
  });
  it('respecte une nouvelle protection diplomatique jusque dans le terrain et les découvertes', () => {
    let s = armed();
    const p = { q: 21, r: 0 };
    writeTile(s, p, { terrain: 'FOREST', ownerId: 'b', poi: 'RARE' });
    s = run(s, 'a', 'LAUNCH_NUKE', silo(s).id, { q: 20, r: 0 }).state;
    s.realms.b.protectedUntil = now + 600000;
    tickStrategy(s, now + 300000, new Set());
    expect(tileAt(s, p)).toMatchObject({ terrain: 'FOREST', ownerId: 'b', poi: 'RARE' });
    expect(s.strategy!.fallout[key(p)]).toBeUndefined();
  });
});
