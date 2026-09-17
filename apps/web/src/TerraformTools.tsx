import { createPortal } from 'react-dom';
import { Hammer, X } from 'lucide-react';
import { TERRAFORM_COST, TERRAINS } from '@voidmarch/config';
import { key } from '@voidmarch/game-rules';
import { Cost, Modal } from './ui';
import { terraformOrderReason } from './terraform';
import { send, useGame } from './store';

export function TerraformTools() {
  const { world, mode, selection, terraformTarget: target, hover, pending } = useGame();
  if (!world || mode !== 'terraform') return null;
  const unit =
    selection?.kind === 'unit' ? world.units.find((u) => u.id === selection.id) : undefined;
  const tile = target ? world.tiles.find((t) => key(t) === key(target)) : undefined;
  const hovered = hover ? world.tiles.find((t) => key(t) === key(hover)) : undefined;
  const reason = terraformOrderReason(world, tile, unit);
  return (
    <>
      <section className="road-tools" aria-label="Terrassement">
        <div className="road-tools-heading">
          <strong>
            <Hammer size={17} /> Terrassement · 2 PA/case
          </strong>
          <button
            className="icon-button"
            aria-label="Quitter le terrassement"
            onClick={() => useGame.setState({ mode: 'inspect', terraformTarget: undefined })}
          >
            <X size={17} />
          </button>
        </div>
        <p>
          Choisissez une case surlignée à une case maximum du terrassier, ou son propre terrain.
        </p>
        <Cost cost={TERRAFORM_COST} wallet={world.player.wallet} />
        <p>
          Transforme définitivement le sol en plaine. Cases neutres ou à vous, sans bâtiment.
          Propriété et routes conservées.
        </p>
        {hovered && (
          <p className={terraformOrderReason(world, hovered, unit) ? 'form-error' : 'road-target'}>
            {terraformOrderReason(world, hovered, unit) ||
              `${TERRAINS[hovered.terrain!].name} → Plaine`}
          </p>
        )}
      </section>
      {target &&
        createPortal(
          <Modal
            title="Transformer en plaine ?"
            eyebrow="TERRASSEMENT"
            onClose={() => useGame.setState({ terraformTarget: undefined })}
          >
            <div className="upgrade-preview">
              <p>
                {tile?.terrain ? TERRAINS[tile.terrain].name : 'Terrain'} → Plaine · case {target.q}
                , {target.r}.
              </p>
              <p>
                Le relief et ses ressources naturelles disparaissent définitivement. Aucun matériau
                n’est récupéré. Les règles habituelles de construction s’appliquent à la nouvelle
                plaine.
              </p>
              {tile?.poi && !tile.exhausted && (
                <p className="warning">
                  Les vestiges de cette case seront supprimés sans récompense. Explorez-les d’abord
                  si vous souhaitez récupérer leur trésor.
                </p>
              )}
              <p>
                Propriétaire, routes et unités restent en place. Un pont devient un chemin sur terre
                ferme.
              </p>
              <Cost cost={TERRAFORM_COST} wallet={world.player.wallet} />
              {reason && <p className="form-error">{reason}</p>}
              <div className="selection-actions">
                <button
                  className="secondary"
                  onClick={() => useGame.setState({ terraformTarget: undefined })}
                >
                  Annuler
                </button>
                {!reason && (
                  <button
                    className="primary"
                    disabled={pending}
                    onClick={async () => {
                      if (!unit) return;
                      const result = await send({
                        type: 'TERRAFORM',
                        actorId: unit.id,
                        payload: target,
                      });
                      if (result?.accepted)
                        useGame.setState({ terraformTarget: undefined, mode: 'inspect' });
                    }}
                  >
                    Transformer en plaine · 2 PA
                  </button>
                )}
              </div>
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
