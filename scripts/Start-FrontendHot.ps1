[CmdletBinding()]
param(
    [switch]$Stop,
    [switch]$Docker
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $repoRoot 'apps\frontend'
$logPath = Join-Path $repoRoot 'frontend-hot.log'
$errorLogPath = Join-Path $repoRoot 'frontend-hot.err.log'

$existing = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -like '*ng serve*4200*' }

if ($Stop) {
    if ($Docker) {
        docker compose -f (Join-Path $repoRoot 'docker-compose.local.yml') -f (Join-Path $repoRoot 'docker-compose.frontend-hot.yml') stop frontend
        exit 0
    }
    $existing | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    Write-Host 'Frontend hot-reload server stopped.'
    exit 0
}

if ($Docker) {
    docker compose -f (Join-Path $repoRoot 'docker-compose.local.yml') -f (Join-Path $repoRoot 'docker-compose.frontend-hot.yml') up -d frontend caddy
    Write-Host 'Docker frontend hot-reload override starting.'
    Write-Host 'Hot reload: http://localhost:8080 (through Caddy) or http://localhost:4200 (direct dev server).'
    exit 0
}

if ($existing) {
    Write-Host 'Frontend hot-reload server is already running at http://localhost:4200.'
    exit 0
}

$process = Start-Process -FilePath 'npm.cmd' `
    -ArgumentList 'run', 'start:hot' `
    -WorkingDirectory $frontendRoot `
    -RedirectStandardOutput $logPath `
    -RedirectStandardError $errorLogPath `
    -WindowStyle Hidden `
    -PassThru

Write-Host "Frontend hot-reload server starting at http://localhost:4200 (PID $($process.Id))."
Write-Host "Log: $logPath"
