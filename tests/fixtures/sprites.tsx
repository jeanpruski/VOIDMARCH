import { createRoot } from 'react-dom/client';
import { Miniature } from '../../apps/web/src/ui';
import '../../apps/web/src/style.css';

createRoot(document.getElementById('root')!).render(
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: 12,
      padding: 20,
    }}
  >
    {[
      ...Array.from({ length: 87 }, (_, frame) => frame),
      ...Array.from({ length: 10 }, (_, i) => 96 + i),
      120,
      ...Array.from({ length: 6 }, (_, sheet) =>
        Array.from({ length: 6 }, (_, i) => 144 + sheet * 24 + i),
      ).flat(),
      288,
      289,
      290,
      291,
      552,
      576,
      600,
      624,
      648,
      672,
      696,
      720,
      744,
      ...Array.from({ length: 5 }, (_, sheet) =>
        Array.from({ length: 4 }, (_, i) => 768 + sheet * 24 + i),
      ).flat(),
    ].map((frame) => (
      <div
        key={frame}
        className="selection-identity"
        style={{ display: 'flex', flexDirection: 'column', border: '1px solid #777', padding: 8 }}
      >
        <Miniature frame={frame} size={96} />
        <span>{frame}</span>
      </div>
    ))}
  </div>,
);
