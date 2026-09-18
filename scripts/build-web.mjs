import { fileURLToPath } from 'node:url';

// N0C can export NODE_ENV=development even when invoking `vite build`.
// Set it before importing Vite so React and import.meta.env.PROD agree.
process.env.NODE_ENV = 'production';
const { build } = await import('vite');
await build({ root: fileURLToPath(new URL('../apps/web', import.meta.url)) });
