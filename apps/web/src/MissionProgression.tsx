import {
  BUILDINGS,
  DEVELOPMENT_STAGES,
  developmentMissing,
  developmentStage,
  conquestDevelopmentLevel,
  militaryDevelopmentLevel,
  missionRecruiters,
} from '@voidmarch/config';
import type { MissionOffer } from '@voidmarch/shared';
import { useGame } from './store';

export function MissionProgression({ expedition = false }: { expedition?: boolean }) {
  const world = useGame((s) => s.world)!;
  const sites = world.tiles.flatMap((t) =>
    t.building?.ownerId === world.player.id && t.building.hp > 0 ? [t.building] : [],
  );
  const stage = developmentStage(sites);
  const level = expedition ? stage : conquestDevelopmentLevel(sites);
  const next = Math.min(5, level + 1);
  const requirements = developmentMissing([], next);
  const military = militaryDevelopmentLevel(sites);
  return (
    <section
      className="inset mission-progression"
      aria-label={expedition ? 'Progression des expéditions' : 'Progression des missions'}
    >
      <h4>
        {expedition ? 'Votre époque' : 'Votre niveau de conquête'} : {level}/5 ·{' '}
        {DEVELOPMENT_STAGES[level - 1]}
      </h4>
      {level < 5 ? (
        <>
          <p>
            <strong>
              Pour débloquer {expedition ? 'l’époque' : 'le niveau'} {next} :
            </strong>
          </p>
          <ul className="mission-progression-checklist">
            {requirements.map((req) => {
              const current = Math.max(
                0,
                ...sites.filter((b) => req.kinds.includes(b.kind)).map((b) => b.level),
              );
              const done = current >= req.level;
              return (
                <li key={req.kinds.join(',')} className={done ? 'fulfilled' : 'negative'}>
                  <span aria-hidden="true">{done ? '✓' : '○'}</span> {done ? 'Acquis' : 'À faire'} ·{' '}
                  {req.kinds.map((k) => BUILDINGS[k].name).join(' ou ')} niveau {req.level}
                  {!done && (
                    <small> — {current ? `actuellement niveau ${current}` : 'à construire'}</small>
                  )}
                </li>
              );
            })}
            {!expedition && (
              <li className={military >= next ? 'fulfilled' : 'negative'}>
                <span aria-hidden="true">{military >= next ? '✓' : '○'}</span>{' '}
                {military >= next ? 'Acquis' : 'À faire'} · Un bâtiment de recrutement niveau {next}{' '}
                (par exemple une caserne)
                {military < next && <small> — meilleur niveau actuel : {military}</small>}
              </li>
            )}
          </ul>
          {!expedition && (
            <details>
              <summary>Quels bâtiments comptent pour les conquêtes ?</summary>
              <p>
                {missionRecruiters()
                  .map((k) => BUILDINGS[k].name)
                  .join(' · ')}
              </p>
            </details>
          )}
          <p className="muted">
            À chaque renouvellement de ce tableau : 5 % de chance qu’une seule offre soit du niveau
            supérieur (+1 maximum). Cette offre est facultative ; la réussir ne débloque pas
            automatiquement le palier suivant.
          </p>
        </>
      ) : (
        <p>Vous avez atteint le niveau maximal. Aucune offre au-delà du niveau 5.</p>
      )}
      {!expedition && (
        <p className="muted">
          Les missions navales dépendent aussi de l’époque de vos navires de combat. Les missions
          déjà acceptées conservent leur niveau.
        </p>
      )}
    </section>
  );
}

export function ExceptionalMissionBadge({ offer }: { offer: MissionOffer }) {
  if (!offer.exceptional) return null;
  return (
    <p className="exceptional-mission-badge">
      <strong>
        {offer.expedition ? 'Expédition exceptionnelle · Époque' : 'Défi supérieur · Niveau'}{' '}
        {offer.level}
      </strong>
      <small>
        Offre rare à +1 niveau : difficulté, récompenses et coûts correspondent au niveau affiché.
        Aucun palier permanent accordé à la victoire.
      </small>
    </p>
  );
}
