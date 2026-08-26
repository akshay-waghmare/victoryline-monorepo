[CmdletBinding()]
param(
  [string]$BaseUrl = "https://www.crickzen.com",
  [int]$ProbeCount = 2,
  [int]$RequestTimeoutSeconds = 60,
  [int]$MatchSamplePerCohort = 1,
  [int]$SlowResponseThresholdMs = 7000,
  [int]$MaximumDecodedBytes = 15728640,
  [string]$OutputDirectory = "artifacts/seo-crawl-health"
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd("/")

$profiles = @(
  [ordered]@{ name = 'normal'; userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' },
  [ordered]@{ name = 'googlebot-desktop'; userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  [ordered]@{ name = 'googlebot-mobile'; userAgent = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
)

function Get-HeaderValue {
  param(
    [object]$Response,
    [string]$Name
  )

  if ($null -ne $Response -and $null -ne $Response.Headers) {
    return [string]$Response.Headers[$Name]
  }
  return ''
}

function Read-ResponseBody {
  param([object]$Response)

  if ($null -eq $Response) {
    return ''
  }
  try {
    $stream = $Response.GetResponseStream()
    if ($null -eq $stream) {
      return ''
    }
    $reader = New-Object System.IO.StreamReader($stream)
    try {
      return $reader.ReadToEnd()
    } finally {
      $reader.Dispose()
    }
  } catch {
    return ''
  }
}

function Get-PageSnapshot {
  param(
    [string]$Url,
    [string]$UserAgent
  )

  $stopwatch = [Diagnostics.Stopwatch]::StartNew()
  $response = $null
  $body = ''
  $status = -1
  $errorMessage = ''

  try {
    $response = Invoke-WebRequest -Uri $Url -Headers @{ 'User-Agent' = $UserAgent } -UseBasicParsing -TimeoutSec $RequestTimeoutSeconds -MaximumRedirection 5
    $status = [int]$response.StatusCode
    $body = [string]$response.Content
  } catch {
    $errorMessage = $_.Exception.Message
    $webResponse = $_.Exception.Response
    if ($null -ne $webResponse) {
      try {
        $status = [int]$webResponse.StatusCode
        $body = Read-ResponseBody $webResponse
        $response = $webResponse
      } catch {
        $errorMessage = $_.Exception.Message
      }
    }
  } finally {
    $stopwatch.Stop()
  }

  $finalUrl = $Url
  if ($null -ne $response -and $null -ne $response.ResponseUri) {
    $finalUrl = [string]$response.ResponseUri.AbsoluteUri
  }
  if ($null -ne $response -and $null -ne $response.BaseResponse -and $null -ne $response.BaseResponse.ResponseUri) {
    $finalUrl = [string]$response.BaseResponse.ResponseUri.AbsoluteUri
  }

  return [ordered]@{
    status = $status
    elapsedMs = $stopwatch.ElapsedMilliseconds
    decodedBytes = [Text.Encoding]::UTF8.GetByteCount($body)
    finalUrl = $finalUrl
    contentEncoding = Get-HeaderValue $response 'Content-Encoding'
    cacheControl = Get-HeaderValue $response 'Cache-Control'
    etag = Get-HeaderValue $response 'ETag'
    vary = Get-HeaderValue $response 'Vary'
    ssrDocumentCache = Get-HeaderValue $response 'X-SSR-Document-Cache'
    ssrFallback = Get-HeaderValue $response 'X-SSR-Fallback'
    body = $body
    error = $errorMessage
  }
}

function Get-PageMetrics {
  param(
    [string]$Body,
    [int]$DecodedBytes
  )

  $canonicalCount = ([regex]::Matches($Body, '<link\b[^>]*rel=["'']canonical["'']', 'IgnoreCase')).Count
  $h1Count = ([regex]::Matches($Body, '<h1\b', 'IgnoreCase')).Count
  $jsonLdCount = ([regex]::Matches($Body, 'application/ld\+json', 'IgnoreCase')).Count
  $noindex = [bool]($Body -match '<meta\b[^>]*name=["'']robots["''][^>]*content=["''][^"'']*noindex')
  $matchAeoMatch = [regex]::Match($Body, '<section\b[^>]*id=["'']canonical-match-aeo["''][\s\S]*?</section>', 'IgnoreCase')
  $lifecycleMatch = [regex]::Match($Body, 'id=["'']canonical-match-aeo["''][^>]*data-lifecycle=["'']([^"'']+)', 'IgnoreCase')
  $anchorMatches = [regex]::Matches($Body, '<a\b[^>]*\bhref=["''][^"'']+["'']', 'IgnoreCase')
  $internalAnchorCount = @($anchorMatches | Where-Object { $_.Value -match 'href=["''](?:/|https://www\.crickzen\.com/)' }).Count
  $aeoText = if ($matchAeoMatch.Success) { [regex]::Replace($matchAeoMatch.Value, '<[^>]+>', ' ') } else { '' }

  return [ordered]@{
    decodedBytes = $DecodedBytes
    canonicalCount = $canonicalCount
    h1Count = $h1Count
    jsonLdCount = $jsonLdCount
    noindex = $noindex
    canonicalMatchAeo = $matchAeoMatch.Success
    canonicalAeoFacts = [bool]($aeoText -match '(?i)\bTeams\b' -and $aeoText -match '(?i)\bStatus\b')
    anchorCount = $anchorMatches.Count
    internalAnchorCount = $internalAnchorCount
    lifecycle = if ($lifecycleMatch.Success) { $lifecycleMatch.Groups[1].Value } else { $null }
    placeholder = [bool]($Body -match '(?i)\b(?:Team 1|Team 2|Team A|Team B|TBD vs TBD)\b')
    temporaryCopy = [bool]($Body -match '(?i)temporarily unavailable|temporarily loading|will update with runs|updates will appear shortly')
  }
}

function Get-SitemapSamples {
  $indexResponse = Invoke-WebRequest -Uri "$base/sitemap.xml" -UseBasicParsing -TimeoutSec $RequestTimeoutSeconds
  $indexXml = [xml]$indexResponse.Content
  $shards = @()
  foreach ($sitemap in @($indexXml.sitemapindex.sitemap)) {
    $location = [string]$sitemap.loc
    $partitionResponse = Invoke-WebRequest -Uri $location -UseBasicParsing -TimeoutSec $RequestTimeoutSeconds
    $partitionXml = [xml]$partitionResponse.Content
    $urls = @($partitionXml.urlset.url.loc | ForEach-Object { [string]$_ })
    $shardName = $location.ToLowerInvariant()
    $cohort = if ($shardName -match 'live') { 'live' } elseif ($shardName -match 'upcoming') { 'upcoming' } elseif ($shardName -match 'recent') { 'recent' } elseif ($shardName -match 'archive') { 'archive' } else { 'other' }
    $shards += [pscustomobject]@{
      location = $location
      cohort = $cohort
      urls = $urls
    }
  }

  $samples = @()
  foreach ($cohortGroup in @($shards | Group-Object cohort)) {
    foreach ($shard in @($cohortGroup.Group)) {
      foreach ($url in @($shard.urls | Where-Object { $_ -match '/cric-live/' } | Select-Object -First $MatchSamplePerCohort)) {
        $samples += [pscustomobject]@{ url = $url; cohort = $cohortGroup.Name; shard = $shard.location }
      }
      if (@($samples | Where-Object { $_.cohort -eq $cohortGroup.Name }).Count -ge $MatchSamplePerCohort) {
        break
      }
    }
  }
  return [pscustomobject]@{
    partitionCount = @($shards).Count
    samples = $samples
  }
}

$fixedRoutes = @(
  [pscustomobject]@{ url = "$base/robots.txt"; kind = 'robots' },
  [pscustomobject]@{ url = "$base/sitemap.xml"; kind = 'sitemap' },
  [pscustomobject]@{ url = "$base/"; kind = 'discovery' },
  [pscustomobject]@{ url = "$base/matches"; kind = 'discovery' },
  [pscustomobject]@{ url = "$base/cricket-schedule/today"; kind = 'discovery' },
  [pscustomobject]@{ url = "$base/this-page-should-not-exist"; kind = 'not-found' }
)

$sitemap = Get-SitemapSamples
$targets = @($fixedRoutes)
$targets += @($sitemap.samples | ForEach-Object {
  [pscustomobject]@{ url = $_.url; kind = "match-$($_.cohort)"; cohort = $_.cohort; sitemapShard = $_.shard }
})

$results = @()
foreach ($target in $targets) {
  foreach ($profile in $profiles) {
    for ($attempt = 1; $attempt -le $ProbeCount; $attempt++) {
      $page = Get-PageSnapshot -Url $target.url -UserAgent $profile.userAgent
      $body = [string]$page.body
      $metrics = Get-PageMetrics -Body $body -DecodedBytes $page.decodedBytes
      $results += [ordered]@{
        url = $target.url
        kind = $target.kind
        cohort = if ($target.cohort) { $target.cohort } else { $null }
        profile = $profile.name
        syntheticGooglebot = $profile.name -like 'googlebot-*'
        attempt = $attempt
        status = $page.status
        elapsedMs = $page.elapsedMs
        metrics = $metrics
        headers = [ordered]@{
          contentEncoding = $page.contentEncoding
          cacheControl = $page.cacheControl
          etag = $page.etag
          vary = $page.vary
          ssrDocumentCache = $page.ssrDocumentCache
          ssrFallback = $page.ssrFallback
        }
        finalUrl = $page.finalUrl
        error = $page.error
      }
    }
  }
}

$failures = @()
$matchResults = @($results | Where-Object { $_.kind -like 'match-*' })
$notFoundResults = @($results | Where-Object { $_.kind -eq 'not-found' })
$nonNotFoundResults = @($results | Where-Object { $_.kind -ne 'not-found' })

foreach ($result in $nonNotFoundResults | Where-Object { $_.status -eq 403 -or $_.status -eq 429 -or $_.status -ge 500 -or $_.status -lt 0 }) {
  $failures += "Crawler-facing request failure: $($result.profile) $($result.url) attempt $($result.attempt) returned $($result.status)."
}
foreach ($result in $notFoundResults | Where-Object { $_.status -ne 404 }) {
  $failures += "Negative-route failure: $($result.url) returned $($result.status), expected 404."
}
foreach ($result in $matchResults | Where-Object {
  $_.status -ne 200 -or $_.metrics.canonicalCount -ne 1 -or $_.metrics.h1Count -ne 1 -or $_.metrics.noindex -or $_.metrics.placeholder -or $_.metrics.temporaryCopy -or -not $_.metrics.canonicalMatchAeo -or -not $_.metrics.canonicalAeoFacts -or $_.metrics.anchorCount -lt 1 -or $_.metrics.internalAnchorCount -lt 1
}) {
  $failures += "Match crawlability failure: $($result.profile) $($result.url), status=$($result.status), canonical=$($result.metrics.canonicalCount), h1=$($result.metrics.h1Count), noindex=$($result.metrics.noindex), aeo=$($result.metrics.canonicalMatchAeo), facts=$($result.metrics.canonicalAeoFacts), anchors=$($result.metrics.anchorCount), internalAnchors=$($result.metrics.internalAnchorCount), placeholder=$($result.metrics.placeholder), temporary=$($result.metrics.temporaryCopy)."
}

foreach ($target in @($targets | Where-Object { $_.kind -ne 'robots' -and $_.kind -ne 'sitemap' -and $_.kind -ne 'not-found' })) {
  foreach ($attempt in 1..$ProbeCount) {
    $sameAttempt = @($results | Where-Object { $_.url -eq $target.url -and $_.attempt -eq $attempt })
    $normal = @($sameAttempt | Where-Object { $_.profile -eq 'normal' })[0]
    foreach ($crawler in @($sameAttempt | Where-Object { $_.profile -like 'googlebot-*' })) {
      if ($null -ne $normal -and $crawler.status -ne $normal.status) {
        $failures += "Crawler parity failure: $($crawler.profile) $($target.url) returned $($crawler.status), normal returned $($normal.status)."
      }
    }
  }
}

foreach ($result in @($results | Where-Object { $_.elapsedMs -ge $SlowResponseThresholdMs })) {
  $failures += "Slow crawler-facing response: $($result.profile) $($result.url) took $($result.elapsedMs) ms."
}
foreach ($result in @($results | Where-Object { $_.metrics.decodedBytes -gt $MaximumDecodedBytes })) {
  $failures += "Oversized crawler-facing response: $($result.profile) $($result.url) was $($result.metrics.decodedBytes) decoded bytes."
}

$latencies = @($results | ForEach-Object { [int64]$_.elapsedMs } | Sort-Object)
$p95 = $null
if ($latencies.Count -gt 0) {
  $p95Index = [math]::Ceiling($latencies.Count * 0.95) - 1
  $p95 = $latencies[[math]::Max(0, [int]$p95Index)]
}
$cacheObserved = @($results | Where-Object { $_.headers.cacheControl -or $_.headers.etag -or $_.headers.ssrDocumentCache }).Count

$report = [ordered]@{
  checkedAtUtc = [DateTime]::UtcNow.ToString('o')
  baseUrl = $base
  configuration = [ordered]@{
    probeCount = $ProbeCount
    requestTimeoutSeconds = $RequestTimeoutSeconds
    matchSamplePerCohort = $MatchSamplePerCohort
    slowResponseThresholdMs = $SlowResponseThresholdMs
    maximumDecodedBytes = $MaximumDecodedBytes
    profiles = @($profiles | ForEach-Object { $_.name })
  }
  summary = [ordered]@{
    sitemapPartitions = $sitemap.partitionCount
    targets = @($targets).Count
    requests = @($results).Count
    p95ElapsedMs = $p95
    cacheSignalResponses = $cacheObserved
    failures = @($failures).Count
  }
  claimBoundary = 'Technical crawler reachability, response stability, SSR parity, cache signals, and payload size only; not Google discovery, indexing, rankings, traffic, engagement, or AI citations.'
  sitemapSamples = $sitemap.samples
  results = $results | ForEach-Object {
    $copy = [ordered]@{}
    foreach ($key in $_.Keys) {
      if ($key -ne 'body') { $copy[$key] = $_[$key] }
    }
    $copy
  }
  failures = $failures
}

$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null
$stamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
$outputPath = Join-Path $resolvedOutput "crickzen-crawl-health-$stamp.json"
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $outputPath -Encoding UTF8

$report.summary | Format-List
if ($failures.Count -gt 0) {
  'Failures:'
  $failures | ForEach-Object { "- $_" }
}
"Report: $outputPath"

if ($failures.Count -gt 0) {
  exit 2
}
