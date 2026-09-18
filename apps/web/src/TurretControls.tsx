import { ActionButton } from './ActionButton';
import { format } from './ui';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Crosshair, Hammer } from 'lucide-react';
import { TURRETS } from '@voidmarch/config';
import {
  canAfford,
  nextTurretLevel,
  turretStats,
  turretUpgradeReason,
} from '@voidmarch/game-rules';
import type { Building } from '@voidmarch/shared';
import { Cost, Miniature, BUILDING_FRAMES, Modal } from './ui';
import { send, useGame } from './store';

export function TurretControls({ building: b }: { building: Building }) {
  const [open, setOpen] = useState(false);
  const world = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  const mode = useGame((s) => s.mode);
  const current = turretStats(b),
    next = nextTurretLevel(b),
    upgrade = next && TURRETS[next];
  const reason = turretUpgradeReason(b, world.player.id, world.units);
  const enoughAP = world.player.unlimitedAP || world.player.ap >= 2;
  const affordable = upgrade && canAfford(world.player.wallet, upgrade.cost);
  return (
    <>
      {current && (
        <ActionButton
          shortcut="T"
          className={mode === 'attack' ? 'primary' : 'secondary'}
          disabled={pending || (!world.player.unlimitedAP && world.player.ap < 1)}
          onClick={() =>
            useGame.setState({ mode: mode === 'attack' ? 'inspect' : 'attack', combatTarget: null })
          }
          title={`Tir manuel, portée ${current.range} cases. Sélectionnez ensuite une cible ennemie.`}
        >
          <Crosshair size={15} />
          Tirer avec la tourelle · 1 PA
        </ActionButton>
      )}
      {upgrade && (
        <ActionButton shortcut="U" className="secondary" onClick={() => setOpen(true)}>
          <Hammer size={15} />
          {current ? 'Améliorer la tourelle' : 'Installer une tourelle'} · 2 PA
        </ActionButton>
      )}
      {open &&
        upgrade &&
        createPortal(
          <Modal
            title={
              current
                ? `Évoluer en ${upgrade.name.toLowerCase()}`
                : 'Installer une arbalète de rempart'
            }
            eyebrow="DÉFENSE DES REMPARTS"
            onClose={() => setOpen(false)}
          >
            <div className="upgrade-preview">
              <Miniature frame={BUILDING_FRAMES[b.kind]} size={128} turretLevel={next} />
              <h3>
                {upgrade.name} · niveau {next}/5
              </h3>
              <p>
                Arme fixe posée sur ce rempart. Tir à distance uniquement, sur votre ordre :{' '}
                <strong>1 PA par tir</strong>.
              </p>
              <ul>
                <li>
                  Attaque : {current ? `${format(current.attack)} → ` : ''}
                  {format(upgrade.attack)}.
                </li>
                <li>
                  Portée : {current ? `${current.range} → ` : ''}
                  {upgrade.range} cases, dans votre champ de vision.
                </li>
                {upgrade.antiAir > 0 && (
                  <li>Bonus contre les aéronefs : +{format(upgrade.antiAir)} dégâts.</li>
                )}
              </ul>
              <p>
                La tourelle partage les PV du rempart et disparaît s’il est détruit. Améliorer la
                tourelle ne répare pas le mur. Les unités alliées peuvent toujours traverser.
              </p>
              {!current && (
                <p>
                  Un paysan ou un ingénieur doit être sur le mur ou sur une case voisine pour
                  l’installation.
                </p>
              )}
              <p>
                Évolutions : arbalète sur bois → canon sur pierre → tourelle Tesla sur acier.
                Améliorez le mur séparément avant de renforcer son arme.
              </p>
              <h3>Coût · 2 PA</h3>
              <Cost cost={upgrade.cost} wallet={world.player.wallet} />
              {reason && <p className="form-error">{reason}</p>}
              {!enoughAP && <p className="form-error">2 PA nécessaires.</p>}
              {!affordable && (
                <p className="muted">Les ressources manquantes sont indiquées en rouge.</p>
              )}
              <div className="selection-actions">
                <button className="secondary" onClick={() => setOpen(false)}>
                  Annuler
                </button>
                {!reason && enoughAP && affordable && (
                  <button
                    className="primary"
                    disabled={pending}
                    onClick={() => {
                      setOpen(false);
                      void send({
                        type: current ? 'UPGRADE_TURRET' : 'INSTALL_TURRET',
                        actorId: b.id,
                        payload: {},
                      });
                    }}
                  >
                    {current ? 'Confirmer l’évolution' : 'Installer la tourelle'} · 2 PA
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
