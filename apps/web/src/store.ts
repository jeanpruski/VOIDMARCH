import { create } from 'zustand';
import type { CameraViewport } from './map-geometry';
import { io, type Socket } from 'socket.io-client';
import type { Action } from '@voidmarch/protocol';
import type { ActionResult, AuthUser, Hex, WorldView } from '@voidmarch/shared';
import type { Settings } from '@voidmarch/config';
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
  user: AuthUser | null;
  token: string | null;
  world: WorldView | null;
  cameraViewport: CameraViewport | null;
  status: 'loading' | 'offline' | 'connecting' | 'online';
  selection: Selection | null;
  mode: 'inspect' | 'move' | 'attack';
  panel: Panel;
  toast: { text: string; error: boolean } | null;
  pending: boolean;
  now: number;
  hover: Hex | null;
  combatTarget: string | null;
  menuOpen: boolean;
  set: (patch: Partial<GameStore>) => void;
}
export const useGame = create<GameStore>((set) => ({
  user: null,
  token: null,
  world: null,
  cameraViewport: null,
  status: 'loading',
  selection: null,
  mode: 'inspect',
  panel: null,
  toast: null,
  pending: false,
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
  socket.on('world:snapshot', (world: WorldView) => {
    const previous = useGame.getState();
    const existing = previous.selection;
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
    useGame.setState({ world, status: 'online', now: world.serverTimestamp, selection });
  });
  socket.on('disconnect', () => useGame.setState({ status: 'connecting' }));
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
    useGame.setState({ pending: false });
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
  if (useGame.getState().pending || useGame.getState().status !== 'online') return;
  useGame.setState({ pending: true });
  const action = { ...command, actionId: crypto.randomUUID(), clientTimestamp: Date.now() };
  try {
    const result = (await socket!
      .timeout(12000)
      .emitWithAck('player:action', action)) as ActionResult;
    if (!result.accepted) notify(result.reason ?? 'Ordre refusé.', true);
    else {
      notify(result.message ?? 'Ordre exécuté.');
      window.dispatchEvent(new CustomEvent('vm:action', { detail: command }));
      useGame.setState({
        mode: 'inspect',
        combatTarget: null,
        ...(['BUILD', 'RECRUIT'].includes(command.type) ? { panel: null } : {}),
      });
    }
    return result;
  } catch {
    notify(
      'Réponse en attente. Reconnectez-vous pour vérifier l’ordre ; ne le répétez pas immédiatement.',
      true,
    );
  } finally {
    useGame.setState({ pending: false });
  }
}
export async function saveSettings(settings: Partial<Settings>) {
  try {
    await api('/settings', settings, 'PATCH');
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
  clearInterval(refreshTimer);
  clearInterval(heartbeat);
  sessionStorage.removeItem('voidmarch.session');
  useGame.setState({
    user: null,
    token: null,
    world: null,
    cameraViewport: null,
    status: 'offline',
    selection: null,
    panel: null,
  });
}
export function focusMap(p: Hex) {
  window.dispatchEvent(new CustomEvent('vm:camera', { detail: { ...p } }));
  useGame.setState({ panel: null, menuOpen: false });
}
export const mapCommand = (command: string) =>
  window.dispatchEvent(new CustomEvent('vm:camera', { detail: { command } }));
export function select(selection: Selection) {
  useGame.setState({ selection, mode: 'inspect' });
}
