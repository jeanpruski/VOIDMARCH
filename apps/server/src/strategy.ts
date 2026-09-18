import { destroyUnit } from './transports';
import { tickAllianceOperations } from './alliance-operations';
import { missionAttackReason } from './missions';
import { randomUUID } from 'node:crypto';
import {
  STRATEGY,
  nuclearStrikeRadius,
  hexArea,
  SITE_NAMES,
  UNIT_PROFILES,
  UNITS,
  RESOURCES,
  RULES,
  formatNumber,
  type Wallet,
} from '@voidmarch/config';
import {
  canAfford,
  disk,
  distance,
  findPath,
  hash,
  hostileReason,
  key,
  realmBuildings,
  tileAt,
  transfer,
  vision,
  writeTile,
  zeroWallet,
  alliedRealmIds,
} from '@voidmarch/game-rules';
import type { Action } from '@voidmarch/protocol';
import type { GameState, Hex, Realm, StrategyState, StrategyView } from '@voidmarch/shared';
import { log, requireRule, refreshEnclosures } from './engine';
import { createNpc } from './npcs';

export function strategy(s: GameState, now: number): StrategyState {
  return (s.strategy ??= {
    alliances: {},
    invitations: {},
    wars: {},
    strikes: {},
    sites: {},
    fallout: {},
    nuclearReadyAt: {},
    lastTick: now,
    nextExpeditionAt: now + STRATEGY.expeditionInterval,
    nextSiteAt: now + 60_000,
  });
}
export const allianceOf = (s: GameState, id: string) =>
  Object.values(s.strategy?.alliances ?? {}).find((a) => a.members.includes(id));
