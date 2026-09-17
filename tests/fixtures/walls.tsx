import { createRoot } from 'react-dom/client';
import { WALL_KINDS, BUILDINGS } from '@voidmarch/config';
import { wallImageUrl, loadWallMaterials } from '../../apps/web/src/wall-art';
import '../../apps/web/src/style.css';

const masks = [0, 1, 2, 4, 8, 16, 32, 9, 18, 36, 3, 6, 12, 24, 48, 33, 21, 42, 63];
await loadWallMaterials();
createRoot(document.getElementById('root')!).render(
  <main style={{ padding: 24 }}>
    <h1>Remparts — raccords et orientations</h1>
    {WALL_KINDS.map((kind) => (
      <section key={kind}>
        <h2>{BUILDINGS[kind].name}</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 10,
          }}
        >
          {masks.map((mask) => (
            <figure
              key={mask}
              style={{
                margin: 0,
                textAlign: 'center',
                background: '#3b4438',
                border: '1px solid #727964',
              }}
            >
              <img
                src={wallImageUrl(kind, mask)}
                width="128"
                height="128"
                alt={`${kind}:${mask}`}
              />
              <figcaption style={{ fontSize: 11 }}>
                {mask === 0 ? 'Isolé' : `Raccord ${mask}`}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ))}
  </main>,
);
