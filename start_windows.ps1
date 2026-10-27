$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { $null }
if (-not $nodePath) {
    $candidates = @(
        "$env:ProgramFiles/nodejs/node.exe",
        "$env:LOCALAPPDATA/Programs/nodejs/node.exe"
    )
    $candidates += @(Get-ChildItem "$env:LOCALAPPDATA/Microsoft/WinGet/Packages/OpenJS.NodeJS*" -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
    $nodePath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $nodePath) { throw 'Node executable currently not discoverable. Check the existing Node installation and PATH.' }
& $nodePath --version
if (-not (Test-Path 'dist/index.html')) { throw 'Production build is missing. Run npm run build in the source project first.' }
$port = 5173
while (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { $port++ }
Start-Process -FilePath $nodePath -ArgumentList @('serve-build.cjs',"$port") -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
Start-Process "http://127.0.0.1:$port/"
Write-Output "Pharma Odyssey: http://127.0.0.1:$port/"
Write-Output 'Saves belong to the browser and port. Export your save before changing ports.'
