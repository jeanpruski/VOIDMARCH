import { UNITS, UNIT_PROFILES, type UnitKind } from '@voidmarch/config';
import { estimateDamage, unitStats } from '@voidmarch/game-rules';
import type { Unit } from '@voidmarch/shared';
import { simulateDevelopment, simulateSkirmish } from './simulate-balance';
const make = (kind: UnitKind, trainingBonus: number): Unit => ({
  id: kind,
  ownerId: 'a',
  kind,
  q: 0,
  r: 0,
  hp: UNITS[kind].hp,
  trainingBonus,
  createdAt: 0,
  updatedAt: 0,
});
const rows = (Object.keys(UNITS) as UnitKind[])
  .filter((k) => UNITS[k].attack > 0)
  .flatMap((kind) =>
    [0, 25, 60, 80, 100].map((training) => {
      const a = make(kind, training),
        b = { ...a, id: 'target', ownerId: 'b' };
      const terrain = UNIT_PROFILES[kind].naval ? 'SEA' : 'PLAIN';
      const { min, max } = estimateDamage(a, b, { q: 1, r: 0, terrain }, [], terrain);
      const hp = unitStats(b).hp;
      return {
        kind,
        training,
        hp,
        damage: `${min}–${max}`,
        fastest: Math.ceil(hp / max),
        slowest: Math.ceil(hp / min),
      };
    }),
  );
console.table(
  rows.filter(
    (r) =>
      !r.training &&
      [
        'INFANTRY',
        'GUARD',
        'KNIGHT',
        'RIFLEMAN',
        'TANK',
        'SOL_PYRAMID_BEHEMOTH',
        'CYB_ONI_FORTRESS',
        'NUCLEAR_DREADNOUGHT',
      ].includes(r.kind),
  ),
);
const outside = rows.filter((r) => r.fastest < 2 || r.slowest > 4);
console.log(
  `${rows.length - outside.length}/${rows.length} duels miroirs dans 2–4 coups, même aux bornes du tirage.`,
);
console.log('Exceptions (rôles spécialisés hors de leur cible de prédilection) :');
console.table(outside.filter((r) => !r.training));
// A few heterogeneous pairs: progression and intended counters must remain meaningful.
console.table(
  (
    [
      ['INFANTRY', 'GUARD'],
      ['GUARD', 'INFANTRY'],
      ['BERSERKER', 'GUARD'],
      ['ARCHER', 'GUARD'],
      ['BAZOOKA', 'TANK'],
      ['RIFLEMAN', 'TANK'],
      ['FLAK_CANNON', 'BOMBER'],
      ['HUNTER_SUBMARINE', 'NUCLEAR_DREADNOUGHT'],
    ] as [UnitKind, UnitKind][]
  ).map(([from, to]) => {
    const a = make(from, 0),
      b = make(to, 0),
      terrain = UNIT_PROFILES[from].naval ? 'SEA' : 'PLAIN';
    const d = estimateDamage(a, b, { q: 1, r: 0, terrain }, [], terrain);
    return {
      from,
      to,
      damage: `${d.min}–${d.max}`,
      hits: `${Math.ceil(unitStats(b).hp / d.max)}–${Math.ceil(unitStats(b).hp / d.min)}`,
    };
  }),
);
console.log(
  'Combats serveur à portée immédiate : 10 tirages, initiative alternée, 1 PA par camp et par étape.',
);
console.table(
  (
    [
      ['BERSERKER', 2, 'GUARD', 1],
      ['INFANTRY', 1, 'GUARD', 1],
      ['SPEARMAN', 1, 'LIGHT_CAVALRY', 1],
      ['RIFLEMAN', 3, 'GUARD', 1],
      ['TANK', 3, 'RIFLEMAN', 3],
      ['BAZOOKA', 3, 'TANK', 3],
      ['FLAK_CANNON', 3, 'BOMBER', 3],
    ] as [UnitKind, number, UnitKind, number][]
  ).map(([a, level, b, enemyLevel]) => {
    const results = Array.from({ length: 10 }, (_, seed) =>
      simulateSkirmish(a, 1, level, b, enemyLevel, seed, true),
    );
    return {
      a,
      level,
      b,
      enemyLevel,
      aWins: results.filter((r) => r.winner === 'a').length,
      bWins: results.filter((r) => r.winner === 'b').length,
      draws: results.filter((r) => r.winner === 'draw').length,
    };
  }),
);
console.log(
  'Économie isolée : dotation réelle, 50 trophées supposés acquis, aucune récompense de mission, aucun combat, déplacements exclus après le départ. Ce ne sont pas des délais réels de progression.',
);
for (const producerLevel of [3, 5] as const) {
  console.log(`Investissement dans les producteurs jusqu’au niveau ${producerLevel}`);
  console.table(
    simulateDevelopment(producerLevel)
      .filter(
        (row) => row.action.startsWith('Époque ') || row.action === 'Complexe des cloches niveau 5',
      )
      .map((row) => ({
        action: row.action,
        hours: Math.round(row.minutes / 6) / 10,
        storage: row.cap,
      })),
  );
}
