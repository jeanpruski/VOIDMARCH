import { useState, type ReactNode } from 'react';
import { ArrowRight, CircleHelp, Compass } from 'lucide-react';
import { BUILDINGS } from '@voidmarch/config';
import { focusMap, select, useGame } from './store';

export function ContextHelp({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="context-help">
      <summary>
        <CircleHelp size={15} />
        {title}
      </summary>
      <div>{children}</div>
    </details>
  );
}

export function NextStep() {
  const w = useGame((s) => s.world)!;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem('voidmarch-next-step-hidden') === 'true';
    } catch {
      return false;
    }
  });
  const buildings = w.tiles.flatMap((t) =>
    t.building?.ownerId === w.player.id ? [t.building] : [],
  );
  const worker = w.units.find((u) => u.ownerId === w.player.id && u.kind === 'PEASANT');
  const settlement = buildings.find((b) => ['CAMP', 'OUTPOST', 'VILLAGE'].includes(b.kind));
  const house = buildings.some((b) => b.kind === 'HOUSE');
  const developed = buildings.some((b) => b.kind === 'OUTPOST' || b.kind === 'VILLAGE');
  const village = buildings.some((b) => b.kind === 'VILLAGE');
  const milestones = [!!worker, house, developed, village];
  const completed = milestones.filter(Boolean).length;
  const stage = !worker ? 0 : !house ? 1 : !developed ? 2 : !village ? 3 : 4;
  const titles = [
    'Votre premier paysan',
    'Un foyer pour grandir',
    'Un véritable avant-poste',
    'Fonder votre village',
    'Au-delà des frontières',
  ];
  const descriptions = [
    'Le premier paysan est gratuit en ressources. Il récolte et ouvre la voie aux constructions.',
    'Récoltez du bois en forêt puis bâtissez une chaumière pour augmenter votre population.',
    'Développez le campement : plus de place pour les habitants et accès au fantassin.',
    'Développez l’avant-poste : le village renforce votre économie et ouvre de nouveaux recrutements.',
    'Choisissez votre voie : explorer les anomalies, développer votre industrie ou négocier avec vos voisins.',
  ];
  const toggle = () => {
    setHidden(!hidden);
    try {
      localStorage.setItem('voidmarch-next-step-hidden', String(!hidden));
    } catch {}
  };
  const go = () => {
    if (stage === 4) {
      useGame.setState({ panel: 'events', menuOpen: false });
      return;
    }
    if (stage === 1 && worker) {
      select({ kind: 'unit', id: worker.id, q: worker.q, r: worker.r });
      focusMap(worker);
      return;
    }
    if (settlement) {
      select({ kind: 'building', id: settlement.id, q: settlement.q, r: settlement.r });
      focusMap(settlement);
      if (stage === 0) useGame.setState({ panel: 'recruit' });
    } else useGame.setState({ panel: 'cities' });
  };
  return (
    <section className={`next-step ${hidden ? 'compact' : ''}`} aria-label="Conseil de progression">
      <button className="next-step-heading" onClick={toggle} aria-expanded={!hidden}>
        <Compass size={15} />
        <span>{hidden ? 'Afficher les conseils' : 'Prochaine étape'}</span>
        <span>{hidden ? '+' : '−'}</span>
      </button>
      {!hidden && (
        <>
          <h3>{titles[stage]}</h3>
          <p>{descriptions[stage]}</p>
          <div
            className="settlement-progress"
            role="progressbar"
            aria-label="Fondation du royaume"
            aria-valuenow={completed}
            aria-valuemin={0}
            aria-valuemax={4}
          >
            {milestones.map((done, i) => (
              <i key={i} className={done ? 'complete' : ''} />
            ))}
          </div>
          <small>{completed}/4 étapes de fondation · À votre rythme</small>
          <button className="secondary" onClick={go}>
            {stage === 0
              ? 'Former un paysan'
              : stage === 1
                ? 'Retrouver mon paysan'
                : stage === 4
                  ? 'Explorer les événements'
                  : `Voir ${settlement ? BUILDINGS[settlement.kind].name.toLowerCase() : 'mes domaines'}`}
            <ArrowRight size={14} />
          </button>
        </>
      )}
    </section>
  );
}
