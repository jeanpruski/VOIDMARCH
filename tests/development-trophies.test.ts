import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  developmentStage,
  developmentReason,
  conquestDevelopmentLevel,
  DEVELOPMENT_TROPHIES,
  logisticsQuota,
  eraAdvanceReason,
  ERA_REQUIREMENTS,
} from '@voidmarch/config';
import {
  createState,
  createRealm,
  developmentProgress,
  migrateTrophyDevelopment,
  recruitmentRequirement,
} from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { missionOffers } from '../apps/server/src/missions';
import { expeditionOffers } from '../apps/server/src/expeditions';
import { actionSchema } from '@voidmarch/protocol';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { prepareDevelopment } from './fixtures/development';
const now = 1900000000000;
function fixture(stage = 5) {
  const s = createState('adventures-test', now),
    r = addPlayer(s, 'a', 'Trophées', 'MASK', now);
  prepareDevelopment(s, 'a', stage, now);
  r.wallet = { GOLD: 1e7, WOOD: 1e7, STONE: 1e7, IRON: 1e7, FOOD: 1e7 };
  const trophies = structuredClone(s.missions!.a.trophies!);
  const b = addBuilding(s, r, { q: r.capital.q + 1, r: r.capital.r }, 'BARRACKS', now, 3);
  b.population = 500;
  return { s, r, b, trophies };
}
const stageOf = (s: ReturnType<typeof createState>) =>
  developmentStage(Object.values(s.buildings), developmentProgress(s, 'a'));
