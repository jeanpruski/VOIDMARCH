import { randomUUID } from 'node:crypto';
import type { GameState } from '@voidmarch/shared';
import type { Action } from '@voidmarch/protocol';
import { requireRule } from './engine';
export function armyAction(
  s: GameState,
  id: string,
  action: Action,
  now: number,
): string | undefined {
  if (action.type !== 'ARMY_SAVE' && action.type !== 'ARMY_DELETE') return;
  requireRule(action.actorId === id, 'Cette armée doit appartenir à votre royaume.');
  const realm = s.realms[id];
  const armies = (realm.armies ??= []);
  if (action.type === 'ARMY_DELETE') {
    requireRule(
      armies.some((a) => a.id === action.payload.armyId),
      'Armée introuvable.',
    );
    realm.armies = armies.filter((a) => a.id !== action.payload.armyId);
    return 'Armée retirée du registre. Vos troupes restent sur la carte.';
  }
  const p = action.payload;
  const existing = p.armyId ? armies.find((a) => a.id === p.armyId) : undefined;
  requireRule(!p.armyId || existing, 'Armée introuvable.');
  requireRule(existing || armies.length < 12, 'Vous pouvez enregistrer 12 armées maximum.');
  requireRule(
    new Set(p.unitIds).size === p.unitIds.length,
    'Une troupe ne peut figurer deux fois dans une armée.',
  );
  requireRule(
    p.unitIds.every(
      (uid) => s.units[uid]?.ownerId === id && s.units[uid].hp > 0 && !s.units[uid].npc,
    ),
    'Sélectionnez uniquement vos troupes actives.',
  );
  requireRule(
    !armies.some(
      (a) => a.id !== existing?.id && a.name.toLocaleLowerCase() === p.name.toLocaleLowerCase(),
    ),
    'Ce nom est déjà utilisé par une armée.',
  );
  const saved = {
    id: existing?.id ?? randomUUID(),
    name: p.name,
    unitIds: [...p.unitIds],
    formation: p.formation,
    updatedAt: now,
  };
  if (existing) Object.assign(existing, saved);
  else armies.push(saved);
  return `Armée « ${p.name} » enregistrée · ${p.unitIds.length} troupes · 0 PA.`;
}
