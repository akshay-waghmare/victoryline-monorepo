param(
  [string]$SiteUrl = 'https://prediction.crickzen.com',
  [int]$TimeoutSec = 20,
  [string]$RequestHost = ''
)

$ErrorActionPreference = 'Stop'
$baseUrl = $SiteUrl.TrimEnd('/')
$failures = New-Object System.Collections.Generic.List[string]

function Get-Page([string]$Path) {
  try {
    $headers = if ($RequestHost) { @{ Host = $RequestHost } } else { $null }
    return Invoke-WebRequest -UseBasicParsing -Uri ($baseUrl + $Path) -Headers $headers -TimeoutSec $TimeoutSec
  } catch {
    $failures.Add("$Path request failed: $($_.Exception.Message)")
    return $null
  }
}

function Get-Meta([string]$Html, [string]$Name) {
  $escaped = [regex]::Escape($Name)
  $match = [regex]::Match($Html, '<meta\s+name="' + $escaped + '"\s+content="([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  return $match.Groups[1].Value
}

function Get-Canonical([string]$Html) {
  return [regex]::Match($Html, '<link\s+rel="canonical"\s+href="([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase).Groups[1].Value
}

$publicRoutes = @('/', '/how-it-works', '/history', '/creator-packs', '/partners', '/media-kit')
foreach ($route in $publicRoutes) {
  $response = Get-Page $route
  if ($null -eq $response) { continue }
  $html = [string]$response.Content
  if ([int]$response.StatusCode -ne 200) {
    $failures.Add("$route returned $([int]$response.StatusCode), expected 200")
  }
  if ($html -notmatch 'CrickZen public prediction product|How CrickZen predictions work|Ready-to-use match packs|Build useful cricket prediction experiences|CrickZen media kit') {
    $failures.Add("$route does not contain the public prediction surface")
  }
  if ((Get-Canonical $html) -notmatch '^https://prediction\.crickzen\.com') {
    $failures.Add("$route is not self-canonical on prediction.crickzen.com")
  }
  if ($route -eq '/creator-packs') {
    foreach ($requiredCreatorPackText in @(
      'Purani Dilli-6 vs Outer Delhi Warriors',
      'Trichy Grand Cholas vs Kovai Kings',
      'Noida Kings vs Kashi Rudras',
      'Download MP4',
      'View pack manifest',
      'The three fixed sample packs include a downloadable MP4, thumbnail, report, and caption'
    )) {
      if ($html -notmatch [regex]::Escape($requiredCreatorPackText)) {
        $failures.Add("$route is missing expected sample-pack text: $requiredCreatorPackText")
      }
    }
  }
}

$developers = Get-Page '/developers'
if ($developers) {
  $developerRobots = Get-Meta ([string]$developers.Content) 'robots'
  if ($developerRobots -ne 'noindex,follow') {
    $failures.Add("/developers must remain noindex until the versioned API gateway is live")
  }
}

foreach ($route in @('/share/test-slug', '/embed/test-slug')) {
  $response = Get-Page $route
  if ($null -eq $response) { continue }
  $html = [string]$response.Content
  if ([int]$response.StatusCode -ne 200) { $failures.Add("$route returned $([int]$response.StatusCode), expected 200") }
  if ((Get-Meta $html 'robots') -ne 'noindex,follow') { $failures.Add("$route must be noindex,follow") }
  if ((Get-Canonical $html) -notmatch '^https://www\.crickzen\.com/cric-live/test-slug$') { $failures.Add("$route must point its canonical link to the main match path") }
}

# A real public-feed slug must canonicalize through its retained source URL,
# not to the prediction-feed slug itself.
foreach ($route in @('/share/kk-vs-tgc-t20-win-probability', '/embed/kk-vs-tgc-t20-win-probability')) {
  $response = Get-Page $route
  if ($response) {
    $html = [string]$response.Content
    if ((Get-Canonical $html) -notmatch '^https://www\.crickzen\.com/cric-live/kk-vs-tgc-qualifier-2nd-match-tamil-nadu-premier-league-2026-match-updates-12ZP$') {
      $failures.Add("$route must point its canonical link to the real CrickZen match page")
    }
  }
}

$root = Get-Page '/'
if ($root) {
  $rootHtml = [string]$root.Content
  foreach ($forbidden in @('Streamlit', 'Scrape control', 'Bet market', 'Operator controls')) {
    if ($rootHtml -match [regex]::Escape($forbidden)) { $failures.Add("prediction host exposed forbidden operator text: $forbidden") }
  }
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Output "Public prediction surface checks passed for $baseUrl"
