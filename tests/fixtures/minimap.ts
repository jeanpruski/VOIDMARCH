import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { GameMap } from '../../apps/web/src/Map';
import { Minimap } from '../../apps/web/src/Minimap';
import { useGame } from '../../apps/web/src/store';
import '../../apps/web/src/style.css';

// A complete local view with no session or socket: these checks never create a
// player or modify the live world used by the developer and the user.
useGame.setState({
  world: JSON.parse(document.getElementById('fixture-world')!.textContent!),
  status: 'online',
});
createRoot(document.getElementById('root')!).render(
  createElement(
    'main',
    { className: 'board', style: { width: '100vw', height: '100vh' } },
    createElement(GameMap),
    createElement(Minimap),
  ),
);
