/** Shared defaults: changing a code must update both keyboard routing and server validation. */
export const SECRET_CODES = {
  ap: 'aqw',
  radar: 'zsx',
  vigie: 'edc',
  sparkle: 'rfv',
} as const;
export type SecretCodeKind = keyof typeof SECRET_CODES;
