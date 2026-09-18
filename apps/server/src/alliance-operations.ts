import { randomUUID } from 'node:crypto';
import { UNIT_PROFILES } from '@voidmarch/config';
import { distance, key, tileAt, vision, unitStats } from '@voidmarch/game-rules';
import type { Action } from '@voidmarch/protocol';
import type { AllianceOperation, GameState } from '@voidmarch/shared';
import { requireRule, log } from './engine';
import { activeMissions, missionAttackReason } from './missions';
const live = (op: AllianceOperation) => op.status === 'PLANNING' || op.status === 'ACTIVE';
export function operationAction(
  s: GameState,
  id: string,
  a: Action,
  now: number,
): string | undefined {
  if (
    !['OPERATION_CREATE', 'OPERATION_JOIN', 'OPERATION_START', 'OPERATION_CANCEL'].includes(a.type)
  )
    return;
  requireRule(a.actorId === id, 'Cette opération doit appartenir à votre royaume.');
  const team = Object.values(s.strategy?.alliances ?? {}).find((t) => t.members.includes(id));
  requireRule(team, 'Rejoignez une alliance pour préparer une opération.');
  const operations = (team.operations ??= []);
  if (a.type === 'OPERATION_CREATE') {
    requireRule(
      operations.filter(live).length < 3,
      'Trois opérations maximum peuvent être préparées ou actives.',
    );
    const p = a.payload,
      r = s.realms[id],
      visible = vision(s, r);
    requireRule(
      visible.has(key(p)) || r.explored[key(p)]?.terrain,
      'Explorez cette position avant de préparer une opération.',
    );
    const tile = tileAt(s, p),
      target = s.buildings[tile.buildingId ?? ''];
    if (p.objective === 'SIEGE') {
      requireRule(
        visible.has(key(p)) && target && target.hp > 0 && !team.members.includes(target.ownerId),
        'Choisissez un bâtiment adverse actuellement visible.',
      );
      requireRule(
        !missionAttackReason(s, id, target.ownerId),
        'Cette forteresse est réservée à une autre expédition.',
      );
    }
    const op: AllianceOperation = {
      id: randomUUID(),
      title: p.title,
      authorId: id,
      q: p.q,
      r: p.r,
      objective: p.objective,
      status: 'PLANNING',
      createdAt: now,
      endsAt: now + 48 * 3600000,
      holdDuration: p.holdMinutes * 60000,
      heldMs: 0,
      holding: false,
      progress: 0,
      checkedAt: now,
      participants: [{ realmId: id, role: 'ASSAULT', ready: false }],
      ...(p.objective === 'SIEGE' && target
        ? { targetId: target.id, targetOwnerId: target.ownerId, initialHp: target.hp }
        : {}),
    };
    team.operations = [
      ...operations.filter(live),
      ...operations.filter((o) => !live(o)).slice(-26),
      op,
    ];
    log(s, `${r.name} prépare l’opération « ${op.title} ».`, 'DIPLOMACY', now, team.members, op);
    return 'Opération partagée avec votre alliance · 0 PA.';
  }
  if (a.type !== 'OPERATION_JOIN' && a.type !== 'OPERATION_START' && a.type !== 'OPERATION_CANCEL')
    return;
  const op = operations.find((o) => o.id === a.payload.operationId);
  requireRule(op && live(op) && op.endsAt > now, 'Cette opération est terminée ou introuvable.');
  if (a.type === 'OPERATION_JOIN') {
    const previous = op.participants.find((p) => p.realmId === id);
    const participation = { realmId: id, role: a.payload.role, ready: a.payload.ready };
    if (previous) Object.assign(previous, participation);
    else op.participants.push(participation);
    return 'Votre rôle et votre disponibilité ont été partagés · 0 PA.';
  }
  requireRule(
    op.authorId === id || team.leaderId === id,
    'Seuls le coordinateur et le chef de l’alliance peuvent donner cet ordre.',
  );
  if (a.type === 'OPERATION_CANCEL') {
    op.status = 'CANCELLED';
    op.completedAt = now;
    op.holding = false;
    log(s, `Opération « ${op.title} » annulée.`, 'DIPLOMACY', now, team.members, op);
    return 'Opération annulée. Les troupes restent sous le contrôle de leurs joueurs.';
  }
  requireRule(op.status === 'PLANNING', 'Cette opération est déjà en cours.');
  op.status = 'ACTIVE';
  op.startedAt = now;
  op.checkedAt = now;
  log(s, `L’opération « ${op.title} » commence.`, 'DIPLOMACY', now, team.members, op);
  return 'Opération lancée. Les règles de combat et les trêves restent applicables · 0 PA.';
}

export function tickAllianceOperations(s: GameState, now: number) {
  for (const team of Object.values(s.strategy?.alliances ?? {})) {
    const active = (team.operations ?? []).filter(live);
    if (!active.length) continue;
    const members = team.members.filter((id) => s.realms[id] && !s.realms[id].defeatedAt);
    let visible: Set<string> | undefined;
    const seen = (op: AllianceOperation) => {
      visible ??= new Set(members.flatMap((id) => [...vision(s, s.realms[id])]));
      return visible.has(key(op));
    };
    for (const op of active) {
      op.participants = op.participants.filter((p) => members.includes(p.realmId));
      if (op.endsAt <= now) {
        op.status = 'EXPIRED';
        op.completedAt = now;
        op.holding = false;
        continue;
      }
      if (op.status !== 'ACTIVE') continue;
      const tile = tileAt(s, op),
        controlled = !!tile.ownerId && members.includes(tile.ownerId);
      const armed = Object.values(s.units).filter((u) => u.hp > 0 && unitStats(u).attack > 0);
      const occupied = armed.some(
        (u) => key(u) === key(op) && members.includes(u.ownerId) && !UNIT_PROFILES[u.kind].flying,
      );
      const contested = armed.some((u) => !members.includes(u.ownerId) && distance(u, op) <= 1);
      if (op.objective === 'CAPTURE') op.progress = controlled ? 1 : 0;
      else if (op.objective === 'HOLD') {
        const holding = controlled && occupied && !contested;
        if (!holding) op.heldMs = 0;
        else if (op.holding) op.heldMs += Math.max(0, now - op.checkedAt);
        op.holding = holding;
        op.progress = Math.min(1, op.heldMs / op.holdDuration);
      } else if (seen(op)) {
        const target = s.buildings[op.targetId ?? ''];
        if (
          !target &&
          op.targetOwnerId?.startsWith('mission:') &&
          !activeMissions(s).some((m) => m.ownerId === op.targetOwnerId) &&
          !Object.values(s.missions ?? {}).some((board) =>
            board.trophies?.some((t) => `mission:${t.id}` === op.targetOwnerId),
          )
        ) {
          op.status = 'FAILED';
          op.completedAt = now;
        } else
          op.progress =
            !target || members.includes(target.ownerId)
              ? 1
              : Math.max(0, Math.min(0.99, 1 - target.hp / Math.max(1, op.initialHp ?? target.hp)));
      }
      op.checkedAt = now;
      if (op.status === 'ACTIVE' && op.progress >= 1) {
        op.status = 'WON';
        op.completedAt = now;
        op.holding = false;
        log(
          s,
          `Objectif d’alliance accompli : « ${op.title} ».`,
          'DIPLOMACY',
          now,
          team.members,
          op,
        );
      }
    }
  }
}
