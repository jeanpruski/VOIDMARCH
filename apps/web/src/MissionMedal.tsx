import { useId } from 'react';
import { emblemIcon } from './emblems';
import type { MissionMedal as Medal } from '@voidmarch/shared';

const ribbons = {
  crimson: '#742d35',
  pine: '#28564b',
  midnight: '#293f62',
  violet: '#55416c',
  ochre: '#826637',
  slate: '#4c5e60',
  teal: '#27777b',
  ivory: '#c8bc91',
  amber: '#b47725',
  black: '#27252d',
};
const gems = {
  ruby: '#c95159',
  emerald: '#49ac7a',
  sapphire: '#629cdc',
  amber: '#f0bd5e',
  amethyst: '#b283d2',
  onyx: '#69717a',
};
const radialPoints = (sides: number, outer: number, inner = outer) =>
  Array.from({ length: sides }, (_, i) => {
    const a = (i * Math.PI * 2) / sides - Math.PI / 2,
      r = i % 2 ? inner : outer;
    return `${80 + Math.cos(a) * r},${100 + Math.sin(a) * r}`;
  }).join(' ');
const metals = {
  bronze: ['#f5d6a0', '#b48550', '#654125', '#3b291b'],
  silver: ['#f8f7df', '#bac9c4', '#657976', '#344746'],
  gold: ['#fff1bb', '#d7b665', '#947032', '#53421e'],
};
export function MissionMedal({ medal, level = 1 }: { medal: Medal; level?: number }) {
  const id = useId().replace(/:/g, '');
  const metal = metals[medal.metal],
    ribbon = ribbons[medal.ribbon],
    Icon = emblemIcon(medal.emblem);
  const jewel = medal.gem ? gems[medal.gem] : metal[1];
  const shape =
    medal.shape === 'round' ? (
      <circle cx="80" cy="100" r="46" />
    ) : medal.shape === 'shield' ? (
      <path d="M35 58 Q80 47 125 58 L120 105 Q114 133 80 151 Q46 133 40 105Z" />
    ) : medal.shape === 'diamond' ? (
      <path d="M80 49 L128 99 L80 151 L32 99Z" />
    ) : medal.shape === 'cross' ? (
      <path d="M60 49 H100 L96 77 L130 80 V120 L96 123 L100 151 H60 L64 123 L30 120 V80 L64 77Z" />
    ) : medal.shape === 'hexagon' ? (
      <polygon points={radialPoints(6, 51)} />
    ) : medal.shape === 'octagon' ? (
      <polygon points={radialPoints(8, 49)} />
    ) : medal.shape === 'sun' ? (
      <polygon points={radialPoints(32, 53, 41)} />
    ) : medal.shape === 'oval' ? (
      <ellipse cx="80" cy="100" rx="41" ry="53" />
    ) : medal.shape === 'crest' ? (
      <path d="M80 48 Q96 64 124 57 L128 96 Q122 126 80 153 Q38 126 32 96 L36 57 Q64 64 80 48Z" />
    ) : (
      <polygon
        points={Array.from({ length: 16 }, (_, i) => {
          const r = i % 2 ? 34 : 51,
            a = ((i * 22.5 - 90) * Math.PI) / 180;
          return `${80 + Math.cos(a) * r},${100 + Math.sin(a) * r}`;
        }).join(' ')}
      />
    );
  return (
    <svg
      className="mission-medal"
      viewBox="0 0 160 180"
      role="img"
      aria-label={`Médaille ${medal.name}`}
    >
      <defs>
        <clipPath id={`${id}-ribbon-clip`}>
          <path d="M43 10 H117 L108 69 L80 85 L52 69Z" />
        </clipPath>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={metal[0]} />
          <stop offset=".3" stopColor={metal[1]} />
          <stop offset=".54" stopColor={metal[0]} />
          <stop offset=".65" stopColor={metal[1]} />
          <stop offset="1" stopColor={metal[2]} />
        </linearGradient>
        <radialGradient id={`${id}-inner`}>
          <stop stopColor={medal.finish === 'enamel' ? jewel : metal[1]} />
          <stop offset="1" stopColor={metal[3]} />
        </radialGradient>
        <linearGradient id={`${id}-ribbon`}>
          <stop stopColor="#111c18" />
          <stop offset=".25" stopColor={ribbon} />
          <stop offset=".7" stopColor={ribbon} />
          <stop offset="1" stopColor="#111c18" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="162" rx="41" ry="6" fill="#000" opacity=".22" />
      <path
        d="M43 10 H117 L108 69 L80 85 L52 69Z"
        fill={`url(#${id}-ribbon)`}
        stroke="#141b17"
        strokeWidth="3"
      />
      <path d="M58 12 L64 64 M102 12 L96 64" stroke={metal[1]} strokeWidth="5" opacity=".9" />
      <path d="M70 12 L73 65 M90 12 L87 65" stroke="#ece3c1" strokeWidth="1" opacity=".24" />
      <g clipPath={`url(#${id}-ribbon-clip)`} fill={metal[0]} stroke={metal[0]} opacity=".65">
        {medal.ribbonPattern === 'stripes' &&
          [48, 70, 92, 114].map((x) => <rect key={x} x={x} y="16" width="7" height="65" />)}
        {medal.ribbonPattern === 'chevron' && (
          <path d="M40 25 L80 48 L120 25 M40 47 L80 70 L120 47" fill="none" strokeWidth="7" />
        )}
        {medal.ribbonPattern === 'split' && <path d="M80 16 H117 V85 H80Z" stroke="none" />}
        {medal.ribbonPattern === 'diagonal' && (
          <path d="M34 58 L103 12 M53 81 L122 35" strokeWidth="11" />
        )}
        {medal.ribbonPattern === 'cross' && <path d="M80 16 V75 M44 35 H117" strokeWidth="9" />}
      </g>
      <rect
        x="42"
        y="9"
        width="76"
        height="7"
        rx="2"
        fill={`url(#${id}-metal)`}
        stroke={metal[3]}
      />
      <circle cx="80" cy="57" r="9" fill="none" stroke={metal[2]} strokeWidth="5" />
      <g fill={metal[1]} stroke={metal[3]} strokeWidth="1.5">
        {medal.ornament === 'laurel' &&
          [-1, 1].flatMap((side) =>
            Array.from({ length: 7 }, (_, i) => (
              <ellipse
                key={`${side}:${i}`}
                cx={80 + side * (44 + Math.sin(i * 0.45) * 10)}
                cy={67 + i * 11}
                rx="8"
                ry="4"
                transform={`rotate(${side * (i * 8 - 35)} ${80 + side * (44 + Math.sin(i * 0.45) * 10)} ${67 + i * 11})`}
              />
            )),
          )}
        {medal.ornament === 'wings' && (
          <path d="M45 90 L8 70 L14 95 L23 105 L34 111 L47 112 M115 90 L152 70 L146 95 L137 105 L126 111 L113 112 M12 83 L38 100 M17 95 L36 105 M148 83 L122 100 M143 95 L124 105" />
        )}
        {medal.ornament === 'swords' && (
          <path d="M25 45 L37 49 L127 146 L119 151 L30 54Z M135 45 L123 49 L33 146 L41 151 L130 54Z M20 135 L45 157 M140 135 L115 157" />
        )}
        {medal.ornament === 'chain' &&
          Array.from({ length: 20 }, (_, i) => {
            const a = (i * Math.PI) / 10;
            return (
              <circle
                key={i}
                cx={80 + Math.cos(a) * 54}
                cy={100 + Math.sin(a) * 54}
                r="4"
                fill="none"
                stroke={metal[1]}
                strokeWidth="2.5"
              />
            );
          })}
        {medal.ornament === 'rays' && <polygon points={radialPoints(24, 63, 45)} />}
      </g>
      <g transform="translate(0 4)" fill={metal[3]} stroke="#101612" strokeWidth="4">
        {shape}
      </g>
      <g fill={`url(#${id}-metal)`} stroke={metal[2]} strokeWidth="2">
        {shape}
      </g>
      {medal.finish === 'antique' && (
        <g fill="#23372e" opacity=".32">
          {shape}
        </g>
      )}
      <circle
        cx="80"
        cy="100"
        r="32"
        fill={`url(#${id}-inner)`}
        stroke={metal[3]}
        strokeWidth="2"
      />
      <circle
        cx="80"
        cy="100"
        r="29"
        fill="none"
        stroke={metal[0]}
        strokeWidth=".8"
        opacity=".55"
      />
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i * Math.PI) / 10;
        return (
          <circle
            key={i}
            cx={80 + Math.cos(a) * 37}
            cy={100 + Math.sin(a) * 37}
            r="1.3"
            fill={metal[3]}
            opacity=".7"
          />
        );
      })}
      <Icon x="59" y="79" width="42" height="42" color={metal[0]} strokeWidth="1.4" />
      {medal.gem && (
        <g>
          <path d="M80 60 L87 66 L80 72 L73 66Z" fill={jewel} stroke={metal[0]} />
          <path d="M76 65 L80 62 L84 65" fill="none" stroke="#fff" opacity=".65" />
        </g>
      )}
      {medal.theme && (
        <g
          stroke={metal[0]}
          fill="none"
          strokeWidth="1.4"
          strokeLinecap="round"
          transform="translate(80 128)"
        >
          {medal.theme === 'sea' ? (
            <>
              <circle cy="-5" r="2" />
              <path d="M0 -3 V7 M-7 1 Q-7 7 0 7 Q7 7 7 1 M-4 -1 H4 M-7 1 L-9 3 M7 1 L9 3" />
            </>
          ) : medal.theme === 'land' ? (
            <>
              <circle r="7" />
              <path d="M-3 3 L0 -5 L3 -3 L0 5Z" />
            </>
          ) : (
            <path d="M-6 -5 L6 7 M6 -5 L-6 7 M-7 3 L-3 7 M7 3 L3 7" />
          )}
        </g>
      )}
      <path
        d="M49 126 Q80 143 111 126"
        fill="none"
        stroke={metal[0]}
        strokeWidth="1.1"
        opacity=".6"
      />
      {Array.from({ length: Math.min(5, level) }, (_, i) => (
        <circle
          key={i}
          cx={80 + (i - (Math.min(5, level) - 1) / 2) * 8}
          cy="139"
          r="2"
          fill={metal[0]}
          stroke={metal[3]}
          strokeWidth=".7"
        />
      ))}
    </svg>
  );
}
