import { ISLAND_DISCOVERIES, RESOURCE_NAMES, type Resource } from '@voidmarch/config';
import type { ViewTile } from '@voidmarch/shared';
import { format } from './ui';
export function IslandDiscoveryInfo({ tile }: { tile?: ViewTile }) {
  if (!tile?.islandDiscovery || !tile.poi || tile.visibility === 'UNKNOWN') return null;
  const site = ISLAND_DISCOVERIES[tile.islandDiscovery];
  return (
    <div className="inset island-discovery-info">
      <strong>{site.name} · découverte libre</strong>
      <p>
        {tile.exhausted
          ? 'Ce lieu a déjà été fouillé. Son butin ne se régénère pas ; vous pouvez continuer à explorer et coloniser l’île.'
          : site.description}
      </p>
      {!tile.exhausted && (
        <p>
          Butin unique :{' '}
          {Object.entries(site.reward)
            .map(([r, n]) => `${format(n)} ${RESOURCE_NAMES[r as Resource].toLowerCase()}`)
            .join(' · ')}{' '}
          · 1 à 6 PA{site.relic ? ` · ${site.relic}` : ''}. Placez une unité sur ce lieu puis «
          Fouiller » (1 PA). Aucun trophée de mission.
        </p>
      )}
    </div>
  );
}
