import { developmentProgress } from '@voidmarch/game-rules';
import {
  BUILDINGS,
  DEVELOPMENT_STAGES,
  developmentMissing,
  developmentStage,
  developmentTrophyRequirement,
  developmentTrophiesMet,
  upgradeTrophyReason,
} from '@voidmarch/config';
import { useGame } from './store';

export function Development() {
  const w = useGame((s) => s.world)!;
  const sites = w.tiles.flatMap((t) => (t.building?.ownerId === w.player.id ? [t.building] : []));
  const stage = developmentStage(sites, developmentProgress(w));
  const next = developmentMissing(sites, Math.min(5, stage + 1));
  return (
    <section className="inset" aria-label="Progression du royaume">
      <h4>
        Développement · {DEVELOPMENT_STAGES[stage - 1]} ({stage}/5)
      </h4>
      <p>
        Vos bâtiments et les trophées gagnés en missions et expéditions débloquent les nouvelles
        technologies. Les trophées sont cumulés et ne sont jamais dépensés.
      </p>
      <p>
        Améliorations des bâtiments : niveau 2 → 1 trophée ; niveau 3 → 5 ; niveau 4 → 20 ; niveau 5
        → 50. Ces améliorations ne demandent pas les infrastructures du prochain palier
        technologique.
      </p>
      {stage < 5 ? (
        <>
          <DevelopmentTrophies stage={stage + 1} />
          <details>
            <summary>Prochain palier : {DEVELOPMENT_STAGES[stage]}</summary>
            {!next.length && <p>Bâtiments requis : acquis.</p>}
            <ul>
              {next.map((r, i) => (
                <li key={i}>
                  {r.kinds.map((k) => BUILDINGS[k].name).join(' ou ')} · niveau {r.level}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p>Tous les paliers de développement sont accessibles.</p>
      )}
    </section>
  );
}

export function DevelopmentTrophies({ stage }: { stage: number }) {
  const world = useGame((s) => s.world)!;
  const progress = developmentProgress(world);
  const required = developmentTrophyRequirement(stage);
  const met = developmentTrophiesMet(stage, progress);
  const retained = (progress.grandfatheredLevel ?? 1) >= stage && progress.trophies < required;
  return (
    <div className="development-trophies">
      <p className={met ? 'positive' : 'negative'}>
        <strong>
          Trophées : {progress.trophies}/{required}
        </strong>{' '}
        · {met ? 'Condition acquise' : 'À obtenir'} pour le palier technologique {stage}
      </p>
      <p className="muted">
        Missions et expéditions réunies · total cumulé, sans dépense.
        {retained && ' Palier antérieur conservé : ce seuil ne vous bloque pas.'}
      </p>
    </div>
  );
}

export function BuildingTrophies({ level }: { level: number }) {
  const world = useGame((s) => s.world)!;
  const progress = developmentProgress(world);
  const required = developmentTrophyRequirement(level);
  if (!required || progress.bot) return null;
  const met = !upgradeTrophyReason(level, progress);
  return (
    <div className="development-trophies">
      <p className={met ? 'positive' : 'negative'}>
        <strong>
          Trophées : {progress.trophies}/{required}
        </strong>{' '}
        · {met ? 'Niveau' : 'À obtenir pour le niveau'} {level}
        {met ? ' débloqué' : ''}
      </p>
      <p className="muted">
        Total personnel des missions et expéditions. Ce seuil débloque ce niveau pour tous vos
        bâtiments ; les trophées ne sont pas dépensés.
      </p>
    </div>
  );
}
