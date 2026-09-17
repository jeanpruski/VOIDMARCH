import { Route, Trash2, X } from 'lucide-react';
import { roadConstructionCost } from '@voidmarch/config';
import { key } from '@voidmarch/game-rules';
import { Cost } from './ui';
import { roadBenefit, roadOrderReason } from './roads';
import { useGame } from './store';
export function RoadTools() {
  const world = useGame((s) => s.world)!;
  const mode = useGame((s) => s.mode),
    tool = useGame((s) => s.roadTool),
    hover = useGame((s) => s.hover),
    pending = useGame((s) => s.pending);
  if (mode !== 'road') return null;
  const tile = hover ? world.tiles.find((t) => key(t) === key(hover)) : undefined;
  const reason = tile ? roadOrderReason(world, tile, tool) : '';
  return (
    <section className="road-tools" aria-label="Aménagement des routes">
      <div className="road-tools-heading">
        <strong>
          <Route size={17} /> Routes & ponts
        </strong>
        <button
          className="icon-button"
          aria-label="Quitter le mode routes"
          onClick={() => useGame.setState({ mode: 'inspect' })}
        >
          <X size={17} />
        </button>
      </div>
      <div className="road-tool-buttons" role="group" aria-label="Outil de route">
        <button
          className={`secondary ${tool === 'build' ? 'chosen' : ''}`}
          aria-pressed={tool === 'build'}
          onClick={() => useGame.setState({ roadTool: 'build' })}
        >
          <Route size={15} /> Poser · 1 PA/case
        </button>
        <button
          className={`secondary ${tool === 'remove' ? 'chosen' : ''}`}
          aria-pressed={tool === 'remove'}
          onClick={() => useGame.setState({ roadTool: 'remove' })}
        >
          <Trash2 size={15} /> Retirer · 1 PA/case
        </button>
      </div>
      <p>
        {pending
          ? 'Ordre en cours…'
          : 'Cliquez les cases surlignées, l’une après l’autre. En terrain neutre, gardez un paysan ou un ingénieur à une case maximum. Glissez pour déplacer la carte.'}
      </p>
      {tool === 'build' ? (
        <p className="road-price">
          {tile?.terrain === 'RIVER' ? 'Pont' : 'Route'} :{' '}
          <Cost cost={roadConstructionCost(tile?.terrain)} wallet={world.player.wallet} />
          {!tile?.terrain && <span> · Pont : 30 bois + 10 fer</span>}
        </p>
      ) : (
        <p>
          Sans remboursement des matériaux. Le terrain, les unités et les bâtiments restent en
          place.
        </p>
      )}
      {tile && (
        <p className={reason ? 'form-error' : 'road-target'}>
          {reason ||
            (tool === 'remove'
              ? `Retirer ${tile.terrain === 'RIVER' ? 'ce pont' : 'cette route'} · 1 PA`
              : roadBenefit(tile))}
        </p>
      )}
      <details>
        <summary>À quoi servent les routes ?</summary>
        <p>
          Une unité déjà sur une route peut rejoindre n’importe quelle case du même réseau continu
          et exploré pour 1 PA, sans limite de distance. Sélectionnez l’unité, puis Déplacer et la
          destination : le chemin est calculé automatiquement, même entre deux cités éloignées.
        </p>
        <p>
          Pour rejoindre la route ou la quitter, la portée normale de l’unité s’applique. Entrer sur
          un tronçon coûte alors 1 point de déplacement. Un trou dans la route interrompt le trajet
          illimité. Les cases occupées bloquent les unités au sol ; les unités volantes peuvent les
          survoler mais doivent arriver sur une case libre.
        </p>
        <p>
          Les tronçons voisins se raccordent automatiquement, même sous les bâtiments. Les ennemis
          profitent aussi des routes ; un rempart ennemi reste bloquant au sol.
        </p>
        <p>
          Sur vos terres, aucun bâtisseur n’est nécessaire. Sur terrain neutre, un paysan ou un
          ingénieur doit rester à une case maximum du chantier. La route ne revendique pas le
          terrain et n’offre pas de vision permanente. Vous pouvez y retirer vos propres tronçons
          avec un bâtisseur à proximité. Les routes des territoires adverses sont protégées.
        </p>
        <p>
          Avec un accord commercial actif, une route continue entre deux marchés permet le départ de
          caravanes. Retirer un tronçon peut empêcher les prochains départs.
        </p>
        <p>
          Échap ou la croix ferme cet outil. Aucun PA n’est dépensé pour ouvrir l’outil ou changer
          de mode.
        </p>
      </details>
    </section>
  );
}
