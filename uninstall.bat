<# :
:: Mondial2026 QA project - uninstaller (Windows). Double-click to run.
:: (Same batch/PowerShell polyglot as install.bat - see that file for why.)
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $scriptPath = '%~f0'; Invoke-Expression (Get-Content -Raw -LiteralPath $scriptPath) }"
exit /b %errorlevel%
#>
#
# Removes everything install.bat/install.ps1 set up: this project's Docker
# containers, volumes, networks and images. Does NOT uninstall Git, Node.js
# or Docker Desktop themselves - those are shared tools you might use for
# other things. Optionally (asks first) also deletes the mundial-qa-automation
# and Mondial2026 folders themselves - say no if you made local changes you
# want to keep.

try { $host.UI.RawUI.WindowTitle = 'Uninstalling Mondial2026 - please wait' } catch {}

$root = Split-Path -Parent $scriptPath
$qaPath = Join-Path $root 'mundial-qa-automation'
$appPath = Join-Path $root 'Mondial2026'

Write-Host ""
Write-Host "This removes this project's Docker containers, volumes, networks" -ForegroundColor Cyan
Write-Host "and images. It will NOT uninstall Git, Node.js or Docker Desktop" -ForegroundColor Cyan
Write-Host "themselves - those might be used by other things on your computer." -ForegroundColor Cyan
Write-Host ""

if (Test-Path $qaPath) {
    Write-Host "Stopping and removing containers, volumes, networks..." -ForegroundColor Cyan
    Push-Location $qaPath
    docker compose down -v --remove-orphans
    Pop-Location

    Write-Host "Removing this project's Docker images..." -ForegroundColor Cyan
    docker image rm mundial-qa-automation-db -f 2>$null | Out-Null
    docker image rm ghcr.io/pashagend/mundial2026-web:latest -f 2>$null | Out-Null
} else {
    Write-Host "mundial-qa-automation folder not found next to this file - skipping Docker cleanup." -ForegroundColor Yellow
}

Write-Host ""
$answer = Read-Host "Also DELETE the project folders themselves (mundial-qa-automation, Mondial2026)? This deletes any local changes you made there. [y/N]"
if ($answer -eq 'y' -or $answer -eq 'Y') {
    if (Test-Path $qaPath) { Remove-Item $qaPath -Recurse -Force; Write-Host "Removed $qaPath" -ForegroundColor Green }
    if (Test-Path $appPath) { Remove-Item $appPath -Recurse -Force; Write-Host "Removed $appPath" -ForegroundColor Green }
} else {
    Write-Host "Keeping the project folders - only the Docker resources were removed." -ForegroundColor Green
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Read-Host "Press Enter to close this window"