describe('développement par trophées', () => {
  it.each([
    [0, 1],
    [1, 2],
    [4, 2],
    [5, 3],
    [19, 3],
    [20, 4],
    [49, 4],
    [50, 5],
  ])('%i trophées autorisent au plus le passage à l’époque %i', (count, level) => {
    const { s, trophies } = fixture();
    s.missions!.a.trophies = trophies.slice(0, count);
    s.realms.a.era = { version: 1, level: 1 };
    const sites = Object.entries(ERA_REQUIREMENTS).flatMap(([, reqs]) =>
      reqs.map((req) => ({ kind: req.kinds[0], level: req.level, hp: 1 })),
    );
    for (const target of [2, 3, 4, 5]) {
      const reason = eraAdvanceReason(sites, { trophies: count, era: target - 1 }, target);
      expect(reason === '').toBe(target <= level);
    }
    expect(stageOf(s)).toBe(1);
    expect(stageOf(JSON.parse(JSON.stringify(s)))).toBe(1);
    expect(s.missions!.a.trophies).toHaveLength(count);
  });
  it('ne retire pas une époque acquise après destruction des infrastructures', () => {
    const { s } = fixture();
    const workshop = Object.values(s.buildings).find((b) => b.kind === 'WORKSHOP')!;
    workshop.hp = 0;
    expect(stageOf(s)).toBe(5);
    expect(developmentReason(Object.values(s.buildings), 5, developmentProgress(s, 'a'))).toBe('');
  });
  it('cumule conquêtes et expéditions personnelles sans utiliser celles des alliés', () => {
    const { s, trophies } = fixture();
    s.missions!.a.trophies = trophies.slice(0, 5);
    s.missions!.a.trophies[0].mission.expedition = {
      siteId: 'giza',
      mode: 'RECON',
      route: 'LAND',
      targetDistance: 70,
    };
    s.missions!.ally = { generation: 0, trophies };
    expect(stageOf(s)).toBe(5);
    expect(developmentProgress(s, 'a').trophies).toBe(5);
    expect(developmentProgress(worldView(s, 'a', now))).toEqual(developmentProgress(s, 'a'));
  });
  it('préserve un ancien accès, y compris archivé, une seule fois et sans offrir les paliers suivants', () => {
    const { s, r } = fixture(3);
    s.missions!.a.trophies = [];
    delete r.trophyDevelopment;
    delete r.era;
    const buildings = Object.values(s.buildings);
    s.archives.a = {
      realm: structuredClone(r),
      buildings: structuredClone(buildings),
      units: [],
      tiles: [],
      createdAt: now,
      realmValue: 0,
      version: 1,
    };
    const wallet = structuredClone(r.wallet);
    expect(migrateTrophyDevelopment(s)).toBe(true);
    expect(s.realms.a.trophyDevelopment?.grandfatheredLevel).toBe(3);
    expect(stageOf(s)).toBe(3);
    expect(s.archives.a.realm.trophyDevelopment?.grandfatheredLevel).toBe(3);
    prepareDevelopment(s, 'a', 5, now);
    delete r.era;
    s.missions!.a.trophies = [];
    expect(migrateTrophyDevelopment(s)).toBe(false);
    expect(stageOf(s)).toBe(3);
    expect(r.wallet).toEqual(wallet);
    expect(s.missions!.a.trophies).toEqual([]);
  });
  it('ne donne aucune exemption aux nouveaux comptes ; les bots gardent leurs règles de bâtiments', () => {
    const { s, r } = fixture();
    s.missions!.a.trophies = [];
    expect(migrateTrophyDevelopment(s)).toBe(false);
    expect(stageOf(s)).toBe(5);
    expect(
      createRealm('new', 'Neuf', 'ASH', { q: 0, r: 0 }, now).trophyDevelopment?.grandfatheredLevel,
    ).toBe(1);
    r.bot = true;
    expect(stageOf(s)).toBe(5);
    expect(s.missions!.a.trophies).toHaveLength(0);
  });
  it('refuse une amélioration militaire au niveau 4 sans ses vingt trophées, côté serveur et aperçu, sans débit', () => {
    const { s, r, b, trophies } = fixture();
    s.missions!.a.trophies = trophies.slice(0, 19);
    r.era = { version: 1, level: 3 };
    const cmd = actionSchema.parse({
      type: 'UPGRADE',
      actorId: b.id,
      payload: {},
      actionId: randomUUID(),
      clientTimestamp: now,
    });
    const rejected = execute(s, 'a', cmd, now);
    expect(rejected.result.accepted).toBe(false);
    expect(rejected.result.reason).toContain('Époque 4');
    expect(rejected.state).toBe(s);
    expect(predictAction(worldView(s, 'a', now), cmd)).toBeUndefined();
    s.missions!.a.trophies = trophies.slice(0, 20);
    r.era = { version: 1, level: 4 };
    const accepted = execute(s, 'a', cmd, now);
    expect(accepted.result.accepted, accepted.result.reason).toBe(true);
    expect(accepted.state.missions!.a.trophies).toEqual(trophies.slice(0, 20));
    expect(accepted.state.realms.a.wallet.GOLD).toBeLessThan(r.wallet.GOLD);
  });
  it('applique le seuil aux recrues et conversions de PA avancées', () => {
    const { s, r, b, trophies } = fixture();
    s.missions!.a.trophies = [];
    r.era = { version: 1, level: 1 };
    addBuilding(s, r, { q: 3, r: 0 }, 'ARSENAL', now, 3);
    addBuilding(s, r, { q: 4, r: 0 }, 'MUNITIONS', now, 3);
    expect(
      recruitmentRequirement(
        'RIFLEMAN',
        b,
        Object.values(s.buildings),
        developmentProgress(s, 'a'),
      ),
    ).toContain('Époque 3');
    const center = addBuilding(s, r, { q: 2, r: 0 }, 'LOGISTICS_CENTER', now, 2);
    const cmd = actionSchema.parse({
      type: 'CONVERT_AP',
      actorId: center.id,
      payload: { recipe: 'INDUSTRY', amount: 1 },
      actionId: randomUUID(),
      clientTimestamp: now,
    });
    expect(execute(s, 'a', cmd, now).result.reason).toContain('Époque 2');
    s.missions!.a.trophies = trophies.slice(0, 1);
    s.realms.a.era = { version: 1, level: 2 };
    expect(execute(s, 'a', cmd, now).result.accepted).toBe(true);
    expect(logisticsQuota(stageOf(s), [], now).limit).toBe(15);
  });
  it('limite les tableaux à leur niveau plus les seules offres exceptionnelles prévues', () => {
    const { s, b, trophies } = fixture();
    b.level = 5;
    s.missions!.a.trophies = trophies.slice(0, 1);
    s.realms.a.era = { version: 1, level: 2 };
    expect(conquestDevelopmentLevel(Object.values(s.buildings), developmentProgress(s, 'a'))).toBe(
      2,
    );
    for (const offer of [...missionOffers(s, 'a', now), ...expeditionOffers(s, 'a', now)]) {
      expect(offer.level).toBeLessThanOrEqual(offer.exceptional ? 3 : 2);
    }
    expect(DEVELOPMENT_TROPHIES.slice(2)).toEqual([1, 5, 20, 50]);
  });
});
