import { describe, expect, it } from 'vitest';
import { animateMovement, movementPosition } from '../apps/web/src/movement-animation';
import { hexToPixel } from '../apps/web/src/map-geometry';
import { addPlayer, execute } from '../apps/server/src/engine';
import { createState, writeTile } from '@voidmarch/game-rules';
import { actionSchema } from '@voidmarch/protocol';
import { randomUUID } from 'node:crypto';
const turn = {
  unitId: 'worker',
  from: { q: 0, r: 0 },
  path: [
    { q: 1, r: 0 },
    { q: 1, r: 1 },
    { q: 0, r: 2 },
  ],
};
describe('animation du trajet accepté', () => {
  it('atteint chaque virage sans interpoler directement de l’origine à la destination', () => {
    const animation = animateMovement(turn, 'move-1', 1, 1000);
    for (let i = 0; i < animation.points.length; i++) {
      const at = 1000 + (animation.duration * animation.distances[i]) / animation.distances.at(-1)!;
      const p = movementPosition(animation, at);
      expect(p.x).toBeCloseTo(animation.points[i].x, 6);
      expect(p.y).toBeCloseTo(animation.points[i].y, 6);
    }
    const halfway = movementPosition(animation, 1000 + animation.duration * 0.3);
    expect(halfway.y).toBe(0);
    expect(halfway.x).toBeGreaterThan(0);
    expect(movementPosition(animation, 100000)).toMatchObject(hexToPixel(turn.path.at(-1)!));
  });
  it('reconstitue la même position après une récréation des objets, un zoom ou un snapshot', () => {
    const animation = animateMovement(turn, 'move-1', 1, 1000);
    expect(movementPosition(JSON.parse(JSON.stringify(animation)), 1250)).toEqual(
      movementPosition(animation, 1250),
    );
  });
  it('enchaîne les ordres rapides sans sauter les étapes restantes', () => {
    const first = animateMovement(turn, 'move-1', 1, 1000);
    const start = movementPosition(first, 1100);
    const second = animateMovement(
      { unitId: 'worker', from: turn.path.at(-1)!, path: [{ q: -1, r: 2 }] },
      'move-2',
      2,
      1100,
      first,
    );
    expect(movementPosition(second, 1100)).toMatchObject({ x: start.x, y: start.y });
    expect(second.points).toEqual([
      { x: start.x, y: start.y },
      ...first.points.slice(start.segment + 1),
      hexToPixel({ q: -1, r: 2 }),
    ]);
  });
  it('accélère les longues routes tout en conservant tous les virages', () => {
    const path = Array.from({ length: 5000 }, (_, i) => ({ q: i + 1, r: 0 }));
    const animation = animateMovement(
      { unitId: 'worker', from: { q: 0, r: 0 }, path },
      'long',
      1,
      0,
    );
    expect(animation.points).toHaveLength(5001);
    expect(animation.duration).toBeLessThanOrEqual(6000);
    expect(movementPosition(animation, 6000)).toMatchObject(hexToPixel(path.at(-1)!));
  });
  it('ne joint pas artificiellement deux déplacements sans origine commune', () => {
    const first = animateMovement(turn, 'first', 1, 1000);
    const second = animateMovement(
      { unitId: 'worker', from: { q: 20, r: 0 }, path: [{ q: 21, r: 0 }] },
      'next',
      2,
      1100,
      first,
    );
    expect(second.points).toHaveLength(2);
    expect(second.points[0]).toEqual(hexToPixel({ q: 20, r: 0 }));
  });
});
it('le reçu contient le chemin normal exact et ne contient aucun trajet si l’ordre est refusé', () => {
  const now = 1800000000000,
    s = createState('animation', now),
    r = addPlayer(s, 'p', 'Animation', 'MASK', now);
  s.units.worker = {
    id: 'worker',
    ownerId: r.id,
    kind: 'PEASANT',
    q: 0,
    r: 0,
    hp: 5,
    createdAt: now,
    updatedAt: now,
  };
  const path = [
    { q: 1, r: 0 },
    { q: 1, r: 1 },
    { q: 0, r: 2 },
  ];
  path.forEach((p) => writeTile(s, p, { terrain: 'PLAIN' }));
  const command = actionSchema.parse({
    type: 'MOVE',
    actorId: 'worker',
    payload: { path },
    actionId: randomUUID(),
    clientTimestamp: now,
  });
  const accepted = execute(s, r.id, command, now);
  expect(accepted.result.accepted).toBe(true);
  expect(accepted.result.movement).toEqual({ ...turn, path });
  s.realms.p.ap = 0;
  expect(execute(s, r.id, command, now).result.movement).toBeUndefined();
});
