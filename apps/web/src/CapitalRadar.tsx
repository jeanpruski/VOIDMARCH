import { ArrowRight } from 'lucide-react';
import { focusMap, useGame } from './store';
import { capitalBearing } from './capital-radar';

export function CapitalRadar() {
  const world = useGame((s) => s.world);
  const viewport = useGame((s) => s.cameraViewport);
  if (!world || !viewport) return null;
  const allies = world.strategy?.allies ?? [];
  const targets = [
    ...allies,
    ...(world.player.capitalRadar ? (world.enemyCapitals ?? []) : []).filter(
      (t) => !allies.some((a) => a.realmId === t.realmId),
    ),
  ].flatMap((target) => {
    const realm = world.realms.find((r) => r.id === target.realmId);
    return realm && !realm.defeated && realm.id !== world.player.id
      ? [
          {
            ...capitalBearing(viewport, target.position),
            realm,
            position: target.position,
            ally: allies.some((a) => a.realmId === realm.id),
          },
        ]
      : [];
  });
  return (
    <div className="capital-radar" aria-label="Repérage des capitales alliées et radar">
      {(['left', 'right', 'top', 'bottom'] as const).map((edge) => {
        const group = targets
          .filter((t) => t.edge === edge)
          .sort((a, b) => a.offset - b.offset || a.realm.id.localeCompare(b.realm.id));
        return (
          group.length > 0 && (
            <div key={edge} className={`radar-edge radar-${edge}`}>
              {group.map(({ realm, angle, distance, position, ally }) => (
                <button
                  onClick={() => {
                    if (ally) focusMap(position);
                  }}
                  key={realm.id}
                  className="radar-target"
                  tabIndex={0}
                  data-realm-id={realm.id}
                  title={`${realm.name} : capitale à ${distance} case${distance === 1 ? '' : 's'} du centre de la vue. Distance directe en hexagones, pas la longueur d’un trajet.`}
                  aria-label={`${realm.name} : capitale à ${distance} cases du centre de la vue`}
                >
                  <ArrowRight
                    size={20}
                    style={{ transform: `rotate(${angle}deg)`, color: realm.color }}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{distance} cases</strong>
                    <small>
                      {ally ? 'Allié · ' : ''}
                      {realm.name}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )
        );
      })}
      {targets.length === 0 && world.player.capitalRadar && (
        <span className="radar-empty">Aucune capitale ennemie</span>
      )}
    </div>
  );
}
