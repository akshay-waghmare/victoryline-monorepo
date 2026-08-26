[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string[]]$Url,
    [string[]]$ExpectedLifecycle
)

$profiles = @(
    @{ Name = 'normal'; UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' },
    @{ Name = 'googlebot-desktop'; UserAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    @{ Name = 'googlebot-mobile'; UserAgent = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
)

function Get-PageSnapshot {
    param(
        [string]$TargetUrl,
        [string]$UserAgent
    )

    try {
        $response = Invoke-WebRequest -Uri $TargetUrl -Headers @{ 'User-Agent' = $UserAgent } -UseBasicParsing -TimeoutSec 45 -MaximumRedirection 5
        return @{ Status = [int]$response.StatusCode; Body = [string]$response.Content }
    } catch {
        $webResponse = $_.Exception.Response
        if ($null -ne $webResponse) {
            $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
            try {
                return @{ Status = [int]$webResponse.StatusCode; Body = $reader.ReadToEnd() }
            } finally {
                $reader.Dispose()
            }
        }
        throw
    }
}

function Get-MatchAeoMetrics {
    param([string]$Body)

    $h1Count = ([regex]::Matches($Body, '<h1\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
    $canonicalCount = ([regex]::Matches($Body, '<link\b[^>]*rel=["'']canonical["'']', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
    $lifecycleMatch = [regex]::Match($Body, 'id=["'']canonical-match-aeo["''][^>]*data-lifecycle=["'']([^"'']+)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    return [ordered]@{
        h1 = $h1Count
        canonical = $canonicalCount
        noindex = [bool]($Body -match '<meta\b[^>]*name=["'']robots["''][^>]*content=["''][^"'']*noindex')
        aeoBlock = [bool]($Body -match 'id=["'']canonical-match-aeo["'']')
        lifecycle = if ($lifecycleMatch.Success) { $lifecycleMatch.Groups[1].Value } else { $null }
        placeholder = [bool]($Body -match '\b(?:Team 1|Team 2|Team A|Team B|TBD vs TBD)\b')
        temporaryAnswer = [bool]($Body -match '(?i)temporarily loading|will update with runs|updates will appear shortly')
    }
}

$allResults = @()
for ($urlIndex = 0; $urlIndex -lt $Url.Count; $urlIndex++) {
    $targetUrl = $Url[$urlIndex]
    $expected = if ($ExpectedLifecycle -and $urlIndex -lt $ExpectedLifecycle.Count) { $ExpectedLifecycle[$urlIndex] } else { $null }
    $samples = @()

    foreach ($profile in $profiles) {
        $page = Get-PageSnapshot -TargetUrl $targetUrl -UserAgent $profile.UserAgent
        $metrics = Get-MatchAeoMetrics -Body $page.Body
        $samples += [ordered]@{
            profile = $profile.Name
            status = $page.Status
            metrics = $metrics
        }
    }

    $baseline = $samples[0]
    foreach ($sample in $samples) {
        if ($sample.status -ne $baseline.status) { throw "Status parity failed for ${targetUrl}: $($sample.profile) returned $($sample.status), normal returned $($baseline.status)." }
        if ($sample.metrics.h1 -ne $baseline.metrics.h1) { throw "H1 parity failed for $targetUrl." }
        if ($sample.metrics.canonical -ne $baseline.metrics.canonical) { throw "Canonical parity failed for $targetUrl." }
        if ($sample.metrics.lifecycle -ne $baseline.metrics.lifecycle) { throw "Lifecycle parity failed for $targetUrl." }
    }

    if ($baseline.status -eq 200 -and $baseline.metrics.aeoBlock -and $baseline.metrics.temporaryAnswer) {
        throw "Temporary/loading answer reached a 200 AEO page: $targetUrl"
    }
    if ($expected -and $baseline.metrics.lifecycle -ne $expected) {
        throw "Expected lifecycle '$expected' for $targetUrl, received '$($baseline.metrics.lifecycle)'."
    }

    $allResults += [ordered]@{
        url = $targetUrl
        expectedLifecycle = $expected
        samples = $samples
    }
}

[ordered]@{
    checkedAtUtc = [DateTime]::UtcNow.ToString('o')
    profiles = $profiles.Name
    results = $allResults
    claimBoundary = 'Technical SSR/crawler parity and data readiness only; not Google indexing, rankings, traffic, engagement, or AI citations.'
} | ConvertTo-Json -Depth 8
