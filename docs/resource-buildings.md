# Exploitations de bois, pierre et fer

Six bâtiments supplémentaires : trois producteurs par matériau en comptant le bâtiment de base. Catalogue total : 58 bâtiments, dont deux évolutions de remparts.

| Ressource | Base | Industrie | Occulte avancé |
| --- | --- | --- | --- |
| Bois | Scierie : 8/min | Scierie à vapeur : 16/min | Scierie des ombres : 28/min |
| Pierre | Carrière de pierre : 6/min | Carrière mécanisée : 12/min | Carrière runique : 21/min |
| Fer | Mine : 5/min | Mine industrielle : 10/min | Mine des abysses : 18/min |

Chaque nouvelle exploitation est un bâtiment distinct, améliorable aux niveaux 2 et 3 (production ×1,6 et ×2,4). Les versions industrielles demandent le producteur de base et un atelier (bois/pierre) ou une forge (fer). Les versions occultes demandent leur version industrielle et le laboratoire des cendres. Les coûts progressent pour conserver l’intérêt des producteurs de départ : davantage de débit par case demande davantage d’investissement et d’infrastructures.

Bois uniquement en forêt, pierre sur colline ou montagne, fer uniquement sur colline. La production cesse si le terrain devient incompatible. Aucun nouveau matériau ni modification des royaumes existants. Les filtres de construction, les descriptions, les prérequis, le coût de 1 PA, l’amélioration, la réparation et le remboursement de démolition utilisent les règles communes. Les coûts et rendements détaillés figurent dans `balance-audit.md`.

## Visuels

Fichier final : `apps/web/public/assets/resource-buildings.png`. Outil imagegen intégré, référence de style : `industrial.png`. Transparence RGBA conservée, aucune retouche locale. L’atlas 3 × 2 est isolé et normalisé par le rendu commun des figurines pour éviter les débordements. Ordre : scierie à vapeur, carrière mécanisée, mine industrielle, puis leurs trois versions occultes.

Source : `/Users/jeanpruski/.codex/generated_images/01a0aa6c-0543-7b73-9066-08f4dfe4531f/exec-3d46f8fb-0e4a-46d8-9326-67472480a009.png`.

Prompt final :

```text
Use case: stylized-concept.
Asset type: ONE game sprite atlas containing six resource-producing buildings, exactly 3 columns by 2 rows, landscape 1536x1024, each isolated in its own equal 512x512 cell.
Reference image: industrial.png is STYLE REFERENCE ONLY; create new buildings, do not copy its layout or background.
Painted high-quality tabletop miniatures, dark medieval combined with 1940s industrial occult architecture, isometric three-quarter view, weathered iron, stone, brick, wooden beams, tiny warm windows, precise silhouettes readable at small game size.
Six subjects in exact reading order:
TOP LEFT: steam-powered sawmill, wooden log stacks, circular saw under timber shed, rusty boiler chimney.
TOP MIDDLE: mechanized stone quarry, low rocky terrace, crane, piles of pale squared stone, brick machine shed.
TOP RIGHT: industrial iron mine, steel shaft headframe, ore cart with dark metallic ore, sturdy brick winch house.
BOTTOM LEFT: occult sawmill, gothic timber workshop, logs and mechanical saw, discreet green runic energy powering the machinery.
BOTTOM MIDDLE: runic quarry, excavated grey stone platform, suspended engraved monolith, gothic lifting rig, subdued violet glow and stone blocks.
BOTTOM RIGHT: abyssal iron mine, heavy armored drill tower above a dark shaft, ore carts, rusted metal machinery and faint green occult lights.
Each building stands on its OWN compact irregular earth/stone footprint, consistent size and viewpoint. Objects including bases and glow stay strictly inside their cell with at least 60px clear margin on all four sides. Buildings centered; complete roofs, chimneys, cranes and footprints visible. No objects crossing between cells. No people, captions, letters, labels, grid lines, emblems, flags or watermark.
BACKGROUND MUST BE GENUINELY TRANSPARENT WITH ALPHA CHANNEL, not a painted checkerboard, not black, not brown. No shared ground plane, no background haze. Only six crisp isolated miniatures on transparent empty space.
```

