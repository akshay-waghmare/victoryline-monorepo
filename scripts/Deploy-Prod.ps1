<#
.SYNOPSIS
    Deploy VictoryLine to production from local Windows machine.

.DESCRIPTION
    Pushes latest code to origin, SSHs to prod server, pulls code, builds all
    Docker images with a consistent tag, updates .env, and restarts the stack.

    Ensures all services (backend, frontend, scraper) are built
    from the same git commit with the same tag — no more image mismatch.

.PARAMETER Tag
    Custom image tag. Default: deploy-<sha>-<timestamp>

.PARAMETER SkipPush
    Skip git push to origin (use when code is already pushed).

.PARAMETER NoBuild
    Skip building images (just update .env and restart).

.PARAMETER NoRestart
    Build images and update .env but don't restart the stack.

.PARAMETER DryRun
    Show what would happen without making changes.

.EXAMPLE
    .\Deploy-Prod.ps1
    .\Deploy-Prod.ps1 -Tag "v1.3.0"
    .\Deploy-Prod.ps1 -DryRun
#>
[CmdletBinding()]
param(
    [string]$Tag,
    [switch]$SkipPush,
    [switch]$NoBuild,
    [switch]$NoRestart,
    [switch]$DryRun,
    [string]$SshTarget = "administrator@204.12.199.137",
    [string]$RemoteRepoPath = "/home/administrator/victoryline-monorepo"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sshExe = "C:\Program Files\Git\usr\bin\ssh.exe"

function Invoke-Ssh {
    param([string]$Command)
    $output = & $sshExe $SshTarget $Command 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "SSH command failed (exit $LASTEXITCODE): $Command`n$($output -join "`n")"
    }
    return $output
}

# --- Pre-flight ---
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Push-Location $repoRoot

try {
    $gitSha = git rev-parse --short=7 HEAD
    $gitBranch = git rev-parse --abbrev-ref HEAD
    $localHead = git rev-parse HEAD

    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  VictoryLine Production Deploy" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Branch:    $gitBranch"
    Write-Host "  Commit:    $gitSha"
    Write-Host "  Dry run:   $DryRun"
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    # Check for uncommitted changes locally
    $localStatus = git status --porcelain
    if ($localStatus) {
        Write-Host "⚠️  Local working tree has uncommitted changes:" -ForegroundColor Yellow
        git status --short
        Write-Host ""
        $confirm = Read-Host "Continue? (y/N)"
        if ($confirm -ne 'y' -and $confirm -ne 'Y') {
            Write-Host "Aborted." -ForegroundColor Red
            return
        }
    }

    # --- Step 1: Push to origin ---
    if (-not $SkipPush) {
        Write-Host "📤 Pushing to origin/$gitBranch ..." -ForegroundColor Green
        if (-not $DryRun) {
            git push origin $gitBranch 2>&1 | Write-Host
        }
        else {
            Write-Host "  [DRY RUN] git push origin $gitBranch"
        }
        Write-Host ""
    }

    # --- Step 2: Snapshot pre-deploy state ---
    Write-Host "📸 Taking pre-deploy snapshot..." -ForegroundColor Green
    if (-not $DryRun) {
        try {
            & "$repoRoot\scripts\Track-ProdImageState.ps1" -OperatorLabel "pre-deploy-$gitSha"
        }
        catch {
            Write-Host "  ⚠️  Snapshot failed (non-fatal): $_" -ForegroundColor Yellow
        }
    }
    Write-Host ""

    # --- Step 3: Pull code on prod ---
    Write-Host "📥 Pulling latest code on prod..." -ForegroundColor Green
    if (-not $DryRun) {
        $pullOutput = Invoke-Ssh "cd $RemoteRepoPath && git fetch origin && git reset --hard origin/$gitBranch"
        $pullOutput | ForEach-Object { Write-Host "  $_" }
    }
    else {
        Write-Host "  [DRY RUN] git fetch origin && git reset --hard origin/$gitBranch"
    }
    Write-Host ""

    # --- Step 4: Build and deploy ---
    $deployArgs = ""
    if ($Tag) { $deployArgs += " --tag $Tag" }
    if ($NoRestart) { $deployArgs += " --no-restart" }
    if ($DryRun) { $deployArgs += " --dry-run" }

    Write-Host "🚀 Running deploy script on prod..." -ForegroundColor Green
    if (-not $DryRun) {
        $deployOutput = Invoke-Ssh "cd $RemoteRepoPath && bash scripts/deploy-prod.sh$deployArgs"
        $deployOutput | ForEach-Object { Write-Host "  $_" }
    }
    else {
        Write-Host "  [DRY RUN] bash scripts/deploy-prod.sh$deployArgs"
    }
    Write-Host ""

    # --- Step 5: Snapshot post-deploy state ---
    Write-Host "📸 Taking post-deploy snapshot..." -ForegroundColor Green
    if (-not $DryRun) {
        try {
            & "$repoRoot\scripts\Track-ProdImageState.ps1" -OperatorLabel "post-deploy-$gitSha"
        }
        catch {
            Write-Host "  ⚠️  Snapshot failed (non-fatal): $_" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  ✅ Deploy pipeline complete" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
}
finally {
    Pop-Location
}
