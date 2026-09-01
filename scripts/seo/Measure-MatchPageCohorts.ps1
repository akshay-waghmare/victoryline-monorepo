[CmdletBinding()]
param(
  [string]$BaseUrl = "https://www.crickzen.com",
  [int]$SamplePerCohort = 3,
  [int]$RequestTimeoutSeconds = 60,
  [string]$OutputDirectory = "artifacts/seo-cohort",
  [string]$ManifestPath = "artifacts/seo-cohort/fixed-cohort.json",
  [string]$PreviousReportPath = "",
  [string]$GscSnapshotPath = ""
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd("/")
$definitionVersion = "match-page-value-v1"

$profiles = @(
  [ordered]@{ name = 'normal'; userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' },
  [ordered]@{ name = 'googlebot-desktop'; userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  [ordered]@{ name = 'googlebot-mobile'; userAgent = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
)

function Get-HeaderValue {
  param([object]$Response, [string]$Name)
  if ($null -ne $Response -and $null -ne $Response.Headers) {
    return [string]$Response.Headers[$Name]
  }
  return ''
}

function Read-ResponseBody {
  param([object]$Response)
  if ($null -eq $Response) { return '' }
  try {
    $stream = $Response.GetResponseStream()
    if ($null -eq $stream) { return '' }
    $reader = New-Object System.IO.StreamReader($stream)
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
  } catch { return '' }
}

function Get-HttpSnapshot {
  param([string]$Url, [string]$UserAgent, [bool]$Json = $false)
  $stopwatch = [Diagnostics.Stopwatch]::StartNew()
  $response = $null
  $body = ''
  $status = -1
  $errorMessage = ''
  try {
    $headers = @{ 'User-Agent' = $UserAgent; 'Accept' = if ($Json) { 'application/json' } else { '*/*' } }
    $response = Invoke-WebRequest -Uri $Url -Headers $headers -UseBasicParsing -TimeoutSec $RequestTimeoutSeconds -MaximumRedirection 5
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
      } catch { $errorMessage = $_.Exception.Message }
    }
  } finally { $stopwatch.Stop() }

  $finalUrl = $Url
  if ($null -ne $response -and $null -ne $response.ResponseUri) { $finalUrl = [string]$response.ResponseUri.AbsoluteUri }
  if ($null -ne $response -and $null -ne $response.BaseResponse -and $null -ne $response.BaseResponse.ResponseUri) { $finalUrl = [string]$response.BaseResponse.ResponseUri.AbsoluteUri }
  return [ordered]@{
    status = $status
    elapsedMs = $stopwatch.ElapsedMilliseconds
    finalUrl = $finalUrl
    body = $body
    error = $errorMessage
    headers = [ordered]@{
      cacheControl = Get-HeaderValue $response 'Cache-Control'
      etag = Get-HeaderValue $response 'ETag'
      vary = Get-HeaderValue $response 'Vary'
      ssrDocumentCache = Get-HeaderValue $response 'X-SSR-Document-Cache'
      ssrFallback = Get-HeaderValue $response 'X-SSR-Fallback'
      ssrFallbackLevel = Get-HeaderValue $response 'X-SSR-Fallback-Level'
      ssrLifecycle = Get-HeaderValue $response 'X-SSR-Lifecycle'
      valueScore = Get-HeaderValue $response 'X-SSR-Value-Score'
      valueBand = Get-HeaderValue $response 'X-SSR-Value-Band'
      indexabilityGate = Get-HeaderValue $response 'X-SSR-Indexability-Gate'
      valueSignals = Get-HeaderValue $response 'X-SSR-Value-Signals'
      valueMissing = Get-HeaderValue $response 'X-SSR-Value-Missing'
    }
  }
}

function Get-JsonValue {
  param([string]$Url)
  $page = Get-HttpSnapshot -Url $Url -UserAgent $profiles[0].userAgent -Json $true
  if ($page.status -lt 200 -or $page.status -ge 300 -or [string]::IsNullOrWhiteSpace($page.body)) { return $null }
  try { return $page.body | ConvertFrom-Json } catch { return $null }
}

function Normalize-Url {
  param([string]$Url)
  if ([string]::IsNullOrWhiteSpace($Url)) { return '' }
  try { return ([Uri]$Url).AbsoluteUri.TrimEnd('/').ToLowerInvariant() } catch { return $Url.TrimEnd('/').ToLowerInvariant() }
}

function Get-CanonicalSlug {
  param([object]$Row)
  $candidates = @()
  foreach ($property in @('canonicalSlug', 'externalMatchKey', 'slug', 'url')) {
    if ($null -ne $Row -and $null -ne $Row.$property) { $candidates += [string]$Row.$property }
  }
  foreach ($candidate in $candidates) {
    $value = ($candidate -split '[?#]')[0].TrimEnd('/')
    $value = ($value -split '/')[-1]
    if ($value -match '(?i)-match-updates-[A-Za-z0-9]+$' -and $value -match '(?i)-vs-') { return $value }
  }
  return ''
}

function Get-SitemapInventory {
  $index = Get-HttpSnapshot -Url "$base/sitemap.xml" -UserAgent $profiles[0].userAgent
  $shards = @()
  $locations = @()
  if ($index.status -eq 200 -and $index.body) {
    try {
      $xml = [xml]$index.body
      $namespace = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
      $namespace.AddNamespace('sm', 'http://www.sitemaps.org/schemas/sitemap/0.9')
      $locations = @($xml.SelectNodes('//sm:sitemap/sm:loc', $namespace) | ForEach-Object { [string]$_.InnerText })
      if ($locations.Count -eq 0) { $locations = @($xml.sitemapindex.sitemap | ForEach-Object { [string]$_.loc }) }
    } catch { $locations = @() }
  }
  foreach ($location in $locations) {
    $partition = Get-HttpSnapshot -Url $location -UserAgent $profiles[0].userAgent
    $urls = @()
    if ($partition.status -eq 200 -and $partition.body) {
      try {
        $xml = [xml]$partition.body
        $namespace = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
        $namespace.AddNamespace('sm', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        $urls = @($xml.SelectNodes('//sm:url/sm:loc', $namespace) | ForEach-Object { [string]$_.InnerText })
        if ($urls.Count -eq 0) { $urls = @($xml.urlset.url | ForEach-Object { [string]$_.loc }) }
      } catch { $urls = @() }
    }
    $name = $location.ToLowerInvariant()
    $cohort = if ($name -match 'live') { 'live' } elseif ($name -match 'upcoming') { 'upcoming' } elseif ($name -match 'recent') { 'recent' } elseif ($name -match 'archive') { 'archive' } else { 'other' }
    $shards += [ordered]@{ location = $location; cohort = $cohort; urls = $urls }
  }
  $urlMap = @{}
  foreach ($shard in $shards) {
    foreach ($url in @($shard.urls)) { $urlMap[(Normalize-Url $url)] = $shard }
  }
  return [ordered]@{ indexStatus = $index.status; partitionCount = $shards.Count; shards = $shards; urlMap = $urlMap }
}

function Get-CohortRows {
  $data = Get-JsonValue -Url "$base/api/cricket-data/match-cohorts?includeArchive=false&_ts=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
  $rows = [ordered]@{}
  foreach ($cohort in @('live', 'upcoming', 'recent')) {
    $items = @()
    if ($null -ne $data -and $null -ne $data.$cohort) { $items = @($data.$cohort) }
    $converted = @()
    foreach ($row in $items) {
      $slug = Get-CanonicalSlug $row
      if ($slug) {
        $converted += [ordered]@{
          cohort = $cohort
          slug = $slug
          url = "$base/cric-live/$slug"
          scheduledAt = if ($null -ne $row.scheduledStartTime) { [int64]$row.scheduledStartTime } else { $null }
          updatedAt = if ($null -ne $row.seoContentModifiedAt) { [int64]$row.seoContentModifiedAt } elseif ($null -ne $row.lastStateUpdatedAt) { [int64]$row.lastStateUpdatedAt } else { $null }
        }
      }
    }
    if ($cohort -eq 'recent') {
      $rows[$cohort] = @($converted | Sort-Object @{ Expression = { if ($null -eq $_.updatedAt) { 0 } else { [int64]$_.updatedAt } }; Descending = $true }, slug)
    } else {
      $rows[$cohort] = @($converted | Sort-Object @{ Expression = { if ($null -eq $_.scheduledAt) { [int64]::MaxValue } else { [int64]$_.scheduledAt } } }, slug)
    }
  }
  return $rows
}

function Get-FixedCohort {
  param([object]$CohortRows)
  $manifestDirectory = Split-Path -Parent $ManifestPath
  if ($manifestDirectory -and -not (Test-Path -LiteralPath $manifestDirectory)) { New-Item -ItemType Directory -Path $manifestDirectory -Force | Out-Null }
  if (Test-Path -LiteralPath $ManifestPath) {
    try {
      $existing = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
      if ($existing.definitionVersion -eq $definitionVersion -and $existing.baseUrl -eq $base -and $existing.targets) { return @($existing.targets) }
    } catch { }
  }
  $targets = @()
  foreach ($cohort in @('live', 'upcoming', 'recent')) {
    $targets += @($CohortRows[$cohort] | Select-Object -First $SamplePerCohort)
  }
  $manifest = [ordered]@{
    definitionVersion = $definitionVersion
    createdAtUtc = [DateTime]::UtcNow.ToString('o')
    baseUrl = $base
    selection = [ordered]@{ cohorts = @('live', 'upcoming', 'recent'); samplePerCohort = $SamplePerCohort; selectionOrder = 'live/upcoming/recent; lifecycle date then slug' }
    targets = $targets
  }
  $manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
  return @($targets)
}

function Get-Attribute {
  param([string]$Html, [string]$Name)
  $pattern = '(?i)\b' + [regex]::Escape($Name) + '\s*=\s*["'']([^"'']*)["'']'
  $match = [regex]::Match($Html, $pattern)
  if ($match.Success) { return $match.Groups[1].Value }
  return ''
}

function Get-BodyFingerprint {
  param([string]$Body)
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Body)))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
}

