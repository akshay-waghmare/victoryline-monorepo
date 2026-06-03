param(
  [Parameter(Mandatory = $true)]
  [string]$UrlList,

  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

function Get-FirstMatch {
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

function Count-Matches {
  param(
    [string]$Html,
    [string]$Pattern
  )

  return ([regex]::Matches($Html, $Pattern, "IgnoreCase")).Count
}

function Get-JsonLdItems {
  param([string]$Html)

  $items = @()
  $matches = [regex]::Matches($Html, "<script[^>]+type=[`"']application/ld\+json[`"'][^>]*>([\s\S]*?)</script>", "IgnoreCase")
  foreach ($match in $matches) {
    try {
      $json = [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value)
      $parsed = $json | ConvertFrom-Json
      if ($parsed.'@graph') {
        $items += @($parsed.'@graph')
      } else {
        $items += @($parsed)
      }
    } catch {
      $items += [pscustomobject]@{ invalidJsonLd = $true }
    }
  }

  return $items
}

function Get-VisibleWordCount {
  param([string]$Html)

  $text = [regex]::Replace($Html, "<script[\s\S]*?</script>", " ", "IgnoreCase")
  $text = [regex]::Replace($text, "<style[\s\S]*?</style>", " ", "IgnoreCase")
  $text = [regex]::Replace($text, "<[^>]+>", " ")
  $text = [System.Net.WebUtility]::HtmlDecode($text)
  $words = [regex]::Matches($text, "\b[\p{L}\p{N}][\p{L}\p{N}'/-]*\b")
  return $words.Count
}

function Test-ValidMatchSlug {
  param([string]$Url)

  $slug = ($Url -replace "^.*/cric-live/", "") -replace "\?.*$", ""
  return ($slug -match "-vs-" -and $slug -notmatch "^\d+$")
}

function Get-ExpectedCanonical {
  param([string]$Url)

  $uri = [Uri]$Url
  if ($uri.Host -match "^(localhost|127\.0\.0\.1)$") {
    return "https://www.crickzen.com" + $uri.PathAndQuery
  }

  return $Url
}

$urls = Get-Content -LiteralPath $UrlList | Where-Object { $_.Trim() -and -not $_.Trim().StartsWith("#") }
$results = @()

foreach ($url in $urls) {
  $status = 0
  $html = ""

  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 45
    $status = [int]$response.StatusCode
    $html = [string]$response.Content
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $html = $reader.ReadToEnd()
      } catch {
        $html = ""
      }
    } else {
      $status = -1
    }
  }

  $title = Get-FirstMatch $html "<title[^>]*>([\s\S]*?)</title>"
  $description = Get-FirstMatch $html "<meta[^>]+name=[`"']description[`"'][^>]+content=[`"']([^`"']*)[`"'][^>]*>"
  if (-not $description) {
    $description = Get-FirstMatch $html "<meta[^>]+content=[`"']([^`"']*)[`"'][^>]+name=[`"']description[`"'][^>]*>"
  }

  $canonical = Get-FirstMatch $html "<link[^>]+rel=[`"']canonical[`"'][^>]+href=[`"']([^`"']*)[`"'][^>]*>"
  if (-not $canonical) {
    $canonical = Get-FirstMatch $html "<link[^>]+href=[`"']([^`"']*)[`"'][^>]+rel=[`"']canonical[`"'][^>]*>"
  }

  $robots = Get-FirstMatch $html "<meta[^>]+name=[`"']robots[`"'][^>]+content=[`"']([^`"']*)[`"'][^>]*>"
  if (-not $robots) {
    $robots = Get-FirstMatch $html "<meta[^>]+content=[`"']([^`"']*)[`"'][^>]+name=[`"']robots[`"'][^>]*>"
  }

  $h1Count = Count-Matches $html "<h1\b"
  $jsonLdCount = Count-Matches $html "application/ld\+json"
  $jsonLdItems = Get-JsonLdItems $html
  $sportsEvents = @($jsonLdItems | Where-Object { $_.'@type' -eq "SportsEvent" })
  $sportsEventsMissingLocation = @($sportsEvents | Where-Object { -not $_.location }).Count
  $invalidJsonLdCount = @($jsonLdItems | Where-Object { $_.invalidJsonLd }).Count
  $ogCount = Count-Matches $html "<meta[^>]+property=[`"']og:"
  $twitterCount = Count-Matches $html "<meta[^>]+name=[`"']twitter:"
  $ogImage = Get-FirstMatch $html "<meta[^>]+property=[`"']og:image[`"'][^>]+content=[`"']([^`"']*)[`"'][^>]*>"
  if (-not $ogImage) {
    $ogImage = Get-FirstMatch $html "<meta[^>]+content=[`"']([^`"']*)[`"'][^>]+property=[`"']og:image[`"'][^>]*>"
  }
  $wordCount = Get-VisibleWordCount $html
  $validSlug = Test-ValidMatchSlug $url
  $expectedCanonical = Get-ExpectedCanonical $url

  $flags = @()
  if ($validSlug -and $canonical -eq "https://www.crickzen.com/") { $flags += "BAD_HOME_CANONICAL" }
  if ($validSlug -and $canonical -ne $expectedCanonical) { $flags += "CANONICAL_NOT_SELF" }
  if (-not $validSlug -and $robots -notmatch "noindex") { $flags += "INVALID_NOT_NOINDEX" }
  if ($h1Count -ne 1) { $flags += "H1_COUNT_$h1Count" }
  if ($title -match "Team A|Team B") { $flags += "PLACEHOLDER_TITLE" }
  if ($canonical -match "/cric-live/\d+$" -and $robots -notmatch "noindex") { $flags += "NUMERIC_INDEXABLE" }
  if ($validSlug -and -not $ogImage) { $flags += "OG_IMAGE_MISSING" }
  if ($invalidJsonLdCount -gt 0) { $flags += "JSONLD_PARSE_ERROR" }
  if ($sportsEventsMissingLocation -gt 0) { $flags += "SPORTSEVENT_LOCATION_MISSING" }

  $results += [pscustomobject]@{
    Url = $url
    Status = $status
    Canonical = $canonical
    Robots = $robots
    H1Count = $h1Count
    Title = $title
    DescriptionLength = $description.Length
    WordCount = $wordCount
    OgTags = $ogCount
    OgImage = $ogImage
    TwitterTags = $twitterCount
    JsonLd = $jsonLdCount
    SportsEvents = $sportsEvents.Count
    Flags = ($flags -join ",")
  }
}

$table = $results |
  Select-Object Url, Status, Canonical, Robots, H1Count, WordCount, JsonLd, SportsEvents, Flags |
  Format-Table -AutoSize |
  Out-String -Width 320
if ($OutputPath) {
  $table | Set-Content -LiteralPath $OutputPath -Encoding UTF8
}

$table

if (($results | Where-Object { $_.Flags }).Count -gt 0) {
  exit 2
}
