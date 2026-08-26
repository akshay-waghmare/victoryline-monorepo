[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string[]]$Url,
    [string[]]$ExpectedLifecycle,
    [string[]]$ExpectedTeams,
    [int]$VirtualTimeBudgetMs = 10000
)

$ErrorActionPreference = 'Stop'

$chromeCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
$chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $chrome) {
    throw 'Chrome executable was not found. Install Chrome or run the browser hydration check from a machine with Chrome.'
}

function Get-RawBody {
    param([string]$TargetUrl)
    $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 60 -MaximumRedirection 5
    return [string]$response.Content
}

function Get-DumpedDom {
    param([string]$TargetUrl)

    $profilePath = Join-Path ([System.IO.Path]::GetTempPath()) ('crickzen-hydration-' + [guid]::NewGuid().ToString('N'))
    $stdoutPath = Join-Path $profilePath 'dump-dom.html'
    $stderrPath = Join-Path $profilePath 'chrome.log'
    New-Item -ItemType Directory -Force -Path $profilePath | Out-Null
    try {
        $arguments = @(
            '--headless',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--no-first-run',
            '--no-default-browser-check',
            '--run-all-compositor-stages-before-draw',
            "--virtual-time-budget=$VirtualTimeBudgetMs",
            "--user-data-dir=$profilePath",
            '--dump-dom',
            $TargetUrl
        )
        $process = Start-Process -FilePath $chrome -ArgumentList $arguments -PassThru -Wait -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
        $dom = if (Test-Path -LiteralPath $stdoutPath) { [System.IO.File]::ReadAllText($stdoutPath) } else { '' }
        # Chrome can return a non-zero process code after emitting a valid
        # dump when third-party page resources or an existing browser session
        # close asynchronously. The DOM is the acceptance artifact; reject
        # only an empty dump.
        if ([string]::IsNullOrWhiteSpace($dom)) {
            throw "Chrome could not dump the hydrated DOM for $TargetUrl."
        }
        return $dom
    } finally {
        if (Test-Path -LiteralPath $profilePath) {
            Remove-Item -LiteralPath $profilePath -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Get-Metrics {
    param([string]$Body)

    $aeoMatch = [regex]::Match($Body, '<section\b[^>]*id=["'']canonical-match-aeo["''][\s\S]*?</section>', 'IgnoreCase')
    $aeoText = if ($aeoMatch.Success) { [regex]::Replace($aeoMatch.Value, '<[^>]+>', ' ') } else { '' }
    $lifecycleMatch = [regex]::Match($Body, 'id=["'']canonical-match-aeo["''][^>]*data-lifecycle=["'']([^"'']+)', 'IgnoreCase')
    $anchors = [regex]::Matches($Body, '<a\b[^>]*\bhref=["''][^"'']+["'']', 'IgnoreCase')

    return [ordered]@{
        h1 = ([regex]::Matches($Body, '<h1\b', 'IgnoreCase')).Count
        aeo = $aeoMatch.Success
        lifecycle = if ($lifecycleMatch.Success) { $lifecycleMatch.Groups[1].Value } else { $null }
        aeoHasTeamsFact = [bool]($aeoText -match '(?i)\bTeams\b')
        aeoHasStatusFact = [bool]($aeoText -match '(?i)\bStatus\b')
        aeoHasScore = [bool]($aeoText -match '(?is)\bScore\s+[^<]{0,80}\b\d{1,4}\s*[-/]\s*\d{1,3}\b')
        aeoHasResult = [bool]($aeoText -match '(?i)result|won by|lead by|match completed|drawn|tied')
        aeoHasInvalidScore = [bool]($aeoText -match '(?is)\bScore\s+[^<]{0,80}\b0\s*[-/]\s*0\b')
        anchors = $anchors.Count
        internalAnchors = @($anchors | Where-Object { $_.Value -match 'href=["''](?:/|https://www\.crickzen\.com/)' }).Count
        jsonLd = ([regex]::Matches($Body, 'application/ld\+json', 'IgnoreCase')).Count
        sportsEvent = [bool]($Body -match '(?i)["'']@type["'']\s*:\s*["'']SportsEvent["'']')
        score = [bool]($Body -match '\b\d+\s*[/-]\s*\d+\b')
        schedule = [bool]($Body -match '(?i)scheduled|start time|starts')
        result = [bool]($Body -match '(?i)result|won by|match completed|drawn|tied')
        placeholder = [bool]($Body -match '\b(?:Team 1|Team 2|Team A|Team B|TBD vs TBD)\b')
        temporary = [bool]($Body -match '(?i)temporarily unavailable|temporarily loading|will update with runs|updates will appear shortly')
        text = $aeoText
    }
}

$results = @()
for ($index = 0; $index -lt $Url.Count; $index++) {
    $targetUrl = $Url[$index]
    $expected = if ($ExpectedLifecycle -and $index -lt $ExpectedLifecycle.Count) { $ExpectedLifecycle[$index] } else { $null }
    $expectedTeamText = if ($ExpectedTeams -and $index -lt $ExpectedTeams.Count) { $ExpectedTeams[$index] } else { $null }
    $rawBody = Get-RawBody $targetUrl
    $rawMetrics = Get-Metrics $rawBody
    $dom = Get-DumpedDom $targetUrl
    $hydratedMetrics = Get-Metrics $dom

    if ($hydratedMetrics.h1 -ne 1) { throw "Hydrated H1 contract failed for $targetUrl." }
    if (-not $hydratedMetrics.aeo -or -not $hydratedMetrics.aeoHasTeamsFact -or -not $hydratedMetrics.aeoHasStatusFact) { throw "Hydrated canonical AEO content is missing or incomplete for $targetUrl." }
    if ($hydratedMetrics.lifecycle -ne $rawMetrics.lifecycle) { throw "Hydration lifecycle changed for ${targetUrl}: raw=$($rawMetrics.lifecycle), hydrated=$($hydratedMetrics.lifecycle)." }
    if ($expected -and $hydratedMetrics.lifecycle -ne $expected) { throw "Expected hydrated lifecycle '$expected' for $targetUrl, received '$($hydratedMetrics.lifecycle)'." }
    if ($hydratedMetrics.anchors -lt 1 -or $hydratedMetrics.internalAnchors -lt 1) { throw "Hydrated real internal links are missing for $targetUrl." }
    if ($hydratedMetrics.jsonLd -lt 1) { throw "Hydrated JSON-LD is missing for $targetUrl." }
    if ($rawMetrics.sportsEvent -and -not $hydratedMetrics.sportsEvent) { throw "Hydration removed the SSR SportsEvent schema for $targetUrl." }
    if ($hydratedMetrics.placeholder -or $hydratedMetrics.temporary) { throw "Hydrated placeholder/loading copy reached $targetUrl." }

    if ($expected -eq 'upcoming' -and -not $hydratedMetrics.schedule) { throw "Hydrated upcoming page has no schedule fact: $targetUrl" }
    if (($expected -eq 'live' -or $expected -eq 'innings-break') -and -not $hydratedMetrics.aeoHasScore) { throw "Hydrated live page has no score in its canonical AEO facts: $targetUrl" }
    if ($expected -eq 'completed' -and -not $hydratedMetrics.aeoHasResult) { throw "Hydrated completed page has no result in its canonical AEO facts: $targetUrl" }
    if ($hydratedMetrics.aeoHasInvalidScore) { throw "Hydrated canonical AEO facts contain an invalid 0/0 score: $targetUrl" }

    if ($expectedTeamText) {
        foreach ($team in ($expectedTeamText -split '\s*\|\s*' | Where-Object { $_ })) {
            if ($hydratedMetrics.text -notmatch [regex]::Escape($team)) { throw "Expected team '$team' is missing after hydration for $targetUrl." }
        }
    }

    $results += [ordered]@{
        url = $targetUrl
        raw = $rawMetrics
        hydrated = $hydratedMetrics
    }
}

[ordered]@{
    checkedAtUtc = [DateTime]::UtcNow.ToString('o')
    chrome = $chrome
    virtualTimeBudgetMs = $VirtualTimeBudgetMs
    results = $results
    claimBoundary = 'Browser hydration parity and SSR content preservation only; not Google discovery, indexing, rankings, traffic, engagement, or AI citations.'
} | ConvertTo-Json -Depth 8
