# Quality Checklist: Match Details UI/UX Redesign (Feature 002)

## Accessibility (A11y)
- [ ] All interactive elements reachable via keyboard in logical order
- [ ] Visible focus styles (non-color dependent) on tabs, buttons, pagination
- [ ] ARIA roles/landmarks: header, main, navigation, complementary regions
- [ ] Tables use semantic <table>, <thead>, <tbody>, <th scope>
- [ ] Wicket/boundary highlights include textual indicators (icon + text)
- [ ] Commentary updates announced politely (ARIA live region, assertiveness = polite)
- [ ] Color contrast ≥ WCAG AA (4.5:1 text, 3:1 UI non-text)
- [ ] Reduced motion: prefers-reduced-motion disables non-essential transitions
- [ ] No keyboard traps (exit top & bottom returns to nav)

## Performance
- [ ] First meaningful paint <1500ms (3G Fast simulated)
- [ ] Time to interactive <3500ms mobile
- [ ] Lighthouse Performance ≥90 on live and completed match scenarios
- [ ] Commentary list virtualization kicks in >200 entries
- [ ] No layout shift on incremental commentary load (CLS minimal)
- [ ] Snapshot diff updates (no full re-render) verified
- [ ] Network payload per refresh <10KB (excluding initial load) where feasible

## Data Freshness & Resilience
- [ ] Staleness tiers implement visual indicators (<30s live, 30–120s warning, >120s error)
- [ ] Retry logic exponential backoff (e.g., 1s, 3s, 5s) up to 3 attempts
- [ ] Fallback message when commentary temporarily unavailable
- [ ] Timestamp displayed in user local time + relative time (e.g., "Updated 42s ago")
- [ ] Manual refresh action accessible & keyboard operable

## UX & Layout
- [ ] Mobile-first layout verified ≤375px width
- [ ] Sticky condensed header activates after snapshot scroll threshold
- [ ] Tab navigation preserves selected tab on soft nav (optional enhancement if implemented)
- [ ] Commentary visual hierarchy (icons/colors + text) for wickets, boundaries, milestones
- [ ] Scorecard legibility: column alignment & abbreviation legend available
- [ ] Lineups roles consistently styled with accessible legend
- [ ] No critical content hidden behind scroll on initial viewport load

## Reliability & Edge Cases
- [ ] Match status transitions (Live → Completed, Live → Delayed) update snapshot without reload
- [ ] Super Over (if present) displays additional innings logically
- [ ] Rain delay state shows clear explanatory message
- [ ] Abandoned match hides irrelevant tabs (commentary if partial, scorecard incomplete) with notice
- [ ] Missing player role metadata gracefully falls back to generic label
- [ ] Large commentary history (>1000 entries) maintains smooth scroll

## Instrumentation & Metrics
- [ ] Analytics events: tab_change, commentary_load_more, snapshot_refresh, staleness_state_change
- [ ] Performance marks: snapshot_render_start/end, commentary_append_start/end
- [ ] Error logging includes fetch endpoint, status code, attempt count
- [ ] Accessibility audit (axe) integrated into CI for this view

## Security & Privacy
- [ ] No PII rendered beyond player public data
- [ ] Inputs (if any future filters) sanitized

## Documentation
- [ ] Spec alignment reviewed (FR/NFR mapping) before implementation start
- [ ] README / Implementation Summary updated with architectural notes
- [ ] Constitution compliance section updated if new standards emerge

## Sign-off
- [ ] Dev review complete
- [ ] A11y review complete
- [ ] QA functional pass
- [ ] Performance benchmark pass
- [ ] Product owner approval
