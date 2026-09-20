import { randomUUID } from 'node:crypto';
import { ALLIANCE_PROJECTS, PROJECT_BUILD_TIME, RESOURCES } from '@voidmarch/config';
import { projectHostValid, transfer, zeroWallet } from '@voidmarch/game-rules';
import type { Alliance, AllianceProject, GameState } from '@voidmarch/shared';
import type { Action } from '@voidmarch/protocol';
import { log, requireRule } from './engine';

const live = (p: AllianceProject) => ['FUNDING', 'BUILDING', 'COMPLETE'].includes(p.status);
export function refundProject(s: GameState, project: AllianceProject) {
  for (const [id, wallet] of Object.entries(project.contributions))
    if (s.realms[id]) transfer(s.realms[id].wallet, wallet);
  project.contributions = {};
  project.status = 'CANCELLED';
}
export function tickAllianceProjects(s: GameState, now: number) {
  for (const team of Object.values(s.strategy?.alliances ?? {}))
    for (const p of team.projects ?? []) {
      if (!live(p)) continue;
      if (!projectHostValid(s, team, p)) {
        if (p.status === 'COMPLETE') p.status = 'LOST';
        else refundProject(s, p);
        log(
          s,
          `${ALLIANCE_PROJECTS[p.kind].name} : bâtiment hôte perdu. ${p.status === 'CANCELLED' ? 'Contributions remboursées.' : 'Bonus désactivé.'}`,
          'DIPLOMACY',
          now,
          team.members,
        );
      } else if (p.status === 'BUILDING' && p.readyAt! <= now) {
        p.status = 'COMPLETE';
        log(
          s,
          `${ALLIANCE_PROJECTS[p.kind].name} achevé : ${ALLIANCE_PROJECTS[p.kind].benefit}`,
          'DIPLOMACY',
          now,
          team.members,
          s.buildings[p.hostId],
        );
      }
    }
}
export function projectAction(
  s: GameState,
  id: string,
  action: Action,
  now: number,
): string | undefined {
  if (!['PROJECT_CREATE', 'PROJECT_CONTRIBUTE', 'PROJECT_CANCEL'].includes(action.type)) return;
  requireRule(action.actorId === id, 'Cet ordre doit appartenir à votre royaume.');
  const team = Object.values(s.strategy?.alliances ?? {}).find((a) => a.members.includes(id));
  requireRule(team, 'Rejoignez une alliance pour lancer un projet commun.');
  tickAllianceProjects(s, now);
  if (action.type === 'PROJECT_CREATE') {
    requireRule(team.leaderId === id, 'Le chef choisit les projets de l’alliance.');
    const { kind, hostId } = action.payload;
    requireRule(
      !(team.projects ?? []).some((p) => p.kind === kind && live(p)),
      'Ce projet existe déjà dans votre alliance.',
    );
    const project: AllianceProject = {
      id: randomUUID(),
      kind,
      hostId,
      authorId: id,
      createdAt: now,
      status: 'FUNDING',
      cost: { ...ALLIANCE_PROJECTS[kind].cost },
      contributions: {},
    };
    requireRule(
      projectHostValid(s, team, project),
      'Choisissez un bâtiment hôte allié compatible de niveau 3 minimum.',
    );
    team.projects = [
      ...(team.projects ?? []).filter(live),
      ...(team.projects ?? []).filter((p) => !live(p)).slice(-17),
      project,
    ];
    log(
      s,
      `Projet ouvert : ${ALLIANCE_PROJECTS[kind].name}. Chaque membre peut contribuer.`,
      'DIPLOMACY',
      now,
      team.members,
      s.buildings[hostId],
    );
    return 'Projet ouvert. Les contributions sont volontaires ; chantier de 2 heures après financement.';
  }
  if (action.type !== 'PROJECT_CANCEL' && action.type !== 'PROJECT_CONTRIBUTE') return;
  const project = team.projects?.find((p) => p.id === action.payload.projectId);
  requireRule(
    project && ['FUNDING', 'BUILDING'].includes(project.status),
    'Ce projet ne peut plus recevoir cet ordre.',
  );
  if (action.type === 'PROJECT_CANCEL') {
    requireRule(team.leaderId === id, 'Seul le chef peut annuler ce projet.');
    refundProject(s, project);
    log(
      s,
      'Projet annulé : contributions remboursées à leurs auteurs.',
      'DIPLOMACY',
      now,
      team.members,
    );
    return 'Projet annulé, contributions intégralement remboursées.';
  }
  requireRule(project.status === 'FUNDING', 'Le chantier est déjà financé.');
  const r = s.realms[id],
    paid = zeroWallet(),
    contribution = zeroWallet();
  for (const cost of Object.values(project.contributions)) transfer(paid, cost);
  for (const resource of RESOURCES) {
    const remaining = Math.max(0, project.cost[resource] - paid[resource]);
    contribution[resource] = Math.min(
      Math.floor(r.wallet[resource]),
      Math.ceil((remaining * action.payload.percent) / 100),
    );
  }
  requireRule(
    Object.values(contribution).some((n) => n > 0),
    'Aucune ressource disponible pour ce projet.',
  );
  transfer(r.wallet, contribution, -1);
  const previous = project.contributions[id] ?? {};
  project.contributions[id] = Object.fromEntries(
    RESOURCES.map((k) => [k, (previous[k] ?? 0) + contribution[k]]),
  );
  transfer(paid, contribution);
  if (RESOURCES.every((k) => paid[k] >= project.cost[k])) {
    project.status = 'BUILDING';
    project.readyAt = now + PROJECT_BUILD_TIME;
  }
  log(
    s,
    `${r.name} contribue à ${ALLIANCE_PROJECTS[project.kind].name}.`,
    'DIPLOMACY',
    now,
    team.members,
  );
  return project.status === 'BUILDING'
    ? 'Financement terminé : chantier lancé pour 2 heures.'
    : 'Contribution versée au projet commun.';
}
