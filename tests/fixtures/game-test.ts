import { test as base } from '@playwright/test';
export { expect, type Page } from '@playwright/test';

/** Gameplay tests dismiss the launch announcement just as a returning player would.
 * season-zero.e2e.ts uses base Playwright to test the announcement itself. */
export const test = base.extend<{ seasonAnnouncement: void }>({
  seasonAnnouncement: [
    async ({ page }, use) => {
      const announcement = page.getByRole('dialog', {
        name: 'Saison 0 — L’Aube Noire',
        exact: true,
      });
      await page.addLocatorHandler(announcement, async () => {
        // These tests exercise gameplay, not the announcement animation. The season suite
        // separately verifies real pointer clicks, Escape and restored focus.
        await announcement
          .getByRole('button', { name: 'Fermer', exact: true })
          .dispatchEvent('click');
      });
      await use();
    },
    { auto: true },
  ],
});
