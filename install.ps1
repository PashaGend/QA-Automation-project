# Mondial2026 QA project - one-file installer (Windows).
#
# Does everything: installs Git, Node.js and Docker Desktop if missing,
# starts Docker Desktop and waits for it, clones both repos next to this
# script, brings up the full environment, and opens the app in your browser.
# Safe to run more than once - every step skips what's already done.
#
# How to run:
#   1. Save this file anywhere (e.g. your Desktop).
#   2. Open PowerShell (Start -> type "PowerShell" -> Enter).
#   3. cd to the folder you saved it in, e.g.: cd $HOME\Desktop
#   4. Paste this one line and press Enter:
#        powershell -ExecutionPolicy Bypass -File .\install.ps1
#
# The one real limit this can't script around: if your Windows has never had
# virtualization (WSL2) enabled before, Docker needs a one-time restart to
# finish that setup. If that happens, this script tells you clearly and you
# just restart and run it again - it picks up right where it left off.

$ErrorActionPreference = 'Stop'

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Installing software needs admin rights - relaunch elevated if we don't have them.
if (-not (Test-Admin)) {
    Write-Host "Restarting as Administrator (needed to install software)..." -ForegroundColor Yellow
    $scriptPath = $MyInvocation.MyCommand.Path
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$scriptPath`""
    exit
}

function Refresh-Path {
    # A newly-installed tool isn't on PATH for this already-running process
    # until we re-read it from the registry ourselves.
    $machine = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
}

function Install-IfMissing($command, $wingetId, $label) {
    if (Get-Command $command -ErrorAction SilentlyContinue) {
        Write-Host "$label already installed - skipping." -ForegroundColor Green
        return
    }
    Write-Host "Installing $label..." -ForegroundColor Cyan
    winget install --id $wingetId --silent --accept-package-agreements --accept-source-agreements
    Refresh-Path
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget (Windows Package Manager) isn't available on this machine." -ForegroundColor Red
    Write-Host "Install 'App Installer' from the Microsoft Store, then run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 1
}

Install-IfMissing 'git' 'Git.Git' 'Git'
Install-IfMissing 'node' 'OpenJS.NodeJS.LTS' 'Node.js'

# Docker needs WSL2 to run on Windows. If this machine never had it set up,
# enabling it needs a one-time restart - check that up front so it's clear
# immediately, rather than installing Docker Desktop first and only finding
# out after its own 3-minute startup timeout below.
$wslReady = $true
try {
    wsl --status *> $null
    if ($LASTEXITCODE -ne 0) { $wslReady = $false }
} catch {
    $wslReady = $false
}

if (-not $wslReady) {
    Write-Host "Setting up WSL2 (Docker needs it)..." -ForegroundColor Cyan
    try { wsl --install --no-distro } catch { wsl --install }
    Write-Host ""
    Write-Host "WSL2 just got enabled for the first time - Windows needs a restart" -ForegroundColor Yellow
    Write-Host "before Docker can run. Restart your computer, then run this exact" -ForegroundColor Yellow
    Write-Host "file again - it picks up right where it left off." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 1
}

Install-IfMissing 'docker' 'Docker.DockerDesktop' 'Docker Desktop'
Refresh-Path

function Test-DockerRunning {
    try { docker info *> $null; return $true } catch { return $false }
}

if (-not (Test-DockerRunning)) {
    $dockerExe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path $dockerExe) {
        Write-Host "Starting Docker Desktop (first start can take a minute or two)..." -ForegroundColor Cyan
        Start-Process $dockerExe
    }
    $waited = 0
    while (-not (Test-DockerRunning) -and $waited -lt 180) {
        Start-Sleep -Seconds 5
        $waited += 5
        Write-Host "  waiting for Docker to start... ($waited s)"
    }
}

if (-not (Test-DockerRunning)) {
    Write-Host ""
    Write-Host "Docker still isn't responding." -ForegroundColor Red
    Write-Host "This usually means Windows needs a one-time restart to finish setting up" -ForegroundColor Yellow
    Write-Host "virtualization (WSL2) for Docker. Restart your computer, then run this" -ForegroundColor Yellow
    Write-Host "exact command again - it will pick up right where it left off:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File `"$($MyInvocation.MyCommand.Path)`"" -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "Docker is running." -ForegroundColor Green

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$qaPath = Join-Path $root 'mundial-qa-automation'
$appPath = Join-Path $root 'Mondial2026'

if (-not (Test-Path $qaPath)) {
    Write-Host "Cloning mundial-qa-automation..." -ForegroundColor Cyan
    git clone https://github.com/PashaGend/mundial-qa-automation.git $qaPath
} else {
    Write-Host "mundial-qa-automation already exists - skipping clone." -ForegroundColor Green
}

if (-not (Test-Path $appPath)) {
    Write-Host "Cloning Mondial2026..." -ForegroundColor Cyan
    git clone https://github.com/PashaGend/WorldCup2026.git $appPath
} else {
    Write-Host "Mondial2026 already exists - skipping clone." -ForegroundColor Green
}

Write-Host "Bringing up the environment (a few minutes the first time)..." -ForegroundColor Cyan
Push-Location $qaPath
npm run env:up
Pop-Location

Write-Host ""
Write-Host "Done! Opening the app..." -ForegroundColor Green
Start-Process 'http://localhost:8080'

Read-Host "All set. Press Enter to close this window"