function Get-PageMetrics {
  param([string]$Url, [object]$Page, [string]$Cohort, [bool]$InSitemap)
  $body = [string]$Page.body
  $canonicalMatches = [regex]::Matches($body, '<link\b[^>]*rel=["'']canonical["''][^>]*>', 'IgnoreCase')
  $canonical = if ($canonicalMatches.Count -eq 1) { Get-Attribute $canonicalMatches[0].Value 'href' } else { '' }
  $titleMatch = [regex]::Match($body, '<title[^>]*>([\s\S]*?)</title>', 'IgnoreCase')
  $h1Count = ([regex]::Matches($body, '<h1\b', 'IgnoreCase')).Count
  $robots = Get-Attribute ([regex]::Match($body, '<meta\b[^>]*name=["'']robots["''][^>]*>', 'IgnoreCase')).Value 'content'
  $aeoOpen = [regex]::Match($body, '<section\b[^>]*id=["'']canonical-match-aeo["''][^>]*>', 'IgnoreCase')
  $aeoBlock = [regex]::Match($body, '<section\b[^>]*id=["'']canonical-match-aeo["''][\s\S]*?</section>', 'IgnoreCase')
  $utilityOpen = [regex]::Match($body, '<section\b[^>]*id=["'']canonical-match-utility["''][^>]*>', 'IgnoreCase')
  $withoutCode = [regex]::Replace($body, '<(script|style|noscript)\b[\s\S]*?</\1>', ' ', 'IgnoreCase')
  $visible = [regex]::Replace($withoutCode, '<[^>]+>', ' ')
  $visible = [Net.WebUtility]::HtmlDecode($visible)
  $wordCount = ([regex]::Matches($visible, "(?i)\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b")).Count
  $links = @([regex]::Matches($body, '<a\b[^>]*href=["'']([^"'']+)["'']', 'IgnoreCase') | ForEach-Object { $_.Groups[1].Value })
  $internalLinks = @($links | Where-Object { $_ -match '^(\/|https?:\/\/(www\.)?crickzen\.com\/)' })
  $hubLinks = @($internalLinks | Where-Object { $_ -match '(?i)\/live-score|\/cricket-schedule|\/matches|\/series\/' })
  $lifecycle = if ($aeoOpen.Success) { Get-Attribute $aeoOpen.Value 'data-lifecycle' } else { '' }
  $valueScore = if ($aeoOpen.Success) { Get-Attribute $aeoOpen.Value 'data-value-score' } else { Get-HeaderValue $Page.headers 'X-SSR-Value-Score' }
  $valueBand = if ($aeoOpen.Success) { Get-Attribute $aeoOpen.Value 'data-value-band' } else { Get-HeaderValue $Page.headers 'X-SSR-Value-Band' }
  $gate = if ($aeoOpen.Success) { Get-Attribute $aeoOpen.Value 'data-indexability-gate' } else { Get-HeaderValue $Page.headers 'X-SSR-Indexability-Gate' }
  $signals = if ($aeoOpen.Success) { Get-Attribute $aeoOpen.Value 'data-value-signals' } else { Get-HeaderValue $Page.headers 'X-SSR-Value-Signals' }
  $scorecard = [bool]($body -match '(?i)Verified scorecard summary|data-value-signals="[^"]*scorecard')
  $performers = [bool]($body -match '(?i)Verified match performers|data-value-signals="[^"]*performers')
  $keyEvents = [bool]($body -match '(?i)Verified key events|data-value-signals="[^"]*key-events')
  $selfCanonical = (Normalize-Url $canonical) -eq (Normalize-Url $Url)
  $indexableRobots = $robots -notmatch '(?i)noindex' -and $robots -match '(?i)index'
  $followRobots = $robots -notmatch '(?i)nofollow' -and $robots -match '(?i)follow'
  $placeholder = [bool]($visible -match '(?i)\b(?:Team 1|Team 2|Team A|Team B|TBD vs TBD|0\/0)\b')
  $temporaryCopy = [bool]($visible -match '(?i)temporarily unavailable|temporarily loading|will update with runs|updates will appear shortly|match data is temporarily')
  $unsupportedPrediction = [bool]($visible -match '(?i)\b(?:will win|likely to win|expected to win|prediction)\b')
  $technicalReady = $Page.status -eq 200 -and $canonicalMatches.Count -eq 1 -and $selfCanonical -and $h1Count -eq 1 -and $indexableRobots -and $followRobots -and $aeoOpen.Success -and $lifecycle -and -not $placeholder -and -not $temporaryCopy
  $valueReady = $technicalReady -and $gate -eq 'pass' -and -not $unsupportedPrediction -and (($Cohort -eq 'upcoming' -and $signals -match 'teams' -and $signals -match 'series' -and $signals -match 'schedule') -or ($Cohort -eq 'live' -and $signals -match 'teams' -and $signals -match 'series' -and ($scorecard -or $performers -or $keyEvents -or $signals -match 'score')) -or ($Cohort -eq 'recent' -and $signals -match 'teams' -and $signals -match 'series' -and $signals -match 'result' -and ($scorecard -or $performers -or $keyEvents -or $signals -match 'score')))
  return [ordered]@{
    status = $Page.status
    elapsedMs = $Page.elapsedMs
    decodedBytes = [Text.Encoding]::UTF8.GetByteCount($body)
    visibleWordCount = $wordCount
    bodySha256 = Get-BodyFingerprint $body
    title = if ($titleMatch.Success) { [Net.WebUtility]::HtmlDecode($titleMatch.Groups[1].Value) } else { '' }
    canonical = $canonical
    canonicalCount = $canonicalMatches.Count
    selfCanonical = $selfCanonical
    robots = $robots
    indexableRobots = $indexableRobots
    followRobots = $followRobots
    h1Count = $h1Count
    lifecycle = $lifecycle
    aeoPresent = $aeoOpen.Success
    utilityPresent = $utilityOpen.Success
    valueScore = if ($valueScore) { [int]$valueScore } else { $null }
    valueBand = $valueBand
    indexabilityGate = $gate
    valueSignals = $signals
    scorecard = $scorecard
    performers = $performers
    keyEvents = $keyEvents
    anchorCount = $links.Count
    internalAnchorCount = $internalLinks.Count
    hubLinkCount = $hubLinks.Count
    sitemapMember = $InSitemap
    technicalReady = $technicalReady
    valueReady = $valueReady
    placeholder = $placeholder
    temporaryCopy = $temporaryCopy
    unsupportedPrediction = $unsupportedPrediction
  }
}

