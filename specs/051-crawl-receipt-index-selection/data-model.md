# Data model and evidence fields

## Cohort member

```text
canonicalUrl
sourceUrl
sourceKey
team1
team2
series
scheduledStart
selectedAt
windowStart
windowEnd
sitemapFirstSeenAt
ssrLinkFirstSeenAt
```

## Technical observation

```text
observedAt
httpStatus
selfCanonical
robots
h1
title
scheduledContextVisible
venueVisible
sportsEventValid
sitemapPresent
serverRenderedHubLinks
ssrResponseMode (app | snapshot | deterministic-fallback | unresolved)
```

## GSC observation

```text
observedAt
source (URL Inspection | Pages report | exported GSC evidence)
state (Unknown | Discovered | Indexed)
rawStatus
coverageReason
firstDiscoveredAt
firstIndexedAt
```

Derived values are calculated only when their source timestamps exist:

- `sitemapToDiscoveryMinutes`
- `discoveryToIndexMinutes`
- `sitemapToIndexMinutes`
- `preLiveMarginMinutes`
- `preLiveDiscoveryGate`
- `preLiveIndexGate`

Unknown or stale observations remain pending and never become a positive outcome by inference.
