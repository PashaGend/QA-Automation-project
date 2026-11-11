#!/bin/bash
# Mondial2026 QA project - one-file installer (macOS). Double-click this
# file in Finder to run it.
#
# Does everything: installs Homebrew (if missing), then Git/Node.js/Docker
# Desktop (if missing), starts Docker and waits for it, clones both repos
# next to this file, brings up the full environment, and opens the app in
# your browser. Safe to run more than once - every step skips what's
# already done.
#
# The one real limit this can't script around: macOS will likely refuse to
# run a downloaded, unsigned script the first time ("cannot be opened
# because it is from an unidentified developer"). Right-click the file ->
# Open -> Open, once, and it'll run normally after that.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

printf '\033]0;Installing Mondial2026 - please wait\007'
echo ""
echo "======================================================="
echo "  Installing the Mondial2026 QA environment."
echo "  This window shows technical progress messages below -"
echo "  you don't need to read, understand, or type anything."
echo "  Just wait until it says 'Done!' further down."
echo "======================================================="
echo ""

if ! command -v brew >/dev/null 2>&1; then
    echo "Installing Homebrew (you'll be asked for your Mac password)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Homebrew installs to a different path on Apple Silicon vs Intel Macs.
    if [ -x /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo "Homebrew already installed - skipping."
fi

install_if_missing() {
    local command_name="$1"
    local brew_pkg="$2"
    local label="$3"
    if command -v "$command_name" >/dev/null 2>&1; then
        echo "$label already installed - skipping."
    else
        echo "Installing $label..."
        brew install "$brew_pkg"
    fi
}

install_if_missing git git "Git"
install_if_missing node node "Node.js"

if [ ! -d "/Applications/Docker.app" ]; then
    echo "Installing Docker Desktop..."
    brew install --cask docker
else
    echo "Docker Desktop already installed - skipping."
fi

if ! docker info >/dev/null 2>&1; then
    echo "Starting Docker Desktop (first start can take a minute or two)..."
    open -a Docker
    waited=0
    while ! docker info >/dev/null 2>&1 && [ "$waited" -lt 180 ]; do
        sleep 5
        waited=$((waited + 5))
        echo "  waiting for Docker to start... (${waited}s)"
    done
fi

if ! docker info >/dev/null 2>&1; then
    echo ""
    echo "Docker still isn't responding."
    echo "Open Docker Desktop from Applications by hand once (it may ask you to"
    echo "approve a system permission the first time), then run this file again -"
    echo "it will pick up right where it left off."
    read -r -p "Press Enter to close"
    exit 1
fi

echo "Docker is running."

QA_PATH="$SCRIPT_DIR/mundial-qa-automation"
APP_PATH="$SCRIPT_DIR/Mondial2026"

if [ ! -d "$QA_PATH" ]; then
    echo "Cloning mundial-qa-automation..."
    git clone https://github.com/PashaGend/mundial-qa-automation.git "$QA_PATH"
else
    echo "mundial-qa-automation already exists - skipping clone."
fi

if [ ! -d "$APP_PATH" ]; then
    echo "Cloning Mondial2026..."
    git clone https://github.com/PashaGend/WorldCup2026.git "$APP_PATH"
else
    echo "Mondial2026 already exists - skipping clone."
fi

echo "Bringing up the environment (a few minutes the first time)..."
cd "$QA_PATH"
npm run env:up

echo ""
echo "Done! Opening the app..."
open http://localhost:8080

read -r -p "All set. Press Enter to close this window"
