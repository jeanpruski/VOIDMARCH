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
};
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
  const shape =
    medal.shape === 'round' ? (
      <circle cx="80" cy="100" r="46" />
    ) : medal.shape === 'shield' ? (
      <path d="M35 58 Q80 47 125 58 L120 105 Q114 133 80 151 Q46 133 40 105Z" />
    ) : medal.shape === 'diamond' ? (
      <path d="M80 49 L128 99 L80 151 L32 99Z" />
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
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={metal[0]} />
          <stop offset=".3" stopColor={metal[1]} />
          <stop offset=".54" stopColor={metal[0]} />
          <stop offset=".65" stopColor={metal[1]} />
          <stop offset="1" stopColor={metal[2]} />
        </linearGradient>
        <radialGradient id={`${id}-inner`}>
          <stop stopColor={metal[1]} />
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
      <g transform="translate(0 4)" fill={metal[3]} stroke="#101612" strokeWidth="4">
        {shape}
      </g>
      <g fill={`url(#${id}-metal)`} stroke={metal[2]} strokeWidth="2">
        {shape}
      </g>
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
