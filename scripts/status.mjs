#!/usr/bin/env node
// Quick "is everything actually up" check — run this before a demo instead
// of guessing. Checks the 4 core containers are running, then that the app
// actually answers at localhost:8080 (a running container isn't the same as
// a working app - the web server inside it could still be unhealthy).
import { execSync } from 'child_process';

const SERVICES = ['db', 'rest', 'gateway', 'web'];
let allGood = true;

console.log('Checking containers...');
let running = [];
try {
  const out = execSync('docker compose --env-file .env.docker ps --status running --services', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  running = out.split('\n').filter(Boolean);
} catch {}

for (const svc of SERVICES) {
  const state = running.includes(svc) ? 'running' : 'not running';
  console.log(`  ${state === 'running' ? 'OK  ' : 'FAIL'} ${svc} - ${state}`);
  if (state !== 'running') allGood = false;
}

console.log('Checking the app responds...');
try {
  const res = await fetch('http://localhost:8080', { signal: AbortSignal.timeout(5000) });
  console.log(`  ${res.ok ? 'OK  ' : 'FAIL'} localhost:8080 - HTTP ${res.status}`);
  if (!res.ok) allGood = false;
} catch (e) {
  console.log(`  FAIL localhost:8080 - ${e.message}`);
  allGood = false;
}

console.log('');
if (allGood) {
  console.log('Everything is up.');
} else {
  console.log("Something isn't up. Fix: npm run env:up");
  process.exitCode = 1;
}
