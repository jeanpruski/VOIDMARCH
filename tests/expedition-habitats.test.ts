import { afterEach, describe, expect, it, vi } from 'vitest';
import * as rules from '@voidmarch/game-rules';
import { EXPEDITION_SITES, EXPEDITION_HABITATS, UNITS, type Biome } from '@voidmarch/config';
import type { Tile, Hex } from '@voidmarch/shared';
import { expeditionHabitatMatches } from '../apps/server/src/expedition-habitats';
import {
  expeditionOffers,
  expeditionSitePosition,
  acceptExpedition,
} from '../apps/server/src/expeditions';
import { addPlayer } from '../apps/server/src/engine';
const now = 1900000000000;
afterEach(() => vi.restoreAllMocks());
const tile =
  (biome: Biome, terrain: Tile['terrain'] = 'PLAIN') =>
  (p: Hex): Tile => ({ ...p, biome, terrain });
function region(biome: Biome, sea = false, boat = false, suffix = '') {
  const s = rules.createState(`ecology-${biome}-${sea}-${boat}-${suffix}`, now);
  const r = addPlayer(s, 'explorer', 'Voyageur', 'ASH', now);
  if (sea) s.oceanVersion = 1;
  if (boat)
    s.units.ship = {
      id: 'ship',
      kind: 'TROOP_FERRY',
      ownerId: r.id,
      q: r.capital.q + 2,
      r: r.capital.r,
      hp: UNITS.TROOP_FERRY.hp,
      createdAt: now,
      updatedAt: now,
    };
  const mock = vi
    .spyOn(rules, 'tileAt')
    .mockImplementation((_s, p) => ({
      ...p,
      biome,
      terrain: sea ? 'SEA' : p.q % 7 === 0 ? 'HILL' : 'PLAIN',
    }));
  return { s, r, mock };
}
describe('milieux des expéditions', () => {
  it('définit un milieu pour chacun des 25 lieux', () => {
    expect(Object.keys(EXPEDITION_HABITATS)).toHaveLength(25);
    for (const site of EXPEDITION_SITES)
      expect(EXPEDITION_HABITATS[site.id].biomes.length).toBeGreaterThan(0);
  });
  it('refuse les pyramides dans la neige et vérifie aussi les alentours', () => {
    const p = { q: 0, r: 0 };
    expect(expeditionHabitatMatches('habitat', 'giza', p, tile('SNOW'))).toBe(false);
    expect(expeditionHabitatMatches('habitat', 'giza', p, tile('DESERT'))).toBe(true);
    expect(
      expeditionHabitatMatches('habitat', 'giza', p, (h) => ({
        ...h,
        biome: h.q === 2 ? 'SNOW' : 'DESERT',
        terrain: 'PLAIN',
      })),
    ).toBe(false);
    expect(expeditionHabitatMatches('habitat', 'jeff', p, tile('SNOW', 'SEA'))).toBe(false);
  });
  it('exige un relief, une forêt ou une rivière quand le lieu le demande', () => {
    const p = { q: 50, r: 50 };
    expect(expeditionHabitatMatches('habitat', 'svalbard', p, tile('SNOW'))).toBe(false);
    expect(expeditionHabitatMatches('habitat', 'svalbard', p, tile('SNOW', 'HILL'))).toBe(true);
    expect(expeditionHabitatMatches('habitat', 'wunsdorf', p, tile('TEMPERATE'))).toBe(false);
    expect(expeditionHabitatMatches('habitat', 'wunsdorf', p, tile('TEMPERATE', 'FOREST'))).toBe(
      true,
    );
    expect(expeditionHabitatMatches('habitat', 'hoover', p, tile('DESERT'))).toBe(false);
    expect(expeditionHabitatMatches('habitat', 'hoover', p, tile('DESERT', 'RIVER'))).toBe(true);
  });
  it.each(['DESERT', 'SNOW', 'TEMPERATE', 'AUTUMN'] as Biome[])(
    'propose uniquement des lieux réellement plaçables en région %s',
    (biome) => {
      const { s, r } = region(biome);
      const tilesBefore = structuredClone(s.tiles),
        offers = expeditionOffers(s, r.id, now);
      expect(offers).toHaveLength(3);
      expect(offers.map((o) => o.expedition!.mode)).toEqual(['RECON', 'RECOVER', 'EXTRACT']);
      for (const o of offers) {
        const site = EXPEDITION_SITES.find((site) => site.id === o.expedition!.siteId)!;
        expect(EXPEDITION_HABITATS[site.id].biomes).toContain(biome);
        expect(o.expedition!.route).toBe('LAND');
        expect(o).not.toHaveProperty('q');
        expect(o.expedition).not.toHaveProperty('position');
        const p = expeditionSitePosition(s, r.id, o)!;
        expect(p).toBeDefined();
        expect(rules.distance(r.capital, p)).toBe(o.expedition!.targetDistance);
      }
      expect(s.tiles).toEqual(tilesBefore);
    },
  );
  it('ne propose pas une expédition maritime sans navire, puis en propose après recrutement', () => {
    const { s, r } = region('TEMPERATE', true);
    expect(expeditionOffers(s, r.id, now)).toEqual([]);
    s.units.ship = {
      id: 'ship',
      kind: 'TROOP_FERRY',
      ownerId: r.id,
      q: r.capital.q,
      r: r.capital.r,
      hp: 50,
      createdAt: now,
      updatedAt: now,
    };
    const offers = expeditionOffers(s, r.id, now);
    expect(offers).toHaveLength(3);
    expect(offers.every((o) => o.expedition!.route === 'SEA')).toBe(true);
    delete s.units.ship;
    expect(expeditionOffers(s, r.id, now)).toEqual([]);
  });
  it('masque un site devenu occupé et refuse son acceptation sans déplacement forcé', () => {
    const { s, r, mock } = region('DESERT', false, false, 'blocked');
    const o = expeditionOffers(s, r.id, now)[0],
      p = expeditionSitePosition(s, r.id, o)!;
    mock.mockImplementation((_s, h) => ({
      ...h,
      biome: 'DESERT',
      terrain: 'PLAIN',
      ...(rules.key(h) === rules.key(p) ? { road: true } : {}),
    }));
    expect(expeditionOffers(s, r.id, now).some((v) => v.id === o.id)).toBe(false);
    expect(() => acceptExpedition(s, r.id, o, now)).toThrow();
    expect(s.missions?.[r.id]?.active).toBeUndefined();
  });
  it('réutilise la prospection pendant dix minutes, même après copie de l’état', () => {
    const { s, r, mock } = region('DESERT', false, false, 'cached');
    const initial = expeditionOffers(s, r.id, now),
      reads = mock.mock.calls.length;
    mock.mockClear();
    expect(expeditionOffers(structuredClone(s), r.id, now + 599999)).toEqual(initial);
    expect(mock.mock.calls.length).toBeLessThan(reads / 2);
    expect(expeditionOffers(s, r.id, now + 600000).map((o) => o.id)).not.toEqual(
      initial.map((o) => o.id),
    );
  });
});
