import { createHash } from 'node:crypto';
import { fixtures, projectBroken } from './fixtures.mjs';

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function sha256(value) { return createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex'); }
export function evidenceHash(record) { const { evidenceSha256: omitted, ...body } = record; void omitted; return sha256(body); }
const checks = { 'entitlement-mismatch': 'E1', 'ack-before-persistence': 'E5', 'duplicate-delivery': 'E7', 'out-of-order-events': 'E8' };
function insist(condition, message) { if (!condition) throw new Error(message); }
const digest = /^[a-f0-9]{64}$/;
const observationFields = {
  'projection-seeded': ['kind', 'keys'], authority: ['kind', 'keys'],
  signature: ['kind', 'eventId', 'valid'],
  'projection-write': ['kind', 'eventId', 'eventCreated', 'keys'],
  response: ['kind', 'eventId', 'status'],
  'projection-observed': ['kind', 'keys'],
  'persistence-failure': ['kind', 'eventId', 'message'],
  'fault-observed': ['kind', 'count'],
  'payment-write': ['kind', 'eventId', 'grant', 'credits', 'fulfillmentCount'],
  'payment-observed': ['kind', 'credits', 'fulfillmentCount'],
};
function validObservation(step) {
  const fields = observationFields[step?.kind];
  if (!fields || Object.keys(step).length !== fields.length || !Object.keys(step).every(key => fields.includes(key))) return false;
  if ('keys' in step && (!Array.isArray(step.keys) || !step.keys.every(key => typeof key === 'string' && key.length > 0 && key.length <= 100))) return false;
  if ('eventId' in step && !/^event-[1-9][0-9]*$/.test(step.eventId)) return false;
  for (const key of ['eventCreated', 'count', 'grant', 'credits', 'fulfillmentCount']) if (key in step && (!Number.isSafeInteger(step[key]) || step[key] < 0)) return false;
  if ('status' in step && (!Number.isInteger(step.status) || step.status < 100 || step.status > 599)) return false;
  if ('valid' in step && typeof step.valid !== 'boolean') return false;
  if ('message' in step && step.message !== fixtures['ack-before-persistence'].injectedFailure) return false;
  return true;
}

export function verifyRecordings(records, manifest) {
  insist(Array.isArray(records) && records.length === 4, 'Exactly four recordings required');
  insist(manifest?.evidenceSchemaVersion === 1 && typeof manifest.scenarios === 'object', 'Invalid evidence manifest');
  const ids = new Set();
  for (const record of records) {
    const id = record?.scenarioId;
    const pin = manifest.scenarios[id];
    insist(pin && fixtures[id] && !ids.has(id), 'Unknown or duplicate scenario'); ids.add(id);
    insist(record.evidenceSchemaVersion === 1 && record.checkId === checks[id], `${id}: schema/check mismatch`);
    insist(record.brhVersion === manifest.brhVersion && record.privateSourceCommitSha === manifest.privateSourceCommitSha && /^[a-f0-9]{40}$/.test(record.privateSourceCommitSha), `${id}: stale BRH provenance`);
    insist(record.scenarioVersion === pin.scenarioVersion && record.fixtureVersion === pin.fixtureVersion && record.fixtureVersion === fixtures[id].version, `${id}: stale scenario/fixture version`);
    insist(record.fixtureSha256 === sha256(fixtures[id]) && record.fixtureSha256 === pin.fixtureSha256, `${id}: fixture hash mismatch`);
    insist(typeof record.generatedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(record.generatedAt) && !Number.isNaN(Date.parse(record.generatedAt)) && new Date(record.generatedAt).toISOString() === record.generatedAt, `${id}: invalid generation timestamp`);
    for (const [key, status] of [['brokenResult', 'FAIL'], ['correctedResult', 'PASS']]) {
      const result = record[key];
      insist(result?.status === status && result.scenario === record.checkId && result.passed === (status === 'PASS') && typeof result.name === 'string' && typeof result.message === 'string' && result.message.length > 0, `${id}: invalid ${key}`);
      insist(Object.keys(result).every(key => ['scenario', 'name', 'status', 'passed', 'message'].includes(key)), `${id}: unexpected result fields`);
    }
    insist(Array.isArray(record.observations) && record.observations.length > 0 && record.observations.every(validObservation), `${id}: missing or malformed observations`);
    insist(canonical(projectBroken(id, fixtures[id], record.observations)) === canonical(record.applicationState), `${id}: public reproduction differs`);
    insist(record.observations.some(step => step.kind === 'signature' && step.valid === true), `${id}: no signature observation`);
    if (id === 'ack-before-persistence') {
      const ack = record.observations.findIndex(step => step.kind === 'response' && step.status === 200);
      const fault = record.observations.findIndex(step => step.kind === 'persistence-failure');
      insist(ack >= 0 && fault > ack, `${id}: failure must follow ACK`);
    }
    if (id === 'duplicate-delivery') {
      const writes = record.observations.filter(step => step.kind === 'payment-write');
      insist(writes.length === 2 && writes[0].eventId === writes[1].eventId && record.applicationState.credits === 14, `${id}: same-event double grant missing`);
    }
    insist(digest.test(record.evidenceSha256) && record.evidenceSha256 === evidenceHash(record) && record.evidenceSha256 === pin.evidenceSha256, `${id}: evidence hash mismatch`);
    const allowed = ['evidenceSchemaVersion', 'scenarioId', 'checkId', 'brhVersion', 'privateSourceCommitSha', 'generatedAt', 'scenarioVersion', 'fixtureVersion', 'fixtureSha256', 'observations', 'applicationState', 'brokenResult', 'correctedResult', 'evidenceSha256'];
    insist(Object.keys(record).every(key => allowed.includes(key)), `${id}: unexpected public fields`);
  }
  return records;
}
