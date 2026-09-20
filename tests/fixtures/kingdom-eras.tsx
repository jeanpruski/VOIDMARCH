import { createRoot } from 'react-dom/client';
import { Development } from '../../apps/web/src/Development';
import { MissionProgression } from '../../apps/web/src/MissionProgression';
import { useGame, acceptSession } from '../../apps/web/src/store';
import '../../apps/web/src/style.css';
const setup = await (window as any).eraSetup();
acceptSession(setup.session);
useGame.setState({ world: setup.world });
(window as any).eraStore = useGame;
createRoot(document.getElementById('root')!).render(
  <main style={{ maxWidth: 600, padding: 16 }}>
    <Development />
    <MissionProgression />
    <MissionProgression expedition />
  </main>,
);
