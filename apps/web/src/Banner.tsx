import type { Settings } from '@voidmarch/config';
import { bannerDataUrl, bannerDesign, type BannerDesign } from './banner-art';
export function Banner({
  settings,
  design,
  size = 70,
  mini = false,
}: {
  settings?: Partial<Settings>;
  design?: BannerDesign;
  size?: number;
  mini?: boolean;
}) {
  return (
    <img
      className="player-banner"
      src={bannerDataUrl(design ?? bannerDesign(settings ?? {}), mini)}
      width={size}
      height={size * 0.7}
      alt={mini ? 'Mini-drapeau du royaume' : 'Bannière du royaume'}
    />
  );
}
export function BannerPreview({ settings }: { settings: Partial<Settings> }) {
  const d = bannerDesign(settings);
  return (
    <div className="banner-preview" aria-label="Aperçu de votre identité">
      <div>
        <Banner design={d} size={160} />
        <span>Bannière</span>
      </div>
      <div>
        <svg
          viewBox="0 0 100 70"
          width="100"
          height="70"
          role="img"
          aria-label="Socle bicolore des unités et héros"
        >
          <ellipse
            cx="50"
            cy="38"
            rx="40"
            ry="17"
            fill="#101814"
            stroke={d.primary}
            strokeWidth="3"
          />
          <ellipse
            cx="50"
            cy="38"
            rx="35"
            ry="13"
            fill="none"
            stroke={d.secondary}
            strokeWidth="2"
          />
        </svg>
        <span>Socle des troupes</span>
      </div>
      <div>
        <div className="mini-banner-preview">
          <span style={{ borderColor: d.primary, background: d.secondary }}>3 ↑</span>
          <Banner design={d} mini size={54} />
        </div>
        <span>Mini-drapeau et niveau</span>
      </div>
    </div>
  );
}
