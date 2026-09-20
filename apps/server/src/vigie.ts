import type { GameState } from '@voidmarch/shared';

export function toggleVigie(s: GameState, id: string, enabled?: boolean) {
  const realm = s.realms[id];
  if (!realm) throw new Error('Rejoignez le monde avant d’activer vigie.');
  realm.vigie = enabled ?? !realm.vigie;
  realm.vigieTargetId = undefined;
  s.revision++;
  return realm.vigie;
}
export function setVigieTarget(s: GameState, id: string, targetId: unknown) {
  const realm = s.realms[id];
  if (!realm?.vigie) throw new Error('Activez le code vigie avant d’observer un royaume.');
  if (targetId === null) {
    realm.vigieTargetId = undefined;
    s.revision++;
    return realm.capital;
  }
  const target = typeof targetId === 'string' ? s.realms[targetId] : undefined;
  if (!target || target.id === id || target.defeatedAt || target.id.startsWith('mission:'))
    throw new Error('Ce royaume ne peut pas être observé.');
  realm.vigieTargetId = target.id;
  s.revision++;
  return target.capital;
}
