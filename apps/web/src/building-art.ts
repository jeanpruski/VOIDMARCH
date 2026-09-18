import { hasBuildingEvolutionArt, type BuildingKind } from '@voidmarch/config';
import { isolateSprites } from './sprite-atlas';

/** One compact four-frame strip per building, loaded only when its upgrades are visible. */
const atlases = new Map<BuildingKind, Promise<HTMLCanvasElement>>();
const urls = new Map<BuildingKind, Promise<string>>();
export const buildingTextureKey = (kind: BuildingKind) => `building-ages-v1:${kind}`;
export const buildingEvolutionFrame = (level: number) => Math.max(0, Math.min(3, level - 2));
export function buildingAtlas(kind: BuildingKind): Promise<HTMLCanvasElement> {
  if (!hasBuildingEvolutionArt(kind))
    return Promise.reject(new Error(`No evolution sheet: ${kind}`));
  let request = atlases.get(kind);
  if (!request) {
    request = (async () => {
      const source = new Image();
      source.src = `/assets/ages/${kind.toLowerCase()}.png`;
      await source.decode();
      const input = document.createElement('canvas');
      input.width = source.naturalWidth;
      input.height = source.naturalHeight;
      const ctx = input.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(source, 0, 0);
      const frames = isolateSprites(
        ctx.getImageData(0, 0, input.width, input.height).data,
        input.width,
        input.height,
        2,
        2,
      );
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      const output = canvas.getContext('2d')!;
      frames.forEach((frame, i) => {
        if (frame.width <= 1 || frame.height <= 1)
          throw new Error(`Empty building sprite: ${kind}:${i}`);
        const tile = document.createElement('canvas');
        tile.width = frame.width;
        tile.height = frame.height;
        const t = tile.getContext('2d')!;
        const data = t.createImageData(tile.width, tile.height);
        data.data.set(frame.pixels);
        t.putImageData(data, 0, 0);
        const scale = Math.min(216 / frame.width, 216 / frame.height),
          w = frame.width * scale,
          h = frame.height * scale;
        output.drawImage(tile, i * 256 + (256 - w) / 2, 236 - h, w, h);
      });
      // Source image is not retained: only the four small normalized frames are cached.
      input.width = input.height = 1;
      return canvas;
    })().catch((error) => {
      atlases.delete(kind);
      urls.delete(kind);
      throw error;
    });
    atlases.set(kind, request);
  }
  return request;
}
export function buildingAtlasUrl(kind: BuildingKind): Promise<string> {
  let url = urls.get(kind);
  if (!url) {
    url = buildingAtlas(kind).then((canvas) => canvas.toDataURL());
    urls.set(kind, url);
  }
  return url;
}
