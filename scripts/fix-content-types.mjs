#!/usr/bin/env node
/**
 * Postbuild — fix cross-entry type imports in content package .d.ts files.
 *
 * vite-plugin-dts emits content entries' declaration files with the literal
 * source import path (e.g. `../../src/types`). That path resolves during
 * development but points outside the published tarball (src/ is not shipped),
 * leaving consumers with broken types.
 *
 * This script rewrites those paths to point to the package's built index,
 * which IS shipped. It's idempotent — runs cleanly on repeat builds.
 *
 * Why a script instead of a dts plugin option: vite-plugin-dts does not
 * currently expose a clean way to rewrite cross-entry imports when source
 * and output trees don't share a common root. Keeping this fixup small and
 * explicit is simpler than fighting the plugin.
 */

import { readFileSync, writeFileSync } from 'fs';
import { readdir } from 'fs/promises';
import { join, relative, dirname } from 'path';

const DIST_CONTENT = 'dist/content';
// dist/src/index exists because vite-plugin-dts computes the lowest common
// ancestor of its include paths (src + content) and nests outputs under that
// structure. Content .d.ts files need to point there, not to dist/index.
const DIST_INDEX = 'dist/src/index';

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let count = 0;
for await (const file of walk(DIST_CONTENT)) {
  if (!file.endsWith('.d.ts')) continue;

  const contents = readFileSync(file, 'utf8');

  // Compute the relative path from this .d.ts to dist/index
  const fileDir = dirname(file);
  const rel = relative(fileDir, DIST_INDEX).split('\\').join('/');
  const targetPath = rel.startsWith('.') ? rel : `./${rel}`;

  // Match any import pointing into src/ (with or without .ts extension)
  const fixed = contents.replace(
    /from\s+['"](?:[^'"]*\/)?src\/[^'"]*['"]/g,
    `from '${targetPath}'`,
  );

  if (fixed !== contents) {
    writeFileSync(file, fixed);
    console.log(`✓ Rewrote imports in ${file} → ${targetPath}`);
    count++;
  }
}

if (count === 0) {
  console.log('No content .d.ts files needed rewriting.');
} else {
  console.log(`Fixed ${count} file(s).`);
}
