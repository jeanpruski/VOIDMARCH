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
    {Array.from({ length: 72 }, (_, frame) => (
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
