# Spec 047: Match Details tab UX cleanup

## Objective

Make the Match Details tab feel like a calm match-centre information surface: essential context first, supporting analysis available on demand, and no long stack of equally weighted cards.

## Audit findings

- The existing details panel presents a hero, Recent Form, Team Comparison, Venue Snapshot, and Officials as open sections in one vertical stream.
- This gives supporting analysis the same visual weight as the match identity and makes the tab feel longer and harder to scan than a focused competitor match-info surface.
- CREX’s useful structural lesson is progressive disclosure: compact match context first, then deeper information after the user chooses it. This is an information-architecture reference, not a pixel-copy target.
- A bounded browser connection to the live CREX page dropped during attachment, so the implementation uses the known structural benchmark and local DOM/source evidence. Runtime Playwright verification remains a required gate.

## Plan

1. Keep the match title, status, format, and essential summary cards open at the top.
2. Convert Recent Form, Team Comparison, Venue Snapshot, and Officials into clear disclosure panels.
3. Default all supporting panels closed so the user can scan the match context without scrolling through analysis.
4. Preserve all data, SSR content, accessibility labels, and existing toggle behavior inside each panel.
5. Verify desktop/mobile runtime layout, tab navigation, SSR markers, and TypeScript/build health.

## Acceptance criteria

- Match Details opens with one dominant, compact context block.
- Supporting sections do not all render as open cards in the first reading layer.
- Each supporting section remains discoverable with an explicit label and accessible disclosure state.
- No backend, scraper, model, route, canonical, or JSON-LD behavior changes.
- Local Playwright verification confirms the tab and disclosure interactions on `/cric-live/{slug}`.
