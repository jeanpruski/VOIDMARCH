import { createRoot } from 'react-dom/client';
import { Development } from '../../apps/web/src/Development';
import { UpgradeBuilding } from '../../apps/web/src/UpgradeBuilding';
import { Supplies } from '../../apps/web/src/Supplies';
import { Missions } from '../../apps/web/src/Missions';
import { acceptSession, useGame } from '../../apps/web/src/store';
import '../../apps/web/src/style.css';
const setup = await (window as any).catalogSetup();
(window as any).catalogStore = useGame;
acceptSession(setup.session);
useGame.setState({ world: setup.world, now: setup.world.serverTimestamp });
function Review() {
  const world = useGame((s) => s.world)!;
  const building = world.tiles.find((t) => t.building?.kind === 'BARRACKS')!.building!;
  return (
    <main style={{ maxWidth: 850, margin: 'auto', padding: 20 }}>
      <Development />
      <UpgradeBuilding building={building} />
      <Supplies units={world.units} />
      <Missions />
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Review />);
