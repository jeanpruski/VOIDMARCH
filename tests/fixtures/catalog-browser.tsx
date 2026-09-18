import { createRoot } from 'react-dom/client';
import { Panels } from '../../apps/web/src/Panels';
import { acceptSession, useGame } from '../../apps/web/src/store';
import '../../apps/web/src/style.css';
const setup = await (window as any).catalogSetup();
(window as any).catalogStore = useGame;
acceptSession(setup.session);
useGame.setState({ world: setup.world, selection: setup.selection, panel: 'recruit' });
createRoot(document.getElementById('root')!).render(<Panels />);
