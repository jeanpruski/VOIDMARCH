import { useEffect, useState } from 'react';
import type { ArmyFormation } from '@voidmarch/shared';
import { useGame, recallArmy, send } from './store';
import { FORMATION_NAMES, FORMATION_DESCRIPTIONS } from './group-movement';
export function ArmyEditor() {
  const world = useGame((s) => s.world)!;
  const ids = useGame((s) => s.selectedUnitIds);
  const formation = useGame((s) => s.groupFormation);
  const armyId = useGame((s) => s.selectedArmyId);
  const pending = useGame((s) => s.pending);
  const existing = world.player.armies?.find((a) => a.id === armyId);
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState<string | null>(null);
  useEffect(() => setName(existing?.name ?? ''), [existing?.id]);
  useEffect(() => {
    if (!savedName) return;
    const saved = world.player.armies?.find(
      (a) =>
        a.name === savedName &&
        a.unitIds.length === ids.length &&
        a.unitIds.every((id) => ids.includes(id)),
    );
    if (saved) {
      useGame.setState({ selectedArmyId: saved.id });
      setSavedName(null);
    }
  }, [savedName, world.player.armies, ids]);
  return (
    <div className="army-editor">
      <label>
        Formation
        <select
          aria-label="Formation du groupe"
          value={formation}
          disabled={pending}
          onChange={(e) => useGame.setState({ groupFormation: e.target.value as ArmyFormation })}
        >
          {Object.entries(FORMATION_NAMES).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <small>
        {FORMATION_DESCRIPTIONS[formation]} Les obstacles peuvent modifier la formation.
      </small>
      <details>
        <summary>
          {existing ? `Mettre à jour « ${existing.name} »` : 'Enregistrer cette armée'}
        </summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await send({
              type: 'ARMY_SAVE',
              actorId: world.player.id,
              payload: {
                ...(existing ? { armyId: existing.id } : {}),
                name: name.trim(),
                unitIds: ids,
                formation,
              },
            });
            if (result?.accepted) setSavedName(name.trim());
          }}
        >
          <label>
            Nom de l’armée
            <input
              maxLength={32}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Légion noire"
            />
          </label>
          <button disabled={pending}>{existing ? 'Mettre à jour' : 'Enregistrer'} · 0 PA</button>
          {existing && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setName('');
                useGame.setState({ selectedArmyId: null });
              }}
            >
              Créer une autre armée
            </button>
          )}
        </form>
      </details>
    </div>
  );
}
export function SavedArmies() {
  const world = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  return (
    <section className="saved-armies">
      <h3>Mes armées enregistrées</h3>
      <p className="muted">
        12 armées maximum · 10 troupes par armée. Sélectionnez vos troupes sur la carte pour créer
        un groupe.
      </p>
      {!world.player.armies?.length && <p>Aucune armée enregistrée pour le moment.</p>}
      {world.player.armies?.map((a) => {
        const living = a.unitIds.filter((id) =>
          world.units.some((u) => u.id === id && u.ownerId === world.player.id && u.hp > 0),
        );
        return (
          <article className="inset" key={a.id}>
            <h4>{a.name}</h4>
            <p>
              {living.length}/{a.unitIds.length} troupes disponibles ·{' '}
              {FORMATION_NAMES[a.formation]}
            </p>
            <div className="selection-actions">
              {living.length > 0 && (
                <button disabled={pending} onClick={() => recallArmy(a)}>
                  Sélectionner l’armée
                </button>
              )}
              <button
                disabled={pending}
                onClick={() => {
                  setEditing(a.id);
                  setName(a.name);
                }}
              >
                Renommer
              </button>
              <button
                disabled={pending}
                onClick={() =>
                  void send({
                    type: 'ARMY_DELETE',
                    actorId: world.player.id,
                    payload: { armyId: a.id },
                  })
                }
              >
                Retirer du registre · 0 PA
              </button>
            </div>
            {editing === a.id && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const result = await send({
                    type: 'ARMY_SAVE',
                    actorId: world.player.id,
                    payload: { armyId: a.id, name, unitIds: living, formation: a.formation },
                  });
                  if (result?.accepted) setEditing(null);
                }}
              >
                <label>
                  Nouveau nom
                  <input
                    value={name}
                    required
                    maxLength={32}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <button disabled={pending || !living.length}>Enregistrer · 0 PA</button>
              </form>
            )}
          </article>
        );
      })}
    </section>
  );
}
