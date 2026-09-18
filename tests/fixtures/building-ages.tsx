import { createRoot } from 'react-dom/client';
import { BUILDINGS, hasBuildingEvolutionArt, type BuildingKind } from '@voidmarch/config';
import { Miniature, BUILDING_FRAMES } from '../../apps/web/src/ui';
import '../../apps/web/src/style.css';
const kinds = (Object.keys(BUILDINGS) as BuildingKind[]).filter(hasBuildingEvolutionArt);
const featured: BuildingKind[] = ['BARRACKS', 'MINE', 'FARM', 'VILLAGE'];
kinds.sort((a, b) =>
  (featured.includes(a) ? featured.indexOf(a) : -1) < 0
    ? featured.includes(b)
      ? 1
      : 0
    : featured.includes(b)
      ? featured.indexOf(a) - featured.indexOf(b)
      : -1,
);
createRoot(document.getElementById('root')!).render(
  <main style={{ padding: 20, background: '#26382f' }}>
    <h1>Les cinq niveaux de VOIDMARCH</h1>
    {kinds.map((kind) => (
      <section
        key={kind}
        data-building={kind}
        style={{ padding: 12, borderBottom: '1px solid #697e6c' }}
      >
        <h2>{BUILDINGS[kind].name}</h2>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {[1, 2, 3, 4, 5].map((level) => (
            <figure key={level} style={{ margin: 0, textAlign: 'center' }}>
              <Miniature frame={BUILDING_FRAMES[kind]} building={{ kind, level }} size={160} />
              <figcaption>Niveau {level}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    ))}
  </main>,
);
