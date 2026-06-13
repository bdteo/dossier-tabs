import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('src/components/dossier-tabs/assets');
const target = resolve(process.argv[2] ?? 'dist/assets');

rmSync(target, { force: true, recursive: true });

if (existsSync(source)) {
  cpSync(source, target, { recursive: true });
}
