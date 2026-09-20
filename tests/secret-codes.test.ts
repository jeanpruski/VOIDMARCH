import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSecretCodeInput } from '../apps/web/src/secret-codes';
import { adminCodeMatches } from '../apps/server/src/admin-codes';
import { SECRET_CODES } from '@voidmarch/config';
afterEach(() => vi.useRealTimers());
function input() {
  vi.useFakeTimers();
  const activate = vi.fn(),
    shortcut = vi.fn();
  const input = createSecretCodeInput(activate, shortcut);
  const type = (code: string) => {
    for (const key of code) input.key(key);
  };
  return { input, type, activate, shortcut };
}
describe('codes à trois lettres confirmés par Entrée', () => {
  it.each(Object.entries(SECRET_CODES))(
    '%s : %s attend Entrée et fonctionne sans autre code',
    (kind, code) => {
      const { input: i, type, activate, shortcut } = input();
      type(code.toUpperCase());
      expect(activate).not.toHaveBeenCalled();
      expect(shortcut).not.toHaveBeenCalled();
      expect(i.key('Enter')).toBe(true);
      expect(activate).toHaveBeenCalledExactlyOnceWith(kind, code);
      vi.runAllTimers();
      expect(shortcut).not.toHaveBeenCalled();
      i.key('Enter');
      expect(activate).toHaveBeenCalledTimes(1);
    },
  );
  it('active successivement les quatre codes sans intercepter les lettres d’un autre', () => {
    const { input: i, type, activate, shortcut } = input();
    for (const code of Object.values(SECRET_CODES)) {
      type(code);
      i.key('Enter');
    }
    expect(activate.mock.calls).toEqual(Object.entries(SECRET_CODES));
    expect(shortcut).not.toHaveBeenCalled();
  });
  it.each(['ytrez', 'ytreza', 'hgfds', 'hgfdsq', 'vigie', 'gay', 'aq', 'zs', 'ed', 'rf', 'aqwx'])(
    'ignore l’ancien code ou code incomplet %s',
    (code) => {
      const { input: i, type, activate } = input();
      type(code);
      i.key('Enter');
      expect(activate).not.toHaveBeenCalled();
    },
  );
  it('conserve les raccourcis A, R et E tapés seuls après une courte attente', () => {
    const { input: i, shortcut, activate } = input();
    for (const key of ['a', 'r', 'e']) {
      expect(i.key(key)).toBe(true);
      vi.advanceTimersByTime(650);
    }
    expect(shortcut.mock.calls).toEqual([['a'], ['r'], ['e']]);
    expect(activate).not.toHaveBeenCalled();
    expect(i.key('d')).toBe(false);
    expect(i.key('c')).toBe(false);
  });
  it('annule la séquence en quittant le contexte ou avec Échap et expire sans action parasite', () => {
    const { input: i, type, shortcut, activate } = input();
    i.key('a');
    i.reset();
    vi.runAllTimers();
    type('aqw');
    i.key('Escape');
    i.key('Enter');
    type('zsx');
    vi.advanceTimersByTime(5001);
    i.key('Enter');
    type('rfv');
    i.reset();
    i.key('Enter');
    expect(activate).not.toHaveBeenCalled();
    expect(shortcut).not.toHaveBeenCalled();
  });
});
describe('validation serveur des codes renommés', () => {
  it.each([
    ['ap', 'ADMIN_AP_CODE', 'aqw', ['ytrez', 'ytreza']],
    ['radar', 'ADMIN_RADAR_CODE', 'zsx', ['hgfds', 'hgfdsq']],
    ['vigie', 'ADMIN_VIGIE_CODE', 'edc', ['vigie']],
  ] as const)(
    '%s fonctionne aussi avec les anciennes valeurs du .env',
    (kind, variable, code, old) => {
      for (const configured of [undefined, '', ...old, code]) {
        const env = { [variable]: configured };
        expect(adminCodeMatches(kind, code, env)).toBe(true);
        for (const previous of old) expect(adminCodeMatches(kind, previous, env)).toBe(false);
        expect(adminCodeMatches(kind, undefined, env)).toBe(false);
      }
      expect(adminCodeMatches(kind, 'custom', { [variable]: 'custom' })).toBe(true);
      expect(adminCodeMatches(kind, code, { [variable]: 'custom' })).toBe(false);
    },
  );
});
