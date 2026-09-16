import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: 'inherit', ...options });
if (!existsSync('.env'))
  writeFileSync(
    '.env',
    readFileSync('.env.example', 'utf8')
      .replace('replace-with-at-least-32-random-characters', randomBytes(48).toString('hex'))
      .replace(
        'WEB_ORIGIN=http://localhost:5173',
        'WEB_ORIGIN=http://localhost:5173,http://127.0.0.1:5173',
      ),
    { mode: 0o600 },
  );
let docker = false;
try {
  execFileSync('docker', ['info'], { stdio: 'ignore' });
  docker = true;
} catch {}
if (docker) run('docker', ['compose', 'up', '-d', 'postgres', 'redis']);
else {
  const pg = '/opt/homebrew/opt/postgresql@16/bin/';
  if (!existsSync(pg + 'initdb'))
    throw new Error(
      'Installez Docker puis relancez npm run setup, ou renseignez DATABASE_URL pour une base PostgreSQL existante.',
    );
  mkdirSync('.data', { recursive: true });
  if (!existsSync('.data/postgres/PG_VERSION'))
    run(pg + 'initdb', [
      '-D',
      '.data/postgres',
      '-U',
      'voidmarch',
      '--auth=trust',
      '--encoding=UTF8',
      '--locale=C',
    ]);
  try {
    execFileSync(pg + 'pg_isready', ['-h', '127.0.0.1', '-p', '55432'], { stdio: 'ignore' });
  } catch {
    run(pg + 'pg_ctl', [
      '-D',
      '.data/postgres',
      '-l',
      '.data/postgres.log',
      '-o',
      '-h 127.0.0.1 -p 55432 -k /private/tmp',
      'start',
    ]);
  }
  const databases = execFileSync(
    pg + 'psql',
    [
      '-h',
      '127.0.0.1',
      '-p',
      '55432',
      '-U',
      'voidmarch',
      '-d',
      'postgres',
      '-Atc',
      "SELECT datname FROM pg_database WHERE datname='voidmarch'",
    ],
    { encoding: 'utf8' },
  );
  if (!databases.trim())
    run(pg + 'createdb', ['-h', '127.0.0.1', '-p', '55432', '-U', 'voidmarch', 'voidmarch']);
}
run('npm', ['run', 'db:generate']);
run('npm', ['run', 'db:migrate']);
run('npx', ['tsx', '--env-file=.env', 'apps/server/src/seed.ts']);
console.log('\nLe monde est prêt. Lancez npm run dev puis ouvrez http://localhost:5173.');
