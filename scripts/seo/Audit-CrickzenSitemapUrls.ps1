[CmdletBinding()]
param(
  [string]$BaseUrl = "https://www.crickzen.com",
  [int]$TimeoutSeconds = 30,
  [int]$Retries = 2,
  [string]$OutputDirectory = "artifacts/seo-sitemap-audit"
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd("/")

function Get-TextValue {
  param([string]$Html, [string]$Pattern)
  $match = [regex]::Match($Html, $Pattern, "IgnoreCase")
  if ($match.Success -and $match.Groups.Count -gt 1) {
    return [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value.Trim())
  }
  return ""
}

function Get-SitemapLocations {
  param([string]$IndexUrl)
  $response = Invoke-WebRequest -Uri $IndexUrl -UseBasicParsing -TimeoutSec $TimeoutSeconds
  $xml = [xml]$response.Content
  $locations = @()
  foreach ($location in @($xml.sitemapindex.sitemap.loc)) {
    $locations += [string]$location
  }
  return $locations
}

function Get-UrlLocations {
  param([string]$SitemapUrl)
  $response = Invoke-WebRequest -Uri $SitemapUrl -UseBasicParsing -TimeoutSec $TimeoutSeconds
  $xml = [xml]$response.Content
  $locations = @()
  foreach ($location in @($xml.urlset.url.loc)) {
    $locations += [string]$location
  }
  return $locations
}

function Get-RouteFamily {
  param([string]$Url)
  if ($Url -notmatch "/cric-live/") { return "static" }
  if ($Url -match "-match-updates-[A-Za-z0-9]+(?:/)?$") { return "match-pregen" }
  return "match-bare"
}

function Test-PlaceholderSlug {
  param([string]$Url)
  $match = [regex]::Match($Url, "/cric-live/([^/?#]+)", "IgnoreCase")
  if (-not $match.Success) { return $false }
  $slug = $match.Groups[1].Value.ToLowerInvariant()
  return $slug -match "^(null|undefined|tbd|tba|unknown|team-(1|2|a|b))?-vs-" -or
    $slug -match "-vs-(null|undefined|tbd|tba|unknown|team-(1|2|a|b))(?:-|$)"
}

function Invoke-UrlAudit {
  param([string]$Url)
  $lastError = ""
  for ($attempt = 1; $attempt -le ($Retries + 1); $attempt++) {
    $watch = [Diagnostics.Stopwatch]::StartNew()
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSeconds -MaximumRedirection 5
      $watch.Stop()
      $html = [string]$response.Content
      return [pscustomobject]@{
        url = $Url
        routeFamily = Get-RouteFamily $Url
        placeholder = Test-PlaceholderSlug $Url
        status = [int]$response.StatusCode
        elapsedMs = $watch.ElapsedMilliseconds
        finalUrl = [string]$response.BaseResponse.ResponseUri.AbsoluteUri
        canonical = Get-TextValue $html '<link[^>]+rel=["'']canonical["''][^>]+href=["'']([^"'']+)' 
        robots = Get-TextValue $html '<meta[^>]+name=["'']robots["''][^>]+content=["'']([^"'']+)'
        h1Count = ([regex]::Matches($html, '<h1\b', "IgnoreCase")).Count
        jsonLdCount = ([regex]::Matches($html, 'application/ld\+json', "IgnoreCase")).Count
        attempt = $attempt
        error = ""
      }
    } catch {
      $watch.Stop()
      $lastError = $_.Exception.Message
      $status = -1
      if ($_.Exception.Response) {
        try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = -1 }
      }
      if ($attempt -gt $Retries) {
        return [pscustomobject]@{
          url = $Url
          routeFamily = Get-RouteFamily $Url
          placeholder = Test-PlaceholderSlug $Url
          status = $status
          elapsedMs = $watch.ElapsedMilliseconds
          finalUrl = $Url
          canonical = ""
          robots = ""
          h1Count = 0
          jsonLdCount = 0
          attempt = $attempt
          error = $lastError
        }
      }
    }
  }
}

$sitemapUrls = Get-SitemapLocations "$base/sitemap.xml"
$allUrls = @()
foreach ($sitemapUrl in $sitemapUrls) {
  $allUrls += Get-UrlLocations $sitemapUrl
}
$uniqueUrls = @($allUrls | Sort-Object -Unique)
$results = @()
foreach ($url in $uniqueUrls) {
  $results += Invoke-UrlAudit $url
}

$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$csvPath = Join-Path $resolvedOutput "sitemap-url-status-$stamp.csv"
$jsonPath = Join-Path $resolvedOutput "sitemap-url-status-$stamp.json"
$results | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8

$summary = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  baseUrl = $base
  sitemapPartitions = $sitemapUrls.Count
  sitemapUrlCount = $allUrls.Count
  uniqueUrlCount = $uniqueUrls.Count
  statusCounts = [ordered]@{}
  familyCounts = [ordered]@{}
  placeholderUrls = @($results | Where-Object placeholder | Select-Object -ExpandProperty url)
  unexpectedFailures = @($results | Where-Object { $_.status -lt 200 -or $_.status -ge 400 } | Select-Object url, status, routeFamily, error)
  slowUrls = @($results | Where-Object { $_.elapsedMs -ge 5000 } | Select-Object url, status, elapsedMs, routeFamily)
  csv = $csvPath
}
foreach ($group in @($results | Group-Object status)) { $summary.statusCounts[[string]$group.Name] = $group.Count }
foreach ($group in @($results | Group-Object routeFamily)) { $summary.familyCounts[[string]$group.Name] = $group.Count }
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$summary | ConvertTo-Json -Depth 8
"Report: $jsonPath"
if ($summary.unexpectedFailures.Count -gt 0 -or $summary.placeholderUrls.Count -gt 0) { exit 2 }
