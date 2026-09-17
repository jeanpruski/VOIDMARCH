import { randomUUID } from 'node:crypto';
import { NPCS, NPC_RULES, RESOURCES, RULES, type NpcKind, type Wallet } from '@voidmarch/config';
import {
  chunkOf,
  disk,
  distance,
  hash,
  key,
  tileAt,
  transfer,
  refreshAP,
} from '@voidmarch/game-rules';
import type { GameState, Hex, Unit } from '@voidmarch/shared';

export function createNpc(s: GameState, position: Hex, kind: NpcKind, now: number): Unit {
  const profile = NPCS[kind],
    id = randomUUID();
  const roll = (salt: string) => hash(`${s.seed}:${id}:${salt}`);
  const maxHp = profile.hp + Math.floor(roll('hp') * 5) - 2;
  const reward: Partial<Wallet> = {};
  for (const [resource, amount] of Object.entries(profile.reward))
    reward[resource as keyof Wallet] = Math.round(amount * (0.8 + roll(resource) * 0.4));
  const npc: Unit = {
    id,
    ...position,
    ownerId: NPC_RULES.ownerId,
    kind: profile.kind,
    hp: maxHp,
    createdAt: now,
    updatedAt: now,
    npc: {
      kind,
      maxHp,
      attack: profile.attack + Math.floor(roll('atk') * 3) - 1,
      defense: Math.max(0, profile.defense + Math.floor(roll('def') * 3) - 1),
      reward,
      bonusAP: roll('ap') < NPC_RULES.apChance ? (roll('ap-amount') < 0.25 ? 2 : 1) : 0,
      expiresAt: now + NPC_RULES.lifetime,
      contributions: {},
    },
  };
  s.units[id] = npc;
  return npc;
}

export function tickNpcs(s: GameState, now: number, connected: Set<string>, random = hash) {
  for (const u of Object.values(s.units)) if (u.npc && u.npc.expiresAt <= now) delete s.units[u.id];
  const checks = (s.npcZoneChecks ??= {});
  for (const zone of Object.keys(checks)) if (checks[zone] < now - 86_400_000) delete checks[zone];
  const anchors = new Map<string, Hex>();
  for (const realm of Object.values(s.realms)) {
    if (realm.bot || realm.defeatedAt || !connected.has(realm.id)) continue;
    for (const p of [
      realm.capital,
      ...Object.values(s.units).filter((u) => u.ownerId === realm.id),
    ])
      if (!anchors.has(key(chunkOf(p)))) anchors.set(key(chunkOf(p)), p);
  }
  for (const [zone, anchor] of anchors) {
    if (checks[zone] !== undefined && now - checks[zone] < NPC_RULES.interval) continue;
    checks[zone] = now; // Never catch up missed rolls while everyone was offline.
    const npcs = Object.values(s.units).filter((u) => u.npc);
    if (
      npcs.length >= NPC_RULES.globalCap ||
      npcs.filter((u) => key(chunkOf(u)) === zone).length >= NPC_RULES.perZone
    )
      continue;
    const seed = `${s.seed}:npc:${zone}:${Math.floor(now / NPC_RULES.interval)}`;
    if (random(seed) >= NPC_RULES.chance) continue;
    const places = disk(anchor, 12).filter((p) => {
      const t = tileAt(s, p);
      return (
        key(chunkOf(p)) === zone &&
        distance(p, anchor) >= 4 &&
        !t.ownerId &&
        !t.buildingId &&
        !t.road &&
        !t.poi &&
        ['PLAIN', 'FOREST', 'HILL'].includes(t.terrain) &&
        Object.values(s.realms).every((r) => r.defeatedAt || distance(r.capital, p) >= 6) &&
        Object.values(s.units).every((u) => distance(u, p) >= (u.npc ? 5 : 2)) &&
        Object.values(s.events).every((e) => e.claimedBy || e.endsAt <= now || distance(e, p) > 1)
      );
    });
    if (!places.length) continue;
    const kinds = Object.keys(NPCS) as NpcKind[];
    createNpc(
      s,
      places[Math.floor(random(seed + ':position') * places.length)],
      kinds[Math.floor(random(seed + ':kind') * kinds.length)],
      now,
    );
  }
}

/** Largest-remainder sharing: no last-hit theft, no resource duplication from rounding. */
export function npcRewards(s: GameState, npc: Unit, now: number) {
  const contributors = Object.entries(npc.npc!.contributions)
    .filter(([id, damage]) => damage > 0 && s.realms[id] && !s.realms[id].defeatedAt)
    .sort(([a], [b]) => a.localeCompare(b));
  const total = contributors.reduce((sum, [, damage]) => sum + damage, 0);
  const rewards = contributors.map(([realmId]) => ({
    realmId,
    resources: {} as Partial<Wallet>,
    ap: 0,
  }));
  if (!total) return rewards;
  const distribute = (amount: number) => {
    const shares = contributors.map(([, damage], i) => ({
      i,
      exact: (amount * damage) / total,
      value: Math.floor((amount * damage) / total),
    }));
    let left = amount - shares.reduce((sum, x) => sum + x.value, 0);
    for (const x of [...shares].sort(
      (a, b) => b.exact - b.value - (a.exact - a.value) || a.i - b.i,
    ))
      if (left-- > 0) x.value++;
    return shares.map((x) => x.value);
  };
  for (const resource of RESOURCES) {
    const shares = distribute(npc.npc!.reward[resource] ?? 0);
    rewards.forEach((r, i) => {
      if (shares[i]) r.resources[resource] = shares[i];
    });
  }
  const apShares = distribute(npc.npc!.bonusAP);
  for (const [i, reward] of rewards.entries()) {
    const realm = s.realms[reward.realmId];
    transfer(realm.wallet, reward.resources);
    refreshAP(realm, now);
    reward.ap = Math.min(apShares[i], Math.max(0, RULES.maxAP - realm.ap));
    realm.ap += reward.ap;
  }
  return rewards;
}
