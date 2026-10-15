$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$envFile = Join-Path $projectRoot 'backend/.env'
$keyLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^AI_INTERVIEW_API_KEY=' } | Select-Object -First 1
if (-not $keyLine) { throw 'AI_INTERVIEW_API_KEY is missing from backend/.env' }
$apiKey = ($keyLine -split '=', 2)[1].Trim()
if (-not $apiKey) { throw 'AI_INTERVIEW_API_KEY is empty' }
$litellm = (Get-Command litellm -ErrorAction Stop).Source
$config = Join-Path $projectRoot 'artifacts/litellm-interview-local.yaml'
$names = @('LITELLM_MASTER_KEY', 'DEBUG', 'PYTHONIOENCODING', 'PYTHONUTF8', 'NO_PROXY')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    $env:LITELLM_MASTER_KEY = $apiKey
    $env:DEBUG = 'false'
    $env:PYTHONIOENCODING = 'utf-8'
    $env:PYTHONUTF8 = '1'
    $env:NO_PROXY = 'localhost,127.0.0.1,::1'
    $process = Start-Process -FilePath $litellm -ArgumentList @('--config', ('"' + $config + '"'), '--port', '8000', '--host', '127.0.0.1') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot 'artifacts/litellm-interview.stdout.log') -RedirectStandardError (Join-Path $projectRoot 'artifacts/litellm-interview.stderr.log') -PassThru
    Write-Output "Started interview LiteLLM on port 8000 (PID $($process.Id))."
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
