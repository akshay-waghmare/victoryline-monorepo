param(
  [Parameter(Mandatory = $true)]
  [string[]]$Url,
  [int]$MinimumBytes = 9000,
  [int]$TimeoutSeconds = 30
)

$ErrorActionPreference = 'Stop'
$failures = @()

foreach ($target in $Url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $target -TimeoutSec $TimeoutSeconds
    $html = $response.Content
    $bytes = [Text.Encoding]::UTF8.GetByteCount($html)
    $checks = [ordered]@{
      status = $response.StatusCode -eq 200
      bytes = $bytes -ge $MinimumBytes
      title = [regex]::IsMatch($html, '(?is)<title[^>]*>\s*[^<]+')
      canonical = [regex]::IsMatch($html, '(?is)<link[^>]+rel=["'']canonical["'']')
      robots = [regex]::IsMatch($html, '(?is)<meta[^>]+name=["'']robots["'']')
      h1 = [regex]::IsMatch($html, '(?is)<h1[ >]')
      sportsEvent = [regex]::IsMatch($html, '(?is)"@type"\s*:\s*"SportsEvent"')
      nonEmptyAppRoot = -not [regex]::IsMatch($html, '(?is)<app-root>\s*</app-root>')
    }
    $failed = @($checks.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object Key)
    [PSCustomObject]@{
      Url = $target
      StatusCode = $response.StatusCode
      Bytes = $bytes
      Fallback = $response.Headers['X-SSR-Fallback']
      FallbackLevel = $response.Headers['X-SSR-Fallback-Level']
      Passed = $failed.Count -eq 0
      FailedChecks = $failed -join ', '
    }
    if ($failed.Count -gt 0) { $failures += $target }
  } catch {
    $failures += $target
    [PSCustomObject]@{ Url = $target; StatusCode = $null; Bytes = 0; Fallback = $null; FallbackLevel = $null; Passed = $false; FailedChecks = $_.Exception.Message }
  }
}

if ($failures.Count -gt 0) {
  throw "Canonical SSR integrity failed for $($failures.Count) URL(s)."
}
