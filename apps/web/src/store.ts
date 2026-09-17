import { create } from 'zustand';
import { supportsWorldCatalog } from './catalog-compatibility';
import type { CameraViewport } from './map-geometry';
import { io, type Socket } from 'socket.io-client';
import type { Action } from '@voidmarch/protocol';
import type { ActionResult, AuthUser, Hex, WorldView } from '@voidmarch/shared';
import type { WorldEffect } from './world-effects';
import type { Settings } from '@voidmarch/config';
import { UNIT_PROFILES, isWall } from '@voidmarch/config';
import { turretStats, resolveAttack } from '@voidmarch/game-rules';
import { predictAction, type Prediction } from './optimistic-actions';
import { pendingAction, pendingWorld, type PendingAction } from './pending-action';
import { animateMovement, type MovementAnimation } from './movement-animation';
export type Command = Action extends infer A
  ? A extends Action
    ? Omit<A, 'actionId' | 'clientTimestamp'>
    : never
  : never;
export type Panel =
  | 'realm'
  | 'army'
  | 'cities'
  | 'economy'
  | 'trade'
  | 'journal'
  | 'events'
  | 'rank'
  | 'settings'
  | 'profile'
  | 'help'
  | 'build'
  | 'recruit'
  | null;
export interface Selection extends Hex {
  kind: 'unit' | 'building' | 'tile';
  id?: string;
}
interface GameStore {
  clientUpdateRequired: boolean;
  user: AuthUser | null;
  token: string | null;
  world: WorldView | null;
  cameraViewport: CameraViewport | null;
  status: 'loading' | 'offline' | 'connecting' | 'online';
  selection: Selection | null;
  mode: 'inspect' | 'move' | 'attack' | 'road' | 'terraform';
  roadTool: 'build' | 'remove';
  terraformTarget?: Hex;
  panel: Panel;
  toast: { text: string; error: boolean } | null;
  pending: boolean;
  pendingSince: number;
  pendingAction?: PendingAction;
  actionEffect?: WorldEffect & { actionId: string };
  effectPolicy: 'normal' | 'confirmed' | 'none';
  movements: Record<string, MovementAnimation>;
  pendingMovement: { unitId: string; from: Hex } | null;
  now: number;
  hover: Hex | null;
  combatTarget: string | null;
  menuOpen: boolean;
  set: (patch: Partial<GameStore>) => void;
}
export const useGame = create<GameStore>((set) => ({
  clientUpdateRequired: false,
  user: null,
  token: null,
  world: null,
  cameraViewport: null,
  status: 'loading',
  selection: null,
  mode: 'inspect',
  roadTool: 'build',
  panel: null,
  toast: null,
  pending: false,
  pendingSince: 0,
  effectPolicy: 'normal',
  movements: {},
  pendingMovement: null,
  now: Date.now(),
  hover: null,
  combatTarget: null,
  menuOpen: false,
  set: (patch) => set(patch),
}));
let socket: Socket | undefined,
  toastTimeout: ReturnType<typeof setTimeout>,
  refreshTimer: ReturnType<typeof setInterval>,
  heartbeat: ReturnType<typeof setInterval>;
export const notify = (text: string, error = false) => {
  clearTimeout(toastTimeout);
  useGame.setState({ toast: { text, error } });
  toastTimeout = setTimeout(() => useGame.setState({ toast: null }), 6000);
};
export async function api<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const token = useGame.getState().token;
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Le serveur est indisponible.');
  return data;
}
export function acceptSession(data: { token: string; user: AuthUser }) {
  if (activeOrder) finishOrder(activeOrder, false);
  if (authoritativeWorld?.player.id !== data.user.id) authoritativeWorld = null;
  sessionStorage.setItem('voidmarch.session', JSON.stringify(data));
  useGame.setState({ ...data, status: 'connecting' });
  connect();
}
export async function bootstrap() {
  try {
    const stored = sessionStorage.getItem('voidmarch.session');
    if (stored) {
      const data = JSON.parse(stored);
      const claims = JSON.parse(atob(data.token.split('.')[1]));
      if (claims.exp * 1000 > Date.now() + 30000) {
        acceptSession(data);
        return;
      }
    }
    acceptSession(await api('/auth/refresh'));
  } catch {
    useGame.setState({ status: 'offline', user: null, token: null });
  }
}

