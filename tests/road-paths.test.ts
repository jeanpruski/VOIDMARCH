import { describe, expect, it } from 'vitest';
import { key, roadPaths, roadPathTo } from '@voidmarch/game-rules';
const line = (length: number) =>
  new Map(Array.from({ length }, (_, q) => [`${q},0`, { q, r: 0, road: true }]));
describe('parcours d’un réseau routier fini', () => {
  it('traverse plus de 4 000 cases sans limite arbitraire ni dépendance aux chunks', () => {
    const roads = line(5001);
    const paths = roadPaths({ q: 0, r: 0 }, roads);
    expect(roadPathTo({ q: 5000, r: 0 }, paths)).toHaveLength(5000);
    expect(roadPathTo({ q: 0, r: 0 }, paths)).toEqual([]);
  });
  it('ne traverse pas une coupure et exige une route sur le point de départ', () => {
    const roads = line(20);
    roads.delete('10,0');
    expect(roadPathTo({ q: 19, r: 0 }, roadPaths({ q: 0, r: 0 }, roads))).toBeNull();
    expect(roadPaths({ q: 10, r: 0 }, roads).size).toBe(0);
  });
  it('contourne une case bloquée, termine sur les boucles et conserve le plus court parcours', () => {
    const roads = line(4),
      blocked = new Set(['1,0']);
    [
      { q: 0, r: 1 },
      { q: 1, r: 1 },
      { q: 2, r: 1 },
    ].forEach((p) => roads.set(key(p), { ...p, road: true }));
    const path = roadPathTo({ q: 3, r: 0 }, roadPaths({ q: 0, r: 0 }, roads, blocked), blocked)!;
    expect(path.map(key)).not.toContain('1,0');
    expect(path).toHaveLength(4);
  });
  it('permet le survol mais jamais l’arrivée sur une case occupée', () => {
    const roads = line(4),
      blocked = new Set(['1,0']);
    const paths = roadPaths({ q: 0, r: 0 }, roads, blocked, 'RECON_PLANE');
    expect(roadPathTo({ q: 3, r: 0 }, paths, blocked)).toHaveLength(3);
    expect(roadPathTo({ q: 1, r: 0 }, paths, blocked)).toBeNull();
    expect(
      roadPathTo({ q: 3, r: 0 }, roadPaths({ q: 0, r: 0 }, roads, blocked, 'PEASANT'), blocked),
    ).toBeNull();
  });
});
