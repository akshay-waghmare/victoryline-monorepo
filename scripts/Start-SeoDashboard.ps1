param(
    [int]$Port = 8091,
    [int]$InspectionLimit = 5
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$credentialPath = Join-Path $repoRoot "gsc-service-account.json"
$appPath = Join-Path $repoRoot "tools\seo-dashboard\app.py"

if (-not (Test-Path -LiteralPath $credentialPath)) {
    throw "Missing ignored GSC credential file: $credentialPath"
}

$credential = Get-Content -LiteralPath $credentialPath -Raw | ConvertFrom-Json
if (-not $credential.client_email -or -not $credential.private_key -or -not $credential.token_uri) {
    throw "The local gsc-service-account.json is not a valid service-account credential."
}

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    $existing | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

$env:GOOGLE_APPLICATION_CREDENTIALS = $credentialPath
$env:SEO_DASHBOARD_PORT = $Port.ToString()
$env:SEO_DASHBOARD_INSPECT_LIMIT = $InspectionLimit.ToString()

$process = Start-Process `
    -FilePath "python" `
    -ArgumentList "`"$appPath`"" `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -PassThru

$healthUrl = "http://127.0.0.1:$Port/health"
for ($attempt = 1; $attempt -le 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
        if ($health.ok) {
            [pscustomobject]@{
                Pid = $process.Id
                Url = "http://127.0.0.1:$Port"
                Health = "ok"
            }
            return
        }
    } catch {
        # Keep waiting while Flask starts.
    }
}

throw "SEO dashboard did not become healthy at $healthUrl"
