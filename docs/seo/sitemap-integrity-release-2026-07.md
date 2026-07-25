# Sitemap-integrity release — July 2026

## Scope

This is a deliberately narrow reliability release. It does not restructure sitemap families, add compression, add entity sitemaps, reconstruct match reports, or change canonical routing.

It changes only:

- generation and serving of the existing sitemap index and match shards;
- archive links to currently undeployed match-report routes;
- diagnostics for sitemap generation health.

## Verified production failure mode

On 26 July 2026, production contained a fast, populated internal match catalogue, but concurrent sitemap requests could throw a `NullPointerException` in `SitemapService.cleanupOldWrites`. The shared `ArrayDeque` was read and mutated without synchronization. The public controller caught that exception and sent an empty XML `<urlset>` as `200 OK` with a five-minute cache header.

The previous implementation also rebuilt the complete catalogue independently for the index and for each requested child shard. Several crawlers fetching the six shards concurrently therefore repeated the expensive work and made the race much more likely.

`/cricket-match-report/` routes sampled during the audit returned `404`; the Archive hub was still emitting those links and matching ItemList JSON-LD.

## Release contract

1. A request reads an immutable in-memory `SitemapManifest` containing one index and all listed non-empty shards.
2. A complete manifest is built and validated before one atomic publication. Index and shards never come from different generations.
3. A content-change event marks the manifest dirty. The next request refreshes it once; ordinary requests only read the published manifest.
4. Failed regeneration keeps the last known-good manifest. An initial failure returns `503` with `Cache-Control: no-store`, never an empty XML response cached as success.
5. Only exact `sitemap-matches-NNNN.xml` shard names resolve. Unknown and compatibility names return `404` without caching.
6. Sitemap records include static hubs and canonical `/cric-live/{slug}` match URLs only. They exclude Match Intelligence, match-child routes, freshness support routes, and `/cricket-match-report/`.
7. Archive emits completed canonical match links only while match reports remain undeployed.
8. The service logs published URL/shard count and duration, failed-generation count, last successful generation epoch, and whether a refresh is pending. The same values are available at `/api/v1/seo/sitemap/status`.

## Automated evidence

Focused backend tests cover:

- concurrent index/child reads sharing a single manifest generation;
- non-empty shards and an index that lists only published shards;
- canonical URL-only sitemap contents and no match reports, Match Intelligence, or child routes;
- duplicate suppression;
- forced refresh failure retaining the prior index and shard bytes;
- initial failure returning no publishable manifest;
- malformed and out-of-range public shard routes returning `404`.

Command:

```powershell
Set-Location apps/backend/spring-security-jwt
mvn -q "-Dtest=SitemapPartitionTest,SitemapFreshnessLastmodTest,SitemapManifestIntegrityTest,SitemapControllerTest" test
```

The legacy JPA integration test requires a Java-version-compatible Spring test runtime and is tracked separately; its Java 17 CGLIB module failure occurs before any sitemap test method runs.

## Production gates

After rollout, repeat these checks several times and concurrently:

```powershell
$index = Invoke-WebRequest https://www.crickzen.com/sitemap.xml -UseBasicParsing
[xml]$index.Content

$shards = ([xml]$index.Content).sitemapindex.sitemap.loc
$responses = $shards | ForEach-Object -Parallel {
  Invoke-WebRequest $_ -UseBasicParsing
} -ThrottleLimit 8

# Every response must be 200 and non-empty. Verify all XML locations are unique,
# canonical /cric-live URLs or approved static hubs, and no location contains:
# cricket-match-report, match-intelligence, /scorecard, /commentary, or /lineups.
```

Also verify `https://www.crickzen.com/live-score/archive` contains no `/cricket-match-report/` link, and record `/api/v1/seo/sitemap/status` after the initial manifest generation.
