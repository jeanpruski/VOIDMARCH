import { refreshEnclosures } from './engine.js';
import { RULES } from '@voidmarch/config';
import { transfer } from '@voidmarch/game-rules';
import type { GameState } from '@voidmarch/shared';
import type { Prisma } from '@prisma/client';

export function removeGuestRealm(s: GameState, id: string) {
  for (const [key, unit] of Object.entries(s.units)) if (unit.ownerId === id) delete s.units[key];
  for (const [key, building] of Object.entries(s.buildings))
    if (building.ownerId === id) delete s.buildings[key];
  for (const tile of Object.values(s.tiles)) {
    if (tile.ownerId === id) {
      delete tile.ownerId;
      delete tile.buildingId;
      delete tile.road;
      delete tile.roadOwnerId;
    }
    if (tile.roadOwnerId === id) {
      if (!tile.ownerId) delete tile.road;
      delete tile.roadOwnerId;
    }
    if (tile.capture?.by === id) delete tile.capture;
    if (tile.enclosureOwnerId === id) delete tile.enclosureOwnerId;
  }
  for (const realm of Object.values(s.realms))
    for (const tile of Object.values(realm.explored)) {
      if (tile.ownerId === id) {
        delete tile.ownerId;
        delete tile.building;
        delete tile.road;
        delete tile.roadOwnerId;
      }
      if (tile.roadOwnerId === id) {
        if (!tile.ownerId) delete tile.road;
        delete tile.roadOwnerId;
      }
      if (tile.capture?.by === id) delete tile.capture;
      if (tile.enclosureOwnerId === id) delete tile.enclosureOwnerId;
    }
  for (const [key, proposal] of Object.entries(s.proposals))
    if (proposal.from === id || proposal.to === id) delete s.proposals[key];
  for (const [key, treaty] of Object.entries(s.treaties))
    if (treaty.a === id || treaty.b === id) delete s.treaties[key];
  for (const [key, caravan] of Object.entries(s.caravans))
    if (caravan.ownerId === id || caravan.partnerId === id) {
      // Return a surviving player's cargo rather than discard it with the expired partner.
      if (caravan.ownerId !== id && s.realms[caravan.ownerId])
        transfer(s.realms[caravan.ownerId].wallet, caravan.cargo);
      delete s.caravans[key];
    }
  if (s.strategy) {
    for (const team of Object.values(s.strategy.alliances)) {
      team.members = team.members.filter((x) => x !== id);
      team.messages = team.messages.filter((x) => x.authorId !== id);
      team.markers = team.markers.filter((x) => x.authorId !== id);
      if (!team.members.length) delete s.strategy.alliances[team.id];
      else if (team.leaderId === id) team.leaderId = team.members[0];
    }
    for (const [key, invite] of Object.entries(s.strategy.invitations))
      if (invite.from === id || invite.to === id || !s.strategy.alliances[invite.allianceId])
        delete s.strategy.invitations[key];
    for (const [key, war] of Object.entries(s.strategy.wars))
      if (war.from === id || war.to === id) delete s.strategy.wars[key];
    for (const [key, strike] of Object.entries(s.strategy.strikes))
      if (strike.ownerId === id) delete s.strategy.strikes[key];
    for (const site of Object.values(s.strategy.sites))
      if (site.ownerId === id) site.ownerId = undefined;
    delete s.strategy.nuclearReadyAt[id];
  }
  delete s.archives[id];
  delete s.realms[id];
  refreshEnclosures(s, Date.now());
  // Claimed events stay claimed; account expiry must not regenerate rewards.
  s.revision++;
}

export async function expireGuests(
  s: GameState,
  tx: Prisma.TransactionClient,
  now: number,
  connected: Set<string>,
) {
  const cutoff = new Date(now - RULES.guestLifetime);
  // Lock candidates so conversion to a registered account cannot race with deletion.
  const candidates = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User" WHERE "passwordHash" IS NULL AND "lastLoginAt" <= ${cutoff} AND "createdAt" <= ${cutoff} FOR UPDATE`;
  const ids = candidates
    .map((u) => u.id)
    .filter((id) => !connected.has(id) && (s.realms[id]?.lastSeen ?? 0) <= cutoff.getTime());
  if (!ids.length) return;
  await tx.auditEvent.deleteMany({ where: { userId: { in: ids } } });
  await tx.user.deleteMany({ where: { id: { in: ids }, passwordHash: null } });
  for (const id of ids) removeGuestRealm(s, id);
}