function charge(r: Realm, ap: number, cost: Partial<Wallet> = {}) {
  requireRule(r.unlimitedAP || r.ap >= ap, `${ap} PA nécessaires.`);
  requireRule(canAfford(r.wallet, cost), 'Ressources insuffisantes.');
  if (!r.unlimitedAP) r.ap -= ap;
  transfer(r.wallet, cost, -1);
}
function peace(s: GameState, a: string, b: string, now: number) {
  const id = randomUUID();
  s.treaties[id] = {
    id,
    a,
    b,
    kind: 'TRUCE',
    startsAt: now,
    endsAt: now + STRATEGY.departureTruce,
    payment: zeroWallet(),
    proposalId: 'diplomacy',
    nextCaravanAt: 0,
  };
}
function nuclearProtected(s: GameState, owner: string, launcher: string, now: number) {
  return (
    owner === launcher ||
    !!missionAttackReason(s, launcher, owner) ||
    !!(
      s.realms[owner] &&
      s.realms[launcher] &&
      hostileReason(s, s.realms[launcher], s.realms[owner], now)
    )
  );
}
export function strategyAction(
  s: GameState,
  id: string,
  action: Action,
  now: number,
): string | undefined {
  const r = s.realms[id],
    d = strategy(s, now),
    a = allianceOf(s, id);
  switch (action.type) {
    case 'ALLIANCE_CREATE': {
      requireRule(!a, 'Quittez votre alliance avant d’en créer une autre.');
      requireRule(
        !Object.values(d.alliances).some(
          (x) => x.name.toLocaleLowerCase() === action.payload.name.toLocaleLowerCase(),
        ),
        'Ce nom d’alliance est déjà utilisé.',
      );
      const aid = randomUUID();
      d.alliances[aid] = {
        id: aid,
        name: action.payload.name,
        emblem: action.payload.emblem,
        leaderId: id,
        members: [id],
        createdAt: now,
        messages: [],
        markers: [],
      };
      return 'Alliance fondée. Invitez jusqu’à quatre partenaires.';
    }
    case 'ALLIANCE_INVITE': {
      requireRule(a && a.leaderId === id, 'Seul le chef peut inviter un royaume.');
      const target = s.realms[action.payload.to];
      requireRule(
        target &&
          !target.bot &&
          !target.defeatedAt &&
          target.id !== id &&
          !allianceOf(s, target.id),
        'Choisissez un joueur actif sans alliance.',
      );
      requireRule(a.members.length < STRATEGY.allianceSize, 'L’alliance compte déjà cinq membres.');
      requireRule(
        Object.values(d.invitations).filter((x) => x.allianceId === a.id && x.expiresAt > now)
          .length < 10,
        'Dix invitations sont déjà en attente.',
      );
      requireRule(
        !Object.values(d.invitations).some(
          (x) => x.allianceId === a.id && x.to === target.id && x.expiresAt > now,
        ),
        'Une invitation attend déjà sa réponse.',
      );
      const iid = randomUUID();
      d.invitations[iid] = {
        id: iid,
        allianceId: a.id,
        from: id,
        to: target.id,
        expiresAt: now + STRATEGY.invitationLifetime,
      };
      log(s, `${r.name} vous invite dans l’alliance ${a.name}.`, 'DIPLOMACY', now, [target.id]);
      return 'Invitation envoyée pour 24 heures.';
    }
    case 'ALLIANCE_RESPOND': {
      const invite = d.invitations[action.payload.invitationId];
      requireRule(invite && invite.to === id && invite.expiresAt > now, 'Invitation indisponible.');
      const team = d.alliances[invite.allianceId];
      requireRule(team, 'Cette alliance n’existe plus.');
      if (action.payload.accept) {
        requireRule(
          !a && team.members.length < STRATEGY.allianceSize,
          'Vous avez déjà une alliance ou celle-ci est complète.',
        );
        requireRule(
          !Object.values(d.strikes).some(
            (x) => !x.resolvedAt && (x.ownerId === id || team.members.includes(x.ownerId)),
          ),
          'Attendez la résolution des frappes de ces royaumes avant de rejoindre l’alliance.',
        );
        team.members.push(id);
        for (const w of Object.values(d.wars))
          if (w.status === 'ACTIVE' && team.members.includes(w.from) && team.members.includes(w.to))
            w.status = 'SETTLED';
        for (const i of Object.values(d.invitations)) if (i.to === id) delete d.invitations[i.id];
        log(
          s,
          `${r.name} rejoint ${team.name}. Capitales partagées et passage des remparts autorisé.`,
          'DIPLOMACY',
          now,
          team.members,
        );
      } else delete d.invitations[invite.id];
      return action.payload.accept
        ? 'Alliance acceptée. Vos alliés sont indiqués par des flèches sur la carte.'
        : 'Invitation refusée.';
    }
    case 'ALLIANCE_LEAVE': {
      requireRule(a, 'Vous n’avez pas d’alliance.');
      const previous = [...a.members];
      a.members = a.members.filter((x) => x !== id);
      for (const other of a.members) peace(s, id, other, now);
      if (a.leaderId === id) a.leaderId = a.members[0] ?? '';
      a.markers = a.markers.filter((x) => x.authorId !== id);
      for (const operation of a.operations ?? [])
        operation.participants = operation.participants.filter((p) => p.realmId !== id);
      if (!a.members.length) delete d.alliances[a.id];
      log(
        s,
        `${r.name} quitte l’alliance. Une trêve de 24 heures protège les anciens partenaires.`,
        'DIPLOMACY',
        now,
        previous,
      );
      return 'Alliance quittée. Trêve de 24 heures avec vos anciens alliés.';
    }
    case 'ALLIANCE_CHAT': {
      requireRule(a, 'Rejoignez une alliance pour discuter.');
      requireRule(
        !a.messages.some((m) => m.authorId === id && now - m.at < 3000),
        'Attendez trois secondes entre deux messages.',
      );
      a.messages.push({ id: randomUUID(), authorId: id, text: action.payload.text, at: now });
      a.messages = a.messages.slice(-100);
      return 'Message envoyé à votre alliance.';
    }
    case 'ALLIANCE_MARK': {
      requireRule(a, 'Rejoignez une alliance pour placer un signal.');
      requireRule(
        a.markers.filter((x) => x.expiresAt > now).length < 20,
        'L’alliance possède déjà vingt signaux.',
      );
      const p = action.payload;
      requireRule(
        r.explored[key(p)] || vision(s, r).has(key(p)),
        'Explorez la case avant de la signaler.',
      );
      a.markers.push({ ...p, id: randomUUID(), authorId: id, expiresAt: now + 86_400_000 });
      log(
        s,
        `${r.name} : ${p.kind === 'HELP' ? 'demande d’aide' : p.kind === 'ATTACK' ? 'objectif militaire' : 'ressources'} — ${p.label} (${p.q}, ${p.r}).`,
        'DIPLOMACY',
        now,
        a.members,
        p,
      );
      return 'Signal partagé avec votre alliance pour 24 heures.';
    }
    case 'ALLIANCE_UNMARK': {
      const marker = a?.markers.find((m) => m.id === action.payload.markerId);
      requireRule(
        a && marker && (marker.authorId === id || a.leaderId === id),
        'Seul l’auteur ou le chef peut retirer ce signal.',
      );
      a.markers = a.markers.filter((m) => m.id !== marker.id);
      return 'Signal retiré.';
    }
    case 'DECLARE_WAR': {
      const p = action.payload,
        target = s.realms[p.to];
      requireRule(
        target && target.id !== id && !target.defeatedAt,
        'Choisissez un royaume adverse actif.',
      );
      requireRule(
        !hostileReason(s, r, target, now),
        hostileReason(s, r, target, now) ?? 'Guerre impossible.',
      );
      requireRule(
        !Object.values(d.wars).some(
          (w) => w.from === id && w.to === target.id && w.status === 'ACTIVE' && w.endsAt > now,
        ),
        'Une guerre est déjà déclarée contre ce royaume.',
      );
      requireRule(
        Object.values(d.wars).filter(
          (w) => w.from === id && w.status === 'ACTIVE' && w.endsAt > now,
        ).length < 5,
        'Cinq objectifs de guerre sont déjà actifs.',
      );
      if (p.objective === 'TRIBUTE')
        requireRule(p.tributeGold > 0, 'Indiquez un tribut supérieur à zéro.');
      else {
        requireRule(vision(s, r).has(key(p)), 'L’objectif doit être visible.');
        const site = Object.values(d.sites).find(
          (x) => distance(x, p) === 0 && x.ownerId === target.id,
        );
        const b = s.buildings[tileAt(s, p).buildingId ?? ''];
        requireRule(
          p.objective === 'MINE'
            ? site?.kind === 'MINE' ||
                (b?.ownerId === target.id &&
                  ['MINE', 'GOLD_MINE', 'INDUSTRIAL_MINE', 'ABYSSAL_MINE'].includes(b.kind))
            : b?.ownerId === target.id && ['FORT', 'TOWER'].includes(b.kind),
          'Choisissez un fort ou une mine adverse correspondant à l’objectif.',
        );
      }
      const wid = randomUUID(),
        title =
          p.objective === 'TRIBUTE'
            ? `Obtenir ${formatNumber(p.tributeGold)} or`
            : p.objective === 'MINE'
              ? 'Contrôler la mine'
              : 'Prendre le fort';
      d.wars[wid] = {
        ...p,
        id: wid,
        from: id,
        title,
        startsAt: now,
        endsAt: now + STRATEGY.warDuration,
        status: 'ACTIVE',
      };
      r.protectedUntil = 0;
      log(
        s,
        `${r.name} déclare la guerre à ${target.name} : ${title}.`,
        'DIPLOMACY',
        now,
        [id, target.id],
        p,
      );
      return 'Objectif de guerre déclaré pour 24 heures. Les protections diplomatiques restent applicables.';
    }
    case 'SETTLE_WAR': {
      const war = d.wars[action.payload.warId];
      requireRule(
        war &&
          war.to === id &&
          war.status === 'ACTIVE' &&
          war.endsAt > now &&
          war.objective === 'TRIBUTE' &&
          s.realms[war.from],
        'Ce tribut ne peut plus être payé.',
      );
      charge(r, 0, { GOLD: war.tributeGold });
      transfer(s.realms[war.from].wallet, { GOLD: war.tributeGold });
      war.status = 'SETTLED';
      peace(s, war.from, id, now);
      log(
        s,
        `Tribut payé : ${formatNumber(war.tributeGold)} or. Trêve réciproque de 24 heures.`,
        'DIPLOMACY',
        now,
        [id, war.from],
      );
      return 'Tribut versé. Une trêve de 24 heures est active.';
    }
    case 'RENAME_UNIT': {
      const u = s.units[action.actorId];
      requireRule(
        u && u.ownerId === id && !u.npc && u.kind !== 'HERO',
        'Choisissez une de vos troupes.',
      );
      u.nickname = action.payload.name;
      u.updatedAt = now;
      return 'Unité renommée.';
    }
    case 'CLAIM_SITE': {
      const u = s.units[action.actorId],
        site = d.sites[action.payload.siteId];
      requireRule(
        u &&
          u.ownerId === id &&
          u.hp > 0 &&
          UNITS[u.kind].capture > 0 &&
          site &&
          distance(u, site) === 0 &&
          vision(s, r).has(key(site)),
        'Placez une unité capable de capture sur le site.',
      );
      requireRule(site.ownerId !== id, 'Vous contrôlez déjà ce site.');
      requireRule(!tileAt(s, site).buildingId, 'Capturez d’abord le bâtiment qui occupe ce site.');
      requireRule(
        u.kind !== 'PEASANT' || !site.ownerId,
        'Un paysan ne peut pas capturer un site adverse.',
      );
      if (site.ownerId && s.realms[site.ownerId])
        requireRule(
          !hostileReason(s, r, s.realms[site.ownerId], now),
          hostileReason(s, r, s.realms[site.ownerId], now) ?? 'Capture impossible.',
        );
      charge(r, 1);
      const previous = site.ownerId;
      site.ownerId = id;
      writeTile(s, site, { ownerId: id });
      if (previous) r.protectedUntil = 0;
      log(
        s,
        `${r.name} contrôle désormais ${SITE_NAMES[site.kind]}.`,
        'WORLD',
        now,
        [id, ...(previous ? [previous] : [])],
        site,
      );
      return `${SITE_NAMES[site.kind]} sous votre contrôle.`;
    }
    case 'CLEANUP': {
      const u = s.units[action.actorId],
        p = action.payload;
      requireRule(
        u &&
          u.ownerId === id &&
          ['ENGINEER', 'TERRAFORMER'].includes(u.kind) &&
          distance(u, p) <= 1,
        'Approchez un ingénieur ou un terrassier à une case.',
      );
      const cells = disk(p, 1).filter(
        (h) => d.fallout[key(h)] && (!tileAt(s, h).ownerId || tileAt(s, h).ownerId === id),
      );
      requireRule(
        cells.length,
        'Aucune contamination à nettoyer sur vos terres ou en terrain neutre.',
      );
      charge(r, 2, STRATEGY.cleanupCost);
      for (const h of cells) delete d.fallout[key(h)];
      return `${cells.length} case(s) décontaminée(s).`;
    }
    case 'LAUNCH_NUKE': {
      const silo = s.buildings[action.actorId],
        p = action.payload;
      requireRule(
        silo &&
          silo.ownerId === id &&
          silo.kind === 'ROCKET_SILO' &&
          silo.level === 5 &&
          silo.hp > 0,
        'Un silo de fusées de niveau 5 est nécessaire.',
      );
      requireRule(
        realmBuildings(s, id).some(
          (b) => b.kind === 'NUCLEAR_REACTOR' && b.level === 5 && b.hp > 0,
        ),
        'Un réacteur nucléaire de niveau 5 est nécessaire.',
      );
      requireRule(
        (d.nuclearReadyAt[id] ?? 0) <= now,
        'Votre arsenal atomique se recharge (6 heures entre deux tirs).',
      );
      requireRule(
        r.explored[key(p)] || vision(s, r).has(key(p)),
        'Les coordonnées ciblées doivent avoir été explorées.',
      );
      const cells = new Set(disk(p, STRATEGY.nuclearRadius).map(key));
      const owners = new Set([
        ...Object.values(s.units)
          .filter((u) => cells.has(key(u)))
          .map((u) => u.ownerId),
        ...Object.values(s.tiles)
          .filter((t) => cells.has(key(t)))
          .flatMap((t) => [t.ownerId, t.roadOwnerId].filter((x): x is string => !!x)),
      ]);
      requireRule(
        ![...owners].some((owner) => nuclearProtected(s, owner, id, now)),
        'Zone interdite : vos biens, un allié, une trêve ou un royaume protégé seraient touchés.',
      );
      charge(r, STRATEGY.nuclearAP, STRATEGY.nuclearCost);
      const sid = randomUUID();
      d.strikes[sid] = {
        ...p,
        id: sid,
        ownerId: id,
        siloId: silo.id,
        radius: STRATEGY.nuclearRadius,
        scorchesTerrain: true,
        launchedAt: now,
        impactAt: now + STRATEGY.nuclearDelay,
      };
      d.nuclearReadyAt[id] = now + STRATEGY.nuclearCooldown;
      r.protectedUntil = 0;
      log(
        s,
        `ALERTE ATOMIQUE : impact dans 5 minutes en (${p.q}, ${p.r}), rayon de ${STRATEGY.nuclearRadius} cases, ${hexArea(STRATEGY.nuclearRadius)} hexagones. Le sol sera brûlé, sans ressources jusqu’à restauration. Évacuez la zone.`,
        'WORLD',
        now,
      );
      return 'Missile lancé. Impact dans 5 minutes ; héros et bâtiments de capitale préservés.';
    }
    default:
      return undefined;
  }
}

