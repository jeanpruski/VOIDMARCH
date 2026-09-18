import { createRoot } from 'react-dom/client';
import { GameMap } from '../../apps/web/src/Map';
import { CapitalRadar } from '../../apps/web/src/CapitalRadar';
import { NuclearAlerts, NuclearControls } from '../../apps/web/src/Strategy';
import { Panels } from '../../apps/web/src/Panels';
import { useGame } from '../../apps/web/src/store';
import '../../apps/web/src/style.css';
const world = JSON.parse(document.getElementById('fixture-world')!.textContent!);
useGame.setState({ world, status: 'online', now: world.serverTimestamp });
(window as any).__strategyStore = useGame;
(window as any).__strategySend = async (command: unknown) => {
  const response = await fetch('/strategy-order', {
    method: 'POST',
    body: JSON.stringify(command),
  });
  const data = await response.json();
  useGame.setState({ world: data.world });
  return data.result;
};
function Fixture() {
  const w = useGame((s) => s.world)!;
  const silo = w.tiles.find((t) => t.building?.kind === 'ROCKET_SILO')!.building!;
  return (
    <>
      <main className="board" style={{ width: '100vw', height: '100vh' }}>
        <GameMap />
        <CapitalRadar />
        <NuclearAlerts />
      </main>
      <div style={{ position: 'fixed', top: 10, left: 10, zIndex: 90 }}>
        <button onClick={() => useGame.setState({ panel: 'trade' })}>Diplomatie</button>
        <details style={{ width: 'min(580px,90vw)', background: '#14221c', padding: 10 }}>
          <summary>Silo de test</summary>
          <NuclearControls building={silo} />
        </details>
      </div>
      <Panels />
    </>
  );
}
const root = ((window as any).__operationsRoot ??= createRoot(document.getElementById('root')!));
root.render(<Fixture />);
