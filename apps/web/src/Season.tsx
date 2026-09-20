import './season.css';
import { Castle, Compass, Crown, Handshake, Ship, Swords, Trophy, ArrowRight } from 'lucide-react';
import { RULES, EXPEDITION_SITES, DEVELOPMENT_TROPHIES } from '@voidmarch/config';

export const SEASON_TITLE = 'Saison 0 — L’Aube Noire';
export const SEASON_ART = '/assets/season-0-aube-noire.jpg';

export function SeasonBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`season-banner${compact ? ' season-banner-compact' : ''}`}>
      <img
        src={SEASON_ART}
        alt="Une éclipse se lève sur une forteresse médiévale et industrielle."
        width={1536}
        height={1024}
      />
      <div className="season-banner-copy">
        <span className="season-kicker">VOIDMARCH · SAISON 0</span>
        <strong className="season-title">L’Aube Noire</strong>
        <span className="season-subtitle">
          Les premiers royaumes. Les premières alliances. Votre histoire.
        </span>
      </div>
    </div>
  );
}

export function SeasonOverview({
  onContinue,
  onHelp,
}: {
  onContinue: () => void;
  onHelp?: () => void;
}) {
  return (
    <div className="season-overview">
      <SeasonBanner />
      <p className="season-intro">
        Bienvenue dans la bêta de VOIDMARCH. Fondez votre royaume, explorez les Marches et forgez
        vos alliances : du premier campement aux puissances de l’ère atomique.
      </p>
      <div className="season-highlights" aria-label="Les avancées de la bêta">
        <article>
          <Castle size={22} />
          <h3>Cinq époques, une civilisation</h3>
          <p>
            Moyen Âge, Renaissance et Empire, guerre industrielle, technologie occulte puis ère
            atomique. Les bâtiments changent d’apparence et ouvrent des troupes adaptées à leur
            époque.
          </p>
        </article>
        <article>
          <Trophy size={22} />
          <h3>Des trophées pour progresser</h3>
          <p>
            {DEVELOPMENT_TROPHIES.slice(2).join(', ')} trophées cumulés ouvrent les passages aux
            époques 2 à 5. Préparez aussi les infrastructures et les ressources, puis passez à
            l’époque suivante dans Royaume. Vos trophées restent acquis.
          </p>
        </article>
        <article>
          <Swords size={22} />
          <h3>Des conquêtes qui rapportent</h3>
          <p>
            Prenez l’objectif d’une forteresse pour rallier ses survivants. Or et vivres multipliés
            de ×5 à ×10 selon la difficulté, avec du bois, de la pierre et du fer en supplément.
          </p>
        </article>
        <article>
          <Compass size={22} />
          <h3>L’aventure au-delà des frontières</h3>
          <p>
            {EXPEDITION_SITES.length} lieux terrestres et maritimes à découvrir. Butins ×5 en
            reconnaissance, ×7 en récupération et ×10 en extraction avec retour. Les récompenses
            dépassant le stockage sont conservées.
          </p>
        </article>
        <article>
          <Handshake size={22} />
          <h3>Des alliances qui font grandir</h3>
          <p>
            Partez en mission avec vos alliés et partagez chaque nouveau trophée avec les membres
            actuels de l’alliance. Les ressources reviennent au royaume qui a accepté la mission.
          </p>
        </article>
        <article>
          <Ship size={22} />
          <h3>Des mers et des armées en mouvement</h3>
          <p>
            Ports, flottes, transports et sous-marins étendent vos possibilités. Déplacez jusqu’à
            dix unités en groupe, embarquez vos troupes et profitez des routes et enceintes fermées
            pour circuler sans PA.
          </p>
        </article>
      </div>
      <section className="season-start" aria-labelledby="season-start-title">
        <Crown size={23} />
        <div>
          <h3 id="season-start-title">Votre première aube</h3>
          <p>
            Un campement, votre héros, {RULES.startingAP} PA et 500 d’or, de bois, de pierre et de
            fer. Formez gratuitement votre premier paysan, puis préparez vos productions.
          </p>
          <p>
            Pour votre premier trophée, envoyez votre héros en reconnaissance terrestre sans combat
            obligatoire, ou remportez une escarmouche. Régénération : 1 PA toutes les{' '}
            {RULES.apInterval / 1000} secondes, jusqu’à {RULES.maxAP} ; le surplus initial se
            dépense sans se régénérer.
          </p>
        </div>
      </section>
      <p className="season-beta-note">
        Saison de bêta : l’équilibrage continuera d’évoluer avec vos parties et vos retours. Les
        missions déjà acceptées conservent leur récompense annoncée.
      </p>
      <div className="season-actions">
        <button className="primary" onClick={onContinue}>
          C’est parti <ArrowRight size={16} />
        </button>
        {onHelp && (
          <button className="secondary" onClick={onHelp}>
            Consulter l’aide & les règles
          </button>
        )}
      </div>
      <p className="season-return">
        Retrouvez cette présentation dans le menu de gauche : « Saison 0 · L’Aube Noire ».
      </p>
    </div>
  );
}
