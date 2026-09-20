import { SECRET_CODES } from '@voidmarch/config';
type Kind = 'ap' | 'radar' | 'vigie';
const variables = {
  ap: 'ADMIN_AP_CODE',
  radar: 'ADMIN_RADAR_CODE',
  vigie: 'ADMIN_VIGIE_CODE',
} as const;
const previous = { ap: ['ytrez', 'ytreza'], radar: ['hgfds', 'hgfdsq'], vigie: ['vigie'] };
/** Old stock .env values follow the renamed defaults; explicit custom values remain overrides. */
export function adminCodeMatches(
  kind: Kind,
  supplied: unknown,
  env: NodeJS.ProcessEnv = process.env,
) {
  const configured = env[variables[kind]]?.trim();
  const expected =
    !configured || previous[kind].includes(configured) ? SECRET_CODES[kind] : configured;
  return supplied === expected;
}