/** Atomic debit, two real cargos; no instant credit and no generated replacement cargo. */
export function launchTrade(
  s: GameState,
  from: string,
  to: string,
  offer: Wallet,
  request: Wallet,
  treatyId: string,
  now: number,
) {
  const start = realmBuildings(s, from).find((b) => b.kind === 'MARKET'),
    end = realmBuildings(s, to).find((b) => b.kind === 'MARKET');
  requireRule(start && end, 'Les deux royaumes doivent posséder un marché.');
  requireRule(
    tileAt(s, start).road && tileAt(s, end).road,
    'Une route doit passer sous chaque marché.',
  );
  const allowed = new Set([from, to, ...alliedRealmIds(s, from), ...alliedRealmIds(s, to)]);
  const path = findPath(
    start,
    end,
    (p) => {
      const t = tileAt(s, p);
      const b = s.buildings[t.buildingId ?? ''];
      return t.road &&
        (!t.ownerId || allowed.has(t.ownerId)) &&
        (!b || !b.kind.endsWith('_WALL') || allowed.has(b.ownerId))
        ? t
        : undefined;
    },
    2048,
  );
  requireRule(path?.length, 'Reliez les deux marchés par une route continue avant d’accepter.');
  const full = [{ q: start.q, r: start.r }, ...path.map((p) => ({ q: p.q, r: p.r }))];
  for (const [ownerId, partnerId, cargo, route] of [
    [from, to, offer, full],
    [to, from, request, [...full].reverse()],
  ] as const) {
    if (!RESOURCES.some((k) => cargo[k] > 0)) continue;
    const cid = randomUUID();
    s.caravans[cid] = {
      id: cid,
      ownerId,
      partnerId,
      delivery: true,
      ...route[0],
      from: route[0],
      to: route[route.length - 1],
      path: [...route],
      startedAt: now,
      arrivesAt: now + Math.max(1, route.length - 1) * 15_000,
      cargo: { ...cargo },
      treatyId,
    };
  }
}

