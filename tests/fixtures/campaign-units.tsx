import { createRoot } from 'react-dom/client';
import {
  BUILDINGS,
  CAMPAIGN_FAMILIES,
  CAMPAIGN_KINDS,
  CAMPAIGN_ROSTER,
  UNITS,
  UNIT_PROFILES,
} from '@voidmarch/config';
import { Miniature, UNIT_FRAMES } from '../../apps/web/src/ui';
import '../../apps/web/src/style.css';
createRoot(document.getElementById('root')!).render(
  <main style={{ padding: 24, background: '#25372e' }}>
    {(['blood', 'abyss', 'briar', 'frost'] as const).map((family) => (
      <section key={family} data-family={family}>
        <h1 style={{ fontSize: 34, margin: '20px 0' }}>{CAMPAIGN_FAMILIES[family]}</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
          {CAMPAIGN_KINDS.filter((k) => CAMPAIGN_ROSTER[k].family === family).map((kind) => (
            <figure
              key={kind}
              style={{ margin: 0, textAlign: 'center', padding: 8, background: '#141e1a' }}
            >
              <Miniature frame={UNIT_FRAMES[kind]} size={150} />
              <figcaption>
                <strong>{UNITS[kind].name}</strong>
                <br />
                <small>
                  {BUILDINGS[UNIT_PROFILES[kind].recruitAt[0]].name} · niv.{' '}
                  {UNIT_PROFILES[kind].minRecruitLevel}
                </small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ))}
  </main>,
);
