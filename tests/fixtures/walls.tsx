import { createRoot } from 'react-dom/client';
import { WALL_KINDS, BUILDINGS, type TurretLevel } from '@voidmarch/config';
import { wallImageUrl, loadWallMaterials } from '../../apps/web/src/wall-art';
import { roadCanvas } from '../../apps/web/src/road-art';
import '../../apps/web/src/style.css';

const masks = [0, 1, 2, 4, 8, 16, 32, 9, 18, 36, 3, 6, 12, 24, 48, 33, 21, 42, 63];
await loadWallMaterials();
createRoot(document.getElementById('root')!).render(
  <main style={{ padding: 24 }}>
    <h1>Remparts — raccords et orientations</h1>
    <section>
      <h2>Portes sur routes · bois, pierre et acier · avec et sans tourelle</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {WALL_KINDS.flatMap((kind, tier) =>
          [false, true].flatMap((armed) =>
            [0, 1, 2].map((axis) => {
              const mask = (1 << axis) | (1 << (axis + 3));
              const roadAxis = (axis + 1) % 3;
              const roadMask = (1 << roadAxis) | (1 << (roadAxis + 3));
              return (
                <figure
                  key={`${kind}:${armed}:${axis}`}
                  style={{ margin: 0, background: '#56644a' }}
                >
                  <div style={{ position: 'relative', height: 160 }}>
                    <img
                      src={roadCanvas(roadMask, false, 0).toDataURL()}
                      alt=""
                      width={160}
                      height={160}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        top: 15,
                      }}
                    />
                    <img
                      src={wallImageUrl(
                        kind,
                        mask,
                        armed ? ((tier + 1) as TurretLevel) : undefined,
                        axis,
                      )}
                      alt={`Porte ${kind} axe ${axis}${armed ? ' armée' : ''}`}
                      width={160}
                      height={160}
                      style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
                    />
                  </div>
                  <figcaption style={{ fontSize: 11 }}>
                    {kind} · axe {axis}
                    {armed ? ' · tourelle' : ''}
                  </figcaption>
                </figure>
              );
            }),
          ),
        )}
      </div>
    </section>
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
