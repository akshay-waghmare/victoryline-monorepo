# Match Intelligence Completion Audit

Updated: 2026-07-13

This is an evidence audit for Spec 044. It does not enable indexing and does not change homepage behavior.

## Proven

| Requirement | Evidence |
|---|---|
| Shared public-safe model payload | Model serializer tests and VictoryLine payload mapping tests; raw training features remain excluded. |
| Required metrics and formulas | Match Intelligence metric cards, glossary, and formula notes in the SSR template. |
| Three visual modules | Probability worm/timeline, expected-final versus venue bars, and resource/pace comparison are present in SSR. |
| Explanation modules | Model factors, what changed, what matters next, pressure, momentum, confidence, and briefing modules are implemented. |
| Combined model labels | Runtime ODI proof shows `ODI all-gender v2`; historical fresh T20 proof is recorded as `T20 all-gender v2`. |
| SSR behavior | Rebuilt local route returns `200`, model summary, explanation content, no loading shell, and `noindex,follow`. |
| Responsive source behavior | Mobile media-query coverage and prior 390px T20 browser evidence are recorded. |
| Homepage boundary | Current `git diff --name-only` contains no homepage path. |
| Analytics wiring | Browser evidence exists for prediction view, interaction, unavailable, impression, CTA, and explanation events. |
| Model lifecycle automation | No manual match URL is required; Test matches are excluded and completed scorecards no longer pass live detection. |

## Test Evidence

- Model scheduler, routing, payload, and training/inference parity suite: `18 passed`.
- Frontend TypeScript compilation: passed.
- Main Angular Karma target reached ChromeHeadless and executed `168` specs: `110 passed`, `58 failed`; the failures are existing app-test fixture/module-provider issues, not a compile or browser-launch failure. Match Intelligence-specific results are not claimed independently because the legacy runner has no focused-file filter configured.
- Added the focused `id-card-app:test-intelligence` target and entry point. ChromeHeadless executes all `15` Match Intelligence/analytics specs successfully (`15/15`), including payload mapping, abbreviated/full team matching, chart bounds, lifecycle copy, stale confidence, and analytics events.
- Frontend Docker SSR/browser build: passed and container healthy.
- Full Angular Karma execution is not green because existing SEO accessibility specs use unsupported dynamic `axe-core` imports without the package installed; the separate route target references a missing `projects/route/tsconfig.spec.json`.

## Open Gates

1. Capture a fresh live T20 runtime sample when the automatic source slate contains an eligible T20. Do not create a manual prediction row just to satisfy the gate.
2. Verify analytics delivery against real GA4 traffic or DebugView; local browser event capture is not production traffic evidence.
3. Complete browser-based desktop/mobile accessibility and visual verification with a working runner.
4. Run the production route/canonical/freshness audit before any indexing decision.
5. Keep the intelligence route `noindex,follow` and out of sitemaps until the above gates pass.

## Latest SEO Gate Evidence

- Local `robots.txt`, `sitemap.xml`, and the first match sitemap partition returned `200` and contained no `/match-intelligence` URL.
- The live ODI intelligence route returned `200`, retained `noindex,follow`, and exposed a canonical link to the score surface.
- Indexing and sitemap inclusion remain disabled.
