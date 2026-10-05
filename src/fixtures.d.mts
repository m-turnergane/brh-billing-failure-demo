export type DemoFixture = { version: number; purchase: string; [key: string]: unknown };
export const fixtures: Record<string, DemoFixture>;
export function projectBroken(id: string, fixture: DemoFixture, observations: readonly unknown[]): { keys?: string[]; credits?: number; fulfillmentCount?: number };
export function planForKeys(id: string, keys: readonly string[]): 'PRO' | 'FREE';
