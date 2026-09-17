/** The generated sheets are loosely aligned. Connected silhouettes, rather than
 * rigid source rectangles, determine ownership of pixels in the rendered atlas. */
export function isolateSprites(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  columns = 6,
  rows = 4,
) {
  const total = width * height;
  const labels = new Int32Array(total);
  const queue = new Int32Array(total);
  const owners: number[] = [-1];
  const cellWidth = width / columns,
    cellHeight = height / rows;
  const bounds = Array.from({ length: columns * rows }, () => ({
    left: width,
    top: height,
    right: -1,
    bottom: -1,
  }));
  let component = 0;
  for (let start = 0; start < total; start++) {
    // Tiny alpha haze around generated sprites can connect unrelated objects.
    if (labels[start] || pixels[start * 4 + 3] < 32) continue;
    component++;
    let head = 0,
      tail = 1;
    queue[0] = start;
    labels[start] = component;
    const votes = new Uint32Array(columns * rows);
    let left = width,
      top = height,
      right = -1,
      bottom = -1;
    while (head < tail) {
      const i = queue[head++],
        x = i % width,
        y = Math.floor(i / width);
      votes[Math.floor(y / cellHeight) * columns + Math.floor(x / cellWidth)]++;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (labels[next] || pixels[next * 4 + 3] < 32) continue;
          labels[next] = component;
          queue[tail++] = next;
        }
    }
    // Discard isolated specks, but retain separate small details of figurines.
    if (tail < 6) {
      owners[component] = -1;
      continue;
    }
    let owner = 0;
    for (let i = 1; i < votes.length; i++) if (votes[i] > votes[owner]) owner = i;
    owners[component] = owner;
    const b = bounds[owner];
    b.left = Math.min(b.left, left);
    b.right = Math.max(b.right, right);
    b.top = Math.min(b.top, top);
    b.bottom = Math.max(b.bottom, bottom);
  }
  const frames = bounds.map((b) => {
    const w = Math.max(1, b.right - b.left + 1),
      h = Math.max(1, b.bottom - b.top + 1);
    return { x: b.left, y: b.top, width: w, height: h, pixels: new Uint8ClampedArray(w * h * 4) };
  });
  for (let i = 0; i < total; i++) {
    const owner = owners[labels[i]];
    if (owner === undefined || owner < 0) continue;
    const frame = frames[owner];
    const offset = ((Math.floor(i / width) - frame.y) * frame.width + (i % width) - frame.x) * 4;
    frame.pixels.set(pixels.subarray(i * 4, i * 4 + 4), offset);
  }
  return frames;
}

export const SPRITE_CELL = 256;
export const SPRITE_MARGIN = 20;
/** Source grids; all are packed into the same 6 × 4 rendering format. */
export const SPRITE_ATLASES: Record<string, { columns: number; rows: number }> = {
  miniatures: { columns: 6, rows: 4 },
  expansion: { columns: 6, rows: 4 },
  industrial: { columns: 6, rows: 4 },
  occult: { columns: 6, rows: 2 },
  aviation: { columns: 5, rows: 2 },
  'units-medieval': { columns: 3, rows: 2 },
  'units-civil': { columns: 6, rows: 2 },
  'units-industrial': { columns: 6, rows: 2 },
};
const canvases = new Map<string, HTMLCanvasElement>();
const urls = new Map<string, Promise<string>>();

/** Common rendering source for Phaser and the HTML thumbnails. Originals stay intact. */
export function normalizedAtlas(name: string, source: HTMLImageElement): HTMLCanvasElement {
  const cached = canvases.get(name);
  if (cached) return cached;
  const input = document.createElement('canvas');
  input.width = source.naturalWidth;
  input.height = source.naturalHeight;
  const context = input.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(source, 0, 0);
  const frames = isolateSprites(
    context.getImageData(0, 0, input.width, input.height).data,
    input.width,
    input.height,
    SPRITE_ATLASES[name].columns,
    SPRITE_ATLASES[name].rows,
  );
  const atlas = document.createElement('canvas');
  atlas.width = SPRITE_CELL * 6;
  atlas.height = SPRITE_CELL * 4;
  const output = atlas.getContext('2d')!;
  output.imageSmoothingQuality = 'high';
  const cutout = document.createElement('canvas');
  frames.forEach((frame, index) => {
    cutout.width = frame.width;
    cutout.height = frame.height;
    const data = cutout.getContext('2d')!.createImageData(frame.width, frame.height);
    data.data.set(frame.pixels);
    cutout.getContext('2d')!.putImageData(data, 0, 0);
    const scale = (SPRITE_CELL - SPRITE_MARGIN * 2) / Math.max(frame.width, frame.height);
    const w = frame.width * scale,
      h = frame.height * scale;
    output.drawImage(
      cutout,
      (index % 6) * SPRITE_CELL + (SPRITE_CELL - w) / 2,
      Math.floor(index / 6) * SPRITE_CELL + SPRITE_CELL - SPRITE_MARGIN - h,
      w,
      h,
    );
  });
  canvases.set(name, atlas);
  return atlas;
}

export function miniatureAtlasUrl(name: string): Promise<string> {
  let pending = urls.get(name);
  if (!pending) {
    pending = (async () => {
      let canvas = canvases.get(name);
      if (!canvas) {
        const source = new Image();
        source.src = `/assets/${name}.png`;
        await source.decode();
        canvas = normalizedAtlas(name, source);
      }
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('Atlas illisible.'))),
          'image/png',
        );
      });
      return URL.createObjectURL(blob);
    })();
    urls.set(name, pending);
  }
  return pending;
}
