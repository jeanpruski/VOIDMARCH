import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag } from 'lucide-react';
import { buildingConstructionCost, BUILDINGS, TERRAINS } from '@voidmarch/config';
import { canAfford, key } from '@voidmarch/game-rules';
import type { Unit } from '@voidmarch/shared';
import { ActionButton } from './ActionButton';
import { constructionSiteReason } from './construction';
import { Cost, Modal, Miniature, BUILDING_FRAMES } from './ui';
import { send, useGame } from './store';

export function FoundBase({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState(false);
  const world = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  if (unit.kind !== 'PEASANT' || unit.ownerId !== world.player.id) return null;
  const tile = world.tiles.find((t) => key(t) === key(unit));
  const cost = buildingConstructionCost('OUTPOST', world.player.faction);
  const reason =
    constructionSiteReason(world, tile, 'OUTPOST') ||
    (tile?.ownerId
      ? 'Pour fonder une nouvelle base, placez ce paysan sur une terre neutre.'
      : '') ||
    (!tile?.terrain || !BUILDINGS.OUTPOST.terrains.includes(tile.terrain)
      ? 'Installez le paysan sur une plaine, une colline, une forêt ou des ruines.'
      : '') ||
    (!world.player.unlimitedAP && world.player.ap < 1 ? '1 PA nécessaire.' : '') ||
    (!canAfford(world.player.wallet, cost) ? 'Ressources insuffisantes.' : '');
  return (
    <>
      <ActionButton
        className="secondary"
        title="Fonder un avant-poste sur la case de ce paysan, même loin de votre capitale. Voir les conditions et le coût."
        onClick={() => setOpen(true)}
      >
        <Flag size={15} /> Fonder une base <small>1 PA + ressources</small>
      </ActionButton>
      {open &&
        createPortal(
          <Modal
            title="Fonder une base"
            onClose={() => setOpen(false)}
            toolbar={
              <div className="foundation-resources" aria-label="Vos ressources disponibles">
                Vos ressources : <Cost cost={world.player.wallet} />
              </div>
            }
          >
            <div className="inset">
              <Miniature frame={BUILDING_FRAMES.OUTPOST} size={100} />
              <h3>Avant-poste</h3>
              <p>
                {tile?.terrain ? TERRAINS[tile.terrain].name : 'Terrain inconnu'} · {unit.q},{' '}
                {unit.r}
              </p>
              <p>
                Ce paysan fonde une base sur sa case neutre, sans limite de distance à votre
                capitale. Sur une île, débarquez-le d’abord.
              </p>
              <p>
                L’avant-poste revendique sa case, ouvre la construction à 3 cases autour avec un
                bâtisseur à proximité, forme des paysans et peut évoluer en village.
              </p>
              <p>
                Votre capitale reste inchangée. Le paysan reste disponible après la construction.
              </p>
            </div>
            <div className="inset">
              <h4>Coût de fondation · 1 PA</h4>
              <Cost cost={cost} wallet={world.player.wallet} />
            </div>
            {reason && <p className="form-error">{reason}</p>}
            <div className="selection-actions">
              <button className="secondary" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button
                className="primary"
                disabled={!!reason || pending}
                onClick={async () => {
                  const result = await send({
                    type: 'BUILD',
                    actorId: unit.id,
                    payload: { kind: 'OUTPOST', q: unit.q, r: unit.r },
                  });
                  if (result?.accepted) setOpen(false);
                }}
              >
                Fonder l’avant-poste · 1 PA
              </button>
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
