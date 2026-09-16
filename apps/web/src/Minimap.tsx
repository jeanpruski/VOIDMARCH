import { useMemo, useRef } from 'react';
import { Compass } from 'lucide-react';
import { TERRAINS } from '@voidmarch/config';
import { key } from '@voidmarch/game-rules';
import { focusMap, useGame } from './store';
import { hexToPixel, minimapProjection, SIZE, Y_SCALE } from './map-geometry';

export function Minimap() {
  const world = useGame((s) => s.world)!;
  const viewport = useGame((s) => s.cameraViewport);
  const tiles = world.overview ?? world.tiles.filter((t) => t.terrain);
  const projection = useMemo(
    () => minimapProjection(tiles, world.player.capital),
    [tiles, world.player.capital],
  );
  const terrainLayer = useMemo(
    () =>
      tiles.map((t) => {
        const p = projection.project(hexToPixel(t));
        const points = Array.from({ length: 6 }, (_, i) => {
          const a = ((30 + 60 * i) * Math.PI) / 180;
          return `${p.x + Math.cos(a) * SIZE * projection.scale},${p.y + Math.sin(a) * SIZE * Y_SCALE * projection.scale}`;
        }).join(' ');
        const terrain = t.terrain
          ? `#${TERRAINS[t.terrain].color.toString(16).padStart(6, '0')}`
          : '#344438';
        const color = t.ownerId
          ? (world.realms.find((r) => r.id === t.ownerId)?.color ?? terrain)
          : terrain;
        return (
          <polygon
            key={key(t)}
            points={points}
            fill={color}
            opacity={t.visibility === 'EXPLORED' ? 0.5 : 0.95}
          />
        );
      }),
    [tiles, projection, world.realms],
  );
  const gesture = useRef<typeof projection | null>(null);
  const capital = projection.project(hexToPixel(world.player.capital));
  const camera = viewport ? projection.project(viewport) : null;
  const navigate = (svg: SVGSVGElement, x: number, y: number) => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(x, y).matrixTransform(matrix.inverse());
    if (point.x < 0 || point.x > 180 || point.y < 0 || point.y > 110) return;
    focusMap((gesture.current ?? projection).unproject(point.x, point.y));
  };
  return (
    <div className="minimap">
      <div>
        <Compass size={13} />
        <span>LES MARCHES</span>
        <small>N ↑</small>
      </div>
      <svg
        viewBox="0 0 180 110"
        aria-label="Minicarte du royaume"
        role="img"
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          gesture.current = projection;
          e.currentTarget.setPointerCapture(e.pointerId);
          navigate(e.currentTarget, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            navigate(e.currentTarget, e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          gesture.current = null;
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onKeyDown={(e) => {
          const step = {
            ArrowLeft: [-12, 0],
            ArrowRight: [12, 0],
            ArrowUp: [0, -12],
            ArrowDown: [0, 12],
          }[e.key];
          if (e.key === 'Home') {
            e.preventDefault();
            e.stopPropagation();
            focusMap(world.player.capital);
          } else if (step && viewport) {
            e.preventDefault();
            e.stopPropagation();
            const center = projection.project({
              x: viewport.x + viewport.width / 2,
              y: viewport.y + viewport.height / 2,
            });
            focusMap(projection.unproject(center.x + step[0], center.y + step[1]));
          }
        }}
      >
        <title>
          Cliquez ou glissez pour déplacer la vue. Le cadre indique la zone affichée. Flèches pour
          naviguer, Début pour revenir à la capitale.
        </title>
        <rect width="180" height="110" fill="#101c18" />
        <g pointerEvents="none">
          {terrainLayer}
          <circle
            cx={capital.x}
            cy={capital.y}
            r="2.7"
            fill="#e0c98e"
            stroke="#152019"
            strokeWidth="1"
          >
            <title>Votre capitale</title>
          </circle>
          {camera && viewport && (
            <rect
              aria-label="Zone affichée"
              x={camera.x}
              y={camera.y}
              width={viewport.width * projection.scale}
              height={viewport.height * projection.scale}
              fill="#e4d9b509"
              stroke="#ead9a4"
              strokeWidth="1"
            />
          )}
        </g>
      </svg>
    </div>
  );
}
