#!/usr/bin/env node
// One-command setup. Run this from inside a freshly-cloned
// mundial-qa-automation — it clones the sibling Mondial2026 repo if it's not
// already there (docker-compose.yml needs it at ../Mondial2026 to build the
// `web` image), then brings up the full Docker environment via `env:up`.
// No other manual step needed: `env:up` itself runs `npm install`.
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const PARENT_DIR = path.resolve(PROJECT_ROOT, '..');
const MONDIAL_PATH = path.join(PARENT_DIR, 'Mondial2026');

function run(cmd, cwd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: cwd || PROJECT_ROOT });
}

if (!existsSync(MONDIAL_PATH)) {
  console.log(`Mondial2026 not found next to this repo — cloning it to:\n  ${MONDIAL_PATH}`);
  run(`git clone https://github.com/PashaGend/WorldCup2026.git "${MONDIAL_PATH}"`, PARENT_DIR);
} else {
  console.log('Mondial2026 already exists next to this repo — skipping clone.');
}

run('npm run env:up');

console.log(
  '\nDone — app: http://localhost:8080\n' +
  'Run the tests: docker compose --env-file .env.docker run --rm tests'
);
