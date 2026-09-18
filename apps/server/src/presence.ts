import type { WorldView } from '@voidmarch/shared';

/** Socket presence is separate from the economy's disconnection grace period. */
export class PlayerPresence {
  private sessions = new Map<string, { since: number; sockets: Set<string> }>();

  join(playerId: string, socketId: string, now: number) {
    const session = this.sessions.get(playerId) ?? { since: now, sockets: new Set<string>() };
    session.sockets.add(socketId);
    this.sessions.set(playerId, session);
  }

  leave(playerId: string, socketId: string) {
    const session = this.sessions.get(playerId);
    session?.sockets.delete(socketId);
    if (!session?.sockets.size) this.sessions.delete(playerId);
  }

  connected() {
    return new Set(this.sessions.keys());
  }

  decorate(view: WorldView): WorldView {
    const realms = view.realms.map((realm) =>
      realm.bot
        ? realm
        : {
            ...realm,
            online: this.sessions.has(realm.id),
            connectedSince: this.sessions.get(realm.id)?.since,
          },
    );
    return { ...view, realms, onlineHumans: realms.filter((r) => !r.bot && r.online).length };
  }
}
