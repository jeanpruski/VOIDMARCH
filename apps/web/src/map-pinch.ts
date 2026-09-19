import { MAP_ZOOM } from './map-geometry';

type Point = { x: number; y: number };
type Camera = { zoom: number; scrollX: number; scrollY: number; width: number; height: number };
type Sample = { center: Point; span: number };

/** Keep the same world point under the moving midpoint, including at the zoom limits. */
export function pinchCamera(camera: Camera, previous: Sample, next: Sample): Camera {
  if (previous.span < 2 || next.span < 2) return camera;
  const zoom = Math.max(
    MAP_ZOOM.min,
    Math.min(MAP_ZOOM.max, (camera.zoom * next.span) / previous.span),
  );
  return {
    ...camera,
    zoom,
    scrollX:
      camera.scrollX +
      (previous.center.x - camera.width / 2) / camera.zoom -
      (next.center.x - camera.width / 2) / zoom,
    scrollY:
      camera.scrollY +
      (previous.center.y - camera.height / 2) / camera.zoom -
      (next.center.y - camera.height / 2) / zoom,
  };
}

/** Native touch events also work on Safari; Phaser keeps handling ordinary one-finger taps/drags. */
export function installMapPinch(
  canvas: HTMLCanvasElement,
  adapter: {
    camera: () => Camera;
    size: () => { width: number; height: number };
    change: (camera: Camera) => void;
    cancelDrag: () => void;
    redraw: () => void;
    finish: () => void;
  },
) {
  let capturing = false,
    disposed = false,
    previous: Sample | undefined,
    pair = '',
    frame = 0;
  const sample = (event: TouchEvent): Sample | undefined => {
    const touches = Array.from(event.targetTouches).sort((a, b) => a.identifier - b.identifier);
    if (touches.length < 2) {
      pair = '';
      return;
    }
    const ids = `${touches[0].identifier}:${touches[1].identifier}`;
    if (pair !== ids) previous = undefined;
    pair = ids;
    const rect = canvas.getBoundingClientRect(),
      size = adapter.size();
    if (!rect.width || !rect.height) return;
    const points = touches.slice(0, 2).map((t) => ({
      x: ((t.clientX - rect.left) * size.width) / rect.width,
      y: ((t.clientY - rect.top) * size.height) / rect.height,
    }));
    return {
      center: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
      span: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
    };
  };
  const touch = (event: TouchEvent) => {
    if (disposed) return;
    const next = sample(event);
    if (!capturing && !next) return;
    if (event.cancelable) event.preventDefault();
    capturing = true;
    adapter.cancelDrag();
    if (next && previous) {
      adapter.change(pinchCamera(adapter.camera(), previous, next));
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!disposed) adapter.redraw();
        });
    }
    previous = next;
    if (!event.targetTouches.length) {
      adapter.finish();
      // Keep pointerup suppressed until Phaser has received this same DOM event.
      queueMicrotask(() => {
        if (!disposed) capturing = false;
      });
    }
  };
  const events = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const;
  for (const name of events)
    canvas.addEventListener(name, touch, { passive: false, capture: true });
  return {
    get capturing() {
      return capturing;
    },
    destroy() {
      disposed = true;
      for (const name of events) canvas.removeEventListener(name, touch, true);
      cancelAnimationFrame(frame);
      capturing = false;
      previous = undefined;
    },
  };
}
