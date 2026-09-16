// CommonJS entry point for the N0C / Passenger application manager.
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

async function start() {
  process.chdir(__dirname);
  const envFile = join(__dirname, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const { register } = await import('tsx/esm/api');
  register();
  await import(pathToFileURL(join(__dirname, 'apps/server/src/index.ts')).href);
}

start().catch((error) => {
  console.error('VOIDMARCH : échec du démarrage.', error);
  process.exitCode = 1;
});
