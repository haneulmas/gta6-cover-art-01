// Vice Panels — the entry program for gta6-cover-art-01 (Node 22, standard
// library only). The app itself is the static files in app/ (plain HTML, CSS
// and ES modules a desktop browser loads offline, no network request), and
// the screenshots in screenshots/ are the app's own captures. This program
// hands both in: it copies app/ and screenshots/ from beside this file into
// the output directory and writes output/dossier.json with the vendored
// make.fun library, so the judge reads exactly what the app is.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy the app in whole, then the screenshots beside it.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps the gate scores against: the dossier text is capped at 160 KiB,
// at most 4 screenshots of at most 256 KiB each, app/ at most 993 files and
// 48 MiB in all, every app/ path at most 1000 bytes. An entry over any of
// these is refused by the scorer, so the program hands in the same caps.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
