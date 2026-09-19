import {
  BUILDINGS,
  DEVELOPMENT_STAGES,
  developmentMissing,
  developmentStage,
} from '@voidmarch/config';
import { useGame } from './store';

export function Development() {
  const w = useGame((s) => s.world)!;
  const sites = w.tiles.flatMap((t) => (t.building?.ownerId === w.player.id ? [t.building] : []));
  const stage = developmentStage(sites);
  const next = developmentMissing(sites, Math.min(5, stage + 1));
  return (
    <section className="inset" aria-label="Progression du royaume">
      <h4>
        Développement · {DEVELOPMENT_STAGES[stage - 1]} ({stage}/5)
      </h4>
      <p>
        Vos infrastructures déterminent les nouvelles technologies et le niveau des expéditions. Un
        bâtiment isolé ne suffit pas à changer d’époque.
      </p>
      {next.length ? (
        <details>
          <summary>Prochain palier : {DEVELOPMENT_STAGES[stage]}</summary>
          <ul>
            {next.map((r, i) => (
              <li key={i}>
                {r.kinds.map((k) => BUILDINGS[k].name).join(' ou ')} · niveau {r.level}
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p>Tous les paliers de développement sont accessibles.</p>
      )}
    </section>
  );
}
