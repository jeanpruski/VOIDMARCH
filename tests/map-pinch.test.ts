import { afterEach, describe, expect, it, vi } from 'vitest';
import { installMapPinch, pinchCamera } from '../apps/web/src/map-pinch';
import { MAP_ZOOM } from '../apps/web/src/map-geometry';
const camera = { zoom: 1, scrollX: 400, scrollY: -300, width: 800, height: 600 };
const worldPoint = (c: typeof camera, p: { x: number; y: number }) => ({
  x: c.scrollX + c.width / 2 + (p.x - c.width / 2) / c.zoom,
  y: c.scrollY + c.height / 2 + (p.y - c.height / 2) / c.zoom,
});
afterEach(() => vi.unstubAllGlobals());
describe('zoom tactile de la carte', () => {
  it('zoome sous les doigts et suit leur déplacement sans dériver', () => {
    const from = { center: { x: 170, y: 220 }, span: 100 },
      to = { center: { x: 200, y: 260 }, span: 200 };
    const next = pinchCamera(camera, from, to);
    expect(next.zoom).toBe(2);
    expect(worldPoint(next, to.center)).toEqual(worldPoint(camera, from.center));
    expect(pinchCamera(next, to, from)).toEqual(camera);
  });
  it('borne le zoom sans perdre le point d’ancrage, ignore les doigts superposés', () => {
    const from = { center: { x: 200, y: 200 }, span: 100 };
    for (const [span, limit] of [
      [100000, MAP_ZOOM.max],
      [2, MAP_ZOOM.min],
    ]) {
      const to = { center: { x: 230, y: 240 }, span };
      const next = pinchCamera(camera, from, to);
      expect(next.zoom).toBe(limit);
      expect(worldPoint(next, to.center)).toEqual(worldPoint(camera, from.center));
    }
    expect(pinchCamera(camera, { ...from, span: 0 }, from)).toEqual(camera);
  });
  it('ne capture que le geste à deux doigts, bloque le clic final et nettoie ses écouteurs', async () => {
    const canvas = Object.assign(new EventTarget(), {
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 400, height: 300 }),
    }) as unknown as HTMLCanvasElement;
    let current = { ...camera };
    const changes: (typeof camera)[] = [];
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => frames.push(fn));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const finish = vi.fn();
    const pinch = installMapPinch(canvas, {
      camera: () => current,
      size: () => ({ width: 800, height: 600 }),
      change: (c) => {
        current = c;
        changes.push(c);
      },
      cancelDrag: vi.fn(),
      redraw: vi.fn(),
      finish,
    });
    const dispatch = (name: string, positions: [number, number][]) => {
      const event = Object.assign(new Event(name, { cancelable: true }), {
        targetTouches: positions.map(([id, x]) => ({ identifier: id, clientX: x, clientY: 100 })),
      });
      canvas.dispatchEvent(event);
      return event;
    };
    expect(dispatch('touchstart', [[0, 100]]).defaultPrevented).toBe(false);
    expect(pinch.capturing).toBe(false);
    expect(
      dispatch('touchstart', [
        [0, 100],
        [1, 150],
      ]).defaultPrevented,
    ).toBe(true);
    dispatch('touchmove', [
      [1, 200],
      [0, 100],
    ]);
    expect(current.zoom).toBe(2);
    dispatch('touchend', [[0, 100]]);
    expect(pinch.capturing).toBe(true);
    dispatch('touchmove', [[0, 130]]);
    expect(changes).toHaveLength(1);
    dispatch('touchcancel', []);
    expect(pinch.capturing).toBe(true);
    await Promise.resolve();
    expect(pinch.capturing).toBe(false);
    expect(finish).toHaveBeenCalledOnce();
    pinch.destroy();
    expect(
      dispatch('touchstart', [
        [0, 100],
        [1, 200],
      ]).defaultPrevented,
    ).toBe(false);
  });
});