export function strategyView(
  s: GameState,
  id: string,
  now: number,
  visible: Set<string>,
): StrategyView {
  const d = s.strategy,
    a = allianceOf(s, id);
  return {
    alliance: a ? { ...a, markers: a.markers.filter((m) => m.expiresAt > now) } : undefined,
    invitations: Object.values(d?.invitations ?? {})
      .filter(
        (x) =>
          (x.to === id || x.allianceId === a?.id) &&
          x.expiresAt > now &&
          d?.alliances[x.allianceId],
      )
      .map((x) => ({ ...x, name: d!.alliances[x.allianceId].name })),
    allies: (a?.members ?? [])
      .filter((x) => x !== id && s.realms[x] && !s.realms[x].defeatedAt)
      .map((realmId) => ({ realmId, position: { ...s.realms[realmId].capital } })),
    wars: Object.values(d?.wars ?? {})
      .filter((w) => w.from === id || w.to === id)
      .slice(-30),
    strikes: Object.values(d?.strikes ?? {}).filter(
      (x) => !x.resolvedAt || now - x.resolvedAt < 15000,
    ),
    sites: Object.values(d?.sites ?? {}),
    fallout: Object.values(d?.fallout ?? {}).filter((x) => visible.has(key(x))),
    expeditions: Object.values(s.units)
      .filter((u) => u.expedition && u.npc && u.npc.expiresAt > now)
      .map((u) => ({
        id: u.id,
        q: u.q,
        r: u.r,
        title: u.expedition!.title,
        expiresAt: u.npc!.expiresAt,
      })),
    nuclearReadyAt: d?.nuclearReadyAt[id] ?? 0,
  };
}

