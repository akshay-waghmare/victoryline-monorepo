# Quickstart: Live Match Glance Layout

## Prerequisites
- Node.js ≥ 14 (matches existing Angular build requirements)
- Angular CLI 7 (`npm install -g @angular/cli@7.2.4`)
- Backend + scraper stacks running locally or staging endpoints configured in `environment.ts`

## Local Workflow
1. **Install dependencies**
   ```powershell
   cd apps/frontend
   npm install
   ```
2. **Start backend feeds** (if needed)
   - Ensure websocket broker and REST API expose `/api/v1/matches/{id}/snapshot` and scorecard endpoints.
   - Optional: use `MatchFallbackService` to stub data.
3. **Launch frontend**
   ```powershell
   ng serve --host 0.0.0.0 --port 4200
   ```
4. **Navigate to live match page**
   - Visit `http://localhost:4200/#/cric-live/{slug}`.
   - Use the Crex example slug `pak-vs-sl-3rd-odi-sri-lanka-tour-of-pakistan-2025` to compare layout (open reference in separate tab).

## Hero Layout Validation Checklist
- Score strip, chase context, and odds all render within initial viewport (1366×768, 1024×768 landscape).
- Striker/non-striker pods show runs, balls, strike rate, and strike indicator; bowler pod shows overs, runs, wickets, economy.
- Sticky condensed bar keeps essentials visible when navigating to commentary/scorecard anchors.
- Staleness badge switches tiers when mock timestamp ages beyond 30s and 120s.
- Odds placeholder text appears when `jurisdictionEnabled=false`.
- Keyboard navigation reaches hero pods, quick links, and retry buttons in logical order.
- `prefers-reduced-motion` disables hero transitions (use Chrome DevTools > Rendering > Emulate CSS prefers-reduced-motion).

## Troubleshooting
- **No snapshot data**: Verify websocket topic `/topic/cricket.match.{id}.snapshot` emits payloads. Use browser dev tools > Network > WS to inspect.
- **Odds missing**: Confirm backend snapshot includes odds fields; otherwise expect placeholder.
- **Hero overflows**: Check for additional banners/toolbars; adjust CSS grid breakpoints per design tokens (`tokens.scss`).
- **Analytics events missing**: Ensure instrumentation wiring in `AnalyticsService` sends `hero_view`, `staleness_warning`, `odds_placeholder` events.
