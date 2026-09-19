import { terrainCombatBonus } from '@voidmarch/game-rules';
import type { ArmySupportBonus } from '@voidmarch/shared';
import {
  TERRAINS,
  UNIT_TERRAIN_AFFINITIES,
  formatNumber,
  type Terrain,
  type UnitKind,
} from '@voidmarch/config';

export function TerrainAffinities({
  kind,
  terrain,
  collapsible = false,
  supportBonus,
}: {
  kind: UnitKind;
  terrain?: Terrain;
  collapsible?: boolean;
  supportBonus?: ArmySupportBonus;
}) {
  const entries = UNIT_TERRAIN_AFFINITIES[kind].map((a) => ({
    ...a,
    ...terrainCombatBonus({ kind, supportBonus }, a.terrain),
  }));
  if (!entries.length) return null;
  const active = entries.find((a) => a.terrain === terrain);
  const bonus = (a: { attack: number; defense: number }) =>
    [
      a.attack ? `ATQ +${formatNumber(a.attack)} %` : '',
      a.defense ? `DÉF +${formatNumber(a.defense)} %` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  const list = (
    <ul className="terrain-affinities">
      {entries.map((a) => (
        <li
          key={a.terrain}
          className={a.terrain === terrain ? 'terrain-affinity-active' : undefined}
        >
          <span>{TERRAINS[a.terrain].name}</span>
          <strong>{bonus(a)}</strong>
        </li>
      ))}
    </ul>
  );
  return collapsible ? (
    <details className="terrain-affinity-details">
      <summary>
        {active
          ? `${TERRAINS[active.terrain].name} : ${bonus(active)} · inclus`
          : 'Affinités de terrain · aucun bonus actif'}
      </summary>
      {list}
      <p>
        Sur la case occupée. Les bonus disparaissent en quittant le terrain. La protection naturelle
        du terrain s’ajoute en combat.
        {supportBonus?.terrain
          ? ` Le soutien militaire ajoute ${formatNumber(supportBonus.terrain)} points aux affinités favorables (déjà inclus).`
          : ''}
      </p>
    </details>
  ) : (
    <div className="terrain-affinity-card">
      <span>Affinités de terrain</span>
      {list}
    </div>
  );
}
