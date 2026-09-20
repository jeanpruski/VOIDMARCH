import { describe, it, expect } from 'vitest';
import {
  createState,
  createRealm,
  migrateOceans,
  disk,
  tileAt,
  distance,
  oceanWater,
} from '@voidmarch/game-rules';
import { isSea, RULES } from '@voidmarch/config';
import { BotDirector } from '../apps/server/src/bots';
import { settle } from '../apps/server/src/engine';
import { migrateBotLand, smallStartingIsland } from '../apps/server/src/bot-land-migration';
const now = 1900000000000;
describe('départs terrestres et migration des bots isolés', () => {
  it('installe les deux bots sur une région terrestre avec huit cases de marge', () => {
    const s = createState('voidmarch-vhal-01', now);
    migrateOceans(s);
    new BotDirector().reconcile(s, now, 0);
    const bots = Object.values(s.realms);
    expect(bots).toHaveLength(2);
    for (const b of bots) {
      expect(disk(b.capital, 8).every((p) => !isSea(tileAt(s, p).terrain))).toBe(true);
      expect(smallStartingIsland(s, b.capital)).toBe(false);
      for (const other of bots)
        if (b !== other)
          expect(distance(b.capital, other.capital)).toBeGreaterThanOrEqual(RULES.realmSpacing);
    }
  });
  it('déplace une ancienne île artificielle en conservant les biens et ne recommence pas', () => {
    const s = createState('voidmarch-vhal-01', now);
    migrateOceans(s);
    const at = { q: -35, r: -45 };
    expect(oceanWater(s, at)).toBe(true);
    const r = createRealm('bot', 'Ancien bot', 'ASH', at, now, true);
    settle(s, r, now);
    expect(smallStartingIsland(s, at)).toBe(true);
    const wallet = { ...r.wallet },
      buildings = Object.values(s.buildings).map((b) => ({ ...b })),
      units = Object.values(s.units).map((u) => ({ ...u }));
    expect(migrateBotLand(s, now)).toEqual(['bot']);
    expect(r.capital).not.toEqual(at);
    expect(r.wallet).toEqual(wallet);
    expect(smallStartingIsland(s, r.capital)).toBe(false);
    const delta = { q: r.capital.q - at.q, r: r.capital.r - at.r };
    for (const b of buildings)
      expect(s.buildings[b.id]).toEqual({ ...b, q: b.q + delta.q, r: b.r + delta.r });
    for (const u of units)
      expect(s.units[u.id]).toEqual({ ...u, q: u.q + delta.q, r: u.r + delta.r });
    expect(tileAt(s, at).ownerId).toBeUndefined();
    expect(migrateBotLand(s, now + 1)).toEqual([]);
  });
  it('conserve aussi les passagers et les réserves de mobilité', () => {
    const s = createState('voidmarch-vhal-01', now); migrateOceans(s);
    const realm = createRealm('bot', 'Transporteur', 'ASH', { q: -35, r: -45 }, now, true);
    settle(s, realm, now); realm.fuel = 17; realm.pervitin = 23;
    const carrier = Object.values(s.units)[0];
    carrier.kind = 'CARGO_TRUCK';
    carrier.cargo = [{ ...Object.values(s.units)[1], id: 'passager', q: carrier.q, r: carrier.r, carrierId: carrier.id }];
    const passenger = structuredClone(carrier.cargo[0]);
    expect(migrateBotLand(s, now)).toEqual(['bot']);
    expect(carrier.cargo[0]).toEqual({ ...passenger, q: carrier.q, r: carrier.r });
    expect(realm.fuel).toBe(17); expect(realm.pervitin).toBe(23);
  });
  it('préserve les joueurs humains et diffère un bot avec une unité étrangère proche', () => {
    const s = createState('voidmarch-vhal-01', now);
    migrateOceans(s);
    const at = { q: -35, r: -45 };
    const bot = createRealm('bot', 'Bot', 'ASH', at, now, true);
    settle(s, bot, now);
    const human = createRealm('human', 'Humain', 'ASH', { q: 0, r: 0 }, now);
    s.realms.human = human;
    s.units.foreign = {
      ...Object.values(s.units)[0],
      id: 'foreign',
      ownerId: 'human',
      q: at.q + 1,
      r: at.r,
    };
    expect(migrateBotLand(s, now)).toEqual([]);
    expect(bot.capital).toEqual(at);
    expect(human.capital).toEqual({ q: 0, r: 0 });
  });
});
