import { EMBLEM_IDS } from '@voidmarch/config';
import { settingsSchema } from '@voidmarch/protocol';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MissionMedal } from '../apps/web/src/MissionMedal';
import { describe, expect, it } from 'vitest';
import { createMissionTrophy } from '../apps/server/src/mission-trophies';
import type { ActiveMission } from '@voidmarch/shared';
const now = 1_900_000_000_000;
const mission: ActiveMission = {
  id: 'campaign-1',
  title: 'Fort de Minuit',
  difficulty: 'Siège',
  level: 3,
  objective: 'COMMANDER',
  buildings: ['VILLAGE', 'BARRACKS', 'HOUSE'],
  units: ['RIFLEMAN', 'OFFICER', 'SNIPER', 'MACHINE_GUNNER', 'BAZOOKA'],
  wall: 'STEEL_WALL',
  abandonmentCost: { GOLD: 1350, FOOD: 810 },
  realmId: 'a',
  ownerId: 'garrison',
  objectiveId: 'commander',
  q: 40,
  r: 0,
  startedAt: now - 300000,
  distance: 40,
};
const captured = { units: 3, buildings: 2, walls: 9 };
const reward = { GOLD: 4050, FOOD: 2430 };
describe('médailles de campagne', () => {
  it('partage les 28 emblèmes entre les bannières sauvegardées et les nouvelles médailles', () => {
    expect(EMBLEM_IDS).toHaveLength(28);
    expect(new Set(EMBLEM_IDS).size).toBe(28);
    const medals = Array.from(
      { length: 1000 },
      (_, i) => createMissionTrophy({ ...mission, id: `emblem-${i}` }, now, captured, reward).medal,
    );
    expect(new Set(medals.map((medal) => medal.emblem))).toEqual(new Set(EMBLEM_IDS));
    for (const emblem of EMBLEM_IDS) {
      expect(settingsSchema.parse({ emblem })).toEqual({ emblem });
      const medal = medals.find((medal) => medal.emblem === emblem)!;
      expect(medal.name).not.toContain('undefined');
      expect(renderToStaticMarkup(createElement(MissionMedal, { medal }))).toContain('<svg');
    }
    expect(settingsSchema.safeParse({ emblem: 'unknown-symbol' }).success).toBe(false);
  });

  it('varie les motifs, ornements, gemmes et finitions, sans changer les anciennes médailles', () => {
    const medals = Array.from(
      { length: 1000 },
      (_, i) => createMissionTrophy({ ...mission, id: `design-${i}` }, now, captured, reward).medal,
    );
    for (const [field, count] of [
      ['shape', 10],
      ['ribbon', 10],
      ['ribbonPattern', 6],
      ['ornament', 6],
      ['gem', 6],
      ['finish', 3],
    ] as const)
      expect(new Set(medals.map((m) => m[field])).size).toBe(count);
    const legacy = {
      name: 'Ancienne médaille',
      shape: 'round',
      ribbon: 'pine',
      metal: 'bronze',
      emblem: EMBLEM_IDS[0],
    } as const;
    const svg = renderToStaticMarkup(createElement(MissionMedal, { medal: legacy }));
    expect(svg).not.toContain('undefined');
    expect(svg).not.toContain('NaN');
    for (const route of ['LAND', 'SEA'] as const) {
      const trophy = createMissionTrophy(
        {
          ...mission,
          expedition: { siteId: 'test', mode: 'RECON', route, phase: 'VISIT', targetDistance: 80 },
        },
        now,
        captured,
        reward,
      );
      expect(trophy.medal.theme).toBe(route === 'LAND' ? 'land' : 'sea');
    }
  });
  it('crée une décoration stable et un bilan complet, indépendant des objets du monde', () => {
    const m = structuredClone(mission),
      survivors = { ...captured },
      loot = { ...reward };
    const trophy = createMissionTrophy(m, now, survivors, loot);
    expect(trophy).toEqual(createMissionTrophy(m, now, survivors, loot));
    expect(trophy.id).toBe(m.id);
    expect(trophy.destroyed).toEqual({ units: 2, buildings: 1, walls: 3 });
    expect(trophy.mission).toMatchObject({
      title: 'Fort de Minuit',
      level: 3,
      objective: 'COMMANDER',
      distance: 40,
    });
    m.units.pop();
    m.buildings.pop();
    survivors.units = 0;
    loot.GOLD = 0;
    expect(trophy.mission.units).toHaveLength(5);
    expect(trophy.mission.buildings).toHaveLength(3);
    expect(trophy.captured.units).toBe(3);
    expect(trophy.reward.GOLD).toBe(4050);
    expect(JSON.parse(JSON.stringify(trophy))).toEqual(trophy);
  });
  it('fait varier rubans, emblèmes et formes entre les missions, avec un métal lié à la difficulté', () => {
    const medals = Array.from(
      { length: 60 },
      (_, i) =>
        createMissionTrophy({ ...mission, id: `campaign-${i}` }, now, captured, reward).medal,
    );
    expect(new Set(medals.map((m) => m.shape)).size).toBe(10);
    expect(new Set(medals.map((m) => m.ribbon)).size).toBeGreaterThan(3);
    expect(new Set(medals.map((m) => m.emblem)).size).toBeGreaterThan(3);
    expect(new Set(medals.map((m) => JSON.stringify(m))).size).toBeGreaterThan(40);
    for (const [difficulty, metal] of [
      ['Escarmouche', 'bronze'],
      ['Assaut', 'silver'],
      ['Siège', 'gold'],
    ] as const)
      expect(
        createMissionTrophy({ ...mission, difficulty }, now, captured, reward).medal.metal,
      ).toBe(metal);
  });
});
