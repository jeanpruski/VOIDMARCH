import { createRoot } from 'react-dom/client';
import { MissionMedal } from '../../apps/web/src/MissionMedal';
import type { MissionMedal as Medal } from '@voidmarch/shared';
const medals: Medal[] = await (window as any).medalSetup();
createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 20, background: '#17221e', color: '#eee1b8', font: '14px Georgia' }}>
    <style>{'body { margin:0 } .mission-medal { width:138px;height:152px }'}</style>
    <h1>Médailles des Marches</h1>
    <main style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
      {medals.map((medal, i) => (
        <article
          key={i}
          style={{ textAlign: 'center', background: '#29352d', padding: 10, borderRadius: 8 }}
        >
          <MissionMedal medal={medal} level={4} />
          <div>{medal.name}</div>
        </article>
      ))}
    </main>
  </div>,
);
