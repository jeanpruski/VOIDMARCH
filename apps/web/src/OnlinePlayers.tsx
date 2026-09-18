import { Clock, Swords } from 'lucide-react';
import { useGame } from './store';
import { Sigil } from './ui';

export function connectionDuration(since: number | undefined, now: number) {
  if (since === undefined) return 'Durée indisponible';
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  return hours
    ? `${hours} h ${minutes} min`
    : minutes
      ? `${minutes} min ${seconds % 60} s`
      : `${seconds} s`;
}

export function OnlinePlayers() {
  const world = useGame((s) => s.world)!,
    now = useGame((s) => s.now);
  const players = world.realms
    .filter((r) => r.online && !r.bot)
    .sort(
      (a, b) =>
        Number(b.id === world.player.id) - Number(a.id === world.player.id) ||
        a.name.localeCompare(b.name, 'fr'),
    );
  return (
    <div className="online-players">
      <p className="panel-intro">
        {players.length} joueur{players.length > 1 ? 's' : ''} connecté
        {players.length > 1 ? 's' : ''} · Durée de la session actuelle.
      </p>
      {!players.length && <p className="muted">Aucun joueur connecté pour le moment.</p>}
      <ul className="online-player-list">
        {players.map((player) => (
          <li key={player.id}>
            <Sigil symbol={player.emblem} color={player.color} size={34} />
            <div className="online-player-name">
              <strong>{player.name}</strong>
              {player.id === world.player.id && <span className="badge">VOUS</span>}
            </div>
            <span className="online-player-duration">
              <Clock size={14} aria-hidden="true" />
              {player.connectedSince === undefined
                ? 'Durée indisponible'
                : `Depuis ${connectionDuration(player.connectedSince, now)}`}
            </span>
            <span className={`online-player-mission ${player.onMission ? 'active' : ''}`}>
              <Swords size={14} aria-hidden="true" />
              {player.onMission ? 'En mission' : 'Aucune mission en cours'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
