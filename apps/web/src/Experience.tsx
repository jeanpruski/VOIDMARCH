import type { ReactNode } from 'react';
import { beginnerProgress } from './beginner-tutorial';
import { Cost, StorageHint } from './ui';
import { canAfford } from '@voidmarch/game-rules';
import { ArrowRight, CircleHelp, Compass } from 'lucide-react';
import { BUILDINGS, buildingConstructionCost } from '@voidmarch/config';
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

export function BeginnerTutorial() {
  const w = useGame((s) => s.world)!;
  const { steps, current, completed, builder, settlement } = beginnerProgress(w);
  const cost = current?.kind ? buildingConstructionCost(current.kind, w.player.faction) : undefined;
  const go = () => {
    if (!current) {
      useGame.setState({ panel: 'cities' });
      return;
    }
    if (!current.kind && settlement) {
      select({ kind: 'building', id: settlement.id, q: settlement.q, r: settlement.r });
      focusMap(settlement);
      useGame.setState({ panel: 'recruit' });
    } else if (builder) {
      select({ kind: 'unit', id: builder.id, q: builder.q, r: builder.r });
      focusMap(builder);
    } else {
      useGame.setState({ panel: 'cities' });
    }
  };
  return (
    <section className="beginner-tutorial" aria-label="Tutoriel de démarrage">
      <div className="eyebrow">
        <Compass size={15} /> Bien commencer
      </div>
      <p className="tutorial-progress">
        {completed}/{steps.length} étapes réalisées
      </p>
      <progress aria-label="Progression du tutoriel" value={completed} max={steps.length} />
      {current ? (
        <>
          <h3>{current.title}</h3>
          {current.kind && (
            <strong className="tutorial-building">{BUILDINGS[current.kind].name}</strong>
          )}
          <p>{current.description}</p>
          {cost && (
            <>
              <div className="tutorial-cost">
                <span>Construction · 1 PA</span>
                <Cost cost={cost} wallet={w.player.wallet} />
              </div>
              <StorageHint cost={cost} wallet={w.player.wallet} capacity={w.player.capacity} />
              {!canAfford(w.player.wallet, cost) && (
                <p className="muted">
                  Il vous manque les ressources indiquées en rouge. Récoltez avec le paysan sur le
                  terrain adapté ou laissez vos bâtiments produire pendant votre présence.
                </p>
              )}
              <p className="tutorial-tip">
                Chantier : jusqu’à 3 cases d’un de vos bâtiments, avec un bâtisseur à une case
                maximum. Dans une enceinte fermée, toute case adaptée convient avec un bâtisseur
                proche. Sélectionnez le terrain, puis Construire.
              </p>
            </>
          )}
          <button className="secondary" onClick={go}>
            {!current.kind && settlement
              ? 'Ouvrir le recrutement'
              : builder
                ? 'Retrouver mon bâtisseur'
                : 'Voir mes domaines'}
            <ArrowRight size={14} />
          </button>
        </>
      ) : (
        <>
          <h3>Vos fondations sont prêtes</h3>
          <p>
            Vous disposez des principales filières de ressources. Améliorez vos domaines, explorez
            et préparez vos alliances.
          </p>
          <button className="secondary" onClick={go}>
            Voir mes domaines <ArrowRight size={14} />
          </button>
        </>
      )}
      <details className="tutorial-checklist">
        <summary>Le parcours de départ</summary>
        <ol>
          {steps.map((step, i) => (
            <li
              key={step.kind ?? 'worker'}
              className={step.done ? 'complete' : step === current ? 'current' : ''}
              aria-current={step === current ? 'step' : undefined}
            >
              <span aria-label={step.done ? 'Terminé' : 'À faire'}>{step.done ? '✓' : i + 1}</span>
              {step.kind ? BUILDINGS[step.kind].name : 'Premier bâtisseur'}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
