/** Add new resources to persisted wallets, including diplomacy and archives.
 * Partial costs/rewards remain partial; existing balances and assets are retained. */
export function migrateResourceWallets(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  const object = value as Record<string, unknown>;
  if (
    ['GOLD', 'WOOD', 'IRON', 'FOOD'].every((key) => typeof object[key] === 'number') &&
    object.STONE === undefined
  )
    object.STONE = 0;
  for (const child of Object.values(object)) migrateResourceWallets(child);
}
