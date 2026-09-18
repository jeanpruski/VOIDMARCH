import type { ButtonHTMLAttributes } from 'react';

/** Keyboard activation uses the same button as a click, preserving all action guards. */
export function ActionButton({
  shortcut,
  children,
  title,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { shortcut?: string }) {
  return (
    <button
      {...props}
      data-action-shortcut={shortcut === 'Espace' ? ' ' : shortcut?.toLowerCase()}
      aria-keyshortcuts={shortcut === 'Espace' ? 'Space' : shortcut?.toLowerCase()}
      title={shortcut ? `${title ? `${title} · ` : ''}Raccourci : ${shortcut}` : title}
    >
      {children}
      {shortcut && (
        <kbd className="action-key" aria-hidden="true">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

export function activateSelectionShortcut(key: string) {
  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.selection-panel button[data-action-shortcut]'),
  ).find(
    (button) =>
      button.dataset.actionShortcut === key.toLowerCase() &&
      !button.disabled &&
      !button.closest('[inert]') &&
      button.checkVisibility(),
  );
  if (!button) return false;
  button.click();
  return true;
}
