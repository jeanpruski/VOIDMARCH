import { useState, type FormEvent } from 'react';
import { ArrowRight, Shield, LoaderCircle } from 'lucide-react';
import { FACTIONS, type Faction } from '@voidmarch/config';
import type { AuthUser } from '@voidmarch/shared';
import { acceptSession, api } from './store';
import { Sigil } from './ui';
export function Login() {
  const [mode, setMode] = useState<'guest' | 'login' | 'register'>('guest'),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [email, setEmail] = useState(''),
    [faction, setFaction] = useState<Faction>('ASH'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await api<{ token: string; user: AuthUser }>(`/auth/${mode}`, {
        username,
        ...(mode === 'guest' ? {} : { password, ...(email ? { email } : {}) }),
        faction,
      });
      acceptSession(session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="login-art" />
      <header className="login-header">
        <a className="wordmark" href="/">
          V<span>O</span>IDMARCH
        </a>
      </header>
      <div className="login-content">
        <form onSubmit={submit}>
          <div className="login-tabs">
            {(
              [
                ['guest', 'Entrer dans le monde'],
                ['login', 'Se connecter'],
                ['register', 'Créer un compte'],
              ] as const
            ).map(([id, label]) => (
              <button
                type="button"
                key={id}
                className={mode === id ? 'active' : ''}
                onClick={() => {
                  setMode(id);
                  setError('');
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            Nom de votre souverain
            <input
              required
              minLength={3}
              maxLength={24}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Comment les Marches vous connaîtront-elles ?"
              autoComplete="username"
            />
          </label>
          {mode !== 'guest' && (
            <label>
              Mot de passe
              <input
                required
                minLength={10}
                maxLength={128}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="10 caractères minimum"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
          )}
          {mode === 'register' && (
            <label>
              Adresse e-mail <small>facultative</small>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                autoComplete="email"
              />
            </label>
          )}
          {mode !== 'login' && (
            <>
              <label className="faction-label">Choisissez votre bannière</label>
              <div className="faction-options">
                {Object.entries(FACTIONS).map(([id, f]) => (
                  <button
                    type="button"
                    key={id}
                    className={`faction-choice ${faction === id ? 'active' : ''}`}
                    onClick={() => setFaction(id as Faction)}
                    title={f.bonus}
                  >
                    <Sigil symbol={f.symbol} color={f.color} size={22} />
                    <span>{f.short}</span>
                  </button>
                ))}
              </div>
              <p className="faction-description">{FACTIONS[faction].bonus}</p>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary enter-button" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <>
                {mode === 'login' ? 'Reprendre votre règne' : 'Élever ma bannière'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="login-note">
            {mode === 'guest'
              ? 'Compte invité : après 24 h sans connexion, votre compte, votre royaume, vos bâtiments et vos unités seront supprimés. Enregistrez votre compte pour les conserver.'
              : 'Votre royaume vous attend au même endroit.'}
          </p>
        </form>
      </div>
      <footer className="login-footer">
        <span>
          <Shield size={14} /> 10 minutes de protection à votre arrivée
        </span>
      </footer>
    </main>
  );
}
