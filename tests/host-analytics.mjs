// Optional integration check for the private host adapter; no collection is sent.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.SITE_BASE || 'http://localhost:43129';
const browser = await chromium.launch();
const context = await browser.newContext();
await context.route(/google-analytics\.com|googletagmanager\.com|buy\.polar\.sh/, route => route.abort());
const captured = [];
await context.exposeBinding('__captureGa', (_source, value) => { if (value[0] === 'event') captured.push(value); });
await context.addInitScript(() => {
  window.dataLayer = [];
  window.gtag = (...args) => { window.dataLayer.push(args); window.__captureGa(args); };
});
const page = await context.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
const events = async () => { await page.waitForTimeout(100); return captured; };
const custom = async () => (await events()).filter(value => value[1] !== 'page_view');
try {
  await page.goto(`${base}/demo?utm_source=dev&utm_medium=comment&utm_campaign=proof&checkout_id=never-collect`, { referer: 'https://news.ycombinator.com/item?id=private' });
  await page.getByRole('button', { name: 'Break it', exact: true }).waitFor();
  await page.waitForTimeout(400);
  assert.deepEqual((await custom()).map(value => value[1]), ['demo_view', 'scenario_selected']);
  assert.equal((await events()).filter(value => value[1] === 'page_view').length, 1);
  assert.equal(await page.locator('script[src*="googletagmanager.com/gtag/js"]').count(), 1);
  await page.getByRole('button', { name: 'Break it', exact: true }).click();
  await page.getByRole('button', { name: 'Replay BRH check', exact: true }).click();
  await page.getByRole('region', { name: 'Recorded BRH result' }).waitFor();
  assert.deepEqual((await custom()).map(value => value[1]), ['demo_view', 'scenario_selected', 'break_it', 'replay_brh_check']);
  await page.getByRole('button', { name: 'Replay BRH check again' }).click();
  await page.getByRole('button', { name: 'Replay BRH check again' }).waitFor();
  assert.equal((await custom()).filter(value => value[1] === 'replay_brh_check').length, 2);
  await page.getByRole('link', { name: /One payment, twice/ }).click();
  await page.getByRole('heading', { name: 'Duplicate delivery', exact: true }).waitFor();
  assert.match(page.url(), /utm_source=dev/);
  const selected = (await custom()).at(-1);
  assert.equal(selected[1], 'scenario_selected'); assert.equal(selected[2].selection_mode, 'user');
  await page.getByRole('button', { name: 'Break it', exact: true }).click();
  await page.getByRole('button', { name: 'Replay BRH check', exact: true }).click();
  await page.getByRole('region', { name: 'Recorded BRH result' }).waitFor();
  await page.getByRole('link', { name: 'See BRH', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/');
  const popupPromise = page.waitForEvent('popup');
  await page.locator('a[href*="buy.polar.sh"]').first().click();
  const popup = await popupPromise; await popup.close();
  const logged = await events();
  assert.equal((await custom()).at(-2)[1], 'see_brh_click');
  assert.equal((await custom()).at(-1)[1], 'checkout_click');
  assert.equal((await custom()).at(-1)[2].scenario_id, 'duplicate-delivery');
  for (const value of await custom()) {
    assert.equal(value[2].utm_source, 'dev'); assert.equal(value[2].referrer_hostname, 'news.ycombinator.com');
    assert.doesNotMatch(JSON.stringify(value), /never-collect|item\?id=private|polar_cl_demo_fixture/);
  }
  assert.equal(logged.filter(value => value[1] === 'page_view').length, 3);
  for (const link of await page.getByRole('link', { name: 'Try the demo', exact: true }).all()) assert.match(await link.getAttribute('href'), /utm_source=dev/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /menu/i }).click();
  assert.match(await page.getByRole('link', { name: 'Try the demo', exact: true }).last().getAttribute('href'), /utm_source=dev/);
  assert.deepEqual(errors, []);

  const blocked = await browser.newContext();
  await blocked.route(/google-analytics\.com|googletagmanager\.com/, route => route.abort());
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('storage blocked'); } });
    window.gtag = () => { throw new Error('tracking blocked'); };
  });
  const offline = await blocked.newPage(); const failures = []; offline.on('pageerror', error => failures.push(error.message));
  await offline.goto(`${base}/demo?utm_source=blocked`);
  await offline.getByRole('button', { name: 'Break it', exact: true }).click();
  await offline.getByRole('button', { name: 'Replay BRH check', exact: true }).click();
  await offline.getByRole('region', { name: 'Recorded BRH result' }).waitFor();
  await offline.getByRole('link', { name: 'See BRH', exact: true }).click();
  await offline.waitForURL(url => url.pathname === '/');
  assert.match(await offline.getByRole('link', { name: 'Try the demo', exact: true }).first().getAttribute('href'), /utm_source=blocked/);
  assert.deepEqual(failures, []); await blocked.close();
  console.log('Host GA4 queue: event order, real repeat actions, Strict Mode deduplication, sanitized attribution, scenario/product/checkout retention, single tag, manual pageviews, discovery and blocked tracking pass. Google/checkout network requests were aborted.');
} finally { await browser.close(); }
