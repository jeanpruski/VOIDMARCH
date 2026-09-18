import { ActionButton } from './ActionButton';
import { NPCS, RULES } from '@voidmarch/config';
import { resolveAttack, attackCost, attackStats, distance } from '@voidmarch/game-rules';
import type { Unit } from '@voidmarch/shared';
import { Cost, Duration } from './ui';
import { useGame } from './store';

export function NpcInfo({ unit }: { unit: Unit }) {
  if (!unit.npc) return null;
  return (
    <div className="npc-info">
      <strong>
        {unit.expedition
          ? 'Expédition coopérative · Très dangereux'
          : `Rencontre neutre · ${NPCS[unit.npc.kind].danger}`}{' '}
        · portée {NPCS[unit.npc.kind].range}
      </strong>
      <p>
        Reste sur place. Riposte uniquement après une attaque, s’il survit et peut atteindre
        l’attaquant.
      </p>
      <span>Butin total, partagé selon les dégâts infligés :</span>
      <Cost cost={unit.npc.reward} />
      {unit.npc.bonusAP > 0 && (
        <span>
          Bonus : {unit.npc.bonusAP} PA à partager, sans dépasser {RULES.maxAP} PA.
        </span>
      )}
      <small>
        Départ dans <Duration until={unit.npc.expiresAt} />. Sélectionnez une troupe puis « Attaquer
        ».
      </small>
    </div>
  );
}
export function AttackNpc({ unit }: { unit: Unit }) {
  const w = useGame((s) => s.world)!;
  const pending = useGame((s) => s.pending);
  const candidates = [...w.units, ...w.tiles.flatMap((t) => (t.building ? [t.building] : []))];
  const attacker = candidates
    .filter(
      (u) =>
        u.ownerId === w.player.id &&
        attackStats(u).attack > 0 &&
        distance(u, unit) <= attackStats(u).range &&
        !resolveAttack(
          u,
          unit,
          w.tiles.flatMap((t) => (t.building ? [t.building] : [])),
        ).reason,
    )
    .sort((a, b) => attackStats(b).attack - attackStats(a).attack)[0];
  if (!attacker || pending) return null;
  const cost = attackCost(attacker);
  if (!w.player.unlimitedAP && w.player.ap < cost) return null;
  return (
    <ActionButton
      shortcut="A"
      className="secondary"
      onClick={() =>
        useGame.setState({
          selection: {
            kind: 'population' in attacker ? 'building' : 'unit',
            id: attacker.id,
            q: attacker.q,
            r: attacker.r,
          },
          mode: 'attack',
          combatTarget: unit.id,
        })
      }
    >
      Attaquer avec {attackStats(attacker).name} · {cost} PA
    </ActionButton>
  );
}
