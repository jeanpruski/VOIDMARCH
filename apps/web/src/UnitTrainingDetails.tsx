import { BiomeAdaptation } from './BiomeAdaptation';
import type { Biome } from '@voidmarch/config';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BUILDINGS, formatNumber, UNITS, veteranRank, type Terrain } from '@voidmarch/config';
import { armyTrainingSources, SUPPORT_CAPS } from '@voidmarch/game-rules';
import type { ArmySupportBonus, Building, Unit } from '@voidmarch/shared';
import { Modal } from './ui';
import { ArmySupport, SUPPORT_LABELS } from './ArmySupport';
import { TerrainAffinities } from './TerrainAffinities';

const buildingName = (b: Building) =>
  `${BUILDINGS[b.kind].name} · niveau ${b.level} · (${b.q}, ${b.r})`;
const contributionText = (bonus: ArmySupportBonus) =>
  (Object.keys(SUPPORT_LABELS) as (keyof ArmySupportBonus)[])
    .filter((k) => bonus[k] > 0)
    .map(
      (k) =>
        `${SUPPORT_LABELS[k]} +${formatNumber(bonus[k])}${k === 'move' || k === 'vision' ? ' case' : k === 'terrain' ? ' pt' : ' %'}`,
    )
    .join(' · ');

/** Only rendered for owned troops: enemy infrastructure is never inferred from fog. */
export function UnitTrainingDetails({
  unit,
  buildings,
  terrain,
  biome,
}: {
  unit: Unit;
  buildings: Building[];
  terrain?: Terrain;
  biome?: Biome;
}) {
  const [open, setOpen] = useState(false);
  const details = useMemo(
    () =>
      open
        ? armyTrainingSources(
            unit.kind,
            buildings.filter((b) => b.ownerId === unit.ownerId),
          )
        : null,
    [open, unit.kind, unit.ownerId, buildings],
  );
  const training = unit.trainingBonus ?? 0;
  const retained = details && training > details.trainingBonus;
  const current =
    details &&
    (Object.keys(SUPPORT_CAPS) as (keyof ArmySupportBonus)[]).every(
      (k) => (unit.supportBonus?.[k] ?? 0) === details.supportBonus[k],
    );
  return (
    <>
      <button
        type="button"
        className="rare-tag training-details-trigger"
        aria-label={`Origine des bonus de ${UNITS[unit.kind].name}`}
        onClick={() => setOpen(true)}
        title="Voir quels bâtiments apportent l’entraînement et les bonus complémentaires"
      >
        Entraînement · +{formatNumber(training)} % <span>· Détails</span>
      </button>
      {open &&
        details &&
        createPortal(
          <Modal
            title={`Origine des bonus · ${UNITS[unit.kind].name}`}
            eyebrow="ENTRAÎNEMENT ET SOUTIEN"
            onClose={() => setOpen(false)}
            className="unit-training-modal"
          >
            <p>
              Le badge « Entraînement » indique le bonus de base aux PV, à l’attaque et à la
              défense. Il ne représente pas la somme de tous les bonus de cette unité.
            </p>
            <section className="training-origin">
              <h3>Entraînement appliqué : +{formatNumber(training)} %</h3>
              {retained ? (
                <>
                  <p>
                    <strong>Entraînement acquis conservé.</strong> Cette unité garde un meilleur
                    entraînement que celui fourni par vos bâtiments actuels.
                  </p>
                  <p>Le bâtiment d’origine historique n’a pas été enregistré.</p>
                  {details.primary && (
                    <p>
                      Meilleur bâtiment actuel : {buildingName(details.primary)} · +
                      {formatNumber(details.trainingBonus)} %. Ce bonus ne s’ajoute pas à
                      l’entraînement conservé.
                    </p>
                  )}
                </>
              ) : details.primary && training === details.trainingBonus ? (
                <>
                  <p>
                    <strong>{buildingName(details.primary)}</strong>
                  </p>
                  <p>
                    Ce bâtiment fournit actuellement ce palier. Les autres entraînements de base ne
                    s’additionnent pas.
                  </p>
                </>
              ) : (
                <p>
                  {training
                    ? 'Le détail de l’entraînement est en cours d’actualisation.'
                    : 'Aucun entraînement amélioré appliqué pour le moment.'}
                </p>
              )}
            </section>
            <section className="training-origin">
              <h3>Bonus complémentaires appliqués</h3>
              <ArmySupport bonus={unit.supportBonus} />
              {!Object.values(unit.supportBonus ?? {}).some(Boolean) && (
                <p>Aucun complément actif.</p>
              )}
              {!current ? (
                <p>
                  La liste des contributions est en cours d’actualisation. Les bonus appliqués
                  ci-dessus restent ceux de l’unité.
                </p>
              ) : (
                <>
                  {!!details.sources.length && (
                    <>
                      <p>
                        Contributions calculées dans cet ordre, avec rendements décroissants et
                        plafonds. Les gains ci-dessous s’ajoutent pour former le total affiché.
                      </p>
                      <ol className="training-source-list">
                        {details.sources.map((source) => (
                          <li key={source.building.id}>
                            <strong>{buildingName(source.building)}</strong>
                            <small>
                              Rendement : {formatNumber(source.weight * 100)} % · soutien : +
                              {formatNumber(source.points)} point{source.points > 1 ? 's' : ''}
                            </small>
                            <p>
                              {contributionText(source.contribution) ||
                                (source.points
                                  ? 'Participe aux paliers communs ; aucun nouveau bonus débloqué à cette étape.'
                                  : 'Plafond atteint : aucun bonus supplémentaire actuellement.')}
                            </p>
                          </li>
                        ))}
                      </ol>
                      <p>
                        Les paliers de déplacement, de vision et d’affinité sont débloqués
                        collectivement : ils apparaissent sur le bâtiment qui fait franchir le
                        palier dans cette liste.
                      </p>
                    </>
                  )}
                  {!details.sources.length && (
                    <p>
                      Il faut au moins deux bâtiments améliorés dont le niveau permet de recruter
                      cette unité. Un seul bâtiment assure la formation principale ; les suivants
                      apportent du soutien.
                    </p>
                  )}
                  {details.supportBase && details.supportBase.id !== details.primary?.id && (
                    <p>
                      Formation principale pour le calcul du soutien :{' '}
                      {buildingName(details.supportBase)}.
                    </p>
                  )}
                </>
              )}
              <p>
                Les compléments dépendent des bâtiments encore possédés. Ils sont déjà inclus dans
                les statistiques. Le soutien d’affinité ne s’active que sur un terrain favorable.
              </p>
            </section>
            <section className="training-origin">
              <h3>Terrain et autres bonus</h3>
              <BiomeAdaptation kind={unit.kind} biome={biome} showStatus />
              <TerrainAffinities
                kind={unit.kind}
                terrain={terrain}
                supportBonus={unit.supportBonus}
                collapsible
              />
              <p>
                Les affinités de base viennent du type d’unité ; seul leur renfort éventuel vient du
                soutien militaire.
              </p>
              {!!unit.rareBonus && (
                <p>
                  Rareté : +{formatNumber(unit.rareBonus!)} % aux PV, attaque et défense, obtenu à
                  la création de l’unité.
                </p>
              )}
              {!!veteranRank(unit.victories) && (
                <p>
                  Expérience au combat : +{formatNumber(veteranRank(unit.victories) * 5)} % à
                  l’attaque et à la défense.
                </p>
              )}
            </section>
          </Modal>,
          document.body,
        )}
    </>
  );
}
