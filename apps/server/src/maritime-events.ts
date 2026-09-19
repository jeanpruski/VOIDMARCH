import { randomUUID } from 'node:crypto';
import { UNIT_PROFILES, isSea } from '@voidmarch/config';
import { disk, distance, hash, key, tileAt } from '@voidmarch/game-rules';
import type { GameState, WorldEvent } from '@voidmarch/shared';
const encounters: Pick<WorldEvent, 'kind' | 'title' | 'description' | 'reward' | 'relic'>[] = [
  {
    kind: 'SHIPWRECK',
    title: 'L’épave des serments',
    description:
      'Une coque brisée dérive dans la brume. Approchez un navire pour récupérer sa cargaison.',
    reward: { GOLD: 300, WOOD: 240, IRON: 100 },
  },
  {
    kind: 'SEA_OBELISK',
    title: 'L’obélisque englouti',
    description:
      'Une lueur ancienne pulse sous les vagues. Une expédition navale peut en rapporter un fragment.',
    reward: { GOLD: 400, IRON: 160 },
    relic: 'Fragment des marées noires',
  },
  {
    kind: 'DRIFTING_CARGO',
    title: 'La cargaison à la dérive',
    description: 'Des caisses encore scellées flottent autour d’un canot abandonné.',
    reward: { FOOD: 600, WOOD: 200, GOLD: 150 },
  },
  {
    kind: 'SUB_WRECK',
    title: 'Le secret du bathyscaphe',
    description: 'Le cœur d’un submersible oublié brille encore sous l’eau.',
    reward: { IRON: 500, GOLD: 250 },
    relic: 'Sceau du bathyscaphe',
  },
];
export function tickMaritimeEvents(s: GameState, now: number, connected: Set<string>) {
  if (!s.oceanVersion) return;
  for (const event of Object.values(s.events))
    if (event.endsAt <= now && encounters.some((x) => x.kind === event.kind))
      delete s.events[event.id];
  const checks = (s.navalEventChecks ??= {});
  for (const k of Object.keys(checks)) if (checks[k] < now - 86400000) delete checks[k];
  const ships = Object.values(s.units).filter(
    (u) => connected.has(u.ownerId) && UNIT_PROFILES[u.kind].naval && !s.realms[u.ownerId]?.bot,
  );
  for (const ship of ships) {
    const zone = `${Math.floor(ship.q / 32)},${Math.floor(ship.r / 32)}`;
    if (checks[zone] !== undefined && now - checks[zone] < 600000) continue;
    checks[zone] = now;
    const active = Object.values(s.events).filter(
      (e) => !e.claimedBy && e.endsAt > now && encounters.some((x) => x.kind === e.kind),
    );
    if (active.length >= 12 || active.some((e) => distance(e, ship) < 20)) continue;
    const seed = `${s.seed}:wreck:${zone}:${Math.floor(now / 600000)}`;
    if (hash(seed) > 0.45) continue;
    const sites = disk(ship, 9).filter(
      (p) =>
        distance(p, ship) >= 4 &&
        isSea(tileAt(s, p).terrain) &&
        !tileAt(s, p).ownerId &&
        !Object.values(s.units).some((u) => key(u) === key(p)) &&
        !Object.values(s.events).some((e) => e.endsAt > now && key(e) === key(p)),
    );
    if (!sites.length) continue;
    const p = sites[Math.floor(hash(seed + ':site') * sites.length)];
    const event = encounters[Math.floor(hash(seed + ':kind') * encounters.length)];
    const id = randomUUID();
    s.events[id] = { ...event, ...p, id, startsAt: now, endsAt: now + 3600000, global: false };
  }
}
