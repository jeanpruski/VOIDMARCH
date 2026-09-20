import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  BUILDINGS,
  WALL_KINDS,
  buildingUpgrade,
  buildingUpgradeLevel,
  developmentTrophyRequirement,
  type BuildingKind,
} from '@voidmarch/config';
import { createState, createRealm } from '@voidmarch/game-rules';
import { addBuilding, execute, worldView } from '../apps/server/src/engine';
import { actionSchema } from '@voidmarch/protocol';
import { predictAction } from '../apps/web/src/optimistic-actions';
import { prepareTrophies, prepareDevelopment } from './fixtures/development';
const now = 1_900_000_000_000;
function fixture(kind: BuildingKind, level: number) {
  const s = createState('building-trophy-levels', now);
  const r = (s.realms.p = createRealm('p', 'Bâtisseurs', 'MASK', { q: 0, r: 0 }, now));
  r.wallet = { GOLD: 1e7, WOOD: 1e7, IRON: 1e7, STONE: 1e7, FOOD: 1e7 };
  const b = addBuilding(s, r, r.capital, kind, now, level);
  b.population = 1000;
  prepareTrophies(s, 'p', 5, now);
  const command = actionSchema.parse({
    type: 'UPGRADE',
    actorId: b.id,
    payload: {},
    actionId: randomUUID(),
    clientTimestamp: now,
  });
  return { s, r, b, command, trophies: [...s.missions!.p.trophies!] };
}
describe('seuils universels des améliorations de bâtiments', () => {
  const ordinary = (
    ['LUMBER', 'WORKSHOP', 'MARKET', 'VILLAGE', 'BARRACKS', 'LOGISTICS_CENTER', 'PORT'] as const
  ).flatMap((kind) => [1, 2, 3, 4].map((level) => ({ kind, level })));
  const walls = WALL_KINDS.slice(0, -1).map((kind) => ({ kind: kind as BuildingKind, level: 1 }));
  it.each([...ordinary, ...walls])(
    '$kind $level : seuil exact sans infrastructure préalable, serveur et aperçu identiques',
    ({ kind, level }) => {
      const { s, r, b, command, trophies } = fixture(kind, level);
      const target = buildingUpgrade(kind, level)!;
      const required = developmentTrophyRequirement(buildingUpgradeLevel(target));
      // A historical technology exemption must not bypass the new personal upgrade rule.
      r.trophyDevelopment = { version: 1, grandfatheredLevel: 5 };
      s.missions!.p.trophies = trophies.slice(0, required - 1);
      const before = JSON.stringify(s);
      const rejected = execute(s, 'p', command, now);
      expect(rejected.result.accepted).toBe(false);
      expect(rejected.result.reason).toContain(`trophées ${required - 1}/${required}`);
      expect(JSON.stringify(s)).toBe(before);
      expect(predictAction(worldView(s, 'p', now), command)).toBeUndefined();
      s.missions!.p.trophies = trophies.slice(0, required);
      expect(Object.keys(s.buildings)).toHaveLength(1);
      const predicted = predictAction(worldView(s, 'p', now), command);
      expect(predicted).toBeDefined();
      const accepted = execute(s, 'p', command, now);
      expect(accepted.result.accepted, accepted.result.reason).toBe(true);
      expect(accepted.state.buildings[b.id]).toMatchObject({
        kind: target.kind,
        level: target.level,
      });
      expect(accepted.state.missions!.p.trophies).toEqual(trophies.slice(0, required));
      expect(accepted.state.realms.p.ap).toBe(r.ap - 2);
      expect(accepted.state.realms.p.wallet.GOLD).toBe(r.wallet.GOLD - (target.cost.GOLD ?? 0));
    },
  );
  it.each(['CAMP', 'OUTPOST'] as const)(
    'préserve le démarrage %s → niveau 1 sans trophée',
    (kind) => {
      const { s, command } = fixture(kind, 1);
      s.missions!.p.trophies = [];
      expect(execute(s, 'p', command, now).result.accepted).toBe(true);
    },
  );
  it('trois trophées permettent le niveau 2, mais pas le niveau 3', () => {
    const { s, b, command, trophies } = fixture('QUARRY', 1);
    s.missions!.p.trophies = trophies.slice(0, 3);
    expect(execute(s, 'p', command, now).result.accepted).toBe(true);
    b.level = 2;
    b.hp = BUILDINGS.QUARRY.hp * 2;
    expect(execute(s, 'p', command, now).result.reason).toContain('trophées 3/5');
    expect(b.level).toBe(2);
  });
  it('les bots gardent les prérequis technologiques mais ne gagnent pas de faux trophées', () => {
    const { s, r, command } = fixture('BARRACKS', 3);
    r.bot = true;
    s.missions!.p.trophies = [];
    expect(execute(s, 'p', command, now).result.accepted).toBe(false);
    prepareDevelopment(s, 'p', 3, now);
    s.missions!.p.trophies = [];
    const result = execute(s, 'p', command, now);
    expect(result.result.accepted, result.result.reason).toBe(true);
    expect(result.state.missions!.p.trophies).toEqual([]);
  });
  it.each([2, 3, 4, 5])('applique également les seuils à la tourelle niveau %i', (next) => {
    const { s, b, trophies } = fixture(WALL_KINDS[next - 1], 1);
    b.turretLevel = (next - 1) as 1 | 2 | 3 | 4;
    const required = developmentTrophyRequirement(next);
    const command = actionSchema.parse({
      type: 'UPGRADE_TURRET',
      actorId: b.id,
      payload: {},
      actionId: randomUUID(),
      clientTimestamp: now,
    });
    s.missions!.p.trophies = trophies.slice(0, required - 1);
    expect(execute(s, 'p', command, now).result.accepted).toBe(false);
    expect(predictAction(worldView(s, 'p', now), command)).toBeUndefined();
    s.missions!.p.trophies = trophies.slice(0, required);
    expect(execute(s, 'p', command, now).result.accepted).toBe(true);
    expect(predictAction(worldView(s, 'p', now), command)).toBeDefined();
  });
});