function Get-GscObservation {
  param([string]$Url, [object]$Gsc)
  if ($null -eq $Gsc) { return [ordered]@{ state = 'not-measured'; lastCrawlTime = $null; coverageState = $null; referringUrls = @(); googleCanonical = $null; impressions = $null; clicks = $null; position = $null } }
  $inspection = $null
  if ($null -ne $Gsc.urlInspection) {
    $property = $Gsc.urlInspection.PSObject.Properties | Where-Object { (Normalize-Url $_.Name) -eq (Normalize-Url $Url) } | Select-Object -First 1
    if ($null -ne $property) { $inspection = $property.Value }
  }
  $index = if ($null -ne $inspection) { $inspection.indexStatusResult } else { $null }
  $coverage = if ($null -ne $index) { [string]$index.coverageState } else { '' }
  $state = 'unknown'
  if ($coverage -match '(?i)submitted and indexed|url is on google') { $state = 'indexed' }
  elseif ($coverage -match '(?i)crawled.*not indexed') { $state = 'crawled-not-indexed' }
  elseif ($coverage -match '(?i)discovered.*not indexed') { $state = 'discovered-not-indexed' }
  elseif ($coverage -match '(?i)unknown to google') { $state = 'unknown' }
  elseif ($inspection) { $state = 'inspected-not-indexed' }
  $analytics = $null
  if ($null -ne $Gsc.rows -and $null -ne $Gsc.rows.page) {
    $row = $Gsc.rows.page | Where-Object { (Normalize-Url $_.keys[0]) -eq (Normalize-Url $Url) } | Select-Object -First 1
    if ($row) { $analytics = $row }
  }
  return [ordered]@{
    state = $state
    lastCrawlTime = if ($null -ne $index) { [string]$index.lastCrawlTime } else { $null }
    coverageState = $coverage
    referringUrls = if ($null -ne $index -and $index.referringUrls) { @($index.referringUrls) } else { @() }
    googleCanonical = if ($null -ne $index) { [string]$index.googleCanonical } else { $null }
    userCanonical = if ($null -ne $index) { [string]$index.userCanonical } else { $null }
    impressions = if ($analytics) { [double]$analytics.impressions } else { $null }
    clicks = if ($analytics) { [double]$analytics.clicks } else { $null }
    position = if ($analytics) { [double]$analytics.position } else { $null }
  }
}

