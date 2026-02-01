import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.platform !== 'darwin') {
  process.exit(0);
}

const candidates = [];
const prebuildsDir = path.join(rootDir, 'node_modules', 'node-pty', 'prebuilds');
if (fs.existsSync(prebuildsDir)) {
  for (const entry of fs.readdirSync(prebuildsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      candidates.push(path.join(prebuildsDir, entry.name, 'spawn-helper'));
    }
  }
}

candidates.push(path.join(rootDir, 'node_modules', 'node-pty', 'build', 'Release', 'spawn-helper'));

for (const filePath of candidates) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;
    const nextMode = stat.mode | 0o111;
    if (nextMode !== stat.mode) {
      fs.chmodSync(filePath, nextMode);
    }
  } catch {
    // Ignore missing or inaccessible files.
  }
}
