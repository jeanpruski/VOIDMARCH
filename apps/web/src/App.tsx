import { NuclearAlerts, NuclearControls, StrategyUnitControls } from './Strategy';
import { buildingEra } from '@voidmarch/config';
import { HeroControls } from './Hero';
import { unitStats } from '@voidmarch/game-rules';
import { useEffect, useRef, useState } from 'react';
import { TurretControls } from './TurretControls';
import { NpcInfo, AttackNpc } from './NpcInfo';
import { unitFrame } from './ui';
import { turretStats } from '@voidmarch/game-rules';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Axe,
  Castle,
  Check,
  ChevronRight,
  ChevronLeft,
  CircleHelp,
  Compass,
  Crown,
  Eye,
  EyeOff,
  Flag,
  Globe2,
  Handshake,
  Hammer,
  Hexagon,
  Home,
  Hourglass,
  Route,
  LoaderCircle,
  LogOut,
  Map,
  Menu,
  Minus,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Star,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Users,
  Wheat,
  X,
} from 'lucide-react';
import {
  BUILDINGS,
  isWall,
  WALL_KINDS,
  productionMultiplier,
  productionOnTerrain,
  UNIT_PROFILES,
  RECON_UNITS,
  GATHER_YIELD,
  CITY_LEVELS,
  FACTIONS,
  RESOURCES,
  RESOURCE_NAMES,
  RULES,
  TERRAINS,
  UNITS,
} from '@voidmarch/config';
import { canAfford, canGather, distance, key } from '@voidmarch/game-rules';
import type { ViewTile } from '@voidmarch/shared';
import { GameMap } from './Map';
import { Minimap } from './Minimap';
import { Login } from './Login';
import { Panels } from './Panels';
import { RoadAction } from './RoadAction';
import { RoadTools } from './RoadTools';
import { TerraformTools } from './TerraformTools';
import { UpgradeBuilding } from './UpgradeBuilding';
import { DemolishBuilding } from './DemolishBuilding';
import { BeginnerTutorial, ContextHelp } from './Experience';
import {
  bootstrap,
  api,
  focusMap,
  focusHero,
  logout,
  mapCommand,
  toggleMapLayer,
  openRoadTool,
  notify,
  saveSettings,
  select,
  send,
  useGame,
  type Panel,
} from './store';
import {
  BUILDING_FRAMES,
  Cost,
  Duration,
  format,
  Miniature,
  resourceIcons,
  Sigil,
  UNIT_FRAMES,
} from './ui';
const nav: { panel: Panel; label: string; icon: typeof Crown; hint: string }[] = [
  { panel: 'realm', label: 'Royaume', icon: Crown, hint: 'R' },
  { panel: 'army', label: 'Armées', icon: Swords, hint: 'A' },
  { panel: 'cities', label: 'Villes & domaines', icon: Castle, hint: 'V' },
  { panel: 'economy', label: 'Économie', icon: TrendingUp, hint: 'E' },
  { panel: 'trade', label: 'Commerce & diplomatie', icon: Handshake, hint: 'D' },
];
import { CapitalRadar } from './CapitalRadar';
let booted = false;
export function App() {
  const status = useGame((s) => s.status),
    clientUpdateRequired = useGame((s) => s.clientUpdateRequired),
    world = useGame((s) => s.world),
    toast = useGame((s) => s.toast),
    panel = useGame((s) => s.panel),
    onboarded = useRef(false),
    lastJournal = useRef<string | undefined>(undefined),
    lastWorldEvent = useRef<string | undefined>(undefined);
  const [collapsedSides, setCollapsedSides] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('voidmarch-sidebar-layout') ?? '{}');
      return {
        left: saved.left === true,
        right: saved.tutorialVersion === 1 ? saved.right !== false : true,
      };
    } catch {
      return { left: false, right: true };
    }
  });
  const toggleSide = (side: 'left' | 'right') => {
    setCollapsedSides((previous) => {
      const next = { ...previous, [side]: !previous[side] };
      try {
        localStorage.setItem(
          'voidmarch-sidebar-layout',
          JSON.stringify({ ...next, tutorialVersion: 1 }),
        );
      } catch {
        /* Optional preference. */
      }
      return next;
    });
  };
  useEffect(() => {
    if (!booted) {
      booted = true;
      void bootstrap();
    }
    let code = '';
    let lastKeyAt = 0;
    const t = setInterval(() => useGame.setState((s) => ({ now: s.now + 1000 })), 1000);
    const keyboard = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      )
        return;
      if (document.querySelector('[role="dialog"]')) return;
      if (Date.now() - lastKeyAt > 5000) code = '';
      if (['y', 'h'].includes(e.key.toLowerCase())) code = '';
      lastKeyAt = Date.now();
      if (e.key === 'Enter' && code.length === 5 && /^[yh]/.test(code)) {
        e.preventDefault();
        e.stopPropagation();
        const radar = code.startsWith('h');
        void api<{ enabled: boolean }>(radar ? '/admin/capital-radar' : '/admin/unlimited-ap', {
          code,
        })
          .then(({ enabled }) =>
            notify(
              radar
                ? enabled
                  ? 'Repérage des capitales activé.'
                  : 'Repérage des capitales désactivé.'
                : enabled
                  ? 'PA illimités activés.'
                  : 'PA illimités désactivés.',
            ),
          )
          .catch(() => {});
        code = '';
      } else if (/^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey)
        code = (code + e.key.toLowerCase()).slice(-6);

      if ((code.startsWith('y') || code.startsWith('h')) && /^[a-z]$/i.test(e.key)) return;
      if (e.key === 'Escape')
        useGame.setState({ panel: null, combatTarget: null, mode: 'inspect', menuOpen: false });
      const item = nav.find((n) => n.hint.toLowerCase() === e.key.toLowerCase());
      if (item) useGame.setState({ panel: item.panel });
    };
    window.addEventListener('keydown', keyboard);
    return () => {
      clearInterval(t);
      window.removeEventListener('keydown', keyboard);
    };
  }, []);
  useEffect(() => {
    if (world) {
      document.documentElement.style.setProperty(
        '--ui-scale',
        String(world.player.settings.uiScale),
      );
      document.body.classList.toggle('reduced-motion', world.player.settings.reducedMotion);
      document.body.classList.toggle('high-contrast', world.player.settings.highContrast);
      document.body.classList.toggle('touch-controls', world.player.settings.input === 'touch');
      if (!onboarded.current) {
        onboarded.current = true;
        if (!world.player.settings.tutorialCompleted) useGame.setState({ panel: 'help' });
      }
      const latest = world.events.at(-1);
      if (
        latest &&
        lastWorldEvent.current &&
        lastWorldEvent.current !== latest.id &&
        world.player.settings.autoCenterEvents
      )
        focusMap(latest);
      lastWorldEvent.current = latest?.id;
      const entry = world.journal[0];
      if (
        entry &&
        lastJournal.current &&
        entry.id !== lastJournal.current &&
        ((entry.kind === 'COMBAT' && world.player.settings.combatNotifications) ||
          (['DIPLOMACY', 'ECONOMY'].includes(entry.kind) &&
            world.player.settings.realmNotifications))
      )
        notify(entry.text, entry.kind === 'COMBAT');
      lastJournal.current = entry?.id;
    }
  }, [world]);
  if (clientUpdateRequired)
    return (
      <div className="loading-screen art-loading" role="alert">
        <div className="wordmark">VOIDMARCH</div>
        <h2>Une mise à jour du jeu est nécessaire</h2>
        <p>
          Le monde contient de nouvelles unités ou de nouveaux bâtiments. Rechargez le jeu pour les
          afficher.
        </p>
        <button className="primary" onClick={() => window.location.reload()}>
          Recharger le jeu
        </button>
      </div>
    );
  if (status === 'loading')
    return (
      <div className="loading-screen">
        <div className="wordmark">VOIDMARCH</div>
        <LoaderCircle className="spin" />
        <p>Les Marches s’éveillent…</p>
      </div>
    );
  if (!world)
    return status === 'offline' ? (
      <Login />
    ) : (
      <div className="loading-screen art-loading">
        <div className="wordmark">VOIDMARCH</div>
        <LoaderCircle className="spin" />
        <h2>Votre royaume vous attend</h2>
        <p>Les bannières se lèvent dans la brume.</p>
        <button
          className="secondary"
          onClick={() => {
            useGame.setState({ status: 'offline', user: null, token: null });
          }}
        >
          Revenir à l’accueil
        </button>
      </div>
    );
  return (
    <div className="game-shell">
      <Topbar />
      <div
        className={`game-layout ${collapsedSides.left ? 'left-collapsed' : ''} ${collapsedSides.right ? 'right-collapsed' : ''}`}
      >
        <Sidebar collapsed={collapsedSides.left} onToggle={() => toggleSide('left')} />
        <main className="board">
          <GameMap />
          <div className="map-shading" />
          <MapTools />
          <PendingOrderIndicator />
          <RoadTools />
          <TerraformTools />
          <MapLegend />
          <Minimap />
          <CapitalRadar />
          <NuclearAlerts />
          <SelectionPanel />
          <div className="coordinate-bar">
            <Map size={12} />
            <TileHint />
          </div>
        </main>
        <RightSidebar collapsed={collapsedSides.right} onToggle={() => toggleSide('right')} />
      </div>
      <BottomBar />
      <Panels />
      {world.player.defeatedAt && <Defeat />}
      {status !== 'online' && (
        <div className="connection-notice">
          <LoaderCircle className="spin" size={15} /> Reconnexion au monde… votre royaume reste
          sauvegardé.
        </div>
      )}
      {toast && (
        <div className={`toast ${toast.error ? 'error' : ''}`} role="status">
          {toast.error ? <X size={17} /> : <Check size={17} />}
          <span>{toast.text}</span>
          <button
            aria-label="Fermer la notification"
            onClick={() => useGame.setState({ toast: null })}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function Topbar() {
  const w = useGame((s) => s.world)!,
    p = w.player,
    now = useGame((s) => s.now),
    ap =
      p.ap > RULES.maxAP
        ? p.ap
        : Math.min(
            RULES.maxAP,
            p.ap + Math.max(0, Math.floor((now - p.nextAPAt) / RULES.apInterval) + 1),
          );
  return (
    <header className="topbar">
      <button
        className="mobile-menu icon-button"
        aria-label="Ouvrir le menu"
        onClick={() => useGame.setState((s) => ({ menuOpen: !s.menuOpen }))}
      >
        <Menu size={21} />
      </button>
      <button className="wordmark" onClick={() => focusMap(p.capital)}>
        V<span>O</span>IDMARCH
      </button>
      <div className="top-resources">
        {RESOURCES.map((r) => {
          const Icon = resourceIcons[r];
          return (
            <button
              key={r}
              title={`${RESOURCE_NAMES[r]} : ${format(p.income[r])}/min · Stockage ${format(p.capacity)}`}
              onClick={() => useGame.setState({ panel: 'economy' })}
            >
              <Icon className={`resource-${r.toLowerCase()}`} size={21} strokeWidth={1.45} />
              <div>
                <strong>{format(p.wallet[r])}</strong>
                <small>
                  {RESOURCE_NAMES[r]}{' '}
                  <em>
                    {p.income[r] >= 0 ? '+' : ''}
                    {format(p.income[r])}/m
                  </em>
                </small>
              </div>
            </button>
          );
        })}
      </div>
      <div className="action-points">
        <div>
          <span className="eyebrow">POINTS D’ACTION</span>
          <span
            className="runes"
            aria-label={
              p.unlimitedAP
                ? 'Points d’action illimités'
                : `${ap} points d’action sur ${RULES.maxAP}`
            }
          >
            <span className="full">{p.unlimitedAP ? '∞' : `${ap} / ${RULES.maxAP}`}</span>
          </span>
        </div>
        <span className="ap-countdown">
          {p.unlimitedAP ? (
            'PA ILLIMITÉS'
          ) : ap >= RULES.maxAP ? (
            ap > RULES.maxAP ? (
              `BONUS DE DÉPART · +${ap - RULES.maxAP}`
            ) : (
              'RÉSERVE PLEINE'
            )
          ) : (
            <>
              +1 dans{' '}
              <Duration
                until={
                  p.nextAPAt +
                  Math.max(0, Math.floor((now - p.nextAPAt) / RULES.apInterval) + 1) *
                    RULES.apInterval
                }
              />
            </>
          )}
        </span>
      </div>
      <div className="top-actions">
        <button
          className="icon-button"
          title="Guide du jeu"
          aria-label="Guide du jeu"
          onClick={() => useGame.setState({ panel: 'help' })}
        >
          <CircleHelp size={19} />
        </button>
        <button
          className="icon-button"
          title="Paramètres"
          aria-label="Paramètres"
          onClick={() => useGame.setState({ panel: 'settings' })}
        >
          <Settings size={19} />
        </button>
        <button
          className="avatar-button"
          aria-label="Profil du souverain"
          onClick={() => useGame.setState({ panel: 'profile' })}
        >
          <Crown size={19} />
        </button>
      </div>
    </header>
  );
}
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const w = useGame((s) => s.world)!,
    p = w.player,
    me = w.realms.find((r) => r.id === p.id)!,
    menu = useGame((s) => s.menuOpen),
    now = useGame((s) => s.now),
    pending = w.proposals.filter((t) => t.to === p.id && t.status === 'PENDING').length;
  return (
    <aside className={`left-sidebar ${menu ? 'open' : ''}`}>
      <button
        className="sidebar-toggle left-toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Afficher le panneau du royaume' : 'Replier le panneau du royaume'}
        title={collapsed ? 'Afficher le royaume' : 'Replier le royaume'}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
      <div className="realm-banner" onClick={() => useGame.setState({ panel: 'profile' })}>
        <Sigil symbol={p.settings.emblem} color={p.settings.bannerColor} size={39} />
        <div className="eyebrow">{FACTIONS[p.faction].short}</div>
        <h2>{p.name}</h2>
      </div>
      <div className="realm-numbers">
        <span>
          <Hexagon size={13} />
          {me.stats.territory} terres
        </span>
        <span>
          <Users size={13} />
          {format(p.population)} âmes
        </span>
      </div>
      <nav aria-label="Navigation du royaume">
        {nav.map((n) => (
          <button
            key={n.panel}
            onClick={() => useGame.setState({ panel: n.panel, menuOpen: false })}
          >
            <n.icon size={17} />
            <span>{n.label}</span>
            {n.panel === 'trade' && pending > 0 ? (
              <b className="nav-count">{pending}</b>
            ) : (
              <kbd>{n.hint}</kbd>
            )}
          </button>
        ))}
        <div className="nav-separator" />
        <button onClick={() => useGame.setState({ panel: 'events', menuOpen: false })}>
          <Globe2 size={17} />
          <span>Événements du monde</span>
          <i className="small-dot" />
        </button>
        <button onClick={() => useGame.setState({ panel: 'rank', menuOpen: false })}>
          <Flag size={17} />
          <span>Les royaumes</span>
        </button>
        <button onClick={() => useGame.setState({ panel: 'help', menuOpen: false })}>
          <CircleHelp size={17} />
          <span>Aide & règles</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        {p.protectedUntil > now && (
          <div className="protection-box">
            <Shield size={20} />
            <div>
              <strong>Paix des premiers jours</strong>
              <span>
                Protection · <Duration until={p.protectedUntil} />
              </span>
            </div>
          </div>
        )}
        <button className="exit-button" onClick={() => void logout()}>
          <LogOut size={14} /> Quitter les Marches
        </button>
      </div>
    </aside>
  );
}
function TileConstructionAction() {
  const w = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection);
  if (selection?.kind !== 'tile') return null;
  const tile = w.tiles.find((t) => key(t) === key(selection));
  if (!tile?.terrain || tile.visibility === 'UNKNOWN') return null;
  const own = tile.ownerId === w.player.id;
  return (
    <>
      {!tile?.building &&
        ((own &&
          (!tile?.enclosureOwnerId ||
            w.units.some(
              (u) =>
                u.ownerId === w.player.id &&
                UNIT_PROFILES[u.kind].builder &&
                distance(u, tile) <= 1,
            ))) ||
          (tile &&
            !tile.ownerId &&
            w.units.some(
              (u) =>
                u.ownerId === w.player.id &&
                UNIT_PROFILES[u.kind].builder &&
                distance(u, tile) <= 1,
            ) &&
            w.tiles.some(
              (t) =>
                t.building?.ownerId === w.player.id &&
                distance(t, tile) <= RULES.constructionRadius,
            ))) && (
          <button className="primary" onClick={() => useGame.setState({ panel: 'build' })}>
            <Hammer size={15} /> Construire
          </button>
        )}
    </>
  );
}

function MapTools() {
  const settings = useGame((s) => s.world)!.player.settings;
  const roadMode = useGame((s) => s.mode) === 'road';
  const showUnits = useGame((s) => s.showUnits);
  const showBuildings = useGame((s) => s.showBuildings);
  return (
    <div className="map-tools">
      <TileConstructionAction />
      <button
        className={`road-map-button ${roadMode ? 'active' : ''}`}
        aria-label="Mode routes"
        aria-pressed={roadMode}
        title="Routes : poser, retirer et comprendre leur utilité"
        onClick={() => (roadMode ? useGame.setState({ mode: 'inspect' }) : openRoadTool())}
      >
        <Route size={17} />
        <span>Routes</span>
      </button>
      <button aria-label="Zoom avant" title="Zoom avant" onClick={() => mapCommand('in')}>
        <Plus size={18} />
      </button>
      <button aria-label="Zoom arrière" title="Zoom arrière" onClick={() => mapCommand('out')}>
        <Minus size={18} />
      </button>
      <span />
      <button
        aria-label="Centrer la capitale"
        title="Centrer la capitale"
        onClick={() => mapCommand('home')}
      >
        <Home size={17} />
      </button>
      <button
        className="hero-map-button"
        aria-label="Aller à mon héros"
        title="Centrer la carte sur mon héros et afficher ses pouvoirs"
        onClick={focusHero}
      >
        <Star size={19} fill="currentColor" />
        <span>Héros</span>
      </button>
      <button
        aria-label={settings.grid ? 'Masquer la grille' : 'Afficher la grille'}
        title={settings.grid ? 'Masquer la grille' : 'Afficher la grille'}
        aria-pressed={settings.grid}
        className={settings.grid ? 'active' : ''}
        onClick={() => void saveSettings({ grid: !settings.grid })}
      >
        <Hexagon size={17} />
      </button>
      {(
        [
          ['showUnits', showUnits, 'Unités', 'les unités', Users],
          ['showBuildings', showBuildings, 'Bâtiments', 'les bâtiments', Castle],
        ] as const
      ).map(([layer, visible, label, description, Icon]) => (
        <button
          key={layer}
          className={`map-layer-button ${visible ? 'active' : 'layer-hidden'}`}
          aria-label={`${visible ? 'Masquer' : 'Afficher'} ${description}`}
          aria-pressed={visible}
          title={`${visible ? 'Masquer' : 'Afficher'} ${description} de tous les joueurs${layer === 'showUnits' ? ', héros et PNJ compris' : ', remparts et tourelles compris'}. Filtre visuel uniquement.`}
          onClick={() => toggleMapLayer(layer)}
        >
          {visible ? <Icon size={17} /> : <EyeOff size={17} />}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
function MapLegend() {
  return (
    <div className="map-legend">
      <span>
        <i className="own" />
        Votre territoire
      </span>
      <span>
        <i className="foreign" />
        Autre royaume
      </span>
      <span>
        <i className="unknown" />
        Inexploré
      </span>
    </div>
  );
}
function TileHint() {
  const w = useGame((s) => s.world)!,
    hover = useGame((s) => s.hover),
    tile = w.tiles.find((t) => hover && key(t) === key(hover));
  return (
    <span>
      {tile?.terrain ? TERRAINS[tile.terrain].name : 'Brume des Marches'}
      {w.player.settings.coordinates && hover ? ` · q ${hover.q}, r ${hover.r}` : ''}
    </span>
  );
}
function SelectionPanel() {
  const w = useGame((s) => s.world)!,
    selection = useGame((s) => s.selection),
    mode = useGame((s) => s.mode),
    pending = useGame((s) => s.pending),
    u = selection?.kind === 'unit' ? w.units.find((u) => u.id === selection.id) : undefined,
    tile = w.tiles.find((t) => selection && key(t) === key(u ?? selection)),
    b =
      selection?.kind === 'building' && tile?.building && tile.building.id === selection.id
        ? tile.building
        : undefined,
    visible = !!(u || b),
    own = u
      ? u.ownerId === w.player.id
      : b
        ? b.ownerId === w.player.id
        : tile?.ownerId === w.player.id;
  const action = (type: 'CAPTURE' | 'REPAIR' | 'UPGRADE') => {
    if (!selection?.id) return;
    if (
      type === 'CAPTURE' &&
      tile?.ownerId &&
      tile.ownerId !== w.player.id &&
      w.player.settings.confirmDangerous &&
      !window.confirm(
        'Revendiquer cet hexagone engage les hostilités et met fin à votre protection. Confirmer ?',
      )
    )
      return;
    void send({ type, actorId: selection.id, payload: {} });
  };
  const panelRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const panel = panelRef.current,
      board = panel?.parentElement;
    if (!panel || !board) return;
    const update = () =>
      board.style.setProperty(
        '--minimap-bottom',
        `${panel.getBoundingClientRect().height + (parseFloat(getComputedStyle(panel).bottom) || 0) + 12}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    update();
    return () => {
      observer.disconnect();
      board.style.removeProperty('--minimap-bottom');
    };
  }, [visible, selection?.kind, selection?.id, mode]);
  if (!selection || !visible) return null;
  const name = u
      ? (u.nickname ?? unitStats(u).name)
      : b
        ? b.kind === 'VILLAGE'
          ? CITY_LEVELS[b.level]
          : `${tile?.road && isWall(b.kind) ? 'Porte · ' : ''}${BUILDINGS[b.kind].name}`
        : tile?.terrain
          ? TERRAINS[tile.terrain].name
          : 'Terres inconnues',
    frame = u
      ? unitFrame(u)
      : b
        ? b.kind === 'VILLAGE'
          ? Math.min(9, 6 + b.level)
          : BUILDING_FRAMES[b.kind]
        : undefined;
  return (
    <section ref={panelRef} className="selection-panel" aria-label="Sélection actuelle">
      <div className="selection-identity">
        {frame !== undefined ? (
          <Miniature
            heroAppearance={u?.hero?.appearance}
            building={b}
            frame={frame}
            size={88}
            turretLevel={b?.turretLevel}
            gate={!!tile?.road && !!b && isWall(b.kind)}
          />
        ) : (
          <div className="tile-symbol">
            <Hexagon size={40} strokeWidth={1} />
          </div>
        )}
        <div>
          <span className="eyebrow">
            {u ? 'UNITÉ SÉLECTIONNÉE' : b ? 'DOMAINE SÉLECTIONNÉ' : 'HEXAGONE SÉLECTIONNÉ'}
          </span>
          <h2>{name}</h2>
          {u?.trainingBonus ? (
            <span className="rare-tag">Entraînement · +{format(u.trainingBonus)} %</span>
          ) : null}
          {u?.rareBonus && (
            <span className="rare-tag" title="Bonus permanent aux PV, à l’attaque et à la défense">
              ✦ Rare · +{format(u.rareBonus)} %
            </span>
          )}
          <span className="selection-owner">
            {u?.npc
              ? 'PNJ neutre · sans royaume'
              : own
                ? FACTIONS[w.player.faction].name
                : (w.realms.find((r) => r.id === (u?.ownerId ?? b?.ownerId ?? tile?.ownerId))
                    ?.name ?? 'Terres sans bannière')}
          </span>
        </div>
      </div>
      {u ? (
        <>
          <div className="unit-stats">
            <div>
              <span>VIE</span>
              <strong>
                {format(u.hp)}
                <small>/{format(unitStats(u).hp)}</small>
              </strong>
              <i style={{ width: `${(u.hp / unitStats(u).hp) * 100}%` }} />
            </div>
            <div>
              <span>ATTAQUE</span>
              <strong>{format(unitStats(u).attack)}</strong>
            </div>
            <div>
              <span>DÉFENSE</span>
              <strong>{format(unitStats(u).defense)}</strong>
            </div>
            <div>
              <span>MOUV.</span>
              <strong>{unitStats(u).move}</strong>
            </div>
            <div>
              <span>VISION</span>
              <strong>{UNITS[u.kind].vision}</strong>
            </div>
          </div>
          {u.npc && <NpcInfo unit={u} />}
          {own && u.kind === 'PEASANT' && (
            <ContextHelp title="Aide aux actions">
              <p>
                Récolter : placez le paysan sur la ressource. Forêt → bois ; colline → pierre ou fer
                ; montagne → pierre ; plaine, rivière ou marais → vivres ; ruines → or.
              </p>
              <p>
                Les contours verts indiquent les chantiers accessibles au bâtisseur dans un rayon de
                3 cases de vos bâtiments. Une terre neutre suffit pour récolter. Capturer permet de
                la posséder ; elle ne produit pas seule et coûte de l’or en entretien. Construire
                permet d’y installer une production ou un domaine.
              </p>
            </ContextHelp>
          )}
          {own && u.kind === 'HERO' && <HeroControls inSelection />}
          {own && <StrategyUnitControls key={u.id} unit={u} />}
          {own && tile?.capture?.by === w.player.id && (
            <p className="capture-progress">
              Capture en cours : {tile.capture.points} points. Répétez « Revendiquer la case »
              jusqu’à la prise de contrôle.
            </p>
          )}
          <div
            className="selection-actions"
            role="toolbar"
            aria-label="Actions de la sélection, défilement horizontal"
          >
            {own ? (
              <>
                <button
                  className={`primary ${mode === 'move' ? 'chosen' : ''}`}
                  disabled={pending || (!w.player.unlimitedAP && w.player.ap < 1)}
                  onClick={() => useGame.setState({ mode: mode === 'move' ? 'inspect' : 'move' })}
                  title={
                    'Distance illimitée pour 1 PA sur un trajet continu de vos terres et de routes explorées. Ailleurs : portée normale. Les obstacles et terrains impraticables restent bloquants.'
                  }
                >
                  <ArrowUpRight size={16} />
                  {mode === 'move' ? 'Choisir une destination' : 'Déplacer'}
                  <small>1 PA</small>
                </button>
                {(tile?.road || tile?.ownerId === w.player.id) && (
                  <span className="road-status">
                    Vos terres + routes : distance illimitée · 1 PA
                  </span>
                )}
                <button
                  className="secondary"
                  disabled={
                    pending ||
                    (!w.player.unlimitedAP && w.player.ap < 1) ||
                    unitStats(u).attack === 0
                  }
                  onClick={() => useGame.setState({ mode: 'attack' })}
                >
                  <Swords size={15} /> Attaquer · {UNIT_PROFILES[u.kind].siege ? 2 : 1} PA
                </button>
                <button
                  className="secondary"
                  disabled={
                    pending ||
                    UNITS[u.kind].capture === 0 ||
                    isWall(tile?.building?.kind ?? '') ||
                    (u.kind === 'PEASANT' && (!!tile?.ownerId || !!tile?.building)) ||
                    tile?.ownerId === w.player.id ||
                    (!w.player.unlimitedAP && w.player.ap < 1)
                  }
                  title="Prend possession de la case occupée : permet d’y construire et d’y tracer une route. Aucun revenu automatique ; entretien territorial en or. Les sites fortifiés demandent plusieurs actions."
                  onClick={() => action('CAPTURE')}
                >
                  <Flag size={15} /> Revendiquer la case · 1 PA
                </button>
                <button
                  className="icon-button"
                  title={
                    UNIT_PROFILES[u.kind].mechanical
                      ? 'Réparer · 1 PA, 10 or, 10 fer'
                      : 'Soigner · 1 PA, 10 or, 10 vivres'
                  }
                  aria-label={
                    UNIT_PROFILES[u.kind].mechanical ? 'Réparer le véhicule' : 'Soigner l’unité'
                  }
                  disabled={
                    pending ||
                    u.hp >= unitStats(u).hp ||
                    (!w.player.unlimitedAP && w.player.ap < 1) ||
                    !canAfford(w.player.wallet, {
                      GOLD: 10,
                      ...(UNIT_PROFILES[u.kind].mechanical ? { IRON: 10 } : { FOOD: 10 }),
                    })
                  }
                  onClick={() => action('REPAIR')}
                >
                  <Plus size={17} /> {UNIT_PROFILES[u.kind].mechanical ? 'Réparer' : 'Soigner'} · 1
                  PA
                </button>
                {u.kind === 'PEASANT' &&
                  RESOURCES.map((resource) => {
                    const accessible = w.tiles.some(
                      (t) =>
                        distance(t, u) === 0 &&
                        t.terrain &&
                        canGather(
                          { terrain: t.terrain, ownerId: t.ownerId },
                          w.player.id,
                          resource,
                        ),
                    );
                    return (
                      <button
                        key={resource}
                        className="secondary"
                        disabled={
                          pending || (!w.player.unlimitedAP && w.player.ap < 1) || !accessible
                        }
                        title={
                          accessible
                            ? 'Récolter sur la case occupée'
                            : 'Déplacez le paysan sur le terrain adapté à cette ressource'
                        }
                        onClick={() =>
                          void send({ type: 'GATHER', actorId: u.id, payload: { resource } })
                        }
                      >
                        Récolter {RESOURCE_NAMES[resource].toLowerCase()} +{GATHER_YIELD[resource]}{' '}
                        · 1 PA
                      </button>
                    );
                  })}
                {u.kind === 'TERRAFORMER' && (
                  <button
                    className="secondary"
                    title="Transformer un terrain en plaine : 20 bois et 10 fer par case"
                    onClick={() =>
                      useGame.setState({
                        mode: mode === 'terraform' ? 'inspect' : 'terraform',
                        terraformTarget: undefined,
                      })
                    }
                  >
                    <Hammer size={17} /> Terrasser · 2 PA
                  </button>
                )}
                {UNIT_PROFILES[u.kind].builder && <RoadAction tile={tile} />}
                {UNIT_PROFILES[u.kind].builder && (
                  <button
                    className="secondary"
                    onClick={() => {
                      const site = [...w.tiles]
                        .sort((a, b) => distance(u, a) - distance(u, b))
                        .find(
                          (t) =>
                            !t.building &&
                            t.terrain &&
                            distance(u, t) <= 1 &&
                            (t.ownerId === w.player.id ||
                              (!t.ownerId &&
                                w.tiles.some(
                                  (n) =>
                                    n.building?.ownerId === w.player.id &&
                                    distance(n, t) <= RULES.constructionRadius,
                                ))),
                        );
                      if (site) {
                        select({ kind: 'tile', q: site.q, r: site.r });
                        useGame.setState({ panel: 'build' });
                      } else notify('Aucun terrain libre à proximité.', true);
                    }}
                  >
                    <Hammer size={15} />
                    Construire
                  </button>
                )}
                {u.kind !== 'PEASANT' && u.kind !== 'HERO' && (
                  <button
                    className="secondary"
                    disabled={
                      pending ||
                      (!w.player.unlimitedAP &&
                        w.player.ap < (UNIT_PROFILES[u.kind].healer ? 1 : 2))
                    }
                    onClick={() =>
                      void send({
                        type: 'ABILITY',
                        actorId: u.id,
                        payload: {
                          ability: UNIT_PROFILES[u.kind].healer
                            ? 'MEND'
                            : u.kind === 'ENGINEER'
                              ? 'RESTORE'
                              : RECON_UNITS.includes(u.kind)
                                ? 'SURVEY'
                                : 'RALLY',
                        },
                      })
                    }
                  >
                    {UNIT_PROFILES[u.kind].healer
                      ? 'Soigner les alliés · 1 PA'
                      : u.kind === 'ENGINEER'
                        ? 'Réparer autour · 2 PA'
                        : RECON_UNITS.includes(u.kind)
                          ? 'Reconnaissance · 2 PA'
                          : 'Ralliement · 2 PA'}
                  </button>
                )}
                {tile?.poi && !tile.exhausted && (
                  <button
                    className="secondary"
                    onClick={() => void send({ type: 'INTERACT', actorId: u.id, payload: {} })}
                  >
                    Fouiller · 1 PA
                  </button>
                )}
                {w.events
                  .filter((e) => !e.claimedBy && distance(e, u) <= 1)
                  .map((e) => (
                    <button
                      className="secondary"
                      key={e.id}
                      onClick={() =>
                        void send({ type: 'INTERACT', actorId: u.id, payload: { eventId: e.id } })
                      }
                    >
                      <Eye size={14} /> Explorer l’anomalie · 1 PA
                    </button>
                  ))}
                {w.caravans
                  .filter(
                    (c) =>
                      c.ownerId !== w.player.id &&
                      c.partnerId !== w.player.id &&
                      !w.strategy?.alliance?.members.includes(c.ownerId) &&
                      !w.strategy?.alliance?.members.includes(c.partnerId) &&
                      distance(c, u) <= 1,
                  )
                  .map((c) => (
                    <button
                      className="secondary"
                      key={c.id}
                      onClick={() =>
                        void send({ type: 'INTERACT', actorId: u.id, payload: { caravanId: c.id } })
                      }
                    >
                      Intercepter · 1 PA
                    </button>
                  ))}
              </>
            ) : u.npc ? (
              <AttackNpc unit={u} />
            ) : (
              <button className="secondary" onClick={() => useGame.setState({ panel: 'trade' })}>
                <Handshake size={15} /> Négocier avec ce royaume
              </button>
            )}
          </div>
        </>
      ) : b ? (
        <>
          <div className="building-info">
            {b.turretLevel && (
              <span>
                {turretStats(b)?.name} · niveau {b.turretLevel}/5 · ATQ{' '}
                {format(turretStats(b)?.attack ?? 0)} · portée {turretStats(b)?.range}
              </span>
            )}
            <span>
              {format(b.hp)}/{format(BUILDINGS[b.kind].hp * b.level)} PV
            </span>
            <span>
              {isWall(b.kind)
                ? `Rempart · palier ${WALL_KINDS.indexOf(b.kind) + 1}/5`
                : `Niveau ${b.level}/5 · ${buildingEra(b.kind, b.level)}`}
            </span>
            {isWall(b.kind) && (
              <span title="Les ennemis doivent détruire ce tronçon pour entrer sur la case. Vos unités traversent librement. Une route ne supprime pas cette protection.">
                Passage allié · ennemis bloqués
              </span>
            )}
            {b.population > 0 && (
              <span>
                <Users size={13} /> {format(b.population)}
              </span>
            )}
            <span title="Production brute par minute">
              <Cost
                cost={Object.fromEntries(
                  Object.entries(productionOnTerrain(b.kind, tile?.terrain ?? 'PLAIN')).map(
                    ([r, v]) => [r, v * productionMultiplier(b.kind, b.level)],
                  ),
                )}
              />
            </span>
          </div>
          <div
            className="selection-actions"
            role="toolbar"
            aria-label="Actions de la sélection, défilement horizontal"
          >
            {own ? (
              <>
                <button
                  className="primary"
                  disabled={!Object.values(UNIT_PROFILES).some((p) => p.recruitAt.includes(b.kind))}
                  onClick={() => useGame.setState({ panel: 'recruit' })}
                >
                  <Users size={15} /> Recruter
                </button>
                <UpgradeBuilding key={b.id} building={b} />
                {isWall(b.kind) && <TurretControls key={`turret-${b.id}`} building={b} />}
                <DemolishBuilding key={`demolish-${b.id}`} building={b} />
                <NuclearControls key={`nuclear-${b.id}`} building={b} />
                <RoadAction tile={tile} />
                <button
                  className="secondary"
                  disabled={
                    pending ||
                    b.hp >= BUILDINGS[b.kind].hp * b.level ||
                    (!w.player.unlimitedAP && w.player.ap < 1) ||
                    !canAfford(w.player.wallet, { GOLD: 10, WOOD: 15 })
                  }
                  onClick={() => action('REPAIR')}
                >
                  <Hammer size={15} /> Réparer · 1 PA
                </button>
              </>
            ) : (
              <button className="secondary" onClick={() => useGame.setState({ panel: 'trade' })}>
                Ouvrir la diplomatie
              </button>
            )}
          </div>
        </>
      ) : null}
      <button
        className="close-selection icon-button"
        aria-label="Fermer la sélection"
        onClick={() =>
          useGame.setState({
            selection: null,
            mode: 'inspect',
            combatTarget: null,
            terraformTarget: undefined,
          })
        }
      >
        <X size={14} />
      </button>
    </section>
  );
}
function RightSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className="right-sidebar" aria-label="Guide de démarrage">
      <button
        className="sidebar-toggle right-toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={
          collapsed ? 'Afficher le tutoriel de démarrage' : 'Replier le tutoriel de démarrage'
        }
        title={collapsed ? 'Afficher le tutoriel' : 'Replier le tutoriel'}
      >
        {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
      <BeginnerTutorial />
    </aside>
  );
}
function BottomBar() {
  const w = useGame((s) => s.world)!,
    status = useGame((s) => s.status);
  return (
    <footer className="bottom-bar">
      <span>
        <i className={`presence-dot ${status === 'online' ? 'online' : ''}`} />
        {status === 'online' ? 'En ligne' : 'Reconnexion'}
        <b>·</b>
        {w.onlineHumans} souverain{w.onlineHumans > 1 ? 's' : ''} présent
        {w.onlineHumans > 1 ? 's' : ''}
      </span>
    </footer>
  );
}
function Defeat() {
  const w = useGame((s) => s.world)!,
    now = useGame((s) => s.now),
    pending = useGame((s) => s.pending),
    ready = w.player.defeatedAt! + RULES.defeatCooldown;
  return (
    <div className="modal-scrim">
      <section
        className="modal defeat-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Défaite du royaume"
      >
        <Sigil size={55} />
        <div className="eyebrow">LA BANNIÈRE EST TOMBÉE</div>
        <h2>La cendre n’est pas la fin.</h2>
        <p>
          Votre compte, vos reliques et votre histoire demeurent. Les survivants rassemblent ce qui
          peut être sauvé pour rebâtir ailleurs, avec une perte d’environ 25 % de valeur.
        </p>
        {now < ready && (
          <p className="defeat-countdown">
            <Hourglass size={18} />
            <Duration until={ready} />
          </p>
        )}
        <button
          className="primary"
          disabled={pending || now < ready}
          onClick={() => void send({ type: 'RESPAWN', actorId: w.player.id, payload: {} })}
        >
          Rebâtir mon royaume <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}

function PendingOrderIndicator() {
  const pending = useGame((s) => s.pending);
  const action = useGame((s) => s.pendingAction);
  const reduced = useGame((s) => s.world?.player.settings.reducedMotion);
  return pending ? (
    <div className="order-progress" role="status">
      <LoaderCircle className={reduced ? '' : 'spin'} size={14} />{' '}
      {action?.label ?? 'Ordre en cours'}…
    </div>
  ) : null;
}
