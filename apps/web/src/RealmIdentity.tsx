import {
  EMBLEM_IDS,
  EMBLEM_NAMES,
  REALM_PALETTES,
  type HeroAppearance,
  type RealmIdentity,
} from '@voidmarch/config';
import { Banner } from './Banner';
import { BANNER_PATTERNS, BANNER_SHAPES, MINI_FLAG_SHAPES, bannerContrast } from './banner-art';
import { symbols } from './emblems';
import { HeroPortrait } from './Hero';
import { Miniature, BUILDING_FRAMES } from './ui';

export function IdentityPalettes({
  value,
  onChange,
}: {
  value: RealmIdentity;
  onChange: (v: RealmIdentity) => void;
}) {
  return (
    <div className="identity-palettes" aria-label="Palettes du royaume">
      {REALM_PALETTES.map((p) => (
        <button
          key={p.name}
          type="button"
          title={p.name}
          aria-label={`Palette ${p.name}`}
          aria-pressed={
            value.bannerColor === p.primary &&
            value.bannerSecondary === p.secondary &&
            value.bannerAccent === p.accent
          }
          onClick={() =>
            onChange({
              ...value,
              bannerColor: p.primary,
              bannerSecondary: p.secondary,
              bannerAccent: p.accent,
            })
          }
        >
          <span style={{ background: p.primary }} />
          <span style={{ background: p.secondary }} />
          <span style={{ background: p.accent }} />
          <small>{p.name}</small>
        </button>
      ))}
    </div>
  );
}
export function IdentityEditor({
  value,
  onChange,
  section = 'all',
}: {
  value: RealmIdentity;
  onChange: (v: RealmIdentity) => void;
  section?: 'kingdom' | 'flags' | 'all';
}) {
  const update = (patch: Partial<RealmIdentity>) => onChange({ ...value, ...patch });
  return (
    <div className="identity-editor">
      {section !== 'flags' && (
        <>
          <label>
            Nom du royaume
            <input
              value={value.realmName}
              minLength={3}
              maxLength={40}
              onChange={(e) => update({ realmName: e.target.value })}
              placeholder="Les Marches de votre souverain"
            />
          </label>
          <h4>Votre emblème · {EMBLEM_IDS.length} symboles</h4>
          <div className="emblem-picker">
            {EMBLEM_IDS.map((id) => {
              const Icon = symbols[id];
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={`Emblème ${EMBLEM_NAMES[id]}`}
                  title={EMBLEM_NAMES[id]}
                  aria-pressed={value.emblem === id}
                  className={value.emblem === id ? 'active' : ''}
                  onClick={() => update({ emblem: id })}
                >
                  <Icon size={23} />
                </button>
              );
            })}
          </div>
          <IdentityPalettes value={value} onChange={onChange} />
          <div className="two-col">
            <label>
              Couleur principale · emblème et territoire
              <input
                type="color"
                value={value.bannerColor}
                onChange={(e) => update({ bannerColor: e.target.value })}
              />
            </label>
            <label>
              Couleur secondaire · fond et liseré
              <input
                type="color"
                value={value.bannerSecondary}
                onChange={(e) => update({ bannerSecondary: e.target.value })}
              />
            </label>
            <label>
              Motif du fond
              <select
                value={value.bannerPattern}
                onChange={(e) => update({ bannerPattern: e.target.value })}
              >
                {Object.entries(BANNER_PATTERNS).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            {value.bannerPattern !== 'plain' && (
              <label>
                Troisième couleur · motif
                <input
                  type="color"
                  value={value.bannerAccent}
                  onChange={(e) => update({ bannerAccent: e.target.value })}
                />
              </label>
            )}
            <label>
              Forme de bannière
              <select
                value={value.bannerShape}
                onChange={(e) => update({ bannerShape: e.target.value })}
              >
                {Object.entries(BANNER_SHAPES).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(bannerContrast(value.bannerColor, value.bannerSecondary) < 3 ||
            (value.bannerPattern !== 'plain' &&
              bannerContrast(value.bannerColor, value.bannerAccent) < 3)) && (
            <p className="banner-contrast-hint">
              Les couleurs sont proches : l’emblème sera moins lisible. Essayez un fond plus clair
              ou plus sombre.
            </p>
          )}
        </>
      )}
      {section !== 'kingdom' && (
        <>
          <label>
            Mini-drapeaux sur la carte
            <select
              value={value.miniFlagShape}
              onChange={(e) => update({ miniFlagShape: e.target.value })}
            >
              {Object.entries(MINI_FLAG_SHAPES).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="flag-choices">
            {Object.entries(MINI_FLAG_SHAPES).map(([id, name]) => (
              <button
                type="button"
                key={id}
                aria-label={`Drapeau ${name}`}
                aria-pressed={value.miniFlagShape === id}
                onClick={() => update({ miniFlagShape: id })}
              >
                <Banner settings={{ ...value, miniFlagShape: id }} mini size={65} />
                <small>{name}</small>
              </button>
            ))}
          </div>
          <p className="muted">
            Ces drapeaux identifient vos bâtiments. Les deux couleurs entourent vos unités ; votre
            territoire conserve la couleur principale.
          </p>
        </>
      )}
    </div>
  );
}
export function RealmPreview({
  value,
  appearance,
  username,
}: {
  value: RealmIdentity;
  appearance?: HeroAppearance;
  username: string;
}) {
  return (
    <aside className="identity-preview" aria-label="Aperçu du royaume en direct">
      <div className="eyebrow">VOTRE EMPREINTE DANS LES MARCHES</div>
      <h3>{value.realmName || `Marches de ${username || 'votre souverain'}`}</h3>
      <Banner settings={value} size={135} />
      <svg
        viewBox="0 0 360 280"
        className="identity-diorama"
        aria-label="Territoire et socle aux couleurs du royaume"
        role="img"
      >
        <g fill={value.bannerColor} fillOpacity=".3" stroke={value.bannerColor} strokeWidth="2">
          {[
            [-66, 0],
            [0, 0],
            [66, 0],
            [-33, 58],
            [33, 58],
            [0, -58],
          ].map(([x, y], i) => (
            <polygon
              key={i}
              transform={`translate(${180 + x} ${165 + y})`}
              points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19"
            />
          ))}
        </g>
        <ellipse
          cx="139"
          cy="225"
          rx="47"
          ry="17"
          fill="#16231c"
          stroke={value.bannerColor}
          strokeWidth="3"
        />
        <ellipse
          cx="139"
          cy="225"
          rx="41"
          ry="12"
          fill="none"
          stroke={value.bannerSecondary}
          strokeWidth="3"
        />
        <foreignObject x="0" y="0" width="360" height="280">
          <div className="identity-diorama-layer">
            <div className="identity-village">
              <Miniature frame={BUILDING_FRAMES.CAMP} size={160} />
            </div>
            <div className="identity-flag">
              <Banner settings={value} mini size={64} />
            </div>
            {appearance && (
              <div className="identity-hero">
                <HeroPortrait appearance={appearance} size={165} />
                <strong>{username || 'Votre pseudo'}</strong>
              </div>
            )}
          </div>
        </foreignObject>
      </svg>
      <p>Un héros unique. Un royaume à vos couleurs.</p>
      <small>
        Le héros garde son apparence après validation. Bannière et drapeaux restent modifiables dans
        votre profil.
      </small>
    </aside>
  );
}