let authoritativeWorld: WorldView | null = null;
interface PendingOrder {
  action: Action;
  prediction?: Prediction;
  receipt?: ActionResult;
  closedPanel: Panel;
}
let activeOrder: PendingOrder | undefined;
let syncTimer: ReturnType<typeof setTimeout> | undefined;
function publishWorld(world: WorldView, effectPolicy: GameStore['effectPolicy'] = 'normal') {
  const previous = useGame.getState();
  let existing = previous.selection;
  if (existing?.id?.startsWith('preview:')) {
    const provisional =
      existing.kind === 'unit'
        ? previous.world?.units.find((u) => u.id === existing!.id)
        : previous.world?.tiles.find((t) => t.building?.id === existing!.id)?.building;
    const entities =
      existing.kind === 'unit'
        ? world.units
        : world.tiles.flatMap((t) => (t.building ? [t.building] : []));
    const actual =
      provisional &&
      entities.find(
        (item) =>
          item.kind === provisional.kind &&
          item.ownerId === provisional.ownerId &&
          item.q === provisional.q &&
          item.r === provisional.r,
      );
    if (actual) existing = { ...existing, id: actual.id, q: actual.q, r: actual.r };
  }
  const selection =
    existing &&
    (existing.kind === 'tile' ||
      world.units.some((u) => u.id === existing.id) ||
      world.tiles.some((t) => t.building?.id === existing.id))
      ? existing
      : (() => {
          const unit =
            world.units.find((u) => u.ownerId === world.player.id && u.kind === 'PEASANT') ??
            world.units.find((u) => u.ownerId === world.player.id);
          if (unit) return { kind: 'unit' as const, id: unit.id, q: unit.q, r: unit.r };
          const building = world.tiles.find(
            (t) =>
              t.building?.ownerId === world.player.id &&
              t.q === world.player.capital.q &&
              t.r === world.player.capital.r,
          )?.building;
          return building
            ? { kind: 'building' as const, id: building.id, q: building.q, r: building.r }
            : null;
        })();
  const movements = Object.fromEntries(
    Object.entries(previous.movements).filter(([id, animation]) => {
      const unit = world.units.find((u) => u.id === id);
      if (!unit || world.player.settings.reducedMotion) return false;
      if (previous.pendingMovement?.unitId === id) return true;
      if (world.revision < animation.revision) return true;
      return (
        unit.q === animation.destination.q &&
        unit.r === animation.destination.r &&
        Date.now() < animation.startedAt + animation.duration
      );
    }),
  );
  useGame.setState({
    world,
    status: 'online',
    now: world.serverTimestamp,
    selection,
    movements,
    effectPolicy,
  });
}
function rememberWorld(world: WorldView) {
  if (
    authoritativeWorld &&
    authoritativeWorld.player.id === world.player.id &&
    (world.revision < authoritativeWorld.revision ||
      (world.revision === authoritativeWorld.revision &&
        world.serverTimestamp < authoritativeWorld.serverTimestamp))
  )
    return false;
  authoritativeWorld = world;
  return true;
}
function finishOrder(order: PendingOrder, accepted: boolean) {
  if (activeOrder !== order) return;
  clearTimeout(syncTimer);
  activeOrder = undefined;
  const state = useGame.getState();
  const movements = { ...state.movements };
  if (!accepted && order.prediction?.movement) delete movements[order.prediction.movement.unitId];
  useGame.setState({
    pending: false,
    pendingAction: undefined,
    pendingMovement: null,
    movements,
    ...(!accepted && state.actionEffect?.actionId === order.action.actionId
      ? { actionEffect: undefined }
      : {}),
  });
  if (authoritativeWorld)
    publishWorld(
      authoritativeWorld,
      accepted
        ? order.prediction?.movement || order.action.type === 'ATTACK'
          ? 'confirmed'
          : 'normal'
        : 'none',
    );
  if (!accepted && order.closedPanel && !useGame.getState().panel)
    useGame.setState({ panel: order.closedPanel });
}
function receiveWorld(world: WorldView) {
  if (!supportsWorldCatalog(world)) {
    useGame.setState({ clientUpdateRequired: true });
    return;
  }
  if (useGame.getState().clientUpdateRequired) return;
  if (!rememberWorld(world)) return;
  if (activeOrder) {
    // Buffer snapshots until their action receipt identifies the committed revision.
    // Otherwise an unrelated tick could erase the prediction or spend the cost twice.
    const receipt = activeOrder.receipt;
    if (receipt?.accepted && receipt.revision !== undefined && world.revision >= receipt.revision)
      finishOrder(activeOrder, true);
    return;
  }
  publishWorld(world);
}
function resynchronize() {
  if (activeOrder) finishOrder(activeOrder, false);
  useGame.setState({ status: 'connecting', pending: false, movements: {}, pendingMovement: null });
  socket?.emit('world:sync');
}

