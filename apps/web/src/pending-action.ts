import { RESOURCES } from '@voidmarch/config';
import type { Action } from '@voidmarch/protocol';
import type { Hex, WorldView } from '@voidmarch/shared';
import type { Prediction } from './optimistic-actions';

const labels: Record<Action['type'], string> = {
  ADVANCE_ERA: 'Passage à l’époque suivante',
  PRODUCE_MOBILITY: 'Production des réserves de déplacement',
  CONVERT_AP: 'Conversion des ressources en PA',
  EMBARK: 'Embarquement en cours',
  DISEMBARK: 'Débarquement en cours',
  OPERATION_CREATE: 'Préparation de l’opération',
  OPERATION_JOIN: 'Transmission de votre rôle',
  OPERATION_START: 'Lancement de l’opération',
  OPERATION_CANCEL: 'Annulation de l’opération',
  ARMY_SAVE: 'Enregistrement de l’armée',
  ARMY_DELETE: 'Mise à jour du registre',
  MOVE_GROUP: 'Déplacement du groupe en cours',
  MISSION_ACCEPT: 'Préparation de la campagne',
  MISSION_ABANDON: 'Abandon de la mission',
  PROJECT_CREATE: 'Ouverture du projet',
  PROJECT_CONTRIBUTE: 'Contribution au projet',
  PROJECT_CANCEL: 'Annulation du projet',
  ALLIANCE_CREATE: 'Création de l’alliance',
  ALLIANCE_INVITE: 'Envoi de l’invitation',
  ALLIANCE_RESPOND: 'Réponse à l’alliance',
  ALLIANCE_LEAVE: 'Départ de l’alliance',
  ALLIANCE_CHAT: 'Envoi du message',
  ALLIANCE_MARK: 'Partage du signal',
  ALLIANCE_UNMARK: 'Retrait du signal',
  DECLARE_WAR: 'Déclaration de guerre',
  SETTLE_WAR: 'Versement du tribut',
  CLAIM_SITE: 'Prise du site',
  CLEANUP: 'Décontamination',
  LAUNCH_NUKE: 'Lancement atomique',
  RENAME_UNIT: 'Renommage',
  BUILD: 'Construction en cours',
  RECRUIT: 'Formation en cours',
  ROAD: 'Route en travaux',
  REMOVE_ROAD: 'Retrait de la route',
  TERRAFORM: 'Terrassement en cours',
  UPGRADE: 'Amélioration en cours',
  INSTALL_TURRET: 'Installation de la tourelle',
  UPGRADE_TURRET: 'Amélioration de la tourelle',
  REPAIR: 'Réparation en cours',
  RESUPPLY: 'Préparation des provisions',
  DEMOLISH: 'Démolition en cours',
  MOVE: 'Déplacement en cours',
  MOVE_ROAD: 'Déplacement en cours',
  ATTACK: 'Attaque en cours',
  GATHER: 'Récolte en cours',
  CAPTURE: 'Capture en cours',
  INTERACT: 'Exploration en cours',
  ABILITY: 'Pouvoir en cours',
  PROPOSE: 'Envoi de la proposition',
  RESPOND: 'Réponse en cours',
  RESPAWN: 'Fondation en cours',
};
export interface PendingAction {
  actionId: string;
  label: string;
  style: 'construction' | 'recruit' | 'work' | 'order';
  position?: Hex;
  movingUnitId?: string;
}
export function pendingAction(
  action: Action,
  world: WorldView,
  prediction?: Prediction,
): PendingAction {
  const actor =
    world.units.find((u) => u.id === action.actorId) ??
    world.tiles.find((t) => t.building?.id === action.actorId)?.building;
  const recruit = prediction?.world.units.find((u) => u.id === `preview:${action.actionId}`);
  const site =
    'q' in action.payload ? action.payload : action.type === 'RECRUIT' ? (recruit ?? actor) : actor;
  return {
    actionId: action.actionId,
    label: labels[action.type],
    style:
      action.type === 'BUILD'
        ? 'construction'
        : action.type === 'RECRUIT'
          ? 'recruit'
          : [
                'ROAD',
                'REMOVE_ROAD',
                'TERRAFORM',
                'UPGRADE',
                'INSTALL_TURRET',
                'UPGRADE_TURRET',
                'REPAIR',
                'DEMOLISH',
              ].includes(action.type)
            ? 'work'
            : 'order',
    ...(site ? { position: { q: site.q, r: site.r } } : {}),
    ...(prediction?.movement ? { movingUnitId: action.actorId } : {}),
  };
}
/** Reserve costs immediately, but reveal finished entities and rewards only on confirmation.
 * Movement retains its responsive path animation while carrying the pending marker. */
export function pendingWorld(source: WorldView, prediction: Prediction): WorldView {
  const wallet = { ...source.player.wallet };
  for (const resource of RESOURCES)
    wallet[resource] = Math.min(wallet[resource], prediction.world.player.wallet[resource]);
  return {
    ...source,
    player: { ...source.player, ap: prediction.world.player.ap, wallet },
    units:
      prediction.movement || prediction.movements?.length ? prediction.world.units : source.units,
  };
}
