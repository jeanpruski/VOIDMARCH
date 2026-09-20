import { createSecretCodeInput, SPARKLE_TOGGLE_EVENT } from './secret-codes';
import { FoundBase } from './FoundBase';
import { VigieControls } from './VigieControls';
import { MobilityControls, MobilityCounters, movementHint } from './MobilityControls';
import { anomalyAPReward } from '@voidmarch/game-rules';
import { ExpeditionInteraction } from './Expeditions';
import { fishingYield, coastlineHelp } from '@voidmarch/game-rules';
import { eventAvailable } from './world-events';
import { Supplies } from './Supplies';
import { repairPlan } from '@voidmarch/game-rules';
import { Banner } from './Banner';
import { BiomeAdaptation } from './BiomeAdaptation';
import { movementBiome, unitMovementBudget } from '@voidmarch/game-rules';
import { UnitTrainingDetails } from './UnitTrainingDetails';
import { ArmySupport } from './ArmySupport';
import { BIOMES, isSea } from '@voidmarch/config';
import { TransportControls } from './TransportControls';
import { VictoryReport } from './VictoryReport';
import { GroupMovement } from './GroupMovement';
import { TerrainAffinities } from './TerrainAffinities';
import { unitCombatStats } from '@voidmarch/game-rules';
import { constructionSiteReason } from './construction';
import { ActionButton, activateSelectionShortcut } from './ActionButton';
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
  Award,
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
import { LogisticsControls } from './LogisticsControls';
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
const nav: { panel: Panel; label: string; icon: typeof Crown }[] = [
  { panel: 'realm', label: 'Royaume', icon: Crown },
  { panel: 'rank', label: 'Les royaumes', icon: Flag },
  { panel: 'army', label: 'Armées', icon: Swords },
  { panel: 'cities', label: 'Villes & domaines', icon: Castle },
  { panel: 'economy', label: 'Économie', icon: TrendingUp },
  { panel: 'trade', label: 'Commerce & diplomatie', icon: Handshake },
  { panel: 'missions', label: 'Missions', icon: Swords },
  { panel: 'trophies', label: 'Salle des trophées', icon: Award },
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
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.matches('input, textarea, select, [role="textbox"]') || target.isContentEditable);
    const blocked = () =>
      editable(document.activeElement) || !!document.querySelector('[role="dialog"]');
    const codes = createSecretCodeInput(
      (kind, code) => {
        if (kind === 'sparkle') {
          window.dispatchEvent(new Event(SPARKLE_TOGGLE_EVENT));
          return;
        }
        const route =
          kind === 'vigie' ? 'vigie' : kind === 'radar' ? 'capital-radar' : 'unlimited-ap';
        void api<{ enabled: boolean }>(`/admin/${route}`, { code })
          .then(({ enabled }) =>
            notify(
              kind === 'vigie'
                ? enabled
                  ? 'Vigie activée : choisissez un royaume à observer.'
                  : 'Vigie désactivée.'
                : kind === 'radar'
                  ? enabled
                    ? 'Repérage des capitales activé.'
                    : 'Repérage des capitales désactivé.'
                  : enabled
                    ? 'PA, carburant et pervitine illimités activés.'
                    : 'PA, carburant et pervitine illimités désactivés.',
            ),
          )
          .catch(() => {});
      },
      (key) => {
        const state = useGame.getState();
        if (!blocked() && state.world && !state.pending) activateSelectionShortcut(key);
      },
    );
    const t = setInterval(() => useGame.setState((s) => ({ now: s.now + 1000 })), 1000);
    const keyboard = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) {
        codes.reset();
        return;
      }
      if (e.composedPath().some(editable) || document.querySelector('[role="dialog"]')) {
        codes.reset();
        return;
      }
      if (codes.key(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (e.key === 'Escape')
        useGame.setState({
          selectedUnitIds: [],
          selectedArmyId: null,
          groupTarget: null,
          multiSelect: false,
          panel: null,
          combatTarget: null,
          mode: 'inspect',
          menuOpen: false,
          constructionBuilderId: null,
        });
      const state = useGame.getState();
      if (state.world && !state.pending && activateSelectionShortcut(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', keyboard, true);
    window.addEventListener('pointerdown', codes.reset, true);
    window.addEventListener('focusin', codes.reset);
    window.addEventListener('blur', codes.reset);
    return () => {
      clearInterval(t);
      window.removeEventListener('keydown', keyboard, true);
      window.removeEventListener('pointerdown', codes.reset, true);
      window.removeEventListener('focusin', codes.reset);
      window.removeEventListener('blur', codes.reset);
      codes.reset();
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
          <VigieControls />
          <NuclearAlerts />
          {!world.player.vigieTargetId && <SelectionPanel />}
          <div className="coordinate-bar">
            <Map size={12} />
            <TileHint />
          </div>
        </main>
        <RightSidebar collapsed={collapsedSides.right} onToggle={() => toggleSide('right')} />
      </div>
      <VictoryReport />
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
      <MobilityCounters />
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
        <span
          className="ap-countdown"
          title="Les PA de départ et des anomalies peuvent dépasser le plafond. La régénération reprend sous 20 PA."
        >
          {p.unlimitedAP ? (
            'PA ILLIMITÉS'
          ) : ap >= RULES.maxAP ? (
            ap > RULES.maxAP ? (
              `RÉSERVE BONUS · +${ap - RULES.maxAP}`
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
        <Banner settings={p.settings} size={90} />
        <div className="eyebrow">{FACTIONS[p.faction].short}</div>
        <h2>{p.settings.realmName || p.name}</h2>
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
            {n.panel === 'trade' && pending > 0 ? <b className="nav-count">{pending}</b> : null}
          </button>
        ))}
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
        <nav className="sidebar-help" aria-label="Aide du jeu">
          <button onClick={() => useGame.setState({ panel: 'help', menuOpen: false })}>
            <CircleHelp size={17} />
            <span>Aide & règles</span>
          </button>
        </nav>
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
  const reason = constructionSiteReason(w, tile);
  return reason ? (
    <p className="tile-build-hint">{reason}</p>
  ) : (
    <ActionButton
      shortcut="C"
      className="primary"
      onClick={() => useGame.setState({ panel: 'build' })}
    >
      <Hammer size={15} /> Construire <small>1 PA + ressources</small>
    </ActionButton>
  );
}

function MapTools() {
  const settings = useGame((s) => s.world)!.player.settings;
  const roadMode = useGame((s) => s.mode) === 'road';
  const showUnits = useGame((s) => s.showUnits);
  const showBuildings = useGame((s) => s.showBuildings);
  return (
    <div className="map-tools">
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
      {tile?.terrain && tile.biome ? ` · Biome ${BIOMES[tile.biome].name.toLowerCase()}` : ''}
      {w.player.settings.coordinates && hover ? ` · q ${hover.q}, r ${hover.r}` : ''}
    </span>
  );
}
function SelectionPanel() {
  const now = useGame((s) => s.now);
  const selectedUnitIds = useGame((s) => s.selectedUnitIds);
  const multiSelect = useGame((s) => s.multiSelect);
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
    visible = !!(u || b || selection?.kind === 'tile'),
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
  }, [visible, selection?.kind, selection?.id, mode, selectedUnitIds.length]);
  if (selectedUnitIds.length > 1)
    return (
      <section
        ref={panelRef}
        className="selection-panel group-selection-panel"
        aria-label="Sélection de troupes"
      >
        <GroupMovement />
      </section>
    );
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
    <section
      ref={panelRef}
      className={`selection-panel${selection.kind === 'tile' ? ' terrain-selection' : ''}`}
      aria-label="Sélection actuelle"
    >
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
          {u && own && !u.npc && !UNIT_PROFILES[u.kind].hero && !UNIT_PROFILES[u.kind].builder ? (
            <UnitTrainingDetails
              key={u.id}
              unit={u}
              terrain={tile?.terrain}
              biome={movementBiome(w.seed, tile)}
              buildings={w.tiles.flatMap((t) =>
                t.building?.ownerId === u.ownerId ? [t.building] : [],
              )}
            />
          ) : u?.trainingBonus ? (
            <span className="rare-tag">Entraînement · +{format(u.trainingBonus)} %</span>
          ) : null}
          {u?.rareBonus && (
            <span className="rare-tag" title="Bonus permanent aux PV, à l’attaque et à la défense">
              ✦ Rare · +{format(u.rareBonus)} %
            </span>
          )}
          {!u && !b && tile?.terrain && tile.biome && (
            <span className="biome-label">Biome {BIOMES[tile.biome].name.toLowerCase()}</span>
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
              <strong>{format(unitCombatStats(u, tile?.terrain).attack)}</strong>
            </div>
            <div>
              <span>DÉFENSE</span>
              <strong>{format(unitCombatStats(u, tile?.terrain).defense)}</strong>
            </div>
            <div>
              <span>MOUV.</span>
              <strong>
                {unitMovementBudget(
                  u,
                  movementBiome(w.seed, tile),
                  own ? w.player.faction : w.realms.find((r) => r.id === u.ownerId)?.faction,
                )}
              </strong>
            </div>
            <div>
              <span>VISION</span>
              <strong>{unitStats(u).vision}</strong>
            </div>
          </div>
          {UNIT_PROFILES[u.kind].naval && (
            <ContextHelp title="Navigation et rôle du navire">
              <p>{UNIT_PROFILES[u.kind].role}</p>
              <p>
                Navigation en mer et eaux côtières uniquement. Un déplacement coûte 1 PA, dans la
                limite de la portée indiquée ; les routes terrestres ne s’appliquent pas. Les ports
                ravitaillent à deux cases.
              </p>
              {!!UNIT_PROFILES[u.kind].sonar && (
                <p>
                  Sonar : détecte les sous-marins à {UNIT_PROFILES[u.kind].sonar} cases. Un contact
                  hors de votre vision reste masqué.
                </p>
              )}
            </ContextHelp>
          )}
          {own && UNIT_PROFILES[u.kind].submarine && (
            <p className="catalog-brief">
              {(u.revealedUntil ?? 0) > now
                ? `Sous-marin révélé après tir : encore ${Math.ceil(((u.revealedUntil ?? 0) - now) / 1000)} s.`
                : 'Sous-marin immergé · détectable uniquement par un sonar ennemi proche.'}
            </p>
          )}
          {own && <Supplies units={[u]} />}
          <ArmySupport bonus={u.supportBonus} />
          {!!u.foodPenalty && (
            <span className="negative">
              Pénurie de vivres · −{format(u.foodPenalty)} % d’attaque
            </span>
          )}
          {!u.npc && (
            <TerrainAffinities
              kind={u.kind}
              supportBonus={u.supportBonus}
              terrain={tile?.terrain}
              collapsible
            />
          )}
          {!u.npc && (
            <BiomeAdaptation kind={u.kind} biome={movementBiome(w.seed, tile)} showStatus />
          )}
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
          {own && <TransportControls key={`transport:${u.id}`} unit={u} />}
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
                {UNIT_PROFILES[u.kind].builder && (
                  <ActionButton
                    shortcut="C"
                    className="secondary"
                    title="Construire sur la case du bâtisseur. Pour bâtir à côté, sélectionnez d’abord une case voisine éclairée."
                    onClick={() => {
                      if (tile?.building) {
                        notify(
                          'Cette case contient déjà un bâtiment. Sélectionnez une case libre autour du bâtisseur.',
                          true,
                        );
                        return;
                      }
                      select({ kind: 'tile', q: u.q, r: u.r });
                      useGame.setState({ panel: 'build' });
                    }}
                  >
                    <Hammer size={15} />
                    Construire <small>1 PA + ressources</small>
                  </ActionButton>
                )}
                <ActionButton
                  shortcut="D"
                  className={`primary ${mode === 'move' ? 'chosen' : ''}`}
                  disabled={pending}
                  onClick={() =>
                    useGame.setState({
                      mode: mode === 'move' ? 'inspect' : 'move',
                      multiSelect: false,
                      groupTarget: null,
                    })
                  }
                  title={
                    'Déplacement gratuit et sans limite de distance sur un trajet continu de routes explorées et de vos enceintes fermées. Ailleurs : portée normale. Les obstacles et terrains impraticables restent bloquants.'
                  }
                >
                  <ArrowUpRight size={16} />
                  {mode === 'move' ? 'Choisir une destination' : 'Déplacer'}
                  <small>
                    Gratuit sur routes / enceintes · sinon {movementHint(u.kind, w.player)}
                  </small>
                </ActionButton>
                {u.kind === 'PEASANT' && <FoundBase key={u.id} unit={u} />}
                <button
                  disabled={pending}
                  aria-pressed={multiSelect}
                  title="Maj + clic sur vos troupes, ou activez ce bouton puis cliquez sur les unités à ajouter."
                  onClick={() =>
                    useGame.setState({
                      multiSelect: !multiSelect,
                      mode: 'inspect',
                      constructionBuilderId: null,
                    })
                  }
                >
                  <Users size={15} />{' '}
                  {multiSelect ? 'Sélection multiple active' : 'Sélection multiple'}
                </button>
                {(tile?.road || tile?.enclosureOwnerId === w.player.id) && (
                  <span className="road-status">
                    Enceintes fermées + routes : déplacement gratuit et illimité
                  </span>
                )}
                <ActionButton
                  shortcut="A"
                  className="secondary"
                  disabled={
                    pending ||
                    (!w.player.unlimitedAP && w.player.ap < 1) ||
                    unitStats(u).attack === 0
                  }
                  onClick={() => useGame.setState({ mode: 'attack' })}
                >
                  <Swords size={15} /> Attaquer · {UNIT_PROFILES[u.kind].siege ? 2 : 1} PA
                </ActionButton>
                <ActionButton
                  shortcut="Q"
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
                </ActionButton>
                <ActionButton
                  shortcut="S"
                  className="secondary"
                  title={`${repairPlan(u, now).underFire ? 'Sous le feu : soins réduits, un soin toutes les 30 secondes. ' : ''}Restaure ${format(repairPlan(u, now).restored)} PV${repairPlan(u, now).supplied ? ' · consomme 1 provision' : ''}. Coût proportionnel aux PV restaurés et au prix de recrutement.`}
                  aria-label={
                    UNIT_PROFILES[u.kind].mechanical || UNIT_PROFILES[u.kind].naval
                      ? 'Réparer le véhicule'
                      : 'Soigner l’unité'
                  }
                  disabled={
                    pending ||
                    u.hp >= unitStats(u).hp ||
                    (!w.player.unlimitedAP && w.player.ap < 1) ||
                    !!repairPlan(u, now).reason ||
                    !canAfford(w.player.wallet, repairPlan(u, now).cost)
                  }
                  onClick={() => action('REPAIR')}
                >
                  <Plus size={17} />{' '}
                  {UNIT_PROFILES[u.kind].mechanical || UNIT_PROFILES[u.kind].naval
                    ? 'Réparer'
                    : 'Soigner'}{' '}
                  · 1 PA · +{format(repairPlan(u, now).restored)} PV{' '}
                  <Cost cost={repairPlan(u, now).cost} wallet={w.player.wallet} />
                </ActionButton>
                {UNIT_PROFILES[u.kind].fishing && (
                  <ActionButton
                    disabled={
                      pending ||
                      !fishingYield(u, tile) ||
                      (!w.player.unlimitedAP && w.player.ap < 1) ||
                      w.player.wallet.FOOD >= w.player.capacity
                    }
                    onClick={() =>
                      void send({ type: 'GATHER', actorId: u.id, payload: { resource: 'FOOD' } })
                    }
                  >
                    Pêcher +{UNIT_PROFILES[u.kind].fishing} vivres · 1 PA
                  </ActionButton>
                )}
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
                      <ActionButton
                        shortcut={
                          { WOOD: 'B', STONE: 'P', IRON: 'F', FOOD: 'V', GOLD: 'O' }[resource]
                        }
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
                      </ActionButton>
                    );
                  })}
                {u.kind === 'TERRAFORMER' && (
                  <ActionButton
                    shortcut="T"
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
                  </ActionButton>
                )}
                {UNIT_PROFILES[u.kind].builder && <RoadAction tile={tile} />}
                {u.kind !== 'PEASANT' && u.kind !== 'HERO' && (
                  <ActionButton
                    shortcut="R"
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
                  </ActionButton>
                )}
                {tile?.poi && !tile.exhausted && (
                  <ActionButton
                    shortcut="X"
                    className="secondary"
                    onClick={() => void send({ type: 'INTERACT', actorId: u.id, payload: {} })}
                  >
                    Fouiller · 1 PA{' '}
                    <small>Butin : +{anomalyAPReward(w.seed, key(u))} PA et ressources</small>
                  </ActionButton>
                )}
                {[w.missions?.active, ...(w.missions?.allied ?? [])]
                  .filter((m) => m?.expedition)
                  .map((m) => (
                    <ExpeditionInteraction key={m!.id} mission={m!} unit={u} />
                  ))}
                {w.events
                  .filter(
                    (e) =>
                      eventAvailable(e, Math.max(now, w.serverTimestamp)) &&
                      distance(e, u) <= 1 &&
                      (!!UNIT_PROFILES[u.kind].naval ||
                        !isSea(
                          w.tiles.find((t) => t.q === e.q && t.r === e.r)?.terrain ?? 'PLAIN',
                        )),
                  )
                  .map((e, index) => (
                    <ActionButton
                      shortcut={index === 0 ? 'E' : undefined}
                      className="secondary"
                      key={e.id}
                      onClick={() =>
                        void send({ type: 'INTERACT', actorId: u.id, payload: { eventId: e.id } })
                      }
                    >
                      <Eye size={14} /> Explorer l’anomalie · 1 PA
                      <small>Butin : +{anomalyAPReward(w.seed, e.id)} PA et ressources</small>
                    </ActionButton>
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
                  .map((c, index) => (
                    <ActionButton
                      shortcut={index === 0 ? 'I' : undefined}
                      className="secondary"
                      key={c.id}
                      onClick={() =>
                        void send({ type: 'INTERACT', actorId: u.id, payload: { caravanId: c.id } })
                      }
                    >
                      Intercepter · 1 PA
                    </ActionButton>
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
            {b.kind === 'NUCLEAR_REACTOR' && <span>☢ Source radioactive · rayon de 1 case</span>}
            {turretStats(b) && (
              <span>
                {turretStats(b)?.name} · niveau {b.turretLevel ?? b.level}/5 · ATQ{' '}
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
          {b.kind === 'NUCLEAR_REACTOR' && (
            <ContextHelp title="☢ Radioactivité et confinement">
              <p>
                En fonctionnement, le Réacteur noir peut contaminer sa case et les six voisines. Les
                contours et le voile verts indiquent les cases contaminées. Dès 30 points de
                contamination, la production de ressources des bâtiments touchés est divisée par
                deux.
              </p>
              <p>
                Un laboratoire isotopique à trois cases maximum réduit les émissions de 2 points par
                niveau ; au niveau 3, il les bloque complètement. La contamination déjà présente se
                dissipe progressivement.
              </p>
              <p>
                Un ingénieur ou un terrassier peut nettoyer jusqu’à sept cases pour 2 PA, 20 or et
                50 fer.
              </p>
            </ContextHelp>
          )}
          <div
            className="selection-actions"
            role="toolbar"
            aria-label="Actions de la sélection, défilement horizontal"
          >
            {own ? (
              <>
                <ActionButton
                  shortcut="R"
                  className="primary"
                  disabled={!Object.values(UNIT_PROFILES).some((p) => p.recruitAt.includes(b.kind))}
                  onClick={() => useGame.setState({ panel: 'recruit' })}
                >
                  <Users size={15} /> Recruter
                </ActionButton>
                <UpgradeBuilding key={b.id} building={b} />
                <LogisticsControls key={`logistics-${b.id}`} building={b} />
                <MobilityControls key={`mobility-${b.id}`} building={b} />
                {(isWall(b.kind) || b.kind === 'COASTAL_BATTERY') && (
                  <TurretControls key={`turret-${b.id}`} building={b} />
                )}
                {repairPlan(b, now).underFire && (
                  <p className="negative">
                    Sous le feu : réparation limitée à 10 % des PV toutes les 30 s ; amélioration
                    après 90 s sans dégâts. {repairPlan(b, now).reason}
                  </p>
                )}
                <DemolishBuilding key={`demolish-${b.id}`} building={b} />
                <NuclearControls key={`nuclear-${b.id}`} building={b} />
                <RoadAction tile={tile} />
                <ActionButton
                  shortcut="S"
                  className="secondary"
                  disabled={
                    pending ||
                    b.hp >= BUILDINGS[b.kind].hp * b.level ||
                    (!w.player.unlimitedAP && w.player.ap < 1) ||
                    !!repairPlan(b, now).reason ||
                    !canAfford(w.player.wallet, repairPlan(b, now).cost)
                  }
                  onClick={() => action('REPAIR')}
                >
                  <Hammer size={15} /> Réparer · 1 PA · +{format(repairPlan(b, now).restored)} PV{' '}
                  <Cost cost={repairPlan(b, now).cost} wallet={w.player.wallet} />
                </ActionButton>
              </>
            ) : (
              <button className="secondary" onClick={() => useGame.setState({ panel: 'trade' })}>
                Ouvrir la diplomatie
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="tile-description">
            <span>
              Hexagone {format(selection.q)}, {format(selection.r)}
            </span>
            {tile?.terrain && tile.visibility !== 'UNKNOWN' ? (
              <>
                <p>
                  {tile.ownerId && !own
                    ? 'Récolte réservée au propriétaire.'
                    : (() => {
                        const resources = RESOURCES.filter((r) =>
                          canGather(
                            { terrain: tile.terrain!, ownerId: tile.ownerId },
                            w.player.id,
                            r,
                          ),
                        );
                        return resources.length
                          ? `Récolte avec un paysan sur cette case : ${resources.map((r) => RESOURCE_NAMES[r]).join(', ')} · 1 PA.`
                          : 'Aucune ressource récoltable sur ce terrain.';
                      })()}
                </p>
                {coastlineHelp(tile) && <p>{coastlineHelp(tile)}</p>}
                <span>
                  Bonus de défense du terrain : +{format(TERRAINS[tile.terrain].defense)}
                  {tile.road ? ' · Route présente' : ''}
                </span>
              </>
            ) : (
              <p>Explorez cette case pour découvrir son terrain et ses ressources.</p>
            )}
          </div>
          <div className="selection-actions" aria-label="Actions du terrain">
            <TileConstructionAction />
          </div>
        </>
      )}
      <button
        className="close-selection icon-button"
        aria-label="Fermer la sélection"
        onClick={() =>
          useGame.setState({
            selection: null,
            selectedUnitIds: [],
            groupTarget: null,
            multiSelect: false,
            constructionBuilderId: null,
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
      <button
        className="online-players-trigger"
        title="Voir qui est connecté"
        aria-label={`Voir les joueurs connectés : ${w.onlineHumans}`}
        aria-haspopup="dialog"
        onClick={() => useGame.setState({ panel: 'online', combatTarget: null })}
      >
        <i className={`presence-dot ${status === 'online' ? 'online' : ''}`} />
        {status === 'online' ? 'En ligne' : 'Reconnexion'}
        <b>·</b>
        {w.onlineHumans} souverain{w.onlineHumans > 1 ? 's' : ''} présent
        {w.onlineHumans > 1 ? 's' : ''}
      </button>
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
