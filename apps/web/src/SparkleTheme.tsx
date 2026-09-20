import { SPARKLE_TOGGLE_EVENT } from './secret-codes';
import { useEffect, useState, type CSSProperties } from 'react';

/** A purely local, ephemeral easter egg: no settings, requests or saved state. */
export function SparkleTheme() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const toggle = () => setEnabled((previous) => !previous);
    window.addEventListener(SPARKLE_TOGGLE_EVENT, toggle);
    return () => window.removeEventListener(SPARKLE_TOGGLE_EVENT, toggle);
  }, []);
  useEffect(() => {
    if (enabled) document.documentElement.dataset.theme = 'sparkle';
    else delete document.documentElement.dataset.theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [enabled]);
  if (!enabled) return null;
  return (
    <>
      <div className="sparkle-confetti" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            style={
              {
                '--sparkle-x': `${[3, 96, 20, 78, 6, 93, 34, 67, 2, 97, 44, 58][i]}%`,
                '--sparkle-y': `${[17, 21, 4, 6, 51, 56, 95, 96, 82, 85, 3, 97][i]}%`,
                '--sparkle-delay': `${-i * 0.7}s`,
              } as CSSProperties
            }
          >
            {i % 3 === 0 ? '✧' : '✦'}
          </span>
        ))}
      </div>
      <button
        className="sparkle-switch"
        onClick={() => setEnabled(false)}
        aria-label="Revenir au thème normal"
        title="Thème local · retapez rfv puis Entrée pour le désactiver · réinitialisé au rechargement"
      >
        <span aria-hidden="true">🦄</span>
        <span>Licornes & paillettes</span>
        <span aria-hidden="true">×</span>
      </button>
      <span className="sparkle-status" role="status">
        Thème Licornes et paillettes activé. Tapez rfv puis Entrée pour revenir au thème normal.
      </span>
    </>
  );
}
