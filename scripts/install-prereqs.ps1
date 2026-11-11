# One-time prerequisites installer (Windows only): Git, Node.js, Docker Desktop.
# Run BEFORE `npm run setup`. Needs an Administrator PowerShell window (winget
# installs these system-wide). Docker Desktop still needs to be opened once by
# hand after this finishes - its first-run license screen and WSL2 setup can't
# be scripted around - so this is "one script instead of three downloads," not
# a fully silent install.
#
# Usage: right-click this file in File Explorer -> "Run with PowerShell" (as
# Administrator), or from an elevated PowerShell: .\scripts\install-prereqs.ps1

$ErrorActionPreference = 'Stop'

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host "This needs to run as Administrator (winget installs system-wide)." -ForegroundColor Red
    Write-Host "Right-click this file -> Run with PowerShell (as Administrator), or re-open PowerShell as Administrator." -ForegroundColor Yellow
    exit 1
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget (Windows Package Manager) isn't available on this machine." -ForegroundColor Red
    Write-Host "It ships with Windows 10/11 by default - if missing, install 'App Installer' from the Microsoft Store, then re-run this." -ForegroundColor Yellow
    exit 1
}

function Install-IfMissing($command, $wingetId, $label) {
    if (Get-Command $command -ErrorAction SilentlyContinue) {
        Write-Host "$label already installed - skipping." -ForegroundColor Green
        return
    }
    Write-Host "Installing $label..." -ForegroundColor Cyan
    winget install --id $wingetId --silent --accept-package-agreements --accept-source-agreements
}

Install-IfMissing 'git'    'Git.Git'            'Git'
Install-IfMissing 'node'   'OpenJS.NodeJS.LTS'  'Node.js'
Install-IfMissing 'docker' 'Docker.DockerDesktop' 'Docker Desktop'

Write-Host ""
Write-Host "Done. Two things left, both one-time:" -ForegroundColor Green
Write-Host "  1. Close and reopen your terminal (so the new PATH entries are picked up)."
Write-Host "  2. Open Docker Desktop by hand once, accept its terms, and leave it running."
Write-Host ""
Write-Host "Then: git clone https://github.com/PashaGend/mundial-qa-automation.git && cd mundial-qa-automation && npm run setup"
