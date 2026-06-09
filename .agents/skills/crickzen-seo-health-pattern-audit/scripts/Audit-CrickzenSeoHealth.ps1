[CmdletBinding()]
param(
  [string]$BaseUrl = "https://www.crickzen.com",
  [int]$RepeatedRouteAttempts = 5,
  [int]$MatchSampleSize = 30,
  [int]$RequestTimeoutSeconds = 60,
  [string]$OutputDirectory = "artifacts/seo-health"
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd("/")

function Get-PageAudit {
  param([string]$Url)

  $stopwatch = [Diagnostics.Stopwatch]::StartNew()
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $RequestTimeoutSeconds
    $html = [string]$response.Content
    $stopwatch.Stop()
    return [pscustomobject]@{
      url = $Url
      status = [int]$response.StatusCode
      elapsedMs = $stopwatch.ElapsedMilliseconds
      bytes = $html.Length
      canonicalCount = ([regex]::Matches($html, 'rel=["'']canonical["'']', "IgnoreCase")).Count
      title = Get-FirstHtmlValue $html '<title[^>]*>([\s\S]*?)</title>'
      description = Get-FirstHtmlValue $html '<meta[^>]+name=["'']description["''][^>]+content=["'']([^"'']*)["'']'
      h1Count = ([regex]::Matches($html, '<h1\b', "IgnoreCase")).Count
      jsonLdCount = ([regex]::Matches($html, 'application/ld\+json', "IgnoreCase")).Count
      noindexCount = ([regex]::Matches($html, 'noindex', "IgnoreCase")).Count
      matchLinkCount = ([regex]::Matches($html, 'href=["''](?:https://www\.crickzen\.com)?/cric-live/', "IgnoreCase")).Count
    }
  } catch {
    $stopwatch.Stop()
    $status = -1
    $html = ""
    if ($_.Exception.Response) {
      try {
        $status = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $html = $reader.ReadToEnd()
          $reader.Dispose()
        }
      } catch {
        $html = ""
      }
    }
    return [pscustomobject]@{
      url = $Url
      status = $status
      elapsedMs = $stopwatch.ElapsedMilliseconds
      bytes = $html.Length
      canonicalCount = ([regex]::Matches($html, 'rel=["'']canonical["'']', "IgnoreCase")).Count
      title = Get-FirstHtmlValue $html '<title[^>]*>([\s\S]*?)</title>'
      description = Get-FirstHtmlValue $html '<meta[^>]+name=["'']description["''][^>]+content=["'']([^"'']*)["'']'
      h1Count = ([regex]::Matches($html, '<h1\b', "IgnoreCase")).Count
      jsonLdCount = ([regex]::Matches($html, 'application/ld\+json', "IgnoreCase")).Count
      noindexCount = ([regex]::Matches($html, 'noindex', "IgnoreCase")).Count
      matchLinkCount = ([regex]::Matches($html, 'href=["''](?:https://www\.crickzen\.com)?/cric-live/', "IgnoreCase")).Count
      error = $_.Exception.Message
    }
  }
}

function Get-FirstHtmlValue {
  param(
    [string]$Html,
    [string]$Pattern
  )

  $match = [regex]::Match($Html, $Pattern, "IgnoreCase")
  if ($match.Success -and $match.Groups.Count -gt 1) {
    return [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value.Trim())
  }
  return ""
}

function Get-SitemapUrls {
  $indexResponse = Invoke-WebRequest -Uri "$base/sitemap.xml" -UseBasicParsing -TimeoutSec $RequestTimeoutSeconds
  $indexXml = [xml]$indexResponse.Content
  $urls = @()
  foreach ($location in @($indexXml.sitemapindex.sitemap.loc)) {
    $partition = Invoke-WebRequest -Uri $location -UseBasicParsing -TimeoutSec $RequestTimeoutSeconds
    $partitionXml = [xml]$partition.Content
    $urls += @($partitionXml.urlset.url.loc)
  }
  return [pscustomobject]@{
    partitionCount = @($indexXml.sitemapindex.sitemap).Count
    urls = $urls
  }
}

$endpointPaths = @(
  "/robots.txt",
  "/sitemap.xml",
  "/api/v1/seo/indexing/status",
  "/api/ws/info",
  "/this-page-should-not-exist"
)
$endpointAudits = @($endpointPaths | ForEach-Object { Get-PageAudit "$base$_" })

$sitemap = Get-SitemapUrls
$allUrls = @($sitemap.urls)
$uniqueUrls = @($allUrls | Sort-Object -Unique)
$duplicateGroups = @($allUrls | Group-Object | Where-Object Count -gt 1 | ForEach-Object {
  [pscustomobject]@{ url = $_.Name; count = $_.Count }
})
$matchUrls = @($uniqueUrls | Where-Object { $_ -match "/cric-live/" })
$knownInvalidStaticUrls = @($uniqueUrls | Where-Object { $_ -eq "$base/blog" })

$discoveryAudits = @()
foreach ($path in @("/", "/matches", "/live-cricket-score")) {
  foreach ($attempt in 1..$RepeatedRouteAttempts) {
    $audit = Get-PageAudit "$base$path"
    $audit | Add-Member -NotePropertyName attempt -NotePropertyValue $attempt
    $discoveryAudits += $audit
  }
}

$matchAudits = @()
if ($matchUrls.Count -gt 0) {
  $step = [math]::Max(1, [math]::Floor($matchUrls.Count / [math]::Max(1, $MatchSampleSize)))
  $selected = @()
  for ($index = 0; $index -lt $matchUrls.Count -and $selected.Count -lt $MatchSampleSize; $index += $step) {
    $selected += $matchUrls[$index]
  }
  $matchAudits = @($selected | ForEach-Object { Get-PageAudit $_ })
}

