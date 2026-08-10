param(
  [string]$TaskName = 'Crickzen SEO Audit Agent',
  [ValidateRange(0, 23)] [int]$Hour = 9,
  [ValidateRange(0, 59)] [int]$Minute = 15,
  [switch]$NoLlm,
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Output "Removed scheduled task: $TaskName"
  return
}

$agent = Join-Path $repoRoot 'tools\seo-audit-agent\seo_audit_agent.py'
if (-not (Test-Path -LiteralPath $agent)) {
  throw "SEO audit agent not found: $agent"
}

$venvPython = Join-Path $repoRoot 'tools\seo-audit-agent\.venv\Scripts\python.exe'
$python = if (Test-Path -LiteralPath $venvPython) {
  $venvPython
} else {
  (Get-Command python -ErrorAction Stop).Source
}

$arguments = '"' + $agent + '" --scheduled'
if ($NoLlm) {
  $arguments += ' --no-llm'
}

$action = New-ScheduledTaskAction -Execute $python -Argument $arguments -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Daily -At ([datetime]::Today.AddHours($Hour).AddMinutes($Minute))
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
$settings.DisallowStartIfOnBatteries = $false
$settings.StopIfGoingOnBatteries = $false
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
$task = Get-ScheduledTask -TaskName $TaskName
$info = Get-ScheduledTaskInfo -TaskName $TaskName
[pscustomobject]@{
  TaskName = $task.TaskName
  State = $task.State
  DailyAt = ('{0:D2}:{1:D2}' -f $Hour, $Minute)
  Python = $python
  WorkingDirectory = $repoRoot
  Arguments = $arguments
  ArtifactRoot = (Join-Path $repoRoot 'artifacts\seo-audit-agent')
  LastRunTime = $info.LastRunTime
  LastTaskResult = $info.LastTaskResult
  RemoveCommand = ".\scripts\Install-SeoAuditAgentTask.ps1 -TaskName '$TaskName' -Remove"
} | Format-List
