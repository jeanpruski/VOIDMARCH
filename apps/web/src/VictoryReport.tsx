import { useEffect, useRef, useState } from 'react';
import { Flag, X } from 'lucide-react';
import type { MissionVictory, WorldView } from '@voidmarch/shared';
import { useGame, focusMap } from './store';
import { newVictories } from './victories';
import { MissionMedal } from './MissionMedal';
import { Cost } from './ui';
export function VictoryReport() {
  const world = useGame((s) => s.world);
  const previous = useRef<WorldView | undefined>(world ?? undefined);
  const seen = useRef(new Set<string>());
  const [reports, setReports] = useState<MissionVictory[]>([]);
  useEffect(() => {
    if (!world) {
      previous.current = undefined;
      setReports([]);
      return;
    }
    if (previous.current && previous.current.player.id !== world.player.id) setReports([]);
    const fresh = newVictories(previous.current, world).filter((v) => !seen.current.has(v.id));
    fresh.forEach((v) => seen.current.add(v.id));
    if (seen.current.size > 200) seen.current = new Set([...seen.current].slice(-100));
    if (fresh.length) setReports((old) => [...old, ...fresh].slice(-5));
    previous.current = world;
  }, [world]);
  const victory = reports[0];
  if (!victory || !world) return null;
  const close = () => setReports((r) => r.slice(1));
  const owner = world.realms.find((r) => r.id === victory.ownerId);
  return (
    <aside
      className={`victory-report ${world.player.settings.reducedMotion ? 'reduced' : ''}`}
      aria-label="Bilan de victoire"
    >
      <button className="victory-close" aria-label="Fermer le bilan de victoire" onClick={close}>
        <X size={18} />
      </button>
      <div className="victory-heading" role="status">
        <MissionMedal medal={victory.medal} />
        <div>
          <span className="eyebrow">
            {victory.expedition ? 'Expédition accomplie' : 'Forteresse conquise'}
          </span>
          <h2>{victory.title}</h2>
          {victory.expedition ? (
            <p>Le lieu rejoint le carnet des découvertes du commanditaire.</p>
          ) : (
            <p>
              Les survivants rallient{' '}
              {victory.ownerId === world.player.id
                ? 'votre bannière'
                : (owner?.name ?? 'votre allié')}
              .
            </p>
          )}
        </div>
      </div>
      {!victory.expedition && (
        <div className="victory-counts">
          <span>
            <b>{victory.captured.units}</b> troupes récupérées
          </span>
          <span>
            <b>{victory.captured.buildings}</b> bâtiments
          </span>
          <span>
            <b>{victory.captured.walls}</b> remparts
          </span>
        </div>
      )}
      <p>
        Butin versé à{' '}
        {victory.ownerId === world.player.id ? 'votre royaume' : (owner?.name ?? 'votre allié')} :
      </p>
      <Cost cost={victory.reward} />
      {!victory.expedition && (
        <details>
          <summary>Bilan des combats</summary>
          <p>
            Garnison détruite : {victory.destroyed.units} troupes, {victory.destroyed.buildings}{' '}
            bâtiments, {victory.destroyed.walls} remparts.
          </p>
          <p>
            Pertes enregistrées face à la garnison (vous et vos alliés) : {victory.losses.units}{' '}
            troupes, {victory.losses.buildings} bâtiments ou remparts.
          </p>
          <p className="muted">
            Les survivants conservent leurs dégâts et leur niveau. Le héros reste immortel.
          </p>
        </details>
      )}
      <div className="selection-actions">
        <button
          onClick={() => {
            focusMap(victory);
            close();
          }}
        >
          <Flag size={15} />
          {victory.expedition ? 'Revoir le lieu' : 'Voir la forteresse'}
        </button>
        {victory.ownerId === world.player.id && (
          <button
            onClick={() => {
              useGame.setState({ panel: 'trophies' });
              close();
            }}
          >
            Salle des trophées
          </button>
        )}
        <button onClick={close}>
          Continuer{reports.length > 1 ? ` (${reports.length - 1} autre bilan)` : ''}
        </button>
      </div>
    </aside>
  );
}
