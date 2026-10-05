import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { verifyRecordings } from '../src/verify.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(process.argv[2] || '../stripe-entitlements-harness-webapp');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const records = read(join(root, 'evidence/recordings.json'));
verifyRecordings(records, read(join(root, 'evidence/manifest.json')));
if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('Commit public demo changes before packaging');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const npmCli = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const npm = (args, cwd) => execFileSync(process.execPath, [npmCli, ...args], { cwd, encoding: 'utf8' });
const pkg = read(join(root, 'package.json'));
const packDir = join(root, 'artifacts/pack'); mkdirSync(packDir, { recursive: true });
const [packed] = JSON.parse(npm(['pack', '--json', '--pack-destination', packDir], root));
const allowed = path => ['package.json', 'README.md', 'LICENSE', 'evidence/recordings.json', 'evidence/manifest.json'].includes(path) || /^src\/(demo\.tsx|data\.ts|fixtures\.(mjs|d\.mts)|verify\.mjs|styles\.css)$/.test(path);
if (!packed.files.every(file => allowed(file.path))) throw new Error('Unexpected file in public package');
const archive = join(packDir, packed.filename);
const archiveSha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');
const vendor = join(site, 'vendor'); mkdirSync(vendor, { recursive: true });
const manifestPath = join(vendor, 'demo-package.json');
let released = false;
if (existsSync(manifestPath)) {
  const previous = read(manifestPath);
  if (previous.demoVersion === pkg.version && previous.released && previous.archiveSha256 !== archiveSha256) throw new Error('A released package version cannot be overwritten; bump demo version');
  released = previous.demoVersion === pkg.version && previous.released === true;
}
copyFileSync(archive, join(vendor, packed.filename));
const moduleFileHashes = Object.fromEntries(packed.files.map(file => [file.path, createHash('sha256').update(readFileSync(join(root, file.path))).digest('hex')]));
writeFileSync(manifestPath, JSON.stringify({ demoVersion: pkg.version, demoSourceRevision: revision, archive: packed.filename, archiveSha256, released, moduleFileHashes, evidenceHashes: Object.fromEntries(records.map(record => [record.scenarioId, record.evidenceSha256])) }, null, 2) + '\n');
const sitePkg = read(join(site, 'package.json'));
sitePkg.dependencies[pkg.name] = `file:./vendor/${packed.filename}`;
sitePkg.scripts['verify:demo'] = 'node scripts/verify-demo-package.mjs';
sitePkg.scripts['prebuild'] = 'npm run verify:demo';
writeFileSync(join(site, 'package.json'), JSON.stringify(sitePkg, null, 2) + '\n');
// npm ci uses lock integrity; npm install refreshes an unreleased local archive safely.
npm(['install', `file:./vendor/${packed.filename}`, '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], site);
const lock = read(join(site, 'package-lock.json'));
const expectedIntegrity = `sha512-${createHash('sha512').update(readFileSync(archive)).digest('base64')}`;
if (lock.packages[`node_modules/${pkg.name}`]?.integrity !== expectedIntegrity) throw new Error('Lockfile retained an older archive; bump the package version before retrying');
console.log(`Vendored ${packed.filename} from ${revision}; SHA-256 ${archiveSha256}`);
console.log('Run npm ci in the website to install the exact committed archive.');
