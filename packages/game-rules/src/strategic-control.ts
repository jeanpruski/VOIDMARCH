import { ALLIANCE_PROJECTS, UNITS, UNIT_PROFILES } from '@voidmarch/config';
import type { Alliance, AllianceProject, GameState, StrategicSite } from '@voidmarch/shared';
import { distance, tileAt } from './index';

export function projectHostValid(s: GameState, team: Alliance, project: AllianceProject) {
  const b = s.buildings[project.hostId];
  return (
    !!b &&
    b.hp > 0 &&
    b.level >= 3 &&
    team.members.includes(b.ownerId) &&
    !!s.realms[b.ownerId] &&
    !s.realms[b.ownerId].defeatedAt &&
    ALLIANCE_PROJECTS[project.kind].hosts.includes(b.kind)
  );
}
export function siteOperational(s: GameState, site: StrategicSite) {
  const owner = site.ownerId;
  if (!owner || !s.realms[owner] || s.realms[owner].defeatedAt || tileAt(s, site).ownerId !== owner)
    return false;
  const team = Object.values(s.strategy?.alliances ?? {}).find((a) => a.members.includes(owner));
  const friendly = (id: string) => id === owner || !!team?.members.includes(id);
  const nearby = Object.values(s.units).filter(
    (u) => u.hp > 0 && UNITS[u.kind].attack > 0 && distance(u, site) <= 1,
  );
  return (
    nearby.some(
      (u) => friendly(u.ownerId) && !UNIT_PROFILES[u.kind].flying && !UNIT_PROFILES[u.kind].naval,
    ) && !nearby.some((u) => !friendly(u.ownerId))
  );
}
export function strategicBonuses(s: GameState, id: string) {
  const team = Object.values(s.strategy?.alliances ?? {}).find((a) => a.members.includes(id));
  const projects = (team?.projects ?? []).filter(
    (p) => p.status === 'COMPLETE' && projectHostValid(s, team!, p),
  );
  const sites = Object.values(s.strategy?.sites ?? {}).filter(
    (p) => p.ownerId === id && siteOperational(s, p),
  );
  return {
    logistics:
      (projects.some((p) => p.kind === 'SUPPLY') ? 10 : 0) +
      (sites.some((p) => p.kind === 'SANCTUARY') ? 5 : 0),
    fuel:
      (projects.some((p) => p.kind === 'HARBOR') ? 10 : 0) +
      (sites.some((p) => p.kind === 'REFINERY') ? 10 : 0),
    watch: projects.some((p) => p.kind === 'WATCH') ? 2 : 0,
  };
}
