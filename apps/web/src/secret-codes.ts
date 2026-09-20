import { SECRET_CODES, type SecretCodeKind } from '@voidmarch/config';
export const SPARKLE_TOGGLE_EVENT = 'voidmarch:toggle-sparkle';
/** A/R/E are also action shortcuts. Briefly defer a lone initial, then preserve that action.
 * Once a second letter is entered, only a complete code + Enter can activate a mode. */
export function createSecretCodeInput(
  activate: (kind: SecretCodeKind, code: string) => void,
  shortcut: (key: string) => void,
) {
  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const entries = Object.entries(SECRET_CODES) as [SecretCodeKind, string][];
  const reset = () => {
    clearTimeout(timer);
    timer = undefined;
    buffer = '';
  };
  return {
    reset,
    key(raw: string) {
      const key = raw.toLowerCase();
      if (key === 'enter') {
        const match = entries.find(([, code]) => code === buffer);
        const consumed = !!buffer;
        reset();
        if (match) activate(...match);
        return consumed;
      }
      clearTimeout(timer);
      const candidate = buffer + key;
      buffer = entries.some(([, code]) => code.startsWith(candidate))
        ? candidate
        : entries.some(([, code]) => code.startsWith(key)) && key.length === 1
          ? key
          : '';
      if (!buffer) return false;
      if (buffer.length === 1) {
        const initial = buffer;
        timer = setTimeout(() => {
          reset();
          shortcut(initial);
        }, 650);
      } else timer = setTimeout(reset, 5000);
      return true;
    },
  };
}
