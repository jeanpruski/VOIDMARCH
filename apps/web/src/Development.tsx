import { developmentProgress } from '@voidmarch/game-rules';
import {
  BUILDINGS,
  developmentStage,
  developmentTrophyRequirement,
  developmentTrophiesMet,
  upgradeTrophyReason,
} from '@voidmarch/config';
import { useGame, send } from './store';
import { Cost, StorageHint } from './ui';
import { canAfford } from '@voidmarch/game-rules';
import {
  ERA_COSTS,
  ERA_AP_COST,
  ERA_REQUIREMENTS,
  eraAdvanceReason,
  eraName,
} from '@voidmarch/config';

export function Development() {
  const w = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  const sites = w.tiles.flatMap((t) => (t.building?.ownerId === w.player.id ? [t.building] : []));
  const progress = developmentProgress(w);
  const stage = developmentStage(sites, progress);
  const target = stage + 1;
  const reason = stage < 5 ? eraAdvanceReason(sites, progress, target) : '';
  const cost = ERA_COSTS[target];
  const enoughAP = w.player.unlimitedAP || w.player.ap >= ERA_AP_COST;
  const affordable = cost && canAfford(w.player.wallet, cost);
  return (
    <section className="inset" aria-label="Progression du royaume">
      <h4>
        Époque {stage}/5 · {eraName(stage)}
      </h4>
      <p>
        Votre époque ouvre les bâtiments et unités de cette période et fixe le niveau maximal de vos
        bâtiments. Les anciennes formations restent disponibles.
      </p>
      {stage < 5 ? (
        <>
          <h5>Prochaine époque : {eraName(target)}</h5>
          <DevelopmentTrophies stage={target} />
          <ul>
            {ERA_REQUIREMENTS[target].map((req, i) => {
              const met = sites.some(
                (b) => b.hp > 0 && b.level >= req.level && req.kinds.includes(b.kind),
              );
              return (
                <li key={i} className={met ? 'positive' : 'negative'}>
                  {req.kinds.map((k) => BUILDINGS[k].name).join(' ou ')} · niveau {req.level}{' '}
                  {met ? '✓' : '(requis)'}
                </li>
              );
            })}
          </ul>
          <p>Investissement unique pour tout le royaume :</p>
          <Cost cost={cost} wallet={w.player.wallet} />
          <StorageHint cost={cost} wallet={w.player.wallet} capacity={w.player.capacity} />
          <p>
            Les trophées sont conservés. Le passage ne remplace pas les améliorations individuelles.
          </p>
          {reason && <p className="negative">{reason}</p>}
          {!enoughAP && <p className="negative">{ERA_AP_COST} PA nécessaires.</p>}
          {!reason && affordable && enoughAP && (
            <button
              disabled={pending}
              onClick={() =>
                void send({ type: 'ADVANCE_ERA', actorId: w.player.id, payload: { era: target } })
              }
            >
              Passer à l’époque {target} · {ERA_AP_COST} PA
            </button>
          )}
        </>
      ) : (
        <p>
          Votre royaume a atteint l’ère atomique. Tous les niveaux d’amélioration sont ouverts ; les
          conditions propres à chaque formation restent nécessaires.
        </p>
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
        · {met ? 'Condition acquise' : 'À obtenir'} pour le passage à l’époque {stage}
      </p>
      <p className="muted">
        Missions et expéditions réunies · total cumulé, sans dépense.
        {retained && ' Palier antérieur conservé : ce seuil ne vous bloque pas.'}
      </p>
      {!met && (
        <p>
          Encore {Math.max(0, required - progress.trophies)} trophée(s) : chaque mission ou
          expédition réussie, par vous ou un allié actuel, en rapporte un. Les ressources seules ne
          débloquent pas l’époque.
        </p>
      )}
    </div>
  );
}

export function BuildingTrophies({ level }: { level: number }) {
  const world = useGame((s) => s.world)!;
  const progress = developmentProgress(world);
  if (progress.era !== undefined)
    return (
      <div className="development-trophies">
        <p className={progress.era >= level ? 'positive' : 'negative'}>
          Époque du royaume : {progress.era}/5 · Époque {level} requise pour ce niveau.
        </p>
        <p className="muted">
          Le passage d’époque se prépare dans Royaume. Les trophées servent à changer d’époque, pas
          à payer chaque amélioration.
        </p>
      </div>
    );
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