function Get-PreviousObservation {
  param([string]$Url, [object]$Previous)
  if ($null -eq $Previous -or $null -eq $Previous.pages) { return $null }
  return @($Previous.pages | Where-Object { (Normalize-Url $_.url) -eq (Normalize-Url $Url) } | Select-Object -First 1)[0]
}

$cohortRows = Get-CohortRows
$fixedTargets = Get-FixedCohort $cohortRows
$sitemap = Get-SitemapInventory
$gsc = $null
if ($GscSnapshotPath -and (Test-Path -LiteralPath $GscSnapshotPath)) {
  try { $gsc = Get-Content -LiteralPath $GscSnapshotPath -Raw | ConvertFrom-Json } catch { $gsc = $null }
}
$previous = $null
if ($PreviousReportPath -and (Test-Path -LiteralPath $PreviousReportPath)) {
  try { $previous = Get-Content -LiteralPath $PreviousReportPath -Raw | ConvertFrom-Json } catch { $previous = $null }
}

$pages = @()
foreach ($target in $fixedTargets) {
  $url = [string]$target.url
  $sitemapEntry = $null
  $normalizedUrl = Normalize-Url $url
  if ($sitemap.urlMap.ContainsKey($normalizedUrl)) { $sitemapEntry = $sitemap.urlMap[$normalizedUrl] }
  $profileResults = @()
  foreach ($profile in $profiles) {
    $page = Get-HttpSnapshot -Url $url -UserAgent $profile.userAgent
    $metrics = Get-PageMetrics -Url $url -Page $page -Cohort ([string]$target.cohort) -InSitemap ($null -ne $sitemapEntry)
    $profileResults += [ordered]@{
      profile = $profile.name
      syntheticGooglebot = $profile.name -like 'googlebot-*'
      headers = $page.headers
      error = $page.error
      metrics = $metrics
    }
  }
  $normal = @($profileResults | Where-Object { $_.profile -eq 'normal' })[0]
  $crawlerParity = @($profileResults | Where-Object { $_.profile -like 'googlebot-*' } | ForEach-Object {
    [ordered]@{ profile = $_.profile; sameStatus = $_.metrics.status -eq $normal.metrics.status; sameFingerprint = $_.metrics.bodySha256 -eq $normal.metrics.bodySha256; sameCanonical = $_.metrics.canonical -eq $normal.metrics.canonical }
  })
  $gscObservation = Get-GscObservation -Url $url -Gsc $gsc
  $prior = Get-PreviousObservation -Url $url -Previous $previous
  $pages += [ordered]@{
    url = $url
    slug = $target.slug
    cohort = $target.cohort
    sitemapShard = if ($sitemapEntry) { $sitemapEntry.location } else { $null }
    sitemapCohort = if ($sitemapEntry) { $sitemapEntry.cohort } else { $null }
    crawlReceipt = if ($gscObservation.lastCrawlTime) { 'gsc-last-crawl' } else { 'pending-gsc-inspection' }
    gsc = $gscObservation
    previous = if ($prior) { [ordered]@{ checkedAtUtc = $previous.checkedAtUtc; bodySha256 = $prior.normal.metrics.bodySha256; gscState = $prior.gsc.state; impressions = $prior.gsc.impressions; fingerprintChanged = $prior.normal.metrics.bodySha256 -ne $normal.metrics.bodySha256 } } else { $null }
    profiles = $profileResults
    crawlerParity = $crawlerParity
    normal = $normal
  }
}

