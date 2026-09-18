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
    expect(new Set(medals.map((m) => m.shape)).size).toBe(4);
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
