import { Route } from 'lucide-react';
import { canAfford } from '@voidmarch/game-rules';
import type { ViewTile } from '@voidmarch/shared';
import { Cost } from './ui';
import { send, useGame } from './store';

export function RoadAction({ tile }: { tile?: ViewTile }) {
  const w = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  if (!tile || tile.ownerId !== w.player.id) return null;
  if (tile.road)
    return (
      <span
        className="road-status"
        title="Entrer sur cette case consomme 1 point de déplacement. Un déplacement complet coûte toujours 1 PA."
      >
        Route en place · déplacement : 1
      </span>
    );
  const bridge = tile.terrain === 'RIVER';
  const cost = bridge ? { WOOD: 30, IRON: 10 } : { WOOD: 10 };
  if ((!w.player.unlimitedAP && w.player.ap < 1) || !canAfford(w.player.wallet, cost)) return null;
  return (
    <button
      className="secondary"
      disabled={pending}
      title="Aménage cette case, même sous un bâtiment. Son coût de déplacement passe à 1 : utile en forêt, sur relief et rivière. Les routes voisines se relient automatiquement."
      onClick={() =>
        void send({ type: 'ROAD', actorId: w.player.id, payload: { q: tile.q, r: tile.r } })
      }
    >
      <Route size={15} /> {bridge ? 'Construire un pont' : 'Tracer une route'} · 1 PA{' '}
      <Cost cost={cost} wallet={w.player.wallet} />
    </button>
  );
}
