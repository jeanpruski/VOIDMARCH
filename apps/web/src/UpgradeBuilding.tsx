import { useState } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp } from 'lucide-react';
import {
  type Wallet,
  ACTION_COST,
  BUILDINGS,
  BUILDING_POPULATION,
  RESOURCES,
  RESOURCE_NAMES,
  UNIT_PROFILES,
  UNITS,
  buildingUpgrade,
} from '@voidmarch/config';
import type { ViewTile } from '@voidmarch/shared';
import { Modal, format } from './ui';
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
    pending || world.player.ap < costAP || missing.length > 0 || populationMissing;
  const capacity = (kind: typeof b.kind, level: number) =>
    (BUILDING_POPULATION[kind] ?? 0) * (kind === 'VILLAGE' ? level + 1 : 2);
  const unlocked = upgrade
    ? Object.entries(UNIT_PROFILES)
        .filter(([, p]) => p.recruitAt.includes(upgrade.kind) && !p.recruitAt.includes(b.kind))
        .map(([kind]) => UNITS[kind as keyof typeof UNITS].name)
    : [];
  return (
    <>
      <button className="secondary" disabled={!upgrade} onClick={() => setOpen(true)}>
        <TrendingUp size={15} /> {upgrade ? 'Développer…' : 'Niveau maximal'}
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
              <ul>
                <li>
                  Solidité : {BUILDINGS[b.kind].hp * b.level} →{' '}
                  {BUILDINGS[upgrade.kind].hp * upgrade.level} PV maximum. Le bâtiment est
                  entièrement réparé.
                </li>
                <li>
                  Population : {format(b.population)} →{' '}
                  {format(Math.max(b.population, upgrade.minimumPopulation))} habitants ; capacité
                  de croissance : {capacity(b.kind, b.level)} →{' '}
                  {capacity(upgrade.kind, upgrade.level)}.
                </li>
                {RESOURCES.filter(
                  (r) =>
                    ((BUILDINGS[b.kind].production as Partial<Wallet>)[r] ?? 0) ||
                    ((BUILDINGS[upgrade.kind].production as Partial<Wallet>)[r] ?? 0),
                ).map((r) => (
                  <li key={r}>
                    {RESOURCE_NAMES[r]} / min (production de base) :{' '}
                    {((BUILDINGS[b.kind].production as Partial<Wallet>)[r] ?? 0) *
                      (b.kind === 'VILLAGE' ? b.level : 1)}{' '}
                    →{' '}
                    {((BUILDINGS[upgrade.kind].production as Partial<Wallet>)[r] ?? 0) *
                      upgrade.level}
                    .
                  </li>
                ))}
                {upgrade.kind === 'VILLAGE' && (
                  <li>
                    Impôt : 0,015 or par habitant et par minute. L’entretien et la consommation de
                    vivres restent déduits du revenu net.
                  </li>
                )}
                {unlocked.length > 0 && (
                  <li>
                    Recrutement dans ce bâtiment : {unlocked.join(', ')} (autres prérequis toujours
                    nécessaires).
                  </li>
                )}
              </ul>
              <h3>Coût de l’amélioration</h3>
              <p className={world.player.ap < costAP ? 'upgrade-missing' : ''}>
                {costAP} PA nécessaires · {world.player.ap} disponibles
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Ressource</th>
                    <th>Coût</th>
                    <th>Stock</th>
                    <th>Manque</th>
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.filter((r) => (upgrade.cost[r] ?? 0) > 0).map((r) => (
                    <tr key={r} className={missing.includes(r) ? 'upgrade-missing' : ''}>
                      <td>{RESOURCE_NAMES[r]}</td>
                      <td>{upgrade.cost[r]}</td>
                      <td>{format(world.player.wallet[r])}</td>
                      <td>
                        {Math.ceil(Math.max(0, (upgrade.cost[r] ?? 0) - world.player.wallet[r])) ||
                          '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  const result = await send({ type: 'UPGRADE', actorId: b.id, payload: {} });
                  if (result?.accepted) setOpen(false);
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
