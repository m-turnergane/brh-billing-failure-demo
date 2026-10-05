import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.DEMO_BASE || 'http://127.0.0.1:43128';
const out = resolve('artifacts/screenshots'); mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const problems = [];
const results = [];
const ids = ['entitlement-mismatch', 'ack-before-persistence', 'duplicate-delivery', 'out-of-order-events'];
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
// Verification never sends analytics to Google, even with a dummy configured ID.
await context.route(/google-analytics\.com|googletagmanager\.com/, route => route.abort());
const page = await context.newPage();
page.on('pageerror', error => problems.push(error.message));
const events = () => page.evaluate(() => (window.dataLayer || []).map(value => Array.from(value)).filter(value => value[0] === 'event'));
try {
  for (const id of ids) {
    const response = await page.goto(`${base}/demo/${id}?utm_source=dev&utm_medium=comment&utm_campaign=billing-proof`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.getByRole('button', { name: 'Break it', exact: true }).waitFor();
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), `https://stripe-entitlements-harness-webapp.vercel.app/demo/${id}`);
    assert.match(await page.locator('meta[property="og:image"]').getAttribute('content'), new RegExp(`/demo/${id}/opengraph-image`));
    const og = await context.request.get(`${base}/demo/${id}/opengraph-image`);
    assert.equal(og.status(), 200); assert.match(og.headers()['content-type'], /image\/png/);
    if (id === ids[0]) await page.screenshot({ path: `${out}/desktop-ready.png`, fullPage: true });
    await page.getByRole('button', { name: 'Break it', exact: true }).click();
    await page.getByRole('button', { name: 'Replay BRH check', exact: true }).waitFor();
    assert.match(await page.locator('[role=status]').innerText(), /expected (PRO|7), actual (FREE|14)/);
    if (id === ids[0]) await page.screenshot({ path: `${out}/desktop-broken.png`, fullPage: true });
    await page.getByRole('button', { name: 'Replay BRH check', exact: true }).click();
    await page.getByRole('region', { name: 'Recorded BRH result' }).waitFor();
    assert.match(await page.getByRole('region', { name: 'Recorded BRH result' }).innerText(), /FAIL[\s\S]*Corrected control: PASS/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await page.screenshot({ path: `${out}/desktop-${id}.png`, fullPage: true });
    const logged = await events();
    if (logged.length) {
      const custom = logged.filter(event => event[1] !== 'page_view');
      assert.deepEqual(custom.map(event => event[1]), ['demo_view', 'scenario_selected', 'break_it', 'replay_brh_check']);
      assert.equal(custom[0][2].scenario_id, id);
      assert.equal(custom[0][2].utm_source, 'dev');
      assert.equal(custom[0][2].utm_campaign, 'billing-proof');
    }
    await page.getByRole('button', { name: 'Replay BRH check again' }).click();
    await page.getByRole('button', { name: 'Replay BRH check again' }).waitFor();
    await page.getByRole('button', { name: 'Reset demo' }).click();
    assert.equal(await page.getByRole('region', { name: 'Recorded BRH result' }).count(), 0);
    await page.getByRole('button', { name: 'Break it', exact: true }).waitFor();
    results.push(`${id}: billing state, actual recorded result, replay, reset, metadata, OG and layout pass`);
  }
  await page.goto(`${base}/demo`);
  await page.getByRole('button', { name: 'Break it', exact: true }).click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.waitForTimeout(1200);
  assert.equal(await page.getByRole('button', { name: 'Replay BRH check', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Break it', exact: true }).click();
  await page.getByRole('link', { name: /One payment, twice/ }).click();
  await page.getByRole('heading', { name: 'Duplicate delivery', exact: true }).waitFor();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Break it', exact: true }).waitFor();
  await page.getByRole('link', { name: /Yesterday wins/ }).click();
  await page.getByRole('heading', { name: 'Out-of-order events', exact: true }).waitFor();
  await page.goBack();
  await page.getByRole('heading', { name: 'Duplicate delivery', exact: true }).waitFor();
  const notFound = await page.goto(`${base}/demo/no-such-scenario`);
  assert.equal(notFound.status(), 404);
  results.push('Cancellation on reset/switch, browser back and invalid route pass');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await mobile.route(/google-analytics\.com|googletagmanager\.com/, route => route.abort());
  const small = await mobile.newPage();
  await small.goto(`${base}/demo/entitlement-mismatch`);
  await small.keyboard.press('Tab');
  assert.equal(await small.locator('.brh-skip').evaluate(el => el === document.activeElement), true);
  await small.getByRole('button', { name: 'Break it', exact: true }).click();
  await small.getByRole('button', { name: 'Replay BRH check', exact: true }).click();
  await small.getByRole('region', { name: 'Recorded BRH result' }).waitFor();
  assert.equal(await small.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  assert.equal(await small.locator('.brh-result').evaluate(el => getComputedStyle(el).animationName), 'none');
  await small.screenshot({ path: `${out}/mobile-entitlement-mismatch.png`, fullPage: true });
  await mobile.close();
  assert.deepEqual(problems, []);
  results.push('Mobile, keyboard skip link, reduced motion and blocked analytics pass');
  writeFileSync(resolve('artifacts/browser-results.json'), JSON.stringify({ base, verifiedAt: new Date().toISOString(), results }, null, 2));
  console.log(results.join('\n'));
} finally { await browser.close(); }
