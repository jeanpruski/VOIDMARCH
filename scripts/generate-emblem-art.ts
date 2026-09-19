// Run with node --import tsx scripts/generate-emblem-art.ts after changing the emblem catalogue.
// Lucide vector artwork, ISC license: node_modules/lucide-react/LICENSE.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { symbols } from '../apps/web/src/emblems';
const art = Object.fromEntries(
  Object.entries(symbols).map(([id, Icon]) => [
    id,
    renderToStaticMarkup(createElement(Icon))
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>$/, ''),
  ]),
);
writeFileSync(
  new URL('../apps/web/src/emblem-art.json', import.meta.url),
  JSON.stringify(art, null, 2) + '\n',
);
