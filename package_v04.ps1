$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = $PSScriptRoot
$outputRoot = Join-Path $projectRoot 'deliverables/v04'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
function Write-Package($name, $entries) {
    $destination = Join-Path $outputRoot $name
    if (Test-Path -LiteralPath $destination) { throw "Package already exists: $destination" }
    $archive = [IO.Compression.ZipFile]::Open($destination, 'Create')
    try {
        foreach ($entry in $entries) {
            $source = Join-Path $projectRoot $entry
            $files = if (Test-Path -LiteralPath $source -PathType Container) { Get-ChildItem -LiteralPath $source -Recurse -File } else { Get-Item -LiteralPath $source }
            foreach ($file in $files) {
                if ($file.Extension -eq '.blend1' -or $file.FullName -match '[\\/]__pycache__[\\/]') { continue }
                $relative = $file.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
                [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relative, 'Optimal') | Out-Null
            }
        }
    } finally { $archive.Dispose() }
    $check = [IO.Compression.ZipFile]::OpenRead($destination)
    try { Write-Output "$name : $($check.Entries.Count) files" } finally { $check.Dispose() }
    Get-FileHash -LiteralPath $destination -Algorithm SHA256
}
Write-Package 'PharmaOdyssey-v04-candidate-windows.zip' @('dist','serve-build.cjs','start_windows.cmd','start_windows.ps1','README_v04.md','reports','art/validation/v04')
Write-Package 'PharmaOdyssey-v04-candidate-source-art.zip' @('src','public','assets','art','content','docs','legacy','tests','package.json','package-lock.json','index.html','eslint.config.js','tsconfig.json','README.md','README_v04.md','serve-build.cjs','start_windows.cmd','start_windows.ps1','package_v04.ps1','reports')