function connect() {
  socket?.disconnect();
  clearInterval(refreshTimer);
  clearInterval(heartbeat);
  socket = io({
    auth: { token: useGame.getState().token },
    transports: ['polling', 'websocket'],
    reconnection: true,
  });
  socket.on('connect', () => {
    useGame.setState({ status: 'connecting' });
    socket?.emit('world:join');
  });
  socket.on('world:snapshot', receiveWorld);
  socket.on('disconnect', () => resynchronize());
  socket.on('connect_error', (error: Error) => {
    useGame.setState({ status: 'connecting' });
    notify(
      error.message === 'Session expirée.'
        ? 'Votre session se reconnecte…'
        : 'Connexion au monde interrompue. Nouvelle tentative…',
      true,
    );
  });
  socket.on('server:error', (data: { message: string }) => {
    resynchronize();
    notify(data.message, true);
  });
  heartbeat = setInterval(() => socket?.emit('player:ping'), 25000);
  refreshTimer = setInterval(async () => {
    try {
      acceptSession(await api('/auth/refresh'));
    } catch {
      notify('La session a expiré. Votre royaume est sauvegardé.', true);
      socket?.disconnect();
      sessionStorage.removeItem('voidmarch.session');
      useGame.setState({ status: 'offline', user: null, token: null, world: null });
    }
  }, 8 * 60000);
}
export function subscribe(chunks: Hex[]) {
  socket?.emit('chunks:subscribe', { chunks });
}
export async function send(command: Command) {
  const state = useGame.getState();
  if (state.pending || activeOrder || state.status !== 'online' || !state.world || !socket) return;
  // Provisional entities cannot issue orders until their real server ID arrives.
  if (command.actorId.startsWith('preview:')) return;
  const action: Action = { ...command, actionId: crypto.randomUUID(), clientTimestamp: Date.now() };
  const prediction = predictAction(state.world, action);
  authoritativeWorld ??= state.world;
  const closePanel = prediction && ['BUILD', 'RECRUIT'].includes(command.type);
  const order: PendingOrder = { action, prediction, closedPanel: closePanel ? state.panel : null };
  activeOrder = order;
  const movement = prediction?.movement;
  const intendedTarget =
    command.type === 'ATTACK'
      ? (state.world.units.find((u) => u.id === command.payload.targetId) ??
        state.world.tiles.find((t) => t.building?.id === command.payload.targetId)?.building)
      : undefined;
  const attacker = intendedTarget
    ? (state.world.units.find((u) => u.id === command.actorId) ??
      state.world.tiles.find((t) => t.building?.id === command.actorId)?.building)
    : undefined;
  const resolved =
    attacker && intendedTarget
      ? resolveAttack(
          attacker,
          intendedTarget,
          state.world.tiles.flatMap((t) => (t.building ? [t.building] : [])),
        )
      : undefined;
  const attackTarget = resolved && !resolved.reason ? resolved.target : undefined;
  useGame.setState({
    pending: true,
    pendingSince: Date.now(),
    toast: null,
    pendingAction: pendingAction(action, state.world, prediction),
    effectPolicy: 'none',
    ...(attackTarget
      ? {
          actionEffect: {
            q: attackTarget.q,
            r: attackTarget.r,
            kind: 'combat' as const,
            actionId: action.actionId,
            ...(attacker
              ? {
                  shot: {
                    from: { q: attacker.q, r: attacker.r },
                    unitKind:
                      'population' in attacker
                        ? (turretStats(attacker)?.projectileUnit ?? 'CROSSBOW')
                        : attacker.kind,
                    ...('population' in attacker && isWall(attacker.kind)
                      ? { wallKind: attacker.kind }
                      : {}),
                    targetAirborne:
                      !('population' in attackTarget) && !!UNIT_PROFILES[attackTarget.kind].flying,
                  },
                }
              : {}),
          },
          combatTarget: null,
        }
      : {}),
    ...(prediction
      ? {
          world: pendingWorld(state.world, prediction),
          mode: state.mode === 'road' ? 'road' : 'inspect',
          combatTarget: null,
          terraformTarget: undefined,
        }
      : {}),
    ...(closePanel ? { panel: null } : {}),
    pendingMovement: movement ? { unitId: movement.unitId, from: movement.from } : null,
    ...(movement && !state.world.player.settings.reducedMotion
      ? {
          movements: {
            ...state.movements,
            [movement.unitId]: animateMovement(
              movement,
              action.actionId,
              state.world.revision + 1,
              Date.now(),
              state.movements[movement.unitId],
            ),
          },
        }
      : {}),
  });
  try {
    const result = (await socket
      .timeout(12000)
      .emitWithAck('player:action', action)) as ActionResult;
    // A disconnect, logout or resync may have invalidated this in-flight request.
    if (activeOrder !== order) return;
    if (!result.accepted) {
      finishOrder(order, false);
      notify(result.reason ?? 'Ordre refusé.', true);
    } else {
      order.receipt = result;
      const current = useGame.getState();
      if (result.movement?.path.length && !current.world?.player.settings.reducedMotion) {
        const samePrediction =
          movement && JSON.stringify(movement) === JSON.stringify(result.movement);
        const existing = current.movements[result.movement.unitId];
        useGame.setState({
          movements: {
            ...current.movements,
            [result.movement.unitId]:
              samePrediction && existing
                ? { ...existing, revision: result.revision ?? existing.revision }
                : animateMovement(
                    result.movement,
                    result.actionId,
                    result.revision ?? 0,
                    Date.now(),
                    movement ? undefined : existing,
                  ),
          },
        });
      }
      notify(result.message ?? 'Ordre exécuté.');
      window.dispatchEvent(new CustomEvent('vm:action', { detail: command }));
      useGame.setState({
        mode:
          ['ROAD', 'REMOVE_ROAD'].includes(command.type) && current.mode === 'road'
            ? 'road'
            : 'inspect',
        combatTarget: null,
        ...(['BUILD', 'RECRUIT'].includes(command.type) ? { panel: null } : {}),
      });
      if (
        authoritativeWorld &&
        result.revision !== undefined &&
        authoritativeWorld.revision >= result.revision
      )
        finishOrder(order, true);
      else {
        socket.emit('world:sync');
        syncTimer = setTimeout(() => {
          if (activeOrder === order) {
            resynchronize();
            notify('Actualisation du monde en cours…', true);
          }
        }, 8000);
      }
    }
    return result;
  } catch {
    if (activeOrder !== order) return;
    resynchronize();
    notify('Connexion ralentie : vérification de l’ordre en cours…', true);
  }
}
export async function saveSettings(settings: Partial<Settings>) {
  const playerId = useGame.getState().world?.player.id;
  try {
    await api('/settings', settings, 'PATCH');
    // The HTTP acknowledgement is sufficient; do not wait for a socket snapshot.
    const world = useGame.getState().world;
    if (world && world.player.id === playerId) {
      if (authoritativeWorld?.player.id === playerId)
        authoritativeWorld = {
          ...authoritativeWorld,
          player: {
            ...authoritativeWorld.player,
            settings: { ...authoritativeWorld.player.settings, ...settings },
          },
        };
      useGame.setState({
        world: {
          ...world,
          player: { ...world.player, settings: { ...world.player.settings, ...settings } },
        },
      });
    }
    notify('Préférences sauvegardées.');
  } catch (e) {
    notify((e as Error).message, true);
  }
}
export async function logout() {
  try {
    await api('/auth/logout');
  } catch (e) {
    notify((e as Error).message, true);
    return;
  }
  socket?.disconnect();
  if (activeOrder) finishOrder(activeOrder, false);
  authoritativeWorld = null;
  clearTimeout(syncTimer);
  clearInterval(refreshTimer);
  clearInterval(heartbeat);
  sessionStorage.removeItem('voidmarch.session');
  useGame.setState({
    user: null,
    token: null,
    world: null,
    cameraViewport: null,
    movements: {},
    pendingMovement: null,
    status: 'offline',
    selection: null,
    panel: null,
  });
}
export function focusMap(p: Hex, abovePanel = false) {
  window.dispatchEvent(new CustomEvent('vm:camera', { detail: { ...p, abovePanel } }));
  useGame.setState({ panel: null, menuOpen: false });
}
export function focusHero() {
  const { world } = useGame.getState();
  if (!world) return;
  const hero = world.units.find((u) => u.ownerId === world.player.id && u.kind === 'HERO');
  if (!hero) {
    useGame.setState({ panel: 'realm', menuOpen: false, mode: 'inspect', combatTarget: null });
    const remaining = Math.ceil(((world.player.hero?.recoverAt ?? 0) - Date.now()) / 1000);
    notify(
      world.player.defeatedAt
        ? 'Reconstruisez votre royaume pour retrouver votre héros.'
        : remaining > 0
          ? `Votre héros revient dans ${remaining} s.`
          : 'Votre héros attend une case libre et praticable à 4 hexagones maximum de la capitale.',
    );
    return;
  }
  focusMap(hero, true);
  useGame.setState({
    selection: { kind: 'unit', id: hero.id, q: hero.q, r: hero.r },
    mode: 'inspect',
    combatTarget: null,
    terraformTarget: undefined,
  });
}
export const mapCommand = (command: string) =>
  window.dispatchEvent(new CustomEvent('vm:camera', { detail: { command } }));
export function select(selection: Selection) {
  useGame.setState({ selection, mode: 'inspect' });
}

export function openRoadTool(tool: 'build' | 'remove' = 'build') {
  useGame.setState({
    mode: 'road',
    roadTool: tool,
    panel: null,
    combatTarget: null,
    menuOpen: false,
  });
}
