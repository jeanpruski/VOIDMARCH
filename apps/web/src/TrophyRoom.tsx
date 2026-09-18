import { missionWallCount } from '@voidmarch/game-rules';
import { useMemo, useState } from 'react';
import { Award, ArrowLeft, MapPin } from 'lucide-react';
import { BUILDINGS, UNITS, formatNumber } from '@voidmarch/config';
import type { MissionTrophy } from '@voidmarch/shared';
import { focusMap, useGame } from './store';
import { Cost } from './ui';
import { MissionMedal } from './MissionMedal';
import { missionDifficulty } from './mission-guidance';

const difficultyRank = { Escarmouche: 1, Assaut: 2, Siège: 3, 'Grande campagne': 4 };
const metalNames = { bronze: 'Bronze', silver: 'Argent', gold: 'Or' };
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const date = (at: number) =>
  new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const roster = <T extends string>(kinds: T[], name: (kind: T) => string) =>
  [...new Set(kinds)]
    .map((kind) => `${kinds.filter((k) => k === kind).length} × ${name(kind)}`)
    .join(' · ');

function TrophyDetails({ trophy, back }: { trophy: MissionTrophy; back: () => void }) {
  const m = trophy.mission;
  const difficulty = missionDifficulty(m);
  return (
    <div className="trophy-detail">
      <button
        className="trophy-back"
        onClick={(e) => {
          back();
          e.currentTarget.closest('.modal-body')?.scrollTo({ top: 0 });
        }}
      >
        <ArrowLeft size={16} /> Retour à la collection
      </button>
      <div className="trophy-detail-heading">
        <MissionMedal medal={trophy.medal} level={m.level} />
        <div>
          <span className="eyebrow">
            {metalNames[trophy.medal.metal]} · NIVEAU {m.level}
          </span>
          <h3>{trophy.medal.name}</h3>
          <p>Décernée le {date(trophy.completedAt)}</p>
          <span className={`mission-difficulty-badge mission-difficulty-${difficulty.tone}`}>
            {difficulty.label} · {m.difficulty}
          </span>
        </div>
      </div>
      <section>
        <h3>La mission qui t’a valu cette médaille</h3>
        <h4>{m.title}</h4>
        <p>
          {m.objective === 'COMMANDER'
            ? 'Commandant de garnison éliminé'
            : 'Bâtiment maître détruit'}{' '}
          · Mission de niveau {m.level}
        </p>
        <p className="muted">
          Acceptée le {date(m.startedAt)} · Accomplie en{' '}
          {formatNumber(Math.max(0, trophy.completedAt - m.startedAt) / 60000)} min · À {m.distance}{' '}
          cases de la capitale au départ.
        </p>
      </section>
      <table className="trophy-battle-table">
        <caption>Bilan de la forteresse</caption>
        <thead>
          <tr>
            <th>Forces ennemies</th>
            <th>Au départ</th>
            <th>Détruites</th>
            <th>Ralliées</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Unités</th>
            <td>{m.units.length}</td>
            <td>{trophy.destroyed.units}</td>
            <td>{trophy.captured.units}</td>
          </tr>
          <tr>
            <th>Bâtiments</th>
            <td>{m.buildings.length}</td>
            <td>{trophy.destroyed.buildings}</td>
            <td>{trophy.captured.buildings}</td>
          </tr>
          <tr>
            <th>Remparts</th>
            <td>{missionWallCount(m)}</td>
            <td>{trophy.destroyed.walls}</td>
            <td>{trophy.captured.walls}</td>
          </tr>
        </tbody>
      </table>
      <details className="trophy-roster">
        <summary>Voir la composition de la forteresse</summary>
        <p>{roster(m.units, (k) => UNITS[k].name)}</p>
        <p>{roster(m.buildings, (k) => BUILDINGS[k].name)}</p>
        {m.wall && (
          <p>
            {missionWallCount(m)} × {BUILDINGS[m.wall].name}
          </p>
        )}
      </details>
      <div className="mission-rewards">
        <strong>Butin reçu</strong>
        <Cost cost={trophy.reward} />
      </div>
      <button onClick={() => focusMap(m)}>
        <MapPin size={16} /> Voir le lieu de la victoire · {m.q}, {m.r}
      </button>
    </div>
  );
}
export function TrophyRoom() {
  const trophies = useGame((s) => s.world?.missions?.trophies) ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState('all');
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('difficulty');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const matches = trophies.filter(
      (t) =>
        (difficulty === 'all' || t.mission.difficulty === difficulty) &&
        (level === 'all' || t.mission.level === Number(level)) &&
        normalize(`${t.medal.name} ${t.mission.title}`).includes(normalize(query.trim())),
    );
    return matches.sort((a, b) => {
      const value = (t: MissionTrophy) =>
        sort === 'enemies'
          ? t.mission.units.length
          : sort === 'buildings'
            ? t.mission.buildings.length
            : sort === 'walls'
              ? missionWallCount(t.mission)
              : sort === 'recent'
                ? t.completedAt
                : difficultyRank[t.mission.difficulty] * 10 + t.mission.level;
      return value(b) - value(a) || b.completedAt - a.completedAt || a.id.localeCompare(b.id);
    });
  }, [trophies, difficulty, level, query, sort]);
  const trophy = trophies.find((t) => t.id === selected);
  if (trophy) return <TrophyDetails trophy={trophy} back={() => setSelected(null)} />;
  const totalPages = Math.max(1, Math.ceil(filtered.length / 12)),
    current = Math.min(page, totalPages);
  return (
    <div className="trophy-room">
      <div className="trophy-room-intro">
        <Award size={28} />
        <div>
          <h3>
            {trophies.length} médaille{trophies.length > 1 ? 's' : ''} · {trophies.length} victoire
            {trophies.length > 1 ? 's' : ''}
          </h3>
          <p>
            Chaque médaille raconte une campagne. Ouvre-la pour retrouver son objectif, sa garnison
            et ton butin.
          </p>
        </div>
      </div>
      {!trophies.length ? (
        <div className="trophy-empty">
          <Award size={48} />
          <h3>Ta première décoration t’attend</h3>
          <p>
            Termine une mission pour recevoir une médaille. Son apparence est aléatoire et purement
            décorative : bronze pour une escarmouche, argent pour un assaut, or pour un siège ou une
            grande campagne.
          </p>
          <button className="primary" onClick={() => useGame.setState({ panel: 'missions' })}>
            Choisir une mission
          </button>
        </div>
      ) : (
        <>
          <div className="trophy-filters">
            <label>
              Rechercher une médaille ou une mission
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Nom de la médaille ou de la mission…"
              />
            </label>
            <label>
              Difficulté
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Toutes les difficultés</option>
                <option value="Escarmouche">Facile · Escarmouche</option>
                <option value="Assaut">Moyenne · Assaut</option>
                <option value="Siège">Difficile · Siège</option>
                <option value="Grande campagne">Extrême · Grande campagne</option>
              </select>
            </label>
            <label>
              Niveau
              <select
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Tous les niveaux</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    Niveau {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Trier les trophées
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="difficulty">Difficulté puis niveau</option>
                <option value="enemies">Plus d’ennemis au départ</option>
                <option value="buildings">Plus de bâtiments au départ</option>
                <option value="walls">Plus de remparts au départ</option>
                <option value="recent">Victoires les plus récentes</option>
              </select>
            </label>
          </div>
          <p className="muted">
            {filtered.length} trophée{filtered.length > 1 ? 's' : ''} · Tri décroissant, selon la
            forteresse au début de la mission.
          </p>
          {!filtered.length && <p role="status">Aucun trophée ne correspond à ces filtres.</p>}
          <div className="trophy-grid">
            {filtered.slice((current - 1) * 12, current * 12).map((t) => {
              const d = missionDifficulty(t.mission);
              return (
                <button
                  className="trophy-card"
                  key={t.id}
                  onClick={(e) => {
                    setSelected(t.id);
                    e.currentTarget.closest('.modal-body')?.scrollTo({ top: 0 });
                  }}
                  aria-label={`Voir la médaille ${t.medal.name} pour ${t.mission.title}`}
                >
                  <MissionMedal medal={t.medal} level={t.mission.level} />
                  <strong>{t.medal.name}</strong>
                  <span>{t.mission.title}</span>
                  <span className={`mission-difficulty-badge mission-difficulty-${d.tone}`}>
                    {d.label} · Niv. {t.mission.level}
                  </span>
                  <small>
                    {t.mission.units.length} ennemi{t.mission.units.length > 1 ? 's' : ''} ·{' '}
                    {t.mission.buildings.length} bâtiments · {missionWallCount(t.mission)} remparts
                  </small>
                  <small>{date(t.completedAt)}</small>
                </button>
              );
            })}
          </div>
          {totalPages > 1 && (
            <nav className="trophy-pagination" aria-label="Pages des trophées">
              <button
                disabled={current === 1}
                onClick={(e) => {
                  setPage(current - 1);
                  e.currentTarget.closest('.modal-body')?.scrollTo({ top: 0 });
                }}
              >
                Précédent
              </button>
              <span>
                Page {current} / {totalPages}
              </span>
              <button
                disabled={current === totalPages}
                onClick={(e) => {
                  setPage(current + 1);
                  e.currentTarget.closest('.modal-body')?.scrollTo({ top: 0 });
                }}
              >
                Suivant
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
