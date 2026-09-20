import { test, expect } from './fixtures/game-test';
import { createState } from '@voidmarch/game-rules';
import { addPlayer, worldView } from '../apps/server/src/engine';
import { adminCodeMatches } from '../apps/server/src/admin-codes';

test('quatre codes distincts, Entrée obligatoire, aucun raccourci parasite', async ({ page }) => {
  const now = Date.now(),
    state = createState('codes-browser', now),
    r = addPlayer(state, 'a', 'Codes', 'ASH', now);
  r.settings.tutorialCompleted = true;
  const errors: string[] = [],
    calls: { path: string; code: string }[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('codesSnapshot', () => worldView(state, 'a', now));
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(){window.codesSnapshot().then(w=>h['world:snapshot']?.(w));return s},disconnect(){}};return s;}`,
    }),
  );
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/api/admin/')) {
      const code = route.request().postDataJSON().code;
      calls.push({ path, code });
      const kind = path.endsWith('/vigie')
        ? 'vigie'
        : path.endsWith('/capital-radar')
          ? 'radar'
          : 'ap';
      expect(adminCodeMatches(kind, code, {})).toBe(true);
      return route.fulfill({ json: { enabled: true } });
    }
    return route.fulfill({
      json: {
        token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 3600 })).toString('base64')}.test`,
        user: { id: 'a', username: r.name, faction: 'ASH', guest: false },
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('.game-canvas')).toHaveAttribute('aria-busy', 'false', {
    timeout: 90000,
  });
  await page.evaluate(() => {
    const panel = document.createElement('div');
    panel.className = 'selection-panel';
    panel.id = 'shortcut-fixture';
    for (const key of ['a', 'z', 'e', 'r', 'q', 'w', 's', 'x', 'd', 'c', 'f', 'v']) {
      const b = document.createElement('button');
      b.dataset.actionShortcut = key;
      b.textContent = `Action ${key}`;
      b.onclick = () => {
        document.body.dataset.actionCount = String(
          Number(document.body.dataset.actionCount || 0) + 1,
        );
      };
      panel.append(b);
    }
    document.body.append(panel);
  });
  const root = page.locator('html');
  for (const [i, code] of ['aqw', 'zsx', 'edc'].entries()) {
    await page.keyboard.type(code);
    expect(calls).toHaveLength(i);
    await page.keyboard.press('Enter');
    await expect.poll(() => calls.length).toBe(i + 1);
    expect(calls.at(-1)?.code).toBe(code);
  }
  await page.keyboard.type('rfv');
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-theme', 'sparkle');
  expect(calls).toHaveLength(3);
  await expect(page.locator('body')).not.toHaveAttribute('data-action-count');
  await page.keyboard.type('RFV');
  await page.keyboard.press('Enter');
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  await page.keyboard.type('aqw');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  expect(calls).toHaveLength(3);
  for (const code of ['ytrez', 'hgfds', 'vigie', 'gay']) {
    await page.keyboard.type(code);
    await page.keyboard.press('Enter');
  }
  expect(calls).toHaveLength(3);
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  await page.evaluate(() => {
    const field = document.createElement('input');
    field.id = 'code-input';
    document.body.append(field);
    field.focus();
    delete document.body.dataset.actionCount;
  });
  for (const code of ['aqw', 'zsx', 'edc', 'rfv']) {
    await page.keyboard.type(code);
    await page.keyboard.press('Enter');
  }
  expect(calls).toHaveLength(3);
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  await page.evaluate(() => document.getElementById('code-input')!.remove());
  await page.getByRole('button', { name: 'Royaume', exact: true }).click();
  for (const code of ['aqw', 'zsx', 'edc', 'rfv']) {
    await page.keyboard.type(code);
    await page.keyboard.press('Enter');
  }
  expect(calls).toHaveLength(3);
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.keyboard.press('a');
  await expect(page.locator('body')).toHaveAttribute('data-action-count', '1');
  await page.keyboard.press('r');
  await expect(page.locator('body')).toHaveAttribute('data-action-count', '2');
  await page.keyboard.press('d');
  await expect(page.locator('body')).toHaveAttribute('data-action-count', '3');
  await page.keyboard.type('rfv');
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-theme', 'sparkle');
  await page.reload();
  await expect(root).not.toHaveAttribute('data-theme', 'sparkle');
  expect(errors).toEqual([]);
});
