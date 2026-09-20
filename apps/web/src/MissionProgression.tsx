import { DevelopmentTrophies } from './Development';
import { developmentProgress } from '@voidmarch/game-rules';
import {
  BUILDINGS,
  ERA_REQUIREMENTS,
  eraName,
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
  const stage = developmentStage(sites, developmentProgress(world));
  const level = expedition ? stage : conquestDevelopmentLevel(sites, developmentProgress(world));
  const next = Math.min(5, level + 1);
  const requirements = stage < next ? (ERA_REQUIREMENTS[next] ?? []) : [];
  const military = militaryDevelopmentLevel(sites);
  return (
    <section
      className="inset mission-progression"
      aria-label={expedition ? 'Progression des expéditions' : 'Progression des missions'}
    >
      <h4>
        {expedition ? 'Votre époque' : 'Votre niveau de conquête'} : {level}/5 · {eraName(level)}
      </h4>
      {stage === 1 && (
        <p>
          Premier trophée : terminez une escarmouche avec vos troupes médiévales, ou envoyez votre
          héros examiner un lieu terrestre en reconnaissance, sans combat obligatoire.
        </p>
      )}
      <p className="muted">
        Chaque victoire rapporte un trophée à vous et à vos alliés actuels. Le butin revient au
        royaume qui a accepté la mission et reste acquis même au-delà du stockage.
      </p>
      {level < 5 ? (
        <>
          <p>
            <strong>
              Pour débloquer {expedition ? 'l’époque' : 'le niveau'} {next} :
            </strong>
          </p>
          {stage < next ? (
            <>
              <p>
                Passez à l’époque {next} dans Royaume : trophées, infrastructures et investissement
                en ressources.
              </p>
              <DevelopmentTrophies stage={next} />
            </>
          ) : (
            <p className="positive">
              Époque {next} déjà acquise : améliorez votre bâtiment militaire pour augmenter le
              niveau des conquêtes.
            </p>
          )}
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
