param(
  [string]$SiteUrl = 'https://www.crickzen.com',
  [int]$MaxModelAgeMinutes = 5,
  [int]$MaxOpeningArtifactAgeHours = 24,
  [switch]$FailWhenNotReady,
  [int]$TimeoutSeconds = 30
)

$ErrorActionPreference = 'Stop'

function Get-Entries {
  param($Response)

  if ($Response -is [System.Array]) {
    return @($Response)
  }

  if ($null -ne $Response.data) {
    return @($Response.data)
  }

  return @()
}

function Get-MatchSlug {
  param($Match)

  if ($Match.externalMatchKey) {
    return [string]$Match.externalMatchKey
  }

  if ($Match.url) {
    return ([string]$Match.url -replace '^.*/', '')
  }

  return ''
}

function Test-SupportedFormat {
  param($Match)

  $value = @($Match.matchFormat, $Match.seriesName, $Match.url) -join ' '
  return $value -match '(?i)\bt20\b|hundred|\bodi\b|one.day|cwc.league|world.cup'
}

function Get-FirstSupportedMatch {
  param($Matches)

  return @($Matches | Where-Object { (Get-MatchSlug $_) -and (Test-SupportedFormat $_) }) | Select-Object -First 1
}

function Get-UpcomingCohortMatch {
  param($Matches, $PublicMatches)

  $supported = @($Matches | Where-Object { (Get-MatchSlug $_) -and (Test-SupportedFormat $_) })
  # The opening model is intentionally selective.  Prefer an exact upcoming
  # source identity with a real public opening row so an unrelated uncovered
  # domestic fixture cannot hide a ready controlled-cohort sample.  Keep the
  # normal first-supported fallback to make an empty public feed observable.
  $ready = @($supported | Where-Object {
    $sourceUrl = ([string]$_.url).TrimEnd('/')
    $sourceUrl -and @($PublicMatches | Where-Object {
      ([string]$_.match_url).TrimEnd('/') -ieq $sourceUrl -and
      ([string]$_.status).Trim().ToLowerInvariant() -eq 'upcoming' -and
      $null -ne $_.win_probability_pct
    }).Count -gt 0
  })
  return @($ready | Sort-Object scheduledStartTime | Select-Object -First 1) +
    @($supported | Select-Object -First 1) | Select-Object -First 1
}

function Get-HeaderValue {
  param($Response, [string]$Name)

  return [string]$Response.Headers[$Name]
}

function Convert-ProviderTimestampToUtc {
  param([string]$Timestamp)

  $value = [string]$Timestamp
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $null
  }

  # The live-model writer historically used UTC wall-clock values without a
  # suffix. Interpret that legacy form consistently as UTC instead of letting
  # the operator workstation's locale make a current model look stale.
  if ($value -notmatch '(?i)(Z|[+-]\d{2}:?\d{2})$') {
    $value += 'Z'
  }

  return [DateTimeOffset]::Parse($value).ToUniversalTime()
}

function Test-CanonicalDocument {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSeconds
    $html = [string]$response.Content
    # SEO eligibility requires an answer visible in the server-rendered body,
    # not a phrase that happens to appear in CSS, a script bundle, or metadata.
    $visibleHtml = [regex]::Replace($html, '(?is)<(script|style)[^>]*>.*?</\1>', ' ')
    $visibleText = [System.Net.WebUtility]::HtmlDecode([regex]::Replace($visibleHtml, '(?is)<[^>]+>', ' ')) -replace '\s+', ' '
    $expectedCanonical = $Url.TrimEnd('/')
    $canonical = [regex]::Match($html, '<link[^>]+rel=["'']canonical["''][^>]+href=["'']([^"'']+)', 'IgnoreCase').Groups[1].Value.TrimEnd('/')

    return [pscustomobject]@{
      Status = [int]$response.StatusCode
      SelfCanonical = $canonical -eq $expectedCanonical
      Indexable = $html -match '(?i)<meta[^>]+name=["'']robots["''][^>]+content=["'']index,follow'
      H1Count = ([regex]::Matches($html, '<h1[ >]', 'IgnoreCase')).Count
      JsonLdCount = ([regex]::Matches($html, 'application/ld\+json', 'IgnoreCase')).Count
      HasSsrWinProbability = $visibleText -match '(?i)win probability|winning percentage'
      HasStaleUpcomingScore = $visibleText -match '(?i)\bUpcoming\b.{0,160}\b0\s*/\s*0\b'
    }
  } catch {
    return [pscustomobject]@{
      Status = $null
      SelfCanonical = $false
      Indexable = $false
      H1Count = 0
      JsonLdCount = 0
      HasSsrWinProbability = $false
      HasStaleUpcomingScore = $false
    }
  }
}

$base = $SiteUrl.TrimEnd('/')
$lifecycleEndpoints = [ordered]@{
  upcoming = "$base/api/cricket-data/upcoming-matches"
  live = "$base/api/cricket-data/live-matches"
  completed = "$base/api/cricket-data/completed-matches"
}

$catalogues = @{}
foreach ($lifecycle in $lifecycleEndpoints.Keys) {
  $catalogues[$lifecycle] = Get-Entries (Invoke-RestMethod -Uri $lifecycleEndpoints[$lifecycle] -TimeoutSec $TimeoutSeconds)
}

$publicPayload = Invoke-RestMethod -Uri "$base/prediction-api/api/public/matches" -TimeoutSec $TimeoutSeconds
$publicMatches = @($publicPayload.matches)
$now = [DateTimeOffset]::UtcNow
$results = @()

