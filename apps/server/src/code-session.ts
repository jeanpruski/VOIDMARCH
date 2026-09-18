import type { Realm } from '@voidmarch/shared';

/** A fresh page starts with both modes off, before any snapshot or order is served.
 * Keeping the page ID in memory on the client preserves modes during token refresh
 * or a brief socket reconnection. Older clients without an ID always start off. */
export function beginCodeSession(realm: Realm, pageId: unknown) {
  const validId =
    typeof pageId === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(pageId)
      ? pageId
      : undefined;
  if (validId && realm.codeSessionId === validId) return false;
  realm.unlimitedAP = false;
  realm.capitalRadar = false;
  realm.codeSessionId = validId;
  return true;
}
