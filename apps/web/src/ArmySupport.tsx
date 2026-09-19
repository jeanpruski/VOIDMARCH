import { formatNumber, UNITS, UNIT_PROFILES, type UnitKind } from '@voidmarch/config';
import { armyTraining } from '@voidmarch/game-rules';
import type { ArmySupportBonus, Building } from '@voidmarch/shared';

export const SUPPORT_LABELS: Record<keyof ArmySupportBonus, string> = {
  attack: 'attaque',
  defense: 'défense',
  hp: 'PV',
  move: 'déplacement',
  vision: 'vision',
  terrain: 'affinités de terrain',
};
const suffix = (k: keyof ArmySupportBonus) =>
  k === 'move' || k === 'vision' ? ' case' : k === 'terrain' ? ' pt' : ' %';
export function ArmySupport({ bonus }: { bonus?: ArmySupportBonus }) {
  if (!bonus || !Object.values(bonus).some(Boolean)) return null;
  return (
    <p
      className="army-support"
      title="Compléments déjà inclus dans les statistiques. Ils dépendent des bâtiments de formation encore possédés. L’affinité ne s’active que sur un terrain favorable. Les transports ne gagnent pas de vision."
    >
      <strong>Soutien militaire :</strong>{' '}
      {(Object.keys(bonus) as (keyof ArmySupportBonus)[])
        .filter((k) => bonus[k] > 0)
        .map((k) =>
          k === 'terrain'
            ? `Affinités : +${formatNumber(bonus[k])} pt`
            : `+${formatNumber(bonus[k])}${suffix(k)} ${SUPPORT_LABELS[k]}`,
        )
        .join(' · ')}
    </p>
  );
}

export function TrainingUpgrade({
  building,
  next,
  owned,
}: {
  building: Building;
  next: Building;
  owned: Building[];
}) {
  const after = owned.filter((b) => b.id !== building.id).concat(next);
  const groups = new Map<
    string,
    {
      names: string[];
      before: ReturnType<typeof armyTraining>;
      after: ReturnType<typeof armyTraining>;
    }
  >();
  for (const kind of Object.keys(UNITS) as UnitKind[]) {
    const p = UNIT_PROFILES[kind];
    if (
      p.builder ||
      p.hero ||
      (!p.recruitAt.includes(building.kind) && !p.recruitAt.includes(next.kind))
    )
      continue;
    const before = armyTraining(kind, owned),
      upgraded = armyTraining(kind, after);
    const signature = JSON.stringify([
      before.trainingBonus,
      upgraded.trainingBonus,
      before.supportBonus,
      upgraded.supportBonus,
    ]);
    if (
      before.trainingBonus === upgraded.trainingBonus &&
      JSON.stringify(before.supportBonus) === JSON.stringify(upgraded.supportBonus)
    )
      continue;
    const group = groups.get(signature) ?? { names: [], before, after: upgraded };
    group.names.push(UNITS[kind].name);
    groups.set(signature, group);
  }
  return (
    <section className="training-upgrade">
      <h3>Gains militaires de cette amélioration</h3>
      <p>
        Appliqués aux unités existantes et aux prochaines recrues, y compris les passagers. Les
        blessures restent proportionnelles.
      </p>
      {!groups.size && (
        <p>
          Aucun gain militaire supplémentaire à ce niveau : le meilleur entraînement est déjà
          atteint et les compléments sont plafonnés ou nécessitent un niveau de recrutement
          supérieur.
        </p>
      )}
      {[...groups.entries()].map(([id, group]) => (
        <div key={id} className="training-upgrade-group">
          <details>
            <summary>
              {group.names.length} type{group.names.length > 1 ? 's' : ''} d’unités concerné
              {group.names.length > 1 ? 's' : ''}
            </summary>
            <p>{group.names.join(', ')}</p>
          </details>
          {group.before.trainingBonus !== group.after.trainingBonus && (
            <p>
              Meilleur entraînement du royaume : +{formatNumber(group.before.trainingBonus)} % → +
              {formatNumber(group.after.trainingBonus)} % aux PV, attaque et défense. Un
              entraînement personnel supérieur reste conservé.
            </p>
          )}
          <ul>
            {(Object.keys(SUPPORT_LABELS) as (keyof ArmySupportBonus)[])
              .filter((k) => group.before.supportBonus[k] !== group.after.supportBonus[k])
              .map((k) => (
                <li key={k}>
                  Soutien · {SUPPORT_LABELS[k]} : +{formatNumber(group.before.supportBonus[k])} → +
                  {formatNumber(group.after.supportBonus[k])}
                  {suffix(k)}.
                </li>
              ))}
          </ul>
        </div>
      ))}
      <details>
        <summary>Comment se cumulent les bâtiments ?</summary>
        <p>
          Le meilleur bâtiment donne l’entraînement de base. Les autres bâtiments améliorés qui
          peuvent recruter l’unité ajoutent du soutien : rendement de 100 %, 60 %, 40 %, puis 20 %
          selon leur classement. Un bâtiment de niveau 1 n’ajoute aucun soutien.
        </p>
        <p>
          Plafonds : +15 % en attaque, défense et PV, +1 déplacement, +1 vision et +5 points aux
          affinités favorables. Ces compléments disparaissent si les infrastructures sont perdues.
          Les transports gardent leur faible vision ; les bâtisseurs et héros sont exclus.
        </p>
      </details>
    </section>
  );
}
