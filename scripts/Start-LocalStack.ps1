[CmdletBinding()]
param(
    [switch]$CleanStart,
    [switch]$BuildFrontend
)

$ErrorActionPreference = 'Stop'

$modelLauncher = 'C:\Users\ADMINS\Documents\projects\machine_learning_bbl_009-odi-mc-predictor\scripts\start_crickzen_stack.ps1'

if (-not (Test-Path -LiteralPath $modelLauncher)) {
    throw "Match Intelligence launcher not found: $modelLauncher"
}

$modelArgs = @{}
if ($CleanStart) { $modelArgs.CleanStart = $true }
if ($BuildFrontend) { $modelArgs.BuildFrontend = $true }

Write-Host 'Starting CrickZen local stack with Match Intelligence...'
& $modelLauncher @modelArgs
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "CrickZen stack launcher failed with exit code $LASTEXITCODE"
}

Write-Host 'Verifying Match Intelligence...'
$health = Invoke-RestMethod 'http://127.0.0.1:8000/health'
if ($health.status -ne 'ok') {
    throw 'Match Intelligence health check failed.'
}

Write-Host 'Local stack and Match Intelligence are ready.'
Write-Host 'Frontend: http://localhost:8080/Home'
Write-Host 'Match Intelligence health: http://127.0.0.1:8000/health'
