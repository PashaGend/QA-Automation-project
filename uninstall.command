#!/bin/bash
# Mondial2026 QA project - uninstaller (macOS). Double-click this file in
# Finder to run it (same one-time "unidentified developer" unblock as
# install.command: right-click -> Open -> Open).
#
# Removes everything install.command set up: this project's Docker
# containers, volumes, networks and images, the install.command/install.bat/
# install.ps1 files themselves, and finally this file too. Does NOT
# uninstall Homebrew, Git, Node.js or Docker Desktop themselves - those are
# shared tools you might use for other things. Optionally (asks first) also
# deletes the mundial-qa-automation and Mondial2026 folders themselves -
# say no if you made local changes you want to keep.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QA_PATH="$SCRIPT_DIR/mundial-qa-automation"
APP_PATH="$SCRIPT_DIR/Mondial2026"

printf '\033]0;Uninstalling Mondial2026\007'
echo ""
echo "This removes this project's Docker containers, volumes, networks"
echo "and images. It will NOT uninstall Homebrew, Git, Node.js or Docker"
echo "Desktop themselves - those might be used by other things on your Mac."
echo ""

if [ -d "$QA_PATH" ]; then
    echo "Stopping and removing containers, volumes, networks..."
    (cd "$QA_PATH" && docker compose down -v --remove-orphans)

    echo "Removing this project's Docker images..."
    docker image rm mundial-qa-automation-db -f >/dev/null 2>&1
    docker image rm ghcr.io/pashagend/mundial2026-web:latest -f >/dev/null 2>&1
else
    echo "mundial-qa-automation folder not found next to this file - skipping Docker cleanup."
fi

echo ""
read -r -p "Also DELETE the project folders themselves (mundial-qa-automation, Mondial2026)? This deletes any local changes you made there. [y/N] " answer
if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    [ -d "$QA_PATH" ] && rm -rf "$QA_PATH" && echo "Removed $QA_PATH"
    [ -d "$APP_PATH" ] && rm -rf "$APP_PATH" && echo "Removed $APP_PATH"
else
    echo "Keeping the project folders - only the Docker resources were removed."
fi

echo ""
echo "Removing the installer files themselves..."
for f in install.command install.bat install.ps1; do
    p="$SCRIPT_DIR/$f"
    if [ -f "$p" ]; then rm -f "$p" && echo "  removed $f"; fi
done

echo ""
echo "Done."
read -r -p "Press Enter to close this window"

# Delete this file itself, last. Unlike on Windows, this is safe to do
# directly: Unix lets you unlink a file that's still open/running - the
# shell keeps reading from its already-open file descriptor just fine.
rm -f -- "$0"
