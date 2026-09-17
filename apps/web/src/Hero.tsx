import { useEffect, useState } from 'react';
import {
  HERO_LABELS,
  HERO_PALETTE,
  HERO_POWERS,
  heroAura,
  heroLevel,
  randomHeroAppearance,
  type HeroAppearance,
  type HeroPower,
} from '@voidmarch/config';
import { heroCanvas, loadHeroArt, HERO_VISIBLE_PARTS, type HeroVisualPart } from './hero-art';
import { canAfford } from '@voidmarch/game-rules';
import { useGame, send, focusHero } from './store';
export function HeroPortrait({
  appearance,
  size = 220,
}: {
  appearance: HeroAppearance;
  size?: number;
}) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true;
    void loadHeroArt()
      .then(() => {
        if (active) setSrc(heroCanvas(appearance).toDataURL());
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [JSON.stringify(appearance)]);
  return (
    <img
      className="hero-portrait"
      width={size}
      height={size}
      src={src || undefined}
      alt="Apparence du héros"
    />
  );
}
const labels: Record<HeroVisualPart, string> = {
  head: 'Tête',
  armor: 'Tenue et armure',
  boots: 'Bottes',
};
export function HeroCreator({
  value,
  onChange,
  name,
}: {
  value: HeroAppearance;
  onChange: (a: HeroAppearance) => void;
  name: string;
}) {
  const [part, setPart] = useState<HeroVisualPart>('head');
  return (
    <section className="hero-creator" aria-label="Personnaliser votre héros">
      <div className="hero-preview">
        <HeroPortrait appearance={value} />
        <strong>{name || 'Votre pseudo'}</strong>
        <small>Apparence définitive après inscription</small>
      </div>
      <div className="hero-customization">
        <h3>Votre héros, votre identité</h3>
        <p>
          15 choix par élément. Les couleurs et l’équipement sont visuels ; toutes les combinaisons
          ont les mêmes capacités.
        </p>
        <div className="catalog-tabs" role="tablist" aria-label="Éléments du héros">
          {HERO_VISIBLE_PARTS.map((p) => (
            <button
              type="button"
              role="tab"
              aria-selected={part === p}
              key={p}
              onClick={() => setPart(p)}
            >
              {labels[p]}
            </button>
          ))}
        </div>
        <label>
          {labels[part]}
          <select
            aria-label={labels[part]}
            value={value[part]}
            onChange={(e) => onChange({ ...value, [part]: Number(e.target.value) })}
          >
            {HERO_LABELS[part].map((n, i) => (
              <option key={n} value={i}>
                {i + 1}. {n}
              </option>
            ))}
          </select>
        </label>
        <div className="hero-palette">
          {HERO_PALETTE.map((color) => (
            <button
              type="button"
              key={color}
              style={{ background: color }}
              aria-label={`Couleur ${color}`}
              aria-pressed={value.colors[part] === color}
              onClick={() => onChange({ ...value, colors: { ...value.colors, [part]: color } })}
            />
          ))}
        </div>
        <label className="hero-color">
          Couleur personnalisée
          <input
            type="color"
            aria-label={`Couleur ${labels[part]}`}
            value={value.colors[part]}
            onChange={(e) =>
              onChange({ ...value, colors: { ...value.colors, [part]: e.target.value } })
            }
          />
        </label>
        <button
          type="button"
          className="secondary"
          onClick={() => onChange(randomHeroAppearance())}
        >
          Apparence aléatoire
        </button>
      </div>
    </section>
  );
}
export function HeroControls({ inSelection = false }: { inSelection?: boolean }) {
  const world = useGame((s) => s.world),
    pending = useGame((s) => s.pending);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = world?.player.hero;
  if (!world || !h) return null;
  const unit = world.units.find((u) => u.ownerId === world.player.id && u.kind === 'HERO');
  const ready = unit && !world.player.defeatedAt;
  return (
    <section className="hero-controls">
      <div className="hero-summary">
        {!inSelection && <HeroPortrait appearance={h.appearance} size={76} />}
        <div>
          <strong>{world.player.name} · Héros</strong>
          <p>
            Grade {heroLevel(h.xp)} · {h.xp}/60 expérience · Aura +
            {Math.round(heroAura(h.xp) * 100)} % attaque et défense à 2 cases.
          </p>
          <small>
            Hors combat : retour après 5 min. Ni attaque directe, ni capture. Apparence permanente.
          </small>
        </div>
      </div>
      {!ready ? (
        <p>
          {world.player.defeatedAt
            ? 'Reconstruisez le royaume pour retrouver votre héros.'
            : h.recoverAt && h.recoverAt > now
              ? `Convalescence : ${Math.ceil((h.recoverAt - now) / 1000)} s`
              : 'En attente d’une case libre près de la capitale.'}
        </p>
      ) : (
        <>
          {!inSelection && (
            <button className="secondary" onClick={focusHero}>
              Retrouver mon héros
            </button>
          )}
          <div className="hero-powers">
            {(Object.keys(HERO_POWERS) as HeroPower[]).map((power) => {
              const p = HERO_POWERS[power],
                remaining = Math.max(0, Math.ceil(((h.cooldowns[power] ?? 0) - now) / 1000));
              return (
                <div key={power}>
                  <button
                    className="secondary"
                    disabled={
                      pending ||
                      remaining > 0 ||
                      (!world.player.unlimitedAP && world.player.ap < 2) ||
                      !canAfford(world.player.wallet, p.cost)
                    }
                    title={p.description}
                    onClick={() =>
                      void send({ type: 'ABILITY', actorId: unit.id, payload: { ability: power } })
                    }
                  >
                    {p.name} · 2 PA{remaining ? ` · ${remaining} s` : ''}
                  </button>
                  <small>{p.description} Recharge : 5 min.</small>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
