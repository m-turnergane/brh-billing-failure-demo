"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SCENARIO, getRecording, getScenario, PRODUCT_URL, SOURCE_URL, scenarios, type DemoEvent, type ScenarioId } from './data';
import { fixtures, planForKeys, projectBroken } from './fixtures.mjs';

type Phase = 'ready' | 'running' | 'broken' | 'checking' | 'caught';
type Props = { scenarioId?: ScenarioId; onEvent?: (event: DemoEvent) => void; productUrl?: string; sourceUrl?: string; entryContext?: string };
const selectedByUser = new Set<string>();
const signals = ['Checkout completed', 'Payment succeeded', 'Webhook signature valid', 'Webhook returned 200'];

function Arrow() { return <span aria-hidden="true">↗</span>; }
function Status({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <li className={active ? 'brh-signal brh-signal-on' : 'brh-signal'}><span className="brh-status-icon" aria-hidden="true">{active ? '✓' : '·'}</span>{children}<span className="brh-signal-state">{active ? 'OK' : 'WAIT'}</span></li>;
}

export function BillingFailureDemo({ scenarioId = DEFAULT_SCENARIO, onEvent, productUrl = PRODUCT_URL, sourceUrl = SOURCE_URL, entryContext = 'default' }: Props) {
  const scenario = getScenario(scenarioId)!;
  const recording = getRecording(scenarioId);
  const [run, setRun] = useState<{ id: ScenarioId; phase: Phase; visible: number }>({ id: scenarioId, phase: 'ready', visible: 0 });
  const [query, setQuery] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const entered = useRef<string | null>(null);
  const generation = useRef(0);
  const callback = useRef(onEvent);
  const accessPanel = useRef<HTMLElement>(null);
  const resultPanel = useRef<HTMLElement>(null);
  useEffect(() => { callback.current = onEvent; }, [onEvent]);
  const phase = run.id === scenarioId ? run.phase : 'ready';
  const visible = run.id === scenarioId ? run.visible : 0;
  useEffect(() => {
    if (window.innerWidth > 560) return;
    const target = phase === 'broken' ? accessPanel.current : phase === 'caught' ? resultPanel.current : null;
    target?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [phase]);
  const emit = (name: DemoEvent['name'], extra: Partial<DemoEvent> = {}) => {
    try { callback.current?.({ name, scenario_id: scenarioId, ...extra }); } catch { /* analytics must never interrupt the proof */ }
  };
  const clear = () => { generation.current++; timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => {
    if (entered.current !== scenarioId) {
      entered.current = scenarioId;
      const mode = selectedByUser.delete(scenarioId) ? 'user' : entryContext === 'default' ? 'default' : 'deep_link';
      try {
        callback.current?.({ name: 'demo_view', scenario_id: scenarioId, entry_context: entryContext });
        callback.current?.({ name: 'scenario_selected', scenario_id: scenarioId, selection_mode: mode, entry_context: entryContext });
      } catch { /* optional telemetry */ }
    }
    // The cancellation counter is intentionally read when cleanup runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { generation.current++; timers.current.forEach(clearTimeout); timers.current = []; };
  }, [scenarioId, entryContext]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const allowed = new URLSearchParams();
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(key => { const value = params.get(key); if (value) allowed.set(key, value.slice(0, 100)); });
    // External query state is optional and read only after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(allowed.size ? `?${allowed.toString()}` : '');
  }, []);

  function breakIt() {
    clear(); emit('break_it');
    const token = generation.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setRun({ id: scenarioId, phase: 'running', visible: 0 });
    const delay = reduce ? 0 : 260;
    for (let i = 1; i <= 4; i++) timers.current.push(setTimeout(() => {
      if (generation.current === token) setRun({ id: scenarioId, phase: i === 4 ? 'broken' : 'running', visible: i });
    }, delay * i));
  }
  function check() {
    clear(); emit('replay_brh_check');
    const token = generation.current;
    setRun({ id: scenarioId, phase: 'checking', visible: 4 });
    timers.current.push(setTimeout(() => { if (generation.current === token) setRun({ id: scenarioId, phase: 'caught', visible: 4 }); }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650));
  }
  const broken = ['broken', 'checking', 'caught'].includes(phase);
  const reproduced = projectBroken(scenarioId, fixtures[scenarioId], recording.observations);
  const actual = scenarioId === 'duplicate-delivery' ? String(reproduced.credits) : planForKeys(scenarioId, reproduced.keys ?? []);
  const conclusion = broken ? `${scenario.unit}: expected ${scenario.expected}, actual ${actual}.` : '';

  return (
    <div className="brh-demo">
      <a className="brh-skip" href="#billing-proof">Skip to the demo</a>
      <header className="brh-demo-nav"><a className="brh-brand" href={productUrl}>▥ <span>BRH</span><span className="brh-brand-caption">BILLING RELIABILITY HARNESS</span></a><span className="brh-nav-note">A small failure. A real check.</span></header>
      <main className="brh-shell">
        <section className="brh-intro">
          <div className="brh-eyebrow"><span className="brh-dot" />THE GAP BETWEEN PAID AND WORKING</div>
          <h1>Your Stripe checkout can succeed<br className="brh-desktop-break" /> <span>while your product fails.</span></h1>
          <p>Break a billing flow. Watch BRH catch it.</p>
          <div className="brh-replay-label"><span aria-hidden="true">◷</span> Recorded BRH check · simulated Stripe events <span className="brh-no-card">No account. No card. No Stripe keys.</span></div>
        </section>
        <nav className="brh-scenarios" aria-label="Choose a failure scenario">
          {scenarios.map(item => <Link key={item.id} href={`/demo/${item.id}${query}`} aria-current={item.id === scenarioId ? 'page' : undefined} className={item.id === scenarioId ? 'brh-choice brh-choice-active' : 'brh-choice'} onClick={() => { if (item.id !== scenarioId) { clear(); selectedByUser.add(item.id); } }}><span className="brh-choice-number">{item.number}</span><span>{item.title}</span><span className="brh-choice-arrow" aria-hidden="true">↗</span></Link>)}
        </nav>
        <section id="billing-proof" className="brh-proof" data-phase={phase} aria-label={scenario.name}>
          <div className="brh-proof-title"><div><span className="brh-eyebrow">SCENARIO {scenario.number}</span><h2>{scenario.name}</h2><p>{scenario.description}</p></div><button className="brh-reset" onClick={() => { clear(); setRun({ id: scenarioId, phase: 'ready', visible: 0 }); }} aria-label="Reset demo"><span aria-hidden="true">↺</span> Reset</button></div>
          <div className="brh-state-grid">
            <section className="brh-billing"><div className="brh-step-label"><span>01</span> WHAT BILLING SEES</div><div className="brh-receipt"><div><span>SIMULATED PURCHASE</span><strong>{fixtures[scenarioId].purchase}</strong></div><span className={visible >= 2 ? 'brh-paid brh-paid-on' : 'brh-paid'}>{visible >= 2 ? 'PAID' : 'READY'}</span></div><ul className="brh-signals">{signals.map((signal, i) => <Status key={signal} active={visible > i}>{signal}</Status>)}</ul><p className="brh-small-note">Checkout/payment are illustrative fixtures. Webhook observations come from the recorded check.</p></section>
            <section ref={accessPanel} className={broken ? 'brh-access brh-access-broken' : 'brh-access'}><div className="brh-step-label"><span>02</span> WHAT YOUR CUSTOMER GETS</div><div className="brh-access-center"><div className={broken ? 'brh-access-icon brh-access-icon-fail' : 'brh-access-icon'} aria-hidden="true">{broken ? '×' : '⌁'}</div><span className="brh-access-caption">{scenario.unit}</span><strong className={broken ? 'brh-actual brh-actual-fail' : 'brh-actual'}>{broken ? actual : '—'}</strong><p>{broken ? `Expected ${scenario.expected}. ${scenarioId === 'duplicate-delivery' ? 'The same purchase was granted twice.' : 'The paid access never matches.'}` : 'Run the flow to reveal the application state.'}</p></div><div className="brh-hidden-fault">{broken ? <><span className="brh-fault-dot" />{scenario.fault}</> : <><span className="brh-neutral-dot" />A 200 response can hide a broken product.</>}</div></section>
          </div>
          <div className="brh-action-row"><p>{phase === 'ready' ? 'It looks healthy. Find out what’s underneath.' : phase === 'running' ? 'Replaying the billing signals…' : phase === 'checking' ? 'Replaying the recorded BRH check…' : phase === 'caught' ? 'The billing signals passed. The application invariant failed.' : 'Billing says success. Your application says otherwise.'}</p>{phase === 'ready' || phase === 'running' ? <button className="brh-button brh-primary" onClick={breakIt} disabled={phase === 'running'}>Break it <span aria-hidden="true">→</span></button> : <button className="brh-button brh-primary" onClick={check} disabled={phase === 'checking'}>{phase === 'checking' ? 'Checking…' : phase === 'caught' ? 'Replay BRH check again' : 'Replay BRH check'} <span aria-hidden="true">→</span></button>}</div>
          <div className="brh-announcement" role="status" aria-live="polite" aria-atomic="true">{phase === 'caught' ? `BRH ${recording.checkId} FAIL. ${scenario.invariant}. ${conclusion}` : conclusion}</div>
        </section>
        {phase === 'caught' ? <section ref={resultPanel} className="brh-result" aria-label="Recorded BRH result"><div className="brh-result-head"><span className="brh-fail-pill">FAIL</span><h2>{scenario.invariant}</h2><span className="brh-check-id">BRH / {recording.checkId}</span></div><div className="brh-result-body"><div className="brh-result-comparison"><div><span>EXPECTED</span><strong>{scenario.expected}</strong></div><div><span>ACTUAL</span><strong>{actual}</strong></div></div><p>{recording.brokenResult.message}</p><div className="brh-corrected"><span>✓</span> Corrected control: <strong>{recording.correctedResult.status}</strong></div></div><div className="brh-result-foot"><strong>Billing succeeded. The product did not.</strong><p>{scenario.fix}</p></div><details className="brh-evidence"><summary>Inspect the recorded evidence <span>v{recording.brhVersion} · {recording.checkId}</span></summary><p>Actual BRH output from a private deterministic run. These in-memory controls demonstrate the assertion; they do not certify production database durability. The browser replays this recording.</p><dl><dt>Generated</dt><dd>{recording.generatedAt}</dd><dt>Private source revision</dt><dd>{recording.privateSourceCommitSha}</dd><dt>Evidence SHA-256</dt><dd>{recording.evidenceSha256}</dd></dl><pre>{JSON.stringify(recording, null, 2)}</pre></details></section> : null}
        {phase === 'caught' ? <section className="brh-conversion"><div><span className="brh-eyebrow">BEFORE A REAL CUSTOMER FINDS IT</span><h2>BRH tests these failure modes<br />before a real customer hits them.</h2><p>Wire the harness to your application. Prove the state, not just the response.</p></div><div className="brh-conversion-links"><a href={`${productUrl}${query}`} className="brh-button brh-primary" onClick={() => emit('see_brh_click')}>See BRH <Arrow /></a><a href={sourceUrl} className="brh-source" target="_blank" rel="noopener noreferrer" title="Proposed public repository; publication pending">View source on GitHub <Arrow /></a></div></section> : null}
        <footer className="brh-demo-footer"><span>Payment success is not product success.</span><span>Four fixtures. One idea.</span></footer>
      </main>
    </div>
  );
}
