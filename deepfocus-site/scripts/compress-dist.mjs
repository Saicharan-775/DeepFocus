import { brotliCompress, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const extensions = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml']);
const minSize = 1024;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : fullPath;
  }));
  return files.flat();
}

function extensionFor(file) {
  const match = file.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

const files = await walk(distDir);
let compressed = 0;

for (const file of files) {
  if (!extensions.has(extensionFor(file))) continue;
  const info = await stat(file);
  if (info.size < minSize) continue;

  const source = await readFile(file);
  const [br, gz] = await Promise.all([
    brotli(source, { params: { 1: 11 } }),
    gzipAsync(source, { level: 9 }),
  ]);

  await Promise.all([
    writeFile(`${file}.br`, br),
    writeFile(`${file}.gz`, gz),
  ]);
  compressed += 1;
}

console.log(`[compress-dist] Created Brotli and Gzip assets for ${compressed} files.`);