$summaryByCohort = [ordered]@{}
foreach ($cohort in @('live', 'upcoming', 'recent')) {
  $cohortPages = @($pages | Where-Object { $_.cohort -eq $cohort })
  $normalPages = @($cohortPages | ForEach-Object { $_.normal })
  $summaryByCohort[$cohort] = [ordered]@{
    sampleCount = $cohortPages.Count
    sitemapCount = @($normalPages | Where-Object { $_.metrics.sitemapMember }).Count
    technicalReadyCount = @($normalPages | Where-Object { $_.metrics.technicalReady }).Count
    valueReadyCount = @($normalPages | Where-Object { $_.metrics.valueReady }).Count
    valueHoldCount = @($normalPages | Where-Object { -not $_.metrics.valueReady }).Count
    indexedCount = @($cohortPages | Where-Object { $_.gsc.state -eq 'indexed' }).Count
    discoveredNotIndexedCount = @($cohortPages | Where-Object { $_.gsc.state -eq 'discovered-not-indexed' }).Count
    crawledNotIndexedCount = @($cohortPages | Where-Object { $_.gsc.state -eq 'crawled-not-indexed' }).Count
    unknownGscCount = @($cohortPages | Where-Object { $_.gsc.state -in @('unknown', 'not-measured') }).Count
    averageVisibleWordCount = if ($normalPages.Count) { [math]::Round((($normalPages | ForEach-Object { [double]$_.metrics.visibleWordCount } | Measure-Object -Average).Average), 1) } else { 0 }
    averageValueScore = if (@($normalPages | Where-Object { $null -ne $_.metrics.valueScore }).Count) { [math]::Round((($normalPages | Where-Object { $null -ne $_.metrics.valueScore } | ForEach-Object { [double]$_.metrics.valueScore } | Measure-Object -Average).Average), 1) } else { $null }
  }
}

$timestamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
if (-not (Test-Path -LiteralPath $OutputDirectory)) { New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null }
$outputPath = Join-Path $OutputDirectory "match-cohort-$timestamp.json"
$report = [ordered]@{
  definitionVersion = $definitionVersion
  checkedAtUtc = [DateTime]::UtcNow.ToString('o')
  baseUrl = $base
  architectureDecision = 'SSR-canonical-snapshot; no bot-specific sidecar'
  measurementContract = [ordered]@{
    technicalReady = 'HTTP 200, one self-canonical URL, index/follow, one H1, lifecycle answer, no placeholders or temporary copy'
    upcomingValueReady = 'teams + series + future schedule; no unsupported prediction copy'
    liveValueReady = 'teams + series + verified score or scorecard; record scorecard, performer, or key-event evidence when available'
    recentValueReady = 'verified result plus score, scorecard, performer, or key-event evidence when available'
    discovery = 'sitemap membership and server-rendered hub-link count; neither is proof of Google indexing'
    googleState = 'URL Inspection state when -GscSnapshotPath is supplied; otherwise not-measured'
    crawlReceipt = 'GSC lastCrawlTime when available; otherwise pending-gsc-inspection'
    continuedCrawl = 'compare GSC last crawl, referring URLs, body fingerprint, impressions and clicks at T+24-72h'
    valueScoreBoundary = 'internal heuristic for cohort comparison, not a Google ranking score'
  }
  fixedCohortManifest = $ManifestPath
  sitemap = [ordered]@{ indexStatus = $sitemap.indexStatus; partitionCount = $sitemap.partitionCount; totalUrlCount = @($sitemap.urlMap.Keys).Count; matchUrlCount = @($sitemap.urlMap.Keys | Where-Object { $_ -match '/cric-live/' }).Count }
  cohortSummary = $summaryByCohort
  pages = $pages
  nextCheck = [ordered]@{ earliestUtc = [DateTime]::UtcNow.AddHours(24).ToString('o'); latestUtc = [DateTime]::UtcNow.AddHours(72).ToString('o'); requiredInputs = @('same fixed-cohort manifest', 'fresh GSC URL Inspection snapshot', 'Search Analytics page rows', 'same three user-agent HTML probes') }
  claimBoundary = 'This report measures server-rendered value, discovery surfaces, and supplied GSC observations. It does not infer indexing or ranking from sitemap submission, HTTP 200, or bot parity alone.'
}
$report | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $outputPath -Encoding UTF8
Write-Output ([ordered]@{ report = $outputPath; manifest = $ManifestPath; cohortSummary = $summaryByCohort } | ConvertTo-Json -Depth 10)
