// npm entry point for the presenter build: `npm run build:presenter [-- args]`.
// Finds a Python 3 interpreter (Windows ships the real one as `python`; Debian /
// Ubuntu — including GitHub's runners — as `python3`; the WindowsApps `python3`
// is a Store stub, hence the per-platform order) and runs presenter/build.py.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'build.py');
const candidates = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];

for (const py of candidates) {
  const r = spawnSync(py, [script, ...process.argv.slice(2)], { stdio: 'inherit' });
  if (r.error && r.error.code === 'ENOENT') continue;
  // exit 9009 = the Windows Store stub answered instead of a real interpreter
  if (r.status === 9009) continue;
  process.exit(r.status ?? 1);
}
console.error('build:presenter: no Python 3 interpreter found (tried ' + candidates.join(', ') + ')');
process.exit(1);
