import { createRoot } from 'react-dom/client';
import { BUILDING_AGES, BUILDINGS, UNITS, UNIT_PROFILES, UNIT_ERAS } from '@voidmarch/config';
import { ERA_REINFORCEMENTS } from '../../packages/config/src/era-reinforcements';
import { Miniature, UNIT_FRAMES } from '../../apps/web/src/ui';
import '../../apps/web/src/style.css';
const kinds = Object.keys(ERA_REINFORCEMENTS) as (keyof typeof ERA_REINFORCEMENTS)[];
createRoot(document.getElementById('root')!).render(
  <main style={{ padding: 24, background: '#25372e' }}>
    {[1, 2, 3, 4, 5].map((age) => (
      <section key={age} style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>
          Niveau {age} · {BUILDING_AGES[age - 1]}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {kinds
            .filter((k) => UNIT_ERAS[k] === age)
            .map((kind) => (
              <figure key={kind} style={{ margin: 0, textAlign: 'center' }}>
                <Miniature frame={UNIT_FRAMES[kind]} size={180} />
                <figcaption>
                  <strong>{UNITS[kind].name}</strong>
                  <br />
                  <small>
                    {BUILDINGS[UNIT_PROFILES[kind].recruitAt[0]].name} · niv. {age}
                  </small>
                </figcaption>
              </figure>
            ))}
        </div>
      </section>
    ))}
  </main>,
);
