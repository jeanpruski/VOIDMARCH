import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const url = 'http://127.0.0.1:5173';
const health = 'http://127.0.0.1:3001/api/health';
async function ready() {
  const checks = await Promise.allSettled([
    fetch(url, { signal: AbortSignal.timeout(1500) }).then(
      async (r) => r.ok && (await r.text()).includes('VOIDMARCH'),
    ),
    fetch(health, { signal: AbortSignal.timeout(1500) }).then(
      async (r) => r.ok && (await r.json()).status === 'ok',
    ),
  ]);
  return checks.every((r) => r.status === 'fulfilled' && r.value);
}

if (await ready()) {
  console.log(`VOIDMARCH est déjà accessible : ${url}`);
} else {
  if (!process.env.npm_execpath) throw new Error('Utilisez npm run dev:local.');
  mkdirSync(new URL('../.data/', import.meta.url), { recursive: true });
  const log = openSync(new URL('../.data/dev.log', import.meta.url), 'a', 0o600);
  const child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'dev'], {
    cwd: root,
    detached: true,
    stdio: ['ignore', log, log],
  });
  closeSync(log);
  child.unref();
  writeFileSync(
    new URL('../.data/dev-process.json', import.meta.url),
    JSON.stringify({ pid: child.pid, startedAt: new Date().toISOString() }),
  );
  let available = false;
  for (let i = 0; i < 30; i++) {
    if (await ready()) {
      available = true;
      break;
    }
    if (child.exitCode !== null || child.signalCode !== null) break;
    await setTimeout(1000);
  }
  if (!available) {
    console.error('Le jeu ne répond pas encore. Consultez .data/dev.log pour le diagnostic.');
    process.exitCode = 1;
  } else {
    console.log(`VOIDMARCH est accessible : ${url}`);
    console.log('Les serveurs continuent de tourner après la fermeture de ce terminal.');
    console.log('Journal de lancement : .data/dev.log');
  }
}
