/** Display only: retain full precision in state, prices and simulation. */
const numbers = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
export const formatNumber = (value: number): string =>
  numbers.format(Math.abs(value) < 0.05 ? 0 : value);
