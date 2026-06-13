import { spawnSync } from 'node:child_process';
import {
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'src', 'components', 'dossier-tabs');
const registryDir = path.join(rootDir, 'registry', 'vue', 'dossier-tabs');
const registryOnlyFiles = new Set(['README.md', 'dossier-tabs.json']);
const staleDemoProcessPatterns = [
  /dossiertabs-screenshots/,
  /dossiertabs-screenshot-check/,
  /dossiertabs-demo-geometry/,
  /dossiertabs-cdp/,
  /dossiertabs-shot-profile/,
  /--remote-debugging-port=9340\b/,
  /--remote-debugging-port=9341\b/,
  /--remote-debugging-port=9342\b/,
];

const checks = [
  ['pnpm', ['test']],
  ['pnpm', ['typecheck']],
  ['pnpm', ['verify:demo']],
  ['pnpm', ['verify:screenshots']],
  ['pnpm', ['verify:package']],
  ['pnpm', ['build:demo']],
  ['git', ['diff', '--check']],
];

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function listFiles(baseDir, ignoredFiles = new Set()) {
  const files = [];

  function walk(currentDir) {
    for (const entry of readdirSync(currentDir).sort()) {
      const absolutePath = path.join(currentDir, entry);
      const relativePath = path.relative(baseDir, absolutePath);

      if (ignoredFiles.has(relativePath)) {
        continue;
      }

      if (statSync(absolutePath).isDirectory()) {
        walk(absolutePath);
        continue;
      }

      files.push(relativePath);
    }
  }

  walk(baseDir);

  return files;
}

function verifyRegistrySync() {
  console.log('\n> verify source/registry sync');

  const sourceFiles = listFiles(sourceDir);
  const registryFiles = listFiles(registryDir, registryOnlyFiles);
  const missingFromRegistry = sourceFiles.filter((file) => !registryFiles.includes(file));
  const extraInRegistry = registryFiles.filter((file) => !sourceFiles.includes(file));
  const changedFiles = sourceFiles.filter((file) => {
    if (!registryFiles.includes(file)) {
      return false;
    }

    return !readFileSync(path.join(sourceDir, file))
      .equals(readFileSync(path.join(registryDir, file)));
  });
  const failures = [
    ...missingFromRegistry.map((file) => `missing from registry: ${file}`),
    ...extraInRegistry.map((file) => `extra in registry: ${file}`),
    ...changedFiles.map((file) => `content differs: ${file}`),
  ];

  if (failures.length > 0) {
    console.error('Source and registry dossier-tabs files are out of sync:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Source and registry are synced (${sourceFiles.length} files checked).`);
}

function verifyNoStaleDemoBrowserProcesses(stage) {
  if (process.platform === 'win32') {
    console.log(`\n> skip stale demo-browser process check (${stage}; unsupported on Windows)`);
    return;
  }

  console.log(`\n> verify no stale demo-browser processes (${stage})`);

  const result = spawnSync('ps', ['-ax', '-o', 'pid=,args='], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    console.error('Unable to inspect running processes for stale demo-browser sessions.');

    if (result.stderr) {
      console.error(result.stderr);
    }

    process.exit(result.status ?? 1);
  }

  const staleProcesses = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => staleDemoProcessPatterns.some((pattern) => pattern.test(line)))
    .filter((line) => !line.includes('scripts/verify-all.mjs'));

  if (staleProcesses.length > 0) {
    console.error('Stale Dossier Tabs demo browser processes are still running:');
    for (const processLine of staleProcesses) {
      console.error(`- ${processLine}`);
    }
    process.exit(1);
  }

  console.log('No stale demo-browser processes found.');
}

verifyRegistrySync();
verifyNoStaleDemoBrowserProcesses('before browser QA');

for (const [command, args] of checks) {
  run(command, args);
}

verifyNoStaleDemoBrowserProcesses('after browser QA');

console.log('\nAll verification checks passed.');
