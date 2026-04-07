[CmdletBinding()]
param(
    [string]$SshTarget = "administrator@204.12.199.137",
    [string]$RemoteRepoPath = "/home/administrator/victoryline-monorepo",
    [string]$OperatorLabel,
    [string]$StateDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$trackedEnvVars = @(
    "BACKEND_IMAGE",
    "FRONTEND_IMAGE",
    "SCRAPER_IMAGE",
    "PRERENDER_IMAGE"
)

$trackedServices = [ordered]@{
    backend   = "victoryline-backend"
    frontend  = "victoryline-frontend"
    scraper   = "victoryline-scraper"
    prerender = "victoryline-prerender"
}

if ([string]::IsNullOrWhiteSpace($StateDirectory)) {
    $scriptRoot = Split-Path -Parent $PSCommandPath
    $StateDirectory = Join-Path (Split-Path -Parent $scriptRoot) "ops\prod-state"
}

function Get-CommandPath {
    param([string]$Name)

    $command = Get-Command $Name -CommandType Application -ErrorAction Stop
    return $command.Source
}

function Get-ObjectPropertyValue {
    param(
        [Parameter(Mandatory = $true)][object]$Object,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ($null -eq $Object) {
        return $null
    }

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function New-ChangeRecord {
    param(
        [AllowNull()][string]$OldValue,
        [AllowNull()][string]$NewValue
    )

    return [pscustomobject]@{
        old     = $OldValue
        new     = $NewValue
        changed = ($OldValue -ne $NewValue)
    }
}

function Get-SafeLabel {
    param([AllowNull()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    $safe = ($Value.Trim().ToLowerInvariant() -replace "[^a-z0-9._-]+", "-").Trim("-")
    if ([string]::IsNullOrWhiteSpace($safe)) {
        return $null
    }

    return $safe
}

function Invoke-RemoteSnapshot {
    param(
        [Parameter(Mandatory = $true)][string]$Target,
        [Parameter(Mandatory = $true)][string]$RepoPath
    )

    $sshPath = Get-CommandPath -Name "ssh"
    $remoteScript = @'
set -eu

repo_path="$1"
cd "$repo_path"

if [ ! -f ".env" ]; then
  echo ".env not found in $repo_path" >&2
  exit 1
fi

printf 'GIT_HEAD=%s\n' "$(git rev-parse HEAD)"

for name in BACKEND_IMAGE FRONTEND_IMAGE SCRAPER_IMAGE PRERENDER_IMAGE; do
  value="$(grep -E "^${name}=" .env | tail -n 1 | cut -d= -f2- || true)"
  printf 'ENV_PIN\t%s\t%s\n' "$name" "$value"
done

for pair in \
  backend:victoryline-backend \
  frontend:victoryline-frontend \
  scraper:victoryline-scraper \
  prerender:victoryline-prerender
do
  service="${pair%%:*}"
  container="${pair#*:}"
  image="$(docker inspect --type container "$container" --format '{{.Config.Image}}' 2>/dev/null || true)"
  running="$(docker inspect --type container "$container" --format '{{.State.Running}}' 2>/dev/null || true)"
  printf 'RUNNING_IMAGE\t%s\t%s\t%s\n' "$service" "$image" "$running"
done
'@

    $remoteOutput = $remoteScript | & $sshPath $Target "bash -s -- '$RepoPath'" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "SSH snapshot failed.`n$($remoteOutput -join [Environment]::NewLine)"
    }

    return $remoteOutput
}

function Write-ChangeSummary {
    param(
        [AllowNull()][object]$PreviousSnapshot,
        [Parameter(Mandatory = $true)][object]$Changes
    )

    $rows = @(
        [pscustomobject]@{
            Category = "git"
            Name     = "HEAD"
            Previous = $Changes["gitHead"].old
            Current  = $Changes["gitHead"].new
            Status   = $(if ($Changes["gitHead"].changed) { "CHANGED" } else { "same" })
        }
    )

    foreach ($name in $trackedEnvVars) {
        $change = $Changes["envPins"][$name]
        $rows += [pscustomobject]@{
            Category = "env-pin"
            Name     = $name
            Previous = $change.old
            Current  = $change.new
            Status   = $(if ($change.changed) { "CHANGED" } else { "same" })
        }
    }

    foreach ($service in $trackedServices.Keys) {
        $change = $Changes["runningImages"][$service]
        $rows += [pscustomobject]@{
            Category = "running"
            Name     = $service
            Previous = $change.old
            Current  = $change.new
            Status   = $(if ($change.changed) { "CHANGED" } else { "same" })
        }
    }

    if ($null -eq $PreviousSnapshot) {
        Write-Host "Previous snapshot: none (this is the baseline)."
    }
    else {
        Write-Host ("Previous snapshot: {0}" -f (Get-ObjectPropertyValue -Object $PreviousSnapshot -Name "snapshotFile"))
    }

    Write-Host ""
    Write-Host "Old vs new production image state:"
    ($rows | Format-Table -Wrap -AutoSize | Out-String -Width 240).TrimEnd() | Write-Host
}

$stateRoot = [System.IO.Path]::GetFullPath($StateDirectory)
$snapshotsDirectory = Join-Path $stateRoot "snapshots"
$latestPath = Join-Path $stateRoot "latest.json"
$historyPath = Join-Path $stateRoot "history.jsonl"

New-Item -ItemType Directory -Force -Path $snapshotsDirectory | Out-Null

$previousSnapshot = $null
if (Test-Path $latestPath) {
    $latestContent = Get-Content -Path $latestPath -Raw
    if (-not [string]::IsNullOrWhiteSpace($latestContent)) {
        $previousSnapshot = $latestContent | ConvertFrom-Json
    }
}

$remoteOutput = Invoke-RemoteSnapshot -Target $SshTarget -RepoPath $RemoteRepoPath

$gitHead = $null
$envPins = [ordered]@{}
$runningImages = [ordered]@{}
$runningStates = [ordered]@{}

foreach ($line in $remoteOutput) {
    if ([string]::IsNullOrWhiteSpace($line)) {
        continue
    }

    if ($line -match '^GIT_HEAD=(.*)$') {
        $gitHead = $Matches[1]
        continue
    }

    if ($line -match "^ENV_PIN\t([^\t]+)\t(.*)$") {
        $envPins[$Matches[1]] = $Matches[2]
        continue
    }

    if ($line -match "^RUNNING_IMAGE\t([^\t]+)\t([^\t]*)\t(.*)$") {
        $runningImages[$Matches[1]] = $Matches[2]

        $stateText = $Matches[3]
        if ($stateText -eq "true") {
            $runningStates[$Matches[1]] = $true
        }
        elseif ($stateText -eq "false") {
            $runningStates[$Matches[1]] = $false
        }
        else {
            $runningStates[$Matches[1]] = $null
        }
    }
}

if ([string]::IsNullOrWhiteSpace($gitHead)) {
    throw "SSH snapshot did not return prod git HEAD."
}

foreach ($name in $trackedEnvVars) {
    if (-not $envPins.Contains($name)) {
        $envPins[$name] = $null
    }
}

foreach ($service in $trackedServices.Keys) {
    if (-not $runningImages.Contains($service)) {
        $runningImages[$service] = $null
    }

    if (-not $runningStates.Contains($service)) {
        $runningStates[$service] = $null
    }
}

$changes = [ordered]@{
    gitHead       = New-ChangeRecord -OldValue $(if ($null -eq $previousSnapshot) { $null } else { [string](Get-ObjectPropertyValue -Object $previousSnapshot -Name "gitHead") }) -NewValue $gitHead
    envPins       = [ordered]@{}
    runningImages = [ordered]@{}
}

foreach ($name in $trackedEnvVars) {
    $previousPins = if ($null -eq $previousSnapshot) { $null } else { Get-ObjectPropertyValue -Object $previousSnapshot -Name "envPins" }
    $changes["envPins"][$name] = New-ChangeRecord `
        -OldValue $(if ($null -eq $previousPins) { $null } else { [string](Get-ObjectPropertyValue -Object $previousPins -Name $name) }) `
        -NewValue ([string]$envPins[$name])
}

foreach ($service in $trackedServices.Keys) {
    $previousRunning = if ($null -eq $previousSnapshot) { $null } else { Get-ObjectPropertyValue -Object $previousSnapshot -Name "runningImages" }
    $changes["runningImages"][$service] = New-ChangeRecord `
        -OldValue $(if ($null -eq $previousRunning) { $null } else { [string](Get-ObjectPropertyValue -Object $previousRunning -Name $service) }) `
        -NewValue ([string]$runningImages[$service])
}

$timestampUtc = (Get-Date).ToUniversalTime()
$timestampText = $timestampUtc.ToString("yyyy-MM-ddTHH:mm:ssZ")
$fileStamp = $timestampUtc.ToString("yyyyMMddTHHmmssZ")
$safeLabel = Get-SafeLabel -Value $OperatorLabel
$fileName = if ($safeLabel) { "{0}-{1}.json" -f $fileStamp, $safeLabel } else { "{0}.json" -f $fileStamp }
$snapshotPath = Join-Path $snapshotsDirectory $fileName
$snapshotRelativePath = Join-Path "ops\prod-state\snapshots" $fileName

$snapshot = [ordered]@{
    schemaVersion  = 1
    timestampUtc   = $timestampText
    operatorLabel  = $OperatorLabel
    sshTarget      = $SshTarget
    remoteRepoPath = $RemoteRepoPath
    snapshotFile   = $snapshotRelativePath
    gitHead        = $gitHead
    envPins        = $envPins
    runningImages  = $runningImages
    runningStates  = $runningStates
    previousSnapshot = $(if ($null -eq $previousSnapshot) {
            $null
        }
        else {
            [ordered]@{
                timestampUtc = Get-ObjectPropertyValue -Object $previousSnapshot -Name "timestampUtc"
                snapshotFile = Get-ObjectPropertyValue -Object $previousSnapshot -Name "snapshotFile"
            }
        })
    changes = $changes
}

$snapshot | ConvertTo-Json -Depth 8 | Set-Content -Path $snapshotPath -Encoding UTF8
$snapshot | ConvertTo-Json -Depth 8 | Set-Content -Path $latestPath -Encoding UTF8
$snapshot | ConvertTo-Json -Depth 8 -Compress | Add-Content -Path $historyPath -Encoding UTF8

Write-Host ("Saved snapshot: {0}" -f $snapshotRelativePath)
Write-Host ("Updated latest: {0}" -f (Join-Path "ops\prod-state" "latest.json"))
Write-Host ("Appended history: {0}" -f (Join-Path "ops\prod-state" "history.jsonl"))
Write-Host ""

Write-ChangeSummary -PreviousSnapshot $previousSnapshot -Changes $changes