foreach ($lifecycle in $lifecycleEndpoints.Keys) {
  $candidatePool = @($catalogues[$lifecycle])
  if ($lifecycle -eq 'completed') {
    # An abandoned fixture does not yet prove the retained-result and turning-point
    # contract required by the completed-match cohort.
    $candidatePool = @($candidatePool | Where-Object { [string]$_.status -eq 'COMPLETED' })
  }
  $match = if ($lifecycle -eq 'upcoming') {
    Get-UpcomingCohortMatch $candidatePool $publicMatches
  } else {
    Get-FirstSupportedMatch $candidatePool
  }
  if (-not $match) {
    $results += [pscustomobject]@{
      Lifecycle = $lifecycle
      Slug = ''
      CanonicalUrl = ''
      CatalogueState = 'NO_SUPPORTED_CANDIDATE'
      ModelRow = $false
      ModelUpdatedAt = ''
      ModelFresh = $false
      CanonicalReady = $false
      HasSsrWinProbability = $false
      Eligible = $false
      Blocker = 'No supported-format lifecycle candidate in production catalogue'
    }
    continue
  }

  $slug = Get-MatchSlug $match
  $sourceUrl = [string]$match.url
  $canonicalUrl = "$base/cric-live/$slug"
  $publicRow = @($publicMatches | Where-Object {
    ([string]$_.match_url).TrimEnd('/') -ieq $sourceUrl.TrimEnd('/')
  }) | Select-Object -First 1
  if ($null -eq $publicRow -and $sourceUrl) {
    # The live list is deliberately small. Completed records are retained as
    # source-addressable replay details, so resolve by the canonical CREX URL
    # before declaring an exact lifecycle row missing.
    try {
      $resolved = Invoke-RestMethod -Uri ("$base/prediction-api/api/public/matches/resolve?match_url=" + [uri]::EscapeDataString($sourceUrl)) -TimeoutSec $TimeoutSeconds
      $publicRow = $resolved.match
    } catch {
      $publicRow = $null
    }
  }
  $modelUpdatedAt = if ($publicRow.updated_at) { [string]$publicRow.updated_at } else { '' }
  $modelFresh = $false
  if ($modelUpdatedAt) {
    try {
      $age = $now - (Convert-ProviderTimestampToUtc $modelUpdatedAt)
      # An opening row's timestamp is the versioned artifact generation time,
      # not a live score update.  Apply the artifact's explicit 24-hour TTL
      # while retaining the five-minute service-level freshness gate for live.
      $maxAgeMinutes = if ($lifecycle -eq 'upcoming') { $MaxOpeningArtifactAgeHours * 60 } else { $MaxModelAgeMinutes }
      $modelFresh = $age.TotalMinutes -ge 0 -and $age.TotalMinutes -le $maxAgeMinutes
    } catch {
      $modelFresh = $false
    }
  }

  $modelLifecycleReady = $false
  if ($null -ne $publicRow) {
    if ($lifecycle -eq 'completed') {
      # Retained completed evidence is historic by definition. Require a
      # final probability plus enough history to support a turning-point view,
      # rather than incorrectly applying the five-minute live freshness rule.
      $modelLifecycleReady = $null -ne $publicRow.win_probability_pct -and @($publicRow.prediction_history).Count -ge 2
    } else {
      $modelLifecycleReady = $modelFresh -and $null -ne $publicRow.win_probability_pct
    }
  }

  $document = Test-CanonicalDocument $canonicalUrl
  $canonicalReady = $document.Status -eq 200 -and $document.SelfCanonical -and $document.Indexable -and $document.H1Count -eq 1
  $hasLifecycleConflict = $lifecycle -eq 'completed' -and $document.HasStaleUpcomingScore
  $eligible = $canonicalReady -and $modelLifecycleReady -and $document.HasSsrWinProbability -and -not $hasLifecycleConflict
  $blockers = @()
  if (-not $canonicalReady) { $blockers += 'Canonical SSR contract failed' }
  if ($null -eq $publicRow) { $blockers += 'No exact public-model row' }
  elseif (-not $modelLifecycleReady) {
    if ($lifecycle -eq 'completed') { $blockers += 'Completed model row lacks final probability or retained history' }
    elseif ($lifecycle -eq 'upcoming') { $blockers += "Opening artifact is older than $MaxOpeningArtifactAgeHours hours or has no probability" }
    else { $blockers += "Public-model row is older than $MaxModelAgeMinutes minutes or has no probability" }
  }
  if (-not $document.HasSsrWinProbability) { $blockers += 'SSR intelligence not implemented yet' }
  if ($hasLifecycleConflict) { $blockers += 'Canonical SSR still exposes a stale upcoming 0/0 state' }

  $results += [pscustomobject]@{
    Lifecycle = $lifecycle
    Slug = $slug
    CanonicalUrl = $canonicalUrl
    CatalogueState = [string]$match.status
    ModelRow = $null -ne $publicRow
    ModelUpdatedAt = $modelUpdatedAt
    ModelFresh = $modelFresh
    ModelLifecycleReady = $modelLifecycleReady
    CanonicalReady = $canonicalReady
    HasSsrWinProbability = $document.HasSsrWinProbability
    HasStaleUpcomingScore = $document.HasStaleUpcomingScore
    Eligible = $eligible
    Blocker = $blockers -join '; '
  }
}

$results | Format-Table Lifecycle, CatalogueState, ModelRow, ModelFresh, ModelLifecycleReady, CanonicalReady, HasSsrWinProbability, HasStaleUpcomingScore, Eligible, Slug, Blocker -AutoSize | Out-String -Width 320 | Write-Output

if ($FailWhenNotReady -and @($results | Where-Object { -not $_.Eligible }).Count -gt 0) {
  throw 'Controlled SEO cohort is not ready. See lifecycle rows above.'
}
