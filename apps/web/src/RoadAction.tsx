import { ActionButton } from './ActionButton';
import { Route, Trash2 } from 'lucide-react';
import { roadConstructionCost } from '@voidmarch/config';
import type { ViewTile } from '@voidmarch/shared';
import { Cost } from './ui';
import { openRoadTool, send, useGame } from './store';
import { roadBenefit, roadOrderReason } from './roads';

export function RoadAction({ tile }: { tile?: ViewTile }) {
  const w = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  if (!tile || (tile.ownerId && tile.ownerId !== w.player.id)) return null;
  const bridge = tile.terrain === 'RIVER';
  const tool = tile.road ? 'remove' : 'build';
  const reason = roadOrderReason(w, tile, tool);
  return (
    <>
      {tile.road && (
        <span className="road-status" title="Le trajet complet coûte toujours 1 PA.">
          {bridge ? 'Pont' : 'Route'} · réseau continu : distance illimitée pour 1 PA
        </span>
      )}
      {!reason && (
        <button
          className="secondary"
          disabled={pending}
          title={
            tile.road
              ? 'Retire uniquement la route ou le pont, sans remboursement des matériaux. Le bâtiment, les unités et le terrain sont conservés.'
              : `${roadBenefit(tile)} Les tronçons voisins se relient automatiquement, même sous un bâtiment.`
          }
          onClick={() =>
            void send({
              type: tile.road ? 'REMOVE_ROAD' : 'ROAD',
              actorId: w.player.id,
              payload: { q: tile.q, r: tile.r },
            })
          }
        >
          {tile.road ? <Trash2 size={15} /> : <Route size={15} />}
          {tile.road
            ? bridge
              ? 'Retirer le pont'
              : 'Retirer la route'
            : bridge
              ? 'Construire un pont'
              : 'Tracer une route'}{' '}
          · 1 PA
          {!tile.road && (
            <Cost cost={roadConstructionCost(tile.terrain)} wallet={w.player.wallet} />
          )}
        </button>
      )}
      <ActionButton
        shortcut="L"
        className="secondary"
        onClick={() => openRoadTool(tool)}
        title="Poser ou retirer plusieurs tronçons en cliquant directement sur la carte, avec explication des effets."
      >
        <Route size={15} /> Mode routes
      </ActionButton>
    </>
  );
}
