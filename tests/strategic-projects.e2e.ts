import { test, expect } from './fixtures/game-test';
import { createState, createRealm } from '@voidmarch/game-rules';
import { addPlayer, addBuilding, execute, worldView } from '../apps/server/src/engine';
import { strategy } from '../apps/server/src/strategy';
import { tickAllianceProjects } from '../apps/server/src/alliance-projects';
import { PROJECT_BUILD_TIME } from '@voidmarch/config';
import { actionSchema } from '@voidmarch/protocol';

test('projets communs : financement, bonus, annulation et mobile', async ({ page }, testInfo) => {
  let clock = Date.now(),
    state = createState('projects-browser', clock);
  const r = addPlayer(state, 'a', 'Bâtisseur', 'ASH', clock);
  r.settings.tutorialCompleted = true;
  r.wallet = { GOLD: 100000, WOOD: 100000, STONE: 100000, IRON: 100000, FOOD: 100000 };
  state.realms.b = createRealm(
    'b',
    'Allié',
    'IRON',
    { q: r.capital.q + 80, r: r.capital.r },
    clock,
  );
  const host = addBuilding(
    state,
    r,
    { q: r.capital.q + 1, r: r.capital.r },
    'LOGISTICS_CENTER',
    clock,
    3,
  );
  addBuilding(state, r, { q: r.capital.q - 1, r: r.capital.r }, 'TOWER', clock, 3);
  strategy(state, clock).alliances.team = {
    id: 'team',
    name: 'Les Veilleurs',
    emblem: 'shield',
    leaderId: 'a',
    members: ['a', 'b'],
    createdAt: clock,
    messages: [],
    markers: [],
  };
  const view = () => worldView(state, 'a', clock);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.exposeFunction('projectSnapshot', view);
  await page.exposeFunction('projectCommand', (raw: unknown) => {
    const out = execute(state, 'a', actionSchema.parse(raw), clock);
    state = out.state;
    return { result: out.result, world: view() };
  });
  await page.route(/socket__io-client\.js/, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export function io(){const h={};const push=()=>window.projectSnapshot().then(w=>h['world:snapshot']?.(w));setInterval(push,250);const s={on(e,f){h[e]=f;if(e==='connect')queueMicrotask(f);return s},emit(){push();return s},timeout(){return s},async emitWithAck(e,a){const r=await window.projectCommand(a);h['world:snapshot']?.(r.world);return r.result},disconnect(){}};return s;}`,
    }),
  );
  const session = {
    token: `test.${Buffer.from(JSON.stringify({ exp: Math.floor(clock / 1000) + 86400 })).toString('base64')}.test`,
    user: { id: 'a', username: r.name, faction: 'ASH', guest: false },
  };
  await page.route('**/api/**', (route) => route.fulfill({ json: session }));
  await page.goto('/');
  await expect(page.getByText('Génération de la carte…')).toBeHidden({ timeout: 90000 });
  await page.getByRole('button', { name: 'Commerce & diplomatie', exact: true }).click();
  await page.getByRole('button', { name: 'Projets communs', exact: true }).click();
  await page.getByRole('button', { name: 'Ouvrir le financement' }).click();
  await expect(page.getByRole('button', { name: 'Verser ma contribution' })).toBeVisible();
  await page.getByRole('button', { name: 'Verser ma contribution' }).click();
  await expect.poll(() => state.realms.a.wallet.GOLD).toBe(97000);
  await page.getByLabel('Contribution aux ressources restantes').selectOption('100');
  await page.getByRole('button', { name: 'Verser ma contribution' }).click();
  await expect(page.getByText('Chantier en cours', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('projet-commun.png') });
  clock += PROJECT_BUILD_TIME;
  tickAllianceProjects(state, clock);
  state.revision++;
  await expect(page.getByText('Projet achevé', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Projet', exact: true }).selectOption('WATCH');
  await page.getByRole('button', { name: 'Ouvrir le financement' }).click();
  await page.getByRole('button', { name: 'Verser ma contribution' }).click();
  await expect.poll(() => state.strategy!.alliances.team.projects!.find(p => p.kind === 'WATCH')?.contributions.a?.GOLD ?? 0).toBeGreaterThan(0);
  const before = state.realms.a.wallet.GOLD;
  await page.getByRole('button', { name: 'Annuler le projet…' }).click();
  await page.getByRole('button', { name: 'Confirmer le remboursement' }).click();
  await expect.poll(() => state.realms.a.wallet.GOLD).toBeGreaterThan(before);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Grands projets d’alliance' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('projet-commun-mobile.png') });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Fermer/ })
    .click();
  await page.evaluate(async (b) => {
    // @ts-expect-error Vite source module
    const { useGame, focusMap } = await import('/src/store.ts');
    focusMap(b);
    useGame.setState({
      selection: { kind: 'building', id: b.id, q: b.q, r: b.r },
      panel: null,
      mode: 'inspect',
    });
  }, host);
  await page.getByRole('button', { name: 'Produire des PA', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Bonus stratégique : −10 %');
  expect(errors).toEqual([]);
});
