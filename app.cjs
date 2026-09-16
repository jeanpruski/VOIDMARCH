// CommonJS entry point for the N0C / Passenger application manager.
const { existsSync, mkdirSync, appendFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

function trace(message) {
  const line = `${new Date().toISOString()} pid=${process.pid} ${message}\n`;
  try {
    mkdirSync(join(__dirname, '.data'), { recursive: true, mode: 0o700 });
    appendFileSync(join(__dirname, '.data/startup.log'), line, { mode: 0o600 });
  } catch {
    console.error('VOIDMARCH : journal local inaccessible.');
  }
  console.error(line.trimEnd());
}

async function start() {
  trace(`Boot Node ${process.version}, Passenger=${typeof PhusionPassenger !== 'undefined'}`);
  process.chdir(__dirname);
  const envFile = join(__dirname, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  trace('Environnement chargé ; chargement de tsx.');
  const { register } = await import('tsx/esm/api');
  register();
  trace('Chargeur TypeScript prêt ; démarrage du serveur et connexion à la base.');
  const watchdog = setTimeout(() => trace('Démarrage toujours en attente après 30 secondes.'), 30000);
  watchdog.unref();
  try {
    await import(pathToFileURL(join(__dirname, 'apps/server/src/index.ts')).href);
    trace('Serveur démarré ; import terminé.');
  } finally {
    clearTimeout(watchdog);
  }
}

start().catch((error) => {
  trace(`Échec du démarrage : ${error?.stack || error}`);
  process.exitCode = 1;
});
