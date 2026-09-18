import { useState } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp } from 'lucide-react';
import {
  type Wallet,
  ACTION_COST,
  BUILDINGS,
  isWall,
  BUILDING_DEFENSE,
  BUILDING_POPULATION,
  RESOURCES,
  RESOURCE_NAMES,
  UNIT_PROFILES,
  UNITS,
  buildingUpgrade,
  productionMultiplier,
  populationCapacity,
  storageBonus,
  trainingBonusAt,
} from '@voidmarch/config';
import type { ViewTile } from '@voidmarch/shared';
import { Modal, format, StorageHint } from './ui';
import { send, useGame } from './store';

export function UpgradeBuilding({ building: b }: { building: NonNullable<ViewTile['building']> }) {
  const [open, setOpen] = useState(false);
  const world = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  const upgrade = buildingUpgrade(b.kind, b.level);
  const costAP = ACTION_COST.UPGRADE;
  const missing = upgrade
    ? RESOURCES.filter((r) => world.player.wallet[r] < (upgrade.cost[r] ?? 0))
    : [];
  const populationMissing = !!upgrade && b.population < upgrade.population;
  const unavailable =
    pending ||
    (!world.player.unlimitedAP && world.player.ap < costAP) ||
    missing.length > 0 ||
    populationMissing;
  const capacity = populationCapacity;
  const unlocked = upgrade
    ? Object.entries(UNIT_PROFILES)
        .filter(([, p]) => p.recruitAt.includes(upgrade.kind) && !p.recruitAt.includes(b.kind))
        .map(([kind]) => UNITS[kind as keyof typeof UNITS].name)
    : [];
  return (
    <>
      <button className="secondary" disabled={!upgrade} onClick={() => setOpen(true)}>
        <TrendingUp size={15} />{' '}
        {upgrade
          ? b.turretLevel
            ? 'Améliorer le mur · 2 PA'
            : 'Améliorer · 2 PA'
          : 'Niveau maximal'}
      </button>
      {open &&
        upgrade &&
        createPortal(
          <Modal
            title={`Évoluer en ${upgrade.name.toLowerCase()}`}
            eyebrow="DÉVELOPPEMENT"
            onClose={() => setOpen(false)}
          >
            <div className="upgrade-preview">
              <p>Ce bâtiment évolue sur sa case actuelle.</p>
              {b.turretLevel && (
                <p>
                  La tourelle est conservée au niveau {b.turretLevel}. Son arme s’améliore
                  séparément avec « Améliorer la tourelle ».
                </p>
              )}
              <ul>
                <li>
                  Solidité : {BUILDINGS[b.kind].hp * b.level} →{' '}
                  {BUILDINGS[upgrade.kind].hp * upgrade.level} PV maximum. Le bâtiment est
                  entièrement réparé.
                </li>
                {!isWall(b.kind) && (
                  <li>
                    Population : {format(b.population)} →{' '}
                    {format(Math.max(b.population, upgrade.minimumPopulation))} habitants ; capacité
                    de croissance : {capacity(b.kind, b.level)} →{' '}
                    {capacity(upgrade.kind, upgrade.level)}.
                  </li>
                )}
                {isWall(b.kind) && (
                  <li>
                    Résistance aux attaques : {BUILDING_DEFENSE[b.kind] ?? 0} →{' '}
                    {BUILDING_DEFENSE[upgrade.kind] ?? 0}. Vos unités gardent le passage ; tous les
                    ennemis restent bloqués jusqu’à destruction. Les raccords aux remparts voisins
                    sont conservés.
                  </li>
                )}
                {RESOURCES.filter(
                  (r) =>
                    ((BUILDINGS[b.kind].production as Partial<Wallet>)[r] ?? 0) ||
                    ((BUILDINGS[upgrade.kind].production as Partial<Wallet>)[r] ?? 0),
                ).map((r) => (
                  <li key={r}>
                    {RESOURCE_NAMES[r]} / min (production de base) :{' '}
                    {((BUILDINGS[b.kind].production as Partial<Wallet>)[r] ?? 0) *
                      productionMultiplier(b.kind, b.level)}{' '}
                    →{' '}
                    {((BUILDINGS[upgrade.kind].production as Partial<Wallet>)[r] ?? 0) *
                      productionMultiplier(upgrade.kind, upgrade.level)}
                    .
                  </li>
                ))}
                {upgrade.kind === 'VILLAGE' && (
                  <li>
                    Impôt : 0,015 or par habitant et par minute. L’entretien et la consommation de
                    vivres restent déduits du revenu net.
                  </li>
                )}
                {trainingBonusAt(upgrade.kind, upgrade.level) > 0 && (
                  <li>
                    Entraînement : +{trainingBonusAt(b.kind, b.level)} % → +
                    {trainingBonusAt(upgrade.kind, upgrade.level)} % aux PV, attaque et défense des
                    types d’unités formés ici, y compris les troupes existantes. Le meilleur bonus
                    s’applique, sans cumul entre bâtiments.
                  </li>
                )}
                {storageBonus(upgrade.kind, upgrade.level) > 0 && (
                  <li>
                    Stockage ajouté : {storageBonus(b.kind, b.level)} →{' '}
                    {storageBonus(upgrade.kind, upgrade.level)} par ressource.
                  </li>
                )}
                {!isWall(b.kind) && (
                  <li>Vision : +{upgrade.level - 1} cases par rapport au bâtiment de niveau 1.</li>
                )}
                {unlocked.length > 0 && (
                  <li>
                    Recrutement dans ce bâtiment : {unlocked.join(', ')} (autres prérequis toujours
                    nécessaires).
                  </li>
                )}
              </ul>
              <h3>À payer pour cette amélioration</h3>
              <p>
                Les {costAP} PA et les ressources ci-dessous sont déduits de votre stock à la
                confirmation. Les habitants requis restent dans le bâtiment.
              </p>
              <p
                className={
                  !world.player.unlimitedAP && world.player.ap < costAP ? 'upgrade-missing' : ''
                }
              >
                {costAP} PA nécessaires · {world.player.unlimitedAP ? '∞' : world.player.ap}{' '}
                disponibles
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Ressource</th>
                    <th>Coût</th>
                    <th>Stock</th>
                    <th>Après paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.filter((r) => (upgrade.cost[r] ?? 0) > 0).map((r) => (
                    <tr key={r} className={missing.includes(r) ? 'upgrade-missing' : ''}>
                      <td>{RESOURCE_NAMES[r]}</td>
                      <td>{format(upgrade.cost[r] ?? 0)}</td>
                      <td>
                        {format(world.player.wallet[r])}
                        {missing.includes(r) && (
                          <small className="upgrade-deficit">
                            Manque{' '}
                            {format(Math.ceil((upgrade.cost[r] ?? 0) - world.player.wallet[r]))}
                          </small>
                        )}
                      </td>
                      <td>
                        {missing.includes(r)
                          ? '—'
                          : format(world.player.wallet[r] - (upgrade.cost[r] ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <StorageHint
                cost={upgrade.cost}
                wallet={world.player.wallet}
                capacity={world.player.capacity}
              />
              {upgrade.population > 0 && (
                <p className={populationMissing ? 'upgrade-missing' : ''}>
                  Population requise dans ce bâtiment : {upgrade.population} habitants ·{' '}
                  {format(b.population)} actuellement.
                </p>
              )}
              <button
                className="primary"
                disabled={unavailable}
                onClick={async () => {
                  const request = send({ type: 'UPGRADE', actorId: b.id, payload: {} });
                  setOpen(false);
                  await request;
                }}
              >
                Confirmer l’amélioration · {costAP} PA
              </button>
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
