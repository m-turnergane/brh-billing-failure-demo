import { readFileSync } from 'node:fs';
import { verifyRecordings } from '../src/verify.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../evidence/${name}`, import.meta.url), 'utf8'));
verifyRecordings(read('recordings.json'), read('manifest.json'));
console.log('Verified four recorded BRH failures and corrected controls; provenance, hashes and public reproductions match.');
