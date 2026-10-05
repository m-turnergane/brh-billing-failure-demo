import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyRecordings, evidenceHash, sha256 } from '../src/verify.mjs';
import { fixtures, projectBroken, planForKeys } from '../src/fixtures.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../evidence/${name}`, import.meta.url), 'utf8'));
const records = read('recordings.json'), manifest = read('manifest.json');
test('authentic recordings reproduce public state and all corrected controls pass', () => {
  assert.equal(verifyRecordings(records, manifest).length, 4);
  for (const record of records) {
    assert.deepEqual(projectBroken(record.scenarioId, fixtures[record.scenarioId], record.observations), record.applicationState);
    if (record.applicationState.keys) assert.equal(planForKeys(record.scenarioId, record.applicationState.keys), 'FREE');
  }
});
for (const [name, mutate] of [
  ['schema mismatch', r => { r[0].evidenceSchemaVersion = 2; }],
  ['wrong check', r => { r[0].checkId = 'E9'; }],
  ['stale BRH version', r => { r[0].brhVersion = 'old'; }],
  ['stale revision', r => { r[0].privateSourceCommitSha = 'a'.repeat(40); }],
  ['bad revision', r => { r[0].privateSourceCommitSha = 'unknown'; }],
  ['stale fixture version', r => { r[0].fixtureVersion = 9; }],
  ['stale scenario version', r => { r[0].scenarioVersion = 9; }],
  ['changed fixture', r => { r[0].fixtureSha256 = sha256('changed'); }],
  ['invalid timestamp', r => { r[0].generatedAt = 'not a date'; }],
  ['unexpected pass', r => { r[0].brokenResult.status = 'PASS'; }],
  ['missing corrected control', r => { delete r[0].correctedResult; }],
  ['missing observations', r => { r[0].observations = []; }],
  ['reproduction mismatch', r => { r[0].applicationState.keys = ['different']; }],
  ['extra public fields', r => { r[0].privateStack = 'unapproved'; }],
  ['tampered checksum', r => { r[0].evidenceSha256 = 'a'.repeat(64); }],
  ['duplicate recording', r => { r[1] = structuredClone(r[0]); }],
  ['not the same duplicate event', r => { r[2].observations.filter(s => s.kind === 'payment-write')[1].eventId = 'event-different'; }],
  ['unobserved persistence failure', r => { r[1].observations = r[1].observations.filter(s => s.kind !== 'persistence-failure'); }],
]) test(`rejects ${name}`, () => { const copy = structuredClone(records); mutate(copy); assert.throws(() => verifyRecordings(copy, manifest)); });
test('hash excludes its own field and ignores object insertion order', () => {
  assert.equal(evidenceHash({ b: 2, a: 1, evidenceSha256: 'x' }), evidenceHash({ a: 1, evidenceSha256: 'y', b: 2 }));
});
test('an old compatible recording does not expire with calendar age', () => {
  const copy = structuredClone(records), pins = structuredClone(manifest);
  copy[0].generatedAt = '2020-01-01T00:00:00.000Z';
  copy[0].evidenceSha256 = evidenceHash(copy[0]); pins.scenarios[copy[0].scenarioId].evidenceSha256 = copy[0].evidenceSha256;
  assert.equal(verifyRecordings(copy, pins).length, 4);
});