export function tickStrategy(s: GameState, now: number, connected: Set<string>) {
  const d = strategy(s, now);
  for (const invite of Object.values(d.invitations))
    if (invite.expiresAt <= now || !d.alliances[invite.allianceId] || !s.realms[invite.to])
      delete d.invitations[invite.id];
  for (const team of Object.values(d.alliances)) {
    team.members = team.members.filter((id) => !!s.realms[id]);
    team.markers = team.markers.filter(
      (m) => m.expiresAt > now && team.members.includes(m.authorId),
    );
    if (!team.members.length) delete d.alliances[team.id];
    else if (!team.members.includes(team.leaderId)) team.leaderId = team.members[0];
  }
  tickAllianceOperations(s, now);
  for (const w of Object.values(d.wars)) {
    if (w.status !== 'ACTIVE') {
      if (w.endsAt < now - 7 * 86_400_000) delete d.wars[w.id];
      continue;
    }
    if (w.endsAt <= now || !s.realms[w.from] || !s.realms[w.to]) w.status = 'EXPIRED';
    else if (w.objective !== 'TRIBUTE' && tileAt(s, w).ownerId === w.from) {
      w.status = 'WON';
      log(
        s,
        `${s.realms[w.from].name} a accompli son objectif : ${w.title}.`,
        'DIPLOMACY',
        now,
        [w.from, w.to],
        w,
      );
    }
  }
  for (const site of Object.values(d.sites))
    if (
      site.ownerId &&
      (!s.realms[site.ownerId] ||
        s.realms[site.ownerId].defeatedAt ||
        tileAt(s, site).ownerId !== site.ownerId)
    )
      site.ownerId = undefined;
  if (now - d.lastTick >= 60_000) {
    const minutes = Math.min(60, (now - d.lastTick) / 60_000);
    d.lastTick = now;
    for (const f of Object.values(d.fallout)) {
      f.intensity = Math.max(0, f.intensity - 2 * minutes);
      if (f.intensity === 0) delete d.fallout[key(f)];
    }
    const buildings = Object.values(s.buildings),
      labs = buildings.filter((b) => b.kind === 'ISOTOPE_LAB' && b.hp > 0);
    for (const b of buildings.filter(
      (b) =>
        b.kind === 'NUCLEAR_REACTOR' &&
        b.hp > 0 &&
        s.realms[b.ownerId] &&
        s.realms[b.ownerId].lastSeen + RULES.grace > now,
    )) {
      const confinement = labs
        .filter((l) => l.ownerId === b.ownerId && distance(l, b) <= 3)
        .reduce((sum, l) => sum + l.level * 2, 0);
      for (const p of disk(b, 1)) {
        const t = tileAt(s, p);
        if (t.ownerId && t.ownerId !== b.ownerId) continue;
        const intensity = Math.max(
          0,
          Math.min(100, (d.fallout[key(p)]?.intensity ?? 0) + (6 - confinement) * minutes),
        );
        if (intensity > 0) d.fallout[key(p)] = { ...p, intensity };
        else delete d.fallout[key(p)];
      }
    }
  }
  for (const strike of Object.values(d.strikes)) {
    if (strike.resolvedAt) {
      if (now - strike.resolvedAt > 60_000) delete d.strikes[strike.id];
      continue;
    }
    if (strike.impactAt > now) continue;
    strike.resolvedAt = now;
    const cells = disk(strike, nuclearStrikeRadius(strike)),
      affected = new Set(cells.map(key));
    for (const u of Object.values(s.units))
      if (
        affected.has(key(u)) &&
        u.kind !== 'HERO' &&
        !nuclearProtected(s, u.ownerId, strike.ownerId, now)
      )
        destroyUnit(s, u, now, true);
    for (const b of Object.values(s.buildings))
      if (
        affected.has(key(b)) &&
        !nuclearProtected(s, b.ownerId, strike.ownerId, now) &&
        distance(b, s.realms[b.ownerId]?.capital ?? { q: Infinity, r: Infinity }) !== 0
      ) {
        delete s.buildings[b.id];
        writeTile(s, b, {
          buildingId: undefined,
          ownerId: undefined,
          enclosureOwnerId: undefined,
          capture: undefined,
        });
      }
    for (const c of Object.values(s.caravans))
      if (
        affected.has(key(c)) &&
        !nuclearProtected(s, c.ownerId, strike.ownerId, now) &&
        !nuclearProtected(s, c.partnerId, strike.ownerId, now)
      )
        delete s.caravans[c.id];
    const burned = new Set<string>();
    for (const p of cells) {
      const t = tileAt(s, p);
      if (
        (t.ownerId && nuclearProtected(s, t.ownerId, strike.ownerId, now)) ||
        (t.roadOwnerId && nuclearProtected(s, t.roadOwnerId, strike.ownerId, now))
      )
        continue;
      if (strike.scorchesTerrain) burned.add(key(p));
      writeTile(s, p, {
        ...(strike.scorchesTerrain
          ? { terrain: 'SCORCHED' as const, poi: undefined, exhausted: true }
          : {}),
        road: undefined,
        roadOwnerId: undefined,
        ...(!t.buildingId
          ? { ownerId: undefined, enclosureOwnerId: undefined, capture: undefined }
          : {}),
      });
      d.fallout[key(p)] = { ...p, intensity: 100 };
    }
    for (const site of Object.values(d.sites))
      if (
        affected.has(key(site)) &&
        (!site.ownerId || !nuclearProtected(s, site.ownerId, strike.ownerId, now))
      )
        if (burned.has(key(site))) delete d.sites[site.id];
        else site.ownerId = undefined;
    for (const event of Object.values(s.events))
      if (burned.has(key(event))) delete s.events[event.id];
    refreshEnclosures(s, now);
    // Victims know their own losses even if destruction removed their last source of vision.
    for (const realm of Object.values(s.realms))
      for (const p of cells) {
        const memory = realm.explored[key(p)];
        if (memory?.ownerId !== realm.id) continue;
        const tile = tileAt(s, p);
        memory.terrain = tile.terrain;
        memory.poi = tile.poi;
        memory.exhausted = tile.exhausted;
        memory.ownerId = tile.ownerId;
        memory.enclosureOwnerId = tile.enclosureOwnerId;
        memory.building = tile.buildingId ? s.buildings[tile.buildingId] : undefined;
        memory.road = tile.road;
        memory.roadOwnerId = tile.roadOwnerId;
        memory.capture = tile.capture;
      }
    log(
      s,
      `Impact atomique en (${strike.q}, ${strike.r}). ${cells.length} cases frappées${strike.scorchesTerrain ? ', terres brûlées à restaurer au terrassier' : ''} ; héros, capitales et royaumes sous protection diplomatique préservés.`,
      'WORLD',
      now,
    );
  }
  const active = Object.values(s.realms).filter(
    (r) => connected.has(r.id) && !r.defeatedAt && !r.bot,
  );
  if (active.length && now >= d.nextSiteAt) {
    d.nextSiteAt = now + STRATEGY.siteInterval;
    if (Object.keys(d.sites).length < 40) {
      const realm = active[Math.floor(hash('site' + now) * active.length)];
      const places = disk(realm.capital, 24).filter(
        (p) =>
          distance(p, realm.capital) >= 16 &&
          tileAt(s, p).terrain !== 'SCORCHED' &&
          !tileAt(s, p).ownerId &&
          !tileAt(s, p).buildingId &&
          !tileAt(s, p).road &&
          Object.values(s.realms).every((r) => distance(r.capital, p) >= 12) &&
          Object.values(d.sites).every((x) => distance(x, p) > 12) &&
          !Object.values(s.units).some((u) => distance(u, p) === 0),
      );
      if (places.length) {
        const p = places[Math.floor(hash('place' + now) * places.length)],
          sid = randomUUID(),
          kind = (['RADIO', 'MINE', 'SANCTUARY'] as const)[Math.floor(hash('kind' + now) * 3)];
        writeTile(s, p, { terrain: 'PLAIN', poi: undefined });
        d.sites[sid] = { ...p, id: sid, kind };
        log(
          s,
          `${SITE_NAMES[kind]} repéré en (${p.q}, ${p.r}). Occupez ce site pour en prendre le contrôle.`,
          'WORLD',
          now,
        );
      }
    }
  }
  if (active.length && now >= d.nextExpeditionAt) {
    d.nextExpeditionAt = now + STRATEGY.expeditionInterval;
    if (Object.values(s.units).filter((u) => u.expedition).length < 3) {
      const realm = active[Math.floor(hash('expedition' + now) * active.length)];
      const places = disk(realm.capital, 22).filter(
        (p) =>
          distance(p, realm.capital) >= 12 &&
          tileAt(s, p).terrain !== 'SCORCHED' &&
          !tileAt(s, p).ownerId &&
          !tileAt(s, p).buildingId &&
          !tileAt(s, p).road &&
          Object.values(s.realms).every((r) => distance(r.capital, p) >= 10) &&
          Object.values(s.units).every((u) => distance(u, p) > 3) &&
          Object.values(d.sites).every((x) => distance(x, p) > 2),
      );
      if (places.length) {
        const i = Math.floor(hash('boss' + now) * 4),
          p = places[Math.floor(hash('bossplace' + now) * places.length)];
        const title = [
          'Le convoi du réacteur noir',
          'Le gardien du monastère contaminé',
          'La créature de la brèche',
          'La sentinelle de la Cloche',
        ][i];
        writeTile(s, p, { terrain: 'PLAIN' });
        const boss = createNpc(
          s,
          p,
          (['marauder', 'cultist', 'mutant', 'deserter'] as const)[i],
          now,
        );
        boss.expedition = { title };
        boss.hp = boss.npc!.maxHp = 1800 + i * 400;
        boss.npc!.attack = 60 + i * 15;
        boss.npc!.defense = 20 + i * 5;
        boss.npc!.reward = { GOLD: 2400, IRON: 1600, STONE: 1200 };
        boss.npc!.bonusAP = 10;
        boss.npc!.expiresAt = now + STRATEGY.expeditionLifetime;
        log(
          s,
          `${title} repéré en (${p.q}, ${p.r}). Expédition coopérative : butin partagé selon les dégâts, disponible 2 heures.`,
          'WORLD',
          now,
        );
      }
    }
  }
}
