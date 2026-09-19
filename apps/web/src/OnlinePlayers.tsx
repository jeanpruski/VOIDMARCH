import { Swords } from 'lucide-react';
import { useGame } from './store';
import { Banner } from './Banner';
import { realmBanner } from './banner-art';

export function OnlinePlayers() {
  const world = useGame((s) => s.world)!;
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
        {players.length > 1 ? 's' : ''}.
      </p>
      {!players.length && <p className="muted">Aucun joueur connecté pour le moment.</p>}
      <ul className="online-player-list">
        {players.map((player) => (
          <li key={player.id}>
            <Banner design={realmBanner(world, player.id)} size={54} />
            <div className="online-player-name">
              <strong>{player.name}</strong>
              {player.id === world.player.id && <span className="badge">VOUS</span>}
            </div>
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
