[CmdletBinding()]
param(
  [string]$BaseUrl = "https://www.crickzen.com",
  [int]$MaxExpectedLiveMatches = 20,
  [int]$HomepageAttempts = 3,
  [int]$RequestTimeoutSeconds = 45,
  [string]$SshHost = "",
  [string]$OutputDirectory = "artifacts/live-catalog-guard"
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd("/")
$failures = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

function Invoke-TimedWebRequest {
  param([string]$Uri)

  $timer = [Diagnostics.Stopwatch]::StartNew()
  try {
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec $RequestTimeoutSeconds
    $timer.Stop()
    return [pscustomobject]@{
      status = [int]$response.StatusCode
      elapsedMs = $timer.ElapsedMilliseconds
      content = [string]$response.Content
      error = $null
    }
  } catch {
    $timer.Stop()
    return [pscustomobject]@{
      status = -1
      elapsedMs = $timer.ElapsedMilliseconds
      content = ""
      error = $_.Exception.Message
    }
  }
}

$liveResponse = Invoke-TimedWebRequest "$base/api/cricket-data/live-matches"
$liveMatches = @()
if ($liveResponse.status -eq 200) {
  try {
    $liveMatches = @($liveResponse.content | ConvertFrom-Json)
  } catch {
    $failures.Add("Live catalog returned invalid JSON.")
  }
} else {
  $failures.Add("Live catalog request failed with status $($liveResponse.status).")
}

$liveUrls = @($liveMatches | ForEach-Object { [string]$_.url } | Where-Object { $_ })
$duplicates = @($liveUrls | Group-Object | Where-Object Count -gt 1 | Select-Object Name, Count)
if ($liveMatches.Count -gt $MaxExpectedLiveMatches) {
  $failures.Add("Live catalog count $($liveMatches.Count) exceeds guardrail $MaxExpectedLiveMatches.")
}
if ($duplicates.Count -gt 0) {
  $failures.Add("Live catalog contains duplicate URLs.")
}

$homepageChecks = @()
for ($attempt = 1; $attempt -le $HomepageAttempts; $attempt++) {
  $page = Invoke-TimedWebRequest "$base/"
  $h1Count = ([regex]::Matches($page.content, "<h1\b", "IgnoreCase")).Count
  $matchLinkCount = ([regex]::Matches($page.content, 'href=["''](?:https://www\.crickzen\.com)?/cric-live/', "IgnoreCase")).Count
  $homepageChecks += [pscustomobject]@{
    attempt = $attempt
    status = $page.status
    elapsedMs = $page.elapsedMs
    bytes = $page.content.Length
    h1Count = $h1Count
    matchLinkCount = $matchLinkCount
    error = $page.error
  }
  if ($page.status -ne 200 -or $h1Count -lt 1 -or $page.content.Length -lt 10000) {
    $failures.Add("Homepage SSR attempt $attempt was incomplete.")
  }
}

$prodEvidence = $null
if ($SshHost) {
  $ssh = Get-Command ssh -ErrorAction SilentlyContinue
  if (-not $ssh) {
    $gitSsh = "C:\Program Files\Git\usr\bin\ssh.exe"
    if (Test-Path -LiteralPath $gitSsh) {
      $ssh = Get-Item -LiteralPath $gitSsh
    } else {
      throw "ssh executable not found on PATH or at $gitSsh"
    }
  }
  $command = "docker ps --format '{{.Names}}|{{.Status}}|{{.Image}}'; echo LOGS; docker logs victoryline-scraper --since 30m 2>&1 | grep -Ei 'backend.sync_live_matches.failed|matches.add.circuit_open|schedule.sync.circuit_open|pid exhaustion|cannot fork|resource temporarily unavailable' | tail -80"
  $sshPath = if ($ssh.Source) { $ssh.Source } else { $ssh.FullName }
  $prodEvidence = @(& $sshPath $SshHost $command)
  if ($prodEvidence -match "circuit_open|sync_live_matches.failed|resource temporarily unavailable") {
    $warnings.Add("Recent scraper logs contain lifecycle-sync or resource-exhaustion signals.")
  }
}

$result = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  baseUrl = $base
  liveCatalog = [ordered]@{
    status = $liveResponse.status
    elapsedMs = $liveResponse.elapsedMs
    count = $liveMatches.Count
    maxExpected = $MaxExpectedLiveMatches
    duplicateUrls = $duplicates
  }
  homepageChecks = $homepageChecks
  productionEvidence = $prodEvidence
  warnings = $warnings
  failures = $failures
  passed = $failures.Count -eq 0
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$artifact = Join-Path $OutputDirectory ("live-catalog-guard-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $artifact -Encoding utf8
$result | ConvertTo-Json -Depth 8
Write-Host "Artifact: $artifact"

if ($failures.Count -gt 0) {
  exit 1
}
