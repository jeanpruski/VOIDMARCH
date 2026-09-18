import { ActionButton } from './ActionButton';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Hammer } from 'lucide-react';
import { ACTION_COST, BUILDINGS, storageBonus, isWall } from '@voidmarch/config';
import { amount, demolitionRefund, distance } from '@voidmarch/game-rules';
import type { Building } from '@voidmarch/shared';
import { Cost, Modal, format } from './ui';
import { send, useGame } from './store';

export function DemolishBuilding({ building: b }: { building: Building }) {
  const [open, setOpen] = useState(false);
  const world = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  if (b.ownerId !== world.player.id || distance(b, world.player.capital) === 0) return null;
  const refund = demolitionRefund(b, world.player.faction);
  const cost = ACTION_COST.DEMOLISH;
  const missingAP = !world.player.unlimitedAP && world.player.ap < cost;
  return (
    <>
      <ActionButton
        shortcut="D"
        className="secondary"
        onClick={() => setOpen(true)}
        title="Libérer la case et récupérer les ressources de construction"
      >
        <Hammer size={15} /> Démolir · {cost} PA
      </ActionButton>
      {open &&
        createPortal(
          <Modal
            title={`Démolir : ${BUILDINGS[b.kind].name}`}
            eyebrow="DÉMOLITION"
            onClose={() => setOpen(false)}
          >
            <div className="upgrade-preview">
              <p>
                Le bâtiment et ses améliorations seront définitivement supprimés. La case et sa
                route restent dans votre territoire.
              </p>
              {isWall(b.kind) && (
                <p className="warning">
                  Si ce tronçon ouvre une brèche dans votre enceinte, les cases intérieures sans
                  bâtiment redeviennent neutres. Les cases portant un bâtiment restent à vous.
                </p>
              )}
              {b.turretLevel && (
                <p className="warning">
                  La tourelle sera également supprimée. Son coût d’installation initial est inclus
                  dans le remboursement, hors évolutions.
                </p>
              )}
              <h3>Ressources récupérées</h3>
              {amount(refund) > 0 ? (
                <Cost cost={refund} />
              ) : (
                <p>Aucune : ce bâtiment a été obtenu gratuitement.</p>
              )}
              <p>
                {b.constructionCost === undefined
                  ? 'Remboursement du coût de base de ce type de bâtiment, réduction de faction comprise.'
                  : 'Remboursement de la construction initiale, réduction de faction comprise.'}{' '}
                Les améliorations et réparations ne sont pas remboursées.
              </p>
              <p>
                La production, la vision et les possibilités de recrutement de ce bâtiment
                disparaissent. Vos unités restent en place et conservent leur entraînement.
              </p>
              {b.population > 0 && (
                <p>
                  Population du royaume : −{format(b.population)} habitants. Les recrutements
                  suivants dépendent de la population restante.
                </p>
              )}
              {storageBonus(b.kind, b.level) > 0 && (
                <p>
                  Capacité de stockage : −{storageBonus(b.kind, b.level)} par ressource. Le stock et
                  le remboursement sont conservés ; la production reprend lorsque le stock repasse
                  sous la capacité.
                </p>
              )}
              <p>La capitale est protégée contre la démolition.</p>
              {missingAP && (
                <p className="upgrade-missing">Il faut {cost} PA pour démolir ce bâtiment.</p>
              )}
              <div className="selection-actions">
                <button className="secondary" onClick={() => setOpen(false)}>
                  Annuler
                </button>
                <button
                  className="primary"
                  disabled={pending || missingAP}
                  onClick={async () => {
                    const request = send({ type: 'DEMOLISH', actorId: b.id, payload: {} });
                    setOpen(false);
                    const result = await request;
                    if (result?.accepted) {
                      setOpen(false);
                      useGame.setState({
                        selectedUnitIds: [],
                        groupTarget: null,
                        multiSelect: false,
                        selection: { kind: 'tile', q: b.q, r: b.r },
                        mode: 'inspect',
                      });
                    }
                  }}
                >
                  Confirmer la démolition · {cost} PA
                </button>
              </div>
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
