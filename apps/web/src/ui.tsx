import {
  Coins,
  Trees,
  Pickaxe,
  Mountain,
  Wheat,
  Crown,
  Sword,
  Eye,
  Castle,
  Bird,
  Star,
  KeyRound,
  Bell,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, useRef, type ReactNode } from 'react';
import { miniatureAtlasUrl } from './sprite-atlas';
import { RESOURCES, RESOURCE_NAMES, type Resource, type Wallet } from '@voidmarch/config';
import { useGame } from './store';
export const resourceIcons: Record<Resource, LucideIcon> = {
  STONE: Mountain,
  GOLD: Coins,
  WOOD: Trees,
  IRON: Pickaxe,
  FOOD: Wheat,
};
export const symbols: Record<string, LucideIcon> = {
  crown: Crown,
  sword: Sword,
  eye: Eye,
  tower: Castle,
  bird: Bird,
  star: Star,
  key: KeyRound,
  bell: Bell,
};
export const format = (n: number) => Math.floor(n).toLocaleString('fr-FR');
export function Duration({ until }: { until: number }) {
  const now = useGame((s) => s.now),
    seconds = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <>
      {seconds >= 3600
        ? `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`
        : `${Math.floor(seconds / 60)
            .toString()
            .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`}
    </>
  );
}
export function Sigil({
  symbol = 'crown',
  color,
  size = 36,
}: {
  symbol?: string;
  color?: string;
  size?: number;
}) {
  const Icon = symbols[symbol] ?? Crown;
  return (
    <span className="sigil" style={{ color, width: size + 22, height: size + 32 }}>
      <Icon size={size} strokeWidth={1.15} />
    </span>
  );
}
export function Cost({ cost, wallet }: { cost: Partial<Wallet>; wallet?: Wallet }) {
  return (
    <span className="cost">
      {RESOURCES.filter((r) => (cost[r] ?? 0) > 0).map((r) => {
        const Icon = resourceIcons[r];
        const shortage = wallet ? Math.max(0, Math.ceil(cost[r]! - wallet[r])) : 0;
        const label = wallet
          ? `${RESOURCE_NAMES[r]} : coût ${cost[r]}, stock ${format(wallet[r])}${shortage ? `, il manque ${shortage}` : ''}`
          : RESOURCE_NAMES[r];
        return (
          <span
            key={r}
            title={label}
            aria-label={label}
            className={shortage ? 'cost-insufficient' : undefined}
          >
            <Icon size={13} />
            {format(cost[r]!)}
          </span>
        );
      })}
    </span>
  );
}
export function Modal({
  title,
  eyebrow,
  toolbar,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  toolbar?: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (close.current) close.current();
        else useGame.setState({ panel: null, combatTarget: null });
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href], [tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
      const first = controls[0],
        last = controls.at(-1);
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', keyboard, true);
    return () => {
      window.removeEventListener('keydown', keyboard, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          if (onClose) onClose();
          else useGame.setState({ panel: null, combatTarget: null });
        }
      }}
    >
      <section
        ref={dialog}
        tabIndex={-1}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2>{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Fermer"
            onClick={onClose ?? (() => useGame.setState({ panel: null, combatTarget: null }))}
          >
            <X size={20} />
          </button>
        </header>
        {toolbar}
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
export const UNIT_FRAMES: Record<string, number> = {
  RIFLEMAN: 48,
  STORMTROOPER: 49,
  MACHINE_GUNNER: 50,
  SNIPER: 51,
  BAZOOKA: 52,
  OFFICER: 53,
  MOTORCYCLE: 54,
  ARMORED_CAR: 55,
  TANK: 56,
  FIELD_GUN: 57,
  ROCKET_LAUNCHER: 58,
  IRON_REVENANT: 59,

  PEASANT: 24,
  MILITIA: 25,
  SPEARMAN: 26,
  CROSSBOW: 27,
  RANGER: 28,
  LIGHT_CAVALRY: 29,
  PALADIN: 30,
  RAM: 31,
  HEALER: 32,
  ENGINEER: 33,
  BERSERKER: 34,
  VOID_ACOLYTE: 35,

  SCOUT: 0,
  INFANTRY: 1,
  GUARD: 2,
  ARCHER: 3,
  KNIGHT: 4,
  SIEGE: 5,
};
export const BUILDING_FRAMES: Record<string, number> = {
  QUARRY: 12,
  ARSENAL: 60,
  BUNKER: 61,
  GARAGE: 62,
  TANK_FACTORY: 63,
  REFINERY: 64,
  MUNITIONS: 65,
  RADIO: 66,
  FIELD_HOSPITAL: 67,
  GUN_BATTERY: 68,
  OCCULT_LAB: 69,
  ROCKET_SILO: 70,
  RAIL_DEPOT: 71,

  CAMP: 36,
  HOUSE: 37,
  GRANARY: 38,
  HUNTER: 39,
  FISHERY: 40,
  STABLE: 41,
  ARCHERY: 42,
  MONASTERY: 43,
  FORGE: 44,
  LIBRARY: 45,
  BAKERY: 46,
  WELL: 47,

  OUTPOST: 6,
  VILLAGE: 7,
  FARM: 10,
  LUMBER: 11,
  MINE: 12,
  MARKET: 13,
  WAREHOUSE: 14,
  WORKSHOP: 15,
  BARRACKS: 16,
  FORT: 17,
  TOWER: 18,
};
export const miniatureTexture = (frame: number) =>
  frame >= 48 ? 'industrial' : frame >= 24 ? 'expansion' : 'miniatures';
export const miniatureFrame = (frame: number) => frame % 24;
export function Miniature({ frame, size = 76 }: { frame: number; size?: number }) {
  const texture = miniatureTexture(frame);
  const [atlas, setAtlas] = useState<{ texture: string; url: string }>();
  useEffect(() => {
    let active = true;
    void miniatureAtlasUrl(texture)
      .then((url) => {
        if (active) setAtlas({ texture, url });
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [texture]);
  return (
    <span
      className="miniature"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundImage: atlas?.texture === texture ? `url(${atlas.url})` : 'none',
        backgroundSize: '600% 400%',
        backgroundPosition: `${(frame % 6) * 20}% ${(Math.floor((frame % 24) / 6) * 100) / 3}%`,
      }}
    />
  );
}
