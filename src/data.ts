import recordings from '../evidence/recordings.json';

export const PRODUCT_URL = 'https://stripe-entitlements-harness-webapp.vercel.app';
export const SOURCE_URL = 'https://github.com/m-turnergane/brh-billing-failure-demo';
export const DEFAULT_SCENARIO = 'entitlement-mismatch';
export const scenarios = [
  { id: 'entitlement-mismatch', checkId: 'E1', number: '01', title: 'Wrong access', name: 'Entitlement mismatch', description: 'A paid PRO_ANNUAL purchase. A FREE customer.', fault: 'The application maps paid capabilities to the wrong plan.', invariant: 'Entitlement projection mismatch', expected: 'PRO', actual: 'FREE', unit: 'Customer access', fix: 'Compare the exact application feature set with current entitlement authority.' },
  { id: 'ack-before-persistence', checkId: 'E5', number: '02', title: '200, then nothing', name: 'ACK before persistence', description: 'The webhook says 200. The access write never lands.', fault: 'The endpoint acknowledges before its queued work is durably received.', invariant: 'Acknowledged persistence failure', expected: 'PRO', actual: 'FREE', unit: 'Customer access', fix: 'Persist or durably enqueue before 2xx; return a retryable failure when durable receipt fails.' },
  { id: 'duplicate-delivery', checkId: 'E7', number: '03', title: 'One payment, twice', name: 'Duplicate delivery', description: 'One purchase. The same event. Two credit grants.', fault: 'Completed event receipts are forgotten; the business effect has no deduplication.', invariant: 'Duplicate fulfillment', expected: '7', actual: '14', unit: 'Customer credits', fix: 'Commit the stable business-operation record and credit mutation together.' },
  { id: 'out-of-order-events', checkId: 'E8', number: '04', title: 'Yesterday wins', name: 'Out-of-order events', description: 'Current access is PRO. An older event changes it back.', fault: 'A stale webhook payload becomes the application’s source of truth.', invariant: 'Stale entitlement projection', expected: 'PRO', actual: 'FREE', unit: 'Customer access', fix: 'Read current authority and serialize the customer projection from fetch through commit.' },
] as const;
export type ScenarioId = typeof scenarios[number]['id'];
export type DemoEventName = 'demo_view' | 'scenario_selected' | 'break_it' | 'replay_brh_check' | 'see_brh_click';
export type DemoEvent = { name: DemoEventName; scenario_id: ScenarioId; selection_mode?: 'default' | 'deep_link' | 'user'; entry_context?: string };
export function getScenario(id: string) { return scenarios.find(scenario => scenario.id === id); }
export function getRecording(id: ScenarioId) { return recordings.find(record => record.scenarioId === id)!; }
