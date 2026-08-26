[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string[]]$Url,
    [string[]]$ExpectedLifecycle,
    [string[]]$ExpectedTeams
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
    $canonicalMatch = [regex]::Match($Body, '<link\b[^>]*rel=["'']canonical["''][^>]*href=["'']([^"'']+)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $lifecycleMatch = [regex]::Match($Body, 'id=["'']canonical-match-aeo["''][^>]*data-lifecycle=["'']([^"'']+)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $aeoMatch = [regex]::Match($Body, '<section\b[^>]*id=["'']canonical-match-aeo["''][\s\S]*?</section>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $anchorMatches = [regex]::Matches($Body, '<a\b[^>]*\bhref=["''][^"'']+["'']', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    $internalAnchorCount = @($anchorMatches | Where-Object { $_.Value -match 'href=["''](?:/|https://www\.crickzen\.com/)' }).Count
    $lifecycleHubLinkCount = @($anchorMatches | Where-Object { $_.Value -match '(?:/live-score|/matches|/cricket-schedule/today)' }).Count
    $aeoText = if ($aeoMatch.Success) { [regex]::Replace($aeoMatch.Value, '<[^>]+>', ' ') } else { '' }

    return [ordered]@{
        h1 = $h1Count
        canonical = $canonicalCount
        canonicalHref = if ($canonicalMatch.Success) { $canonicalMatch.Groups[1].Value } else { $null }
        robotsIndexable = [bool]($Body -match '(?i)<meta\b[^>]*name=["'']robots["''][^>]*content=["''][^"'']*\bindex\s*,?\s*follow\b')
        noindex = [bool]($Body -match '<meta\b[^>]*name=["'']robots["''][^>]*content=["''][^"'']*noindex')
        aeoBlock = $aeoMatch.Success
        aeoHasTeamsFact = [bool]($aeoText -match '(?i)\bTeams\b')
        aeoHasStatusFact = [bool]($aeoText -match '(?i)\bStatus\b')
        aeoHasScore = [bool]($aeoText -match '\b\d+\s*[-/]\s*\d+\b')
        aeoHasResult = [bool]($aeoText -match '(?i)result|won by|lead by|match completed|drawn|tied')
        aeoHasInvalidScore = [bool]($aeoText -match '(?i)\b0\s*[-/]\s*0\b')
        anchorCount = $anchorMatches.Count
        internalAnchorCount = $internalAnchorCount
        lifecycleHubLinkCount = $lifecycleHubLinkCount
        jsonLdCount = ([regex]::Matches($Body, 'application/ld\+json', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
        sportsEvent = [bool]($Body -match '(?i)["'']@type["'']\s*:\s*["'']SportsEvent["'']')
        hasScore = [bool]($Body -match '\b\d+\s*[/-]\s*\d+\b')
        hasSchedule = [bool]($Body -match '(?i)scheduled|start time|starts')
        hasResult = [bool]($Body -match '(?i)result|won by|match completed|drawn|tied')
        expectedTeams = $aeoText
        lifecycle = if ($lifecycleMatch.Success) { $lifecycleMatch.Groups[1].Value } else { $null }
        placeholder = [bool]($Body -match '\b(?:Team 1|Team 2|Team A|Team B|TBD vs TBD)\b')
        temporaryAnswer = [bool]($Body -match '(?i)temporarily loading|will update with runs|updates will appear shortly')
    }
}

function Normalize-Url {
    param([string]$Value)
    return ([string]$Value).Trim().TrimEnd('/').ToLowerInvariant()
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

    if ($baseline.status -eq 200) {
        if (-not $baseline.metrics.aeoBlock) { throw "Canonical AEO answer block is missing from a 200 match page: $targetUrl" }
        if (-not $baseline.metrics.aeoHasTeamsFact -or -not $baseline.metrics.aeoHasStatusFact) { throw "Canonical AEO facts are incomplete on $targetUrl." }
        if ((Normalize-Url $baseline.metrics.canonicalHref) -ne (Normalize-Url $targetUrl)) { throw "Canonical URL is not self-referential on ${targetUrl}: $($baseline.metrics.canonicalHref)" }
        if (-not $baseline.metrics.robotsIndexable -or $baseline.metrics.noindex) { throw "Indexable robots contract failed on $targetUrl." }
        if ($baseline.metrics.anchorCount -lt 1 -or $baseline.metrics.internalAnchorCount -lt 1 -or $baseline.metrics.lifecycleHubLinkCount -lt 1) { throw "Real internal match-navigation links are missing on $targetUrl." }
        if ($baseline.metrics.jsonLdCount -lt 1) { throw "JSON-LD is missing from $targetUrl." }
        if ($baseline.metrics.placeholder -or $baseline.metrics.temporaryAnswer) { throw "Placeholder/loading answer reached a 200 match page: $targetUrl" }
    }
    if ($expected -and $baseline.metrics.lifecycle -ne $expected) {
        throw "Expected lifecycle '$expected' for $targetUrl, received '$($baseline.metrics.lifecycle)'."
    }
    if ($expected -and $baseline.status -eq 200) {
        switch ($expected.ToLowerInvariant()) {
            'upcoming' { if (-not $baseline.metrics.hasSchedule) { throw "Upcoming page has no schedule fact: $targetUrl" } }
            'live' { if (-not $baseline.metrics.aeoHasScore) { throw "Live page has no score in its canonical AEO facts: $targetUrl" } }
            'innings-break' { if (-not $baseline.metrics.aeoHasScore) { throw "Innings-break page has no score in its canonical AEO facts: $targetUrl" } }
            'completed' { if (-not $baseline.metrics.aeoHasResult) { throw "Completed page has no result in its canonical AEO facts: $targetUrl" } }
        }
        if ($baseline.metrics.aeoHasInvalidScore) { throw "Canonical AEO facts contain an invalid 0/0 score: $targetUrl" }
    }
    $expectedTeamText = if ($ExpectedTeams -and $urlIndex -lt $ExpectedTeams.Count) { $ExpectedTeams[$urlIndex] } else { $null }
    if ($expectedTeamText -and $baseline.status -eq 200) {
        foreach ($team in ($expectedTeamText -split '\s*\|\s*' | Where-Object { $_ })) {
            if ($baseline.metrics.expectedTeams -notmatch [regex]::Escape($team)) { throw "Expected team '$team' is missing from the AEO facts on $targetUrl." }
        }
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
