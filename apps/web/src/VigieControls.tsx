import { useEffect, useRef, useState } from 'react';
import { BUILDINGS, UNITS, developmentStage } from '@voidmarch/config';
import type { Hex } from '@voidmarch/shared';
import { api, focusMap, notify, useGame } from './store';

export function VigieControls() {
  const world = useGame((s) => s.world);
  const [busy, setBusy] = useState(false);
  const selection = useGame((s) => s.selection);
  const previousTarget = useRef<string | undefined>(undefined);
  const targetId = world?.player.vigieTargetId;
  useEffect(() => {
    if (previousTarget.current && !targetId && world) focusMap(world.player.capital);
    previousTarget.current = targetId;
  }, [targetId, world?.player.id]);
  if (!world?.player.vigie) return null;
  const target = world.realms.find((r) => r.id === targetId);
  const buildings = world.tiles.flatMap((t) =>
    t.building && t.building.ownerId === targetId ? [t.building] : [],
  );
  const units = world.units.filter((u) => u.ownerId === targetId);
  const selectedBuilding = buildings.find(
    (b) => selection?.kind === 'building' && b.id === selection.id,
  );
  const selectedUnit = units.find((u) => selection?.kind === 'unit' && u.id === selection.id);
  async function observe(realmId: string | null) {
    setBusy(true);
    try {
      const { position } = await api<{ position: Hex }>('/admin/vigie/target', { realmId });
      useGame.setState({
        selection: null,
        selectedUnitIds: [],
        mode: 'inspect',
        panel: null,
        groupTarget: null,
        combatTarget: null,
        constructionBuilderId: null,
      });
      focusMap(position);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Observation impossible.', true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="vigie-controls" aria-label="Observation vigie">
      <strong>{target ? `Vigie · ${target.name}` : 'Vigie · choisir un royaume'}</strong>
      <select
        aria-label="Royaume à observer"
        disabled={busy}
        value={targetId ?? ''}
        onChange={(e) => void observe(e.target.value || null)}
      >
        <option value="">Mon royaume</option>
        {world.realms
          .filter((r) => r.id !== world.player.id && !r.defeated && !r.id.startsWith('mission:'))
          .map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.bot ? ' · bot' : ''}
            </option>
          ))}
      </select>
      {target && (
        <>
          <small>
            {buildings.length} bâtiments · {units.length} unités visibles · développement{' '}
            {developmentStage(buildings)}/5
          </small>
          <small>Observation en direct · ordres suspendus · aucune exploration conservée</small>
          {selectedBuilding && (
            <small>
              {BUILDINGS[selectedBuilding.kind].name} · niveau {selectedBuilding.level} ·{' '}
              {Math.round(selectedBuilding.hp)} PV
            </small>
          )}
          {selectedUnit && (
            <small>
              {UNITS[selectedUnit.kind].name} · {Math.round(selectedUnit.hp)} PV
            </small>
          )}
          <button disabled={busy} onClick={() => void observe(target.id)}>
            Recentrer sur sa capitale
          </button>
          <button disabled={busy} onClick={() => void observe(null)}>
            Retour à mon royaume
          </button>
        </>
      )}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api('/admin/vigie', { enabled: false });
            focusMap(world.player.capital);
          } catch (e) {
            notify(e instanceof Error ? e.message : 'Impossible de fermer vigie.', true);
          } finally {
            setBusy(false);
          }
        }}
      >
        Fermer vigie
      </button>
    </aside>
  );
}
