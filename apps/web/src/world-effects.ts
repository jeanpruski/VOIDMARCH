import type { CombatShot, Hex, WorldView } from '@voidmarch/shared';
import { key } from '@voidmarch/game-rules';
export type WorldEffect = Hex & {
  shot?: CombatShot;
  actionId?: string;
  kind: 'combat' | 'build' | 'demolish' | 'repair' | 'recruit' | 'rare';
};
/** Compare authoritative visible snapshots. Never replay effects on connection or reveal. */
export function worldEffects(before: WorldView, after: WorldView): WorldEffect[] {
  if (
    before.player.id !== after.player.id ||
    after.serverTimestamp - before.serverTimestamp > 15000
  )
    return [];
  const result: WorldEffect[] = [];
  const oldTiles = new Map(before.tiles.map((t) => [key(t), t]));
  const newTiles = new Map(after.tiles.map((t) => [key(t), t]));
  const visible = (p: Hex) =>
    oldTiles.get(key(p))?.visibility === 'VISIBLE' &&
    newTiles.get(key(p))?.visibility === 'VISIBLE';
  for (const t of after.tiles) {
    if (!visible(t)) continue;
    const old = oldTiles.get(key(t));
    if (old?.building && !t.building) result.push({ ...t, kind: 'demolish' });
    if (
      t.building &&
      (!old?.building ||
        old.building.id !== t.building.id ||
        old.building.kind !== t.building.kind ||
        old.building.level !== t.building.level ||
        old.building.turretLevel !== t.building.turretLevel)
    )
      result.push({ ...t, kind: 'build' });
    else if (t.building && old?.building) {
      if (t.building.hp < old.building.hp) result.push({ ...t, kind: 'combat' });
      if (t.building.hp > old.building.hp) result.push({ ...t, kind: 'repair' });
    }
    if (old?.terrain && old.terrain !== t.terrain && t.terrain === 'PLAIN')
      result.push({ ...t, kind: 'build' });
    if (t.road && !old?.road) result.push({ ...t, kind: 'build' });
    if (old?.road && !t.road) result.push({ ...t, kind: 'demolish' });
  }
  const oldUnits = new Map(before.units.map((u) => [u.id, u]));
  for (const u of after.units) {
    if (!visible(u)) continue;
    const old = oldUnits.get(u.id);
    if (!old && u.createdAt >= before.serverTimestamp)
      result.push({ ...u, kind: u.rareBonus ? 'rare' : 'recruit' });
    else if (old) {
      if (u.hp < old.hp) result.push({ ...u, kind: 'combat' });
      if (u.hp > old.hp) result.push({ ...u, kind: 'repair' });
    }
  }
  // A destroyed target no longer exists in the snapshot; its visible combat report supplies the position.
  const knownReports = new Set(before.journal.map((j) => j.id));
  for (const entry of after.journal) {
    if (
      entry.kind === 'COMBAT' &&
      !knownReports.has(entry.id) &&
      entry.q !== undefined &&
      entry.r !== undefined &&
      entry.at >= before.serverTimestamp &&
      visible({ q: entry.q, r: entry.r })
    )
      result.push({
        q: entry.q,
        r: entry.r,
        kind: 'combat',
        ...(entry.shot && visible(entry.shot.from) ? { shot: entry.shot } : {}),
      });
  }
  return [
    ...new Map(result.map((effect) => [`${effect.kind}:${key(effect)}`, effect])).values(),
  ].slice(0, 24);
}
