# BRH billing failure demo

**Payment success is not product success.** This small demonstration shows an
application granting the wrong access even when its simulated billing signals
look healthy. Break a flow, reveal the application state, then replay the actual
Billing Reliability Harness (BRH) result that rejected the broken integration.

[Proposed hosted demo](https://stripe-entitlements-harness-webapp.vercel.app/demo)
· [BRH product](https://stripe-entitlements-harness-webapp.vercel.app/)

The hosted URLs and public GitHub repository are prepared for publication;
publication is pending. This repository is the standalone wrapper and shared UI
used by the hosted BRH website, rather than another billing product.

## Run locally

Use Node 24 (recommended; minimum Node 20.9) and npm:

```sh
npm ci
npm run dev
# http://localhost:43128/demo
```

No signup, Stripe credentials, API keys, account, database, or card is required.
No live payment occurs. All inputs and application state are synthetic. Analytics
is supplied only by the host callback; the standalone application does not send
analytics events. Local clones do not need access to the paid BRH kit.

```sh
npm run verify:evidence
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

## The four failures

| Scenario | Direct path | Recorded check |
| --- | --- | --- |
| Paid capabilities mapped to FREE | `/demo/entitlement-mismatch` | E1: exact committed projection |
| 200 before failed queued persistence | `/demo/ack-before-persistence` | E5: exercised failure and retryable ACK |
| Same event, two 7-credit mutations | `/demo/duplicate-delivery` | E7: fulfillment ledger and credit balance |
| Stale payload overwrites current access | `/demo/out-of-order-events` | E8: current authority vs. stale projection |

Checkout completion, payment success, signature validity, and HTTP success are
different observations. They do not establish the application's final projection
or prove a business effect happened once. Each scenario makes that gap visible.

BRH sends fixture events through an application's webhook integration, exercises
controlled failures, and reads the application's stored state. The recorded FAIL
is the actual conformance result from BRH, not a browser-generated claim. The same
check passes with the corrected control. E6 is not used for the ACK demonstration:
its observable best-effort policy deliberately allows 2xx after processing failure.

In the duplicate recording, three concurrent requests include two retryable 409
responses; a later delivery accepts the **same event ID** again. Two accepted
deliveries mutate the ledger and balance to two fulfillments / 14 credits. The UI
highlights those accepted responses, not a claim that every request returned 200.

## Replay and evidence boundaries

This is **recorded evidence**, not a live BRH runner. The browser reproduces the
small broken projection and reveals a checked-in BRH result. Checkout/payment
signals are illustrative scenario context; signature and response observations
are captured during the private run. BRH's E1/E5/E8 fixtures exercise entitlement
events, not a live checkout or subscription purchase.

The adapters use independent in-memory authority, projection, order, ledger, and
balance state. They demonstrate that the assertions reject a broken integration;
they do not prove PostgreSQL durability or certify a production application. This
demo does not claim to run all E1–E9, a real Stripe sandbox, or live customers.

`src/fixtures.mjs` is original MIT demo code, not BRH fixtures or implementation.
Feature keys map to presentation labels: `feature-1` + `feature-2`, `retry-feature`,
and `current-feature` represent PRO in their respective scenarios; the obsolete,
free, and stale feature sets represent FREE. `PRO_ANNUAL` is illustrative purchase
context. Raw BRH messages and underlying keys remain visible in the evidence.

Each recording in `evidence/recordings.json` carries the kit version, private
source commit SHA, check ID, schema/scenario/fixture versions, UTC generation
timestamp, fixture hash, observations, both control results, and SHA-256 checksum.
`evidence/manifest.json` pins compatibility and hashes. Verification rejects
malformation, tampering, changed fixtures, and stale version/revision pins.
Compatible recordings do not expire by calendar age.

Canonical hashing sorts object keys recursively, preserves array order, and
excludes only `evidenceSha256` from the evidence digest. Checksums establish
integrity, not independently authenticated provenance. Private generation and
owner review establish the provenance of the checked-in artifact.

Regeneration requires the private commercial kit and its private generator.
Neither is distributed here. An owner runs that generator from a clean committed
checkout and imports only its sanitized results. Do not manufacture replacement
BRH output or update provenance pins to conceal incompatible evidence.

## Embedding and reproducible updates

The package exports `BillingFailureDemo`, descriptors and event types at `/data`,
scoped CSS at `/styles.css`, and the original fixtures and verifier. The host
provides `onEvent`, its product URL, and route wrappers. The component emits
`demo_view`, `scenario_selected`, `break_it`, `replay_brh_check`, and `see_brh_click`.
It catches callback errors, so analytics cannot break the demo.

Commit the public source first, then update a local BRH website checkout:

```sh
npm run vendor:site -- /absolute/path/to/website
# In the website:
npm ci
npm run verify:demo
npm run typecheck
npm run lint
npm run build
```

The update script verifies evidence, packs an explicit public allowlist, checks
package contents, copies the archive into the website's `vendor/` build context,
records source revision/archive/evidence hashes, and updates its dependency and
lockfile. Commit those website changes together. The website needs only its own
repository to build; Vercel never needs a sibling checkout or private harness.

`vendor/demo-package.json` uses `released: false` during local preparation.
Set it to `true` when that version is published. Subsequent changes must bump
the package version; the update script refuses to overwrite a released version.
The build verifies both the archive checksum and installed module evidence.

## Browser verification

```sh
npx playwright install chromium
# After npm run build and npm start:
npm run test:browser
```

The browser harness checks every scenario, reset, rapid switching, browser back,
reduced motion, 404s, share metadata, and desktop/mobile layouts. It saves local
screenshots under `artifacts/screenshots`. Set `DEMO_BASE` to test the integrated
BRH site. See that private site's demo handoff for GA4 verification; this wrapper
does not require an analytics property.

## License

Original demo code and sanitized evidence are MIT-licensed. Billing Reliability
Harness remains a separately licensed proprietary source-code kit. Its runtime,
fixtures, conformance suite, adapters, persistence primitives, signing material,
and commercial archives are intentionally absent from this repository.
