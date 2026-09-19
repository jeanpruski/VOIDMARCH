import {
  BIOMES,
  BIOME_ADAPTATION_NAMES,
  UNIT_BIOME_ADAPTATIONS,
  type Biome,
  type UnitKind,
} from '@voidmarch/config';

export function BiomeAdaptation({
  kind,
  biome,
  showStatus = false,
}: {
  kind: UnitKind;
  biome?: Biome;
  showStatus?: boolean;
}) {
  const preferred = UNIT_BIOME_ADAPTATIONS[kind];
  if (!preferred) return null;
  const active = biome === preferred;
  return (
    <details
      className={`biome-adaptation${showStatus && active ? ' biome-adaptation-active' : ''}`}
    >
      <summary>
        {BIOME_ADAPTATION_NAMES[preferred]} : +1 déplacement en biome{' '}
        {BIOMES[preferred].name.toLowerCase()}
        {showStatus
          ? active
            ? ' · actif'
            : biome
              ? ' · inactif ici'
              : ' · case de départ inconnue'
          : ''}
      </summary>
      <p>
        Adaptation innée : aucun bâtiment nécessaire. Le bonus dépend uniquement du biome de la case
        au début de chaque déplacement ; entrer dans un autre biome ne change pas le budget de
        l’ordre en cours.
      </p>
      <p>
        Il s’ajoute au soutien militaire et aux bonus de faction. Le coût des terrains et les
        obstacles restent applicables. Les routes gardent leur déplacement sans limite pour 1 PA.
      </p>
      <p>
        Aux frontières, c’est le biome indiqué dans les informations du terrain qui compte, même si
        les décors se mélangent.
      </p>
    </details>
  );
}