$failures = @()
$failures += @($endpointAudits | Where-Object {
  ($_.url -match "this-page-should-not-exist" -and $_.status -ne 404) -or
  ($_.url -notmatch "this-page-should-not-exist" -and $_.status -ne 200)
} | ForEach-Object { "Endpoint status failure: $($_.url) returned $($_.status)" })
$failures += @($discoveryAudits | Where-Object {
  $_.status -ne 200 -or $_.h1Count -ne 1 -or $_.matchLinkCount -lt 1
} | ForEach-Object {
  "Discovery SSR failure: $($_.url) attempt $($_.attempt), status=$($_.status), bytes=$($_.bytes), h1=$($_.h1Count), matchLinks=$($_.matchLinkCount)"
})
$failures += @($matchAudits | Where-Object {
  $_.status -ne 200 -or $_.canonicalCount -ne 1 -or $_.h1Count -ne 1 -or $_.jsonLdCount -lt 1 -or $_.noindexCount -gt 0
} | ForEach-Object {
  "Match SEO failure: $($_.url), status=$($_.status), canonical=$($_.canonicalCount), h1=$($_.h1Count), jsonLd=$($_.jsonLdCount), noindex=$($_.noindexCount)"
})
if ($duplicateGroups.Count -gt 0) { $failures += "Sitemap contains $($duplicateGroups.Count) duplicated canonical locations." }
if ($knownInvalidStaticUrls.Count -gt 0) { $failures += "Sitemap contains known invalid static URLs: $($knownInvalidStaticUrls -join ', ')" }

$patterns = @()
if (@($discoveryAudits | Where-Object { $_.bytes -lt 20000 -or $_.h1Count -eq 0 }).Count -gt 0) {
  $patterns += "SSR_SHELL_FALLBACK: repeated discovery-page responses include thin or missing-H1 HTML."
}
if (@($discoveryAudits | Where-Object { $_.elapsedMs -ge 7000 }).Count -gt 0) {
  $patterns += "SSR_TIMEOUT_HEADROOM: at least one discovery-page render took 7 seconds or more against the 8-second fallback threshold."
}
if (@($discoveryAudits | Where-Object { $_.canonicalCount -eq 0 }).Count -gt 0) {
  $patterns += "DISCOVERY_CANONICAL_GAP: at least one discovery surface rendered without a canonical tag."
}
$discoveryTitleGroups = @($discoveryAudits | Where-Object { $_.title } | Group-Object title | Where-Object Count -gt $RepeatedRouteAttempts)
if ($discoveryTitleGroups.Count -gt 0) {
  $patterns += "DISCOVERY_DUPLICATE_TITLE: multiple discovery routes share the same title."
}
$discoveryDescriptionGroups = @($discoveryAudits | Where-Object { $_.description } | Group-Object description | Where-Object Count -gt $RepeatedRouteAttempts)
if ($discoveryDescriptionGroups.Count -gt 0) {
  $patterns += "DISCOVERY_DUPLICATE_DESCRIPTION: multiple discovery routes share the same meta description."
}
if ($duplicateGroups.Count -gt 0) {
  $patterns += "SITEMAP_DUPLICATION: canonical locations repeat across sitemap output."
}
if ($knownInvalidStaticUrls.Count -gt 0) {
  $patterns += "SITEMAP_4XX_RISK: known unrouted static URL is present."
}
$maxDiscoveryLinks = @($discoveryAudits | Measure-Object -Property matchLinkCount -Maximum).Maximum
if ($matchUrls.Count -gt 0 -and $maxDiscoveryLinks -gt 0 -and $matchUrls.Count -gt ($maxDiscoveryLinks * 20)) {
  $patterns += "ORPHAN_GRAPH_GAP: sitemap match count ($($matchUrls.Count)) greatly exceeds maximum direct discovery links ($maxDiscoveryLinks)."
}
if (@($matchAudits | Where-Object { $_.h1Count -eq 0 -and $_.canonicalCount -eq 0 -and $_.jsonLdCount -eq 0 }).Count -gt 1) {
  $patterns += "THIN_MATCH_FAMILY: multiple sampled match pages share missing H1, canonical, and JSON-LD."
}

$report = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  baseUrl = $base
  configuration = [ordered]@{
    repeatedRouteAttempts = $RepeatedRouteAttempts
    matchSampleSize = $MatchSampleSize
    requestTimeoutSeconds = $RequestTimeoutSeconds
  }
  summary = [ordered]@{
    sitemapPartitions = $sitemap.partitionCount
    sitemapTotal = $allUrls.Count
    sitemapUnique = $uniqueUrls.Count
    sitemapDuplicates = $allUrls.Count - $uniqueUrls.Count
    sitemapMatchUrls = $matchUrls.Count
    maxDiscoveryMatchLinks = $maxDiscoveryLinks
    failures = $failures.Count
  }
  patterns = $patterns
  failures = $failures
  duplicateUrls = $duplicateGroups
  knownInvalidStaticUrls = $knownInvalidStaticUrls
  endpoints = $endpointAudits
  discoveryPages = $discoveryAudits
  sampledMatchPages = $matchAudits
}

$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$outputPath = Join-Path $resolvedOutput "crickzen-seo-health-$stamp.json"
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outputPath -Encoding UTF8

$report.summary | Format-List
if ($patterns.Count -gt 0) {
  "Patterns:"
  $patterns | ForEach-Object { "- $_" }
}
if ($failures.Count -gt 0) {
  "Failures:"
  $failures | ForEach-Object { "- $_" }
}
"Report: $outputPath"

if ($failures.Count -gt 0) {
  exit 2
}
