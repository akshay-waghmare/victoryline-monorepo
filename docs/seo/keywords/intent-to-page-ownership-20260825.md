# CrickZen Intent-to-Page Ownership — 2026-08-25

Source: `C:\Users\ADMINS\Downloads\Crickzen_Master_Search_Demand_Graph_2026-08-25.xlsx`.

This is a planning artifact, not a ranking forecast. The workbook has 3,411 source observations, 3,382 unique normalized keywords, four source page types, and 16 clusters. Its Planner demand index is a relative bucketed signal. `Covered` means a known route maps to the intent; it does not prove Google indexing, ranking, or engagement.

## Initial ownership matrix

| Cluster | Demand index | Coverage | Fit | Owner | Decision |
| --- | ---: | --- | --- | --- | --- |
| Standings / Points Table | 19,015,400 | Missing | Core | `/series/{id}/{slug}/table` or validated standings owner | Target first slice |
| Tournament / Series | 3,790,800 | Missing | Core | `/series/{id}/{slug}` | Target first slice |
| Schedule / Fixtures | 36,420,550 | Weak | Core | Existing schedule family plus validated series/team schedule paths | Strengthen after first slice |
| Today Matches | 44,080,350 | Covered | Core | `/live-score/today` | Protect and measure |
| Live Score Hub | 17,184,500 | Covered | Core | `/live-score` | Protect and measure |
| Team / Match Discovery | 38,350,200 | Weak | Adjacent | `/teams/{id}/{slug}` | Validate fit, then strengthen |
| Generic Cricket Discovery | 30,608,550 | Weak | Adjacent | `/live-cricket-score` or a validated topical hub | Observe until proposition is clear |
| Scorecard | 219,650 | Weak | Core | Completed state of `/cric-live/{slug}` | Strengthen canonical page |
| Playing XI / Squad | 85,800 | Weak | Adjacent | Match/team surfaces when data is present | Observe/data-gated |
| Watch / TV / Tickets | 32,600 | Missing | Exclude | None | Do not build without capability |

## Ownership rules

1. Many keyword variants may map to one canonical page; keyword volume does not justify a new URL.
2. A hub owns browse/planning intent and links into entity pages; it does not compete with the canonical match page for exact match utility.
3. A series owns tournament identity and relationships to fixtures, standings, teams, and results.
4. The canonical match owns the full match entity across upcoming, live, and completed states.
5. Match Intelligence remains a secondary retention surface until its unique-value and SSR gates pass.
6. A page may promise only facts rendered from a fresh, resolved data payload.

## AEO content contract

Every approved indexable page should use:

`answer first -> evidence/data -> explanation -> explicit entity links -> next useful action`

Each answer block should remain understandable when copied without the surrounding page. Sentences should name the actual team, match, series, venue, player, score, result, or CrickZen metric rather than using vague pronouns.

## Missing source provenance

The current workbook does not retain the actual competitor URL for each observation. The next refresh must add competitor, source URL, capture date, page lifecycle, title/H1, visible answer blocks, internal links, schema, and observed data elements before using the graph for detailed competitor replication decisions.

## Next gate

Select one live series with reliable fixtures and standings data. Verify the series profile, points-table route, team links, match links, and completed result state in raw SSR before expanding the template.
