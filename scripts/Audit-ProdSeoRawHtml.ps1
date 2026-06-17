param(
  [string]$BaseUrl = "https://www.crickzen.com",
  [string]$MatchSlug = "",
  [int]$TimeoutSec = 35
)

$ErrorActionPreference = "Stop"

function Join-Url {
  param([string]$Base, [string]$Path)
  return $Base.TrimEnd("/") + "/" + $Path.TrimStart("/")
}

function Get-FirstMatch {
  param([string]$Html, [string]$Pattern)
  $match = [regex]::Match($Html, $Pattern, "IgnoreCase,Singleline")
  if ($match.Success -and $match.Groups.Count -gt 1) {
    return ($match.Groups[1].Value -replace "\s+", " ").Trim()
  }
  return ""
}

function Get-RawHtmlAudit {
  param(
    [string]$Url,
    [string]$Kind
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -Headers @{
      "User-Agent" = "Googlebot/2.1 (+http://www.google.com/bot.html)"
    }
    $html = [string]$response.Content

    $title = Get-FirstMatch $html "<title[^>]*>(.*?)</title>"
    $description = Get-FirstMatch $html "<meta[^>]+name=[`"']description[`"'][^>]+content=[`"']([^`"']*)[`"']"
    if (-not $description) {
      $description = Get-FirstMatch $html "<meta[^>]+content=[`"']([^`"']*)[`"'][^>]+name=[`"']description[`"']"
    }

    $canonical = Get-FirstMatch $html "<link[^>]+rel=[`"']canonical[`"'][^>]+href=[`"']([^`"']+)['`"]"
    if (-not $canonical) {
      $canonical = Get-FirstMatch $html "<link[^>]+href=[`"']([^`"']+)['`"][^>]+rel=[`"']canonical[`"']"
    }

    $robots = Get-FirstMatch $html "<meta[^>]+name=[`"']robots[`"'][^>]+content=[`"']([^`"']*)[`"']"
    if (-not $robots) {
      $robots = Get-FirstMatch $html "<meta[^>]+content=[`"']([^`"']*)[`"'][^>]+name=[`"']robots[`"']"
    }

    return [pscustomobject]@{
      url = $Url
      kind = $Kind
      status = [int]$response.StatusCode
      bytes = $html.Length
      h1Count = ([regex]::Matches($html, "<h1[\s>]", "IgnoreCase")).Count
      titlePresent = [bool]$title
      title = $title
      metaDescriptionPresent = [bool]$description
      canonical = $canonical
      robots = $robots
      noindex = ($html -match "noindex")
      cricLiveLinks = ([regex]::Matches($html, "href=[`"'](?:https://www\.crickzen\.com)?/cric-live/", "IgnoreCase")).Count
      archiveLinks = ([regex]::Matches($html, "href=[`"'](?:https://www\.crickzen\.com)?/live-score/archive", "IgnoreCase")).Count
      jsonLdBlocks = ([regex]::Matches($html, "application/ld\+json", "IgnoreCase")).Count
      faqPresent = ($html -match "FAQ" -or $html -match "Where can I")
      tossPresent = ($html -match "Toss update")
      playingXiPresent = ($html -match "Playing XI")
      longTailPresent = ($html -match "aaj ka match live score" -or $html -match "Hindi" -or $html -match "Marathi")
    }
  } catch {
    return [pscustomobject]@{
      url = $Url
      kind = $Kind
      status = 0
      error = $_.Exception.Message
    }
  }
}

function Get-CurrentMatchSlug {
  try {
    $url = Join-Url $BaseUrl "/api/cricket-data/live-matches"
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $TimeoutSec
    $items = @($response.Content | ConvertFrom-Json)
    if ($items.Count -gt 0) {
      $candidate = $items[0]
      if ($candidate.externalMatchKey) {
        return [string]$candidate.externalMatchKey
      }
      if ($candidate.url -and $candidate.url -match "/([^/?#]+?match-updates-[^/?#]+)") {
        return $Matches[1]
      }
    }
  } catch {
    return ""
  }
  return ""
}

$routes = @(
  "/live-cricket-score",
  "/live-score",
  "/live-score/today",
  "/live-score/ipl",
  "/cricket-schedule/today",
  "/cricket-schedule/ipl-2026",
  "/live-score/archive",
  "/live-score/archive/2"
)

$audits = @()
foreach ($route in $routes) {
  $audits += Get-RawHtmlAudit -Url (Join-Url $BaseUrl $route) -Kind "hub"
}

if (-not $MatchSlug) {
  $MatchSlug = Get-CurrentMatchSlug
}

if ($MatchSlug) {
  $audits += Get-RawHtmlAudit -Url (Join-Url $BaseUrl "/cric-live/$MatchSlug") -Kind "match"
}

$failures = @()
foreach ($audit in $audits) {
  if ($audit.status -ne 200) {
    $failures += "Non-200: $($audit.url) status=$($audit.status)"
    continue
  }
  if ($audit.h1Count -ne 1) { $failures += "H1 count: $($audit.url) h1=$($audit.h1Count)" }
  if (-not $audit.titlePresent) { $failures += "Missing title: $($audit.url)" }
  if (-not $audit.metaDescriptionPresent) { $failures += "Missing meta description: $($audit.url)" }
  if (-not $audit.canonical) { $failures += "Missing canonical: $($audit.url)" }
  if ($audit.noindex) { $failures += "Noindex present: $($audit.url)" }
  if ($audit.kind -eq "hub" -and $audit.cricLiveLinks -lt 80) {
    $failures += "Weak hub link count: $($audit.url) links=$($audit.cricLiveLinks)"
  }
  if ($audit.kind -eq "hub" -and -not $audit.faqPresent) {
    $failures += "Missing hub FAQ: $($audit.url)"
  }
  if ($audit.kind -eq "match" -and $audit.jsonLdBlocks -lt 1) {
    $failures += "Missing match JSON-LD: $($audit.url)"
  }
}

$result = [pscustomobject]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  baseUrl = $BaseUrl
  matchSlug = $MatchSlug
  audits = $audits
  failures = $failures
  success = ($failures.Count -eq 0)
}

$result | ConvertTo-Json -Depth 6

if ($failures.Count -gt 0) {
  exit 2
}
