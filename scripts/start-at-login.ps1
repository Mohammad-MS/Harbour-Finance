$ErrorActionPreference = 'Stop'
$harbourRoot = Split-Path -Parent $PSScriptRoot
$harbourUrl = 'http://127.0.0.1:4173/'
$harbourNode = (Get-Command node.exe -ErrorAction Stop).Source

# Reuse an existing Harbour instance without opening a browser at sign-in.
try {
    $response = Invoke-WebRequest -Uri $harbourUrl -UseBasicParsing -TimeoutSec 3
    if ($response.Content -match 'Harbour') { exit 0 }
    throw 'Port 4173 is occupied by another application.'
} catch {
    if ($_.Exception.Message -eq 'Port 4173 is occupied by another application.') { throw }
}

if (-not (Test-Path -LiteralPath (Join-Path $harbourRoot 'dist\index.html'))) {
    throw 'Build Harbour with npm run build before starting the scheduled task.'
}
$harbourProcess = Start-Process -FilePath $harbourNode -ArgumentList 'server.mjs --production' -WorkingDirectory $harbourRoot -WindowStyle Hidden -PassThru
$harbourProcess.WaitForExit()
# A nonzero result lets Task Scheduler restart Harbour after an unexpected exit.
exit 1
