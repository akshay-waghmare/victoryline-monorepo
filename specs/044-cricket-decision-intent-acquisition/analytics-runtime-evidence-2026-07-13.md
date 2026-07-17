# Match Intelligence Analytics Runtime Evidence

Date: 2026-07-13

## Configuration

- The frontend template configures GA4 measurement ID `G-Y32H6PDB9Q`.
- `AnalyticsService.trackIntelligenceEvent` forwards events to `gtag`, `dataLayer`, and the `crickzen:analytics` DOM event when those browser sinks exist.
- SSR does not emit browser analytics events.

## Local Browser Evidence

Route: `/match-intelligence/nepal-vs-jsy-odi-male-win-probability`

The live browser session observed these events on initial view and interaction:

- `prediction_view`
- `intelligence_cta_impression`
- `explanation_expand`
- `prediction_interaction`
- `alert_cta_click`

Route: `/match-intelligence/not-a-real-match`

- `prediction_view`
- `intelligence_cta_impression`
- `model_unavailable`

The T20 mobile browser pass also verified a `390px` document width against a `390px` viewport.

## Production Gate

Not yet proven in this repository:

- GA4 DebugView or exported production event counts.
- Event deduplication and parameter visibility in the configured GA4 property.
- Real-traffic baseline for prediction views, interactions, relationship actions, and model-unavailable states.

The Match Intelligence route remains `noindex,follow` and is not included in a sitemap until these production evidence gates are reviewed.
