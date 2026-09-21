import { UNITS, UNIT_PROFILES, UNIT_TERRAIN_AFFINITIES, type UnitKind } from '@voidmarch/config';

/** Calibrate sustained fire against an equivalent, untrained opponent on plain.
 * Fixed catalogue values only: enemy HP and the attacker's current HP never set
 * damage. Training, terrain, armour and counters still modify the real fight.
 * Specialist/support units deliberately retain weak off-role attacks. */
export const UNIT_IMPACT = Object.fromEntries(
  (Object.keys(UNITS) as UnitKind[]).map((kind) => {
    const u = UNITS[kind],
      p = UNIT_PROFILES[kind];
    const specialist =
      p.builder ||
      p.transport ||
      p.fishing ||
      (p.healer && u.attack <= 4) ||
      kind === 'RAM' ||
      kind === 'RECON_PLANE' ||
      (!p.flying && (p.antiAir ?? 0) > u.attack);
    if (!u.attack || specialist || p.submarine) return [kind, 2];
    const plain = UNIT_TERRAIN_AFFINITIES[kind].find((a) => a.terrain === 'PLAIN');
    const attack = u.attack * (1 + (plain?.attack ?? 0) / 100);
    const antiArmor = p.armored ? (p.antiArmor ?? 0) : 0;
    const antiAir = p.flying ? (p.antiAir ?? 0) : 0;
    const counter = antiArmor || (p.mounted ? (p.antiCavalry ?? 0) : 0);
    const defense =
      u.defense * (1 + (plain?.defense ?? 0) / 100) * (antiArmor ? 0.25 : antiAir ? 0.5 : 1);
    const doubled = attack * 2 + (counter + antiAir) * 2 - defense;
    // A durable defender needs four hits, not the same burst as an assault unit.
    // Preserve doubled offence for fragile attackers; only cap it to prevent a
    // mirror one-shot (including the +/-1 roll and small rounding differences).
    const desired = Math.max(Math.ceil(u.hp / 4) + 2, Math.min(u.hp * 0.9 - 1, doubled));
    return [kind, (desired + defense) / (attack + counter + antiAir)];
  }),
) as Record<UnitKind, number>;
