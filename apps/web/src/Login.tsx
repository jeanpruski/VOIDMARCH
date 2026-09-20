import { SeasonBanner, SeasonOverview, SEASON_TITLE } from './Season';
import { Modal } from './ui';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Shield, LoaderCircle } from 'lucide-react';
import { HeroCreator } from './Hero';
import {
  randomRealmIdentity,
  assortHero,
  FACTIONS,
  type Faction,
  type RealmIdentity,
} from '@voidmarch/config';
import type { AuthUser } from '@voidmarch/shared';
import { acceptSession, api } from './store';
import { Sigil } from './ui';
import { IdentityEditor, RealmPreview } from './RealmIdentity';
export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('register'),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [email, setEmail] = useState(''),
    [faction, setFaction] = useState<Faction>('ASH'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [step, setStep] = useState(0),
    [showSeason, setShowSeason] = useState(false);
  const [initial] = useState(() => randomRealmIdentity(''));
  const [heroAppearance, setHeroAppearance] = useState(initial.heroAppearance);
  const [identity, setIdentity] = useState<RealmIdentity>(() => {
    const { heroAppearance: _hero, ...realm } = initial;
    return { ...realm, realmName: '' };
  });
  const registration = mode === 'register';
  function randomize() {
    const { heroAppearance: hero, ...realm } = randomRealmIdentity(username);
    setHeroAppearance(hero);
    setIdentity({ ...realm, realmName: identity.realmName });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (registration && step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const session = await api<{ token: string; user: AuthUser }>(`/auth/${mode}`, {
        username,
        password,
        ...(email ? { email } : {}),
        faction,
        ...(registration
          ? {
              heroAppearance,
              realmIdentity: {
                ...identity,
                realmName: identity.realmName.trim() || `Marches de ${username}`,
              },
            }
          : {}),
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
      {showSeason && (
        <Modal
          title={SEASON_TITLE}
          className="season-modal"
          wide
          onClose={() => setShowSeason(false)}
        >
          <SeasonOverview onContinue={() => setShowSeason(false)} />
        </Modal>
      )}
      <header className="login-header">
        <a className="wordmark" href="/">
          V<span>O</span>IDMARCH
        </a>
      </header>
      <div
        className={`login-content ${registration ? 'hero-registration realm-registration' : ''}`}
      >
        <section className="login-season" aria-label={SEASON_TITLE}>
          <SeasonBanner compact />
          <button type="button" className="secondary" onClick={() => setShowSeason(true)}>
            Découvrir la Saison 0
          </button>
        </section>
        <form onSubmit={submit}>
          <div className="login-tabs">
            {(
              [
                ['login', 'Se connecter'],
                ['register', 'Créer un compte'],
              ] as const
            ).map(([id, label]) => (
              <button
                type="button"
                key={id}
                className={mode === id ? 'active' : ''}
                disabled={busy}
                onClick={() => {
                  setMode(id);
                  setStep(0);
                  setError('');
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {registration && (
            <nav className="creation-steps" aria-label="Étapes de création">
              {['Ton héros', 'Ton royaume', 'Tes drapeaux'].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  aria-current={step === i ? 'step' : undefined}
                  disabled={busy || i > step}
                  onClick={() => setStep(i)}
                >
                  <span>{i + 1}</span>
                  {label}
                </button>
              ))}
            </nav>
          )}
          <div className={registration ? 'creation-layout' : undefined}>
            <div className="creation-controls">
              {(!registration || step === 0) && (
                <>
                  <label>
                    Nom de votre souverain
                    <input
                      required
                      minLength={3}
                      maxLength={24}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Votre pseudo au-dessus du héros"
                      autoComplete="username"
                    />
                  </label>
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
                  {registration && (
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
                  {registration && (
                    <HeroCreator
                      compact
                      value={heroAppearance}
                      onChange={setHeroAppearance}
                      name={username}
                    />
                  )}
                </>
              )}
              {registration && step === 1 && (
                <>
                  <label className="faction-label">Votre faction</label>
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
              {registration && step > 0 && (
                <IdentityEditor
                  value={identity}
                  onChange={setIdentity}
                  section={step === 1 ? 'kingdom' : 'flags'}
                />
              )}
              {registration && (
                <div className="creation-tools">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setHeroAppearance(assortHero(heroAppearance, identity))}
                  >
                    Tout assortir
                  </button>
                  <button type="button" className="secondary" onClick={randomize}>
                    Identité aléatoire
                  </button>
                  <small>
                    « Tout assortir » applique les couleurs de la bannière aux équipements du héros.
                  </small>
                </div>
              )}
            </div>
            {registration && (
              <RealmPreview value={identity} appearance={heroAppearance} username={username} />
            )}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="creation-navigation">
            {registration && step > 0 && (
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setStep(step - 1)}
              >
                Retour
              </button>
            )}
            <button className="primary enter-button" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <>
                  {registration && step < 2
                    ? 'Continuer'
                    : mode === 'login'
                      ? 'Reprendre votre règne'
                      : 'Élever ma bannière'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
          <p className="login-note">
            {registration
              ? 'Votre héros sera définitif. Vous pourrez modifier votre royaume, sa bannière et ses drapeaux depuis votre profil.'
              : 'Votre royaume vous attend au même endroit.'}
          </p>
        </form>
      </div>
      <footer className="login-footer">
        <span>
          <Shield size={14} />
          10 minutes de protection à votre arrivée
        </span>
      </footer>
    </main>
  );
}
