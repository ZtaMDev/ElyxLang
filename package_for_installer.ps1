# Copies the built binaries and assets into dist\ ready for Inno Setup
$dist = Join-Path (Get-Location) 'dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null

$root = Get-Location

$files = @('dsx.exe','dsxrepl.exe','icon.ico','README.md')
foreach ($f in $files) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Copy-Item $src -Destination $dist
        Write-Host ('Copied {0} to dist\' -f $f)
    } else {
        Write-Host ('Warning: {0} not found - build first (deno compile)' -f $f) -ForegroundColor Yellow
    }
}

Write-Host 'dist/ prepared. Open installer\elyx_installer.iss in Inno Setup and build the installer.'