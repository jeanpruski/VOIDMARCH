import {
  mobilityLevel,
  mobilityLimits,
  mobilitySources,
  mobilityCost,
  MOBILITY_NAMES,
} from '@voidmarch/config';
import { logisticsDiscount, LOGISTICS_RECIPES } from '@voidmarch/config';
import { developmentReason, upgradeDevelopmentStage } from '@voidmarch/config';
import { TrainingUpgrade } from './ArmySupport';
import { recruitmentLevel, type UnitKind } from '@voidmarch/config';
import { ActionButton } from './ActionButton';
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
  buildingEra,
  WALL_KINDS,
} from '@voidmarch/config';
import type { ViewTile } from '@voidmarch/shared';
import { Modal, format, StorageHint, Miniature, BUILDING_FRAMES } from './ui';
import { send, useGame } from './store';

export function UpgradeBuilding({ building: b }: { building: NonNullable<ViewTile['building']> }) {
  const [open, setOpen] = useState(false);
  const world = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  const now = useGame((s) => s.now);
  const upgrade = buildingUpgrade(b.kind, b.level);
  const owned = world.tiles.flatMap((t) =>
    t.building?.ownerId === world.player.id ? [t.building] : [],
  );
  const developmentError = upgrade
    ? developmentReason(
        world.tiles.flatMap((t) => (t.building?.ownerId === world.player.id ? [t.building] : [])),
        upgradeDevelopmentStage(b.kind, upgrade.level),
      )
    : '';
  const combatError =
    b.lastDamagedAt && now - b.lastDamagedAt < 90000
      ? 'Attendez 90 secondes sans dégâts avant d’améliorer.'
      : '';
  const costAP = ACTION_COST.UPGRADE;
  const missing = upgrade
    ? RESOURCES.filter((r) => world.player.wallet[r] < (upgrade.cost[r] ?? 0))
    : [];
  const populationMissing = !!upgrade && b.population < upgrade.population;
  const unavailable =
    pending ||
    (!world.player.unlimitedAP && world.player.ap < costAP) ||
    missing.length > 0 ||
    populationMissing ||
    !!developmentError ||
    !!combatError;
  const capacity = populationCapacity;
  const unlocked = upgrade
    ? Object.entries(UNIT_PROFILES)
        .filter(
          ([kind, p]) =>
            p.recruitAt.includes(upgrade.kind) &&
            recruitmentLevel(kind as UnitKind, upgrade.kind) <= upgrade.level &&
            (!p.recruitAt.includes(b.kind) || recruitmentLevel(kind as UnitKind, b.kind) > b.level),
        )
        .map(([kind]) => UNITS[kind as keyof typeof UNITS].name)
    : [];
  return (
    <>
      <ActionButton
        shortcut="A"
        className="secondary"
        disabled={!upgrade}
        onClick={() => setOpen(true)}
      >
        <TrendingUp size={15} />{' '}
        {upgrade
          ? b.turretLevel
            ? 'Améliorer le mur · 2 PA'
            : 'Améliorer · 2 PA'
          : 'Niveau maximal'}
      </ActionButton>
      {open &&
        upgrade &&
        createPortal(
          <Modal
            title={`Évoluer en ${upgrade.name.toLowerCase()}`}
            eyebrow="DÉVELOPPEMENT"
            onClose={() => setOpen(false)}
          >
            <div className="upgrade-preview">
              <div className="building-age-comparison">
                <figure>
                  <Miniature
                    frame={BUILDING_FRAMES[b.kind]}
                    building={b}
                    size={128}
                    turretLevel={b.turretLevel}
                  />
                  <figcaption>
                    Niveau {isWall(b.kind) ? WALL_KINDS.indexOf(b.kind) + 1 : b.level} ·{' '}
                    {buildingEra(b.kind, b.level)}
                  </figcaption>
                </figure>
                <span aria-hidden="true">→</span>
                <figure>
                  <Miniature
                    frame={BUILDING_FRAMES[upgrade.kind]}
                    building={upgrade}
                    size={128}
                    turretLevel={b.turretLevel}
                  />
                  <figcaption>
                    Niveau{' '}
                    {isWall(upgrade.kind) ? WALL_KINDS.indexOf(upgrade.kind) + 1 : upgrade.level} ·{' '}
                    {buildingEra(upgrade.kind, upgrade.level)}
                  </figcaption>
                </figure>
              </div>
              <p>Ce bâtiment évolue sur sa case actuelle.</p>
              {(developmentError || combatError) && (
                <p className="negative">{developmentError || combatError}</p>
              )}
              {b.turretLevel && (
                <p>
                  La tourelle est conservée au niveau {b.turretLevel}. Son arme s’améliore
                  séparément avec « Améliorer la tourelle ».
                </p>
              )}
              <ul>
                {mobilitySources(b.kind).map((resource) => {
                  const current = mobilityLevel(owned, resource);
                  const next = mobilityLevel(
                    owned.map((site) => (site.id === b.id ? { ...site, ...upgrade } : site)),
                    resource,
                  );
                  const before = mobilityLimits(current),
                    after = mobilityLimits(next);
                  const oldCost = mobilityCost(b.kind, current, resource, 1),
                    newCost = mobilityCost(upgrade.kind, next, resource, 1);
                  return (
                    <li key={resource}>
                      {MOBILITY_NAMES[resource]} : stockage partagé {before.capacity} →{' '}
                      {after.capacity} ; quota partagé {before.hourly} → {after.hourly} points/h.{' '}
                      Tarif par point :{' '}
                      {RESOURCES.filter((r) => (oldCost[r] ?? 0) > 0)
                        .map((r) => `${RESOURCE_NAMES[r]} ${oldCost[r]} → ${newCost[r]}`)
                        .join(', ')}
                      .{' '}
                      {next === current
                        ? 'Un autre producteur fixe déjà le niveau de cette filière.'
                        : 'Ce niveau fixe également les tarifs dans vos autres producteurs de cette ressource.'}
                    </li>
                  );
                })}

                {b.kind === 'LOGISTICS_CENTER' && (
                  <>
                    <li>
                      Réduction sur les conversions : {logisticsDiscount(b.level)} % →{' '}
                      {logisticsDiscount(upgrade.level)} %. Le quota reste partagé et dépend du
                      développement du royaume.
                    </li>
                    {Object.values(LOGISTICS_RECIPES)
                      .filter((r) => r.level === upgrade.level)
                      .map((r) => (
                        <li key={r.name}>
                          Nouvelle recette : {r.name} (développement {r.stage} requis).
                        </li>
                      ))}
                  </>
                )}

                <li>
                  Solidité : {format(BUILDINGS[b.kind].hp * b.level)} →{' '}
                  {format(BUILDINGS[upgrade.kind].hp * upgrade.level)} PV maximum. Le bâtiment est
                  entièrement réparé.
                </li>
                {!isWall(b.kind) && (
                  <li>
                    Population : {format(b.population)} →{' '}
                    {format(Math.max(b.population, upgrade.minimumPopulation))} habitants ; capacité
                    de croissance : {format(capacity(b.kind, b.level))} →{' '}
                    {format(capacity(upgrade.kind, upgrade.level))}.
                  </li>
                )}
                {isWall(b.kind) && (
                  <li>
                    Résistance aux attaques : {format(BUILDING_DEFENSE[b.kind] ?? 0)} →{' '}
                    {format(BUILDING_DEFENSE[upgrade.kind] ?? 0)}. Vos unités gardent le passage ;
                    tous les ennemis restent bloqués jusqu’à destruction. Les raccords aux remparts
                    voisins sont conservés.
                  </li>
                )}
                {RESOURCES.filter(
                  (r) =>
                    ((BUILDINGS[b.kind].production as Partial<Wallet>)[r] ?? 0) ||
                    ((BUILDINGS[upgrade.kind].production as Partial<Wallet>)[r] ?? 0),
                ).map((r) => (
                  <li key={r}>
                    {RESOURCE_NAMES[r]} / min (production de base) :{' '}
                    {format(
                      ((BUILDINGS[b.kind].production as Partial<Wallet>)[r] ?? 0) *
                        productionMultiplier(b.kind, b.level),
                    )}{' '}
                    →{' '}
                    {format(
                      ((BUILDINGS[upgrade.kind].production as Partial<Wallet>)[r] ?? 0) *
                        productionMultiplier(upgrade.kind, upgrade.level),
                    )}
                    .
                  </li>
                ))}
                {upgrade.kind === 'VILLAGE' && (
                  <li>
                    Impôt : 1,5 or pour 100 habitants par minute. L’entretien et la consommation de
                    vivres restent déduits du revenu net.
                  </li>
                )}
                {storageBonus(upgrade.kind, upgrade.level) > 0 && (
                  <li>
                    Stockage ajouté : {format(storageBonus(b.kind, b.level))} →{' '}
                    {format(storageBonus(upgrade.kind, upgrade.level))} par ressource.
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
              {trainingBonusAt(upgrade.kind, upgrade.level) > 0 && (
                <TrainingUpgrade
                  building={b}
                  next={{ ...b, ...upgrade }}
                  owned={world.tiles.flatMap((t) =>
                    t.building?.ownerId === world.player.id ? [t.building] : [],
                  )}
                />
              )}
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
